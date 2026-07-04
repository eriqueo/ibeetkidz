// Single source of truth for where React overlays sit on the painted scene
// backgrounds. Every value is a fraction of the 2560×1440 (16:9) reference
// image, eyeballed from the art. These are PLACEHOLDER coordinates — they need
// a visual tuning pass against the running app; keep them here so tuning is a
// one-file edit shared by both the Phaser scene and the React overlay.
import type { NormRegion } from "../app/use-overlay-rect.ts";

// ── v2 redesign layouts (clean backgrounds) ─────────────────────────────────
// Fractions of the 16:9 scene-v2 art, eyeballed from the renders. STARTING
// estimates — they need a visual tuning pass against `npm run dev`. Single
// source of truth so tuning is a one-file edit shared by scene + overlay.

// Workshop v2: the painted chrome (top toolbar, instrument shelf, bottom
// transport) is now spawned data-driven from `assets/maps/workshop.json` via
// TiledParser + TiledSceneAdapter — those coordinates live in the Tiled map, not
// here. Only the DYNAMIC, model-driven fixtures keep hand-tuned regions: the
// sequencer grid (boxcar interior) and the 4-way car-type picker.
// (WORKSHOP_LAYOUT_V2 retired with the AR-016 layered scene: the grid now
// mounts on the chalkboard's slate, anchored to the car sprite, and the
// car-type picker lays out inline in WorkshopScene.)

// Workshop v2 sequencer grid (Phaser-native). The grid fills the chalkboard
// slate; a left column holds the lane labels and the remaining width is split
// into STEP_COUNT cells. No scrolling: at most `maxLanes` rows show at once.
export const WORKSHOP_GRID_V2 = {
  maxLanes: 6,
  // Rows are sized as if at least this many lanes exist (lanes stack from the
  // top): without it a single lane's cells balloon to the full slate height.
  minRows: 4,
  // lane-label column (holds delete ✕, the instrument emoji, and a 🎹 edit
  // button on melody lanes), as a fraction of the grid width.
  labelFrac: 0.26,
  cellPad: 0.12, // gap between cells, as a fraction of the cell size
} as const;

// Satellite tool modal (My Voice / Voice Keys / Pads / Beat / Magic). Centred
// over the VIEWPORT (not the image) so it's fully visible regardless of the
// cover-crop, covering most of the screen but clear of the corner nav.
export const WORKSHOP_TOOL_MODAL = {
  x: 0.07, y: 0.11, w: 0.86, h: 0.70,
} as const;

// Yard v2: 4 parallel sidings hold the built-car palette; the straight track
// inside the oval is the assembly line the crane drops cars onto. Measured
// from the 2026-07-02 repainted base plate (rail rows: oval top 0.289,
// assembly straight 0.361, oval bottom 0.473, sidings from 0.517).
export const YARD_LAYOUT_V2 = {
  palette: { x: 0.03, y: 0.47, w: 0.55, h: 0.40 } satisfies NormRegion,
  assemblyLine: { x: 0.17, y: 0.316, w: 0.66, h: 0.09 } satisfies NormRegion,
  crane: { x: 0.50, y: 0.35, w: 0.40, h: 0.40 } satisfies NormRegion,
} as const;

// Yard sidings: 4 horizontal tracks where palette cars park. Centre y of each
// siding + the shared x-range; cars lay out left→right along the active siding.
export const YARD_SIDINGS_V2 = {
  rows: 4,
  x0: 0.06, // left edge of a siding (first car centre offset added per index)
  y0: 0.517, // centre y of the top siding (2026-07-02 plate: rails at 0.517)
  dy: 0.092, // vertical spacing between sidings
  carW: 0.11, // car sprite / hit-area width (fraction of image)
  carH: 0.07,
  dx: 0.115, // horizontal spacing between cars on a siding
} as const;

// Track v2: the oval the train rides, the crossing-signal point on the bottom
// straight, and the bottom control panel band.
export const TRACK_LAYOUT_V2 = {
  // The ride path itself is DATA: the `track-path` polygon in track.json's
  // geometry-layer (64 arc-uniform vertices traced over the painted
  // centreline, clockwise from the right apex). Repaint the plate → retrace
  // the polygon in Tiled; no code here.
  // Where the loco head sits at progress 0 (train parked). The traced path
  // starts at the right apex and runs clockwise, so 0.25 is EXACTLY the
  // bottom-centre straight — right at the crossing signal.
  parkAngle: 0.25,
  // The crossing signal sprite anchor (bottom-centre of the oval, over the
  // plate's painted signal) + display width as a fraction of the scene.
  signal: { x: 0.5, y: 0.683, w: 0.05 } as const,
} as const;

// Map: where the handcar location-marker sits over each painted landmark
// (Workshop cabin / Yard shed / Track oval), as a fraction of the cover-fit
// backgroundRect. MEASURED FROM ART — needs a live visual tuning pass.
export const MAP_HANDCAR = {
  workshop: { cx: 0.185, cy: 0.30, w: 0.07 },
  yard: { cx: 0.525, cy: 0.30, w: 0.07 },
  track: { cx: 0.78, cy: 0.34, w: 0.07 },
} as const;
