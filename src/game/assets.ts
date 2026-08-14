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

// v2 clean scene base plates (no painted-in UI chrome); the Tiled-driven
// sprites are drawn on top.
//
// These were written as `v2("name.png")` over a `new URL(`../assets/scenes-v2/${file}`)`
// template. Vite cannot statically resolve a template, so it glob-bundles the
// WHOLE directory: `src/assets/scenes-v2/` holds 10 PNGs and all 10 shipped —
// 5.2 MB, of which 2.6 MB was for files no scene loads (measured in dist/, not
// assumed). The header at the top of this file already warned about exactly
// this. Static literals only, one per entry — a template here costs megabytes.
export const SCENE_BG_V2 = {
  // AR-016 layered interior: brick arches + rails, NO car (the car is a sprite).
  workshopInterior: {
    key: "bg-workshop-interior",
    url: new URL("../assets/scenes-v2/workshop-interior-clean.png", import.meta.url).href,
  },
  yard: {
    key: "bg-yard-v2",
    url: new URL("../assets/scenes-v2/yard-scene-clean-v2.png", import.meta.url).href,
  },
  track: {
    key: "bg-track-v2",
    url: new URL("../assets/scenes-v2/track-scene-clean-v2.png", import.meta.url).href,
  },
  map: {
    key: "bg-map-v2",
    url: new URL("../assets/scenes-v2/map-scene-clean.png", import.meta.url).href,
  },
} as const satisfies Record<string, ImageAsset>;
// `workshop` (workshop-scene-base.png) was dropped with the glob: it was
// declared here but loaded by no scene — WorkshopScene loads `workshopInterior`.
// The file is still in `src/assets/scenes-v2/`, it just no longer ships.

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

/**
 * AR-060: the car, drawn OPEN as one picture.
 *
 * This replaces the punched-void assembly — a body with a rectangular hole cut
 * through it, an interior stretched into the hole, and a rail over the crew's
 * legs. That construction was reported as "a train inside the train" three
 * times across three rounds of interior art, and it could not be fixed by
 * painting, because the hole was ONE rectangle cut through four differently
 * shaped cars, one of them a cylinder. A rectangular window into a round tank
 * cannot exist, so the eye refuses to read it as an opening.
 *
 * Now each type is a single drawing whose opening belongs to its own body: the
 * boxcar's door rolls back, the tanker has a curved inspection hatch, the
 * hopper shows its real bin mouth, the flatcar is open air. `front` carries
 * only what must draw IN FRONT of the crew (the near lip), transparent
 * everywhere else.
 *
 * `crew` and `floor` come from the delivery note, in canvas pixels: the rect
 * the characters may stand in, and the y their feet sit on. They are per type
 * on purpose — a flatcar's crew stands on a deck and a tanker's stands in a
 * hatch, and forcing both into one shared rect is the mistake this replaces.
 */
export interface OpenCarAsset extends ImageAsset {
  readonly front: ImageAsset;
  readonly crew: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly floor: number;
  /**
   * Opaque content box, normalized — the wheels' baseline is `content[3]`.
   *
   * MEASURED here rather than scanned at runtime, and that is a correctness
   * fix, not a style choice. `measureContentBox` reads a texture's alpha back
   * through a canvas, which is cheap for a 260x120 button and emphatically not
   * for a 2560x1440 car: 3.7M pixels of `getImageData` plus the scan blocks the
   * main thread, and doing it while the Workshop opens landed inside the mic's
   * capture window — the recorder came back with a blob its own decoder
   * rejected ("EncodingError: Unable to decode audio data") and the take was
   * lost. The e2e mic proof caught it.
   *
   * Boxes are the alpha bbox of each delivered PNG at threshold 40.
   */
  readonly content: readonly [number, number, number, number];
}

const CANVAS_W = 2560;
const CANVAS_H = 1440;

const openCar = (
  type: string,
  crew: OpenCarAsset["crew"],
  floor: number,
  bbox: readonly [number, number, number, number],
): OpenCarAsset => ({
  content: [bbox[0] / CANVAS_W, bbox[1] / CANVAS_H, bbox[2] / CANVAS_W, bbox[3] / CANVAS_H],
  key: `car-open-${type}`,
  // Static `new URL` literals, one per file — see the note in this module's
  // header on why these are never built from a template.
  url: OPEN_CAR_URLS[`../assets/sprites/cars/car-open-${type}.png`] ?? "",
  front: {
    key: `car-open-${type}-front`,
    url: OPEN_CAR_URLS[`../assets/sprites/cars/car-open-${type}-front.png`] ?? "",
  },
  crew,
  floor,
});

/** The eight open-car files, resolved at build time. A glob rather than eight
 *  `new URL` literals because the set is closed and named by car type, so the
 *  bundler ships exactly these and nothing else. */
const OPEN_CAR_URLS = import.meta.glob("../assets/sprites/cars/car-open-*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const CAR_OPEN_SPRITES = {
  boxcar: openCar("boxcar", { x: 990, y: 560, w: 850, h: 430 }, 1000, [38, 188, 2521, 1250]),
  tanker: openCar("tanker", { x: 620, y: 560, w: 1200, h: 330 }, 895, [25, 132, 2528, 1197]),
  hopper: openCar("hopper", { x: 700, y: 490, w: 1140, h: 440 }, 930, [46, 163, 2514, 1184]),
  flatcar: openCar("flatcar", { x: 720, y: 410, w: 1120, h: 455 }, 865, [48, 68, 2507, 1438]),
} as const satisfies Record<string, OpenCarAsset>;

// The handcar location marker on the Map — the one standalone sprite left
// outside the ui-sprites manifest (it is a scene fixture, not chrome).
export const SPRITES = {
  handcar: {
    key: "spr-handcar",
    url: new URL("../assets/sprites/handcar.png", import.meta.url).href,
  },
} as const satisfies Record<string, ImageAsset>;
