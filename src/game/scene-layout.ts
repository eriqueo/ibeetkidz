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

// A horizontally-evenly-spaced row of square-ish cells (toolbar icons, ground
// instruments). Returns the i-th cell region given centres from `c0` to `c1`.
export function rowCell(
  i: number,
  count: number,
  c0: number,
  c1: number,
  y: number,
  w: number,
  h: number,
): NormRegion {
  const cx = count <= 1 ? c0 : c0 + (i * (c1 - c0)) / (count - 1);
  return { x: cx - w / 2, y, w, h };
}

// Workshop v2: every control is painted into the bg — these regions place
// TRANSPARENT hit-areas over them (no HTML chrome). The mixing board overlays
// the boxcar interior; the car-type picker sits on the flatcar bed.
export const WORKSHOP_LAYOUT_V2 = {
  carInterior: { x: 0.135, y: 0.17, w: 0.73, h: 0.30 } satisfies NormRegion,
  carTypePicker: { x: 0.40, y: 0.485, w: 0.20, h: 0.07 } satisfies NormRegion,
  // Top toolbar: 9 icons (notepad … EXIT), centres ~0.321→0.814.
  toolbar: { count: 9, c0: 0.321, c1: 0.814, y: 0.035, w: 0.052, h: 0.10 },
  // Ground instruments: 8 (kick … voice), centres ~0.238→0.756.
  instruments: { count: 8, c0: 0.238, c1: 0.756, y: 0.52, w: 0.06, h: 0.14 },
  // Bottom transport panel buttons (centres).
  transport: {
    stop: 0.321,
    play: 0.441,
    loop: 0.549,
    speedDown: 0.655,
    speedUp: 0.792,
    y: 0.70,
    w: 0.085,
    h: 0.18,
  },
} as const;

// Workshop v2 sequencer grid (Phaser-native). The grid fills the painted boxcar
// interior (WORKSHOP_LAYOUT_V2.carInterior); a left column holds the lane labels
// and the remaining width is split into STEP_COUNT cells. No scrolling: at most
// `maxLanes` rows show at once.
export const WORKSHOP_GRID_V2 = {
  maxLanes: 6,
  labelFrac: 0.16, // lane-label column, as a fraction of the grid width
  cellPad: 0.12, // gap between cells, as a fraction of the cell size
} as const;

// Which built-in sounds front the painted instrument shelf (8 painted slots).
// MEMBERSHIP is config (here); each id's emoji/colour/kind is resolved from the
// sound catalog at render time, so this stays data-driven (no hardcoded icons).
export const WORKSHOP_SHELF_IDS = [
  "kick", "snare", "hihat", "tom", "cowbell", "shaker", "note-do", "note-mi",
] as const;

/** Which toolbar icon index does what (left→right in the painted bar). */
export const WORKSHOP_TOOLBAR = [
  "newcar",   // 0 notepad
  "magicpad", // 1 music note
  "soundpads",// 2 speaker
  "myvoice",  // 3 waveform
  "beatgrid", // 4 grid
  "yard",     // 5 green ↔ arrows  → send to Yard
  "surprise", // 6 star
  "voicekeys",// 7 magnifier
  "map",      // 8 EXIT
] as const;

// Yard v2: 4 parallel sidings on the left hold the built-car palette; the top
// straight track is the assembly line; the gantry crane occupies the right.
export const YARD_LAYOUT_V2 = {
  palette: { x: 0.03, y: 0.30, w: 0.55, h: 0.40 } satisfies NormRegion,
  assemblyLine: { x: 0.06, y: 0.05, w: 0.86, h: 0.10 } satisfies NormRegion,
  crane: { x: 0.50, y: 0.12, w: 0.40, h: 0.55 } satisfies NormRegion,
  // Painted bottom-panel action buttons (centres) — transparent hit-areas.
  panel: {
    info: 0.345,
    move: 0.40,
    couple: 0.455,    // → Add to Train
    uncouple: 0.515,  // → Remove from train
    build: 0.57,      // → Edit car
    del: 0.625,       // → Delete car
    exit: 0.85,       // → Map
    y: 0.87,
    w: 0.055,
    h: 0.13,
  },
  // The main line / truck heading off to the right = Send to Track. Kept ABOVE
  // the bottom panel so it doesn't cover the painted EXIT button.
  sendToTrack: { x: 0.60, y: 0.58, w: 0.20, h: 0.16 } satisfies NormRegion,
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
  // The crossing signal sprite anchor (bottom-centre of the oval) + display width
  // as a fraction of the scene (it was rendering at full 2560px — a monolith).
  signal: { x: 0.5, y: 0.585, w: 0.05 } as const,
  // Painted transport panel buttons (centres) — transparent hit-areas.
  controls: {
    rewind: 0.405,  // ⏪ → slower
    pause: 0.475,   // ⏸ → stop
    stop: 0.545,    // ⏹ → stop
    play: 0.615,    // ▶ → ride
    ff: 0.685,      // ⏩ → faster
    y: 0.815,
    w: 0.055,
    h: 0.13,
  },
} as const;

// Map: three destination buttons over the painted Workshop / Yard / Track spots.
// Aligned to the painted island buildings: WORKSHOP cabin (left), YARD building
// (centre), TRACK oval (right) — each region covers the building + its label.
export const MAP_LAYOUT = {
  workshop: { x: 0.12, y: 0.28, w: 0.19, h: 0.42 } satisfies NormRegion,
  yard: { x: 0.44, y: 0.28, w: 0.19, h: 0.42 } satisfies NormRegion,
  track: { x: 0.70, y: 0.30, w: 0.19, h: 0.42 } satisfies NormRegion,
} as const;
