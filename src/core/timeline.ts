// Pure timeline math — no Tone, no DOM. Maps bar-progress (0..1) to a step
// index, so the Loop Stage playhead position is computed in a testable place.

export function stepIndexFromProgress(
  progress: number,
  totalSteps: number,
): number {
  if (totalSteps <= 0) return 0;
  const i = Math.floor(progress * totalSteps);
  return ((i % totalSteps) + totalSteps) % totalSteps; // wrap + guard negatives
}

/** Swing pushes the off-beats (odd steps) later for a bouncy feel. Returns the
 *  delay as a fraction of ONE step (0 = straight). `swing` is 0..1; at 1 an
 *  off-beat lands halfway to the next step. Even steps never move. */
export function swingDelayFraction(stepIndex: number, swing: number): number {
  const s = Math.max(0, Math.min(1, swing));
  return stepIndex % 2 === 1 ? s * 0.5 : 0;
}
