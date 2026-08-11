// How a car body wears its livery colour — the technique, in one place.
//
// `car-identity.ts` records, measured twice, that a car's colour "must be
// painted BESIDE the sprite, never onto it". That finding is about MULTIPLY,
// which is all `setTint` could do under Phaser 3: the car art is dark (mean RGB
// of the boxcar's opaque pixels is 91,65,50), and multiplying that by any livery
// lands under a quarter brightness, so every car collapses into "dark thing".
//
// Phaser 4 exposes the other blend modes, and HARD_LIGHT is the one that makes
// tinting a car viable. It splits per channel on the TINT: where the livery is
// dark it multiplies, where the livery is bright it screens. A dark plank stays
// darker than the rivet next to it either way, so the body keeps all of its
// material while taking on the hue — which is exactly Eric's brief, "shouldn't
// require a redraw of any art, just shading".
//
// The technique is an OVERLAY, not a tint on the body itself: the same texture
// drawn a second time, hard-light tinted, composited back over the untouched
// original at `LIVERY_STRENGTH`. That gives a mix control a bare tint has no way
// to express. The four candidate techniques (flat wash / overlay / hard light /
// none) were composited over the delivered art at several strengths and compared
// before these numbers were chosen: at 1.0 the detail flattens out, at 0.6 a
// blue car reads muddy brown, and 0.75 stays legible on both the dark boxcar and
// the near-white tanker.
//
// This module exists so the Track and the Workshop cannot disagree about what
// "car 3 is blue" looks like. Phaser-side on purpose — `livery-style.ts` stays
// Phaser-free so the unit suite can reach the contrast rules, and a blend-mode
// enum cannot live there.
import Phaser from "phaser";
import { hexToInt } from "./livery-style.ts";

/** How much of the hard-light result is mixed back over the plain body. */
export const LIVERY_STRENGTH = 0.75;

/**
 * Turn `img` into a livery overlay for whatever body sits under it: same
 * texture, same origin, hard-light tinted, mixed at `LIVERY_STRENGTH`.
 *
 * Call once at construction; `setLiveryColor` is the per-frame-cheap part.
 */
export function asLiveryOverlay<T extends Phaser.GameObjects.Image>(img: T): T {
  img.setAlpha(LIVERY_STRENGTH).setTintMode(Phaser.TintModes.HARD_LIGHT);
  return img;
}

/** Repaint a livery overlay. `color` is a `#rrggbb` from `CAR_COLORS`. */
export function setLiveryColor(img: Phaser.GameObjects.Image, color: string): void {
  img.setTint(hexToInt(color));
}
