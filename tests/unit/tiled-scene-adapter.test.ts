import { describe, expect, it, vi, beforeEach } from "vitest";
import WORKSHOP from "../../src/assets/maps/workshop.json";
import { parseTiledLayer, type TiledSpawn } from "../../src/game/TiledParser.ts";

// The adapter's only runtime dependency is EventBus, whose real module imports
// Phaser. Mock it so these tests stay Phaser-free and can assert emits.
const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));
vi.mock("../../src/game/EventBus.ts", () => ({ EventBus: { emit: emitSpy } }));

import {
  coverRect,
  placeSpawn,
  spawnTiledScene,
  relayoutSpawns,
  type Rect,
} from "../../src/game/TiledSceneAdapter.ts";

const spawns = parseTiledLayer(WORKSHOP, "ui-layer");

// ── A minimal Phaser-Scene stand-in that records what the adapter creates ────
interface Recorder {
  images: Array<Record<string, unknown>>;
  rects: Array<Record<string, unknown>>;
  tweens: Array<Record<string, unknown>>;
}
function makeScene(camW: number, camH: number): { scene: unknown; rec: Recorder } {
  const rec: Recorder = { images: [], rects: [], tweens: [] };

  const makeImage = (key: string): Record<string, unknown> => {
    const img: Record<string, unknown> = {
      key,
      width: 2560,
      height: 1440,
      x: 0,
      y: 0,
      displayW: 0,
      displayH: 0,
      depth: 0,
      setOrigin: () => img,
      setPosition: (x: number, y: number) => ((img.x = x), (img.y = y), img),
      setDisplaySize: (w: number, h: number) => ((img.displayW = w), (img.displayH = h), img),
      setDepth: (d: number) => ((img.depth = d), img),
    };
    return img;
  };

  const makeRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    alpha: number,
  ): Record<string, unknown> => {
    const handlers: Record<string, () => void> = {};
    const r: Record<string, unknown> = {
      x,
      y,
      width: w,
      height: h,
      fillColor: color,
      fillAlpha: alpha,
      depth: 0,
      scale: 1,
      interactive: false,
      handlers,
      setDepth: (d: number) => ((r.depth = d), r),
      setInteractive: () => ((r.interactive = true), r),
      on: (e: string, fn: () => void) => ((handlers[e] = fn), r),
      setScale: (s: number) => ((r.scale = s), r),
      setPosition: (px: number, py: number) => ((r.x = px), (r.y = py), r),
      setSize: (sw: number, sh: number) => ((r.width = sw), (r.height = sh), r),
    };
    return r;
  };

  const scene = {
    add: {
      image: (_x: number, _y: number, key: string) => {
        const i = makeImage(key);
        rec.images.push(i);
        return i;
      },
      rectangle: (x: number, y: number, w: number, h: number, c: number, a: number) => {
        const r = makeRect(x, y, w, h, c, a);
        rec.rects.push(r);
        return r;
      },
    },
    tweens: {
      add: (cfg: Record<string, unknown>) => {
        rec.tweens.push(cfg);
        return cfg;
      },
    },
    cameras: { main: { width: camW, height: camH } },
  };
  return { scene, rec };
}

function rectFor(rec: Recorder, id: string): Record<string, unknown> {
  const idx = spawns.findIndex((s) => s.id === id);
  const r = rec.rects[idx];
  if (!r) throw new Error(`no hit-area for "${id}"`);
  return r;
}
function fire(r: Record<string, unknown>, event: string): void {
  (r.handlers as Record<string, () => void>)[event]?.();
}

beforeEach(() => emitSpy.mockClear());

describe("coverRect", () => {
  it("scales to width when the camera is wider than the image", () => {
    expect(coverRect(100, 100, { width: 200, height: 100 })).toEqual({
      x: 0,
      y: -50,
      width: 200,
      height: 200,
    });
  });
});

describe("placeSpawn", () => {
  const bg = { x: 0, y: 0, width: 1000, height: 1000 };
  const cam = { width: 1000, height: 1000 };
  const spawn = (over: Partial<TiledSpawn>): TiledSpawn => ({
    id: "x",
    klass: "t",
    cx: 0.5,
    cy: 0.5,
    w: 0.1,
    h: 0.1,
    anchor: "bg",
    ...over,
  });
  const expectRect = (r: Rect, e: Rect): void => {
    expect(r.x).toBeCloseTo(e.x, 6);
    expect(r.y).toBeCloseTo(e.y, 6);
    expect(r.width).toBeCloseTo(e.width, 6);
    expect(r.height).toBeCloseTo(e.height, 6);
  };

  it("places bg-anchored spawns on the background rect", () => {
    expectRect(placeSpawn(spawn({ cx: 0.5, cy: 0.25, w: 0.1, h: 0.2 }), bg, cam), {
      x: 500,
      y: 250,
      width: 100,
      height: 200,
    });
  });

  it("pins ui-top-right spawns to the camera top-right edge", () => {
    expectRect(placeSpawn(spawn({ cx: 0.9, cy: 0.1, anchor: "ui-top-right" }), bg, cam), {
      x: 900, // 1000 - rightGap(50) - width/2(50)
      y: 100, // topGap(50) + height/2(50)
      width: 100,
      height: 100,
    });
  });

  it("pins ui-bottom-center spawns to the camera bottom centre", () => {
    expectRect(
      placeSpawn(spawn({ cx: 0.5, cy: 0.9, w: 0.2, h: 0.1, anchor: "ui-bottom-center" }), bg, cam),
      { x: 500, y: 900, width: 200, height: 100 },
    );
  });

  it("offsets ui-top-right and ui-bottom-center by bg.y when the bg is letterboxed (contain fit)", () => {
    // Simulate contain fit: 1280x1100 canvas, 2560x1440 art → scale=0.5, offY=190
    const letterboxBg = { x: 0, y: 190, width: 1280, height: 720 };
    const letterboxCam = { width: 1280, height: 1100 };
    // ui-top-right: Y must be bg.y + topGap + height/2, NOT just topGap + height/2
    const topRight = placeSpawn(
      spawn({ cx: 0.9, cy: 0.1, anchor: "ui-top-right" }),
      letterboxBg,
      letterboxCam,
    );
    // topGap = (0.1 - 0.05) * 720 = 36; height/2 = 36; bg.y = 190 → y = 190 + 36 + 36 = 262
    expect(topRight.y).toBeCloseTo(262, 0);
    // ui-bottom-center: Y must be bg.y + bg.height - bottomGap - height/2
    const bottomCenter = placeSpawn(
      spawn({ cx: 0.5, cy: 0.9, w: 0.2, h: 0.1, anchor: "ui-bottom-center" }),
      letterboxBg,
      letterboxCam,
    );
    // bottomGap = (1 - 0.95) * 720 = 36; height/2 = 36; bg.y+bg.height = 910 → y = 910 - 36 - 36 = 838
    expect(bottomCenter.y).toBeCloseTo(838, 0);
  });

  it("keeps a ui-top-right anchored control on-screen and distinct from bg placement", () => {
    const exit: TiledSpawn = {
      id: "exit", klass: "ui-button", cx: 0.94, cy: 0.09, w: 0.07, h: 0.1, anchor: "ui-top-right",
    };
    const cam800 = { width: 800, height: 600 };
    const bgRect = coverRect(2560, 1440, cam800);
    const anchored = placeSpawn(exit, bgRect, cam800);
    const asBg = placeSpawn({ ...exit, anchor: "bg" }, bgRect, cam800);
    expect(anchored.x).not.toBeCloseTo(asBg.x, 0);
    expect(anchored.x).toBeLessThan(800);
    expect(anchored.x).toBeGreaterThan(0);
  });
});

describe("spawnTiledScene", () => {
  it("creates one cover-fit base-plate background", () => {
    const { scene, rec } = makeScene(2560, 1440);
    const res = spawnTiledScene(scene as never, spawns, { baseKey: "workshop-base" });
    expect(rec.images).toHaveLength(1);
    expect(rec.images[0]?.key).toBe("workshop-base");
    expect(rec.images[0]?.displayW).toBe(2560);
    expect(res.background).toBe(rec.images[0]);
  });

  it("creates one transparent (alpha 0) hit-area per spawn", () => {
    const { scene, rec } = makeScene(2560, 1440);
    const res = spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    expect(rec.rects).toHaveLength(spawns.length);
    expect(res.hits).toHaveLength(spawns.length);
    for (const r of rec.rects) {
      expect(r.fillAlpha).toBe(0);
      expect(r.fillColor).toBe(0xffffff);
    }
  });

  it("makes action-bearing spawns interactive and leaves the panels + LCD inert", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    const interactive = rec.rects.filter((r) => r.interactive).length;
    expect(interactive).toBe(spawns.filter((s) => s.action !== undefined).length);
    // 18 spawns; the 2 panels, transport LCD, and car-anchor have no action.
    expect(interactive).toBe(14);
    expect(rectFor(rec, "lcd-transport").interactive).toBe(false);
  });

  it("runs the press tween (0.94 → 1.0, 80ms) on pointerdown", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    const play = rectFor(rec, "btn-play");
    fire(play, "pointerdown");
    expect(play.scale).toBe(0.94);
    expect(rec.tweens).toContainEqual(
      expect.objectContaining({ targets: play, scale: 1, duration: 80 }),
    );
  });

  it("emits action + arg on pointerup and restores scale", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    const play = rectFor(rec, "btn-play");
    fire(play, "pointerdown");
    fire(play, "pointerup");
    expect(emitSpy).toHaveBeenCalledWith("transport-play", "loop");
    expect(play.scale).toBe(1);
  });

  it("emits numeric args as numbers", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    const down = rectFor(rec, "btn-tempo-down");
    fire(down, "pointerdown");
    fire(down, "pointerup");
    expect(emitSpy).toHaveBeenCalledWith("tempo-changed", -20);
  });

  it("emits no-arg actions with a single argument only", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    const stop = rectFor(rec, "btn-stop");
    fire(stop, "pointerdown");
    fire(stop, "pointerup");
    expect(emitSpy).toHaveBeenCalledWith("transport-stop");
    const call = emitSpy.mock.calls.find((c) => c[0] === "transport-stop");
    expect(call).toEqual(["transport-stop"]);
  });

  it("ignores a release whose press did not start on the hit (no click-through)", () => {
    // Phaser delivers pointerup to whatever is under the pointer at release —
    // when a modal hides itself on pointerdown, the release lands on the
    // chrome underneath. An un-armed release must not emit.
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    fire(rectFor(rec, "btn-stop"), "pointerup");
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("disarms when the pointer leaves mid-press (drag off = cancel)", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    const stop = rectFor(rec, "btn-stop");
    fire(stop, "pointerdown");
    fire(stop, "pointerout");
    fire(stop, "pointerup");
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("does not emit for the inert LCD (no handlers wired)", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { baseKey: "b" });
    expect((rectFor(rec, "lcd-transport").handlers as Record<string, unknown>)["pointerup"]).toBeUndefined();
  });
});

describe("scene-owned background (bgRect, no baseKey)", () => {
  const bg: Rect = { x: 0, y: 0, width: 2560, height: 1440 };

  it("creates hit-areas only — no second background image", () => {
    const { scene, rec } = makeScene(2560, 1440);
    const res = spawnTiledScene(scene as never, spawns, { bgRect: bg });
    expect(rec.images).toHaveLength(0);
    expect(res.background).toBeUndefined();
    expect(res.hits).toHaveLength(spawns.length);
  });

  it("anchors hit-areas to the supplied bgRect (same math as placeSpawn)", () => {
    const { scene, rec } = makeScene(2560, 1440);
    spawnTiledScene(scene as never, spawns, { bgRect: bg });
    const play = rectFor(rec, "btn-play");
    const expected = placeSpawn(spawns[spawns.findIndex((s) => s.id === "btn-play")]!, bg, {
      width: 2560,
      height: 1440,
    });
    expect(play.x).toBeCloseTo(expected.x, 6);
    expect(play.y).toBeCloseTo(expected.y, 6);
  });

  it("throws when neither baseKey nor bgRect is given", () => {
    const { scene } = makeScene(2560, 1440);
    expect(() => spawnTiledScene(scene as never, spawns, {})).toThrow(/baseKey.*bgRect/);
  });
});

describe("relayoutSpawns", () => {
  it("re-places every hit-area against a fresh background rect", () => {
    const { scene, rec } = makeScene(2560, 1440);
    const startBg: Rect = { x: 0, y: 0, width: 2560, height: 1440 };
    const res = spawnTiledScene(scene as never, spawns, { bgRect: startBg });

    // A new viewport: smaller, cover-fit shifts the bg origin (cropped axis).
    const newCam = { width: 800, height: 600 };
    const newBg = coverRect(2560, 1440, newCam);
    relayoutSpawns(res.hits as never, spawns, newBg, newCam);

    // Each hit now matches a fresh placeSpawn against the new rect/cam.
    spawns.forEach((s, i) => {
      const expected = placeSpawn(s, newBg, newCam);
      const r = rec.rects[i] as Record<string, number>;
      expect(r.x).toBeCloseTo(expected.x, 6);
      expect(r.y).toBeCloseTo(expected.y, 6);
      expect(r.width).toBeCloseTo(expected.width, 6);
      expect(r.height).toBeCloseTo(expected.height, 6);
    });
  });
});
