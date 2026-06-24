// Phaser game bootstrap. One game per mounted React view (see PhaserGame.tsx):
// the view passes the scene(s) it wants and we spin up a canvas sized to its
// container. The config here is the shared house style for every space.
import Phaser from "phaser";

export function startGame(
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType | Phaser.Types.Scenes.SceneType[],
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    // The canvas is a backdrop the React UI overlays; let the page show through
    // any uncovered edge instead of painting a hard rectangle.
    transparent: true,
    // Nearest-neighbour scaling — the whole point is crisp 16-bit pixels, never
    // the browser's bilinear blur.
    pixelArt: true,
    scale: {
      // Track the container element; the scene's RESIZE handler re-fits art.
      mode: Phaser.Scale.RESIZE,
      parent,
      width: "100%",
      height: "100%",
    },
    scene: scenes,
  });
}
