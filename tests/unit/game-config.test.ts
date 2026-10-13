// `game-config.json` is the one place the Track's tunables live, and
// `game-config-schema.ts` is the one description of them. These tests keep the
// two in step with each other and with the scenes that read them, so adding a
// tunable in one place and forgetting another fails here rather than at the
// first `?tune` save.

import { describe, expect, it } from "vitest";
import raw from "../../src/game/game-config.json";
import trackSource from "../../src/game/scenes/TrackV3Scene.ts?raw";
import workshopSource from "../../src/game/scenes/WorkshopScene.ts?raw";
import sceneLayoutSource from "../../src/game/scene-layout.ts?raw";
import stationSource from "../../src/game/instrument-station.ts?raw";
import {
  TUNABLES,
  readPath,
  validateGameConfig,
  writePath,
  type Tunable,
} from "../../src/game/game-config-schema.ts";

describe("game-config.json", () => {
  it("is valid against TUNABLES", () => {
    expect(validateGameConfig(raw)).toEqual([]);
  });

  it("has exactly one leaf per tunable, and no extra leaves", () => {
    // Both directions: a tunable with no value would throw at boot; a value
    // with no tunable is a renamed read site that went silent.
    const problems = validateGameConfig({ ...raw, stray: 1 });
    expect(problems).toEqual(["stray: not a known tunable"]);
    const missing = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    delete (missing["track"] as Record<string, unknown>)["railY"];
    expect(validateGameConfig(missing)).toEqual(['track.railY: expected a number, got undefined']);
  });

  it("rejects values outside a tunable's range and of the wrong kind", () => {
    const rail = TUNABLES.find((t) => t.path === "track.railY") as Tunable;
    const over = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    writePath(over, "track.railY", (rail.max ?? 0) + 1);
    expect(validateGameConfig(over)).toEqual([`track.railY: ${(rail.max ?? 0) + 1} is above ${rail.max}`]);
    const wrong = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    writePath(wrong, "track.contactShadows", 1);
    expect(validateGameConfig(wrong)).toEqual(["track.contactShadows: expected a boolean, got 1"]);
  });

  it("every tunable has a label, a group, and a sane range", () => {
    const paths = new Set<string>();
    for (const t of TUNABLES) {
      expect(paths.has(t.path), `duplicate tunable ${t.path}`).toBe(false);
      paths.add(t.path);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.group.length).toBeGreaterThan(0);
      if (t.kind === "number") {
        expect(t.min, `${t.path} needs min`).toBeTypeOf("number");
        expect(t.max, `${t.path} needs max`).toBeTypeOf("number");
        expect(t.step, `${t.path} needs step`).toBeTypeOf("number");
        expect(t.max as number).toBeGreaterThan(t.min as number);
      }
    }
  });

  it("every tunable is READ by exactly the code it is meant for", () => {
    // The whole point of the layer is that a value in the JSON changes what
    // the scene draws. A tunable nobody reads is a slider that does nothing.
    // Each section has one alias for its live sub-object (`k`, `kw`, `ky`)
    // and the files allowed to read through it.
    const READ_SITES: Record<string, { alias: string; sources: string[] }> = {
      track: { alias: "k", sources: [trackSource] },
      workshop: { alias: "kw", sources: [sceneLayoutSource, workshopSource] },
      yard: { alias: "ky", sources: [sceneLayoutSource] },
    };
    for (const t of TUNABLES) {
      const [section, ...rest] = t.path.split(".");
      const leaf = rest[rest.length - 1]!;
      if (section === "stations") {
        // Sheets are read generically: `gameConfig.stations[<id>].<leaf>`.
        expect(stationSource.includes("gameConfig.stations["), `${t.path} read site`).toBe(true);
        expect(stationSource.includes(`.${leaf}`), `${t.path} is never read`).toBe(true);
        continue;
      }
      const site = READ_SITES[section!];
      expect(site, `${t.path}: no read-site rule for section "${section}"`).toBeDefined();
      const read = site!.sources.some((src) => src.includes(`${site!.alias}.${leaf}`));
      expect(read, `${t.path} is never read as ${site!.alias}.${leaf}`).toBe(true);
    }
  });

  it("validates text and choice sheets", () => {
    const blank = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    writePath(blank, "stations.drums.label", "  ");
    expect(validateGameConfig(blank)).toEqual(["stations.drums.label: must not be empty"]);
    const wrong = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    writePath(wrong, "stations.violin.voice", "kazoo");
    expect(validateGameConfig(wrong)[0]).toMatch(/^stations\.violin\.voice: "kazoo" is not one of /);
    // A tool station has no voice to set; the sheet is closed.
    const extra = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    writePath(extra, "stations.drums.voice", "soft");
    expect(validateGameConfig(extra)).toEqual(["stations.drums.voice: not a known tunable"]);
  });

  it("reads and writes dotted paths", () => {
    const obj: Record<string, unknown> = {};
    writePath(obj, "a.b.c", 3);
    expect(readPath(obj, "a.b.c")).toBe(3);
    expect(readPath(obj, "a.x.c")).toBeUndefined();
  });

  it("the live object validates and applies in place", async () => {
    const { gameConfig, applyGameConfig, snapshotGameConfig } = await import("../../src/game/game-config.ts");
    const before = gameConfig.track.railY;
    const copy = snapshotGameConfig();
    copy.track.railY = before + 10;
    expect(applyGameConfig(copy)).toEqual([]);
    expect(gameConfig.track.railY).toBe(before + 10);
    // A bad candidate applies NOTHING, not part of itself.
    const bad = snapshotGameConfig();
    bad.track.railY = before;
    (bad.track as Record<string, unknown>)["hillsY"] = "no";
    expect(applyGameConfig(bad).length).toBe(1);
    expect(gameConfig.track.railY).toBe(before + 10);
    copy.track.railY = before;
    applyGameConfig(copy);
  });
});
