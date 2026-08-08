// Terrain as GEOMETRY, not as a colour wash.
//
// A hill has to actually be a hill: the rails rise, the train climbs it and
// tilts nose-up on the way, then noses down the far side. A bridge has to be a
// real deck with a real gap under it. Otherwise "terrain" is a label on a
// rectangle and the physical-thing→musical-thing link Eric is after never lands.
//
// ONE function is the source of truth for a terrain's shape: `railLift`. Three
// separate things read it and therefore cannot disagree —
//
//   1. the ground/mound TEXTURE is generated from it (greybox today, and the
//      art brief later is simply "match this silhouette"),
//   2. the train's HEIGHT at any point is `railLift` at that point,
//   3. the train's TILT is `railSlope`, the same curve differentiated.
//
// That is what makes the art swap safe: replace the picture, keep the profile,
// and the train still lands on the drawn surface. If a sprite is ever drawn from
// anything other than this function, the two will drift and the train will float
// again — which is exactly the failure the oval shipped with.
//
// Phaser-free, so it is unit-testable (a real `import Phaser` cannot load under
// jsdom).

import type { TerrainKind } from "../core/terrain.ts";

/** A terrain occupying an absolute bar span, as the transport committed it. */
export interface TerrainSpan {
  readonly kind: TerrainKind;
  readonly startBar: number;
  readonly endBar: number;
}

/** How high a hill lifts the rails at its summit, in px. */
export const HILL_PEAK = 190;
/** How far the ground falls away beneath a bridge, in px. */
export const BRIDGE_GAP = 260;

/** Position within a span, 0..1. Outside the span this is <0 or >1. */
function spanU(atBar: number, span: TerrainSpan): number {
  const len = span.endBar - span.startBar;
  if (!(len > 0)) return -1;
  return (atBar - span.startBar) / len;
}

/**
 * Px the rails are lifted at absolute bar position `atBar`.
 *
 * A raised cosine, so the hill meets flat ground with ZERO slope at both ends.
 * A parabola or a triangle would join the flat run at an angle and the train
 * would visibly kink as it stepped on and off — the join is the part you notice.
 */
export function railLift(atBar: number, span: TerrainSpan | null): number {
  if (!span || span.kind !== "hill") return 0;
  const u = spanU(atBar, span);
  if (u <= 0 || u >= 1) return 0;
  return ((1 - Math.cos(2 * Math.PI * u)) / 2) * HILL_PEAK;
}

/**
 * Slope of the rails in px per BAR — `railLift` differentiated, analytically
 * rather than by sampling, so the tilt cannot lag the height.
 */
export function railSlope(atBar: number, span: TerrainSpan | null): number {
  if (!span || span.kind !== "hill") return 0;
  const len = span.endBar - span.startBar;
  const u = spanU(atBar, span);
  if (u <= 0 || u >= 1 || !(len > 0)) return 0;
  return (Math.PI * Math.sin(2 * Math.PI * u) * HILL_PEAK) / len;
}

/**
 * The angle a vehicle should sit at, in radians, given the slope and how many
 * px wide a bar is. Phaser rotation is clockwise-positive and screen y grows
 * downward, so a RISING surface needs a negative rotation to put the nose up.
 */
export function railAngle(
  atBar: number,
  span: TerrainSpan | null,
  barWidthPx: number,
): number {
  if (!(barWidthPx > 0)) return 0;
  const angle = -Math.atan(railSlope(atBar, span) / barWidthPx);
  // Normalize -0 to 0. Negating atan(0) yields -0, and `Object.is(-0, 0)` is
  // false, so "level ground" would fail an equality check against 0 forever.
  return angle === 0 ? 0 : angle;
}

/** Px the GROUND falls away at `atBar` — non-zero only under a bridge. */
export function groundDrop(atBar: number, span: TerrainSpan | null): number {
  if (!span || span.kind !== "bridge") return 0;
  const u = spanU(atBar, span);
  if (u <= 0 || u >= 1) return 0;
  // Square shoulders with a short ramp, so it reads as a built structure
  // rather than as a valley — a bridge is a thing people made.
  const shoulder = 0.12;
  const ramp = Math.min(1, Math.min(u, 1 - u) / shoulder);
  return ramp * BRIDGE_GAP;
}

/** Is this terrain weather rather than ground? Rain changes the sky, not the rails. */
export function isWeather(kind: TerrainKind): boolean {
  return kind === "rain";
}

/**
 * The silhouette of a span's ground, as `samples+1` lift values across it.
 * The greybox texture is drawn from exactly this, which is what guarantees the
 * picture and the physics agree.
 */
export function liftSamples(span: TerrainSpan, samples = 48): number[] {
  const out: number[] = [];
  const len = span.endBar - span.startBar;
  for (let i = 0; i <= samples; i++) {
    const atBar = span.startBar + (len * i) / samples;
    out.push(railLift(atBar, span));
  }
  return out;
}
