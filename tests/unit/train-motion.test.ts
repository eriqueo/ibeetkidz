// The Track's motion math (`src/game/train-motion.ts`).
//
// These are the arithmetic behind three of `design/GAME_FEEL.md`'s laws, and
// they are here rather than in a browser because every one of them is a pure
// function of numbers:
//
//   Law 4 — a cycle's phase comes from DISTANCE travelled, so its frequency
//           follows the train's speed and stops when the train does.
//   Law 5 — secondary motion ramps in and out instead of snapping on.
//   Law 6 — smoke is emitted per unit of distance, never on a timer.
//
// The bug each of these guards is the same one, stated three ways: the train's
// only life used to be `Math.sin(this.time.now / 160) * 2` — a fixed 1 Hz bob
// that was IDENTICAL at SLOW and at FAST and ran whether or not the train was
// moving — and a `time.addEvent` puffing smoke every 800 ms regardless.

import { describe, expect, it } from "vitest";
import {
  advanceMotion,
  bobOffset,
  lapDelta,
  motionIntensity,
  puffsDue,
  reseatMotion,
  BOB_AMPLITUDE_PX,
  BOB_REF_SPEED,
  BOB_WAVELENGTH_PX,
  MAX_FRAME_LAP,
  MOTION_AT_REST,
  SMOKE_PIXEL_SCALE,
  SMOKE_SPACING_PX,
  WORLD_PIXEL_SCALE,
  type TrainMotion,
} from "../../src/game/train-motion.ts";

const LAP = 4182; // the shipped oval's perimeter, px

/** Run `frames` frames at `dtMs` each, advancing the lap by `lapPerFrame`. */
function ride(
  frames: number,
  lapPerFrame: number,
  { dtMs = 16, moving = true, from = MOTION_AT_REST } = {},
): TrainMotion {
  let m = from;
  for (let i = 0; i < frames; i++) {
    m = advanceMotion(m, {
      progress: (m.progress + lapPerFrame) % 1,
      pathLength: LAP,
      dtMs,
      moving,
    });
  }
  return m;
}

describe("lapDelta — the loop has no seam", () => {
  it("takes the short way round the wrap", () => {
    expect(lapDelta(0.99, 0.01)).toBeCloseTo(0.02, 10);
    expect(lapDelta(0.01, 0.99)).toBeCloseTo(-0.02, 10);
  });

  it("is plain subtraction away from the wrap", () => {
    expect(lapDelta(0.2, 0.25)).toBeCloseTo(0.05, 10);
    expect(lapDelta(0.25, 0.2)).toBeCloseTo(-0.05, 10);
  });

  it("never exceeds half a lap, and survives nonsense", () => {
    for (const [a, b] of [[0, 0.5], [0.5, 0], [0.3, 0.8], [0.8, 0.3]]) {
      expect(Math.abs(lapDelta(a!, b!))).toBeLessThanOrEqual(0.5);
    }
    // NaN reads as 0, and half a lap is half a lap whichever way you go round
    // it — the sign at exactly 0.5 is not a fact worth pinning.
    expect(Math.abs(lapDelta(NaN, 0.5))).toBeCloseTo(0.5, 10);
    expect(Math.abs(lapDelta(0.5, NaN))).toBeCloseTo(0.5, 10);
  });
});

describe("advanceMotion — measuring the ride", () => {
  it("turns lap fraction into distance travelled", () => {
    const m = ride(10, 0.01);
    expect(m.travelled).toBeCloseTo(10 * 0.01 * LAP, 6);
  });

  it("reports speed in px/ms and settles on the truth", () => {
    const m = ride(120, 0.001, { dtMs: 16 });
    expect(m.speed).toBeCloseTo((0.001 * LAP) / 16, 2);
  });

  it("does not travel while stopped, however the transport moves", () => {
    const m = ride(30, 0.01, { moving: false });
    expect(m.travelled).toBe(0);
    expect(m.speed).toBe(0);
  });

  it("refuses a SEEK: a jump bigger than a quarter lap is not movement", () => {
    // A scene rebuild, a scrub, or a tab that was in the background. Integrating
    // it would spin the wheels and cough a burst of smoke.
    const jump = advanceMotion(MOTION_AT_REST, {
      progress: MAX_FRAME_LAP + 0.01,
      pathLength: LAP,
      dtMs: 16,
      moving: true,
    });
    expect(jump.travelled).toBe(0);
    // …but it still adopts the new position, so the NEXT frame is a small step.
    expect(jump.progress).toBeCloseTo(MAX_FRAME_LAP + 0.01, 10);
  });

  it("clamps a hitch so one long frame does not lurch", () => {
    const long = advanceMotion(MOTION_AT_REST, {
      progress: 0.1, pathLength: LAP, dtMs: 5000, moving: true,
    });
    // 0.1 lap over a clamped 100 ms, not over 5 s.
    expect(long.speed).toBeGreaterThan(1);
  });

  it("survives NaN and a zero-length path", () => {
    const m = advanceMotion(MOTION_AT_REST, {
      progress: NaN, pathLength: NaN, dtMs: NaN, moving: true,
    });
    expect(Number.isFinite(m.travelled)).toBe(true);
    expect(Number.isFinite(m.speed)).toBe(true);
    expect(m.energy).toBeGreaterThanOrEqual(0);
  });

  it("re-seats without travelling — starting a ride is not a lap", () => {
    const moved = ride(10, 0.01);
    const seated = reseatMotion(moved, 0.9);
    expect(seated.progress).toBe(0.9);
    expect(seated.travelled).toBe(moved.travelled);
    expect(seated.speed).toBe(0);
  });
});

describe("energy — Law 5, nothing starts or stops instantly", () => {
  it("is 0 at rest and does not jump to 1 on the first moving frame", () => {
    expect(MOTION_AT_REST.energy).toBe(0);
    const first = ride(1, 0.01);
    expect(first.energy).toBeGreaterThan(0);
    expect(first.energy).toBeLessThan(0.2);
  });

  it("reaches 1 within a few hundred ms of riding", () => {
    expect(ride(3, 0.01, { dtMs: 100 }).energy).toBeLessThan(1);
    expect(ride(8, 0.01, { dtMs: 100 }).energy).toBe(1);
  });

  it("ramps back to 0 after the train stops — and gets there", () => {
    const rolling = ride(40, 0.01, { dtMs: 100 });
    expect(rolling.energy).toBe(1);
    const easing = ride(2, 0, { dtMs: 100, moving: false, from: rolling });
    expect(easing.energy).toBeGreaterThan(0);
    expect(easing.energy).toBeLessThan(1);
    // An exponential would approach 0 and never arrive; "the smoke never quite
    // stops" is a bug you only ever find on a screenshot.
    expect(ride(10, 0, { dtMs: 100, moving: false, from: rolling }).energy).toBe(0);
  });
});

describe("bobOffset — Law 4, driven by motion and not by the clock", () => {
  const rolling = ride(60, 0.004, { dtMs: 16 }); // ~1 px/ms, above the reference

  it("is exactly zero at rest", () => {
    expect(bobOffset(MOTION_AT_REST, 0)).toBe(0);
    expect(bobOffset({ ...MOTION_AT_REST, travelled: 12345 }, 2)).toBe(0);
  });

  it("has one full cycle per BOB_WAVELENGTH_PX of travel, at any speed", () => {
    // Same distance travelled ⇒ same phase, whether it took 1 s or 10.
    const at = (travelled: number): number =>
      bobOffset({ ...rolling, travelled }, 0);
    expect(at(0)).toBeCloseTo(at(BOB_WAVELENGTH_PX), 6);
    expect(at(BOB_WAVELENGTH_PX / 4)).toBeCloseTo(-at((3 * BOB_WAVELENGTH_PX) / 4), 6);
  });

  it("scales its amplitude with speed, and saturates at the reference", () => {
    const slow = { ...rolling, speed: BOB_REF_SPEED / 4 };
    const fast = { ...rolling, speed: BOB_REF_SPEED };
    const faster = { ...rolling, speed: BOB_REF_SPEED * 4 };
    const peak = (m: TrainMotion): number => {
      let max = 0;
      for (let d = 0; d < BOB_WAVELENGTH_PX; d += 1) {
        max = Math.max(max, Math.abs(bobOffset({ ...m, travelled: d }, 0)));
      }
      return max;
    };
    expect(peak(slow)).toBeCloseTo(BOB_AMPLITUDE_PX / 4, 1);
    expect(peak(fast)).toBeCloseTo(BOB_AMPLITUDE_PX, 1);
    expect(peak(faster)).toBeCloseTo(BOB_AMPLITUDE_PX, 1); // clamped, not runaway
  });

  it("gives each vehicle its own phase so the consist does not pogo as one", () => {
    const a = bobOffset(rolling, 0);
    const b = bobOffset(rolling, 1);
    expect(a).not.toBeCloseTo(b, 3);
  });

  it("damps with the ramp, so a stopping train settles", () => {
    const damped = { ...rolling, energy: 0.25 };
    expect(Math.abs(bobOffset(damped, 0))).toBeLessThan(Math.abs(bobOffset(rolling, 0)) + 1e-9);
    expect(motionIntensity({ ...rolling, energy: 0 })).toBe(0);
  });
});

describe("puffsDue — Law 6, smoke per unit of distance", () => {
  it("owes nothing until a spacing has been travelled", () => {
    expect(puffsDue(SMOKE_SPACING_PX - 1).puffs).toBe(0);
    expect(puffsDue(SMOKE_SPACING_PX).puffs).toBe(1);
  });

  it("carries the remainder forward instead of dropping it", () => {
    const { puffs, debt } = puffsDue(SMOKE_SPACING_PX * 1.5);
    expect(puffs).toBe(1);
    expect(debt).toBeCloseTo(SMOKE_SPACING_PX * 0.5, 6);
  });

  it("coughs at most a couple of puffs after a hitch, not a hundred", () => {
    expect(puffsDue(SMOKE_SPACING_PX * 50).puffs).toBe(2);
  });

  it("emits nothing on a train that is not moving", () => {
    // Distance is the only input, and a stopped train adds none.
    const stopped = ride(30, 0.01, { moving: false });
    expect(stopped.travelled).toBe(0);
    expect(puffsDue(stopped.travelled).puffs).toBe(0);
  });

  it("survives a nonsense spacing", () => {
    expect(puffsDue(1000, 0).puffs).toBe(0);
    expect(puffsDue(NaN).puffs).toBe(0);
  });
});

describe("world scale constants", () => {
  it("are positive numbers a scene can multiply by", () => {
    for (const [name, value] of [
      ["WORLD_PIXEL_SCALE", WORLD_PIXEL_SCALE],
      ["SMOKE_PIXEL_SCALE", SMOKE_PIXEL_SCALE],
    ] as const) {
      expect(Number.isFinite(value), name).toBe(true);
      expect(value, name).toBeGreaterThan(0);
    }
  });

  it("draw a 128 px car about a quarter of the plate wide at the near side", () => {
    // The plate is 2560 wide; 128 × 2 = 256. This is the size the near half of
    // the oval was calibrated to, and the size the whole scene collapses to when
    // AR-033's flat plate lands.
    expect(128 * WORLD_PIXEL_SCALE).toBe(256);
  });
});
