import { describe, expect, it } from "vitest";
import {
  UI_SPRITES,
  contentHitRect,
  hitRectContains,
  placeUiSprite,
  type UiSpriteDef,
  type PlacedRect,
} from "../../src/game/ui-sprites.ts";

// A minimal Phaser.Image stand-in: placeUiSprite only reads width/height and
// calls setScale/setPosition, so we record those without loading Phaser.
function makeImg(w: number, h: number): {
  width: number; height: number; scaleX: number; scaleY: number; x: number; y: number;
  crop: [number, number, number, number] | null;
  setScale: (sx: number, sy?: number) => unknown; setPosition: (x: number, y: number) => unknown;
  setCrop: (x: number, y: number, w: number, h: number) => unknown;
} {
  const img = {
    width: w, height: h, scaleX: 1, scaleY: 1, x: 0, y: 0,
    crop: null as [number, number, number, number] | null,
    setScale(sx: number, sy?: number) { img.scaleX = sx; img.scaleY = sy ?? sx; return img; },
    setPosition(x: number, y: number) { img.x = x; img.y = y; return img; },
    setCrop(x: number, y: number, cw: number, ch: number) { img.crop = [x, y, cw, ch]; return img; },
  };
  return img;
}

describe("UI_SPRITES manifest", () => {
  it("picks a valid base and names frames by the file-stem convention", () => {
    for (const [id, def] of Object.entries(UI_SPRITES)) {
      // the base is one of the declared states
      expect(Object.values(def.states), `${id} base`).toContain(def.base);
      // every frame name is non-empty (atlas frame = source file stem)
      for (const key of Object.values(def.states)) {
        expect(key.length, `${id}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("gives buttons idle+pressed, instruments passive/hover/active, panels one plate", () => {
    expect(Object.keys(UI_SPRITES["btn-transport-play"]!.states).sort()).toEqual(["idle", "pressed"]);
    expect(Object.keys(UI_SPRITES["inst-drums"]!.states).sort()).toEqual(["active", "hover", "passive"]);
    expect(UI_SPRITES["panel-header"]!.stretch).toBe(true);
    expect(UI_SPRITES["btn-transport-play"]!.stretch).toBe(false);
  });

  it("registers the authored Track tarp latch and speed readout vocabulary", () => {
    expect(UI_SPRITES["btn-track-tarp"]!.states).toEqual({
      idle: "btn-track-tarp-idle",
      seated: "btn-track-tarp-seated",
    });
    expect(UI_SPRITES["track-speed-readout"]!.states).toEqual({
      base: "track-speed-readout",
    });
  });
});

describe("placeUiSprite", () => {
  const target: PlacedRect = { x: 500, y: 300, width: 200, height: 100 };

  it("stretches a full-canvas panel to fill the target rect on both axes", () => {
    const def: UiSpriteDef = { states: {}, base: "p", content: [0, 0, 1, 1], stretch: true };
    const img = makeImg(2000, 400);
    placeUiSprite(img as never, def, target);
    expect(img.scaleX).toBeCloseTo(200 / 2000, 6);
    expect(img.scaleY).toBeCloseTo(100 / 400, 6);
    // content centre = canvas centre → sits exactly on the target centre.
    expect(img.x).toBeCloseTo(500, 6);
    expect(img.y).toBeCloseTo(300, 6);
  });

  it("scales a padded button uniformly (contain) and centres its content", () => {
    const def: UiSpriteDef = { states: {}, base: "b", content: [0.13, 0.13, 0.87, 0.87], stretch: false };
    const img = makeImg(1000, 1000);
    placeUiSprite(img as never, def, target);
    // content is 0.74*1000 = 740 px square; contain → fit the binding (height) axis.
    const scale = 100 / 740;
    expect(img.scaleX).toBeCloseTo(scale, 6);
    expect(img.scaleY).toBeCloseTo(scale, 6);
    // symmetric content box → centred on the target with no offset.
    expect(img.x).toBeCloseTo(500, 6);
    expect(img.y).toBeCloseTo(300, 6);
  });

  it("crops an opaque-padded canvas to its content box, leaving placement alone", () => {
    // Mirrors panel-yard-actions: an RGB strip whose margins are baked black.
    const def: UiSpriteDef = {
      states: {}, base: "p",
      content: [0.1, 0.25, 0.9, 0.75], stretch: true, crop: true,
    };
    const img = makeImg(1000, 500);
    placeUiSprite(img as never, def, target);
    // crop rect = content box in un-scaled texture px.
    expect(img.crop).toEqual([100, 125, 800, 250]);
    // stretch: content (800×250) fills the 200×100 target exactly.
    expect(img.scaleX).toBeCloseTo(200 / 800, 6);
    expect(img.scaleY).toBeCloseTo(100 / 250, 6);
    // content centre = canvas centre here → lands on the target centre.
    expect(img.x).toBeCloseTo(500, 6);
    expect(img.y).toBeCloseTo(300, 6);
  });

  it("never crops when the def doesn't ask for it", () => {
    const def: UiSpriteDef = { states: {}, base: "p", content: [0, 0, 1, 1], stretch: true };
    const img = makeImg(1000, 500);
    placeUiSprite(img as never, def, target);
    expect(img.crop).toBeNull();
  });

  it("offsets so an off-centre content box lands on the target centre", () => {
    // content sits in the lower portion of the canvas (like an instrument).
    const def: UiSpriteDef = { states: {}, base: "i", content: [0, 0.5, 1, 1], stretch: false };
    const img = makeImg(400, 400);
    placeUiSprite(img as never, def, target);
    const scale = Math.min(200 / 400, 100 / 200); // contain: min(0.5, 0.5) = 0.5
    // content centre y-frac = 0.75 → offset (0.75-0.5)*400*scale = 50 below canvas centre,
    // so the canvas is pushed UP by 50 to bring content centre onto target.y.
    expect(img.y).toBeCloseTo(300 - (0.75 - 0.5) * 400 * scale, 6);
    expect(img.x).toBeCloseTo(500, 6);
  });
});

// ── contentHitRect: the sequencer-grid regression ──────────────────────────
// Chrome sprites used to hit-test as their WHOLE frame. These canvases carry a
// lot of transparent padding — the Workshop instrument characters run to about
// 2x their content box — and chrome draws above the sequencer grid, so the
// padding was swallowing taps on the bottom lanes. Measured before the fix:
// inst-mic's input rect reached 98px into the grid slate, inst-guitar 83px,
// inst-violin 79px.

/** Where a sprite's hit rect actually lands on screen, once Phaser applies the
 *  game object's own transform. Mirrors `placeUiSprite` + a 0.5 origin. */
function worldHitRect(def: UiSpriteDef, texW: number, texH: number, target: PlacedRect): PlacedRect {
  const img = makeImg(texW, texH);
  placeUiSprite(img as never, def, target);
  const r = contentHitRect(def, texW, texH);
  return {
    x: img.x + (r.x - texW / 2) * img.scaleX,
    y: img.y + (r.y - texH / 2) * img.scaleY,
    width: r.width * img.scaleX,
    height: r.height * img.scaleY,
  };
}

/** The same, for Phaser's DEFAULT input rect — the whole frame. */
function worldFrameRect(def: UiSpriteDef, texW: number, texH: number, target: PlacedRect): PlacedRect {
  const img = makeImg(texW, texH);
  placeUiSprite(img as never, def, target);
  return {
    x: img.x - (texW / 2) * img.scaleX,
    y: img.y - (texH / 2) * img.scaleY,
    width: texW * img.scaleX,
    height: texH * img.scaleY,
  };
}

/** `placeUiSprite`'s target is CENTRE-based (it is what `placeSpawn` returns),
 *  while the world rects above are top-left. Convert before comparing. */
const boxOf = (target: PlacedRect): PlacedRect => ({
  x: target.x - target.width / 2,
  y: target.y - target.height / 2,
  width: target.width,
  height: target.height,
});

const contains = (outer: PlacedRect, inner: PlacedRect): boolean => {
  const o = boxOf(outer);
  return (
    inner.x >= o.x - 1e-6 &&
    inner.y >= o.y - 1e-6 &&
    inner.x + inner.width <= o.x + o.width + 1e-6 &&
    inner.y + inner.height <= o.y + o.height + 1e-6
  );
};

describe("contentHitRect", () => {
  it("maps the normalized content box onto texture pixels", () => {
    const def: UiSpriteDef = { states: {}, base: "b", content: [0.25, 0.5, 0.75, 1], stretch: false };
    expect(contentHitRect(def, 400, 200)).toEqual({ x: 100, y: 100, width: 200, height: 100 });
  });

  it("contains points inside the box and rejects the padding around it", () => {
    const def: UiSpriteDef = { states: {}, base: "b", content: [0.25, 0.5, 0.75, 1], stretch: false };
    const r = contentHitRect(def, 400, 200);
    expect(hitRectContains(r, 200, 150)).toBe(true); // centre of the art
    expect(hitRectContains(r, 50, 150)).toBe(false); // left padding
    expect(hitRectContains(r, 200, 50)).toBe(false); // top padding — the grid's side
    expect(hitRectContains(r, 100, 100)).toBe(true); // top-left corner is inclusive
    expect(hitRectContains(r, 300, 200)).toBe(false); // bottom-right is exclusive
  });

  it("never claims input outside the rect the map author drew", () => {
    // The invariant the fix exists to establish, over the REAL manifest. Note
    // the texture size cancels out of the math, so this holds at any resolution
    // — which is what makes a future atlas downscale safe.
    const target: PlacedRect = { x: 900, y: 640, width: 280, height: 300 };
    for (const [id, def] of Object.entries(UI_SPRITES)) {
      if (def.stretch) continue; // panels fill their zone by definition
      const hit = worldHitRect(def, 707, 660, target);
      expect(contains(target, hit), `${id} hit area escapes its Tiled rect`).toBe(true);
    }
  });

  it("is strictly tighter than the frame for every padded sprite", () => {
    // Proves these tests would fail against the old behaviour rather than
    // passing vacuously: the default frame rect DOES escape, and by a lot.
    const target: PlacedRect = { x: 900, y: 640, width: 280, height: 300 };
    const padded = Object.entries(UI_SPRITES).filter(
      ([, d]) => !d.stretch && (d.content[2] - d.content[0]) * (d.content[3] - d.content[1]) < 0.9,
    );
    expect(padded.length).toBeGreaterThan(0);
    for (const [id, def] of padded) {
      const frame = worldFrameRect(def, 707, 660, target);
      expect(contains(target, frame), `${id} frame unexpectedly fits`).toBe(false);
    }
  });

  it("keeps the target the size of the ART, so a bigger active frame is feedback not reach", () => {
    // hover/active variants draw larger inside the shared canvas. The hit stays
    // the base content box — matching what placeUiSprite positioned.
    const def: UiSpriteDef = { states: { passive: "p", active: "a" }, base: "p", content: [0.2, 0.2, 0.8, 0.8], stretch: false };
    const target: PlacedRect = { x: 500, y: 300, width: 120, height: 120 };
    const hit = worldHitRect(def, 500, 500, target);
    expect(hit.width).toBeCloseTo(120, 6);
    expect(hit.height).toBeCloseTo(120, 6);
    expect(hit.x).toBeCloseTo(500 - 60, 6);
  });
});
