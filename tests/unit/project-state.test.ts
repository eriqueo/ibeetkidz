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

  it("toggles a step (boolean cell → length-1 hit and back)", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: layer("l1", "c1") });
    s = reduce(s, { type: "toggleStep", layerId: "l1", index: 3 });
    expect(s.layers[0]?.steps[3]).toEqual({ row: 0, length: 1 });
    s = reduce(s, { type: "toggleStep", layerId: "l1", index: 3 });
    expect(s.layers[0]?.steps[3]).toBeNull();
  });
});

describe("note model (length + roll)", () => {
  const drumLane = (): ReturnType<typeof reduce> => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    return reduce(s, { type: "addLayer", layer: layer("d1", "c1") });
  };
  const melodyLane = (): ReturnType<typeof reduce> => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    return reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
  };

  it("stretches a drum hit, clamped to the bar end", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 2 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 2, row: 0, length: 4 });
    expect(s.layers[0]?.steps[2]).toEqual({ row: 0, length: 4 });
    // Can't spill past step 15: a note at index 14 caps at length 2.
    let t = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 14 });
    t = reduce(t, { type: "resizeNote", layerId: "d1", index: 14, row: 0, length: 9 });
    expect(t.layers[0]?.steps[14]?.length).toBe(2);
  });

  it("resizing an empty cell is a no-op (same reference, no history churn)", () => {
    const s = drumLane();
    expect(reduce(s, { type: "resizeNote", layerId: "d1", index: 2, row: 0, length: 4 })).toBe(s);
  });

  it("resizing to the same length is a no-op (no undo entry mid-drag)", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 0, length: 3 });
    expect(reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 0, length: 3 })).toBe(s);
  });

  it("cycles a drum roll 1 → 2 → 4 → 1 (absent = single hit)", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 0 });
    expect(s.layers[0]?.steps[0]?.roll).toBeUndefined();
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 2 });
    expect(s.layers[0]?.steps[0]?.roll).toBe(2);
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 4 });
    expect(s.layers[0]?.steps[0]?.roll).toBe(4);
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 1 });
    expect(s.layers[0]?.steps[0]?.roll).toBeUndefined();
  });

  it("roll preserves length; resize preserves roll", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 1 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 1, row: 0, length: 3 });
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 1, row: 0, roll: 4 });
    expect(s.layers[0]?.steps[1]).toEqual({ row: 0, length: 3, roll: 4 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 1, row: 0, length: 2 });
    expect(s.layers[0]?.steps[1]).toEqual({ row: 0, length: 2, roll: 4 });
  });

  it("addNote/removeNote place and clear a melody note at a row", () => {
    let s = reduce(melodyLane(), { type: "addNote", layerId: "m1", index: 2, row: 4, length: 2 });
    expect(s.layers[0]?.notes[2]).toEqual([{ row: 4, length: 2 }]);
    // addNote is idempotent: a second place leaves the existing note untouched.
    expect(reduce(s, { type: "addNote", layerId: "m1", index: 2, row: 4 })).toBe(s);
    s = reduce(s, { type: "removeNote", layerId: "m1", index: 2, row: 4 });
    expect(s.layers[0]?.notes[2]).toEqual([]);
  });

  it("resizes one note in a chord, leaving its neighbours alone", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 4 });
    s = reduce(s, { type: "resizeNote", layerId: "m1", index: 0, row: 4, length: 3 });
    expect(s.layers[0]?.notes[0]).toEqual([
      { row: 0, length: 1 },
      { row: 4, length: 3 },
    ]);
  });

  it("adds a bend pin to a melody note (in-scale path after the start)", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 1 });
    s = reduce(s, { type: "resizeNote", layerId: "m1", index: 0, row: 1, length: 4 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 1, t: 1, toRow: 4 });
    expect(s.layers[0]?.notes[0]?.[0]).toEqual({ row: 1, length: 4, pins: [{ t: 1, row: 4 }] });
  });

  it("addPin upserts by t (dragging the end re-targets the same pin)", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 1 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 1, t: 1, toRow: 4 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 1, t: 1, toRow: 6 });
    expect(s.layers[0]?.notes[0]?.[0]?.pins).toEqual([{ t: 1, row: 6 }]);
  });

  it("keeps multiple pins sorted by t and clamps rows in-scale", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 0, t: 1, toRow: 99 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 0, t: 0.5, toRow: 3 });
    expect(s.layers[0]?.notes[0]?.[0]?.pins).toEqual([
      { t: 0.5, row: 3 },
      { t: 1, row: 6 }, // 99 clamped to the top grid row (MELODY_ROWS-1)
    ]);
  });

  it("roll and bend are mutually exclusive", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 2, t: 1, toRow: 5 });
    // Adding a roll drops the bend…
    s = reduce(s, { type: "setRoll", layerId: "m1", index: 0, row: 2, roll: 2 });
    expect(s.layers[0]?.notes[0]?.[0]).toEqual({ row: 2, length: 1, roll: 2 });
    // …and adding a bend drops the roll.
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 2, t: 1, toRow: 5 });
    expect(s.layers[0]?.notes[0]?.[0]).toEqual({ row: 2, length: 1, pins: [{ t: 1, row: 5 }] });
  });

  it("tunes a drum hit via its row, clamped to ±1 octave; no-op on melody", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "tuneDrum", layerId: "d1", index: 0, pitch: 5 });
    expect(s.layers[0]?.steps[0]).toEqual({ row: 5, length: 1 });
    // Clamped to ±12.
    s = reduce(s, { type: "tuneDrum", layerId: "d1", index: 0, pitch: 99 });
    expect(s.layers[0]?.steps[0]?.row).toBe(12);
    // Tuning preserves length; same pitch is a no-op (no undo churn).
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 12, length: 2 });
    expect(reduce(s, { type: "tuneDrum", layerId: "d1", index: 0, pitch: 12 })).toBe(s);
    // No-op on a melody lane.
    let m = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    expect(reduce(m, { type: "tuneDrum", layerId: "m1", index: 0, pitch: 3 })).toBe(m);
  });

  it("clearPins removes the bend; addPin is a no-op on drums", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 2, t: 1, toRow: 5 });
    s = reduce(s, { type: "clearPins", layerId: "m1", index: 0, row: 2 });
    expect(s.layers[0]?.notes[0]?.[0]).toEqual({ row: 2, length: 1 });

    let d = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 0 });
    expect(reduce(d, { type: "addPin", layerId: "d1", index: 0, row: 0, t: 1, toRow: 3 })).toBe(d);
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
    expect(s.layers[0]?.notes[2]).toEqual([{ row: 4, length: 1 }]);
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
    expect(s.layers[0]?.notes[0]?.map((n) => n.row)).toEqual([0, 2, 4]);
    // removing the middle note leaves the rest of the chord intact
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    expect(s.layers[0]?.notes[0]?.map((n) => n.row)).toEqual([0, 4]);
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
    // Old boolean step pattern upgrades to length-1 hits (still audible).
    expect(p.layers[0]?.steps[0]).toEqual({ row: 0, length: 1 });
    expect(p.layers[0]?.steps.filter(Boolean)).toHaveLength(STEP_COUNT);
  });

  it("migrates the current (pre-length) shapes: boolean[] drums + number[][] chords", () => {
    // The live IndexedDB format right before this feature: drums as boolean[],
    // melody as a dense array of row-sets. Both must upgrade to length-1 notes
    // with no lost hits.
    const save = JSON.stringify({
      id: "cur",
      name: "Current Jam",
      tempoBpm: 110,
      clips: { d1: clip("d1"), m1: clip("m1") },
      layers: [
        {
          id: "d1", clipId: "d1", volume: 0.9, muted: false, kind: "drum",
          steps: [true, false, true, ...new Array(STEP_COUNT - 3).fill(false)],
          notes: [], wave: "triangle", echo: 0, tone: 1,
        },
        {
          id: "m1", clipId: "m1", volume: 0.9, muted: false, kind: "melody",
          steps: [],
          notes: [[0, 4], ...new Array(STEP_COUNT - 1).fill([])],
          wave: "triangle", echo: 0, tone: 1,
        },
      ],
      scaleId: "magic", keyId: "C", swing: 0, activeMachineId: "looper-stage",
    });
    const p = deserialize(save);
    expect(p.layers[0]?.steps[0]).toEqual({ row: 0, length: 1 });
    expect(p.layers[0]?.steps[1]).toBeNull();
    expect(p.layers[0]?.steps[2]).toEqual({ row: 0, length: 1 });
    expect(p.layers[1]?.notes[0]).toEqual([
      { row: 0, length: 1 },
      { row: 4, length: 1 },
    ]);
    expect(p.layers[1]?.notes[1]).toEqual([]);
  });

  it("round-trips a stretched/rolled jam through serialize → deserialize", () => {
    let s = reduce(emptyProject("rt"), { type: "addClip", clip: clip("d1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "d1", clipId: "d1" }) });
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 0, length: 3 });
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 4 });
    const back = deserialize(JSON.stringify(s));
    expect(back.layers[0]?.steps[0]).toEqual({ row: 0, length: 3, roll: 4 });
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
    expect(p.layers[0]?.notes[0]).toEqual([{ row: 3, length: 1 }]);
    expect(p.layers[0]?.notes[1]).toEqual([]);
    expect(p.layers[0]?.notes[2]).toEqual([{ row: 5, length: 1 }]);
  });
});
