import Phaser from "phaser";
import { drawingBufferSize } from "./game-dimensions.ts";

/** FIT owns the CSS size; baseSize owns physical pixels. Phaser 4 has no game
 * `resolution` config, so use its public size and camera APIs explicitly.
 * Permanent by design: the Canvas fallback retains its original resolution. */
export function configureDrawingBuffer(game: Phaser.Game, pixelRatio: () => number): void {
  if (game.renderer.type !== Phaser.WEBGL) return;
  const resize = (): void => {
    const bounds = game.canvas.getBoundingClientRect();
    const { width, height } = drawingBufferSize(bounds.width, bounds.height, pixelRatio());
    if (game.scale.baseSize.width === width && game.scale.baseSize.height === height) return;
    game.scale.baseSize.setSize(width, height);
    game.canvas.width = width;
    game.canvas.height = height;
    // Refresh also emits RESIZE. The size equality above ends that nested call
    // and keeps the renderer, scene cameras and pointer conversion in sync.
    game.scale.refresh();
  };
  game.scale.on(Phaser.Scale.Events.RESIZE, resize);
  game.events.once(Phaser.Core.Events.DESTROY, () => game.scale.off(Phaser.Scale.Events.RESIZE, resize));
  resize();
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
