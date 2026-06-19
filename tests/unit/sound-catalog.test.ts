import { describe, expect, it } from "vitest";
import {
  BUILTIN_SOUNDS,
  DRUM_SOUNDS,
  getBuiltin,
} from "../../src/core/sound-catalog.ts";

describe("sound catalog", () => {
  it("has unique asset ids", () => {
    const ids = BUILTIN_SOUNDS.map((s) => s.assetId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes 12 pads", () => {
    expect(BUILTIN_SOUNDS).toHaveLength(12);
  });

  it("DRUM_SOUNDS is exactly the drum-recipe subset", () => {
    expect(DRUM_SOUNDS.every((s) => s.recipe.kind === "drum")).toBe(true);
    expect(DRUM_SOUNDS).toHaveLength(6);
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
