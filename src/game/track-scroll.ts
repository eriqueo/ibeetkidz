// Side-scrolling Track (v3): the arithmetic, with no Phaser in it.
//
// The oval could never show a SEQUENCE. Terrain is a sequence — "this bar is a
// hill, the next one is a bridge" — and on a ring half the cars always travel
// the opposite way across the screen. So v3 unrolls the loop into a line.
//
// The model: ONE scrolling world laid out in bar order, moving right-to-left
// past a FIXED playhead. Whatever sits under the playhead is what is sounding.
// Bar b occupies world span [b, b+1), so the ground under bar b, the car for
// bar b and the terrain applied to bar b all travel together and reach the
// playhead at the same instant — cause and effect co-located, and the NEXT
// bar's terrain visibly approaching from the right before it arrives.
//
// Phaser-free on purpose: a real `import Phaser` cannot load under jsdom (it
// dies in `checkInverseAlpha` on a null 2D context), so anything living inside
// a scene file is unreachable by the unit suite by construction. That is how
// the Yard palette shipped overlapping itself for months.

/** Where the world is drawn, in screen px. */
export interface ScrollView {
  /** Visible width. */
  readonly width: number;
  /** Fraction of the width the playhead sits at, 0..1. */
  readonly playhead: number;
  /** Px of track per bar of song. */
  readonly barWidth: number;
}

/** One bar of song, placed on screen. */
export interface BarSlot {
  /** Bars since the ride started — grows without bound. */
  readonly absBar: number;
  /** Which car of the song this is, 0..totalBars-1. */
  readonly songBar: number;
  /** Screen x of this bar's leading (left) edge. */
  readonly x: number;
  /** Screen x of this bar's centre — where its car is drawn. */
  readonly centreX: number;
}

/** Screen x of the playhead. */
export function playheadX(view: ScrollView): number {
  return view.width * clamp01(view.playhead);
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/** Wrap an absolute bar onto the song, for any sign of input. */
export function songBarOf(absBar: number, totalBars: number): number {
  const n = Math.max(1, Math.floor(totalBars));
  return ((Math.floor(absBar) % n) + n) % n;
}

/** Screen x of the leading edge of `absBar`, at song position `pos` (in bars). */
export function barEdgeX(absBar: number, pos: number, view: ScrollView): number {
  return playheadX(view) + (absBar - pos) * view.barWidth;
}

/**
 * Every bar with any part of itself on screen, left to right, with one bar of
 * bleed at each end so a car entering or leaving is never popped into being.
 */
export function visibleBars(
  pos: number,
  totalBars: number,
  view: ScrollView,
): BarSlot[] {
  const bw = view.barWidth;
  if (!(bw > 0) || !Number.isFinite(pos)) return [];
  const head = playheadX(view);
  // Solve barEdgeX(b) within [-2*bw, width + bw] for b.
  const first = Math.floor(pos - (head + 2 * bw) / bw);
  const last = Math.ceil(pos + (view.width - head + bw) / bw);
  const out: BarSlot[] = [];
  for (let b = first; b <= last; b++) {
    const x = barEdgeX(b, pos, view);
    if (x > view.width + bw || x < -2 * bw) continue;
    out.push({
      absBar: b,
      songBar: songBarOf(b, totalBars),
      x,
      centreX: x + bw / 2,
    });
  }
  return out;
}

/** The bar currently under the playhead. */
export function barAtPlayhead(pos: number): number {
  return Math.floor(pos);
}

/**
 * How far the world has travelled, in px. This is the single source of every
 * distance-driven animation in the scene (GAME_FEEL Law 4: wheels turn because
 * the vehicle travelled, never because a timer fired).
 */
export function travelPx(pos: number, view: ScrollView): number {
  return pos * view.barWidth;
}

/**
 * A parallax plane's texture offset. Floored to whole pixels — a sub-pixel
 * `tilePosition` makes pixel art shimmer between frames (Law 7).
 *
 * `rate` is relative to the ground: 0 is painted-on sky, 1 moves with the
 * rails, above 1 is foreground that rushes past.
 */
export function parallaxOffset(pos: number, view: ScrollView, rate: number): number {
  return Math.floor(travelPx(pos, view) * rate);
}

/**
 * Wheel angle in radians from DISTANCE, not from the clock. Halve the speed and
 * this halves with it, for free, because it never knew the speed to begin with.
 */
export function wheelAngle(distancePx: number, wheelRadiusPx: number): number {
  const r = Math.max(1, wheelRadiusPx);
  return distancePx / r;
}

/**
 * Secondary motion (Law 6): amplitude AND frequency scale with speed, and both
 * reach zero at rest, so a stopped train is genuinely still rather than idling.
 * `speed` is bars per second.
 */
export function bobOffset(
  distancePx: number,
  speed: number,
  maxAmplitudePx = 3,
): number {
  const s = Math.max(0, Math.min(1, Math.abs(speed) / 2));
  if (s <= 0) return 0;
  // Phase from distance so the bob cannot drift out of step with the ground.
  return Math.sin(distancePx / 26) * maxAmplitudePx * s;
}

/** Bars a terrain ride covers, as a screen span. Returns null when off-screen. */
export function terrainSpanX(
  startBar: number,
  endBar: number,
  pos: number,
  view: ScrollView,
): { x: number; width: number } | null {
  const x = barEdgeX(startBar, pos, view);
  const right = barEdgeX(endBar, pos, view);
  if (right < -view.barWidth || x > view.width + view.barWidth) return null;
  return { x, width: Math.max(0, right - x) };
}
