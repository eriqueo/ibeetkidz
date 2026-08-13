// Single source of truth for where React overlays sit on the painted scene
// backgrounds. Every value is a fraction of the 2560×1440 (16:9) reference
// image, eyeballed from the art. These are PLACEHOLDER coordinates — they need
// a visual tuning pass against the running app; keep them here so tuning is a
// one-file edit shared by both the Phaser scene and the React overlay.
import type { NormRegion } from "../app/use-overlay-rect.ts";
import { MAX_LAYERS } from "../core/types.ts";

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
  // DERIVED, not restated. This used to read `6` while `MAX_LAYERS` read `8`,
  // and the gap between the two numbers was a reachable illegal state — see the
  // comment on `MAX_LAYERS`. The core owns "how many lanes a car may have"
  // because the reducer is what has to enforce it; the grid just draws them.
  maxLanes: MAX_LAYERS,
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
//
// The machine faces are contain-fitted and HEIGHT-bound, so this box's height
// is the panel's only real dimension — and it used to run from 0.11 to 0.81,
// leaving nothing under the plate. Every tool now hangs a DONE chip below its
// machine (the same finish gesture as the conductor chalkboard), so the box
// gives that strip back: it starts higher and ends well clear of the transport
// bar, where DONE was landing on top of the PLAY button.
export const WORKSHOP_TOOL_MODAL = {
  x: 0.07, y: 0.075, w: 0.86, h: 0.655,
} as const;

// Track SEND result panel: a compact centred card (viewport-relative, like the
// tool modal) — big enough for a title + two rows of buttons, small enough
// that the oval and header chrome stay readable behind the dimmed backdrop.
export const TRACK_SEND_MODAL = {
  x: 0.24, y: 0.28, w: 0.52, h: 0.44,
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
//
// RETUNED 2026-08-04. `carW`/`carH` are the box a car's 128×128 atlas CELL is
// contain-fitted into (`yard-geometry.carFitScale`), so both axes are
// load-bearing:
//
//   pitch between sidings   dy 0.092 × 1440 = 132.5 px
//   cell budget             carH 0.085 × 1440 = 122.4 px → fit scale 0.956
//   tallest body (boxcar-E) 97 × 0.956 = 92.7 px         → ~40 px for a chip
//
// The previous values (carW 0.11, carH 0.07) were sized for a WIDTH-only fit,
// which scaled the cell to 281.6 px — a 238 px-tall body on a 132.5 px pitch,
// i.e. ~105 px of car-on-car overlap, and the whole reason only the last car in
// each column had a readable label. `carW` is deliberately a little wider than
// `carH` so HEIGHT is the binding axis: the siding pitch is the hard constraint,
// the horizontal run of the painted rails is not.
//
// `dx` spreads the (at most) 3 columns of 12 cars across the clear part of the
// sidings — the painted rails run to ≈0.66 of width but the gantry crane's left
// leg lands at ≈0.51, so the palette stops short of it.
export const YARD_SIDINGS_V2 = {
  rows: 4,
  x0: 0.085, // left edge of a siding (first car centre offset added per index)
  y0: 0.517, // centre y of the top siding (2026-07-02 plate: rails at 0.517)
  dy: 0.092, // vertical spacing between sidings
  carW: 0.052, // car CELL fit width (fraction of image width)
  carH: 0.085, // car CELL fit height (fraction of image HEIGHT) — the binding axis
  dx: 0.053, // horizontal spacing between cars on a siding
  /** Name chip: width + height as fractions of image WIDTH, and the gap below
   *  the car's wheels. Sized in SCREEN space (the chip is not a child of the
   *  car) so its legibility does not track the car's fit scale.
   *
   *  The vertical sum is what has to clear the siding pitch. In fractions of
   *  image HEIGHT, at any 16:9 canvas:
   *      body  0.758 × 0.085            = 0.0644
   *      gap   0.0025 × (16/9)          = 0.0044
   *      chip  0.0105 × (16/9)          = 0.0187
   *                                  ⇒   0.0875  <  dy 0.092  ✓
   *  `tests/unit/yard-layout.test.ts` asserts that inequality, so tuning any of
   *  these five numbers back into an overlap fails the gate instead of
   *  quietly reintroducing the bug. */
  plateW: 0.048,
  plateH: 0.0105,
  plateGap: 0.0025,
} as const;

// Track v2: the oval the train rides, the crossing-signal point on the bottom
// straight, and the bottom control panel band.
export const TRACK_LAYOUT_V2 = {
  // The ride path itself is DATA: the `track-path` polygon in track.json's
  // geometry-layer (64 arc-uniform vertices traced over the painted
  // centreline, clockwise from the right apex). Repaint the plate → retrace
  // the polygon in Tiled; no code here.
  // Where CAR 0 sits at progress 0 — i.e. parked on the crossing signal, which
  // is what phase-locks the ride to bar 0; the rest of the consist couples on
  // behind it by real arc length, and the loco just ahead of it. (Position used
  // to encode WHICH bar was sounding, via `i / carCount` spacing; that readout
  // is now the highlight in `TrackScene`, and the cars are coupled.) The traced
  // path starts at the right apex and
  // runs clockwise, so 0.25 is EXACTLY the bottom-centre straight — right at
  // the crossing signal. Verified against the polygon: t=0.25 lands at
  // normalized (0.5000, 0.6340), and its 64 segments are arc-uniform to within
  // 0.5% (63.50–63.80 px of a 4076 px perimeter).
  parkAngle: 0.25,
  // The crossing signal sprite anchor (bottom-centre of the oval, over the
  // plate's painted signal) + display width as a fraction of the scene.
  signal: { x: 0.5, y: 0.683, w: 0.05 } as const,
} as const;

// MAP_HANDCAR lived here and was wrong: every marker sat ~0.12 of image height
// ABOVE its landmark, which put the Workshop handcar on the cabin roof. It was
// hand-guessed in TypeScript and carried its own "needs a live visual tuning
// pass" note for as long as it existed, because there was no way to do that
// pass — nothing could read a position back out of the running game.
//
// It now lives in `map.json`'s `fixtures-layer` and was positioned by DRAGGING
// it in the scene editor (`?edit`, see src/editor/). That is the migration this
// file should keep losing entries to: a value that describes WHERE something
// sits on the art belongs in the map, next to the art, where it can be seen.
