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

// ── Two asset idioms, and they are NOT interchangeable ──────────────────────
//
// 1. BUNDLED assets live under `src/assets/`. Vite hashes and rewrites them, so
//    they must be referenced with `new URL("../assets/…", import.meta.url)` —
//    the manifests below. Never a plain string; there is no stable filename.
//
// 2. VERBATIM assets live under `public/` (today: `public/assets/spritesheets/`,
//    the train/smoke/signal/tarp atlases + the packed ui-atlas). Vite copies
//    `public/` to the output ROOT untouched — no hash, no rewrite — so
//    `import.meta.url` would be wrong for them (it resolves against the hashed
//    bundle, not the copied file). They need the DEPLOY BASE prefixed instead.
//
// Idiom 2 was originally written as bare document-relative strings
// ("assets/spritesheets/train.png"). That only resolves when the document base
// happens to be the app directory: at `/ibeetkidz/` it works, at `/ibeetkidz`
// (no trailing slash) the base is the site root and all of them 404. Ticket B1
// routed every such reference through the one producer below.

/** Pure join of a deploy base and a public-dir path. Exported separately from
 *  `publicAssetUrl` so the "exactly one slash" contract is testable without a
 *  build (Vite's `BASE_URL` already ends in "/" — do not add a second one). */
export function joinPublicBase(base: string, path: string): string {
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return prefix + path.replace(/^\/+/, "");
}

/**
 * Resolve a file that ships VERBATIM in `public/` to a URL that is correct
 * regardless of the document base. `import.meta.env.BASE_URL` is Vite's deploy
 * base — "/" for `vite build`, "/ibeetkidz/" for `vite build --mode gh` — so
 * the result is always root-absolute and never document-relative.
 *
 * ONE producer for this fact: every `public/` reference in the game goes
 * through here. Do not inline `import.meta.env.BASE_URL` at a call site.
 *
 * @param path public-dir path WITHOUT a leading slash, e.g.
 *             "assets/spritesheets/train.png".
 */
export function publicAssetUrl(path: string): string {
  return joinPublicBase(import.meta.env.BASE_URL, path);
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
