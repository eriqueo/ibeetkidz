// How a car body wears its livery colour — the technique, in one place.
//
// `car-identity.ts` records, measured twice, that a car's colour "must be
// painted BESIDE the sprite, never onto it". That finding is about MULTIPLY,
// which is all `setTint` could do under Phaser 3: the car art is dark (mean RGB
// of the boxcar's opaque pixels is 91,65,50), and multiplying that by any livery
// lands under a quarter brightness, so every car collapses into "dark thing".
// True — but it rules out one operation, not the whole idea, and Eric's brief is
// explicit: "when a color is chosen the whole car should get tinted that color,
// shouldn't require a redraw of any art, just shading".
//
// ── WHICH TINT MODES ACTUALLY EXIST ────────────────────────────────────────
// Phaser 4 advertises seven (`Phaser.TintModes`), and its ApplyTint.glsl really
// does implement all seven. The batch pipeline an Image renders through does
// NOT. Measured in a WebGL context, tinting the same sprite blue in each mode:
//
//     MULTIPLY (0)  works        FILL (1)  works        ADD (2)  works
//     SCREEN (4)    works        OVERLAY (5) renders as multiply
//     HARD_LIGHT (6) NO-OP — renders exactly as untinted
//     MULTIPLY_TWO (7) NO-OP
//
// Hard light is the textbook colouriser and it is the first thing anyone reaches
// for here; it silently does nothing. That measurement is the reason this file
// exists rather than a one-line `setTintMode` at each call site.
//
// ── WHAT IS USED INSTEAD ───────────────────────────────────────────────────
// Two overlays of the body's OWN silhouette, over the untouched body:
//
//   SHADE  MULTIPLY by the livery lightened toward white by `SHADE_LIFT`.
//          Carries every plank, rivet and shadow (it is the art, scaled per
//          channel) and swings the hue, but on its own it is too dark — the
//          measurement above.
//   FILL   the flat livery at `FILL_ALPHA`. Pure hue, no detail at all.
//
// Note that these do NOT compose the way blend layers would: a Phaser tint mode
// transforms the sprite's own texture, not the framebuffer under it, so two
// stacked overlays are a LINEAR MIX of two independent transforms —
// `(1-a)·(base·m) + a·livery`. Getting that backwards is what makes a
// multiply-then-screen stack look like mud; it was modelled over the delivered
// art both ways before these numbers were chosen. At FILL_ALPHA 0.65 the detail
// flattens, at 0.35 a blue car still reads slate-brown, and 0.5 is vivid and
// legible on both the dark boxcar and the near-white tanker.
//
// This module exists so the Track and the Workshop cannot disagree about what
// "car 3 is blue" looks like. Phaser-side on purpose — `livery-style.ts` stays
// Phaser-free so the unit suite can reach the contrast rules, and a blend-mode
// enum cannot live there.
import Phaser from "phaser";
import { hexToInt, lighten } from "./livery-style.ts";

/** How far the MULTIPLY pass's tint is lightened toward white. */
export const SHADE_LIFT = 0.35;
/** How much of the flat livery is mixed over that. */
export const FILL_ALPHA = 0.5;

/**
 * The two overlays that dress one body. Both must carry the SAME texture as the
 * body they sit on — they are its silhouette, not decals — which is why
 * `setLiveryTexture` exists rather than each caller remembering three swaps.
 */
export interface LiveryCoat {
  readonly shade: Phaser.GameObjects.Image;
  readonly fill: Phaser.GameObjects.Image;
}

/** Wire two freshly-made overlays into a coat. Order matters at the call site:
 *  `shade` must be added under `fill`. */
export function asLiveryCoat(
  shade: Phaser.GameObjects.Image,
  fill: Phaser.GameObjects.Image,
): LiveryCoat {
  shade.setTintMode(Phaser.TintModes.MULTIPLY);
  fill.setTintMode(Phaser.TintModes.FILL).setAlpha(FILL_ALPHA);
  return { shade, fill };
}

/** Repaint a coat. `color` is a `#rrggbb` from `CAR_COLORS`. */
export function setLiveryColor(coat: LiveryCoat, color: string): void {
  coat.shade.setTint(lighten(color, SHADE_LIFT));
  coat.fill.setTint(hexToInt(color));
}

/** Follow the body onto a new car type. */
export function setLiveryTexture(coat: LiveryCoat, key: string): void {
  coat.shade.setTexture(key);
  coat.fill.setTexture(key);
}
