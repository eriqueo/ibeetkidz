import { describe, expect, it } from "vitest";
import { UI_SPRITES, placeUiSprite, type UiSpriteDef, type PlacedRect } from "../../src/game/ui-sprites.ts";

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
  it("keys every state to a loaded texture and picks a valid base", () => {
    for (const [id, def] of Object.entries(UI_SPRITES)) {
      // the base is one of the declared states
      expect(Object.values(def.states), `${id} base`).toContain(def.base);
      // every state maps to a registered texture entry
      for (const key of Object.values(def.states)) {
        expect(def.textures[key], `${id}.${key}`).toBeTypeOf("string");
      }
    }
  });

  it("gives buttons idle+pressed, instruments passive/hover/active, panels one plate", () => {
    expect(Object.keys(UI_SPRITES["btn-transport-play"]!.states).sort()).toEqual(["idle", "pressed"]);
    expect(Object.keys(UI_SPRITES["inst-drums"]!.states).sort()).toEqual(["active", "hover", "passive"]);
    expect(UI_SPRITES["panel-header"]!.stretch).toBe(true);
    expect(UI_SPRITES["btn-transport-play"]!.stretch).toBe(false);
  });
});

describe("placeUiSprite", () => {
  const target: PlacedRect = { x: 500, y: 300, width: 200, height: 100 };

  it("stretches a full-canvas panel to fill the target rect on both axes", () => {
    const def: UiSpriteDef = { textures: {}, states: {}, base: "p", content: [0, 0, 1, 1], stretch: true };
    const img = makeImg(2000, 400);
    placeUiSprite(img as never, def, target);
    expect(img.scaleX).toBeCloseTo(200 / 2000, 6);
    expect(img.scaleY).toBeCloseTo(100 / 400, 6);
    // content centre = canvas centre → sits exactly on the target centre.
    expect(img.x).toBeCloseTo(500, 6);
    expect(img.y).toBeCloseTo(300, 6);
  });

  it("scales a padded button uniformly (contain) and centres its content", () => {
    const def: UiSpriteDef = { textures: {}, states: {}, base: "b", content: [0.13, 0.13, 0.87, 0.87], stretch: false };
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
      textures: {}, states: {}, base: "p",
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
    const def: UiSpriteDef = { textures: {}, states: {}, base: "p", content: [0, 0, 1, 1], stretch: true };
    const img = makeImg(1000, 500);
    placeUiSprite(img as never, def, target);
    expect(img.crop).toBeNull();
  });

  it("offsets so an off-centre content box lands on the target centre", () => {
    // content sits in the lower portion of the canvas (like an instrument).
    const def: UiSpriteDef = { textures: {}, states: {}, base: "i", content: [0, 0.5, 1, 1], stretch: false };
    const img = makeImg(400, 400);
    placeUiSprite(img as never, def, target);
    const scale = Math.min(200 / 400, 100 / 200); // contain: min(0.5, 0.5) = 0.5
    // content centre y-frac = 0.75 → offset (0.75-0.5)*400*scale = 50 below canvas centre,
    // so the canvas is pushed UP by 50 to bring content centre onto target.y.
    expect(img.y).toBeCloseTo(300 - (0.75 - 0.5) * 400 * scale, 6);
    expect(img.x).toBeCloseTo(500, 6);
  });
});
