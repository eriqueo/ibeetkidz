// Single source of truth for where React overlays sit on the painted scene
// backgrounds. Every value is a fraction of the 2560×1440 (16:9) reference
// image, eyeballed from the art. These are PLACEHOLDER coordinates — they need
// a visual tuning pass against the running app; keep them here so tuning is a
// one-file edit shared by both the Phaser scene and the React overlay.
import type { NormRegion } from "../app/use-overlay-rect.ts";

export const SCENE_ASPECT = 2560 / 1440; // 16:9, all reference renders

// Workshop: the live sequencer grid + controls overlay the painted car UI.
export const WORKSHOP_LAYOUT = {
  grid: { x: 0.17, y: 0.24, w: 0.62, h: 0.30 } satisfies NormRegion,
  shelf: { x: 0.12, y: 0.62, w: 0.76, h: 0.18 } satisfies NormRegion,
  transport: { x: 0.30, y: 0.84, w: 0.40, h: 0.12 } satisfies NormRegion,
} as const;

// Map: three destination buttons over the painted Workshop / Yard / Track spots.
export const MAP_LAYOUT = {
  workshop: { x: 0.04, y: 0.27, w: 0.20, h: 0.34 } satisfies NormRegion,
  yard: { x: 0.40, y: 0.27, w: 0.20, h: 0.34 } satisfies NormRegion,
  track: { x: 0.70, y: 0.27, w: 0.22, h: 0.36 } satisfies NormRegion,
} as const;
