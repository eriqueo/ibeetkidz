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

/** Snap a recorded take's length to the nearest whole number of beats at the
 *  given tempo, so it loops in time on Home ("loop-to-bar"). Rounds to nearest
 *  and never goes below one beat (forgiving). Returns both the beat count and
 *  the matching length in seconds; the adapter loops/trims the buffer to fit. */
export function nearestBeatLoop(
  durationSec: number,
  bpm: number,
): { beats: number; seconds: number } {
  const beatSec = 60 / Math.max(1, bpm);
  const beats = Math.max(1, Math.round(durationSec / beatSec));
  return { beats, seconds: beats * beatSec };
}

/** Swing pushes the off-beats (odd steps) later for a bouncy feel. Returns the
 *  delay as a fraction of ONE step (0 = straight). `swing` is 0..1; at 1 an
 *  off-beat lands halfway to the next step. Even steps never move. */
export function swingDelayFraction(stepIndex: number, swing: number): number {
  const s = Math.max(0, Math.min(1, swing));
  return stepIndex % 2 === 1 ? s * 0.5 : 0;
}
