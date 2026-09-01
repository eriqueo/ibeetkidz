import { describe, expect, it } from "vitest";
import trainAtlasManifest from "../../src/assets/sprites/train-atlas/manifest.json";
import { DIRECTIONS, FRAME_SIZE, TRAIN_TYPES } from "../../src/game/car-geometry.ts";

describe("train atlas contract", () => {
  it("keeps runtime vocabulary aligned with the canonical atlas manifest", () => {
    expect(trainAtlasManifest.cellSize).toBe(FRAME_SIZE);
    expect(trainAtlasManifest.directions).toEqual(DIRECTIONS);
    expect(trainAtlasManifest.types).toEqual(TRAIN_TYPES);
  });
});
