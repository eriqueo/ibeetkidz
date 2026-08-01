// The algebraic inverse of `placeSpawn`.
//
// `placeSpawn` (TiledSceneAdapter.ts) turns a normalized Tiled rect into screen
// pixels. Dragging is the other direction: the editor has a screen rect and
// needs the normalized values to write back into the map file. Each anchor is
// inverted exactly — no search, no iteration, no fudge factor. If `placeSpawn`
// changes, these must change with it, and `inverse.test.ts` is the round-trip
// proof that they still agree.
//
// Pure: no Phaser, no DOM. That is what makes the round-trip testable.
import type { TiledSpawn } from "../game/TiledParser.ts";
import type { Rect, CameraSize } from "../game/TiledSceneAdapter.ts";

/** The four normalized values a spawn stores: centre + size, as fractions of the
 *  background image. Exactly the fields `placeSpawn` reads. */
export interface NormBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/**
 * Given a spawn's ANCHOR and a target screen rect (centre + size), recover the
 * normalized box that `placeSpawn` would map back to that rect.
 *
 * Note `w`/`h` invert identically for every anchor — only the centre differs —
 * because `placeSpawn` derives size from the background rect in all three cases.
 */
export function invertPlaceSpawn(
  anchor: TiledSpawn["anchor"],
  placed: Rect,
  bg: Rect,
  cam: CameraSize,
): NormBox {
  const w = placed.width / bg.width;
  const h = placed.height / bg.height;

  if (anchor === "ui-top-right") {
    // Forward: x = cam.width - rightGap - width/2, rightGap = (1 - (cx + w/2)) * bg.width
    //       => cx = 1 - w/2 - (cam.width - x - width/2) / bg.width
    // Forward: y = bg.y + topGap + height/2, topGap = (cy - h/2) * bg.height
    //       => cy = h/2 + (y - bg.y - height/2) / bg.height
    return {
      cx: 1 - w / 2 - (cam.width - placed.x - placed.width / 2) / bg.width,
      cy: h / 2 + (placed.y - bg.y - placed.height / 2) / bg.height,
      w,
      h,
    };
  }

  if (anchor === "ui-bottom-center") {
    // Forward: x = bg.x + bg.width/2 + (cx - 0.5) * bg.width
    //       => cx = (x - bg.x) / bg.width   (the same expression as "bg")
    // Forward: y = bg.y + bg.height - bottomGap - height/2,
    //          bottomGap = (1 - (cy + h/2)) * bg.height
    //       => cy = 1 - h/2 - (bg.y + bg.height - y - height/2) / bg.height
    return {
      cx: (placed.x - bg.x) / bg.width,
      cy: 1 - h / 2 - (bg.y + bg.height - placed.y - placed.height / 2) / bg.height,
      w,
      h,
    };
  }

  // anchor === "bg": x = bg.x + cx * bg.width, y = bg.y + cy * bg.height
  return {
    cx: (placed.x - bg.x) / bg.width,
    cy: (placed.y - bg.y) / bg.height,
    w,
    h,
  };
}

/**
 * Normalized box -> the four numbers a Tiled `object` stores.
 *
 * Tiled rect objects are TOP-LEFT anchored and in the map's own pixel space,
 * while `TiledSpawn` carries a normalized CENTRE (see `centrePx` in
 * TiledParser.ts). This is the last step before writing to the file.
 */
export function normToTiledRect(
  box: NormBox,
  mapPxW: number,
  mapPxH: number,
): { x: number; y: number; width: number; height: number } {
  const width = box.w * mapPxW;
  const height = box.h * mapPxH;
  return {
    x: box.cx * mapPxW - width / 2,
    y: box.cy * mapPxH - height / 2,
    width,
    height,
  };
}

/** Round to a sane number of decimals so a saved map stays readable and a no-op
 *  drag produces a no-op diff instead of float noise. Tiled itself writes whole
 *  or one-decimal pixel values. */
export function roundRect(r: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } {
  const round = (n: number): number => Math.round(n * 100) / 100;
  return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
}
