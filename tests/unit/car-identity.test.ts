// Car identity: "livery + load".
//
// The user-facing bug these guard is "there is no way of knowing which car is
// which in the yard." Two properties carry the whole scheme and both fail
// SILENTLY — a duplicate livery and a wrong load look like a rendered car, not
// like an error:
//
//   1. no two of the 12 cars may wear the same livery, INCLUDING cars loaded
//      from a save whose colours predate the table, and INCLUDING duplicates;
//   2. a car's load is the dominant family of its own lanes, and an empty car
//      carries nothing.
//
// Plus the accessibility rule the design brief asked for: a livery's glyph must
// contrast with its own panel, which is a property of the colour table and so
// can be checked once for every entry rather than eyeballed in one screenshot.

import { describe, expect, it } from "vitest";
import {
  CAR_COLORS,
  carCargo,
  carLiveries,
  liveryIndexOf,
  nextCarColor,
} from "../../src/core/car-identity.ts";
import { glyphFor, colorFor, inkOn, luma, LIVERY_GLYPHS, CHIP_EDGE, CHIP_FACE, LANE_GROUP_SPRITE } from "../../src/game/livery-style.ts";
import { UI_SPRITES } from "../../src/game/ui-sprites.ts";
import { emptyProject, makeLayer, makePart, reduce } from "../../src/core/project-state.ts";
import { MAX_CARS, type Clip, type Layer, type Part } from "../../src/core/types.ts";

const part = (id: string, color: string, layers: readonly Layer[] = []): Part =>
  makePart(id, id, color, layers);

const layer = (id: string, clipId: string, kind: "drum" | "melody" = "drum"): Layer =>
  makeLayer({ id, clipId, kind } as Partial<Layer> as Layer);

const clip = (id: string, source: Clip["source"]): Clip => ({
  id,
  source,
  effects: [],
  color: "#888888",
  label: id,
});

describe("CAR_COLORS", () => {
  it("has one entry per car the app allows", () => {
    // A 5-entry table cycling over 12 cars guaranteed twins; this is the fix.
    expect(CAR_COLORS.length).toBe(MAX_CARS);
  });

  it("has no duplicates", () => {
    expect(new Set(CAR_COLORS).size).toBe(CAR_COLORS.length);
  });

  it("gives every livery a glyph that contrasts with its own panel", () => {
    // The brief's accessibility note: check the colour field against the chip,
    // not against the background. `paper` (#f4e8c1) is the entry that proves
    // this matters — a cream glyph on it would be invisible.
    for (const hex of CAR_COLORS) {
      const ink = inkOn(hex);
      const inkLuma = ink === CHIP_EDGE ? luma("#2b2440") : luma("#e9d7ac");
      expect(Math.abs(luma(hex) - inkLuma)).toBeGreaterThan(0.25);
    }
    expect(inkOn("#f4e8c1")).toBe(CHIP_EDGE); // light livery → dark ink
    expect(inkOn("#2f6fa8")).toBe(CHIP_FACE); // dark livery → cream ink
  });
});

describe("carLiveries — every car in a full yard is unique", () => {
  it("gives 12 cars 12 different liveries", () => {
    const parts = CAR_COLORS.map((c, i) => part(`p${i}`, c));
    const out = carLiveries(parts);
    expect(new Set(out.values()).size).toBe(MAX_CARS);
  });

  it("resolves a car by its own colour, so a livery survives its neighbours", () => {
    const third = part("c", CAR_COLORS[2] as string);
    const before = carLiveries([part("a", CAR_COLORS[0] as string), part("b", CAR_COLORS[1] as string), third]);
    const after = carLiveries([third]); // the other two deleted
    expect(before.get("c")).toBe(2);
    expect(after.get("c")).toBe(2);
  });

  it("still separates cars from a save whose colours predate the table", () => {
    // The retired 5-entry table. None of these resolve by lookup, so they must
    // fall through to lowest-unused rather than colliding on a hash.
    const legacy = ["#fb5607", "#3a86ff", "#06d6a0", "#8338ec", "#ffd166"];
    legacy.forEach((c) => expect(liveryIndexOf(c)).toBe(-1));
    const out = carLiveries(legacy.map((c, i) => part(`old${i}`, c)));
    expect(new Set(out.values()).size).toBe(legacy.length);
  });

  it("separates two cars that somehow share a colour", () => {
    const same = CAR_COLORS[4] as string;
    const out = carLiveries([part("a", same), part("b", same)]);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("assigns something to every car, even past the table", () => {
    const parts = Array.from({ length: 20 }, (_, i) => part(`p${i}`, "#000000"));
    const out = carLiveries(parts);
    expect(out.size).toBe(20);
    for (const p of parts) expect(typeof out.get(p.id)).toBe("number");
  });
});

describe("nextCarColor + the reducers that use it", () => {
  it("picks the lowest colour nobody is wearing", () => {
    expect(nextCarColor([])).toBe(CAR_COLORS[0]);
    expect(nextCarColor([part("a", CAR_COLORS[0] as string)])).toBe(CAR_COLORS[1]);
    // A hole in the middle is filled before the end.
    const held = [0, 1, 3].map((i) => part(`p${i}`, CAR_COLORS[i] as string));
    expect(nextCarColor(held)).toBe(CAR_COLORS[2]);
  });

  it("addCar never repeats a livery, right up to MAX_CARS", () => {
    let project = emptyProject("proj");
    for (let i = project.parts.length; i < MAX_CARS; i += 1) {
      project = reduce(project, { type: "addCar", id: `car-${i}` });
    }
    expect(project.parts.length).toBe(MAX_CARS);
    expect(new Set(carLiveries(project.parts).values()).size).toBe(MAX_CARS);
  });

  it("duplicateCar gives the copy its own livery", () => {
    // It used to copy `src.color`, so a duplicate was a guaranteed twin — same
    // silhouette, same load, same colour — which is the ONE case the derived
    // channel cannot separate and therefore the case livery exists for.
    const project = emptyProject("proj");
    const src = project.parts[0]!;
    const next = reduce(project, { type: "duplicateCar", partId: src.id, id: "copy" });
    const copy = next.parts.find((p) => p.id === "copy")!;
    expect(copy.color).not.toBe(src.color);
    expect(copy.carType).toBe(src.carType); // same lanes ⇒ same kind of car
    expect(copy.layers).toEqual(src.layers);
  });
});

describe("carCargo — what a car is carrying", () => {
  const clips: Record<string, Clip> = {
    kick: clip("kick", { kind: "builtin", assetId: "kick" }),
    doh: clip("doh", { kind: "builtin", assetId: "note-do" }),
    mine: clip("mine", { kind: "recording", bufferId: "r1" }),
  };

  it("carries nothing when the car is empty", () => {
    expect(carCargo(part("a", CAR_COLORS[0] as string), clips)).toBeNull();
  });

  it("reads the family of a single lane", () => {
    expect(carCargo(part("a", "#000", [layer("l1", "kick")]), clips)).toBe("drum");
    expect(carCargo(part("a", "#000", [layer("l1", "mine")]), clips)).toBe("voice");
    expect(carCargo(part("a", "#000", [layer("l1", "doh")]), clips)).toBe("tone");
    expect(carCargo(part("a", "#000", [layer("l1", "kick", "melody")]), clips)).toBe("melody");
  });

  it("reports the DOMINANT family, not the first one added", () => {
    const layers = [layer("a", "mine"), layer("b", "kick"), layer("c", "kick")];
    expect(carCargo(part("p", "#000", layers), clips)).toBe("drum");
  });

  it("breaks a tie the same way whatever order the lanes were added in", () => {
    const a = [layer("1", "kick"), layer("2", "mine")];
    const b = [layer("1", "mine"), layer("2", "kick")];
    expect(carCargo(part("p", "#000", a), clips)).toBe(carCargo(part("p", "#000", b), clips));
  });
});

describe("the load a family maps to", () => {
  it("names a sprite that actually exists in the packed atlas manifest", () => {
    // No new art: every load is an `inst-*` the Workshop already loads. A typo
    // here would draw nothing at all, silently.
    for (const key of Object.values(LANE_GROUP_SPRITE)) {
      expect(UI_SPRITES[key]).toBeDefined();
    }
  });

  it("uses a different picture for every family", () => {
    const keys = Object.values(LANE_GROUP_SPRITE);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("glyphs", () => {
  it("gives the first eight cars eight different shapes", () => {
    const first = Array.from({ length: LIVERY_GLYPHS.length }, (_, i) => glyphFor(i));
    expect(new Set(first).size).toBe(LIVERY_GLYPHS.length);
  });

  it("never repeats BOTH shape and colour within a full yard", () => {
    const seen = new Set<string>();
    for (let i = 0; i < MAX_CARS; i += 1) seen.add(`${glyphFor(i)}|${colorFor(i)}`);
    expect(seen.size).toBe(MAX_CARS);
  });
});
