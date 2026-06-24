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

// ── v2 redesign layouts (clean backgrounds) ─────────────────────────────────
// Fractions of the 16:9 scene-v2 art, eyeballed from the renders. STARTING
// estimates — they need a visual tuning pass against `npm run dev`. Single
// source of truth so tuning is a one-file edit shared by scene + overlay.

// Workshop v2: the empty boxcar interior holds the mixing board; instruments sit
// on the ground below; the bottom panel is the transport; a thin strip under the
// car holds the car-type picker.
export const WORKSHOP_LAYOUT_V2 = {
  carInterior: { x: 0.135, y: 0.17, w: 0.73, h: 0.30 } satisfies NormRegion,
  carTypePicker: { x: 0.14, y: 0.475, w: 0.72, h: 0.075 } satisfies NormRegion,
  shelf: { x: 0.16, y: 0.55, w: 0.68, h: 0.20 } satisfies NormRegion,
  transport: { x: 0.21, y: 0.82, w: 0.50, h: 0.15 } satisfies NormRegion,
} as const;

// Yard v2: 4 parallel sidings on the left hold the built-car palette; the top
// straight track is the assembly line; the gantry crane occupies the right.
export const YARD_LAYOUT_V2 = {
  palette: { x: 0.03, y: 0.30, w: 0.55, h: 0.40 } satisfies NormRegion,
  assemblyLine: { x: 0.06, y: 0.05, w: 0.86, h: 0.10 } satisfies NormRegion,
  crane: { x: 0.50, y: 0.12, w: 0.40, h: 0.55 } satisfies NormRegion,
} as const;

// Yard sidings: 4 horizontal tracks where palette cars park. Centre y of each
// siding + the shared x-range; cars lay out left→right along the active siding.
export const YARD_SIDINGS_V2 = {
  rows: 4,
  x0: 0.06, // left edge of a siding (first car centre offset added per index)
  y0: 0.345, // centre y of the top siding
  dy: 0.092, // vertical spacing between sidings
  carW: 0.11, // car sprite / hit-area width (fraction of image)
  carH: 0.07,
  dx: 0.115, // horizontal spacing between cars on a siding
} as const;

// Track v2: the oval the train rides, the crossing-signal point on the bottom
// straight, and the bottom control panel band.
export const TRACK_LAYOUT_V2 = {
  // Ellipse centre + radii (fractions of the image), tracing the painted oval.
  oval: { cx: 0.5, cy: 0.335, rx: 0.40, ry: 0.245 } as const,
  // Normalized path position (0..1 around the ellipse) where the signal sits —
  // the bottom-centre straight. Phaser.Curves.Ellipse starts at 3 o'clock and
  // goes counter-clockwise, so the bottom is at 0.75.
  signalAngle: 0.75,
  // The crossing signal sprite anchor (bottom-centre of the oval).
  signal: { x: 0.5, y: 0.60 } as const,
  // Bottom control panel band (speed / transport / order live here).
  panel: { x: 0.0, y: 0.70, w: 1.0, h: 0.30 } satisfies NormRegion,
} as const;

// Map: three destination buttons over the painted Workshop / Yard / Track spots.
export const MAP_LAYOUT = {
  workshop: { x: 0.04, y: 0.27, w: 0.20, h: 0.34 } satisfies NormRegion,
  yard: { x: 0.40, y: 0.27, w: 0.20, h: 0.34 } satisfies NormRegion,
  track: { x: 0.70, y: 0.27, w: 0.22, h: 0.36 } satisfies NormRegion,
} as const;
