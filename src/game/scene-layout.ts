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
  x: 0.07, y: 0.07, w: 0.86, h: 0.6,
} as const;

// Track SEND result panel: a compact centred card (viewport-relative, like the
// tool modal) — big enough for a title + two rows of buttons, small enough
// that the oval and header chrome stay readable behind the dimmed backdrop.
export const TRACK_SEND_MODAL = {
  x: 0.24, y: 0.28, w: 0.52, h: 0.44,
} as const;

/**
 * The `panel-header-v2` plate's PARCHMENT FIELD — the cream area a control may
 * stand on — as fractions of wherever the plate is placed. `panelDef` gives that
 * plate `stretch: true`, so the art maps corner-to-corner onto its rect and
 * these fractions hold at any size it is mounted at.
 *
 * MEASURED, not eyeballed (2026-08-16): the packed 2687x687 frame was drawn to a
 * canvas and scanned for the cream field, giving x 0.1105..0.8779, y
 * 0.1776..0.8151. That matters because the arithmetic this replaces GUESSED the
 * field as "~400..2064" of a 290..2270 plate and was wrong on both sides and the
 * bottom — which is why SLOW stood on the left gear medallion, SEND SONG on the
 * right wooden rail, and the loop counter fell off the plate entirely.
 *
 * `tests/unit/track-header-layout.test.ts` asserts every header control's rect
 * lands inside this box on BOTH axes, so a control drifting back onto the frame
 * fails the gate.
 */
export const HEADER_PLATE_FIELD = {
  x0: 0.1105,
  x1: 0.8779,
  y0: 0.1776,
  y1: 0.8151,
} as const;

export interface PlacedRect { x: number; y: number; width: number; height: number }

/** The parchment field of a `panel-header-v2` mounted at `plate`, in the same
 *  coordinates the plate was placed in. */
export function headerPlateField(plate: PlacedRect): { x0: number; x1: number; y0: number; y1: number } {
  const left = plate.x - plate.width / 2;
  const top = plate.y - plate.height / 2;
  return {
    x0: left + HEADER_PLATE_FIELD.x0 * plate.width,
    x1: left + HEADER_PLATE_FIELD.x1 * plate.width,
    y0: top + HEADER_PLATE_FIELD.y0 * plate.height,
    y1: top + HEADER_PLATE_FIELD.y1 * plate.height,
  };
}

/** Centre x of each of `n` equal columns spanning the field. */
export function headerColumnCentres(field: { x0: number; x1: number }, n: number): number[] {
  const pitch = (field.x1 - field.x0) / n;
  return Array.from({ length: n }, (_, i) => field.x0 + pitch * (i + 0.5));
}

/**
 * The side-scroller's header deck: a 5-column, 2-row GRID.
 *
 * Both rows hang off the same five column centres, which is what makes it read
 * as one control panel rather than as two independent piles of hand-picked x's.
 * (An earlier pass spread each row flush end-to-end with equal gaps. Equal gaps
 * are not the same thing as a grid: with four controls in one row and six in the
 * other, nothing lined up vertically and the deck read as scattered.)
 *
 * Every cell is the box its art is contain-fitted into, so the cell is an upper
 * bound on the ink and containment can be checked against boxes instead of
 * pixels. `TrackV3Scene` binds a sprite, an event and a caption to each id; the
 * geometry lives here because that is what makes it testable without Phaser.
 *
 * EVERYTHING STAYS INSIDE THE PARCHMENT, on both axes. A previous pass gave the
 * rows licence to stand proud of the top and bottom rails on the theory that a
 * keycap overlapping the frame reads as mounted hardware. It does not — it reads
 * as a control falling off the panel, most obviously on the one key whose art
 * fills its cell edge to edge. The field is 306 px tall, so two rows of 134 with
 * a gap is what actually fits, and the controls are sized to that rather than
 * the plate being asked to hide the overflow.
 */
export const TRACK_HEADER = {
  // 2560x1440 design space; the plate overhangs the TOP screen edge on purpose
  // (chrome that runs off the frame is the frame). Its bottom stops at 460,
  // clear of the hills band at 470.
  plate: { x: 1280, y: 220, width: 1980, height: 480 },
  columns: 5,
  rows: [
    // WHERE you are, WHETHER it is playing, and what leaves with the song. The
    // two wide plaques (MAP, SEND) bookend the three transport keycaps.
    {
      cy: 142,
      cells: [
        // MAP and SEND are landscape plaques; their widths are their art's
        // aspect at this row height, so the contain-fit does not leave dead
        // space inside the cell that the grid then spaces around.
        { id: "map", width: 256, height: 134 },
        { id: "ride", width: 134, height: 134 },
        { id: "stop", width: 134, height: 134 },
        { id: "clear", width: 134, height: 134 },
        { id: "send", width: 235, height: 134 },
      ],
    },
    // HOW it plays: the tempo trio, then TARP. Ride already loops forever;
    // the former finite-count LOOP key duplicated that default and added noise.
    {
      cy: 294,
      cells: [
        { id: "slow", width: 134, height: 134 },
        // Drawn text, not a sprite: `lcd-transport` is a Tiled display anchor
        // the oval mounts from its map, and this scene has no map.
        { id: "tempo", width: 134, height: 134 },
        { id: "fast", width: 134, height: 134 },
        { id: "tarp", width: 134, height: 134 },
      ],
    },
  ],
} as const;

/** Every header control's placed rect, keyed by cell id. */
export function trackHeaderSlots(): Record<string, PlacedRect> {
  const field = headerPlateField(TRACK_HEADER.plate);
  const out: Record<string, PlacedRect> = {};
  for (const row of TRACK_HEADER.rows) {
    const xs = headerColumnCentres(field, row.cells.length);
    row.cells.forEach((c, i) => {
      out[c.id] = { x: xs[i] ?? 0, y: row.cy, width: c.width, height: c.height };
    });
  }
  return out;
}

/**
 * The side-scroller's bottom job bar. Kept beside the header grid so the scene,
 * canvas-input tests and visual-release evidence share one coordinate producer.
 */
export const TRACK_JOB_BAR = {
  plate: { x: 1280, y: 1275, width: 1980, height: 370 },
  field: { x0: 400, x1: 2064 },
  columns: 4,
  rows: [1189, 1361],
  switch: { width: 325, height: 150 },
  switches: [
    { id: "hill", label: "HILL" },
    { id: "bridge", label: "BRIDGE" },
    { id: "rain", label: "RAIN" },
    { id: "night", label: "🌙 NIGHT" },
    { id: "tunnel", label: "⛰ TUNNEL" },
    { id: "tiny", label: "🐭 TINY" },
    { id: "giant", label: "🦖 GIANT" },
    { id: "backwards", label: "⏪ BACK" },
  ],
} as const;

export type TrackJobId = (typeof TRACK_JOB_BAR.switches)[number]["id"];

/** Every job-bar switch rect, keyed by its mode id. */
export function trackJobSlots(): Record<TrackJobId, PlacedRect> {
  const pitch = (TRACK_JOB_BAR.field.x1 - TRACK_JOB_BAR.field.x0) / TRACK_JOB_BAR.columns;
  return Object.fromEntries(
    TRACK_JOB_BAR.switches.map(({ id }, i) => [
      id,
      {
        x: Math.round(TRACK_JOB_BAR.field.x0 + ((i % TRACK_JOB_BAR.columns) + 0.5) * pitch),
        y: TRACK_JOB_BAR.rows[Math.floor(i / TRACK_JOB_BAR.columns)] ?? TRACK_JOB_BAR.rows[0],
        width: TRACK_JOB_BAR.switch.width,
        height: TRACK_JOB_BAR.switch.height,
      },
    ]),
  ) as Record<TrackJobId, PlacedRect>;
}

/** Compact signal-box placement: below the header and outside the central
 *  train/playhead corridor. Release evidence captures it while audio is live. */
export const TRACK_VISUALIZER: PlacedRect = {
  x: 420,
  y: 565,
  width: 340,
  height: 102,
};

/** The focus key is deliberately outside both hideable decks. It is the one
 *  guaranteed path back to controls and meets the child-control 68px minimum. */
export const TRACK_FOCUS_KEY: PlacedRect = {
  x: 2490,
  y: 600,
  width: 120,
  height: 100,
};

// Yard v2: 4 parallel sidings hold the built-car palette; the straight track
// inside the oval is the assembly line the crane drops cars onto. Measured
// from the 2026-07-02 repainted base plate (rail rows: oval top 0.289,
// assembly straight 0.361, oval bottom 0.473, sidings from 0.517).
export const YARD_LAYOUT_V2 = {
  palette: { x: 0.03, y: 0.47, w: 0.55, h: 0.40 } satisfies NormRegion,
  assemblyLine: { x: 0.17, y: 0.316, w: 0.66, h: 0.09 } satisfies NormRegion,
  crane: { x: 0.50, y: 0.35, w: 0.40, h: 0.40 } satisfies NormRegion,
} as const;

/**
 * The painted gantry's beam line — the height a lifted car hangs at.
 *
 * Measured off `yard-scene-clean-v2.png`: the beam spanning the gantry's two
 * legs (x 0.510–0.554 and 0.580–0.622) reads strongest at y 0.3007.
 *
 * KNOWN LIMIT, deliberately not papered over: this fixes the crane's VERTICAL
 * story only. A car is picked up from a siding at x ≈ 0.11 and the gantry
 * stands at x 0.51–0.62, so the hoist still begins ~0.4 of the canvas away
 * from the painted crane. Closing that needs the sidings repainted under the
 * gantry or the gantry repainted over the sidings — an art/layout decision,
 * not a constant. The lift now at least happens at the beam's height and the
 * car is lowered onto the line rather than raised onto it.
 */
export const YARD_CRANE_BEAM_Y = 0.3007;

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
  /**
   * The NEAR railhead of each siding, measured off `yard-scene-clean-v2.png`.
   *
   * This was `y0 0.517 + row × dy 0.092`, and a straight line cannot fit these
   * rails: the sidings RECEDE in the plate's shallow 3/4, so their pitch shrinks
   * (0.0937, 0.0903, 0.0875). The linear model landed on the FAR rail of each
   * pair — cars stood on the wrong rail of their own siding, floating ~7-16 px
   * above the one their wheels should touch.
   *
   * Measured, not eyeballed: a per-row luminance-contrast profile over the
   * siding band resolves each siding into its two painted rails —
   *   siding 1  far 0.5097  near 0.5278
   *   siding 2  far 0.6042  near 0.6215
   *   siding 3  far 0.6944  near 0.7118
   *   siding 4  far 0.7819  near 0.7993
   * The NEAR rail is the one a side-on car's wheels rest on, so these are the
   * near column. Re-measure with the same method if the plate is repainted.
   */
  railY: [0.5278, 0.6215, 0.7118, 0.7993] as readonly number[],
  carW: 0.052, // car CELL fit width (fraction of image width)
  // car CELL fit height (fraction of image HEIGHT) — the binding axis.
  // 0.085 -> 0.082 with the railY move: the tightest real pitch is 0.0875
  // (sidings 3->4), where the old value made body+gap+chip exactly 0.0875 —
  // touching, not clearing. See the arithmetic below.
  carH: 0.082,
  dx: 0.053, // horizontal spacing between cars on a siding
  /** Name chip: width + height as fractions of image WIDTH, and the gap below
   *  the car's wheels. Sized in SCREEN space (the chip is not a child of the
   *  car) so its legibility does not track the car's fit scale.
   *
   *  The vertical sum is what has to clear the siding pitch. In fractions of
   *  image HEIGHT, at any 16:9 canvas:
   *      body  0.758 × 0.082            = 0.0622
   *      gap   0.0025 × (16/9)          = 0.0044
   *      chip  0.0105 × (16/9)          = 0.0187
   *                                  ⇒   0.0853  <  0.0875  ✓
   *  0.0875 is the TIGHTEST measured pitch (railY[3] − railY[2]), not an
   *  average — the rails recede, so the average would pass while the bottom
   *  pair overlapped.
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
