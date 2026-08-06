// The interim contact shadow's pixels (`src/game/pixel-shadow.ts`).
//
// `design/GAME_FEEL.md` Law 2: nothing in this project had a contact shadow, so
// every vehicle floated. AR-032 has proper per-type palette shadows on order;
// this is the honest interim, and the thing that makes it honest rather than a
// smudge is that it is DITHERED and hard-edged — every pixel fully on or fully
// off — the way the plate shades its own ground. A soft alpha blob under
// hard-edged 16-colour art is the "pasted on" look being fixed.

import { describe, expect, it } from "vitest";
import {
  shadowPixels,
  shadowSpecFor,
  ALL_SHADOW_SPECS,
  SHADOW_ALPHA,
  SHADOW_RGB,
  SHADOW_SPECS,
} from "../../src/game/pixel-shadow.ts";

const alphaAt = (px: Uint8ClampedArray, w: number, x: number, y: number): number =>
  px[(y * w + x) * 4 + 3]!;

describe("shadowPixels", () => {
  const W = 96;
  const H = 26;
  const px = shadowPixels(W, H);

  it("fills exactly width × height × 4 bytes", () => {
    expect(px.length).toBe(W * H * 4);
  });

  it("is hard-edged: every pixel is fully opaque or fully transparent", () => {
    for (let i = 3; i < px.length; i += 4) {
      expect(px[i] === 0 || px[i] === 255).toBe(true);
    }
  });

  it("paints one colour, so it reads as the plate's own shade", () => {
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      expect([px[i], px[i + 1], px[i + 2]]).toEqual([SHADOW_RGB.r, SHADOW_RGB.g, SHADOW_RGB.b]);
    }
  });

  it("is solid in the middle and empty in the corners", () => {
    expect(alphaAt(px, W, W >> 1, H >> 1)).toBe(255);
    for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) {
      expect(alphaAt(px, W, x!, y!)).toBe(0);
    }
  });

  it("thins out toward the rim rather than stopping at a hard oval edge", () => {
    const band = (from: number, to: number): number => {
      let on = 0;
      let seen = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const nx = (x + 0.5 - W / 2) / (W / 2);
          const ny = (y + 0.5 - H / 2) / (H / 2);
          const r = Math.hypot(nx, ny);
          if (r < from || r >= to) continue;
          seen++;
          if (alphaAt(px, W, x, y) > 0) on++;
        }
      }
      return seen ? on / seen : 0;
    };
    expect(band(0, 0.35)).toBeGreaterThan(0.9);
    expect(band(0.35, 0.7)).toBeGreaterThan(0.35);
    expect(band(0.7, 1)).toBeLessThan(band(0.35, 0.7));
    expect(band(1.05, 2)).toBe(0); // nothing outside the ellipse at all
  });

  it("covers roughly half the ellipse — a shadow, not a black hole", () => {
    let on = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] === 255) on++;
    const ellipseArea = (Math.PI / 4) * W * H;
    expect(on / ellipseArea).toBeGreaterThan(0.35);
    expect(on / ellipseArea).toBeLessThan(0.7);
  });

  it("survives degenerate sizes", () => {
    expect(shadowPixels(0, 0).length).toBe(4);
    expect(shadowPixels(-5, 3.7).length).toBeGreaterThan(0);
  });
});

describe("shadow specs", () => {
  it("gives a vehicle a footprint per direction bucket", () => {
    expect(shadowSpecFor("E")).toBe(SHADOW_SPECS.ew);
    expect(shadowSpecFor("W")).toBe(SHADOW_SPECS.ew);
    expect(shadowSpecFor("N")).toBe(SHADOW_SPECS.ns);
    expect(shadowSpecFor("S")).toBe(SHADOW_SPECS.ns);
    for (const d of ["NE", "NW", "SE", "SW"] as const) {
      expect(shadowSpecFor(d)).toBe(SHADOW_SPECS.diag);
    }
  });

  it("is wider along the rails than across them", () => {
    expect(SHADOW_SPECS.ew.width).toBeGreaterThan(SHADOW_SPECS.ns.width);
    expect(SHADOW_SPECS.ns.height).toBeGreaterThan(SHADOW_SPECS.ew.height);
  });

  it("has unique texture keys and real sizes", () => {
    const keys = new Set(ALL_SHADOW_SPECS.map((s) => s.key));
    expect(keys.size).toBe(ALL_SHADOW_SPECS.length);
    for (const s of ALL_SHADOW_SPECS) {
      expect(s.width).toBeGreaterThan(8);
      expect(s.height).toBeGreaterThan(8);
    }
  });

  it("stays understated — this is an interim, not a spotlight", () => {
    expect(SHADOW_ALPHA).toBeGreaterThan(0.2);
    expect(SHADOW_ALPHA).toBeLessThan(0.6);
  });
});
