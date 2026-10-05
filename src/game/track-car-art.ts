// Facts measured off the delivered `track3/car-*.png` bodies. Kept outside the
// scene so the unit suite can re-measure them against the files — a real
// `import Phaser` cannot load under jsdom.
import type { CarType } from "../core/types.ts";

/** The first row of the strip of TRACK painted across the bottom of each body
 *  canvas (full width, below a clear gap under the chassis). Drawn, it made
 *  every car carry its own short piece of rail, floating at wheel height and
 *  washed in the car's livery — over the real rail the world already draws.
 *  The scene crops the body above this row; the art files are untouched, and
 *  the canvas bottom is still the railhead. */
/** Widest a rider is drawn, and the share of the car's length the crew may
 *  stand along (the rest is the two ends, where a rider would hang off). */
const RIDER_MAX_W = 100;
const CREW_SPAN = 0.9;
/** Neighbours may overlap by this much of a slot: shoulders, never a face. */
const RIDER_OVERLAP = 1.12;

/** How far apart `count` riders stand on a car `carWidth` long, and how wide
 *  each may be drawn. One or two riders keep their full size; more share the
 *  roof evenly, so none stands in front of another. */
export function crewLayout(
  count: number,
  carWidth: number,
): { readonly pitch: number; readonly slotW: number } {
  const n = Math.max(1, count);
  const pitch = Math.min(RIDER_MAX_W, (carWidth * CREW_SPAN) / n);
  return { pitch, slotW: Math.min(RIDER_MAX_W, pitch * RIDER_OVERLAP) };
}

export const CAR_BODY_RAIL_TOP: Readonly<Record<CarType, number>> = {
  boxcar: 170,
  tanker: 153,
  hopper: 170,
  flatcar: 88,
};
