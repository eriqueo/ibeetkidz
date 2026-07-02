// Phaser-side adapter for the data-driven layout. Given the normalized
// `TiledSpawn[]` from TiledParser and a Phaser Scene, it builds the scene's
// interactive layer: a base-plate background Image, plus one transparent
// Rectangle hit-area per spawn that animates on press and emits the spawn's
// EventBus action on release.
//
// The pure placement math (`placeSpawn`) lives here as an exported function so it
// is unit-testable without Phaser; the only runtime dependency is EventBus (the
// hexagonal boundary). Phaser itself is imported type-only — every Phaser object
// is created through the passed `scene`, so this module never loads the Phaser
// engine on its own. Wired into WorkshopScene (Phase B): the scene owns its clean
// background and passes its `bgRect`, so the adapter spawns hit-areas only and
// `relayoutSpawns` re-anchors them on every viewport resize.
import type Phaser from "phaser";
import { EventBus } from "./EventBus.ts";
import type { TiledSpawn } from "./TiledParser.ts";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraSize {
  width: number;
  height: number;
}

const PRESS_SCALE = 0.94;
const PRESS_MS = 80;

/** Cover-fit a `imgW×imgH` image into the camera; returns the displayed rect
 *  (top-left x/y may be negative on the cropped axis). Mirrors the scenes'
 *  `addBackground("cover")` so bg-anchored spawns land on the painted art. */
export function coverRect(imgW: number, imgH: number, cam: CameraSize): Rect {
  const scale = Math.max(cam.width / imgW, cam.height / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (cam.width - width) / 2, y: (cam.height - height) / 2, width, height };
}

/**
 * Resolve a spawn's centre position + size in screen pixels.
 *
 * - `bg` (default): positioned on the cover-fit background image, so it tracks
 *   the painted art (and crops with it).
 * - `ui-top-right` / `ui-bottom-center`: positioned relative to the CAMERA so the
 *   element can never be cropped on off-16:9 viewports — keeping the same art
 *   scale (sized off the background rect) and the same corner gap it has in the
 *   source image, but pinned to the camera edge.
 *
 * Returns the rect CENTRE (x,y) + size, matching Phaser's default 0.5 origin.
 */
export function placeSpawn(s: TiledSpawn, bg: Rect, cam: CameraSize): Rect {
  const width = s.w * bg.width;
  const height = s.h * bg.height;

  if (s.anchor === "ui-top-right") {
    // X: pin to the camera right edge so the button never scrolls off-screen.
    // Y: offset by bg.y so the hit area tracks the painted art when the bg is
    //    letterboxed (contain fit adds a vertical margin; cover fit has bg.y ≤ 0).
    const rightGap = (1 - (s.cx + s.w / 2)) * bg.width;
    const topGap = (s.cy - s.h / 2) * bg.height;
    return { x: cam.width - rightGap - width / 2, y: bg.y + topGap + height / 2, width, height };
  }
  if (s.anchor === "ui-bottom-center") {
    // X: offset by bg.x so the button tracks the painted art horizontally.
    // Y: offset by bg.y so the hit area tracks the painted art when the bg is
    //    letterboxed (contain fit adds a vertical margin; cover fit has bg.y ≤ 0).
    const bottomGap = (1 - (s.cy + s.h / 2)) * bg.height;
    return {
      x: bg.x + bg.width / 2 + (s.cx - 0.5) * bg.width,
      y: bg.y + bg.height - bottomGap - height / 2,
      width,
      height,
    };
  }
  // anchor === "bg"
  return { x: bg.x + s.cx * bg.width, y: bg.y + s.cy * bg.height, width, height };
}

export interface SpawnSceneOptions {
  /** Texture key of the base-plate image. The adapter cover-fits it and anchors
   *  the spawns to it. Omit it to let the SCENE own the background (e.g. a
   *  `BackgroundScene.addBackground` clean bg) and pass `bgRect` instead — the
   *  adapter then spawns hit-areas only, with no second background image. */
  baseKey?: string;
  /** Pre-computed background rect to anchor spawns against. Required when
   *  `baseKey` is omitted; ignored when `baseKey` is given. */
  bgRect?: Rect;
  /** Depth of the background (default 0) and of the hit-areas (default 10). */
  bgDepth?: number;
  hitDepth?: number;
}

export interface AdapterResult {
  /** The created base-plate image, or `undefined` when the scene owns the bg. */
  background?: Phaser.GameObjects.Image;
  /** One hit-area per spawn, in spawn order. */
  hits: Phaser.GameObjects.Rectangle[];
}

// Emit through the typed bus with a runtime-supplied action string. The
// action/arg pairing is data-authored (validated for shape by TiledParser, not
// for type against EventMap), so we cast at this single boundary.
const emit = EventBus.emit.bind(EventBus) as (event: string, ...args: unknown[]) => boolean;

/**
 * Build the interactive layer for a scene from parsed spawns:
 *  1. a cover-fit base-plate background Image,
 *  2. a transparent (alpha 0) Rectangle hit-area per spawn,
 *  3. a press tween (scale 0.94 → 1.0 over 80ms) on pointerdown,
 *  4. an EventBus emit of `action(arg?)` on pointerup.
 * Spawns without an `action` (e.g. the TEMPO LCD) get a positioned, inert rect.
 */
export function spawnTiledScene(
  scene: Phaser.Scene,
  spawns: readonly TiledSpawn[],
  opts: SpawnSceneOptions,
): AdapterResult {
  const cam = scene.cameras.main;
  const camSize: CameraSize = { width: cam.width, height: cam.height };

  // Two modes:
  //  - `baseKey`: the adapter cover-fits its own base-plate image and anchors to it.
  //  - `bgRect` : the SCENE owns the background; the adapter draws hit-areas only,
  //               anchored to the supplied rect (no second background image).
  let background: Phaser.GameObjects.Image | undefined;
  let rect: Rect;
  if (opts.baseKey !== undefined) {
    background = scene.add.image(0, 0, opts.baseKey).setOrigin(0.5);
    rect = coverRect(background.width, background.height, camSize);
    background
      .setPosition(camSize.width / 2, camSize.height / 2)
      .setDisplaySize(rect.width, rect.height)
      .setDepth(opts.bgDepth ?? 0);
  } else if (opts.bgRect !== undefined) {
    rect = opts.bgRect;
  } else {
    throw new Error("spawnTiledScene requires either `baseKey` or `bgRect`");
  }

  const hitDepth = opts.hitDepth ?? 10;
  const hits = spawns.map((s) => {
    const p = placeSpawn(s, rect, camSize);
    const hit = scene.add
      .rectangle(p.x, p.y, p.width, p.height, 0xffffff, 0)
      .setDepth(hitDepth);

    const action = s.action;
    if (action !== undefined) {
      const arg = s.arg;
      // Arm on our own pointerdown and fire only an armed release — Phaser
      // delivers pointerup to whatever is under the pointer, so an overlay
      // that hides mid-gesture must not leak its release into this hit.
      let armed = false;
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        armed = true;
        hit.setScale(PRESS_SCALE);
        scene.tweens.add({ targets: hit, scale: 1, duration: PRESS_MS });
      });
      const restore = (): void => {
        hit.setScale(1);
      };
      hit.on("pointerup", () => {
        restore();
        if (!armed) return;
        armed = false;
        if (arg !== undefined) emit(action, arg);
        else emit(action);
      });
      hit.on("pointerout", () => {
        armed = false;
        restore();
      });
    }
    return hit;
  });

  // exactOptionalPropertyTypes: only attach `background` when one was created.
  return background !== undefined ? { background, hits } : { hits };
}

/**
 * Reposition + resize already-spawned hit-areas against a fresh background rect.
 *
 * `spawnTiledScene` places hit-areas ONCE (using the camera at create time); a
 * scene whose background refits on resize must call this to keep the hit-areas
 * registered to the painted art. It re-runs the same pure `placeSpawn` math per
 * spawn — so the resized positions are identical to a fresh spawn. `hits` and
 * `spawns` are index-aligned (the order `spawnTiledScene` returned them in).
 */
export function relayoutSpawns(
  hits: readonly Phaser.GameObjects.Rectangle[],
  spawns: readonly TiledSpawn[],
  bg: Rect,
  cam: CameraSize,
): void {
  hits.forEach((hit, i) => {
    const s = spawns[i];
    if (!s) return;
    const p = placeSpawn(s, bg, cam);
    hit.setPosition(p.x, p.y).setSize(p.width, p.height);
  });
}
