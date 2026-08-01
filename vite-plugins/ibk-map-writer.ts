// Dev-only: write an edited Tiled map back to `src/assets/maps/<name>.json`.
//
// The client half is `src/editor/save-sink.ts`. They talk over Vite's HMR
// WebSocket rather than HTTP, because `tests/unit/architecture.test.ts` rule 4
// bans `fetch(` across `src/**` — and because the HMR channel needs no port, no
// CORS, and vanishes entirely from a production build.
//
// Three things make this safe enough to exist:
//
//  1. `apply: "serve"` — it is never part of a build.
//  2. `IBK_EDIT=1` is REQUIRED. `vite.config.ts` sets `allowedHosts: true`, so
//     without the gate any peer that can reach the dev server on the LAN could
//     rewrite the repo's map files. Do not soften this for convenience.
//  3. Map NAMES only, matched against an allowlist. No path is ever taken from
//     the client, so there is no traversal surface to get wrong.
//
// Writes are atomic (tmp + rename) and guarded by a base hash, so a stale editor
// tab cannot clobber an edit made in Tiled while it was open.
import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import type { Plugin } from "vite";

const SAVE_EVENT = "ibk:save-map";
const SAVED_EVENT = "ibk:map-saved";

/** The only files this plugin will ever write. */
const ALLOWED = ["map", "workshop", "yard", "track"] as const;

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

export function ibkMapWriter(): Plugin {
  const mapsDir = path.resolve(process.cwd(), "src/assets/maps");
  /** Files this plugin just wrote, so `handleHotUpdate` can swallow the reload
   *  its own write would otherwise trigger — a full reload mid-drag would throw
   *  away the editing session. */
  const selfWritten = new Set<string>();

  return {
    name: "ibk-map-writer",
    apply: "serve",

    configureServer(server) {
      const enabled = process.env["IBK_EDIT"] === "1";
      server.ws.on(SAVE_EVENT, async (data: SavePayload, client) => {
        const reply = (ok: boolean, detail: string): void =>
          client.send(SAVED_EVENT, { ok, detail });

        if (!enabled) {
          reply(false, "map writing is off — restart the dev server with IBK_EDIT=1");
          return;
        }
        const name = data?.name;
        if (typeof name !== "string" || !(ALLOWED as readonly string[]).includes(name)) {
          reply(false, `refusing unknown map "${String(name)}"`);
          return;
        }
        if (typeof data.json !== "string" || typeof data.baseHash !== "string") {
          reply(false, "malformed save payload");
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(data.json);
        } catch {
          reply(false, "payload is not valid JSON");
          return;
        }
        if (!looksLikeTiledMap(parsed)) {
          reply(false, "payload is not a Tiled map");
          return;
        }

        const file = path.join(mapsDir, `${name}.json`);
        if (!existsSync(file)) {
          reply(false, `${name}.json does not exist`);
          return;
        }

        try {
          const current = await readFile(file, "utf8");
          if (hashText(current) !== data.baseHash) {
            reply(false, `${name}.json changed on disk — reload before saving`);
            return;
          }
          if (current === data.json) {
            reply(true, `${name}.json unchanged`);
            return;
          }
          // Atomic: a crash mid-write must not leave a half-written map.
          const tmp = `${file}.tmp`;
          selfWritten.add(file);
          await writeFile(tmp, data.json, "utf8");
          await rename(tmp, file);
          reply(true, `${name}.json saved`);
        } catch (err) {
          selfWritten.delete(file);
          reply(false, `write failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      if (enabled) {
        server.config.logger.info(
          "  [35m➜[0m  [1mibk editor[0m: map writing ON — open /?edit",
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
