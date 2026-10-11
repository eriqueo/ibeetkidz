// The Track's speed slider, as arithmetic. Kept outside the scene so the unit
// suite can reach it — a real `import Phaser` cannot load under jsdom.
import { MAX_BPM, MIN_BPM } from "../core/types.ts";

/** The horizontal line the handle travels along, in design-space px. */
export interface SliderRail {
  readonly x0: number;
  readonly x1: number;
  readonly y: number;
}

/** The slider lands on whole multiples of this — the same tens the SLOW /
 *  FAST keys it replaced moved in. Eric asked for a short slider, and a short
 *  rail in fives left a notch narrower than a fingertip. */
export const SPEED_STEP = 10;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The speed a pointer at `x` asks for: clamped to the rail, snapped to the step. */
export function bpmAtX(x: number, rail: SliderRail): number {
  const t = clamp((x - rail.x0) / (rail.x1 - rail.x0), 0, 1);
  const raw = MIN_BPM + t * (MAX_BPM - MIN_BPM);
  return clamp(Math.round(raw / SPEED_STEP) * SPEED_STEP, MIN_BPM, MAX_BPM);
}

/** Where the handle sits for `bpm`. Unsnapped: an old song at 107 shows at 107. */
export function xForBpm(bpm: number, rail: SliderRail): number {
  const t = (clamp(bpm, MIN_BPM, MAX_BPM) - MIN_BPM) / (MAX_BPM - MIN_BPM);
  return rail.x0 + t * (rail.x1 - rail.x0);
}
