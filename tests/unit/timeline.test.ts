import { describe, expect, it } from "vitest";
import { stepIndexFromProgress } from "../../src/core/timeline.ts";

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
