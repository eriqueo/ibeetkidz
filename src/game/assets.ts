// Data-driven Phaser asset manifest. Keys are stable texture ids; URLs are
// resolved through Vite's `import.meta.url` so the hashed asset paths survive
// both the local ("/") and GitHub Pages ("/ibeetkidz/") base builds. Never
// hardcode "/assets/..." strings — that breaks the Pages base path.
//
// Scenes load only the keys they need (see each scene's `preload`), but the
// single source of truth for "where does this texture come from" lives here.

export interface ImageAsset {
  readonly key: string;
  readonly url: string;
}

const ref = (file: string): string =>
  new URL(`../assets/references/${file}`, import.meta.url).href;

// Full-scene pixel-art backgrounds (the high-res reference renders).
export const SCENE_BG = {
  workshop: { key: "bg-workshop", url: ref("workshop-scene.png") },
  yard: { key: "bg-yard", url: ref("yard-scene.png") },
  track: { key: "bg-track", url: ref("track-scene.png") },
  map: { key: "bg-map", url: ref("map-scene.png") },
} as const satisfies Record<string, ImageAsset>;

export type SceneBgKey = keyof typeof SCENE_BG;
