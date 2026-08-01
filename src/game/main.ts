// Phaser game bootstrap. Exactly ONE game exists per page and it is created by
// `game-host.ts`, which then swaps scenes in and out of it as the kid moves
// between spaces; this function is just the config, the shared house style for
// every space. It deliberately starts with no scenes — the SceneManager is
// driven entirely by `SceneSwitch`.
import Phaser from "phaser";

export function startGame(parent: HTMLElement): Phaser.Game {
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
      // FIT a fixed 16:9 design resolution into the container, letterboxing and
      // centring so the whole scene stays on-screen (and fills mobile viewports
      // vertically). The scene lays everything out in this fixed 2560×1440 space;
      // Phaser scales the canvas to the device.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent,
      width: 2560,
      height: 1440,
    },
    scene: [],
  });
}
