// One `Phaser.Game` for the life of the page.
//
// Why: a `Phaser.Game` owns exactly one `TextureManager`, so the v2 shape — a
// game per mounted view, destroyed on unmount — shared nothing. Every move
// between spaces threw away the WebGL context and re-decoded and re-uploaded
// every texture. The packed chrome atlas alone is ~176 MB of VRAM and three of
// the four spaces load it, so it was paid again on each navigation.
//
// This module owns the game and the host element; `SceneSwitch` owns the policy
// for which scene runs (and the ordering rules, which are the subtle part).
// React drives it through `<GameCanvas>` + `<PhaserScene>` and nothing else.
//
// The trade this makes: peak VRAM is now the UNION of the scenes visited rather
// than the largest single scene, because nothing is ever evicted. That is the
// intended trade — the textures are the thing we are keeping.

import Phaser from "phaser";
import { startGame } from "./main.ts";
import { SceneSwitch, type SceneClass, type SceneSwapper } from "./scene-switch.ts";

let game: Phaser.Game | null = null;
let host: HTMLElement | null = null;
let hub: SceneSwitch | null = null;

/**
 * Boot the shared game into `parent`, once. Idempotent: later calls with the
 * same element are a no-op, which is what React StrictMode's double-invoked
 * effects need.
 *
 * `parent` MUST already be in the document. The ScaleManager measures it at
 * boot; a detached node measures 0x0, after which `Scale.FIT` never settles and
 * the whole page oscillates every frame. The symptom is remote from the cause —
 * Playwright reports "element is not stable" on unrelated React buttons.
 */
export function ensureGame(parent: HTMLElement): Phaser.Game {
  if (game && host === parent) return game;
  if (game) throw new Error("game-host: the shared game already has a different parent");
  host = parent;
  game = startGame(parent);
  const created = game;
  const swapper: SceneSwapper = {
    has: (key) => !!created.scene.getScene(key),
    // SHUTDOWN first — that is the event every scene here hangs its EventBus
    // cleanup on, and `remove` does not fire it. See scene-switch.ts rule 2.
    stop: (key) => void created.scene.stop(key),
    remove: (key) => void created.scene.remove(key),
    add: (scene) => void created.scene.add(scene.KEY, scene, true),
  };
  hub = new SceneSwitch(swapper);
  const ready = hub;
  // Phaser boots asynchronously; until READY the SceneManager only queues.
  created.events.once(Phaser.Core.Events.READY, () => ready.markReady());
  return game;
}

/** Make `scene` the one running in the shared game. Safe before boot. */
export function showScene(scene: SceneClass): void {
  if (!hub) throw new Error("game-host: showScene before ensureGame");
  hub.show(scene);
}

/** Re-measure the canvas against its parent. See `GameCanvas` for the why. */
export function refreshScale(): void {
  if (game?.isBooted) game.scale.refresh();
}

/** Test/teardown hatch. Nothing in the app calls this — the game is meant to
 *  outlive every view — but leaving no way back makes the module untestable. */
export function destroyGame(): void {
  game?.destroy(true);
  game = null;
  host = null;
  hub = null;
}
