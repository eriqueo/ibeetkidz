// Three-Zone UI sprite manifest + loader + content-aware placement.
//
// The v2→v3 refactor (UI_REFACTOR_DELEGATION.md) moves the scenes' static chrome
// off baked-in base-plate art and onto STANDALONE sprites placed by Tiled data:
//   - panels     (panel-header / panel-transport): the Top Bar + Bottom Bar plates
//   - buttons    (btn-*): idle ⇄ pressed on press, emit an EventBus action
//   - instruments(inst-*): passive → hover → active state art in the Field
//
// Every sprite is authored on a FIXED canvas with transparent padding, and each
// state variant (idle/pressed, passive/hover/active) shares that canvas — so a
// state swap is a texture change with NO reposition (the artist positioned each
// variant within the shared canvas; e.g. the "active" instrument is drawn bigger,
// which reads as a pop). We place the sprite ONCE using the BASE variant's opaque
// content box so the visible art lands on its Tiled rect regardless of padding.
//
// This module is the single source of truth for "where does this UI texture come
// from" + "how much of its canvas is real art". It stays Phaser-free except for
// the two functions that take a `scene`/`image`, mirroring assets.ts. URLs are
// STATIC `new URL(...)` literals (never a `${}` template) so Vite ships only these
// files, not a glob of the whole directory — see the note in assets.ts.
import type Phaser from "phaser";
import { publicAssetUrl } from "./assets.ts";

// All chrome art ships in ONE packed multiatlas (public/assets/spritesheets/
// ui-atlas.*, rebuilt by scripts/build_ui_atlas.py). Frame names equal the
// source file stems, so the state maps below reference frames directly.
export const UI_ATLAS_KEY = "ui-atlas";

/** Normalized opaque-content box within a sprite's own canvas, `[x0,y0,x1,y1]`. */
export type ContentBox = readonly [number, number, number, number];

/** A UI sprite: its per-state texture keys + the base state's content box. The
 *  texture KEY equals the file stem (e.g. "btn-play-idle") so it is trivially
 *  derivable and stable across the manifest. */
export interface UiSpriteDef {
  /** state name → ui-atlas FRAME name (the state machine the engine swaps). */
  readonly states: Readonly<Record<string, string>>;
  /** the default/rest state key (idle / passive). */
  readonly base: string;
  /** opaque content box of the BASE state, used for placement. */
  readonly content: ContentBox;
  /** panels stretch to fill their rect; buttons/instruments scale uniformly. */
  readonly stretch: boolean;
  /** crop the drawn texture to the content box (for canvases whose padding is
   *  OPAQUE junk — e.g. the RGB yard strip's black margins — rather than
   *  transparent). Placement math is unchanged; only the drawn region shrinks. */
  readonly crop?: boolean;
}

// Icon key-caps are near-square with a uniform ~13% transparent margin; the
// measured per-file boxes are noisy (stray glow pixels), so a shared box is both
// simpler and steadier across the idle/pressed pair. Labelled steampunk plaques
// (map / newcar / sendtoyard / picker tiles) are landscape and pass their own box.
const BUTTON_CONTENT: ContentBox = [0.13, 0.13, 0.87, 0.87];

function buttonDef(id: string, opts: { pressed?: boolean; content?: ContentBox } = {}): UiSpriteDef {
  const idleKey = `${id}-idle`;
  const states: Record<string, string> = { idle: idleKey };
  if (opts.pressed ?? true) states["pressed"] = `${id}-pressed`;
  return { states, base: idleKey, content: opts.content ?? BUTTON_CONTENT, stretch: false };
}

// Car-type picker tiles: an idle art plus (boxcar only) a `selected` highlight.
function pickerDef(type: string, content: ContentBox, selected = false): UiSpriteDef {
  const idleKey = `btn-picker-${type}-idle`;
  const states: Record<string, string> = { idle: idleKey };
  if (selected) states["selected"] = `btn-picker-${type}-selected`;
  return { states, base: idleKey, content, stretch: false };
}

function instrumentDef(id: string, content: ContentBox): UiSpriteDef {
  const p = `${id}-passive`, h = `${id}-hover`, a = `${id}-active`;
  return { states: { passive: p, hover: h, active: a }, base: p, content, stretch: false };
}

function panelDef(id: string, content: ContentBox): UiSpriteDef {
  return { states: { base: id }, base: id, content, stretch: true };
}


/** The full Three-Zone UI sprite manifest, keyed by base id (= Tiled `sprite`). */
export const UI_SPRITES: Readonly<Record<string, UiSpriteDef>> = {
  // Workshop top-bar: the New Car plaque (nav plaques are the shared set below).
  "btn-newcar": buttonDef("btn-newcar", { content: [0.098, 0.179, 0.901, 0.81] }),
  // AR-016: sends the finished car off to the Yard (slide-out + nav).
  "btn-send-to-yard": buttonDef("btn-send-to-yard", { content: [0.099, 0.179, 0.901, 0.811] }),
  // Car-type picker tiles (shown in the dropdown the New Car button toggles).
  "btn-picker-boxcar": pickerDef("boxcar", [0.039, 0.255, 0.961, 0.719], true),
  "btn-picker-tanker": pickerDef("tanker", [0.027, 0.242, 0.973, 0.733]),
  "btn-picker-hopper": pickerDef("hopper", [0.018, 0.225, 0.982, 0.748]),
  "btn-picker-flatcar": pickerDef("flatcar", [0.036, 0.261, 0.964, 0.714]),
  // Bottom-bar transport: the unified dark steampunk keycap set (AR-010) —
  // baked labels, same family as the yard keycaps, shared by Workshop + Track.
  // Content boxes measured from each idle PNG's solid-alpha bbox.
  "btn-transport-stop": buttonDef("btn-transport-stop", { content: [0.181, 0.155, 0.819, 0.845] }),
  "btn-transport-play": buttonDef("btn-transport-play", { content: [0.18, 0.155, 0.841, 0.833] }),
  "btn-transport-loop": buttonDef("btn-transport-loop", { content: [0.179, 0.134, 0.821, 0.847] }),
  "btn-transport-slow": buttonDef("btn-transport-slow", { content: [0.181, 0.129, 0.819, 0.882] }),
  "btn-transport-fast": buttonDef("btn-transport-fast", { content: [0.181, 0.155, 0.819, 0.845] }),
  // Track: the dedicated RIDE keycap (golden loco, baked label — no caption).
  "btn-track-ride": buttonDef("btn-track-ride"),
  // AR-043: the painted CLEAR plaque that retires the Track header's keycap
  // fallback. AR-020: the SEND SONG plaque on the oval Track's header.
  "btn-track-clear": buttonDef("btn-track-clear", { content: [0.1836, 0.1328, 0.8281, 0.8223] }),
  "btn-send-song": buttonDef("btn-send-song", { content: [0.0352, 0.0893, 0.9785, 0.896] }),
  // AR-057: the shared tool-panel chrome — a recessed ✕ socket and the wide
  // DONE plaque, in the same slot on every machine. Boxes measured off the
  // delivered idle PNGs.
  "btn-panel-close": buttonDef("btn-panel-close", { content: [0.2031, 0.1523, 0.8008, 0.7949] }),
  "btn-panel-done": buttonDef("btn-panel-done", { content: [0.2939, 0.2618, 0.7109, 0.7206] }),
  // AR-054: the neutral, tintable percussion keycap. `seated` is the pressed-in
  // socket with the gold selected tick, so this pair is a two-state sprite the
  // pad shelf swaps per cell rather than an idle/pressed press animation.
  "pad-key": {
    states: { idle: "pad-key-idle", seated: "pad-key-seated" },
    base: "pad-key-idle",
    content: [0.0449, 0.0215, 0.9922, 0.9961],
    stretch: false,
  },
  // Yard bottom-bar action keycaps (baked labels — no captions).
  "btn-yard-edit": buttonDef("btn-yard-edit"),
  "btn-yard-hitch": buttonDef("btn-yard-hitch"),
  "btn-yard-unhitch": buttonDef("btn-yard-unhitch"),
  "btn-yard-totrack": buttonDef("btn-yard-totrack"),
  "btn-yard-delete": buttonDef("btn-yard-delete"),
  // Cross-scene nav plaques (landscape parchment signs, baked text + arrows).
  // Content boxes measured from each idle PNG's solid-alpha bbox (alpha > 220).
  // Only MAP has pressed art so far (ART_REQUESTS AR-006 covers the rest).
  "btn-nav-map": buttonDef("btn-nav-map", { content: [0.036, 0.234, 0.961, 0.719] }),
  "btn-nav-workshop": buttonDef("btn-nav-workshop", { pressed: false, content: [0.044, 0.254, 0.965, 0.703] }),
  "btn-nav-yard": buttonDef("btn-nav-yard", { pressed: false, content: [0.049, 0.225, 0.951, 0.733] }),
  "btn-nav-track": buttonDef("btn-nav-track", { pressed: false, content: [0.067, 0.255, 0.948, 0.734] }),
  // Field instruments. Boxes measured from each PASSIVE PNG's alpha bbox above a
  // threshold of 40 — the raw bbox is inflated by two or three stray chroma-key
  // pixels (alpha 1-33, magenta and green) that AR-024 left in the bottom row of
  // several files. Thresholding excludes those without touching real
  // anti-aliasing; measuring raw would push the box to the canvas edge and draw
  // every one of these sprites too small.
  //
  // Passive is the reference for all three states on purpose: `active` is drawn
  // deliberately LARGER inside the same canvas, so sharing the passive box is
  // what produces the pop on press. Do not re-measure per state.
  "inst-drums": instrumentDef("inst-drums", [0.054, 0.286, 0.96, 0.776]),
  "inst-guitar": instrumentDef("inst-guitar", [0.085, 0.251, 0.875, 0.868]),
  "inst-keys": instrumentDef("inst-keys", [0.064, 0.336, 0.934, 0.913]),
  "inst-magic": instrumentDef("inst-magic", [0.038, 0.34, 0.972, 0.97]),
  "inst-mic": instrumentDef("inst-mic", [0.094, 0.285, 0.866, 0.902]),
  "inst-pads": instrumentDef("inst-pads", [0.04, 0.257, 0.958, 0.876]),
  // AR-045: the conductor — the whole-train view's character. Content box
  // measured off inst-conductor-passive.png (bbox 393x591+92+81 on 576x768).
  "inst-conductor": instrumentDef("inst-conductor", [0.16, 0.105, 0.842, 0.875]),
  "inst-violin": instrumentDef("inst-violin", [0.092, 0.26, 0.858, 0.898]),
  "inst-piano": instrumentDef("inst-piano", [0.031, 0.23, 0.939, 0.794]),
  // Zone plates (stretched to their Tiled rect, like the legacy Yard/Track panels).
  // panel-header/transport PNGs are pre-trimmed (whole canvas = content); the
  // yard actions plate carries transparent margins, so it passes a measured box.
  "panel-header": panelDef("panel-header", [0, 0, 1, 1]),
  "panel-header-v2": panelDef("panel-header-v2", [0, 0, 1, 1]),
  "panel-transport-v2": panelDef("panel-transport-v2", [0.0164, 0.2066, 0.981, 0.7283]),
  "panel-yard-actions": panelDef("panel-yard-actions", [0.021, 0.325, 0.979, 0.672]),
  // AR-016: the sequencer chalkboard mounted in the car's interior void. Placed
  // by the WorkshopScene (anchored to the car sprite), not by a Tiled rect.
  "sequencer-chalkboard": panelDef("sequencer-chalkboard", [0.068, 0.075, 0.931, 0.911]),
  // AR-016 instrument editor: the framed panel (note canvas + baked control
  // deck) and its movable controls. Placed by the editor tool panel, not Tiled.
  "panel-editor": { states: { base: "panel-editor" }, base: "panel-editor", content: [0.03, 0.023, 0.969, 0.973], stretch: false },
  // AR-050: the frog's drum-machine plate. Content box measured off the
  // delivered PNG (bbox 1466x1074+35+36 on 1536x1152).
  "panel-percussion": { states: { base: "panel-percussion" }, base: "panel-percussion", content: [0.0228, 0.0313, 0.977, 0.964], stretch: false },
  // AR-051: the three remaining painted machine faces. Same contract as the
  // percussion plate — contain-fit, NOT stretched, so the recesses the engine
  // controls mount into keep their authored proportions. Boxes measured off
  // each delivered PNG's alpha bbox (threshold 40) at 1536x1152.
  "panel-voice": { states: { base: "panel-voice" }, base: "panel-voice", content: [0.0221, 0.0304, 0.9779, 0.9679], stretch: false },
  "panel-keys": { states: { base: "panel-keys" }, base: "panel-keys", content: [0.0228, 0.0339, 0.9779, 0.9696], stretch: false },
  "panel-magic": { states: { base: "panel-magic" }, base: "panel-magic", content: [0.0208, 0.0286, 0.9792, 0.9696], stretch: false },
  // AR-052: the Workshop car's cabin, as two aligned layers for the SAME
  // 1612x430 punched void — rear interior behind the crew, foreground rail in
  // front of their legs. Both carry the full canvas as their content box on
  // purpose: they are registration-locked to each other, so measuring either
  // one's opaque bbox (the rail's art occupies only its bottom third) would
  // stretch that layer to the void and break the alignment the pair depends on.
  "workshop-car-interior": panelDef("workshop-car-interior", [0, 0, 1, 1]),
  "workshop-car-foreground-rail": panelDef("workshop-car-foreground-rail", [0, 0, 1, 1]),
  // AR-055: the same pair PER CAR TYPE — a hopper's slatted bin and a tanker's
  // steel cylinder are not a boxcar's timber room. Registered ahead of the art
  // so a delivered PNG needs no code change; `cabinFor` asks the ATLAS whether
  // each one exists yet and falls back to the shared pair until it does.
  ...Object.fromEntries(
    (["boxcar", "tanker", "hopper", "flatcar"] as const).flatMap((type) =>
      (["interior", "foreground-rail"] as const).map((layer) => {
        const id = `workshop-car-${layer}-${type}`;
        return [id, panelDef(id, [0, 0, 1, 1])] as const;
      }),
    ),
  ),
  "knob-wobble": { states: { base: "knob-wobble" }, base: "knob-wobble", content: [0.111, 0.074, 0.887, 0.891], stretch: false },
  "knob-crunch": { states: { base: "knob-crunch" }, base: "knob-crunch", content: [0.107, 0.088, 0.891, 0.9], stretch: false },
  // AR-026 delivered the pair: idle = lever down + OFF plaque, on = lever up +
  // ON plaque. The melody editor swaps frames; no mirrored-lever overlay left.
  "toggle-double": { states: { idle: "toggle-double-idle", on: "toggle-double-on" }, base: "toggle-double-idle", content: [0.199, 0.102, 0.799, 0.865], stretch: false },
  "fader-handle": { states: { base: "fader-handle" }, base: "fader-handle", content: [0.189, 0.316, 0.811, 0.662], stretch: false },
  // AR-016 edit-vs-new modal (baked KEEP EDITING / NEW CAR buttons — the scene
  // lays transparent hits over the two plaques).
  "modal-edit-or-new": { states: { base: "modal-edit-or-new" }, base: "modal-edit-or-new", content: [0.046, 0.103, 0.954, 0.865], stretch: false },
} as const;

/** The chalkboard's inner slate surface (where the note grid draws), normalized
 *  to the sequencer-chalkboard canvas — inside the wooden frame + chalk tray. */
export const CHALKBOARD_SLATE: ContentBox = [0.115, 0.14, 0.885, 0.82];

/**
 * AR-054's painted icon frame for a built-in sound, by catalogue `assetId`.
 *
 * The frame name is DERIVED, not tabulated: the drum ids are the file stems
 * (`kick` → `drum-kick`) and the tone ids differ only by the catalogue's
 * `note-` prefix (`note-do` → `tone-do`). A hand-written id→frame table would
 * be a second copy of the catalogue, and it would rot the first time a sound is
 * added.
 *
 * This returns a NAME, not a promise that the art exists — whether AR-054 drew
 * it is a question only the atlas can answer, so the drawing site checks with
 * `hasUiFrame` and keeps its emoji when the answer is no. Null here means the
 * lane has no built-in sound at all (a recording), which no icon can name.
 */
export function soundIconFrame(assetId: string | undefined): string | null {
  if (!assetId) return null;
  return assetId.startsWith("note-")
    ? `tone-${assetId.slice("note-".length)}`
    : `drum-${assetId}`;
}

/** True when the loaded chrome atlas carries `frame`. The atlas is the only
 *  honest answer to "did the artist draw this yet". */
export function hasUiFrame(scene: Phaser.Scene, frame: string | null | undefined): boolean {
  if (!frame || !scene.textures.exists(UI_ATLAS_KEY)) return false;
  return scene.textures.get(UI_ATLAS_KEY).has(frame);
}

/** Load the packed chrome multiatlas (idempotent). ONE atlas serves every
 *  scene — a handful of requests instead of ~38 per view switch, and the
 *  browser cache makes later navigations free. Call from a scene's `preload`. */
export function loadUiSprites(scene: Phaser.Scene): void {
  if (!scene.textures.exists(UI_ATLAS_KEY)) {
    // Both arguments are `public/` paths and BOTH must carry the deploy base.
    // The 3rd argument is Phaser's `path`: the atlas JSON lists its pages as
    // bare filenames ("ui-atlas-0.png"), and the loader prepends this path to
    // each (`Loader.setPath` appends the separating "/" itself, so no trailing
    // slash here). Left document-relative, the pages 404 whenever the document
    // base isn't the app directory — see `publicAssetUrl` in assets.ts.
    scene.load.multiatlas(
      UI_ATLAS_KEY,
      publicAssetUrl("assets/spritesheets/ui-atlas.json"),
      publicAssetUrl("assets/spritesheets"),
    );
  }
}

/** A target rect (screen px, centre origin) the placement math resolves a spawn to. */
export interface PlacedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Measured content boxes, keyed by texture. Scanning a texture's alpha costs a
 *  canvas readback, so it happens once per texture per session. */
const MEASURED = new Map<string, ContentBox>();

/**
 * The opaque content box of a STANDALONE texture, measured from its own pixels.
 *
 * The manifest above carries hand-measured boxes for atlas chrome, and that is
 * fine there because the manifest and the art land in the same delivery. The
 * Track's mode buttons are different: they are dropped into `sprites/track3/`
 * and picked up by a glob with no manifest entry at all, so the only place
 * their content box can come from is the pixels.
 *
 * It has to come from somewhere, because they are NOT consistent. Eight buttons
 * share a 260x120 canvas and the painted plaque inside runs from 258x120 (hill)
 * down to 205x102 (tunnel) and 226x73 (night). Drawn at one fixed scale — which
 * is what the legend did — night came out barely three-fifths the height of
 * hill, and the row read as buttons of eight different sizes. Contain-fitting
 * the measured content into one slot makes them identical on screen, whatever
 * padding each file happens to carry, and keeps doing so when the art is
 * redelivered.
 *
 * Returns the full canvas when the texture is missing or unreadable, which is
 * the old behaviour and never worse than it.
 */
export function measureContentBox(scene: Phaser.Scene, key: string): ContentBox {
  const cached = MEASURED.get(key);
  if (cached) return cached;
  const full: ContentBox = [0, 0, 1, 1];
  if (!scene.textures.exists(key)) return full; // not resident: do not cache
  const src = scene.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const w = src.width | 0;
  const h = src.height | 0;
  if (w === 0 || h === 0) return full;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return full;
  ctx.drawImage(src, 0, 0);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return full; // tainted canvas (a cross-origin texture) — not worth failing over
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      // 40, matching the threshold the manifest's boxes were measured at: a
      // stray chroma-key pixel at alpha 1..33 must not inflate the box.
      if (data[(y * w + x) * 4 + 3]! <= 40) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const box: ContentBox = x1 < 0 ? full : [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h];
  MEASURED.set(key, box);
  return box;
}

/**
 * The sprite's opaque CONTENT box, in unscaled texture pixels — the rect Phaser
 * should hit-test against.
 *
 * Phaser's default input rect for an Image is its whole frame. These canvases
 * carry a lot of transparent padding (the instrument characters run to roughly
 * 2x their content box), and at the depth chrome sits, that padding sat over the
 * Workshop's sequencer grid and swallowed taps meant for the cells underneath.
 * `placeUiSprite` only ever contain-fits the CONTENT, so the content box is what
 * the player sees and therefore what they should be able to hit.
 *
 * Deliberately derived from the BASE state, matching `placeUiSprite`: the
 * hover/active variants draw larger within the shared canvas, and that pop is
 * feedback, not a bigger target.
 *
 * Coordinates are unscaled because Phaser applies the game object's own
 * scale/position transform to its hit area — so this needs no update on relayout.
 */
export function contentHitRect(def: UiSpriteDef, texW: number, texH: number): PlacedRect {
  const [x0, y0, x1, y1] = def.content;
  return {
    x: x0 * texW,
    y: y0 * texH,
    width: Math.max(1e-6, (x1 - x0) * texW),
    height: Math.max(1e-6, (y1 - y0) * texH),
  };
}

/** `contains` for the plain rect `contentHitRect` returns. Phaser accepts any
 *  shape plus a matching callback, which lets this module stay Phaser-free
 *  (`import type` only) instead of pulling in `Phaser.Geom.Rectangle`. */
export function hitRectContains(rect: PlacedRect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

/**
 * Scale + position `img` so its BASE content box lands on `target`.
 *
 * - `stretch` (panels): the content box maps to the full target rect on BOTH axes
 *   (non-uniform), so the plate fills its zone exactly — matching the legacy
 *   composited Yard/Track panels.
 * - otherwise (buttons/instruments): the content is scaled UNIFORMLY to "contain"
 *   within the target rect (fit the binding axis), preserving the art's shape, and
 *   centred on the target — so hover/active variants that draw larger pop past it.
 *
 * The image keeps its default 0.5 origin; we offset the whole canvas so the
 * content centre (not the canvas centre) sits at the target centre.
 */
export function placeUiSprite(
  img: Phaser.GameObjects.Image,
  def: UiSpriteDef,
  target: PlacedRect,
): void {
  const texW = img.width || 1;
  const texH = img.height || 1;
  const [x0, y0, x1, y1] = def.content;
  const contentW = Math.max(1e-6, (x1 - x0) * texW);
  const contentH = Math.max(1e-6, (y1 - y0) * texH);

  // Opaque-padded canvases draw only their content region; position/scale math
  // is unaffected (setCrop works in un-scaled texture coordinates).
  if (def.crop) img.setCrop(x0 * texW, y0 * texH, contentW, contentH);

  const sx = target.width / contentW;
  const sy = target.height / contentH;
  const scaleX = def.stretch ? sx : Math.min(sx, sy);
  const scaleY = def.stretch ? sy : scaleX;

  img.setScale(scaleX, scaleY);
  // Content centre within the canvas, as an offset from the canvas centre (px),
  // then scaled — subtract so the content centre lands on the target centre.
  const cxOff = ((x0 + x1) / 2 - 0.5) * texW * scaleX;
  const cyOff = ((y0 + y1) / 2 - 0.5) * texH * scaleY;
  img.setPosition(target.x - cxOff, target.y - cyOff);
}
