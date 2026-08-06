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
 * because `placeOnPath` rewrites every token's scale each frame (perspective
 * depth-scale), and a tween on `token.scale` would be overwritten immediately.
 */
export function popScale(elapsedMs: number, durationMs = 260, amount = 0.3): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || durationMs <= 0) return 1;
  const u = Math.min(elapsedMs / durationMs, 1);
  const fall = 1 - u;
  return 1 + amount * fall * fall;
}
