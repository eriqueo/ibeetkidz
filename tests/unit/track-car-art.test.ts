// Vitest executes this in Node, while the browser app's TypeScript config
// deliberately does not expose Node types.
// @ts-expect-error -- test-host builtin without project-wide Node types
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { CAR_BODY_RAIL_TOP, crewLayout } from "../../src/game/track-car-art.ts";

describe("crewLayout: everyone who plays on a car can be seen on it", () => {
  const CAR = 300;
  it("keeps one or two riders at full size", () => {
    expect(crewLayout(1, CAR).slotW).toBe(100);
    expect(crewLayout(2, CAR).slotW).toBe(100);
  });

  it("keeps the whole crew on the car, for every head count the shelf allows", () => {
    for (let n = 1; n <= 7; n++) {
      const { pitch, slotW } = crewLayout(n, CAR);
      const span = (n - 1) * pitch + slotW;
      expect(span, `${n} riders span`).toBeLessThanOrEqual(CAR);
      // A neighbour may cover a shoulder, never the middle of a rider.
      expect(slotW - pitch, `${n} riders overlap`).toBeLessThanOrEqual(slotW * 0.15);
    }
  });

  it("gives a fourth rider its own place instead of the third's", () => {
    // The fixed 72 px pitch with ~93 px riders put a third of each rider
    // behind the next one.
    const { pitch, slotW } = crewLayout(4, CAR);
    expect(pitch).toBeCloseTo(67.5);
    expect(slotW).toBeLessThan(80);
  });
});

// Each Track car body carries a strip of rail across the bottom of its canvas.
// The scene crops it off (it read as every car riding its own piece of track),
// using row numbers measured off the art. If a redrawn body moves or drops that
// strip, the crop would cut into the chassis or leave rail showing — so the
// numbers are re-measured here against the files themselves.

const OPAQUE = 20;

function opaquePerRow(file: string): { width: number; rows: number[] } {
  const png = PNG.sync.read(readFileSync(file));
  const rows: number[] = [];
  for (let y = 0; y < png.height; y++) {
    let count = 0;
    for (let x = 0; x < png.width; x++) {
      if ((png.data[(y * png.width + x) * 4 + 3] ?? 0) > OPAQUE) count++;
    }
    rows.push(count);
  }
  return { width: png.width, rows };
}

describe("Track car bodies: the painted-in rail strip", () => {
  for (const [carType, railTop] of Object.entries(CAR_BODY_RAIL_TOP)) {
    it(`${carType}: the crop row is exactly where the rail strip begins`, () => {
      const { width, rows } = opaquePerRow(`src/assets/sprites/track3/car-${carType}.png`);
      // The strip spans the whole canvas; a chassis never does.
      expect(rows[railTop], "first rail row").toBe(width);
      // A clear gap sits above it, so the crop cuts through no art at all.
      expect(rows[railTop - 1], "row above the strip").toBe(0);
      // Everything from there down is the strip: nothing of the car is lost.
      let chassisBottom = railTop - 1;
      while (chassisBottom > 0 && rows[chassisBottom] === 0) chassisBottom--;
      expect(rows.slice(chassisBottom + 1, railTop).every((n) => n === 0)).toBe(true);
      expect(chassisBottom).toBeGreaterThan(railTop / 2);
    });
  }
});
