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
const v2 = (file: string): string =>
  new URL(`../assets/scenes-v2/${file}`, import.meta.url).href;
const sprite = (file: string): string =>
  new URL(`../assets/sprites/${file}`, import.meta.url).href;

// Full-scene pixel-art backgrounds (the high-res reference renders).
export const SCENE_BG = {
  workshop: { key: "bg-workshop", url: ref("workshop-scene.png") },
  yard: { key: "bg-yard", url: ref("yard-scene.png") },
  track: { key: "bg-track", url: ref("track-scene.png") },
  map: { key: "bg-map", url: ref("map-scene.png") },
} as const satisfies Record<string, ImageAsset>;

export type SceneBgKey = keyof typeof SCENE_BG;

// v2 redesign: clean scene backgrounds (no painted-in UI chrome) that the React
// overlays + Phaser sprites are drawn on top of. See REDESIGN_SPEC.md.
export const SCENE_BG_V2 = {
  workshop: { key: "bg-workshop-v2", url: v2("workshop-scene-clean.png") },
  yard: { key: "bg-yard-v2", url: v2("yard-scene-clean.png") },
  track: { key: "bg-track-v2", url: v2("track-scene-clean.png") },
} as const satisfies Record<string, ImageAsset>;

// Isolated train sprites (cars, loco, crossing signal, smoke, tarp). Keyed by a
// stable texture id; the `CarType` → sprite mapping lives in `carSprite` below.
export const SPRITES = {
  loco: { key: "spr-loco", url: sprite("loco.png") },
  boxcar: { key: "spr-boxcar", url: sprite("boxcar.png") },
  tanker: { key: "spr-tanker", url: sprite("tanker.png") },
  hopper: { key: "spr-hopper", url: sprite("hopper.png") },
  flatcar: { key: "spr-flatcar", url: sprite("flatcar.png") },
  signalUp: { key: "spr-signal-up", url: sprite("crossing-signal-up.png") },
  signalDown: { key: "spr-signal-down", url: sprite("crossing-signal-down.png") },
  smokePuff: { key: "spr-smoke", url: sprite("smoke-puff.png") },
  tarp: { key: "spr-tarp", url: sprite("tarp.png") },
} as const satisfies Record<string, ImageAsset>;

/** All car-type sprites — used by scenes that load every car body up front. */
export const CAR_SPRITES = [
  SPRITES.boxcar,
  SPRITES.tanker,
  SPRITES.hopper,
  SPRITES.flatcar,
] as const;

/** Map a `CarType` to its sprite texture key (data-driven, no hardcoded ifs). */
export const carSpriteKey: Record<
  "boxcar" | "tanker" | "hopper" | "flatcar",
  string
> = {
  boxcar: SPRITES.boxcar.key,
  tanker: SPRITES.tanker.key,
  hopper: SPRITES.hopper.key,
  flatcar: SPRITES.flatcar.key,
};

/** Map a `CarType` to its sprite image URL (for React <img> car-type pickers). */
export const carSpriteUrl: Record<
  "boxcar" | "tanker" | "hopper" | "flatcar",
  string
> = {
  boxcar: SPRITES.boxcar.url,
  tanker: SPRITES.tanker.url,
  hopper: SPRITES.hopper.url,
  flatcar: SPRITES.flatcar.url,
};
