import { describe, expect, it } from "vitest";
import { drawingBufferSize } from "../../src/game/game-dimensions.ts";

describe("display detail", () => {
  it("keeps desktop detail and accounts for tablet density", () => {
    expect(drawingBufferSize(1920, 1080, 1)).toEqual({ width: 1920, height: 1080 });
    expect(drawingBufferSize(1024, 576, 2)).toEqual({ width: 2048, height: 1152 });
  });
  it("does not supersample small displays or exceed authored detail", () => {
    expect(drawingBufferSize(1280, 720, 1)).toEqual({ width: 1280, height: 720 });
    expect(drawingBufferSize(2560, 1440, 2)).toEqual({ width: 2560, height: 1440 });
  });
  it("uses the original design while a parent has no measurable size", () => {
    expect(drawingBufferSize(0, 0, 1)).toEqual({ width: 2560, height: 1440 });
  });
});
