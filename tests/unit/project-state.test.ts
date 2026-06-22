import { describe, expect, it } from "vitest";
import {
  deserialize,
  dispatch,
  emptyProject,
  initHistory,
  makeLayer,
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

const layer = (id: string, clipId: string): Layer =>
  makeLayer({ id, clipId, volume: 0.8 });

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

  it("renames a clip (trimmed), no-ops on blank/unchanged/unknown", () => {
    const base = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    const renamed = reduce(base, { type: "renameClip", clipId: "c1", label: "  Dog bark  " });
    expect(renamed.clips["c1"]?.label).toBe("Dog bark");
    // Blank, unchanged, and unknown-clip renames return the same reference.
    expect(reduce(renamed, { type: "renameClip", clipId: "c1", label: "   " })).toBe(renamed);
    expect(reduce(renamed, { type: "renameClip", clipId: "c1", label: "Dog bark" })).toBe(renamed);
    expect(reduce(base, { type: "renameClip", clipId: "ghost", label: "x" })).toBe(base);
  });

  it("removes a clip and any lane referencing it (undoable in one step)", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: layer("c1", "c1") });
    expect(s.layers).toHaveLength(1);
    const removed = reduce(s, { type: "removeClip", clipId: "c1" });
    expect(removed.clips["c1"]).toBeUndefined();
    expect(removed.layers).toHaveLength(0); // lane went with its clip
    // Unknown clip → same reference (no history churn).
    expect(reduce(removed, { type: "removeClip", clipId: "c1" })).toBe(removed);
  });

  it("sets and clears a clip's snap-to-beat loop (min 1 beat, no-op when same)", () => {
    const base = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    const snapped = reduce(base, { type: "setClipLoop", clipId: "c1", loopBeats: 2 });
    expect(snapped.clips["c1"]?.loopBeats).toBe(2);
    // Rounds + floors to a whole beat ≥ 1.
    expect(reduce(base, { type: "setClipLoop", clipId: "c1", loopBeats: 0 }).clips["c1"]?.loopBeats).toBe(1);
    expect(reduce(base, { type: "setClipLoop", clipId: "c1", loopBeats: 2.4 }).clips["c1"]?.loopBeats).toBe(2);
    // Same value + clearing an already-natural clip are no-ops (same reference).
    expect(reduce(snapped, { type: "setClipLoop", clipId: "c1", loopBeats: 2 })).toBe(snapped);
    expect(reduce(base, { type: "setClipLoop", clipId: "c1", loopBeats: null })).toBe(base);
    // Clearing a snapped clip drops the field entirely.
    const cleared = reduce(snapped, { type: "setClipLoop", clipId: "c1", loopBeats: null });
    expect(cleared.clips["c1"]?.loopBeats).toBeUndefined();
    // Unknown clip → same reference.
    expect(reduce(base, { type: "setClipLoop", clipId: "ghost", loopBeats: 2 })).toBe(base);
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

describe("melody + song settings", () => {
  it("defaults to Magic Notes in C with no swing", () => {
    const s = emptyProject("p");
    expect(s.scaleId).toBe("magic");
    expect(s.keyId).toBe("C");
    expect(s.swing).toBe(0);
  });

  it("a melody layer gets a full notes array (empty chords) and no steps", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
    expect(s.layers[0]?.notes).toHaveLength(STEP_COUNT);
    expect(s.layers[0]?.notes[0]).toEqual([]); // each step starts as a rest
    expect(s.layers[0]?.steps).toHaveLength(0);
  });

  it("toggles a melody note on then off", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 2, row: 4 });
    expect(s.layers[0]?.notes[2]).toEqual([4]);
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 2, row: 4 });
    expect(s.layers[0]?.notes[2]).toEqual([]);
  });

  it("stacks multiple notes in one column (a chord)", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 4 });
    expect(s.layers[0]?.notes[0]).toEqual([0, 2, 4]);
    // removing the middle note leaves the rest of the chord intact
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    expect(s.layers[0]?.notes[0]).toEqual([0, 4]);
  });

  it("sets scale, key, swing, wave, and echo", () => {
    let s = reduce(emptyProject("p"), { type: "setScale", scaleId: "rainbow" });
    s = reduce(s, { type: "setKey", keyId: "G" });
    s = reduce(s, { type: "setSwing", swing: 0.6 });
    expect(s.scaleId).toBe("rainbow");
    expect(s.keyId).toBe("G");
    expect(s.swing).toBe(0.6);

    s = reduce(s, { type: "addClip", clip: clip("c1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
    s = reduce(s, { type: "setLayerWave", layerId: "m1", wave: "square" });
    s = reduce(s, { type: "setLayerEcho", layerId: "m1", echo: 0.5 });
    expect(s.layers[0]?.wave).toBe("square");
    expect(s.layers[0]?.echo).toBe(0.5);
  });

  it("clamps swing and echo to 0..1", () => {
    expect(reduce(emptyProject("p"), { type: "setSwing", swing: 9 }).swing).toBe(1);
  });

  it("sets per-lane tone and swing, clamped, leaving others alone", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "l1", clipId: "c1" }) });
    // A fresh lane is fully bright and inherits the song groove (swing absent).
    expect(s.layers[0]?.tone).toBe(1);
    expect(s.layers[0]?.swing).toBeUndefined();

    s = reduce(s, { type: "setLayerTone", layerId: "l1", tone: 0.4 });
    s = reduce(s, { type: "setLayerSwing", layerId: "l1", swing: 9 });
    expect(s.layers[0]?.tone).toBe(0.4);
    expect(s.layers[0]?.swing).toBe(1); // clamped to 0..1
  });
});

describe("normalizeProject (back-compat)", () => {
  it("back-fills song settings missing from an old save", () => {
    // A project shaped like the pre-melody version (no scale/key/swing, and a
    // layer with only drum fields) must still load and play.
    const oldSave = JSON.stringify({
      id: "old",
      name: "Old Jam",
      tempoBpm: 120,
      clips: { c1: clip("c1") },
      layers: [{ id: "l1", clipId: "c1", volume: 0.8, muted: false, steps: new Array(STEP_COUNT).fill(true) }],
      activeMachineId: "looper-stage",
    });
    const p = deserialize(oldSave);
    expect(p.scaleId).toBe("magic");
    expect(p.keyId).toBe("C");
    expect(p.swing).toBe(0);
    expect(p.layers[0]?.kind).toBe("drum");
    expect(p.layers[0]?.notes).toHaveLength(0); // drum lanes carry no melody
    expect(p.layers[0]?.echo).toBe(0);
    expect(p.layers[0]?.steps[0]).toBe(true); // original pattern preserved
  });

  it("migrates a pre-chord melody lane (single-note steps → chord arrays)", () => {
    // The first melody release stored notes as (number | null)[]; those saves
    // must upgrade to the chord shape (each step a row-set) without data loss.
    const oldSave = JSON.stringify({
      id: "old2",
      name: "Old Tune",
      tempoBpm: 100,
      clips: { m1: clip("m1") },
      layers: [
        {
          id: "m1",
          clipId: "m1",
          volume: 0.9,
          muted: false,
          kind: "melody",
          steps: [],
          notes: [3, null, 5, ...new Array(STEP_COUNT - 3).fill(null)],
          wave: "triangle",
          echo: 0,
        },
      ],
      scaleId: "magic",
      keyId: "C",
      swing: 0,
      activeMachineId: "looper-stage",
    });
    const p = deserialize(oldSave);
    expect(p.layers[0]?.notes[0]).toEqual([3]);
    expect(p.layers[0]?.notes[1]).toEqual([]);
    expect(p.layers[0]?.notes[2]).toEqual([5]);
  });
});
