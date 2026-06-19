import { describe, expect, it } from "vitest";
import { generateBeat } from "../../src/core/generative.ts";
import { createRng } from "../../src/core/rng.ts";
import { DRUM_SOUNDS } from "../../src/core/sound-catalog.ts";
import { MAX_BPM, MIN_BPM, STEP_COUNT } from "../../src/core/types.ts";

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
    expect(removals).toHaveLength(DRUM_SOUNDS.length);
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
    for (const core of ["gen-kick", "gen-snare", "gen-hihat"]) {
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

  it("produces step patterns of the canonical length", () => {
    const cmds = generateBeat(createRng(5));
    for (const c of cmds) {
      if (c.type === "addLayer") {
        expect(c.layer.steps).toHaveLength(STEP_COUNT);
      }
    }
  });
});
