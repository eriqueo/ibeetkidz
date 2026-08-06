// Pure geometry for a COUPLED train riding a closed path.
//
// The Track's cars used to be spaced `i / carCount` of the whole lap apart, so
// spacing was a function of the SONG LENGTH: a 4-bar song put its four cars a
// quarter-lap apart and they read as four wagons that had lost each other. The
// loco, meanwhile, was already coupled with the right model — arc length over
// path length — right below that loop.
//
// This module generalises the loco's model to the whole consist: spacing comes
// from how long each vehicle actually IS on screen, not from how many bars the
// song has. Nothing here touches Phaser, the DOM or a clock, so it is testable
// as ordinary arithmetic (`tests/unit/train-chain.test.ts`).

/**
 * How much of one lap the consist is allowed to occupy before it gets squeezed.
 * Below 1 so a full train still reads as a train with a gap behind it rather
 * than as an unbroken ring that has swallowed its own tail.
 */
export const TRAIN_MAX_FILL = 0.9;

const nonNeg = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Factor every coupling gap is multiplied by so the consist fits the lap.
 *
 * 1 in the normal case. A long enough train (roughly 20 cars on the shipped
 * oval) would otherwise wrap past its own loco; rather than let the tail
 * silently overlap the head, every gap shrinks by the same proportion, so the
 * train stays a train and just gets tighter.
 */
export function chainSqueeze(lengths: readonly number[], pathLength: number): number {
  const total = lengths.reduce<number>((sum, l) => sum + nonNeg(l), 0);
  const cap = nonNeg(pathLength) * TRAIN_MAX_FILL;
  if (total <= 0 || cap <= 0 || total <= cap) return 1;
  return cap / total;
}

/**
 * Where each vehicle of a coupled consist sits, as an arc distance BEHIND the
 * anchor vehicle's centre. Negative means ahead of it.
 *
 * @param lengths     On-screen length of each vehicle along the track, ordered
 *                    FRONT to BACK (loco first, then car 0, car 1, …).
 * @param pathLength  Perimeter of the ride path, in the same units.
 * @param anchorIndex Which vehicle the offsets are measured from (its own
 *                    offset is exactly 0). The Track anchors on car 0, because
 *                    car 0 parked on the crossing signal at progress 0 is what
 *                    keeps the ride phase-locked to bar 0.
 *
 * Adjacent centres are half of each neighbour's length apart — the same
 * bumper-to-bumper rule the loco already used, where the atlas frame's
 * transparent padding (~8%) doubles as the coupler.
 */
export function couplingOffsets(
  lengths: readonly number[],
  pathLength: number,
  anchorIndex = 0,
): number[] {
  const n = lengths.length;
  if (n === 0) return [];
  const squeeze = chainSqueeze(lengths, pathLength);
  const out = new Array<number>(n);
  out[0] = 0;
  for (let i = 1; i < n; i++) {
    out[i] = out[i - 1]! + ((nonNeg(lengths[i - 1]!) + nonNeg(lengths[i]!)) / 2) * squeeze;
  }
  const anchor = out[Math.min(Math.max(anchorIndex, 0), n - 1)]!;
  return out.map((d) => d - anchor);
}

/**
 * The "this car is sounding" pop, as a scale multiplier over elapsed ms.
 *
 * Snaps up on the beat and eases back to 1 — a bounce a four-year-old reads as
 * "that one". Written as a closed form of elapsed time rather than a tween
 * because `placeOnPath` rewrites every token's transform each frame, and a tween
 * on the token would be overwritten immediately.
 *
 * NOTE: this no longer scales a VEHICLE. `design/GAME_FEEL.md` Law 1 says every
 * world sprite's final scale must be an integer, and 1.3× of an integer is not
 * one — the sounding car was the one sprite in the scene still resampling itself
 * every frame. The car now hops instead (`popHop`), and this drives the lamp
 * under it, which is a vector `Ellipse` and has no pixel grid to fall off.
 */
export function popScale(elapsedMs: number, durationMs = 260, amount = 0.3): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || durationMs <= 0) return 1;
  const u = Math.min(elapsedMs / durationMs, 1);
  const fall = 1 - u;
  return 1 + amount * fall * fall;
}

/** Peak lift of the sounding car's hop, in UNSCALED cell px (the caller
 *  multiplies by the vehicle's drawn scale). */
export const HOP_HEIGHT_PX = 12;

/**
 * The same bounce as `popScale`, expressed as a LIFT in px instead of a scale.
 *
 * Same curve, so the beat reads identically; a hop keeps the sprite's pixel
 * grid intact where a scale pop destroyed it. Returns 0 once the bar has been
 * sounding longer than `durationMs`, and for any nonsense input.
 */
export function popHop(
  elapsedMs: number,
  durationMs = 260,
  heightPx = HOP_HEIGHT_PX,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || durationMs <= 0) return 0;
  const u = Math.min(elapsedMs / durationMs, 1);
  const fall = 1 - u;
  return heightPx * fall * fall;
}
