import { describe, expect, it } from "vitest";
import { parseTiledLayer, parseTiledPath, TiledMapSchema, type TiledSpawn } from "../../src/game/TiledParser.ts";
import { UI_SPRITES } from "../../src/game/ui-sprites.ts";
// The real on-disk Tiled fixtures the scenes interpret verbatim.
import YARD from "../../src/assets/maps/yard.json";
import TRACK from "../../src/assets/maps/track.json";
import WORKSHOP from "../../src/assets/maps/workshop.json";
import MAP from "../../src/assets/maps/map.json";
import { isMelodyStation } from "../../src/game/instrument-station.ts";

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

  it("emits only melody stations the shelf knows, named after their own art", () => {
    // `workshop-add-melody` carries the STATION — the character the kid tapped —
    // not the synth it happens to be voiced with. A Tiled `arg` is an untyped
    // string, so a station missing from `STATION_VOICE` silently falls back to
    // the default synth AND loses which character made the lane, which is
    // exactly how an alien with a violin arrived in the car as a bear with a
    // toy keyboard.
    for (const s of spawns) {
      if (s.action !== "workshop-add-melody") continue;
      const arg = String(s.arg);
      expect(isMelodyStation(arg), `${s.id} names station "${arg}"`).toBe(true);
      // …and the station must be the object's OWN character, or the lane would
      // wear a picture the kid never tapped.
      expect(`inst-${arg}`, `${s.id} emits a different character`).toBe(s.sprite);
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

  it("does not carry the retired yellow handcar fixture", () => {
    const layers = (MAP as { layers: readonly { name?: string }[] }).layers;
    expect(layers.map((layer) => layer.name)).not.toContain("fixtures-layer");
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

  // ── the ride line stands on the painted rails ────────────────────────────
  //
  // This is a BEHAVIOURAL guard, not a shape one: a vehicle is anchored at its
  // wheels (`car-geometry.ts`), so wherever this polygon runs is where the
  // wheels are. It shipped traced onto the INNER EDGE of the painted oval — 70
  // px above the rails at the bottom of the loop and 40 px below them at the
  // top — which is why the deployed train "isn't even on the tracks when it is
  // on the back side of the tracks".
  //
  // The four numbers below are the painted track's own centreline, measured off
  // `src/assets/scenes-v2/track-scene-clean-v2.png` by finding the two steel
  // rails inside the brown ballast band (the method `scripts/trace-track-path.py`
  // documents and automates). RE-MEASURE THEM when the plate is repainted —
  // AR-033 replaces it with a flat, no-perspective one — by re-running that
  // script, which prints the traced extents.
  it("runs along the painted track's centreline, not beside it", () => {
    const PLATE_W = 2560;
    const PLATE_H = 1440;
    // Measured centreline of the painted rails, in plate px.
    const PAINTED = { top: 401, bottom: 982, left: 336, right: 2217 };
    // Half the painted gauge at its narrowest end — the distance at which a
    // wheel is still on steel rather than on ballast.
    const TOLERANCE = 25;

    const xs = path.points.map((p) => p.x * PLATE_W);
    const ys = path.points.map((p) => p.y * PLATE_H);
    const off = (got: number, want: number): number => Math.abs(got - want);

    expect(off(Math.min(...ys), PAINTED.top), "far side of the loop").toBeLessThan(TOLERANCE);
    expect(off(Math.max(...ys), PAINTED.bottom), "near side of the loop").toBeLessThan(TOLERANCE);
    expect(off(Math.min(...xs), PAINTED.left), "left of the loop").toBeLessThan(TOLERANCE);
    expect(off(Math.max(...xs), PAINTED.right), "right of the loop").toBeLessThan(TOLERANCE);
  });

  it("is traced finely enough, and evenly enough, to ride", () => {
    // Arc-uniform vertices are what make `parkAngle = 0.25` land on the crossing
    // signal and what keep `couplingOffsets` honest — both work in arc length.
    const seg: number[] = [];
    for (let i = 0; i < path.points.length; i++) {
      const a = path.points[i]!;
      const b = path.points[(i + 1) % path.points.length]!;
      seg.push(Math.hypot((b.x - a.x) * 2560, (b.y - a.y) * 1440));
    }
    const min = Math.min(...seg);
    const max = Math.max(...seg);
    expect(max / min).toBeLessThan(1.1);
  });

  it("throws loudly when the geometry is missing", () => {
    expect(() => parseTiledPath(TRACK, "geometry-layer", "nope")).toThrow(/no object named/);
    expect(() => parseTiledPath(TRACK, "nope-layer", "track-path")).toThrow(/no object layer/);
  });
});
