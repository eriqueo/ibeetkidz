import { describe, expect, it } from "vitest";
import { parseTiledLayer, parseTiledPath, TiledMapSchema, type TiledSpawn } from "../../src/game/TiledParser.ts";
import { UI_SPRITES } from "../../src/game/ui-sprites.ts";
// The real on-disk Tiled fixtures the scenes interpret verbatim.
import YARD from "../../src/assets/maps/yard.json";
import TRACK from "../../src/assets/maps/track.json";
import WORKSHOP from "../../src/assets/maps/workshop.json";
import MAP from "../../src/assets/maps/map.json";
import { INSTRUMENTS } from "../../src/core/instruments.ts";

// The Three-Zone maps (UI_REFACTOR_DELEGATION Phase 2). These are the contracts
// the generic ui-scene engine relies on: every `sprite` key must resolve in the
// UI_SPRITES manifest (the scenes preload ONLY the keys their map references),
// every interactive object must carry a real EventBus action, and icon-only
// buttons must carry a caption.
//
// This file used to cover TWO of the four maps. `workshop.json` was seen only by
// the parser suite (which does not check sprite resolution or idle art), and
// `map.json` was imported by no unit test at all. That gap is part of why a
// play-test found bugs the suite did not — so all four are covered below, plus
// two cross-map invariants that are red on the tree as authored.

const yard = parseTiledLayer(YARD, "ui-layer");
const track = parseTiledLayer(TRACK, "ui-layer");
const workshop = parseTiledLayer(WORKSHOP, "ui-layer");
const mapNav = parseTiledLayer(MAP, "ui-layer");

function need(spawns: readonly TiledSpawn[], id: string): TiledSpawn {
  const s = spawns.find((x) => x.id === id);
  if (!s) throw new Error(`no spawn "${id}" in fixture`);
  return s;
}

describe.each([
  ["yard.json", YARD, yard],
  ["track.json", TRACK, track],
  ["workshop.json", WORKSHOP, workshop],
  ["map.json", MAP, mapNav],
])("%s (Three-Zone v3)", (_name, map, spawns) => {
  it("validates against the Tiled schema", () => {
    expect(() => TiledMapSchema.parse(map)).not.toThrow();
  });

  it("normalizes every descriptor into the open unit square", () => {
    for (const s of spawns) {
      expect(s.cx).toBeGreaterThan(0);
      expect(s.cx).toBeLessThan(1);
      expect(s.cy).toBeGreaterThan(0);
      expect(s.cy).toBeLessThan(1);
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
    }
  });

  it("resolves every authored sprite key in the UI_SPRITES manifest", () => {
    for (const s of spawns) {
      if (s.sprite !== undefined) {
        expect(UI_SPRITES[s.sprite], `${s.id} → ${s.sprite}`).toBeDefined();
      }
    }
  });

  it("gives every interactive object real art or a caption (nothing anonymous)", () => {
    // Buttons with baked-in labels (nav plaques, yard keycaps, RIDE) need no
    // Tiled caption; icon-only keycaps (SLOW/STOP/FAST) author one.
    //
    // `nav` is the deliberate exemption, not a loosened predicate: map.json's
    // three landmark hits are INVISIBLE regions over painted scenery (the cabin,
    // the shed, the oval ARE the affordance), so art or a caption would draw a
    // second control on top of the thing it represents.
    for (const s of spawns) {
      if (s.action !== undefined && s.klass !== "nav") {
        expect(
          s.sprite !== undefined || s.label !== undefined,
          `${s.id} needs a sprite or a label`,
        ).toBe(true);
      }
    }
  });

  it("resolves every sprite button in the manifest with idle art", () => {
    for (const s of spawns) {
      if (s.sprite === undefined || s.klass !== "ui-button") continue;
      expect(UI_SPRITES[s.sprite]!.states["idle"], `${s.id} idle`).toBeTypeOf("string");
    }
  });

  it("never authors the same action+arg twice in one map", () => {
    // Two controls that emit an identical event with an identical payload are
    // the same button drawn twice — one of them is a typo, and types cannot
    // catch it because both sides are just strings in a JSON file.
    const seen = new Map<string, string>();
    for (const s of spawns) {
      if (s.action === undefined) continue;
      const key = `${s.action}(${s.arg ?? ""})`;
      const first = seen.get(key);
      expect(first, `${s.id} duplicates ${first ?? ""} — both emit ${key}`).toBeUndefined();
      seen.set(key, s.id);
    }
  });

  it("emits only instruments the catalog actually has", () => {
    // `workshop-add-melody` takes a `SynthInstrumentId`. A Tiled `arg` is an
    // untyped string, so an id that is not in INSTRUMENTS silently falls back to
    // the default synth and the lane is labelled "Melody" — no error anywhere.
    const ids = new Set(INSTRUMENTS.map((i) => i.id as string));
    for (const s of spawns) {
      if (s.action !== "workshop-add-melody") continue;
      expect(ids.has(String(s.arg)), `${s.id} names instrument "${String(s.arg)}"`).toBe(true);
    }
  });
});

describe("map.json landmark navigation", () => {
  it("sends each landmark to its own destination", () => {
    const dests = mapNav.filter((s) => s.action === "map-nav").map((s) => s.arg);
    expect(dests.sort()).toEqual(["track", "workshop", "yard"]);
  });

  it("keeps the landmark hits big enough to tap and clear of each other", () => {
    // `built-artifact.spec.ts` derives its click point from these rects, but it
    // clicks the CENTRE — so a shrunk hit still passes there while becoming
    // untappable for a kid, and two overlapping hits send you to the wrong room.
    for (const s of mapNav) {
      expect(s.w, `${s.id} width`).toBeGreaterThan(0.05);
      expect(s.h, `${s.id} height`).toBeGreaterThan(0.05);
    }
    for (let i = 0; i < mapNav.length; i++) {
      for (let j = i + 1; j < mapNav.length; j++) {
        const a = mapNav[i]!;
        const b = mapNav[j]!;
        const overlaps =
          Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2;
        expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it("parks a handcar fixture on every destination", () => {
    // These replaced the hardcoded MAP_HANDCAR, which put the marker on the
    // cabin roof. MapScene looks them up BY NAME, so a rename is a silent
    // missing marker rather than a crash.
    const fixtures = parseTiledLayer(MAP, "fixtures-layer");
    expect(fixtures.map((s) => s.id).sort()).toEqual([
      "handcar-track",
      "handcar-workshop",
      "handcar-yard",
    ]);
    for (const f of fixtures) {
      expect(f.action, `${f.id} is a marker, not a button`).toBeUndefined();
      expect(f.cx).toBeGreaterThan(0);
      expect(f.cx).toBeLessThan(1);
      expect(f.cy).toBeGreaterThan(0);
      expect(f.cy).toBeLessThan(1);
    }
  });
});

describe("every map's base plate", () => {
  it("names an image the repo actually has", () => {
    // Inert at runtime (nothing reads imagelayers), but a wrong name means
    // opening the map in Tiled shows no backdrop — which breaks the visual
    // authoring workflow the whole data-driven design depends on. Three of the
    // four used to name files that exist nowhere in the tree.
    const PLATES = new Set([
      "../scenes-v2/map-scene-clean.png",
      "../scenes-v2/workshop-interior-clean.png",
      "../scenes-v2/yard-scene-clean-v2.png",
      "../scenes-v2/track-scene-clean-v2.png",
    ]);
    for (const [name, map] of [
      ["yard", YARD],
      ["track", TRACK],
      ["workshop", WORKSHOP],
      ["map", MAP],
    ] as const) {
      const plates = (map.layers as { type: string; image?: string }[])
        .filter((l) => l.type === "imagelayer")
        .map((l) => l.image);
      expect(plates.length, `${name} has a base plate`).toBeGreaterThan(0);
      for (const image of plates) {
        expect(PLATES.has(image ?? ""), `${name} names "${image}"`).toBe(true);
      }
    }
  });

});

describe("yard.json wiring", () => {
  it("mounts the shared steampunk header with nav plaques on it", () => {
    expect(need(yard, "panel-header").sprite).toBe("panel-header-v2");
    const ws = need(yard, "btn-yard-workshop");
    expect(ws.sprite).toBe("btn-nav-workshop");
    expect(ws.action).toBe("yard-nav");
    expect(ws.arg).toBe("workshop");
    const track_ = need(yard, "btn-yard-track");
    expect(track_.sprite).toBe("btn-nav-track");
    expect(track_.action).toBe("yard-nav");
    expect(track_.arg).toBe("track");
    expect(track_.anchor).toBe("ui-top-right");
  });

  it("places the empty actions plate as a panel", () => {
    const p = need(yard, "panel-yard-actions");
    expect(p.klass).toBe("panel");
    expect(p.sprite).toBe("panel-yard-actions");
    expect(p.action).toBeUndefined();
  });

  it("wires all five bottom-bar actions to real keycap sprites with pressed art", () => {
    for (const [id, sprite, action] of [
      ["btn-edit-car", "btn-yard-edit", "yard-edit-car"],
      ["btn-add-to-train", "btn-yard-hitch", "yard-add"],
      ["btn-remove-from-train", "btn-yard-unhitch", "yard-remove-from-train"],
      ["btn-send-to-track", "btn-yard-totrack", "yard-depart"],
      ["btn-delete-car", "btn-yard-delete", "yard-remove-car"],
    ] as const) {
      const s = need(yard, id);
      expect(s.sprite).toBe(sprite);
      expect(s.action).toBe(action);
      expect(UI_SPRITES[sprite]!.states["pressed"], `${sprite} pressed`).toBeTypeOf("string");
    }
  });

  it("keeps the action keycaps inside the plate's span", () => {
    const p = need(yard, "panel-yard-actions");
    const ids = ["btn-edit-car", "btn-add-to-train", "btn-remove-from-train", "btn-send-to-track", "btn-delete-car"];
    for (const id of ids) {
      const s = need(yard, id);
      expect(Math.abs(s.cx - p.cx), `${id} x`).toBeLessThan(p.w / 2);
      expect(Math.abs(s.cy - p.cy), `${id} y`).toBeLessThan(p.h / 2);
    }
  });
});

describe("track.json wiring", () => {
  it("mounts the shared steampunk header with nav plaques on it", () => {
    expect(need(track, "panel-header").sprite).toBe("panel-header-v2");
    const y = need(track, "btn-track-yard");
    expect(y.sprite).toBe("btn-nav-yard");
    expect(y.action).toBe("track-nav");
    expect(y.arg).toBe("yard");
    const map = need(track, "btn-track-map");
    expect(map.sprite).toBe("btn-nav-map");
    expect(map.arg).toBe("map");
    expect(map.anchor).toBe("ui-top-right");
  });

  it("builds the transport bar from the unified keycap family with pressed states", () => {
    for (const [id, sprite] of [
      ["btn-tempo-down", "btn-transport-slow"],
      ["btn-stop", "btn-transport-stop"],
      ["btn-ride", "btn-track-ride"],
      ["btn-tempo-up", "btn-transport-fast"],
    ] as const) {
      const s = need(track, id);
      expect(s.sprite).toBe(sprite);
      expect(s.label, `${id} label is baked into the art`).toBeUndefined();
      expect(UI_SPRITES[sprite]!.states["pressed"]).toBeTypeOf("string");
    }
  });

  it("rides in ride mode and nudges tempo by ±10 as numbers", () => {
    const ride = need(track, "btn-ride");
    expect(ride.action).toBe("transport-play");
    expect(ride.arg).toBe("ride");
    expect(need(track, "btn-tempo-down").arg).toBe(-10);
    expect(need(track, "btn-tempo-up").arg).toBe(10);
    expect(need(track, "btn-stop").action).toBe("transport-stop");
  });

  it("leaves the SPEED LCD anchor actionless", () => {
    const lcd = need(track, "lcd-transport");
    expect(lcd.klass).toBe("display");
    expect(lcd.action).toBeUndefined();
  });
});

describe("track.json ride-path geometry", () => {
  const path = parseTiledPath(TRACK, "geometry-layer", "track-path");

  it("is a closed, densely-traced polygon in the unit square", () => {
    expect(path.closed).toBe(true);
    expect(path.points.length).toBeGreaterThanOrEqual(32);
    for (const p of path.points) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    }
  });

  it("starts at the right apex and puts the quarter point at the bottom-centre (park)", () => {
    // The scene's park convention: t=0.25 must be the bottom-centre straight.
    const first = path.points[0]!;
    const quarter = path.points[Math.round(path.points.length / 4)]!;
    expect(first.x).toBeGreaterThan(0.8); // right apex
    expect(quarter.x).toBeCloseTo(0.5, 1); // bottom centre
    expect(quarter.y).toBeGreaterThan(first.y); // on the bottom straight
  });

  it("carries numeric perspective tuning props", () => {
    expect(typeof path.props["farScale"]).toBe("number");
    expect(typeof path.props["nearScale"]).toBe("number");
  });

  it("throws loudly when the geometry is missing", () => {
    expect(() => parseTiledPath(TRACK, "geometry-layer", "nope")).toThrow(/no object named/);
    expect(() => parseTiledPath(TRACK, "nope-layer", "track-path")).toThrow(/no object layer/);
  });
});

describe("track.json visualizer screen", () => {
  // The jumbotron ("see the sound") stands in the middle of the oval. Its
  // placement is Tiled data so Eric can drag it in the `?edit` editor — which is
  // exactly why it needs a guard: a drag that parks it over the transport bar or
  // out on the grass would look deliberate and nothing would complain.
  const geometry = parseTiledLayer(TRACK, "geometry-layer");
  const screen = geometry.find((s) => s.id === "viz-screen");
  const ridePath = parseTiledPath(TRACK, "geometry-layer", "track-path");

  it("exists as a real rect, not a zero-size marker", () => {
    expect(screen, "TrackScene renders nothing without it").toBeDefined();
    expect(screen!.w).toBeGreaterThan(0.2);
    expect(screen!.h).toBeGreaterThan(0.1);
  });

  it("stands INSIDE the oval, clear of the header and the transport bar", () => {
    const s = screen!;
    const top = s.cy - s.h / 2;
    const bottom = s.cy + s.h / 2;
    const left = s.cx - s.w / 2;
    const right = s.cx + s.w / 2;

    // Below the header panel and above the transport bar (both from track.json,
    // read here rather than restated so moving either moves this bound too).
    const header = need(track, "panel-header");
    const bar = need(track, "btn-ride");
    expect(top).toBeGreaterThan(header.cy + header.h / 2);
    expect(bottom).toBeLessThan(bar.cy - bar.h / 2);

    // …and inside the ride path's own footprint, so it sits on the infield
    // rather than out on the scenery.
    const xs = ridePath.points.map((p) => p.x);
    const ys = ridePath.points.map((p) => p.y);
    expect(left).toBeGreaterThan(Math.min(...xs));
    expect(right).toBeLessThan(Math.max(...xs));
    expect(top).toBeGreaterThan(Math.min(...ys));
    expect(bottom).toBeLessThan(Math.max(...ys));
  });

  it("keeps the 10:3 aspect its backing store is drawn at", () => {
    // `RENDER_W/RENDER_H` in scene-visualizer.ts is 320x96. A different aspect
    // here would stretch every style non-uniformly — subtle enough to ship.
    const s = screen!;
    const px = (s.w * 2560) / (s.h * 1440);
    expect(px).toBeCloseTo(320 / 96, 1);
  });

  it("is not interactive chrome — the scene owns its tap, not the Tiled engine", () => {
    // `spawnUiLayer` only ever reads the ui-layer, but an `action` authored here
    // would read as wired and do nothing.
    expect(screen!.action).toBeUndefined();
    expect(screen!.sprite).toBeUndefined();
  });
});
