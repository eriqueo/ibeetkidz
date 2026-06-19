import { describe, expect, it } from "vitest";
import { generateBeat } from "../../src/core/generative.ts";
import { createRng } from "../../src/core/rng.ts";

function layerIds(seed: number): string[] {
  return generateBeat(createRng(seed)).flatMap((c) =>
    c.type === "addLayer" ? [c.layer.id] : [],
  );
}

describe("generateBeat", () => {
  it("uses the shared beat-<assetId> id scheme (no separate gen- rows)", () => {
    for (const id of layerIds(1)) expect(id).toMatch(/^beat-/);
  });

  it("produces unique layer ids → no duplicate Loop Stage rows", () => {
    const ids = layerIds(7);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("always lays down at least kick + snare + hihat", () => {
    expect(layerIds(3)).toEqual(
      expect.arrayContaining(["beat-kick", "beat-snare", "beat-hihat"]),
    );
  });
});
