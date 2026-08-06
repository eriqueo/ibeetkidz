// Contact shadows for world sprites, generated as PIXEL DATA rather than drawn
// as a vector ellipse.
//
// `design/GAME_FEEL.md` Law 2: "a sprite with no contact shadow floats, no
// matter how well it is positioned". Nothing in this project had one. AR-032
// has proper per-type, per-direction palette shadows on order; this is the
// honest interim until they land — an ellipse under each vehicle, sized from
// its footprint, one depth below it.
//
// It is generated as a texture and not as a `Phaser.GameObjects.Ellipse`
// because a smooth anti-aliased blob under hard-edged 16-colour art is exactly
// the "pasted on" read the whole exercise is fixing. These pixels are ordered-
// dithered with a 4×4 Bayer matrix — every pixel is either fully on or fully
// off, the same way the base plate shades its own ballast — and the texture is
// drawn at `WORLD_PIXEL_SCALE`, never stretched, so it stays on the pixel grid
// (Law 1 applies to the shadow too).
//
// Pure: no Phaser, no canvas. The scene uploads the bytes.
import type { Direction } from "./sprite-assets.ts";

/** Plate-native near-black. The scene art outlines everything in this colour. */
export const SHADOW_RGB = { r: 0x07, g: 0x07, b: 0x05 } as const;

/** How dark the finished shadow sits on the ground (the sprite's own alpha). */
export const SHADOW_ALPHA = 0.42;

export interface ShadowSpec {
  /** Texture key. */
  readonly key: string;
  /** Texture size in SOURCE px — drawn at `WORLD_PIXEL_SCALE`, never scaled. */
  readonly width: number;
  readonly height: number;
}

/**
 * Three footprints, one per direction bucket, measured off the train atlas's
 * own content boxes (`train.png`, 128×128 cells):
 *
 *   E / W        content ~117×97 → a long flat pool along the rails
 *   NE/NW/SE/SW  content ~85     → foreshortened
 *   N / S        content ~52×118 → seen end-on, deeper than it is wide
 *
 * Per-type shadows are AR-032's job; one bucket per direction is what can be
 * done honestly with no art.
 */
export const SHADOW_SPECS = {
  ew: { key: "world-shadow-ew", width: 96, height: 26 },
  diag: { key: "world-shadow-diag", width: 78, height: 30 },
  ns: { key: "world-shadow-ns", width: 48, height: 34 },
} as const satisfies Record<string, ShadowSpec>;

export const ALL_SHADOW_SPECS: readonly ShadowSpec[] = Object.values(SHADOW_SPECS);

/** Which footprint a vehicle facing `dir` stands on. */
export function shadowSpecFor(dir: Direction): ShadowSpec {
  if (dir === "E" || dir === "W") return SHADOW_SPECS.ew;
  if (dir === "N" || dir === "S") return SHADOW_SPECS.ns;
  return SHADOW_SPECS.diag;
}

/** 4×4 Bayer matrix, the smallest ordered dither that reads as texture rather
 *  than as a pattern of stripes. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * RGBA bytes for one dithered contact shadow, row-major, `width * height * 4`.
 *
 * Density falls off as `1 - r²` from the centre of the ellipse, so the middle
 * is solid and the rim breaks up into single pixels. Every byte of alpha is 0
 * or 255 — a semi-opaque wash would be a soft shadow wearing a dither costume.
 */
export function shadowPixels(
  width: number,
  height: number,
  rgb: { r: number; g: number; b: number } = SHADOW_RGB,
): Uint8ClampedArray {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const out = new Uint8ClampedArray(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / cx;
      const ny = (y + 0.5 - cy) / cy;
      const r2 = nx * nx + ny * ny;
      const density = 1 - r2;
      const threshold = (BAYER[y % 4]![x % 4]! + 0.5) / 16;
      const on = r2 <= 1 && density > threshold;
      const i = (y * w + x) * 4;
      out[i] = rgb.r;
      out[i + 1] = rgb.g;
      out[i + 2] = rgb.b;
      out[i + 3] = on ? 255 : 0;
    }
  }
  return out;
}
