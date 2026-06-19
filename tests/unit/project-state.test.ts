import { describe, expect, it } from "vitest";
import {
  dispatch,
  emptyProject,
  initHistory,
  redo,
  reduce,
  undo,
} from "../../src/core/project-state.ts";
import {
  MAX_BPM,
  MAX_LAYERS,
  MIN_BPM,
  STEP_COUNT,
  type Clip,
  type Layer,
} from "../../src/core/types.ts";

const clip = (id: string): Clip => ({
  id,
  source: { kind: "recording", bufferId: `buf-${id}` },
  effects: [],
  color: "#fff",
  label: id,
});

const layer = (id: string, clipId: string): Layer => ({
  id,
  clipId,
  volume: 0.8,
  muted: false,
  steps: [],
});

describe("reduce", () => {
  it("adds a clip", () => {
    const s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    expect(s.clips["c1"]).toBeDefined();
  });

  it("appends effects non-destructively", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "applyEffect", clipId: "c1", effect: { id: "reverse", amount: 1 } });
    s = reduce(s, { type: "applyEffect", clipId: "c1", effect: { id: "echo", amount: 0.5 } });
    expect(s.clips["c1"]?.effects.map((e) => e.id)).toEqual(["reverse", "echo"]);
  });

  it("ignores applyEffect for unknown clip (returns same reference)", () => {
    const s = emptyProject("p");
    expect(reduce(s, { type: "applyEffect", clipId: "nope", effect: { id: "robot", amount: 1 } })).toBe(s);
  });

  it("refuses to add a layer for an unknown clip", () => {
    const s = reduce(emptyProject("p"), { type: "addLayer", layer: layer("l1", "ghost") });
    expect(s.layers).toHaveLength(0);
  });

  it("normalizes layer steps to STEP_COUNT", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: layer("l1", "c1") });
    expect(s.layers[0]?.steps).toHaveLength(STEP_COUNT);
  });

  it("steals the oldest layer when at MAX_LAYERS", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    for (let i = 0; i < MAX_LAYERS + 3; i++) {
      s = reduce(s, { type: "addLayer", layer: layer(`l${i}`, "c1") });
    }
    expect(s.layers).toHaveLength(MAX_LAYERS);
    expect(s.layers[0]?.id).toBe(`l${3}`); // first three stolen
  });

  it("clamps tempo to [MIN_BPM, MAX_BPM]", () => {
    expect(reduce(emptyProject("p"), { type: "setTempo", bpm: 9999 }).tempoBpm).toBe(MAX_BPM);
    expect(reduce(emptyProject("p"), { type: "setTempo", bpm: 1 }).tempoBpm).toBe(MIN_BPM);
  });

  it("toggles a step", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: layer("l1", "c1") });
    s = reduce(s, { type: "toggleStep", layerId: "l1", index: 3 });
    expect(s.layers[0]?.steps[3]).toBe(true);
  });
});

describe("history", () => {
  it("undo then redo returns to the same state", () => {
    let h = initHistory(emptyProject("p"));
    h = dispatch(h, { type: "addClip", clip: clip("c1") });
    const afterAdd = h.present;
    h = undo(h);
    expect(h.present.clips["c1"]).toBeUndefined();
    h = redo(h);
    expect(h.present).toEqual(afterAdd);
  });

  it("no-op commands do not create history entries", () => {
    let h = initHistory(emptyProject("p"));
    h = dispatch(h, { type: "applyEffect", clipId: "ghost", effect: { id: "robot", amount: 1 } });
    expect(h.past).toHaveLength(0);
  });
});
