import { describe, expect, it } from "vitest";
import {
  deserialize,
  migrate,
  parseSave,
  serialize,
  dispatch,
  activeLayers,
  activePart,
  carAtBar,
  liveTrain,
  songBars,
  emptyProject,
  initHistory,
  dispatchAll,
  makeLayer,
  nextRecordingLabel,
  redo,
  reduce,
  undo,
} from "../../src/core/project-state.ts";
import {
  parseProject,
  SaveParseError,
  type ParseError,
  type ParseResult,
} from "../../src/core/project-schema.ts";
import {
  MAX_BPM,
  MAX_CARS,
  MAX_LAYERS,
  MIN_BPM,
  SCHEMA_VERSION,
  STEP_COUNT,
  type Clip,
  type Layer,
  type Project,
} from "../../src/core/types.ts";

// The save fixtures are imported as RAW TEXT, not as parsed JSON: what crosses
// the persistence boundary is a string, and the truncated one is not valid JSON
// at all. (Same `?raw` idiom the architecture guards use for source files.)
import CAPTURED_LOCALSTORAGE from "../fixtures/pre-v2-localstorage.captured.json?raw";
import TRUNCATED_SAVE from "../fixtures/corrupt-save.truncated.txt?raw";
import WRONG_SHAPE_SAVE from "../fixtures/corrupt-save.wrong-shape.json?raw";
import FUTURE_SAVE from "../fixtures/future-save.v99.json?raw";

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

  it("removeEffect peels one effect by index; no-ops out of range / unknown clip", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "applyEffect", clipId: "c1", effect: { id: "reverse", amount: 1 } });
    s = reduce(s, { type: "applyEffect", clipId: "c1", effect: { id: "echo", amount: 0.5 } });
    const peeled = reduce(s, { type: "removeEffect", clipId: "c1", index: 0 });
    expect(peeled.clips["c1"]?.effects.map((e) => e.id)).toEqual(["echo"]);
    expect(reduce(s, { type: "removeEffect", clipId: "c1", index: 9 })).toBe(s); // out of range
    expect(reduce(s, { type: "removeEffect", clipId: "nope", index: 0 })).toBe(s); // unknown clip
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
    expect(activeLayers(s)).toHaveLength(1);
    const removed = reduce(s, { type: "removeClip", clipId: "c1" });
    expect(removed.clips["c1"]).toBeUndefined();
    expect(activeLayers(removed)).toHaveLength(0); // lane went with its clip
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
    expect(activeLayers(s)).toHaveLength(0);
  });

  it("normalizes layer steps to STEP_COUNT", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: layer("l1", "c1") });
    expect(activeLayers(s)[0]?.steps).toHaveLength(STEP_COUNT);
  });

  // This used to assert the OPPOSITE — that the oldest lane is stolen at the
  // cap — which is how silent data loss survived as "tested behaviour". A kid's
  // first lane vanishing to make room for one they never asked for is not a
  // capacity policy, it is losing their work.
  it("REFUSES a lane past MAX_LAYERS instead of stealing the oldest", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    for (let i = 0; i < MAX_LAYERS + 3; i++) {
      s = reduce(s, { type: "addLayer", layer: layer(`l${i}`, "c1") });
    }
    expect(activeLayers(s)).toHaveLength(MAX_LAYERS);
    expect(activeLayers(s)[0]?.id, "the kid's FIRST lane must survive").toBe("l0");
    expect(activeLayers(s).at(-1)?.id).toBe(`l${MAX_LAYERS - 1}`);
  });

  it("returns the SAME state when it refuses, so the funnel sees a no-op", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    for (let i = 0; i < MAX_LAYERS; i++) {
      s = reduce(s, { type: "addLayer", layer: layer(`l${i}`, "c1") });
    }
    // Referential equality is the contract `dispatch` in app/context.tsx reads
    // to decide whether anything happened; a fresh-but-equal object would make
    // a refused add look like a change and offer a bogus undo.
    expect(reduce(s, { type: "addLayer", layer: layer("overflow", "c1") })).toBe(s);
  });

  it("reorders lanes within the car (moveLayer up/down, edges are no-ops)", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    for (const id of ["a", "b", "c"]) {
      s = reduce(s, { type: "addLayer", layer: layer(id, "c1") });
    }
    const ids = (st: typeof s): string[] => activeLayers(st).map((l) => l.id);
    expect(ids(s)).toEqual(["a", "b", "c"]);
    // move "c" up one → [a, c, b]
    s = reduce(s, { type: "moveLayer", layerId: "c", dir: -1 });
    expect(ids(s)).toEqual(["a", "c", "b"]);
    // move "a" up at the top edge → no-op (identity-stable)
    const before = s;
    s = reduce(s, { type: "moveLayer", layerId: "a", dir: -1 });
    expect(s).toBe(before);
    // move "b" down at the bottom edge → no-op
    expect(reduce(s, { type: "moveLayer", layerId: "b", dir: 1 })).toBe(s);
    // unknown lane → no-op
    expect(reduce(s, { type: "moveLayer", layerId: "zzz", dir: -1 })).toBe(s);
  });

  it("sets a melody lane's instrument (identity-stable, survives a save round-trip)", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
    s = reduce(s, { type: "setLayerInstrument", layerId: "m1", instrument: "bells" });
    expect(activeLayers(s)[0]?.instrument).toBe("bells");
    // No-op when unchanged → same Project ref (clean undo history).
    expect(reduce(s, { type: "setLayerInstrument", layerId: "m1", instrument: "bells" })).toBe(s);
    // Persists through serialize → deserialize.
    const round = deserialize(serialize(s));
    expect(activeLayers(round)[0]?.instrument).toBe("bells");
  });

  it("a voice-sampler melody lane (instrument voice:<bufferId>) survives a save round-trip", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("rec1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({
        id: "rec1",
        clipId: "rec1",
        kind: "melody",
        instrument: "voice:buf-rec1",
        notes: Array.from({ length: STEP_COUNT }, (_, i) => (i === 0 ? [0] : null)),
      }),
    });
    expect(activeLayers(s)[0]?.instrument).toBe("voice:buf-rec1");
    const round = deserialize(serialize(s));
    expect(activeLayers(round)[0]?.instrument).toBe("voice:buf-rec1");
    expect(activeLayers(round)[0]?.kind).toBe("melody");
  });

  it("clamps tempo to [MIN_BPM, MAX_BPM]", () => {
    expect(reduce(emptyProject("p"), { type: "setTempo", bpm: 9999 }).tempoBpm).toBe(MAX_BPM);
    expect(reduce(emptyProject("p"), { type: "setTempo", bpm: 1 }).tempoBpm).toBe(MIN_BPM);
  });

  it("toggles a step (boolean cell → length-1 hit and back)", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: layer("l1", "c1") });
    s = reduce(s, { type: "toggleStep", layerId: "l1", index: 3 });
    expect(activeLayers(s)[0]?.steps[3]).toEqual({ row: 0, length: 1 });
    s = reduce(s, { type: "toggleStep", layerId: "l1", index: 3 });
    expect(activeLayers(s)[0]?.steps[3]).toBeNull();
  });
});

describe("note model (length + roll)", () => {
  const drumLane = (): ReturnType<typeof reduce> => {
    const s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    return reduce(s, { type: "addLayer", layer: layer("d1", "c1") });
  };
  const melodyLane = (): ReturnType<typeof reduce> => {
    const s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    return reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
  };

  it("stretches a drum hit, clamped to the bar end", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 2 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 2, row: 0, length: 4 });
    expect(activeLayers(s)[0]?.steps[2]).toEqual({ row: 0, length: 4 });
    // Can't spill past step 15: a note at index 14 caps at length 2.
    let t = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 14 });
    t = reduce(t, { type: "resizeNote", layerId: "d1", index: 14, row: 0, length: 9 });
    expect(activeLayers(t)[0]?.steps[14]?.length).toBe(2);
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
    expect(activeLayers(s)[0]?.steps[0]?.roll).toBeUndefined();
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 2 });
    expect(activeLayers(s)[0]?.steps[0]?.roll).toBe(2);
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 4 });
    expect(activeLayers(s)[0]?.steps[0]?.roll).toBe(4);
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 1 });
    expect(activeLayers(s)[0]?.steps[0]?.roll).toBeUndefined();
  });

  it("roll preserves length; resize preserves roll", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 1 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 1, row: 0, length: 3 });
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 1, row: 0, roll: 4 });
    expect(activeLayers(s)[0]?.steps[1]).toEqual({ row: 0, length: 3, roll: 4 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 1, row: 0, length: 2 });
    expect(activeLayers(s)[0]?.steps[1]).toEqual({ row: 0, length: 2, roll: 4 });
  });

  it("addNote/removeNote place and clear a melody note at a row", () => {
    let s = reduce(melodyLane(), { type: "addNote", layerId: "m1", index: 2, row: 4, length: 2 });
    expect(activeLayers(s)[0]?.notes[2]).toEqual([{ row: 4, length: 2 }]);
    // addNote is idempotent: a second place leaves the existing note untouched.
    expect(reduce(s, { type: "addNote", layerId: "m1", index: 2, row: 4 })).toBe(s);
    s = reduce(s, { type: "removeNote", layerId: "m1", index: 2, row: 4 });
    expect(activeLayers(s)[0]?.notes[2]).toEqual([]);
  });

  it("resizes one note in a chord, leaving its neighbours alone", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 4 });
    s = reduce(s, { type: "resizeNote", layerId: "m1", index: 0, row: 4, length: 3 });
    expect(activeLayers(s)[0]?.notes[0]).toEqual([
      { row: 0, length: 1 },
      { row: 4, length: 3 },
    ]);
  });

  it("adds a bend pin to a melody note (in-scale path after the start)", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 1 });
    s = reduce(s, { type: "resizeNote", layerId: "m1", index: 0, row: 1, length: 4 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 1, t: 1, toRow: 4 });
    expect(activeLayers(s)[0]?.notes[0]?.[0]).toEqual({ row: 1, length: 4, pins: [{ t: 1, row: 4 }] });
  });

  it("addPin upserts by t (dragging the end re-targets the same pin)", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 1 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 1, t: 1, toRow: 4 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 1, t: 1, toRow: 6 });
    expect(activeLayers(s)[0]?.notes[0]?.[0]?.pins).toEqual([{ t: 1, row: 6 }]);
  });

  it("keeps multiple pins sorted by t and clamps rows in-scale", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 0, t: 1, toRow: 99 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 0, t: 0.5, toRow: 3 });
    expect(activeLayers(s)[0]?.notes[0]?.[0]?.pins).toEqual([
      { t: 0.5, row: 3 },
      { t: 1, row: 6 }, // 99 clamped to the top grid row (MELODY_ROWS-1)
    ]);
  });

  it("roll and bend are mutually exclusive", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 2, t: 1, toRow: 5 });
    // Adding a roll drops the bend…
    s = reduce(s, { type: "setRoll", layerId: "m1", index: 0, row: 2, roll: 2 });
    expect(activeLayers(s)[0]?.notes[0]?.[0]).toEqual({ row: 2, length: 1, roll: 2 });
    // …and adding a bend drops the roll.
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 2, t: 1, toRow: 5 });
    expect(activeLayers(s)[0]?.notes[0]?.[0]).toEqual({ row: 2, length: 1, pins: [{ t: 1, row: 5 }] });
  });

  it("tunes a drum hit via its row, clamped to ±1 octave; no-op on melody", () => {
    let s = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "tuneDrum", layerId: "d1", index: 0, pitch: 5 });
    expect(activeLayers(s)[0]?.steps[0]).toEqual({ row: 5, length: 1 });
    // Clamped to ±12.
    s = reduce(s, { type: "tuneDrum", layerId: "d1", index: 0, pitch: 99 });
    expect(activeLayers(s)[0]?.steps[0]?.row).toBe(12);
    // Tuning preserves length; same pitch is a no-op (no undo churn).
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 12, length: 2 });
    expect(reduce(s, { type: "tuneDrum", layerId: "d1", index: 0, pitch: 12 })).toBe(s);
    // No-op on a melody lane.
    const m = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 0 });
    expect(reduce(m, { type: "tuneDrum", layerId: "m1", index: 0, pitch: 3 })).toBe(m);
  });

  it("clearPins removes the bend; addPin is a no-op on drums", () => {
    let s = reduce(melodyLane(), { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 0, row: 2, t: 1, toRow: 5 });
    s = reduce(s, { type: "clearPins", layerId: "m1", index: 0, row: 2 });
    expect(activeLayers(s)[0]?.notes[0]?.[0]).toEqual({ row: 2, length: 1 });

    const d = reduce(drumLane(), { type: "toggleStep", layerId: "d1", index: 0 });
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
    expect(activeLayers(s)[0]?.notes).toHaveLength(STEP_COUNT);
    expect(activeLayers(s)[0]?.notes[0]).toEqual([]); // each step starts as a rest
    expect(activeLayers(s)[0]?.steps).toHaveLength(0);
  });

  it("toggles a melody note on then off", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "c1", kind: "melody" }),
    });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 2, row: 4 });
    expect(activeLayers(s)[0]?.notes[2]).toEqual([{ row: 4, length: 1 }]);
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 2, row: 4 });
    expect(activeLayers(s)[0]?.notes[2]).toEqual([]);
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
    expect(activeLayers(s)[0]?.notes[0]?.map((n) => n.row)).toEqual([0, 2, 4]);
    // removing the middle note leaves the rest of the chord intact
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 0, row: 2 });
    expect(activeLayers(s)[0]?.notes[0]?.map((n) => n.row)).toEqual([0, 4]);
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
    expect(activeLayers(s)[0]?.wave).toBe("square");
    expect(activeLayers(s)[0]?.echo).toBe(0.5);
  });

  it("clamps swing and echo to 0..1", () => {
    expect(reduce(emptyProject("p"), { type: "setSwing", swing: 9 }).swing).toBe(1);
  });

  it("sets per-lane tone and swing, clamped, leaving others alone", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "l1", clipId: "c1" }) });
    // A fresh lane is fully bright and inherits the song groove (swing absent).
    expect(activeLayers(s)[0]?.tone).toBe(1);
    expect(activeLayers(s)[0]?.swing).toBeUndefined();

    s = reduce(s, { type: "setLayerTone", layerId: "l1", tone: 0.4 });
    s = reduce(s, { type: "setLayerSwing", layerId: "l1", swing: 9 });
    expect(activeLayers(s)[0]?.tone).toBe(0.4);
    expect(activeLayers(s)[0]?.swing).toBe(1); // clamped to 0..1
  });

  it("sets the per-lane silliness knobs (wobble/crunch), clamped", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "l1", clipId: "c1" }) });
    // A fresh lane is dry + clean (both absent — pre-knob saves stay valid).
    expect(activeLayers(s)[0]?.wobble).toBeUndefined();
    expect(activeLayers(s)[0]?.crunch).toBeUndefined();

    s = reduce(s, { type: "setLayerWobble", layerId: "l1", wobble: 0.7 });
    s = reduce(s, { type: "setLayerCrunch", layerId: "l1", crunch: 9 });
    expect(activeLayers(s)[0]?.wobble).toBe(0.7);
    expect(activeLayers(s)[0]?.crunch).toBe(1); // clamped to 0..1

    // The knobs survive a save/load round-trip (makeLayer passthrough).
    const rebuilt = makeLayer(activeLayers(s)[0] as never);
    expect(rebuilt.wobble).toBe(0.7);
    expect(rebuilt.crunch).toBe(1);
  });
});

describe("Song Train structure (Inc 0 — one car, invisible)", () => {
  it("a fresh project is a single car, already on the train", () => {
    const s = emptyProject("p");
    expect(s.parts).toHaveLength(1);
    expect(s.parts[0]!.carType).toBe("boxcar");
    expect(s.train).toEqual([
      { instanceId: `${s.parts[0]!.id}-inst-1`, partId: s.parts[0]!.id, muted: false },
    ]);
    expect(s.activePartId).toBe(s.parts[0]!.id);
    expect(activePart(s).layers).toBe(activeLayers(s));
  });

  it("layer edits land in the active car's lanes", () => {
    let s = reduce(emptyProject("p"), { type: "addClip", clip: clip("c1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "l1", clipId: "c1" }) });
    expect(activeLayers(s)).toHaveLength(1);
    expect(s.parts[0]!.layers).toHaveLength(1);
  });

  it("migrates a pre-Song-Train save (flat layers) into one car", () => {
    const legacy = JSON.stringify({
      id: "old", name: "Flat Jam", tempoBpm: 120,
      clips: { c1: clip("c1") },
      layers: [{ id: "l1", clipId: "c1", volume: 0.8, muted: false, kind: "drum", steps: new Array(STEP_COUNT).fill(true), notes: [] }],
      scaleId: "magic", keyId: "C", swing: 0, activeMachineId: "looper-stage",
    });
    const p = deserialize(legacy);
    expect(p.parts).toHaveLength(1);
    expect(p.train).toHaveLength(1); // the one car is placed on the train
    expect(p.activePartId).toBe(p.parts[0]!.id);
    expect(activeLayers(p)).toHaveLength(1); // the flat lane survived into the car
    expect(activeLayers(p)[0]?.steps[0]).toEqual({ row: 0, length: 1 });
  });

  it("migrates a pre-v2 arrangement (repeats) into a flat train", () => {
    const proj = deserialize(
      JSON.stringify({
        id: "song", name: "Song", tempoBpm: 100, clips: {},
        parts: [
          { id: "a", name: "Verse", color: "#fff", layers: [] },
          { id: "b", name: "Chorus", color: "#000", layers: [] },
        ],
        arrangement: [{ partId: "a", repeats: 2 }, { partId: "b", repeats: 1 }],
        activePartId: "b", scaleId: "magic", keyId: "C", swing: 0,
        activeMachineId: "looper-stage",
      }),
    );
    expect(proj.parts.map((p) => p.name)).toEqual(["Verse", "Chorus"]);
    // a×2 + b×1 expands into three one-bar slots, in order.
    expect(proj.train.map((c) => c.partId)).toEqual(["a", "a", "b"]);
    expect(proj.train.every((c) => c.muted === false)).toBe(true);
    expect(new Set(proj.train.map((c) => c.instanceId)).size).toBe(3); // unique ids
    expect(proj.activePartId).toBe("b");
  });

  it("round-trips a v2 train save (instanceId + muted)", () => {
    const proj = deserialize(
      JSON.stringify({
        id: "song", name: "Song", tempoBpm: 100, clips: {},
        parts: [{ id: "a", name: "Verse", color: "#fff", carType: "tanker", layers: [] }],
        train: [
          { instanceId: "i1", partId: "a", muted: false },
          { instanceId: "i2", partId: "a", muted: true },
        ],
        activePartId: "a", scaleId: "magic", keyId: "C", swing: 0,
        activeMachineId: "looper-stage",
      }),
    );
    expect(proj.parts[0]!.carType).toBe("tanker");
    expect(proj.train).toEqual([
      { instanceId: "i1", partId: "a", muted: false },
      { instanceId: "i2", partId: "a", muted: true },
    ]);
  });

  it("repairs a dangling activePartId and drops stale arrangement entries", () => {
    const p = deserialize(
      JSON.stringify({
        id: "x", name: "X", tempoBpm: 100, clips: {},
        parts: [{ id: "a", name: "A", color: "#fff", layers: [] }],
        arrangement: [{ partId: "ghost", repeats: 3 }, { partId: "a", repeats: 1 }],
        activePartId: "ghost", scaleId: "magic", keyId: "C", swing: 0,
        activeMachineId: "looper-stage",
      }),
    );
    expect(p.activePartId).toBe("a"); // ghost → first car
    expect(p.train.map((c) => c.partId)).toEqual(["a"]); // ghost dropped
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
    expect(activeLayers(p)[0]?.kind).toBe("drum");
    expect(activeLayers(p)[0]?.notes).toHaveLength(0); // drum lanes carry no melody
    expect(activeLayers(p)[0]?.echo).toBe(0);
    // Old boolean step pattern upgrades to length-1 hits (still audible).
    expect(activeLayers(p)[0]?.steps[0]).toEqual({ row: 0, length: 1 });
    expect(activeLayers(p)[0]?.steps.filter(Boolean)).toHaveLength(STEP_COUNT);
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
    expect(activeLayers(p)[0]?.steps[0]).toEqual({ row: 0, length: 1 });
    expect(activeLayers(p)[0]?.steps[1]).toBeNull();
    expect(activeLayers(p)[0]?.steps[2]).toEqual({ row: 0, length: 1 });
    expect(activeLayers(p)[1]?.notes[0]).toEqual([
      { row: 0, length: 1 },
      { row: 4, length: 1 },
    ]);
    expect(activeLayers(p)[1]?.notes[1]).toEqual([]);
  });

  it("round-trips a stretched/rolled jam through serialize → deserialize", () => {
    let s = reduce(emptyProject("rt"), { type: "addClip", clip: clip("d1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "d1", clipId: "d1" }) });
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 0, length: 3 });
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 4 });
    const back = deserialize(JSON.stringify(s));
    expect(activeLayers(back)[0]?.steps[0]).toEqual({ row: 0, length: 3, roll: 4 });
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
    expect(activeLayers(p)[0]?.notes[0]).toEqual([{ row: 3, length: 1 }]);
    expect(activeLayers(p)[0]?.notes[1]).toEqual([]);
    expect(activeLayers(p)[0]?.notes[2]).toEqual([{ row: 5, length: 1 }]);
  });
});

// ── Song Train: cars + arrangement ──────────────────────────────────────────

describe("Song Train cars", () => {
  /** A one-car project with a single drum lane carrying one hit at step 0. */
  const oneCarWithLane = () => {
    let s = reduce(emptyProject("st"), { type: "addClip", clip: clip("d1") });
    s = reduce(s, { type: "addLayer", layer: layer("d1", "d1") });
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
    return s;
  };

  it("addCar starts a FRESH EMPTY car (clears the board) and selects it", () => {
    const base = oneCarWithLane();
    const s = reduce(base, { type: "addCar", id: "car-2", carType: "tanker" });

    expect(s.parts).toHaveLength(2);
    expect(s.activePartId).toBe("car-2"); // opens the new car for editing
    // addCar adds to the LIBRARY only — the train is untouched (that's the Yard's job).
    expect(s.train).toEqual(base.train);
    // NEW CAR means new: no lanes carried over (copying is duplicateCar's job),
    // and the picked type sticks.
    expect(activeLayers(s)).toEqual([]);
    expect(s.parts[1]?.carType).toBe("tanker");
    // The source car is untouched.
    expect(s.parts[0]?.layers.map((l) => l.id)).toEqual(["d1"]);
  });

  it("edits to one car don't bleed into its duplicate (copy-on-write)", () => {
    const base = oneCarWithLane();
    let s = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    const car1 = s.parts[0]!.id;
    // Edit car 2 (active): add a second hit. Car 1 must be untouched.
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 4 });
    const car2Lane = s.parts.find((p) => p.id === "car-2")!.layers[0]!;
    const car1Lane = s.parts.find((p) => p.id === car1)!.layers[0]!;
    expect(car2Lane.steps[4]).toEqual({ row: 0, length: 1 });
    expect(car1Lane.steps[4]).toBeNull();
  });

  it("addCar with a clashing id is a no-op", () => {
    const s = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    expect(reduce(s, { type: "addCar", id: "car-2" })).toBe(s);
  });

  it("caps the train at MAX_CARS (addCar + duplicateCar no-op at the cap)", () => {
    let s = oneCarWithLane();
    for (let i = 2; i <= MAX_CARS; i++) s = reduce(s, { type: "addCar", id: `car-${i}` });
    expect(s.parts).toHaveLength(MAX_CARS);
    expect(reduce(s, { type: "addCar", id: "car-over" })).toBe(s);
    expect(reduce(s, { type: "duplicateCar", partId: s.parts[0]!.id, id: "dup-over" })).toBe(s);
  });

  it("selectCar switches the editing focus; no-ops on active/unknown", () => {
    const base = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    const car1 = base.parts[0]!.id;
    const s = reduce(base, { type: "selectCar", partId: car1 });
    expect(s.activePartId).toBe(car1);
    expect(reduce(s, { type: "selectCar", partId: car1 })).toBe(s); // already active
    expect(reduce(s, { type: "selectCar", partId: "ghost" })).toBe(s); // unknown
  });

  it("renameCar trims; no-ops on blank/unchanged/unknown", () => {
    const base = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    const s = reduce(base, { type: "renameCar", partId: "car-2", name: "  Chorus  " });
    expect(s.parts.find((p) => p.id === "car-2")?.name).toBe("Chorus");
    expect(reduce(s, { type: "renameCar", partId: "car-2", name: "   " })).toBe(s);
    expect(reduce(s, { type: "renameCar", partId: "car-2", name: "Chorus" })).toBe(s);
    expect(reduce(s, { type: "renameCar", partId: "ghost", name: "x" })).toBe(s);
  });

  it("removeCar drops the car + cascades to its train slots, keeps clips, picks a neighbor", () => {
    let s = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    s = reduce(s, { type: "addCar", id: "car-3" }); // active = car-3
    const car1 = s.parts[0]!.id;
    // Place car-3 on the train twice so the cascade has something to remove.
    s = reduce(s, { type: "addToTrain", instanceId: "t3a", partId: "car-3" });
    s = reduce(s, { type: "addToTrain", instanceId: "t3b", partId: "car-3" });
    s = reduce(s, { type: "addToTrain", instanceId: "t2", partId: "car-2" });
    s = reduce(s, { type: "removeCar", partId: "car-3" });
    expect(s.parts.map((p) => p.id)).toEqual([car1, "car-2"]);
    // Both car-3 slots are gone; the car-1 default slot + car-2 slot remain.
    expect(s.train.map((c) => c.partId)).toEqual([car1, "car-2"]);
    expect(s.activePartId).toBe("car-2"); // neighbor of the removed active car
    expect(s.clips["d1"]).toBeDefined(); // shared clip survives
  });

  it("removeCar refuses to delete the last car", () => {
    const s = oneCarWithLane();
    expect(reduce(s, { type: "removeCar", partId: s.activePartId })).toBe(s);
  });

  it("duplicateCar copies a specific car, inserts it right after, selects it", () => {
    // Two cars: car1 (with lane), car-2 (active). Duplicate car1 specifically.
    let s = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    const car1 = s.parts[0]!.id;
    s = reduce(s, { type: "duplicateCar", partId: car1, id: "car-dup" });
    // Inserted right AFTER the source in the library (parts); train untouched.
    expect(s.parts.map((p) => p.id)).toEqual([car1, "car-dup", "car-2"]);
    expect(s.activePartId).toBe("car-dup"); // opens the copy
    // Carries the source's lanes (with the hit), as its own array.
    expect(activeLayers(s).map((l) => l.id)).toEqual(["d1"]);
    expect(activeLayers(s)[0]?.steps[0]).toEqual({ row: 0, length: 1 });
  });

  it("duplicateCar no-ops on a clashing id or unknown source", () => {
    const s = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    expect(reduce(s, { type: "duplicateCar", partId: s.parts[0]!.id, id: "car-2" })).toBe(s);
    expect(reduce(s, { type: "duplicateCar", partId: "ghost", id: "car-x" })).toBe(s);
  });

  it("copyLayerToCar copies the active car's lane onto another car (fresh id)", () => {
    // car1 (active) holds lane d1; add car-2, then copy d1 from car-2... no —
    // copy is from the ACTIVE car. Build: car1 active with d1, add car-2 (copy),
    // edit car-2's d1 so it differs, then send a fresh copy back? Simpler: start
    // on car1, add a SECOND empty car, copy d1 onto it.
    let s = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    // car-2 is the copy + active; remove its lane so it's an empty target.
    s = reduce(s, { type: "removeLayer", layerId: "d1" });
    const car1 = s.parts[0]!.id;
    s = reduce(s, { type: "selectCar", partId: car1 }); // edit car1 (has d1)
    s = reduce(s, {
      type: "copyLayerToCar",
      layerId: "d1",
      targetPartId: "car-2",
      newLayerId: "d1-copy",
    });
    const target = s.parts.find((p) => p.id === "car-2")!;
    expect(target.layers.map((l) => l.id)).toEqual(["d1-copy"]);
    expect(target.layers[0]?.clipId).toBe("d1"); // shares the song-wide clip
    expect(target.layers[0]?.steps[0]).toEqual({ row: 0, length: 1 }); // copied data
    // Source car untouched (still its own d1).
    expect(s.parts.find((p) => p.id === car1)!.layers.map((l) => l.id)).toEqual(["d1"]);
  });

  it("copyLayerToCar no-ops on same car, unknown target, unknown lane, or dup id", () => {
    const base = oneCarWithLane();
    let s = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    const car1 = s.parts[0]!.id;
    s = reduce(s, { type: "selectCar", partId: car1 });
    // same car as active
    expect(
      reduce(s, { type: "copyLayerToCar", layerId: "d1", targetPartId: car1, newLayerId: "x" }),
    ).toBe(s);
    // unknown target
    expect(
      reduce(s, { type: "copyLayerToCar", layerId: "d1", targetPartId: "ghost", newLayerId: "x" }),
    ).toBe(s);
    // unknown lane
    expect(
      reduce(s, { type: "copyLayerToCar", layerId: "nope", targetPartId: "car-2", newLayerId: "x" }),
    ).toBe(s);
    // car-2 already has a lane id "d1" (it was duplicated from car1) → dup id no-op
    expect(
      reduce(s, { type: "copyLayerToCar", layerId: "d1", targetPartId: "car-2", newLayerId: "d1" }),
    ).toBe(s);
  });

  it("undo covers a car add (Project-level history)", () => {
    let h = initHistory(oneCarWithLane());
    h = dispatch(h, { type: "addCar", id: "car-2" });
    expect(h.present.parts).toHaveLength(2);
    h = undo(h);
    expect(h.present.parts).toHaveLength(1);
    h = redo(h);
    expect(h.present.parts).toHaveLength(2);
  });

  it("round-trips a multi-car song through serialize → deserialize", () => {
    const s = reduce(oneCarWithLane(), { type: "addCar", id: "car-2" });
    const back = deserialize(JSON.stringify(s));
    expect(back.parts.map((p) => p.id)).toEqual(s.parts.map((p) => p.id));
    expect(back.train).toEqual(s.train);
    expect(back.activePartId).toBe(s.activePartId);
  });
});

describe("train assembly (the Yard)", () => {
  // A library with three cars; the train starts with just the default car's slot.
  const threeCarLibrary = () => {
    let s = reduce(emptyProject("yd"), { type: "addClip", clip: clip("d1") });
    s = reduce(s, { type: "addLayer", layer: layer("d1", "d1") });
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "addCar", id: "car-2" });
    s = reduce(s, { type: "addCar", id: "car-3" });
    return s;
  };

  it("addToTrain appends a slot; no-ops on unknown car or duplicate instanceId", () => {
    let s = threeCarLibrary();
    const before = s.train.length;
    s = reduce(s, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    expect(s.train).toHaveLength(before + 1);
    expect(s.train.at(-1)).toEqual({ instanceId: "i2", partId: "car-2", muted: false });
    expect(reduce(s, { type: "addToTrain", instanceId: "i2", partId: "car-3" })).toBe(s); // dup id
    expect(reduce(s, { type: "addToTrain", instanceId: "i9", partId: "ghost" })).toBe(s); // unknown car
  });

  it("removeFromTrain drops by instanceId; no-op when absent", () => {
    let s = reduce(threeCarLibrary(), { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    const n = s.train.length;
    s = reduce(s, { type: "removeFromTrain", instanceId: "i2" });
    expect(s.train).toHaveLength(n - 1);
    expect(s.train.some((c) => c.instanceId === "i2")).toBe(false);
    expect(reduce(s, { type: "removeFromTrain", instanceId: "nope" })).toBe(s);
  });

  it("reorderTrain reorders by the given instanceId list", () => {
    let s = threeCarLibrary();
    s = reduce(s, { type: "addToTrain", instanceId: "a", partId: "car-2" });
    s = reduce(s, { type: "addToTrain", instanceId: "b", partId: "car-3" });
    const first = s.train[0]!.instanceId; // the default car's slot
    s = reduce(s, { type: "reorderTrain", instanceIds: ["b", "a", first] });
    expect(s.train.map((c) => c.instanceId)).toEqual(["b", "a", first]);
    // Unchanged order is a no-op (identity-stable).
    expect(reduce(s, { type: "reorderTrain", instanceIds: ["b", "a", first] })).toBe(s);
  });

  it("muteCar toggles the tarp flag; no-op when unchanged", () => {
    let s = reduce(threeCarLibrary(), { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    s = reduce(s, { type: "muteCar", instanceId: "i2", muted: true });
    expect(s.train.find((c) => c.instanceId === "i2")!.muted).toBe(true);
    expect(reduce(s, { type: "muteCar", instanceId: "i2", muted: true })).toBe(s); // unchanged
    expect(reduce(s, { type: "muteCar", instanceId: "ghost", muted: true })).toBe(s); // unknown
  });

  it("setCarType changes a car's sprite; no-op when unchanged/unknown", () => {
    let s = threeCarLibrary();
    s = reduce(s, { type: "setCarType", partId: "car-2", carType: "flatcar" });
    expect(s.parts.find((p) => p.id === "car-2")!.carType).toBe("flatcar");
    expect(reduce(s, { type: "setCarType", partId: "car-2", carType: "flatcar" })).toBe(s);
    expect(reduce(s, { type: "setCarType", partId: "ghost", carType: "tanker" })).toBe(s);
  });

  it("songBars / carAtBar / liveTrain walk the assembled train (one bar per slot)", () => {
    let s = threeCarLibrary(); // train = [default car's slot]
    const car1 = s.parts[0]!.id;
    s = reduce(s, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    s = reduce(s, { type: "addToTrain", instanceId: "i3", partId: "car-3" });
    expect(songBars(s)).toBe(3);
    expect(liveTrain(s).map((c) => c.partId)).toEqual([car1, "car-2", "car-3"]);
    expect(carAtBar(s, 0)).toEqual({ index: 0, car: s.train[0], startBar: 0 });
    expect(carAtBar(s, 2)).toEqual({ index: 2, car: s.train[2], startBar: 2 });
    expect(carAtBar(s, 3)).toBeNull();
  });

  it("liveTrain ignores slots pointing at a removed car", () => {
    let s = reduce(threeCarLibrary(), { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    // Forge a stale slot (as a corrupt save might) and confirm it's filtered.
    s = { ...s, train: [...s.train, { instanceId: "x", partId: "ghost", muted: false }] };
    expect(liveTrain(s).some((c) => c.partId === "ghost")).toBe(false);
    expect(songBars(s)).toBe(2);
  });
});

describe("numbered pattern slots", () => {
  // A drum lane with a single hit at step 0.
  const oneLane = () => {
    let s = reduce(emptyProject("pt"), { type: "addClip", clip: clip("d1") });
    s = reduce(s, { type: "addLayer", layer: layer("d1", "d1") });
    return reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
  };
  const lane0 = (s: ReturnType<typeof oneLane>): Layer => activeLayers(s)[0]!;

  it("a fresh lane carries no pattern fields (single-pattern shape)", () => {
    const l = lane0(oneLane());
    expect(l.variations).toBeUndefined();
    expect(l.patternIndex).toBeUndefined();
  });

  it("addPattern stashes the current take and makes an editable copy active", () => {
    let s = oneLane();
    s = reduce(s, { type: "addPattern", layerId: "d1" });
    const l = lane0(s);
    expect(l.variations).toHaveLength(1); // the original, stashed
    expect(l.patternIndex).toBe(1); // the copy is the new last slot
    expect(l.steps[0]).toEqual({ row: 0, length: 1 }); // copy carries the hit
    // Editing the active copy must NOT touch the stashed slot 1.
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 4 });
    const l2 = lane0(s);
    expect(l2.steps[4]).toEqual({ row: 0, length: 1 });
    expect(l2.variations?.[0]?.steps[4]).toBeNull(); // slot 1 untouched
  });

  it("selectPattern swaps a slot live; no-op on current/out-of-range", () => {
    let s = oneLane();
    s = reduce(s, { type: "addPattern", layerId: "d1" }); // slot 2 active (copy)
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 4 }); // edit slot 2
    s = reduce(s, { type: "selectPattern", layerId: "d1", index: 0 }); // back to slot 1
    expect(lane0(s).patternIndex).toBe(0);
    expect(lane0(s).steps[4]).toBeNull(); // slot 1 never got the step-4 hit
    expect(reduce(s, { type: "selectPattern", layerId: "d1", index: 0 })).toBe(s); // already active
    expect(reduce(s, { type: "selectPattern", layerId: "d1", index: 9 })).toBe(s); // out of range
  });

  it("removePattern drops a slot, promotes a neighbor, never below one", () => {
    let s = oneLane();
    s = reduce(s, { type: "addPattern", layerId: "d1" }); // 2 slots, slot 2 active
    s = reduce(s, { type: "removePattern", layerId: "d1", index: 1 }); // drop active
    const l = lane0(s);
    expect(l.variations).toBeUndefined(); // collapsed back to single-pattern
    expect(l.patternIndex).toBeUndefined();
    // Last slot can't be removed.
    expect(reduce(s, { type: "removePattern", layerId: "d1", index: 0 })).toBe(s);
  });

  it("caps at MAX_PATTERNS slots", () => {
    let s = oneLane();
    for (let i = 0; i < 12; i++) s = reduce(s, { type: "addPattern", layerId: "d1" });
    expect((lane0(s).variations?.length ?? 0) + 1).toBe(9);
  });

  it("round-trips pattern variations through serialize → deserialize", () => {
    let s = oneLane();
    s = reduce(s, { type: "addPattern", layerId: "d1" });
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 8 });
    const back = deserialize(serialize(s));
    const l = activeLayers(back)[0]!;
    expect(l.variations).toHaveLength(1);
    expect(l.patternIndex).toBe(1);
    expect(l.steps[8]).toEqual({ row: 0, length: 1 });
    expect(l.variations?.[0]?.steps[8]).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ticket S5 — the save format is versioned, and everything crossing the
// persistence boundary is PARSED there rather than cast.
//
// The tests above this line all reach the migration through `deserialize` with
// hand-typed JSON: they prove the migration handles the shape the author
// REMEMBERED. The block below adds (a) the version + Result contract, (b) a
// save captured out of a real browser running the real pre-v2 code, and (c) the
// corrupt/refused paths that used to be a crash or a silently-blank project.
// ─────────────────────────────────────────────────────────────────────────────

describe("save format: version, parse, refuse (S5)", () => {
  const expectOk = <T,>(result: ParseResult<T>): T => {
    if (!result.ok) {
      throw new Error(
        `expected a parsed save, got ${result.error.code} at "${result.error.path}": ${result.error.detail}`,
      );
    }
    return result.value;
  };

  const expectFail = <T,>(result: ParseResult<T>): ParseError => {
    if (result.ok) throw new Error("expected a parse failure, got a Project");
    return result.error;
  };

  /** A project with something of every persisted shape in it, so a round-trip
   *  that drops a field has somewhere to show up. */
  const richProject = (): Project => {
    let s = reduce(emptyProject("rich"), { type: "addClip", clip: clip("d1") });
    s = reduce(s, { type: "addClip", clip: clip("m1") });
    s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "d1", clipId: "d1" }) });
    s = reduce(s, {
      type: "addLayer",
      layer: makeLayer({ id: "m1", clipId: "m1", kind: "melody" }),
    });
    s = reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
    s = reduce(s, { type: "setRoll", layerId: "d1", index: 0, row: 0, roll: 4 });
    s = reduce(s, { type: "resizeNote", layerId: "d1", index: 0, row: 0, length: 3 });
    s = reduce(s, { type: "addPattern", layerId: "d1" });
    s = reduce(s, { type: "toggleNote", layerId: "m1", index: 2, row: 3 });
    s = reduce(s, { type: "addPin", layerId: "m1", index: 2, row: 3, t: 1, toRow: 5 });
    s = reduce(s, { type: "setLayerInstrument", layerId: "m1", instrument: "bells" });
    s = reduce(s, { type: "setLayerWobble", layerId: "m1", wobble: 0.4 });
    s = reduce(s, { type: "setLayerCrunch", layerId: "m1", crunch: 0.2 });
    s = reduce(s, { type: "setLayerSwing", layerId: "m1", swing: 0.3 });
    s = reduce(s, { type: "setClipLoop", clipId: "d1", loopBeats: 2 });
    s = reduce(s, { type: "addCar", id: "car-2" });
    s = reduce(s, { type: "setCarType", partId: "car-2", carType: "tanker" });
    s = reduce(s, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    s = reduce(s, { type: "muteCar", instanceId: "i2", muted: true });
    s = reduce(s, { type: "setScale", scaleId: "rainbow" });
    s = reduce(s, { type: "setKey", keyId: "G" });
    s = reduce(s, { type: "setActiveView", view: "yard" });
    return s;
  };

  describe("versioning", () => {
    it("stamps the current schema version on every Project it mints", () => {
      expect(emptyProject("p").schemaVersion).toBe(SCHEMA_VERSION);
      expect(richProject().schemaVersion).toBe(SCHEMA_VERSION);
      // …and on anything it migrates forward out of an older save.
      expect(deserialize(JSON.stringify({ id: "old", name: "Old" })).schemaVersion).toBe(
        SCHEMA_VERSION,
      );
    });

    it("history snapshots inherit the project's version (F1-3)", () => {
      // Undo snapshots ARE Projects and serialize to the same shape, so they
      // carry the same version rather than a parallel one of their own.
      let h = initHistory(emptyProject("h"));
      h = dispatch(h, { type: "setTempo", bpm: 140 });
      h = dispatch(h, { type: "setSwing", swing: 0.5 });
      h = undo(h);
      const every = [...h.past, h.present, ...h.future];
      expect(every.length).toBeGreaterThan(2);
      for (const snapshot of every) expect(snapshot.schemaVersion).toBe(SCHEMA_VERSION);
      // A snapshot survives the boundary exactly like the live project does.
      const first = h.past[0] as Project;
      expect(expectOk(parseSave(serialize(first)))).toEqual(first);
    });

    it("a version-1 save is parsed, not migrated — `migrate` is the identity", () => {
      const project = richProject();
      const parsed = parseProject(JSON.parse(serialize(project)) as unknown);
      const save = expectOk(parsed);
      expect(save.version).toBe(1);
      expect(migrate(save)).toEqual(project);
    });

    it("a save with no version field is version 0 and goes through the frozen migrator", () => {
      const save = expectOk(
        parseProject({ id: "old", name: "Old Jam", layers: [], activeMachineId: "looper-stage" }),
      );
      expect(save.version).toBe(0);
    });
  });

  describe("round-trip", () => {
    it("a v1 save round-trips through serialize → parseSave with every field intact", () => {
      const project = richProject();
      expect(expectOk(parseSave(serialize(project)))).toEqual(project);
    });

    // The COMPILE-TIME half of this property lives in `project-schema.ts`
    // (`SchemaProducesProject` / `SchemaAddsNoFields`): add a field to `Project`
    // without teaching the schema about it and `npm run typecheck` fails. This
    // is the runtime half — it catches a schema that type-checks but silently
    // drops a key at runtime (e.g. a `.strip()` that outran its shape).
    it("the parser's key set stays in lockstep with Project's", () => {
      const project = richProject();
      const parsed = expectOk(parseSave(serialize(project)));
      expect(Object.keys(parsed).sort()).toEqual(Object.keys(project).sort());
      const part = parsed.parts[0] as Project["parts"][number];
      expect(Object.keys(part).sort()).toEqual(
        Object.keys(project.parts[0] as object).sort(),
      );
      const lane = part.layers[1];
      expect(Object.keys(lane as object).sort()).toEqual(
        Object.keys(project.parts[0]!.layers[1] as object).sort(),
      );
    });
  });

  // ── The real save ─────────────────────────────────────────────────────────
  // Captured out of Chromium's localStorage while running the app at commit
  // d047d61 — the LAST commit whose running app persisted the pre-v2
  // `arrangement` shape. See `tests/fixtures/pre-v2-save.provenance.json`.
  describe("a real pre-v2 save, captured from a browser", () => {
    interface StoredEntry {
      readonly name: string;
      readonly savedAt: number;
      readonly json: string;
    }
    const envelope = JSON.parse(CAPTURED_LOCALSTORAGE) as Record<string, StoredEntry>;
    const entry = Object.values(envelope)[0] as StoredEntry;

    it("is the raw localStorage envelope the pre-v2 app actually wrote", () => {
      // Guard the fixture itself: if someone "tidies" it into today's shape the
      // migration stops being tested at all.
      expect(Object.keys(envelope)).toHaveLength(1);
      expect(entry.json).toBeTypeOf("string");
      const raw = JSON.parse(entry.json) as Record<string, unknown>;
      expect(raw.schemaVersion).toBeUndefined(); // predates versioning
      expect(raw.train).toBeUndefined(); // predates the flat train
      expect(raw.arrangement).toBeDefined(); // …and carries what it replaced
      const firstPart = (raw.parts as Record<string, unknown>[])[0] as Record<string, unknown>;
      expect(firstPart.carType).toBeUndefined(); // predates car sprites
    });

    it("loads with the child's work intact", () => {
      const project = expectOk(parseSave(entry.json));

      expect(project.schemaVersion).toBe(SCHEMA_VERSION);
      expect(project.name).toBe("My Beat");
      expect(project.tempoBpm).toBe(100);

      // Three cars were built in the Yard; all three survive, in order.
      expect(project.parts.map((p) => p.name)).toEqual(["Loop 1", "Loop 3", "Loop 2"]);
      // `arrangement` (3 × repeats:1) expands into three one-bar train slots.
      expect(project.train).toHaveLength(3);
      expect(project.train.map((c) => c.partId)).toEqual(project.parts.map((p) => p.id));
      expect(project.train.every((c) => c.muted === false)).toBe(true);
      expect(new Set(project.train.map((c) => c.instanceId)).size).toBe(3);

      // The lanes: kick + snare (drum) and a melody lane, with their real hits.
      const car = project.parts[0]!;
      expect(car.layers.map((l) => l.kind)).toEqual(["drum", "drum", "melody"]);
      expect(car.layers[0]!.steps.map((c) => (c ? 1 : 0))).toEqual([
        1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
      ]);
      expect(car.layers[1]!.steps.map((c) => (c ? 1 : 0))).toEqual([
        0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
      ]);
      expect(car.layers[2]!.notes[0]).toEqual([{ row: 4, length: 1 }]);
      expect(car.layers[2]!.notes[6]).toEqual([{ row: 2, length: 1 }]);
      expect(car.layers[2]!.notes[10]).toEqual([{ row: 4, length: 1 }]);

      // Every sound the lanes point at came across, with its source intact.
      expect(Object.keys(project.clips)).toHaveLength(3);
      for (const layer of car.layers) expect(project.clips[layer.clipId]).toBeDefined();

      // `carType` predates this save, so it is derived: drum + melody = boxcar.
      expect(car.carType).toBe("boxcar");
      // The view the kid left the app on is preserved, not reset to the map.
      expect(project.activeView).toBe("track");
    });

    it("re-saving the migrated project writes a v1 save that round-trips", () => {
      const migrated = expectOk(parseSave(entry.json));
      const resaved = serialize(migrated);
      expect((JSON.parse(resaved) as Project).schemaVersion).toBe(SCHEMA_VERSION);
      expect(expectOk(parseSave(resaved))).toEqual(migrated);
    });
  });

  // ── Failure, as a value ───────────────────────────────────────────────────
  describe("corrupt and future saves fail as typed values", () => {
    it("a truncated save (a torn write) is `not-json`, with copy a kid can read", () => {
      const error = expectFail(parseSave(TRUNCATED_SAVE));
      expect(error.code).toBe("not-json");
      expect(error.kidMessage.title).toBe("🚂 I can't read this song.");
      expect(error.kidMessage.body).toContain("it'll save just fine!");
      // The operator detail is separate from what the child sees.
      expect(error.detail).not.toBe("");
    });

    it("a v1 save with the wrong shape is `unreadable`, and says where", () => {
      const error = expectFail(parseSave(WRONG_SHAPE_SAVE));
      expect(error.code).toBe("unreadable");
      expect(error.path).toBe("parts");
      expect(error.kidMessage.title).toBe("🚂 I can't read this song.");
    });

    it("valid JSON that isn't an object is `not-an-object` (it used to load as blank)", () => {
      // Before S5 each of these reached `normalizeProject` and produced a
      // pristine empty project — the child's song replaced by silence, silently.
      for (const junk of ["null", "5", "[]", '"hello"', "true"]) {
        expect(expectFail(parseSave(junk)).code).toBe("not-an-object");
      }
    });

    it("REFUSES a save from a newer version rather than guessing (F1-1)", () => {
      const error = expectFail(parseSave(FUTURE_SAVE));
      expect(error.code).toBe("too-new");
      expect(error.path).toBe("schemaVersion");
      expect(error.detail).toContain("version 99");
      expect(error.kidMessage).toEqual({
        title: "🚂 This song is too new for me!",
        body:
          "It was made with a newer ibeetkidz.\nAsk a grown-up to update this one, then your\nsong will be right here waiting.",
      });
    });

    it("a nonsense version is unreadable, not a silent version 0", () => {
      for (const bad of ['"1"', "1.5", "-1", "null"]) {
        const error = expectFail(parseSave(`{"schemaVersion":${bad},"id":"x"}`));
        // `null` is a present-but-junk version, not an absent one.
        expect(error.code).toBe("unreadable");
        expect(error.path).toBe("schemaVersion");
      }
    });

    it("the deprecated `deserialize` shim throws the typed error, not a SyntaxError", () => {
      expect(() => deserialize(TRUNCATED_SAVE)).toThrow(SaveParseError);
      try {
        deserialize(FUTURE_SAVE);
        throw new Error("expected a throw");
      } catch (err) {
        expect(err).toBeInstanceOf(SaveParseError);
        expect((err as SaveParseError).error.code).toBe("too-new");
      }
    });
  });

  // ── The specific holes F1 named ───────────────────────────────────────────
  describe("fields that used to enter unvalidated", () => {
    it("parses `clips` per entry and drops only the broken one", () => {
      // `context.tsx` switches on `clip.source.kind` over data that was never
      // shown to HAVE a source; a clip with no source is unplayable anyway, so
      // it is dropped rather than allowed to crash the load or the app.
      const project = expectOk(
        parseSave(
          JSON.stringify({
            id: "cl",
            clips: {
              good: clip("good"),
              headless: { id: "headless", effects: [], color: "#fff", label: "?" },
              wrongKind: { ...clip("wrongKind"), source: { kind: "telepathy" } },
            },
          }),
        ),
      );
      expect(Object.keys(project.clips)).toEqual(["good"]);
      expect(project.clips.good?.source).toEqual({
        kind: "recording",
        bufferId: "buf-good",
      });
    });

    it("coerces an out-of-union `activeView` instead of routing nowhere", () => {
      // An unknown view fell past all four `Shell` returns and rendered nothing.
      const legacy = expectOk(parseSave(JSON.stringify({ id: "v", activeView: "atlantis" })));
      expect(legacy.activeView).toBe("map");
      const current = expectOk(
        parseSave(serialize({ ...richProject(), activeView: "atlantis" } as unknown as Project)),
      );
      expect(current.activeView).toBe("map");
    });

    it("tolerates a retired tool id in `activeMachineId` rather than rejecting the save", () => {
      // The v1 tool ids are gone; a save still naming one must still load.
      const project = expectOk(
        parseSave(JSON.stringify({ id: "t", activeMachineId: "record-voicefx" })),
      );
      expect(project.activeMachineId).toBe("record-voicefx");
    });

    it("drops a junk entry inside `parts` instead of throwing on it", () => {
      // Pre-S5 a `null` in `parts` reached `normalizePart` and threw on
      // `raw.name` — an unrecoverable boot, from one bad array slot.
      const project = expectOk(
        parseSave(
          JSON.stringify({
            id: "j",
            parts: [null, { id: "a", name: "Verse", color: "#fff", layers: [] }, 7],
            activePartId: "a",
          }),
        ),
      );
      expect(project.parts.map((p) => p.id)).toEqual(["a"]);
    });

    it("refuses a v1 save with no cars at all (the reducers can never produce one)", () => {
      const error = expectFail(
        parseSave(serialize({ ...richProject(), parts: [] } as unknown as Project)),
      );
      expect(error.code).toBe("unreadable");
      expect(error.path).toBe("parts");
    });
  });
});

// ── dispatchAll: a compound action is ONE undo step ──────────────────────────
// Undo is a child's undo — one tap puts back one thing they did. "Surprise me"
// is ~15 commands and dispatching them one at a time made undoing it ~15 taps,
// which is not undo, it is a chore.
describe("dispatchAll", () => {
  const start = (): ReturnType<typeof initHistory> => initHistory(emptyProject("p1"));

  it("records ONE history entry for many commands", () => {
    const h = dispatchAll(start(), [
      { type: "setTempo", bpm: 130 },
      { type: "setKey", keyId: "D" },
      { type: "setScale", scaleId: "rainbow" },
    ]);
    expect(h.past.length).toBe(1);
    expect(h.present.tempoBpm).toBe(130);
    expect(h.present.scaleId).toBe("rainbow");
    expect(h.present.keyId).toBe("D");
    // …so ONE undo puts all of it back.
    const back = undo(h);
    expect(back.past.length).toBe(0);
    expect(back.present.tempoBpm).toBe(start().present.tempoBpm);
    expect(back.present.keyId).toBe(start().present.keyId);
  });

  it("applies the commands in order, so later ones win", () => {
    const h = dispatchAll(start(), [
      { type: "setTempo", bpm: 100 },
      { type: "setTempo", bpm: 155 },
    ]);
    expect(h.present.tempoBpm).toBe(155);
    expect(h.past.length).toBe(1);
  });

  it("pushes nothing when the WHOLE batch is a no-op", () => {
    // A genuinely-refused command, i.e. one whose reducer returns the SAME
    // state object: `removeCar` declines to delete the last car. (`setTempo`
    // with an unchanged bpm is NOT one — it rebuilds the object either way,
    // which is why the funnel compares store identity rather than intent.)
    const h0 = start();
    const h = dispatchAll(h0, [{ type: "removeCar", partId: h0.present.parts[0]!.id }]);
    expect(h).toBe(h0);
  });

  it("still records one entry when only the LAST command changes anything", () => {
    // The no-op rule is per-BATCH, not per-command — this is exactly the shape
    // `generateBeat` produces (it clears layers that usually do not exist yet,
    // then lays down the groove).
    const h0 = start();
    const h = dispatchAll(h0, [
      { type: "removeLayer", layerId: "not-there" },
      { type: "setTempo", bpm: 141 },
    ]);
    expect(h.past.length).toBe(1);
    expect(h.present.tempoBpm).toBe(141);
  });

  it("clears the redo future, like any other new edit", () => {
    const h = undo(dispatchAll(start(), [{ type: "setTempo", bpm: 130 }]));
    expect(h.future.length).toBe(1);
    expect(dispatchAll(h, [{ type: "setTempo", bpm: 111 }]).future).toEqual([]);
  });

  it("an empty batch changes nothing", () => {
    const h0 = start();
    expect(dispatchAll(h0, [])).toBe(h0);
  });
});

// The Sound Pads panel lists every recording a child has ever made, so two of
// them called "My Voice 1" is a genuine dead end — there is nothing else on the
// pad to tell them apart. Naming used to come from module-level counters in
// `Workshop.tsx`, which reset to 0 on every page load while the clips they named
// were autosaved and reloaded, so the collision was guaranteed on the second
// session rather than merely possible.
describe("nextRecordingLabel", () => {
  const named = (...labels: string[]): Project => {
    let s = emptyProject("p");
    labels.forEach((label, i) => {
      s = reduce(s, { type: "addClip", clip: { ...clip(`c${i}`), label } });
    });
    return s;
  };

  it("starts at 1 in an empty project", () => {
    expect(nextRecordingLabel(emptyProject("p"), "My Voice")).toBe("My Voice 1");
  });

  it("continues from the highest number ALREADY in the project", () => {
    // The bug in one line: a reloaded project holds "My Voice 1" and the next
    // recording must not be called "My Voice 1" again.
    expect(nextRecordingLabel(named("My Voice 1"), "My Voice")).toBe("My Voice 2");
    expect(nextRecordingLabel(named("My Voice 1", "My Voice 2", "My Voice 3"), "My Voice")).toBe("My Voice 4");
  });

  it("fills past a gap rather than reusing a freed number", () => {
    // Deleting "My Voice 2" must not make the next take a second "My Voice 3".
    expect(nextRecordingLabel(named("My Voice 1", "My Voice 3"), "My Voice")).toBe("My Voice 4");
  });

  it("counts only its own prefix", () => {
    const s = named("My Voice 1", "My Voice 2", "Voice Keys 1", "Magic Pad 7");
    expect(nextRecordingLabel(s, "Voice Keys")).toBe("Voice Keys 2");
    expect(nextRecordingLabel(s, "Magic Pad")).toBe("Magic Pad 8");
    expect(nextRecordingLabel(s, "My Voice")).toBe("My Voice 3");
  });

  it("ignores labels that merely start with the prefix", () => {
    // "My Voice" (no number) and "My Voice 2 copy" are not slot 2.
    const s = named("My Voice", "My Voice 2 copy", "My Voicebox 9");
    expect(nextRecordingLabel(s, "My Voice")).toBe("My Voice 1");
  });

  it("treats the prefix as a literal, not a pattern", () => {
    // A regex metacharacter in the prefix must not match anything it shouldn't.
    expect(nextRecordingLabel(named("Ax 4"), "A.")).toBe("A. 1");
  });
});
