// Single source of truth for where React overlays sit on the painted scene
// backgrounds. Every value is a fraction of the 2560×1440 (16:9) reference
// image, eyeballed from the art. These are PLACEHOLDER coordinates — they need
// a visual tuning pass against the running app; keep them here so tuning is a
// one-file edit shared by both the Phaser scene and the React overlay.
import type { NormRegion } from "../app/use-overlay-rect.ts";
import { MAX_LAYERS } from "../core/types.ts";
import { gameConfig } from "./game-config.ts";
import type { SliderRail } from "./speed-slider.ts";
import {
  TRACK_JOB_IDS,
  TRACK_TOOLBAR_IDS,
  parseTrackChrome,
  trackChromeRects,
  type PlacedRect,
  type TrackHeaderSlotId,
  type TrackJobId,
  type TrackToolbarId,
} from "./track-chrome-layout.ts";

// The Workshop's and Yard's TUNED numbers live in `game-config.json` and are
// read here through getters, so every consumer of these objects keeps its
// name while a `?tune` edit changes what it reads on the next layout pass.
// Nothing below captures a value at import: a module-level copy would freeze
// the number the file had when the page loaded.
const kw = gameConfig.workshop;
const ky = gameConfig.yard;

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
  get minRows(): number { return kw.gridMinRows; },
  // lane-label column (holds delete ✕, the instrument emoji, and a 🎹 edit
  // button on melody lanes), as a fraction of the grid width.
  get labelFrac(): number { return kw.gridLabelFrac; },
  // gap between cells, as a fraction of the cell size
  get cellPad(): number { return kw.gridCellPad; },
};

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
  get x(): number { return kw.toolModalX; },
  get y(): number { return kw.toolModalY; },
  get w(): number { return kw.toolModalW; },
  get h(): number { return kw.toolModalH; },
};

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

export type { PlacedRect, TrackJobId, TrackToolbarId };
export { TRACK_TOOLBAR_IDS };

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
 * Where `panel-header-v2` (2687 × 687) may be cut so the plate can be any width
 * WITHOUT stretching its pixel art: the two ends (brass corners and gear
 * medallions) are drawn at one uniform scale, and the plain middle — wood rail,
 * rivets and parchment — repeats between them. Each cut sits midway between
 * two rivets of the top rail, and the middle is exactly twelve rivet pitches
 * (139 px), so a repeat continues the rivet row instead of breaking it.
 * Measured off the PNG, 2026-10-05: rivet centres 430, 564, 704 … 2240.
 */
export const HEADER_PLATE_SLICE = {
  texW: 2687,
  texH: 687,
  left: 498 / 2687,
  right: 2168 / 2687,
} as const;

/** The parchment field of a SLICED `panel-header-v2` (see
 *  `HEADER_PLATE_SLICE`). Its ends are at uniform scale, so the field's side
 *  margins are fixed pixels, not fractions of the plate's width. */
export function slicedHeaderField(plate: PlacedRect): { x0: number; x1: number; y0: number; y1: number } {
  const s = plate.height / HEADER_PLATE_SLICE.texH;
  const left = plate.x - plate.width / 2;
  const top = plate.y - plate.height / 2;
  return {
    x0: left + HEADER_PLATE_FIELD.x0 * HEADER_PLATE_SLICE.texW * s,
    x1: left + plate.width - (1 - HEADER_PLATE_FIELD.x1) * HEADER_PLATE_SLICE.texW * s,
    y0: top + HEADER_PLATE_FIELD.y0 * plate.height,
    y1: top + HEADER_PLATE_FIELD.y1 * plate.height,
  };
}

/**
 * The side-scroller's chrome, AS AUTHORED in `assets/maps/track-v3.json`.
 *
 * Since 2026-10-12 the rects below are read from that map rather than computed
 * here, so `?edit` can drag them. This module exposes the FILE's layout — what
 * the unit tests lint, what the e2e specs tap, what React asks about — and the
 * scene reads the same map through its own live spawns. One producer: the map.
 *
 * The header: ONE row, grouped by what each control is for (Eric,
 * 2026-10-05): "ride/stop, tempo slider, and then maybe just send on the
 * right, and map on the left … that way we can also make the header not so
 * tall, its huge."
 *
 *   MAP · SPEED readout + short slider · RIDE/STOP (centre, biggest) · SEND
 *
 * The plate overhangs the TOP screen edge on purpose (chrome that runs off
 * the frame is the frame), is 340 tall, and keeps its art's shape at that
 * height because it is SLICED (`HEADER_PLATE_SLICE`), not squashed: its width
 * is exactly two repeats of the sliced middle between the ends, so no repeat
 * is cut short. Every cell is the box its art is contain-fitted into, and
 * `tests/unit/track-header-layout.test.ts` lints that everything stays inside
 * the parchment on both axes.
 */
const AUTHORED = trackChromeRects(parseTrackChrome());

export const TRACK_HEADER = {
  plate: AUTHORED.plate,
  // In left-to-right order, for the tests and the scene.
  order: ["map", "speed", "ride", "send"] as readonly TrackHeaderSlotId[],
} as const;

/** Every header control's placed rect, keyed by cell id, as authored. */
export function trackHeaderSlots(): Record<TrackHeaderSlotId, PlacedRect> {
  return { ...AUTHORED.slots };
}

/** Width of the SPEED readout at the left of the speed cell, and the clear
 *  space between it and the rail, and at the rail's far end (where the
 *  handle's half-width must still land inside the cell). */
const SPEED_READOUT_W = 160;
const SPEED_RAIL_GAP = 36;
const SPEED_RAIL_END = 40;

/** The speed cell, divided: the readout at its left, the rail across the rest.
 *  `cell` defaults to the authored speed cell; the scene passes its live one. */
export function trackSpeedSlider(cell: PlacedRect = AUTHORED.slots.speed): {
  readonly readout: PlacedRect;
  readonly rail: SliderRail;
  /** The touch target: the whole rail plus room for the handle at each end. */
  readonly hit: PlacedRect;
} {
  const left = cell.x - cell.width / 2;
  const right = cell.x + cell.width / 2;
  const readout = { x: left + SPEED_READOUT_W / 2, y: cell.y, width: SPEED_READOUT_W, height: cell.height };
  const rail = { x0: left + SPEED_READOUT_W + SPEED_RAIL_GAP, x1: right - SPEED_RAIL_END, y: cell.y };
  // From the readout's edge to the cell's end: all of the rail, and room for
  // a finger on the handle at either stop.
  const hitX0 = rail.x0 - SPEED_RAIL_GAP;
  const hitX1 = rail.x1 + SPEED_RAIL_END;
  const hit = { x: (hitX0 + hitX1) / 2, y: cell.y, width: hitX1 - hitX0, height: cell.height };
  return { readout, rail, hit };
}

/**
 * The side-scroller's bottom job bar, as authored in `track-v3.json`: the
 * shared transport plate docked to the bottom edge, and eight switches on it
 * in two rows of four (eight across gave each picture a thumbnail's slot; the
 * player cannot read the captions, so a picture too small to identify is a
 * button with no label at all). The captions are for the adult, drawn only
 * when a switch has no painted art yet.
 */
const JOB_LABELS: Readonly<Record<TrackJobId, string>> = {
  hill: "HILL",
  bridge: "BRIDGE",
  rain: "RAIN",
  night: "🌙 NIGHT",
  tunnel: "⛰ TUNNEL",
  tiny: "🐭 TINY",
  giant: "🦖 GIANT",
  backwards: "⏪ BACK",
};

export const TRACK_JOB_BAR = {
  plate: AUTHORED.jobsPlate,
  switches: TRACK_JOB_IDS.map((id) => ({ id, label: JOB_LABELS[id] })) as readonly { id: TrackJobId; label: string }[],
} as const;

/** Every job-bar switch rect, keyed by its mode id, as authored. */
export function trackJobSlots(): Record<TrackJobId, PlacedRect> {
  return { ...AUTHORED.jobs };
}

/** Each Track deck owns its own always-visible edge key, level with its plate
 *  and clear of the plate's end — authored in the same map as the decks they
 *  govern, so hide/show targets share one coordinate producer with them. */
export const TRACK_TOOLBAR_TOGGLES: Readonly<Record<TrackToolbarId, PlacedRect>> = AUTHORED.toggles;

// Yard v2: 4 parallel sidings hold the built-car palette; the straight track
// inside the oval is the assembly line the crane drops cars onto. Measured
// from the 2026-07-02 repainted base plate (rail rows: oval top 0.289,
// assembly straight 0.361, oval bottom 0.473, sidings from 0.517).
export const YARD_LAYOUT_V2 = {
  palette: { x: 0.03, y: 0.47, w: 0.55, h: 0.40 } satisfies NormRegion,
  get assemblyLine(): NormRegion {
    return { x: ky.assemblyX, y: ky.assemblyY, w: ky.assemblyW, h: ky.assemblyH };
  },
  crane: { x: 0.50, y: 0.35, w: 0.40, h: 0.40 } satisfies NormRegion,
};

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
  /** Left edge of a siding (first car centre offset added per index). */
  get x0(): number { return ky.sidingX0; },
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
  /** car CELL fit width (fraction of image width) */
  get carW(): number { return ky.carW; },
  // car CELL fit height (fraction of image HEIGHT) — the binding axis.
  // 0.085 -> 0.082 with the railY move: the tightest real pitch is 0.0875
  // (sidings 3->4), where the old value made body+gap+chip exactly 0.0875 —
  // touching, not clearing. See the arithmetic below.
  get carH(): number { return ky.carH; },
  /** horizontal spacing between cars on a siding */
  get dx(): number { return ky.carDx; },
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
  get plateW(): number { return ky.plateW; },
  get plateH(): number { return ky.plateH; },
  get plateGap(): number { return ky.plateGap; },
};

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
