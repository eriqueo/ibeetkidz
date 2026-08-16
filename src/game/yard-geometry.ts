// Where every car in the Yard sits, as pure arithmetic.
//
// Phaser-free on purpose. This is the math the palette got WRONG for its whole
// life — `fitToken` scaled a car's 128 px cell by width only, so `carH` sized
// the slot rect and was then never used to constrain the sprite, which at the
// reference canvas drew a 238 px body on a 132.5 px siding pitch and buried
// every car under the next one. `YardScene` cannot be imported by the unit
// suite (a real `import Phaser` cannot load under jsdom), so as long as this
// lived inside the scene there was no way to write a test that would have
// caught it. Now there is: `tests/unit/yard-layout.test.ts`.
import { YARD_SIDINGS_V2, YARD_LAYOUT_V2 } from "./scene-layout.ts";
import { CAR_CONTENT_E, FRAME_SIZE } from "./car-geometry.ts";
import type { Direction } from "./sprite-assets.ts";

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Centre + size of palette slot `i` within a contained-image rect. Cars fill
 *  the 4 sidings top→bottom, then wrap to the next column. Shared by the Phaser
 *  sprite and the React hit-area so they always coincide.
 *
 *  `cy` is the RAIL line, and a car's container origin is where its wheels
 *  touch — so the body grows upward from `cy` and the name chip hangs below it,
 *  inside the pitch to the next siding. */
export function paletteSlot(
  rect: SlotRect,
  i: number,
): { cx: number; cy: number; w: number; h: number } {
  const row = i % YARD_SIDINGS_V2.rows;
  const col = Math.floor(i / YARD_SIDINGS_V2.rows);
  return {
    cx:
      rect.x +
      rect.width * (YARD_SIDINGS_V2.x0 + YARD_SIDINGS_V2.carW / 2 + col * YARD_SIDINGS_V2.dx),
    // The measured near railhead for this siding — NOT `y0 + row * dy`. The
    // painted sidings recede, so their pitch is not constant and no linear
    // model lands on all four (see `railY`'s comment).
    cy: rect.y + rect.height * (YARD_SIDINGS_V2.railY[row] ?? YARD_SIDINGS_V2.railY[0]!),
    w: rect.width * YARD_SIDINGS_V2.carW,
    h: rect.height * YARD_SIDINGS_V2.carH,
  };
}

/** Horizontal pitch between assembly-line slots. Spacing shrinks as the train
 *  grows so the slots stay inside the painted track. Exported because it is
 *  also the width budget for each car's name chip. */
export function trainStep(rect: SlotRect, count: number): number {
  const w = rect.width * YARD_SIDINGS_V2.carW;
  const span = rect.width * YARD_LAYOUT_V2.assemblyLine.w;
  return Math.min(w * 1.05, span / Math.max(1, count));
}

/** Centre + size of assembly-line slot `i` (left→right along the top track). */
export function trainSlot(
  rect: SlotRect,
  i: number,
  count: number,
): { cx: number; cy: number; w: number; h: number } {
  const a = YARD_LAYOUT_V2.assemblyLine;
  const w = rect.width * YARD_SIDINGS_V2.carW;
  const h = rect.height * YARD_SIDINGS_V2.carH;
  const step = trainStep(rect, count);
  const startX = rect.x + rect.width * a.x + w / 2;
  return {
    cx: startX + i * step,
    cy: rect.y + rect.height * (a.y + a.h / 2),
    w,
    h,
  };
}

/**
 * Which assembly-line slot a car dropped at screen `x` belongs in.
 *
 * The inverse of `trainSlot`'s `cx`, rounded to the nearest slot and clamped to
 * the occupied range — so dragging a car off either end parks it first or last
 * rather than dropping it out of the train. Pure, because "where did that land"
 * is exactly the arithmetic that is impossible to eyeball once a train is long
 * and `trainStep` has started packing the slots tighter.
 */
export function trainIndexAtX(
  rect: SlotRect,
  x: number,
  count: number,
): number {
  if (count <= 1) return 0;
  const a = YARD_LAYOUT_V2.assemblyLine;
  const w = rect.width * YARD_SIDINGS_V2.carW;
  const step = trainStep(rect, count);
  const startX = rect.x + rect.width * a.x + w / 2;
  const raw = Math.round((x - startX) / step);
  return Math.max(0, Math.min(count - 1, raw));
}

/**
 * Move item `from` to index `to`, returning a new array.
 *
 * This is a MOVE, not a swap: dragging car 1 to the end must leave 2,3,4
 * shuffled down, not put car 4 where car 1 was. A swap is the tempting
 * one-liner and it is wrong — it makes a long drag do something the kid did not
 * ask for at the far end of the train.
 */
export function moveTrainOrder<T>(ids: readonly T[], from: number, to: number): T[] {
  const next = [...ids];
  if (from === to || from < 0 || from >= next.length) return next;
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved!);
  return next;
}

/**
 * Uniform scale for a car's square atlas cell inside a slot — **both axes
 * bind**.
 *
 * This used to be `slot.w / cellSize`, width only. That one missing axis was
 * the whole occlusion bug: `carH` existed, sized the slot, and was then thrown
 * away.
 */
export function carFitScale(
  slot: { w: number; h: number },
  cellSize: number = FRAME_SIZE,
): number {
  return Math.min(slot.w, slot.h) / cellSize;
}

/** Centre + size of the name chip belonging to the car in `slot`, in screen px,
 *  plus the widest it may grow before it reaches its neighbour. Sized off the
 *  CANVAS, never off the car — see `CarNamePlate`. */
export function namePlateBox(
  rect: SlotRect,
  slot: { cx: number; cy: number },
  pitchX: number,
): { cx: number; cy: number; w: number; h: number; maxW: number } {
  const s = YARD_SIDINGS_V2;
  const h = rect.width * s.plateH;
  return {
    cx: slot.cx,
    cy: slot.cy + rect.width * s.plateGap + h / 2,
    w: rect.width * s.plateW,
    h,
    maxW: pitchX,
  };
}

/** Tallest opaque car body, in cell px — `boxcar-E`, 97 of 128. The vertical
 *  budget has to clear the WORST case, not the average one. */
export const TALLEST_CAR_BODY =
  Math.max(...Object.values(CAR_CONTENT_E).map(([, y0, , y1]) => y1 - y0)) * FRAME_SIZE;

/**
 * Which way palette and assembly-line cars face.
 *
 * `"E"`, not `"S"`. The painted sidings on `yard-scene-clean-v2.png` run
 * east–west; the `S` frames are drawn pointing north–south, so every palette
 * car used to sit CROSSWISE on its own rail. Side-on is also the wider, more
 * distinctive silhouette (`boxcar-E` is 117×97 opaque against `boxcar-S`'s
 * 49×108) and it is what the Track and the Workshop already show — so one car
 * looks like the same car in every space.
 */
export const PALETTE_DIR: Direction = "E";
