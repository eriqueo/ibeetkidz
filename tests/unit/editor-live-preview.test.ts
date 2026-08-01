import { describe, expect, it, vi } from "vitest";
import WORKSHOP from "../../src/assets/maps/workshop.json";
import { parseTiledLayer } from "../../src/game/TiledParser.ts";
import { openMap, moveObject, serializeMap, isDirty } from "../../src/editor/tiled-mutate.ts";

// ui-scene.ts's only runtime dependency is EventBus, whose real module imports
// Phaser. Same mock idiom as tiled-scene-adapter.test.ts.
vi.mock("../../src/game/EventBus.ts", () => ({ EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } }));

const { spawnUiLayer, relayoutUiLayer } = await import("../../src/game/ui-scene.ts");

// The scene editor's live preview is not a second renderer. It mutates the map
// JSON, re-parses, writes the fresh values ONTO the live spawn objects, and asks
// the scene to re-run its own layout. That works only because `UiElement.spawn`
// is the SAME OBJECT as the entry in the parsed spawn array — held by reference,
// not copied.
//
// Nothing in ui-scene.ts announces that contract, and a perfectly reasonable
// refactor (copying the spawn, or aligning by index) would break the editor
// silently: outlines would keep moving while the real sprites stopped. These
// tests make that refactor fail loudly instead.

/** Enough of a Phaser scene for spawnUiLayer to build against. */
function fakeScene(): { scene: unknown; images: { x: number; y: number }[] } {
  const images: { x: number; y: number }[] = [];
  const makeImage = () => {
    const img = {
      x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1,
      setOrigin: () => img, setDepth: () => img, setScale(sx: number, sy?: number) { img.scaleX = sx; img.scaleY = sy ?? sx; return img; },
      setPosition(x: number, y: number) { img.x = x; img.y = y; return img; },
      setCrop: () => img, setInteractive: () => img, setFrame: () => img, on: () => img,
    };
    images.push(img);
    return img;
  };
  const makeRect = () => {
    const r = {
      x: 0, y: 0, width: 0, height: 0,
      setDepth: () => r, setInteractive: () => r, setScale: () => r, on: () => r,
      setPosition(x: number, y: number) { r.x = x; r.y = y; return r; },
      setSize(w: number, h: number) { r.width = w; r.height = h; return r; },
    };
    return r;
  };
  const makeText = () => {
    const t = {
      x: 0, y: 0, width: 10,
      setOrigin: () => t, setDepth: () => t, setFontSize: () => t,
      setPosition(x: number, y: number) { t.x = x; t.y = y; return t; },
    };
    return t;
  };
  return {
    scene: {
      add: { image: makeImage, rectangle: makeRect, text: makeText },
      cameras: { main: { width: 1280, height: 720 } },
      tweens: { add: () => {} },
    },
    images,
  };
}

const BG = { x: 0, y: 0, width: 1280, height: 720 };

describe("live preview depends on spawn identity", () => {
  it("keeps the parsed spawn object BY REFERENCE in each UiElement", () => {
    const spawns = parseTiledLayer(WORKSHOP, "ui-layer");
    const { scene } = fakeScene();
    const elements = spawnUiLayer(scene as never, spawns, { bgRect: BG });

    expect(elements).toHaveLength(spawns.length);
    elements.forEach((el, i) => {
      // `toBe`, not `toEqual`: identity is the contract, equality is not enough.
      expect(el.spawn, `element ${i} copied its spawn instead of holding it`).toBe(spawns[i]);
    });
  });

  it("moves a sprite when the spawn object is mutated in place", () => {
    // Exactly what EditorOverlay.onDrag does, minus Phaser.
    const spawns = parseTiledLayer(WORKSHOP, "ui-layer");
    const { scene } = fakeScene();
    const elements = spawnUiLayer(scene as never, spawns, { bgRect: BG });

    const idx = spawns.findIndex((s) => s.sprite !== undefined);
    expect(idx).toBeGreaterThanOrEqual(0);
    const target = elements[idx]!;
    const before = { x: target.image?.x ?? target.hit?.x, y: target.image?.y ?? target.hit?.y };

    Object.assign(spawns[idx]!, { cx: 0.5, cy: 0.5 });
    relayoutUiLayer(elements, BG, { width: 1280, height: 720 });

    const after = { x: target.image?.x ?? target.hit?.x, y: target.image?.y ?? target.hit?.y };
    expect(after).not.toEqual(before);
  });
});

describe("map mutation is lossless", () => {
  it("serializes an untouched map byte-identically to the committed file", () => {
    // The committed maps were normalized to exactly this form so that a no-op
    // drag is a zero-line diff and `git diff` is a trustworthy session review.
    const edit = openMap("workshop", WORKSHOP);
    expect(isDirty(edit)).toBe(false);
    expect(serializeMap(edit.raw)).toBe(`${JSON.stringify(WORKSHOP, null, 2)}\n`);
  });

  it("changes ONLY the four rect fields of the object it moves", () => {
    const edit = openMap("workshop", WORKSHOP);
    const layer = (edit.raw.layers as unknown as { name?: string; objects?: { name?: string }[] }[]).find(
      (l) => l.name === "ui-layer",
    )!;
    const name = layer.objects![0]!.name!;
    const before = structuredClone(edit.raw);

    expect(moveObject(edit.raw, "ui-layer", name, { x: 11, y: 22, width: 33, height: 44 })).toBeNull();
    expect(isDirty(edit)).toBe(true);

    // Every other object, and every other layer, is untouched.
    const beforeLayers = before.layers as unknown as { name?: string; objects?: Record<string, unknown>[] }[];
    const afterLayers = edit.raw.layers as unknown as { name?: string; objects?: Record<string, unknown>[] }[];
    expect(afterLayers.length).toBe(beforeLayers.length);
    afterLayers.forEach((l, li) => {
      (l.objects ?? []).forEach((o, oi) => {
        const b = beforeLayers[li]!.objects![oi]!;
        if (l.name === "ui-layer" && oi === 0) {
          expect(o["x"]).toBe(11);
          expect(o["y"]).toBe(22);
          // Everything BUT the rect survived — id, name, type, properties.
          for (const k of Object.keys(b)) {
            if (!["x", "y", "width", "height"].includes(k)) expect(o[k]).toEqual(b[k]);
          }
        } else {
          expect(o).toEqual(b);
        }
      });
    });
  });

  it("refuses to move an object it cannot represent as a rect", () => {
    const edit = openMap("workshop", WORKSHOP);
    expect(moveObject(edit.raw, "no-layer", "x", { x: 0, y: 0, width: 1, height: 1 })).toBe("no-such-layer");
    expect(moveObject(edit.raw, "ui-layer", "nope", { x: 0, y: 0, width: 1, height: 1 })).toBe("no-such-object");

    // A gid object is BOTTOM-left anchored in TiledParser's `centrePx`, so a
    // top-left write would silently shift it by its own height.
    const layer = (edit.raw.layers as unknown as { name?: string; objects?: Record<string, unknown>[] }[]).find(
      (l) => l.name === "ui-layer",
    )!;
    layer.objects![0]!["gid"] = 7;
    const first = layer.objects![0]!["name"] as string;
    expect(moveObject(edit.raw, "ui-layer", first, { x: 0, y: 0, width: 1, height: 1 })).toBe("tile-anchored");
  });
});
