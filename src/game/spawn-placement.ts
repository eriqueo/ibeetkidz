// The pure placement math for a Tiled spawn: where a normalized descriptor
// lands on a screen, given the background rect it anchors to and the camera.
//
// Split out of `TiledSceneAdapter.ts` so that modules which only need the
// arithmetic (`track-chrome-layout.ts`, and through it `scene-layout.ts` and
// the unit tests) do not pull in the adapter's `EventBus`, which is a Phaser
// emitter and cannot load under jsdom. The adapter re-exports everything here,
// so its existing importers are untouched.
import type { TiledSpawn } from "./TiledParser.ts";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraSize {
  width: number;
  height: number;
}

/** Cover-fit a `imgW×imgH` image into the camera; returns the displayed rect
 *  (top-left x/y may be negative on the cropped axis). Mirrors the scenes'
 *  `addBackground("cover")` so bg-anchored spawns land on the painted art. */
export function coverRect(imgW: number, imgH: number, cam: CameraSize): Rect {
  const scale = Math.max(cam.width / imgW, cam.height / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (cam.width - width) / 2, y: (cam.height - height) / 2, width, height };
}

/**
 * Resolve a spawn's centre position + size in screen pixels.
 *
 * - `bg` (default): positioned on the cover-fit background image, so it tracks
 *   the painted art (and crops with it).
 * - `ui-top-right` / `ui-bottom-center`: positioned relative to the CAMERA so the
 *   element can never be cropped on off-16:9 viewports — keeping the same art
 *   scale (sized off the background rect) and the same corner gap it has in the
 *   source image, but pinned to the camera edge.
 *
 * Returns the rect CENTRE (x,y) + size, matching Phaser's default 0.5 origin.
 */
export function placeSpawn(s: TiledSpawn, bg: Rect, cam: CameraSize): Rect {
  const width = s.w * bg.width;
  const height = s.h * bg.height;

  if (s.anchor === "ui-top-right") {
    // X: pin to the camera right edge so the button never scrolls off-screen.
    // Y: offset by bg.y so the hit area tracks the painted art when the bg is
    //    letterboxed (contain fit adds a vertical margin; cover fit has bg.y ≤ 0).
    const rightGap = (1 - (s.cx + s.w / 2)) * bg.width;
    const topGap = (s.cy - s.h / 2) * bg.height;
    return { x: cam.width - rightGap - width / 2, y: bg.y + topGap + height / 2, width, height };
  }
  if (s.anchor === "ui-bottom-center") {
    // X: offset by bg.x so the button tracks the painted art horizontally.
    // Y: offset by bg.y so the hit area tracks the painted art when the bg is
    //    letterboxed (contain fit adds a vertical margin; cover fit has bg.y ≤ 0).
    const bottomGap = (1 - (s.cy + s.h / 2)) * bg.height;
    return {
      x: bg.x + bg.width / 2 + (s.cx - 0.5) * bg.width,
      y: bg.y + bg.height - bottomGap - height / 2,
      width,
      height,
    };
  }
  // anchor === "bg"
  return { x: bg.x + s.cx * bg.width, y: bg.y + s.cy * bg.height, width, height };
}
