import { describe, expect, it } from "vitest";
import {
  gridSubdivision,
  shouldQuantize,
  type QuantizeGrid,
} from "../../src/core/quantize.ts";

describe("gridSubdivision", () => {
  it("maps each grid to Tone subdivision notation", () => {
    expect(gridSubdivision("off")).toBeNull();
    expect(gridSubdivision("bar")).toBe("1m");
    expect(gridSubdivision("beat")).toBe("4n");
    expect(gridSubdivision("half")).toBe("8n");
    expect(gridSubdivision("quarter")).toBe("16n");
  });
});

describe("shouldQuantize", () => {
  it("snaps only while playing and when a grid is selected", () => {
    expect(shouldQuantize("beat", true)).toBe(true);
    expect(shouldQuantize("bar", true)).toBe(true);
  });

  it("fires instantly when the transport is stopped (solo play stays snappy)", () => {
    expect(shouldQuantize("beat", false)).toBe(false);
    expect(shouldQuantize("quarter", false)).toBe(false);
  });

  it("never snaps when grid is off, even while playing", () => {
    expect(shouldQuantize("off", true)).toBe(false);
    expect(shouldQuantize("off", false)).toBe(false);
  });

  it("covers every grid value", () => {
    const grids: QuantizeGrid[] = ["off", "bar", "beat", "half", "quarter"];
    for (const g of grids) {
      expect(typeof shouldQuantize(g, true)).toBe("boolean");
    }
  });
});
