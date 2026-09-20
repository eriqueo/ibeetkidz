import Phaser from "phaser";
import { GAME_RENDER_SIZE } from "./game-dimensions.ts";

/** FIT owns the CSS size; baseSize owns physical pixels. Phaser 4 has no game
 * `resolution` config, so use its public size and camera APIs explicitly.
 * Permanent by design: the Canvas fallback retains its native resolution until
 * its renderer has separate coverage for a reduced backing buffer. */
export function configureDrawingBuffer(game: Phaser.Game): void {
  if (game.renderer.type !== Phaser.WEBGL) return;
  const { width, height } = GAME_RENDER_SIZE;
  game.scale.baseSize.setSize(width, height);
  game.canvas.width = width;
  game.canvas.height = height;
  game.scale.refresh(); // Updates renderer size and browser → canvas input scale.
}

/** Apply before announcing a scene to React. Scene layout stays in gameSize;
 * camera projection maps it to baseSize. Built-in hit tests invert this camera
 * transform, so a smaller buffer never means a smaller touch target. */
export function installSceneProjection(scene: Phaser.Scene): void {
  const project = (): void => {
    const { gameSize, baseSize } = scene.scale;
    scene.cameras.main
      .setViewport(0, 0, baseSize.width, baseSize.height)
      .setOrigin(0, 0)
      .setZoom(baseSize.width / gameSize.width, baseSize.height / gameSize.height);
  };
  project();
  scene.scale.on(Phaser.Scale.Events.RESIZE, project);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, project);
  });
}
