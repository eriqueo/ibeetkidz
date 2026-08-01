import { describe, expect, it, vi } from "vitest";

// TiledSceneAdapter's only runtime dependency is EventBus, whose real module
// imports Phaser. Mock it so these tests stay Phaser-free — same idiom as
// tiled-scene-adapter.test.ts.
vi.mock("../../src/game/EventBus.ts", () => ({ EventBus: { emit: vi.fn() } }));

const { placeSpawn } = await import("../../src/game/TiledSceneAdapter.ts");
import type { Rect, CameraSize } from "../../src/game/TiledSceneAdapter.ts";
import { invertPlaceSpawn, normToTiledRect, roundRect } from "../../src/editor/inverse.ts";
import type { TiledSpawn } from "../../src/game/TiledParser.ts";

// The scene editor turns a drag into map-file coordinates by inverting
// `placeSpawn`. That inverse is only trustworthy if it round-trips, so these
// tests drive the REAL forward function and require the inverse to recover the
// input exactly — for every anchor, and for background rects that are cropped
// (cover) as well as letterboxed (contain).

const ANCHORS = ["bg", "ui-top-right", "ui-bottom-center"] as const;

function spawn(anchor: TiledSpawn["anchor"], box: { cx: number; cy: number; w: number; h: number }): TiledSpawn {
  return { id: "x", klass: "ui-button", anchor, ...box };
}

// A letterboxed (contain) background: margins on both axes, positive origin.
const CONTAIN: Rect = { x: 40, y: 90, width: 1200, height: 675 };
// A cropped (cover) background: the classic negative-origin case.
const COVER: Rect = { x: -160, y: -45, width: 1600, height: 810 };
const CAM: CameraSize = { width: 1280, height: 720 };

describe("invertPlaceSpawn", () => {
  const boxes = [
    { cx: 0.5, cy: 0.5, w: 0.2, h: 0.1 },
    { cx: 0.08, cy: 0.93, w: 0.14, h: 0.06 },
    { cx: 0.87, cy: 0.12, w: 0.3, h: 0.22 },
    { cx: 0.5, cy: 0.0, w: 0.05, h: 0.05 },
    { cx: 1.0, cy: 1.0, w: 0.1, h: 0.1 },
  ];

  for (const bgName of ["contain", "cover"] as const) {
    const bg = bgName === "contain" ? CONTAIN : COVER;
    for (const anchor of ANCHORS) {
      it(`round-trips ${anchor} against a ${bgName} background`, () => {
        for (const box of boxes) {
          const placed = placeSpawn(spawn(anchor, box), bg, CAM);
          const back = invertPlaceSpawn(anchor, placed, bg, CAM);
          expect(back.cx).toBeCloseTo(box.cx, 10);
          expect(back.cy).toBeCloseTo(box.cy, 10);
          expect(back.w).toBeCloseTo(box.w, 10);
          expect(back.h).toBeCloseTo(box.h, 10);
        }
      });
    }
  }

  it("recovers a MOVED rect, not just an unmoved one", () => {
    // The actual editor gesture: take where the sprite is, shift it, invert.
    const original = { cx: 0.3, cy: 0.4, w: 0.2, h: 0.15 };
    const placed = placeSpawn(spawn("bg", original), CONTAIN, CAM);
    const dragged: Rect = { ...placed, x: placed.x + 120, y: placed.y - 45 };
    const back = invertPlaceSpawn("bg", dragged, CONTAIN, CAM);
    expect(back.cx).toBeCloseTo(original.cx + 120 / CONTAIN.width, 10);
    expect(back.cy).toBeCloseTo(original.cy - 45 / CONTAIN.height, 10);
    // Dragging must not resize.
    expect(back.w).toBeCloseTo(original.w, 10);
    expect(back.h).toBeCloseTo(original.h, 10);
  });

  it("agrees with `bg` on the x axis for ui-bottom-center", () => {
    // Not an accident worth relying on silently: at bg.x offsets the two
    // formulas reduce to the same expression, which is why a bottom-centre
    // element drags horizontally exactly like a bg-anchored one.
    const placed: Rect = { x: 700, y: 600, width: 200, height: 80 };
    expect(invertPlaceSpawn("ui-bottom-center", placed, CONTAIN, CAM).cx).toBeCloseTo(
      invertPlaceSpawn("bg", placed, CONTAIN, CAM).cx,
      10,
    );
  });
});

describe("normToTiledRect", () => {
  it("converts a normalized centre back to a top-left Tiled rect", () => {
    const r = normToTiledRect({ cx: 0.5, cy: 0.25, w: 0.1, h: 0.2 }, 2560, 1440);
    expect(r).toEqual({ x: 1280 - 128, y: 360 - 144, width: 256, height: 288 });
  });

  it("round-trips through TiledParser's own centre convention", () => {
    // `centrePx` for a plain rect object is (x + width/2, y + height/2); this is
    // the exact inverse, so a parse-then-write cycle is lossless.
    const box = { cx: 0.371, cy: 0.628, w: 0.153, h: 0.094 };
    const r = normToTiledRect(box, 2560, 1440);
    expect((r.x + r.width / 2) / 2560).toBeCloseTo(box.cx, 12);
    expect((r.y + r.height / 2) / 1440).toBeCloseTo(box.cy, 12);
  });
});

describe("roundRect", () => {
  it("keeps two decimals so a no-op drag is a no-op diff", () => {
    expect(roundRect({ x: 100.00000000001, y: 3.14159, width: 20.005, height: 7 })).toEqual({
      x: 100,
      y: 3.14,
      width: 20.01,
      height: 7,
    });
  });
});
