import { describe, expect, it } from "vitest";
import {
  nearestBeatLoop,
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

describe("nearestBeatLoop", () => {
  it("snaps to the nearest whole beat at the given tempo", () => {
    // 120bpm → 0.5s/beat. 1.1s rounds to 2 beats (1.0s); 1.3s rounds to 3 (1.5s).
    expect(nearestBeatLoop(1.1, 120)).toEqual({ beats: 2, seconds: 1 });
    expect(nearestBeatLoop(1.3, 120)).toEqual({ beats: 3, seconds: 1.5 });
  });

  it("rounds an exact fit cleanly", () => {
    // 100bpm → 0.6s/beat; 2.4s is exactly 4 beats.
    expect(nearestBeatLoop(2.4, 100)).toEqual({ beats: 4, seconds: 2.4 });
  });

  it("never drops below one beat (forgiving)", () => {
    expect(nearestBeatLoop(0.05, 120).beats).toBe(1);
    expect(nearestBeatLoop(0, 120).beats).toBe(1);
  });

  it("follows tempo: faster bpm packs more beats into the same take", () => {
    expect(nearestBeatLoop(1, 60).beats).toBe(1); // 1s/beat
    expect(nearestBeatLoop(1, 240).beats).toBe(4); // 0.25s/beat
  });
});
