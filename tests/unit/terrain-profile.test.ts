import { describe, expect, it } from "vitest";
import {
  BRIDGE_GAP,
  HILL_PEAK,
  groundDrop,
  isWeather,
  liftSamples,
  railAngle,
  railLift,
  railSlope,
  type TerrainSpan,
} from "../../src/game/terrain-profile.ts";

const hill: TerrainSpan = { kind: "hill", startBar: 4, endBar: 6 };
const bridge: TerrainSpan = { kind: "bridge", startBar: 4, endBar: 6 };
const rain: TerrainSpan = { kind: "rain", startBar: 4, endBar: 6 };

describe("a hill is actually a hill", () => {
  it("is flat ground outside its own span", () => {
    expect(railLift(3.9, hill)).toBe(0);
    expect(railLift(6.1, hill)).toBe(0);
    expect(railLift(5, null)).toBe(0);
  });

  it("peaks in the middle at the stated height", () => {
    expect(railLift(5, hill)).toBeCloseTo(HILL_PEAK);
  });

  it("rises then falls, never dipping below the ground it started on", () => {
    let prev = -1;
    let rising = true;
    for (let b = 4; b <= 6; b += 0.05) {
      const y = railLift(b, hill);
      expect(y).toBeGreaterThanOrEqual(-1e-9);
      if (rising && y < prev - 1e-9) rising = false;
      // Once it has started falling it must not rise again — one summit.
      if (!rising) expect(y).toBeLessThanOrEqual(prev + 1e-9);
      prev = y;
    }
    expect(rising).toBe(false); // it did come back down
  });

  it("meets flat ground with ZERO slope at both ends, so there is no kink", () => {
    // The join is the part the eye catches; a parabola would arrive at an angle.
    expect(Math.abs(railLift(4.001, hill))).toBeLessThan(0.01);
    expect(Math.abs(railLift(5.999, hill))).toBeLessThan(0.01);
    expect(Math.abs(railSlope(4.001, hill))).toBeLessThan(2);
    expect(Math.abs(railSlope(5.999, hill))).toBeLessThan(2);
  });

  it("slopes up on the near side and down on the far side", () => {
    expect(railSlope(4.4, hill)).toBeGreaterThan(0);
    expect(railSlope(5.6, hill)).toBeLessThan(0);
    expect(railSlope(5, hill)).toBeCloseTo(0, 6); // level at the summit
  });

  it("the slope really is the height differentiated", () => {
    // Compare the analytic slope against a numeric one at several points.
    for (const b of [4.2, 4.7, 5.3, 5.8]) {
      const h = 1e-4;
      const numeric = (railLift(b + h, hill) - railLift(b - h, hill)) / (2 * h);
      expect(railSlope(b, hill)).toBeCloseTo(numeric, 2);
    }
  });

  it("tilts the train nose-up climbing and nose-down descending", () => {
    // Phaser rotation is clockwise-positive with y growing downward.
    expect(railAngle(4.4, hill, 640)).toBeLessThan(0);
    expect(railAngle(5.6, hill, 640)).toBeGreaterThan(0);
  });

  it("a wider bar makes the same hill gentler", () => {
    expect(Math.abs(railAngle(4.4, hill, 1600)))
      .toBeLessThan(Math.abs(railAngle(4.4, hill, 400)));
  });

  it("survives a degenerate span instead of dividing by zero", () => {
    const flat: TerrainSpan = { kind: "hill", startBar: 4, endBar: 4 };
    expect(railLift(4, flat)).toBe(0);
    expect(railSlope(4, flat)).toBe(0);
    expect(railAngle(4, hill, 0)).toBe(0);
  });
});

describe("a bridge is a gap, not a bump", () => {
  it("leaves the rails dead level — you do not climb a bridge", () => {
    for (let b = 4; b <= 6; b += 0.1) expect(railLift(b, bridge)).toBe(0);
  });

  it("drops the ground away beneath it, at full depth in the middle", () => {
    expect(groundDrop(5, bridge)).toBeCloseTo(BRIDGE_GAP);
    expect(groundDrop(3.9, bridge)).toBe(0);
    expect(groundDrop(6.1, bridge)).toBe(0);
  });

  it("has square shoulders — a built thing, not a valley", () => {
    // Full depth is reached well before the middle.
    expect(groundDrop(4.35, bridge)).toBeCloseTo(BRIDGE_GAP);
  });

  it("a hill does not drop the ground, and a bridge does not lift the rails", () => {
    expect(groundDrop(5, hill)).toBe(0);
    expect(railLift(5, bridge)).toBe(0);
  });
});

describe("rain is weather, not ground", () => {
  it("changes neither the rails nor the ground", () => {
    expect(railLift(5, rain)).toBe(0);
    expect(groundDrop(5, rain)).toBe(0);
  });

  it("is the only one classed as weather", () => {
    expect(isWeather("rain")).toBe(true);
    expect(isWeather("hill")).toBe(false);
    expect(isWeather("bridge")).toBe(false);
  });
});

describe("the drawn silhouette and the physics are the same curve", () => {
  it("every sample equals railLift at that point", () => {
    const n = 24;
    const samples = liftSamples(hill, n);
    expect(samples).toHaveLength(n + 1);
    samples.forEach((v, i) => {
      const atBar = hill.startBar + ((hill.endBar - hill.startBar) * i) / n;
      expect(v).toBeCloseTo(railLift(atBar, hill));
    });
  });

  it("starts and ends on the ground", () => {
    const s = liftSamples(hill, 32);
    expect(s[0]).toBeCloseTo(0);
    expect(s.at(-1)).toBeCloseTo(0);
    expect(Math.max(...s)).toBeCloseTo(HILL_PEAK, 0);
  });
});

describe("level ground really is zero", () => {
  it("never returns -0, which is not === 0 under Object.is", () => {
    for (const span of [null, bridge, rain, hill]) {
      for (const b of [3.5, 4, 5, 6, 6.5]) {
        const a = railAngle(b, span, 640);
        if (a === 0) expect(Object.is(a, 0)).toBe(true);
      }
    }
  });
});
