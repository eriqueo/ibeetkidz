import { describe, expect, it } from "vitest";
import { generateBeat, type MelodyVoice } from "../../src/core/generative.ts";
import { createRng } from "../../src/core/rng.ts";
import { DRUM_SOUNDS } from "../../src/core/sound-catalog.ts";
import { MELODY_ROWS } from "../../src/core/scale.ts";
import { MAX_BPM, MAX_LAYERS, MIN_BPM, STEP_COUNT, type Layer } from "../../src/core/types.ts";

/** The characters the app injects at its composition root, as this suite's
 *  stand-in — `generateBeat` takes them as an argument precisely so the core
 *  need not reach into `game/` for the real table. */
const VOICES: MelodyVoice[] = [
  { station: "piano", instrument: "piano" },
  { station: "guitar", instrument: "guitar" },
  { station: "violin", instrument: "pluck" },
];

describe("generateBeat", () => {
  it("is deterministic for a given seed", () => {
    const a = generateBeat(createRng(42));
    const b = generateBeat(createRng(42));
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = generateBeat(createRng(1));
    const b = generateBeat(createRng(2));
    expect(a).not.toEqual(b);
  });

  it("clears prior generated layers before adding new ones", () => {
    const cmds = generateBeat(createRng(7));
    const removals = cmds.filter((c) => c.type === "removeLayer");
    // Every drum, PLUS the tune and the bass — a surprise is a little song now,
    // so re-rolling has to sweep away the melody it made last time as well or
    // the second roll stacks a second tune on the first.
    expect(removals).toHaveLength(DRUM_SOUNDS.length + 2);
    // Every removeLayer must come before the first addLayer (clean slate first).
    const firstAdd = cmds.findIndex((c) => c.type === "addLayer");
    const lastRemove = cmds.map((c) => c.type).lastIndexOf("removeLayer");
    expect(lastRemove).toBeLessThan(firstAdd);
  });

  it("always lays down the core groove (kick, snare, hihat)", () => {
    const cmds = generateBeat(createRng(123));
    const layerIds = cmds
      .filter((c) => c.type === "addLayer")
      .map((c) => (c as { layer: { id: string } }).layer.id);
    for (const core of ["beat-kick", "beat-snare", "beat-hihat"]) {
      expect(layerIds).toContain(core);
    }
  });

  it("sets a tempo within the allowed range", () => {
    const cmds = generateBeat(createRng(9));
    const tempo = cmds.find((c) => c.type === "setTempo") as
      | { bpm: number }
      | undefined;
    expect(tempo).toBeDefined();
    expect(tempo!.bpm).toBeGreaterThanOrEqual(MIN_BPM);
    expect(tempo!.bpm).toBeLessThanOrEqual(MAX_BPM);
  });

  it("produces patterns of the canonical length, on the field the lane uses", () => {
    const cmds = generateBeat(createRng(5), VOICES);
    for (const c of cmds) {
      if (c.type !== "addLayer") continue;
      // A drum lane carries `steps` and a melody lane carries `notes`; asking
      // both for `steps` passed only while a surprise was drums-only.
      const field = c.layer.kind === "melody" ? c.layer.notes : c.layer.steps;
      expect(field).toHaveLength(STEP_COUNT);
    }
  });

  it("plays a TUNE over the beat, on a character, in scale degrees", () => {
    const cmds = generateBeat(createRng(5), VOICES);
    const melodies = cmds
      .filter((c) => c.type === "addLayer")
      .map((c) => (c as { layer: Layer }).layer)
      .filter((l) => l.kind === "melody");
    // The whole point of the change: a surprise is not a drum beat any more.
    expect(melodies.length).toBeGreaterThan(0);

    const tune = melodies.find((l) => l.id === "beat-tune")!;
    // Voiced by a CHARACTER, so the Workshop draws a musician in the car rather
    // than a generic instrument.
    expect(VOICES.map((v) => v.station)).toContain(tune.station);
    expect(tune.notes.flat().length).toBeGreaterThan(0);
    // Degrees, never note names: `degreeToNote` maps these through whatever
    // scale and key the kid has picked, so a surprise cannot land out of key.
    for (const n of tune.notes.flat()) {
      expect(n.row).toBeGreaterThanOrEqual(0);
      expect(n.row).toBeLessThan(MELODY_ROWS);
    }
  });

  it("never exceeds the lane cap the reducer would silently enforce", () => {
    // `addLayer` REFUSES past MAX_LAYERS, so a generator that overshot would
    // have its last lanes dropped without a word — the tune first, since it is
    // added last.
    for (let seed = 0; seed < 60; seed += 1) {
      const adds = generateBeat(createRng(seed), VOICES).filter((c) => c.type === "addLayer");
      expect(adds.length).toBeLessThanOrEqual(MAX_LAYERS);
    }
  });

  it("gives a different song each time the SAME generator is asked again", () => {
    // The app holds ONE seeded rng for the session and every press draws from
    // it, so consecutive presses must differ even though the stream is
    // reproducible from its seed.
    const rng = createRng(11);
    const first = generateBeat(rng, VOICES);
    const second = generateBeat(rng, VOICES);
    expect(first).not.toEqual(second);
  });
});
