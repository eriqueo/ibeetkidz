import { describe, expect, it } from "vitest";
import { MAX_BPM, MIN_BPM } from "../../src/core/types.ts";
import { SPEED_STEP, bpmAtX, xForBpm } from "../../src/game/speed-slider.ts";

const rail = { x0: 800, x1: 1800, y: 294 };

describe("speed slider arithmetic", () => {
  it("covers the whole tempo range end to end", () => {
    expect(bpmAtX(rail.x0, rail)).toBe(MIN_BPM);
    expect(bpmAtX(rail.x1, rail)).toBe(MAX_BPM);
  });

  it("holds the ends when the finger runs past them", () => {
    expect(bpmAtX(rail.x0 - 500, rail)).toBe(MIN_BPM);
    expect(bpmAtX(rail.x1 + 500, rail)).toBe(MAX_BPM);
  });

  it("lands on whole steps", () => {
    for (let x = rail.x0; x <= rail.x1; x += 7) {
      expect(bpmAtX(x, rail) % SPEED_STEP).toBe(0);
    }
  });

  it("puts the handle back where the finger left it", () => {
    for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += SPEED_STEP) {
      expect(bpmAtX(xForBpm(bpm, rail), rail)).toBe(bpm);
    }
  });

  it("shows an old song's off-step speed where it really is", () => {
    // A song saved at 107 by the old SLOW/FAST keys sits between 105 and 110.
    const x = xForBpm(107, rail);
    expect(x).toBeGreaterThan(xForBpm(105, rail));
    expect(x).toBeLessThan(xForBpm(110, rail));
  });
});
