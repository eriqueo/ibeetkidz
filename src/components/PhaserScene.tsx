// The React<->Phaser bridge, view side. Renders nothing: it claims the shared
// canvas for one scene while its view is mounted, and hands the live scene back
// once `create()` has finished.
//
// This replaces the old `PhaserGame`, which booted a whole `Phaser.Game` per
// view and destroyed it on unmount — see `game-host.ts` for what that cost.
// All cross-boundary traffic still goes through the EventBus; `onSceneReady` is
// only an escape hatch for imperative wiring, and React never mutates Phaser
// display objects directly.
import { useEffect, useLayoutEffect, type CSSProperties } from "react";
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
  // Layout effect so the swap is requested in the same commit that mounted the
  // view, before paint.
  useLayoutEffect(() => {
    showScene(scene);
  }, [scene]);

  useEffect(() => {
    const handleReady = (ready: Phaser.Scene): void => {
      // The game is shared now, so this bus carries other views' handshakes
      // too. Only answer for the scene this view asked for.
      if (ready.scene.key !== scene.KEY) return;
      onSceneReady?.(ready);
    };
    EventBus.on("current-scene-ready", handleReady);
    return () => {
      EventBus.off("current-scene-ready", handleReady);
    };
  }, [scene, onSceneReady]);

  return null;
}
