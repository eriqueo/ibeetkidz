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
  const handle = readHandle(scene);
  if (!handle) return;

  active?.destroy();
  active = null;

  const loader = MAPS[`../assets/maps/${handle.mapName}.json`];
  if (!loader) {
    console.warn(`[${EDITOR_MARKER}] no map file for "${handle.mapName}"`);
    return;
  }
  const mod = await loader();
  const edit = openMap(handle.mapName, mod.default);

  const reparse = (): TiledSpawn[] => parseTiledLayer(edit.raw, handle.layerName);
  active = new EditorOverlay({ scene, handle, edit, reparse });
  console.info(`[${EDITOR_MARKER}] editing ${handle.mapName}.json / ${handle.layerName}`);
}

export function detachEditor(): void {
  active?.destroy();
  active = null;
}
