// Pure motion math for the Track's train: how far it has travelled, how fast it
// is going, and every secondary motion derived from those two numbers.
//
// This module exists because of `design/GAME_FEEL.md`:
//
//   Law 1 — one pixel grid. `WORLD_PIXEL_SCALE` is the single producer of "how
//           big is a world sprite" before the plate's perspective is applied.
//   Law 4 — animation is driven by MOTION, not the clock. Every cycle here
//           takes its phase from `travelled` (px along the path), so its
//           frequency scales with speed for free and stops when the train does.
//   Law 5 — nothing starts or stops instantly. `energy` ramps 0→1 on start and
//           1→0 on stop, and every secondary motion is multiplied by it.
//   Law 6 — secondary motion is state-driven. Smoke is emitted per unit of
//           DISTANCE, the way a real stack puffs per wheel revolution, never on
//           a wall-clock interval.
//
// Nothing here touches Phaser, the DOM or a clock — the frame delta is passed
// in — so it is testable as ordinary arithmetic (`tests/unit/train-motion.test.ts`).

/**
 * Base size of every world sprite on the Track, before the plate's perspective
 * (`TrackScene.depthScaleAt`) multiplies it.
 *
 * The design space is a fixed 2560×1440 (`main.ts`, `Scale.FIT`) and the base
 * plate is 2560×1440 drawn at scale 1, so one game unit IS one background pixel
 * and vehicle art is 128×128 native: 2 draws a car 256 px wide. That is the
 * size the near (bottom) side of the oval wants, and it is what the whole scene
 * collapses to when AR-033's flat plate lands and the perspective goes to 1.
 */
export const WORLD_PIXEL_SCALE = 2;

/**
 * Smoke, relative to a vehicle. The puff atlas is 128×128 per frame and its
 * later frames fill the cell, so 1 gives a billow about half a car long. (It
 * used to be drawn at a flat 0.3 regardless of where the loco was.)
 */
export const SMOKE_PIXEL_SCALE = 1;

/** A frame that moves more of the lap than this is a SEEK, not motion (a scene
 *  rebuild, a scrub, a tab that was backgrounded), and must not be integrated
 *  into distance travelled or it teleports every cycle. */
export const MAX_FRAME_LAP = 0.25;

/** Frame deltas above this are a hitch; integrating them makes motion lurch. */
const MAX_FRAME_MS = 100;

/** Time constant of the speed smoother. The transport read is high-resolution
 *  but not perfectly even frame to frame, and raw per-frame speed jitters. */
const SPEED_TAU_MS = 90;

/** Law 5: how long secondary motion takes to come up, and to settle back down.
 *  Out is slower than in — a heavy thing coasts rather than stopping dead. */
const ENERGY_IN_MS = 320;
const ENERGY_OUT_MS = 520;

/** Speed the bob is normalised against, px/ms. ~500 px/s is a four-bar song at
 *  120 bpm on the shipped oval (4076 px round). At half that speed the bob is
 *  half as tall AND half as fast — which is Law 4's check. */
export const BOB_REF_SPEED = 0.5;

/** One bob per car-length travelled (a car is 128 × `WORLD_PIXEL_SCALE`). */
export const BOB_WAVELENGTH_PX = 128 * WORLD_PIXEL_SCALE;

/** Peak bob at or above `BOB_REF_SPEED`, in UNSCALED cell px — the caller
 *  multiplies by the vehicle's drawn scale, so a far-side car bobs less. */
export const BOB_AMPLITUDE_PX = 3;

/** How far the train travels between stack puffs. */
export const SMOKE_SPACING_PX = 300;

/** Everything the scene needs to remember between frames. */
export interface TrainMotion {
  /** Lap position 0..1 as of the last sample. */
  readonly progress: number;
  /** Distance travelled along the path, in px. Monotonic, never reset. */
  readonly travelled: number;
  /** Smoothed speed in px/ms. */
  readonly speed: number;
  /** 0..1 ramp for secondary motion — Law 5's ease in and out. */
  readonly energy: number;
}

export const MOTION_AT_REST: TrainMotion = {
  progress: 0,
  travelled: 0,
  speed: 0,
  energy: 0,
};

const finite = (n: number, fallback = 0): number => (Number.isFinite(n) ? n : fallback);
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Shortest signed step from `prev` to `next` around a 0..1 loop, in (-0.5, 0.5].
 * A train crossing the start line moves +0.001, not -0.999.
 */
export function lapDelta(prev: number, next: number): number {
  const a = finite(prev);
  const b = finite(next);
  return ((((b - a) % 1) + 1.5) % 1) - 0.5;
}

/** Exponential approach — frame-rate independent, unlike `x += (t - x) * 0.1`. */
function approach(current: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0 || tauMs <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}

/** Linear ramp toward 0 or 1 that actually ARRIVES (an exponential never does,
 *  and "the smoke never quite stops" is a bug you only find on a screenshot). */
function ramp(current: number, target: number, dtMs: number, overMs: number): number {
  if (overMs <= 0) return target;
  const step = dtMs / overMs;
  return target > current
    ? Math.min(target, current + step)
    : Math.max(target, current - step);
}

export interface MotionSample {
  /** Lap position this frame, 0..1, straight from the transport. */
  readonly progress: number;
  /** Perimeter of the ride path in px, so laps become distance. */
  readonly pathLength: number;
  /** Real frame delta in ms. */
  readonly dtMs: number;
  /** Whether the transport says the train is riding. */
  readonly moving: boolean;
}

/**
 * Advance the motion state by one frame.
 *
 * Distance only accumulates while `moving`, and only for steps small enough to
 * be motion rather than a seek — so a scene rebuild or a scrub cannot spin the
 * wheels. `energy` still ramps down when stopped, which is what lets the bob
 * and the smoke ease out instead of snapping off.
 */
export function advanceMotion(prev: TrainMotion, sample: MotionSample): TrainMotion {
  const dt = Math.max(0, Math.min(finite(sample.dtMs), MAX_FRAME_MS));
  const progress = finite(sample.progress);
  const pathLength = Math.max(0, finite(sample.pathLength));
  const step = Math.abs(lapDelta(prev.progress, progress));
  const moved = sample.moving && step <= MAX_FRAME_LAP ? step * pathLength : 0;
  const instant = dt > 0 ? moved / dt : 0;
  const speed = Math.max(0, approach(prev.speed, instant, dt, SPEED_TAU_MS));
  const energy = clamp01(
    ramp(prev.energy, sample.moving ? 1 : 0, dt, sample.moving ? ENERGY_IN_MS : ENERGY_OUT_MS),
  );
  return { progress, travelled: prev.travelled + moved, speed, energy };
}

/**
 * Re-seat the sampler on a known position without travelling there.
 *
 * Called when the train starts, when the consist changes, and on a resize —
 * anything that would otherwise be read as one enormous frame of movement.
 */
export function reseatMotion(prev: TrainMotion, progress: number): TrainMotion {
  return { ...prev, progress: finite(progress), speed: 0 };
}

/** How hard secondary motion is running: 0 at rest, 1 at or above the reference
 *  speed. Both the ramp AND the speed, so slowing down really does damp it. */
export function motionIntensity(m: TrainMotion): number {
  return clamp01(m.energy) * clamp01(m.speed / BOB_REF_SPEED);
}

/**
 * Vertical bob for the vehicle at `index` in the consist, in game px.
 *
 * Phase is a function of DISTANCE TRAVELLED, so the bob's frequency is the
 * train's speed divided by `BOB_WAVELENGTH_PX` — halve the speed and the bob
 * visibly halves, which is exactly Law 4's check. Amplitude is damped by the
 * same intensity, so a stopped train sits still instead of idling on a timer.
 */
export function bobOffset(m: TrainMotion, index: number): number {
  const amp = BOB_AMPLITUDE_PX * motionIntensity(m);
  if (amp <= 0) return 0;
  const phase = (m.travelled / BOB_WAVELENGTH_PX) * Math.PI * 2 + index * 0.9;
  return Math.sin(phase) * amp;
}

/**
 * How many stack puffs are due, and the distance left over.
 *
 * Emission is per unit of distance — a locomotive puffs per wheel revolution,
 * not per wall-clock tick (Law 6). Capped so a hitch coughs a couple of puffs
 * rather than a hundred.
 */
export function puffsDue(
  debtPx: number,
  spacingPx = SMOKE_SPACING_PX,
  max = 2,
): { puffs: number; debt: number } {
  const debt = Math.max(0, finite(debtPx));
  if (spacingPx <= 0) return { puffs: 0, debt: 0 };
  const puffs = Math.min(max, Math.floor(debt / spacingPx));
  return { puffs, debt: debt - puffs * spacingPx };
}
