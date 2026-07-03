// Data-driven Phaser asset manifest. Keys are stable texture ids; URLs are
// resolved through Vite's `import.meta.url` so the hashed asset paths survive
// both the local ("/") and GitHub Pages ("/ibeetkidz/") base builds. Never
// hardcode "/assets/..." strings — that breaks the Pages base path.
//
// Scenes load only the keys they need (see each scene's `preload`). The
// Three-Zone chrome (panels/buttons/instruments) lives in ui-sprites.ts; the
// train/smoke/signal/tarp atlases live in sprite-assets.ts. Everything that no
// scene loads was pruned (2026-07-03) so Vite stops bundling dead megabytes —
// a `${file}` template glob-bundles its whole directory, so every entry here
// must earn its keep.

export interface ImageAsset {
  readonly key: string;
  readonly url: string;
}

const v2 = (file: string): string =>
  new URL(`../assets/scenes-v2/${file}`, import.meta.url).href;

// v2 clean scene base plates (no painted-in UI chrome); the Tiled-driven
// sprites are drawn on top.
export const SCENE_BG_V2 = {
  workshop: { key: "bg-workshop-v2", url: v2("workshop-scene-base.png") },
  workshopBoxcarOpen: { key: "bg-workshop-boxcar-open", url: v2("workshop-boxcar-open.png") },
  yard: { key: "bg-yard-v2", url: v2("yard-scene-clean-v2.png") },
  track: { key: "bg-track-v2", url: v2("track-scene-clean-v2.png") },
  map: { key: "bg-map-v2", url: v2("map-scene-clean.png") },
} as const satisfies Record<string, ImageAsset>;

// The handcar location marker on the Map — the one standalone sprite left
// outside the ui-sprites manifest (it is a scene fixture, not chrome).
export const SPRITES = {
  handcar: {
    key: "spr-handcar",
    url: new URL("../assets/sprites/handcar.png", import.meta.url).href,
  },
} as const satisfies Record<string, ImageAsset>;
