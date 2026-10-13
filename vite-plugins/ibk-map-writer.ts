// Dev-only: write an edited Tiled map back to `src/assets/maps/<name>.json`,
// or an edited game config back to `src/game/game-config.json`.
//
// The client halves are `src/editor/save-sink.ts` (maps) and
// `src/editor/tune-panel.ts` (config). They talk over Vite's HMR WebSocket
// rather than HTTP, because `tests/unit/architecture.test.ts` rule 4 bans
// `fetch(` across `src/**` — and because the HMR channel needs no port, no
// CORS, and vanishes entirely from a production build.
//
// Three things make this safe enough to exist:
//
//  1. `apply: "serve"` — it is never part of a build.
//  2. `IBK_EDIT=1` is REQUIRED. `vite.config.ts` sets `allowedHosts: true`, so
//     without the gate any peer that can reach the dev server on the LAN could
//     rewrite the repo's map files. Do not soften this for convenience.
//  3. Targets are NAMES matched against a closed table. No path is ever taken
//     from the client, so there is no traversal surface to get wrong.
//
// Writes are atomic (tmp + rename) and guarded by a base hash, so a stale editor
// tab cannot clobber an edit made in Tiled (or by hand) while it was open.
import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Plugin } from "vite";
import { validateGameConfig } from "../src/game/game-config-schema.ts";

const SAVE_MAP = "ibk:save-map";
const MAP_SAVED = "ibk:map-saved";
const SAVE_CONFIG = "ibk:save-config";
const CONFIG_SAVED = "ibk:config-saved";

/** The only map files this plugin will ever write. */
const ALLOWED_MAPS = ["map", "workshop", "yard", "track", "track-v3"] as const;

interface SavePayload {
  name?: unknown;
  json?: unknown;
  baseHash?: unknown;
}

/** Must match `hashText` in save-sink.ts exactly. */
function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Structural check that the payload is a Tiled map we recognise. The client
 *  already validates with zod; this repeats it because the server must not
 *  trust the client, and because a truncated payload would otherwise land on
 *  disk as a corrupt map. */
function looksLikeTiledMap(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  if (m["type"] !== "map") return false;
  for (const key of ["width", "height", "tilewidth", "tileheight"]) {
    if (typeof m[key] !== "number" || !Number.isFinite(m[key])) return false;
  }
  return Array.isArray(m["layers"]) && m["layers"].length > 0;
}

/** What one save target is: where it lives and what a valid payload is. */
interface Target {
  readonly file: string;
  readonly label: string;
  /** Problems with the parsed payload; empty means write it. */
  validate(parsed: unknown): string[];
}

export function ibkMapWriter(): Plugin {
  const root = process.cwd();
  const mapsDir = path.resolve(root, "src/assets/maps");
  const configFile = path.resolve(root, "src/game/game-config.json");
  /** Files this plugin just wrote, so `handleHotUpdate` can swallow the reload
   *  its own write would otherwise trigger — a full reload mid-drag (or
   *  mid-slider) would throw away the editing session. */
  const selfWritten = new Set<string>();

  const mapTarget = (name: unknown): Target | string => {
    if (typeof name !== "string" || !(ALLOWED_MAPS as readonly string[]).includes(name)) {
      return `refusing unknown map "${String(name)}"`;
    }
    return {
      file: path.join(mapsDir, `${name}.json`),
      label: `${name}.json`,
      validate: (parsed) => (looksLikeTiledMap(parsed) ? [] : ["payload is not a Tiled map"]),
    };
  };
  const configTarget: Target = {
    file: configFile,
    label: "game-config.json",
    validate: validateGameConfig,
  };

  /** The guarded write every target shares. Returns [ok, detail]. */
  async function write(target: Target, data: SavePayload): Promise<[boolean, string]> {
    if (typeof data.json !== "string" || typeof data.baseHash !== "string") {
      return [false, "malformed save payload"];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.json);
    } catch {
      return [false, "payload is not valid JSON"];
    }
    const problems = target.validate(parsed);
    if (problems.length > 0) return [false, `${target.label}: ${problems.join("; ")}`];
    if (!existsSync(target.file)) return [false, `${target.label} does not exist`];

    try {
      const current = await readFile(target.file, "utf8");
      if (hashText(current) !== data.baseHash) {
        return [false, `${target.label} changed on disk — reload before saving`];
      }
      if (current === data.json) return [true, `${target.label} unchanged`];
      // Atomic: a crash mid-write must not leave a half-written file.
      const tmp = `${target.file}.tmp`;
      selfWritten.add(target.file);
      await writeFile(tmp, data.json, "utf8");
      await rename(tmp, target.file);
      return [true, `${target.label} saved`];
    } catch (err) {
      selfWritten.delete(target.file);
      return [false, `write failed: ${err instanceof Error ? err.message : String(err)}`];
    }
  }

  return {
    name: "ibk-map-writer",
    apply: "serve",

    configureServer(server) {
      const enabled = process.env["IBK_EDIT"] === "1";
      const off = "writing is off — restart the dev server with IBK_EDIT=1";

      server.ws.on(SAVE_MAP, async (data: SavePayload, client) => {
        const reply = (ok: boolean, detail: string): void => client.send(MAP_SAVED, { ok, detail });
        if (!enabled) return reply(false, `map ${off}`);
        const target = mapTarget(data?.name);
        if (typeof target === "string") return reply(false, target);
        reply(...(await write(target, data)));
      });

      server.ws.on(SAVE_CONFIG, async (data: SavePayload, client) => {
        const reply = (ok: boolean, detail: string): void => client.send(CONFIG_SAVED, { ok, detail });
        if (!enabled) return reply(false, `config ${off}`);
        reply(...(await write(configTarget, data)));
      });

      if (enabled) {
        server.config.logger.info(
          "  \u001b[35m➜\u001b[0m  \u001b[1mibk editor\u001b[0m: map + config writing ON — open /?edit or /?tune",
        );
      }
    },

    handleHotUpdate(ctx) {
      // Normalize before comparing. Vite reports watcher paths through its own
      // normalization, which is not guaranteed to equal the string `path.join`
      // produced here. A missed match is not a crash — it is an HMR update in
      // the middle of a drag, which tears down and rebuilds the Phaser scene and
      // takes the editing session with it. That is exactly the kind of failure
      // that is easy to write and hard to notice, so it logs when it fires.
      const seen = path.resolve(ctx.file);
      const hit = [...selfWritten].find((f) => path.resolve(f) === seen);
      if (!hit) return;
      selfWritten.delete(hit);
      ctx.server.config.logger.info(`  ibk editor: suppressed reload for ${path.basename(seen)}`);
      // Our own write. An empty module list means "nothing to update".
      return [];
    },
  };
}
