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
  // AR-016 layered interior: brick arches + rails, NO car (the car is a sprite).
  workshopInterior: { key: "bg-workshop-interior", url: v2("workshop-interior-clean.png") },
  yard: { key: "bg-yard-v2", url: v2("yard-scene-clean-v2.png") },
  track: { key: "bg-track-v2", url: v2("track-scene-clean-v2.png") },
  map: { key: "bg-map-v2", url: v2("map-scene-clean.png") },
} as const satisfies Record<string, ImageAsset>;

// AR-016 side-on car sprites (Workshop Layer 2). All four share one 2560×1440
// canvas, wheels on the same baseline, and an IDENTICAL punched interior void
// (CAR_SIDE_VOID) where the sequencer chalkboard mounts — so a car-type swap is
// a texture change with no reposition, exactly like the chrome state variants.
export const CAR_SIDE_SPRITES = {
  boxcar: { key: "car-side-boxcar", url: new URL("../assets/sprites/cars/car-side-boxcar.png", import.meta.url).href },
  tanker: { key: "car-side-tanker", url: new URL("../assets/sprites/cars/car-side-tanker.png", import.meta.url).href },
  hopper: { key: "car-side-hopper", url: new URL("../assets/sprites/cars/car-side-hopper.png", import.meta.url).href },
  flatcar: { key: "car-side-flatcar", url: new URL("../assets/sprites/cars/car-side-flatcar.png", import.meta.url).href },
} as const satisfies Record<string, ImageAsset>;

/** The standardized interior void every car-side sprite punches, in the car
 *  canvas's own pixels (2560×1440) — shipped with the AR-016 drop
 *  (scripts/punch_void.py). The chalkboard mounts relative to this rect. */
export const CAR_SIDE_CANVAS = { w: 2560, h: 1440 } as const;
export const CAR_SIDE_VOID = { x: 474, y: 280, w: 1612, h: 430 } as const;

// The handcar location marker on the Map — the one standalone sprite left
// outside the ui-sprites manifest (it is a scene fixture, not chrome).
export const SPRITES = {
  handcar: {
    key: "spr-handcar",
    url: new URL("../assets/sprites/handcar.png", import.meta.url).href,
  },
} as const satisfies Record<string, ImageAsset>;
