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

const btn = (file: string): string =>
  new URL(`../assets/sprites/buttons/${file}`, import.meta.url).href;
const inst = (file: string): string =>
  new URL(`../assets/sprites/instruments/${file}`, import.meta.url).href;
const panel = (file: string): string =>
  new URL(`../assets/sprites/panels/${file}`, import.meta.url).href;

/** Normalized opaque-content box within a sprite's own canvas, `[x0,y0,x1,y1]`. */
export type ContentBox = readonly [number, number, number, number];

/** A UI sprite: its per-state texture keys + the base state's content box. The
 *  texture KEY equals the file stem (e.g. "btn-play-idle") so it is trivially
 *  derivable and stable across the manifest. */
export interface UiSpriteDef {
  /** texture key → source URL, loaded in `loadUiSprites`. */
  readonly textures: Readonly<Record<string, string>>;
  /** state name → texture key (the state machine the adapter swaps between). */
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
  const textures: Record<string, string> = { [idleKey]: btn(`${id}-idle.png`) };
  const states: Record<string, string> = { idle: idleKey };
  if (opts.pressed ?? true) {
    const pk = `${id}-pressed`;
    textures[pk] = btn(`${id}-pressed.png`);
    states["pressed"] = pk;
  }
  return { textures, states, base: idleKey, content: opts.content ?? BUTTON_CONTENT, stretch: false };
}

// Car-type picker tiles: an idle art plus (boxcar only) a `selected` highlight.
function pickerDef(type: string, content: ContentBox, selected = false): UiSpriteDef {
  const idleKey = `btn-picker-${type}-idle`;
  const textures: Record<string, string> = { [idleKey]: btn(`btn-picker-${type}-idle.png`) };
  const states: Record<string, string> = { idle: idleKey };
  if (selected) {
    const sk = `btn-picker-${type}-selected`;
    textures[sk] = btn(`btn-picker-${type}-selected.png`);
    states["selected"] = sk;
  }
  return { textures, states, base: idleKey, content, stretch: false };
}

function instrumentDef(id: string, content: ContentBox): UiSpriteDef {
  const p = `${id}-passive`, h = `${id}-hover`, a = `${id}-active`;
  return {
    textures: { [p]: inst(`${id}-passive.png`), [h]: inst(`${id}-hover.png`), [a]: inst(`${id}-active.png`) },
    states: { passive: p, hover: h, active: a },
    base: p,
    content,
    stretch: false,
  };
}

function panelDef(id: string, content: ContentBox): UiSpriteDef {
  return { textures: { [id]: panel(`${id}.png`) }, states: { base: id }, base: id, content, stretch: true };
}


/** The full Three-Zone UI sprite manifest, keyed by base id (= Tiled `sprite`). */
export const UI_SPRITES: Readonly<Record<string, UiSpriteDef>> = {
  // Workshop top-bar: the New Car plaque (nav plaques are the shared set below).
  "btn-newcar": buttonDef("btn-newcar", { content: [0.098, 0.179, 0.901, 0.81] }),
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
  // Field instruments (content boxes measured from the passive PNGs' opaque bbox).
  "inst-drums": instrumentDef("inst-drums", [0.05, 0.285, 0.959, 0.77]),
  "inst-guitar": instrumentDef("inst-guitar", [0.053, 0.109, 0.956, 0.865]),
  "inst-keys": instrumentDef("inst-keys", [0.085, 0.131, 0.953, 0.98]),
  "inst-mic": instrumentDef("inst-mic", [0.094, 0.14, 0.88, 0.853]),
  "inst-violin": instrumentDef("inst-violin", [0.169, 0.101, 0.815, 0.881]),
  "inst-piano": instrumentDef("inst-piano", [0.04, 0.072, 0.96, 0.931]),
  // Zone plates (stretched to their Tiled rect, like the legacy Yard/Track panels).
  // panel-header/transport PNGs are pre-trimmed (whole canvas = content); the
  // yard actions plate carries transparent margins, so it passes a measured box.
  "panel-header": panelDef("panel-header", [0, 0, 1, 1]),
  "panel-header-v2": panelDef("panel-header-v2", [0, 0, 1, 1]),
  "panel-transport-v2": panelDef("panel-transport-v2", [0.0164, 0.2066, 0.981, 0.7283]),
  "panel-yard-actions": panelDef("panel-yard-actions", [0.021, 0.325, 0.979, 0.672]),
} as const;

/** Load manifest textures (idempotent — skips already-loaded keys). Call from a
 *  scene's `preload`. Pass `only` (UI_SPRITES base ids, e.g. derived from the
 *  scene's parsed Tiled spawns) to load just that scene's chrome; omit it to
 *  load everything (Workshop needs off-map sprites like the picker tiles). */
export function loadUiSprites(scene: Phaser.Scene, only?: readonly string[]): void {
  const wanted = only === undefined ? undefined : new Set(only);
  for (const [id, def] of Object.entries(UI_SPRITES)) {
    if (wanted !== undefined && !wanted.has(id)) continue;
    for (const [key, url] of Object.entries(def.textures)) {
      if (!scene.textures.exists(key)) scene.load.image(key, url);
    }
  }
}

/** A target rect (screen px, centre origin) the placement math resolves a spawn to. */
export interface PlacedRect {
  x: number;
  y: number;
  width: number;
  height: number;
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
