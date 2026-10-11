import { describe, expect, it } from "vitest";
import { hasUntouchedStarter, startEmpty, starterBeat } from "../../src/core/generative.ts";
import { activeLayers, emptyProject, reduce } from "../../src/core/project-state.ts";

// Card C5 (approved 2026-10-05): a brand-new song opens with kick, snare and
// hi-hat in car 1, and START EMPTY takes them back out.

const fresh = () => starterBeat().reduce(reduce, emptyProject("p"));

describe("the starter beat", () => {
  it("puts kick, snare and hi-hat in the first car", () => {
    const lanes = activeLayers(fresh());
    expect(lanes.map((l) => l.id)).toEqual(["beat-kick", "beat-snare", "beat-hihat"]);
    expect(lanes.every((l) => l.kind === "drum")).toBe(true);
    // A groove, not a test tone: every lane plays, and the hats keep time.
    expect(lanes.every((l) => l.steps.some(Boolean))).toBe(true);
    expect(lanes[2]!.steps.filter(Boolean)).toHaveLength(8);
  });

  it("is the same groove every time", () => {
    expect(JSON.stringify(activeLayers(fresh()))).toBe(JSON.stringify(activeLayers(fresh())));
  });

  it("is recognised as untouched until the kid changes it", () => {
    let p = fresh();
    expect(hasUntouchedStarter(activeLayers(p))).toBe(true);
    p = reduce(p, { type: "toggleStep", layerId: "beat-kick", index: 3 });
    expect(hasUntouchedStarter(activeLayers(p))).toBe(false);
    expect(hasUntouchedStarter(activeLayers(emptyProject("q")))).toBe(false);
  });

  it("START EMPTY leaves the car with no lanes", () => {
    const p = startEmpty().reduce(reduce, fresh());
    expect(activeLayers(p)).toEqual([]);
  });
});
