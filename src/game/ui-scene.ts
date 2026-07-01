// Generic Three-Zone UI layer: spawn a scene's static chrome from parsed Tiled
// data as REAL sprites (panels + buttons + instruments), driven purely by each
// object's `type`/`sprite`. This is the "generic interpreter" the refactor asks
// for — a scene calls `spawnUiLayer` in `create()` and `relayoutUiLayer` on
// resize, and owns none of the placement or press/hover/active wiring itself.
//
// Behaviour by Tiled `type`:
//   - "panel"      → a static plate sprite (non-interactive), placed under the buttons.
//   - "ui-button"  → idle texture; swaps to `-pressed` on pointerdown, back on
//                    up/out; emits `action(arg?)` on pointerup.
//   - "instrument" → passive texture; `-hover` on pointerover, `-active` on
//                    pointerdown; emits `action(arg?)` on pointerup.
//   - anything else (or a spawn with no `sprite`/manifest entry) → a transparent
//     hit-area (the legacy behaviour), so art-less controls still work.
//
// Placement reuses the pure `placeSpawn` math (safe-zone anchors) from the
// adapter; sprites are then content-fitted via `placeUiSprite`. EventBus is the
// only runtime dependency (the hexagonal boundary).
import type Phaser from "phaser";
import { EventBus } from "./EventBus.ts";
import type { TiledSpawn } from "./TiledParser.ts";
import { placeSpawn, type Rect, type CameraSize } from "./TiledSceneAdapter.ts";
import { UI_SPRITES, placeUiSprite, type UiSpriteDef } from "./ui-sprites.ts";

const PRESS_SCALE = 0.94;
const PRESS_MS = 80;

/** One spawned chrome element, kept index-aligned with its spawn for relayout. */
export interface UiElement {
  readonly spawn: TiledSpawn;
  /** The placed art sprite, when the spawn resolved to a UI_SPRITES def. */
  readonly image?: Phaser.GameObjects.Image;
  /** The transparent fallback hit-area, when the spawn had no art. */
  readonly hit?: Phaser.GameObjects.Rectangle;
  readonly def?: UiSpriteDef;
}

export interface UiLayerOptions {
  /** Background rect the spawns anchor to (the scene owns its own background). */
  readonly bgRect: Rect;
  /** Depth of panel plates (default 1) and of buttons/instruments (default 10). */
  readonly panelDepth?: number;
  readonly hitDepth?: number;
}

// Emit through the typed bus with a runtime-supplied action string (validated for
// shape by TiledParser, not against EventMap) — cast at this single boundary.
const emit = EventBus.emit.bind(EventBus) as (event: string, ...args: unknown[]) => boolean;

function fire(spawn: TiledSpawn): void {
  if (spawn.action === undefined) return;
  if (spawn.arg !== undefined) emit(spawn.action, spawn.arg);
  else emit(spawn.action);
}

function defFor(spawn: TiledSpawn): UiSpriteDef | undefined {
  const key = spawn.sprite ?? spawn.id;
  return UI_SPRITES[key];
}

/** Wire a button sprite: idle ⇄ pressed, emit action on release. */
function wireButton(scene: Phaser.Scene, img: Phaser.GameObjects.Image, def: UiSpriteDef, spawn: TiledSpawn): void {
  const idle = def.states["idle"] ?? def.base;
  const pressed = def.states["pressed"];
  img.setInteractive({ useHandCursor: true });
  const down = (): void => {
    if (pressed) img.setTexture(pressed);
    else {
      // No pressed art (e.g. some car buttons): fall back to a scale pop.
      img.setScale(img.scaleX * PRESS_SCALE, img.scaleY * PRESS_SCALE);
      scene.tweens.add({ targets: img, scaleX: img.scaleX / PRESS_SCALE, scaleY: img.scaleY / PRESS_SCALE, duration: PRESS_MS });
    }
  };
  const restore = (): void => { if (pressed) img.setTexture(idle); };
  img.on("pointerdown", down);
  img.on("pointerup", () => { restore(); fire(spawn); });
  img.on("pointerout", restore);
}

/** Wire an instrument sprite: passive → hover → active, emit action on release. */
function wireInstrument(img: Phaser.GameObjects.Image, def: UiSpriteDef, spawn: TiledSpawn): void {
  const passive = def.states["passive"] ?? def.base;
  const hover = def.states["hover"] ?? passive;
  const active = def.states["active"] ?? passive;
  img.setInteractive({ useHandCursor: true });
  img.on("pointerover", () => img.setTexture(hover));
  img.on("pointerout", () => img.setTexture(passive));
  img.on("pointerdown", () => img.setTexture(active));
  img.on("pointerup", () => { img.setTexture(hover); fire(spawn); });
}

/** Build a transparent hit-area for an art-less spawn (legacy behaviour). */
function makeHit(scene: Phaser.Scene, spawn: TiledSpawn, rect: Rect, cam: CameraSize, depth: number): Phaser.GameObjects.Rectangle {
  const p = placeSpawn(spawn, rect, cam);
  const hit = scene.add.rectangle(p.x, p.y, p.width, p.height, 0xffffff, 0).setDepth(depth);
  if (spawn.action !== undefined) {
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      hit.setScale(PRESS_SCALE);
      scene.tweens.add({ targets: hit, scale: 1, duration: PRESS_MS });
    });
    const restore = (): void => { hit.setScale(1); };
    hit.on("pointerup", () => { restore(); fire(spawn); });
    hit.on("pointerout", restore);
  }
  return hit;
}

/**
 * Spawn the full chrome layer for a scene from parsed spawns. Panels render below
 * (panelDepth); buttons/instruments and any fallback hit-areas render above
 * (hitDepth). Returns one `UiElement` per spawn, in spawn order, for relayout.
 */
export function spawnUiLayer(
  scene: Phaser.Scene,
  spawns: readonly TiledSpawn[],
  opts: UiLayerOptions,
): UiElement[] {
  const cam = scene.cameras.main;
  const camSize: CameraSize = { width: cam.width, height: cam.height };
  const panelDepth = opts.panelDepth ?? 1;
  const hitDepth = opts.hitDepth ?? 10;

  return spawns.map((spawn) => {
    const def = defFor(spawn);
    if (!def) return { spawn, hit: makeHit(scene, spawn, opts.bgRect, camSize, hitDepth) };

    const target = placeSpawn(spawn, opts.bgRect, camSize);
    const img = scene.add.image(0, 0, def.base).setOrigin(0.5);
    placeUiSprite(img, def, target);

    if (spawn.klass === "panel") {
      img.setDepth(panelDepth);
    } else {
      img.setDepth(hitDepth);
      if (spawn.klass === "instrument") wireInstrument(img, def, spawn);
      else wireButton(scene, img, def, spawn);
    }
    return { spawn, image: img, def };
  });
}

/**
 * Re-anchor an already-spawned UI layer against a fresh background rect (called
 * from a scene's resize handler). Re-runs the same pure `placeSpawn` + content-fit
 * math so resized positions match a fresh spawn exactly.
 */
export function relayoutUiLayer(
  elements: readonly UiElement[],
  bg: Rect,
  cam: CameraSize,
): void {
  for (const el of elements) {
    const target = placeSpawn(el.spawn, bg, cam);
    if (el.image && el.def) placeUiSprite(el.image, el.def, target);
    else if (el.hit) el.hit.setPosition(target.x, target.y).setSize(target.width, target.height);
  }
}
