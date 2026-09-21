import { describe, expect, it } from "vitest";
import { SmoothClock } from "../../src/adapters/smooth-clock.ts";

/** The audio clock as measured on Linux Chrome: it holds its value and then
 *  jumps a whole hardware buffer (2048 frames at 48 kHz). */
const BUFFER_SEC = 2048 / 48000;
const steppedAudio = (wallSec: number, leadSec = 3): number =>
  leadSec + Math.floor(wallSec / BUFFER_SEC) * BUFFER_SEC;

/** Read both clocks once per display frame, as the Track does. */
function ride(clock: SmoothClock, fromSec: number, toSec: number, frameSec: number): number[] {
  const out: number[] = [];
  for (let wall = fromSec; wall < toSec; wall += frameSec) {
    out.push(clock.read(steppedAudio(wall), wall));
  }
  return out;
}

describe("SmoothClock", () => {
  it("the raw audio clock stands still on most frames of a fast display", () => {
    const frame = 1 / 165;
    let still = 0;
    let frames = 0;
    for (let wall = 0; wall < 2; wall += frame) {
      if (steppedAudio(wall + frame) === steppedAudio(wall)) still += 1;
      frames += 1;
    }
    expect(still / frames).toBeGreaterThan(0.8);
  });

  it("advances on every frame, by almost exactly one frame", () => {
    const frame = 1 / 165;
    const clock = new SmoothClock();
    ride(clock, 0, 3, frame); // settle
    const times = ride(clock, 3, 5, frame);
    const moves = times.slice(1).map((t, i) => t - (times[i] as number));
    expect(Math.min(...moves)).toBeGreaterThan(frame * 0.9);
    expect(Math.max(...moves)).toBeLessThan(frame * 1.1);
  });

  it("stays within the stepped clock's own range, so sync is unchanged", () => {
    const clock = new SmoothClock();
    ride(clock, 0, 4, 1 / 60);
    for (let wall = 4; wall < 6; wall += 1 / 60) {
      const smooth = clock.read(steppedAudio(wall), wall);
      const truth = 3 + wall; // the continuous time the steps approximate
      expect(smooth).toBeLessThanOrEqual(truth + 0.001);
      expect(smooth).toBeGreaterThanOrEqual(truth - BUFFER_SEC - 0.001);
    }
  });

  it("follows a suspended or restarted context at once", () => {
    const clock = new SmoothClock();
    ride(clock, 0, 3, 1 / 60);
    // The tab slept for ten seconds; the audio clock did not advance.
    expect(clock.read(6, 13)).toBe(6);
  });

  it("starts over after a reset", () => {
    const clock = new SmoothClock();
    ride(clock, 0, 3, 1 / 60);
    clock.reset();
    expect(clock.read(100.05, 3.01)).toBe(100.05);
  });
});
