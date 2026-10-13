// Editor entry point. The ONLY module outside `src/editor/` that references this
// is `src/app/context.tsx`, and it does so through a single dynamic `import()`
// inside an `import.meta.env.DEV` branch — so this file and everything it pulls
// in become a separate chunk that a production build has no reference to.
//
// Three independent guards keep it out of what Eric's kids run:
//   1. `import.meta.env.DEV` — the call site is compile-time dead in a build.
//   2. the dynamic import — nothing in the production graph names this module.
//   3. `scripts/check-no-editor-in-dist.sh` — greps the built output for the
//      marker below and EXITS NON-ZERO. That is the one that fails a build.
//
// `tests/unit/architecture.test.ts` rule 6 asserts guard 2 stays true.
import type Phaser from "phaser";
import { parseTiledLayer, type TiledSpawn } from "../game/TiledParser.ts";
import { openMap } from "./tiled-mutate.ts";
import { readHandle } from "./scene-handle.ts";
import { EditorOverlay } from "./EditorOverlay.ts";
import type { DevRail } from "./dev-rail.ts";

/** The string `check-no-editor-in-dist.sh` looks for. Do not change it without
 *  changing the script; it is the only thing standing between the editor and a
 *  production bundle. */
export const EDITOR_MARKER = "IBK_SCENE_EDITOR_DEV_ONLY";

const MAPS = import.meta.glob<{ default: unknown }>("../assets/maps/*.json");

let active: EditorOverlay | null = null;

/** Is `?edit` on the URL? */
export function editorRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("edit");
}

/**
 * Attach the editor to a scene that has just become ready. Safe to call for
 * every scene: a scene with no `editorHandle` is simply skipped.
 */
export async function attachEditor(scene: Phaser.Scene): Promise<void> {
  installDevHooks();
  // Torn down here, not only when the new scene has a handle: a scene without
  // one must not keep a stale overlay (and its selection) alive.
  active?.destroy();
  active = null;
  void ensureRail();
  const handle = readHandle(scene);
  if (!handle) return;

  const loader = MAPS[`../assets/maps/${handle.mapName}.json`];
  if (!loader) {
    console.warn(`[${EDITOR_MARKER}] no map file for "${handle.mapName}"`);
    return;
  }
  const mod = await loader();
  const edit = openMap(handle.mapName, mod.default);

  const reparse = (): TiledSpawn[] => parseTiledLayer(edit.raw, handle.layerName);
  active = new EditorOverlay({ scene, handle, edit, reparse, active: dragging });
  console.info(`[${EDITOR_MARKER}] editing ${handle.mapName}.json / ${handle.layerName}`);
}

/** `?edit`'s drag/play switch. Held here, not on the overlay, because each
 *  scene gets a fresh overlay and the choice must survive the trip. */
let dragging = true;

function setDragging(on: boolean): void {
  dragging = on;
  active?.setActive(on);
  rail?.refresh();
}

let rail: DevRail | null = null;
let railLoading: Promise<void> | null = null;

/** Mount the dev rail once per page; afterwards just re-mark the current
 *  screen. Called on every scene-ready from both surfaces. */
async function ensureRail(): Promise<void> {
  if (rail) {
    rail.refresh();
    return;
  }
  railLoading ??= import("./dev-rail.ts").then(({ DevRail: Rail }) => {
    const hooks = editorRequested()
      ? { drag: { get: () => dragging, set: setDragging }, selected: () => active?.selectedId }
      : {};
    rail = new Rail(hooks);
    if (editorRequested()) {
      window.addEventListener("keydown", (e: KeyboardEvent) => {
        const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select");
        if (e.key === "`" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setDragging(!dragging);
        }
      });
    }
  });
  await railLoading;
}

export function detachEditor(): void {
  active?.destroy();
  active = null;
}

/** Is `?tune` on the URL? */
export function tuneRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("tune");
}

let tune: { destroy(): void } | null = null;

/** Open the game-config tune panel, once per page. It is DOM, not Phaser, so
 *  it outlives every scene it re-mounts; calling this on each scene-ready is
 *  harmless. */
export async function attachTune(): Promise<void> {
  installDevHooks();
  void ensureRail();
  if (tune) return;
  const { TunePanel } = await import("./tune-panel.ts");
  tune = new TunePanel();
}

let hooksInstalled = false;

/**
 * What every dev surface gets for free once this chunk is loaded: window
 * errors are remembered for the state dump, and ctrl+shift+D writes the dump
 * (`state-dump.ts`) from any view — `?edit` has no panel to put a button on,
 * and a bug is usually seen while editing, not while tuning.
 */
export function installDevHooks(): void {
  if (hooksInstalled || typeof window === "undefined") return;
  hooksInstalled = true;
  void import("./state-dump.ts").then((m) => {
    m.captureErrors();
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void m.dumpState().then((detail) => console.info(`[${EDITOR_MARKER}] ${detail}`));
      }
    });
  });
}
