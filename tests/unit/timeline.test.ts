import { describe, expect, it } from "vitest";
import {
  stepIndexFromProgress,
  swingDelayFraction,
} from "../../src/core/timeline.ts";

describe("swingDelayFraction", () => {
  it("leaves on-beats (even steps) put", () => {
    expect(swingDelayFraction(0, 0.6)).toBe(0);
    expect(swingDelayFraction(2, 1)).toBe(0);
  });

  it("delays off-beats (odd steps) by up to half a step", () => {
    expect(swingDelayFraction(1, 0)).toBe(0);
    expect(swingDelayFraction(1, 1)).toBe(0.5);
    expect(swingDelayFraction(3, 0.5)).toBe(0.25);
  });

  it("clamps swing to 0..1", () => {
    expect(swingDelayFraction(1, 5)).toBe(0.5);
    expect(swingDelayFraction(1, -2)).toBe(0);
  });
});

describe("stepIndexFromProgress", () => {
  it("maps bar progress to a step index", () => {
    expect(stepIndexFromProgress(0, 16)).toBe(0);
    expect(stepIndexFromProgress(0.5, 16)).toBe(8);
    expect(stepIndexFromProgress(0.999, 16)).toBe(15);
    expect(stepIndexFromProgress(0.25, 4)).toBe(1);
  });

  it("wraps at the bar boundary", () => {
    expect(stepIndexFromProgress(1, 16)).toBe(0);
  });

  it("guards negatives and zero divisions", () => {
    expect(stepIndexFromProgress(-0.1, 16)).toBe(14);
    expect(stepIndexFromProgress(0.5, 0)).toBe(0);
  });
});
