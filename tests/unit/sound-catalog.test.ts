import { describe, expect, it } from "vitest";
import {
  BUILTIN_SOUNDS,
  DRUM_SOUNDS,
  OFFERED_DRUMS,
  getBuiltin,
  isOffered,
} from "../../src/core/sound-catalog.ts";

describe("sound catalog", () => {
  it("has unique asset ids", () => {
    const ids = BUILTIN_SOUNDS.map((s) => s.assetId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes 16 pads (10 drums + 6 melodic blips)", () => {
    expect(BUILTIN_SOUNDS).toHaveLength(16);
  });

  it("DRUM_SOUNDS is exactly the drum-recipe subset", () => {
    expect(DRUM_SOUNDS.every((s) => s.recipe.kind === "drum")).toBe(true);
    expect(DRUM_SOUNDS).toHaveLength(10);
  });

  it("offers six drums, and still knows the four it no longer offers", () => {
    expect(OFFERED_DRUMS.map((s) => s.assetId)).toEqual(["kick", "snare", "hihat", "clap", "tom", "cowbell"]);
    for (const id of ["openhat", "rim", "shaker", "conga"]) {
      const sound = getBuiltin(id);
      expect(sound?.recipe.kind).toBe("drum"); // an older song still loads and plays it
      expect(isOffered(sound!)).toBe(false);
    }
    // Every note pad is still offered.
    expect(BUILTIN_SOUNDS.filter((s) => s.recipe.kind === "tone").every(isOffered)).toBe(true);
  });

  it("keeps the original 6 drum ids (saved beats reference them)", () => {
    for (const id of ["kick", "snare", "hihat", "clap", "tom", "cowbell"]) {
      expect(getBuiltin(id)?.recipe.kind).toBe("drum");
    }
  });

  it("getBuiltin resolves known ids and rejects unknown", () => {
    expect(getBuiltin("kick")?.label).toBe("Boom");
    expect(getBuiltin("nope")).toBeUndefined();
  });

  it("tone recipes carry a note name", () => {
    for (const s of BUILTIN_SOUNDS) {
      if (s.recipe.kind === "tone") {
        expect(s.recipe.note).toMatch(/^[A-G]#?\d$/);
      }
    }
  });
});
