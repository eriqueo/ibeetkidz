// The React<->Phaser bridge, view side. Renders nothing: it claims the shared
// canvas for one scene while its view is mounted, and hands the live scene back
// once `create()` has finished.
//
// This replaces the old `PhaserGame`, which booted a whole `Phaser.Game` per
// view and destroyed it on unmount — see `game-host.ts` for what that cost.
// All cross-boundary traffic still goes through the EventBus; `onSceneReady` is
// only an escape hatch for imperative wiring, and React never mutates Phaser
// display objects directly.
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type Phaser from "phaser";
import { showScene } from "../game/game-host.ts";
import type { SceneClass } from "../game/scene-switch.ts";
import { EventBus } from "../game/EventBus.ts";

/**
 * The wrapper every view uses for the HTML it floats over the shared canvas.
 *
 * Two properties are load-bearing, and both changed with the shared canvas:
 * TRANSPARENT (the canvas is now a sibling BEHIND this element, not a child, so
 * a background here paints over the whole scene) and INERT (`pointer-events:
 * none`, so taps fall through to the canvas — every space puts its real UI in
 * Phaser). Interactive HTML children, should any come back, must opt back in
 * with `pointerEvents: "auto"` themselves.
 *
 * One producer: all four views import this rather than restating it, so the
 * rule can't drift view by view.
 */
export const VIEW_OVERLAY: CSSProperties = {
  position: "relative",
  height: "100dvh",
  overflow: "hidden",
  pointerEvents: "none",
};

interface PhaserSceneProps {
  /** The scene class this view wants running. Module-level constant, please. */
  scene: SceneClass;
  /** Fired once that scene finishes `create()` and is safe to drive. */
  onSceneReady?: (scene: Phaser.Scene) => void;
}

export function PhaserScene({ scene, onSceneReady }: PhaserSceneProps): null {
  // Read through a ref so the effect below can depend on `[scene]` alone. If it
  // depended on the callback's identity, a parent re-render that produced a new
  // callback would re-run the effect and RESTART the scene mid-view.
  const readyRef = useRef(onSceneReady);
  readyRef.current = onSceneReady;

  // SUBSCRIBE FIRST, THEN SHOW — the order is the whole point, and getting it
  // backwards shipped a real bug.
  //
  // Sharing one game means a revisited scene finds every texture already in the
  // cache, so its `preload` queues nothing and Phaser runs `create()` — and
  // therefore `announceReady()` — SYNCHRONOUSLY inside `showScene`. With the
  // subscription in a separate `useEffect` (which React runs after every layout
  // effect) the handshake fired into an empty bus on exactly those revisits.
  //
  // It failed silently and in a way no existing test could see: `getScene()` in
  // the dev bridge has its own module-level subscription that never unsubscribes,
  // so e2e still observed the scene while the VIEW never got its callback —
  // leaving `sceneRef.current` pointed at the previous, destroyed instance and
  // every later `setModel`/`setCars` writing into a dead object.
  //
  // A first visit hid it: nothing is cached yet, the loader runs, `create()`
  // lands a frame later, and by then the old ordering happened to work.
  useLayoutEffect(() => {
    const handleReady = (ready: Phaser.Scene): void => {
      // The bus carries every view's handshake now; answer only for ours.
      if (ready.scene.key !== scene.KEY) return;
      readyRef.current?.(ready);
    };
    EventBus.on("current-scene-ready", handleReady);
    showScene(scene);
    return () => {
      EventBus.off("current-scene-ready", handleReady);
    };
  }, [scene]);

  return null;
}
