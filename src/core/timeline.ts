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
