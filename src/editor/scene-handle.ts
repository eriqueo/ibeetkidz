// The contract between a live scene and the editor.
//
// Each view scene publishes one of these on `BackgroundScene.editorHandle` at
// the end of `create()`, behind `import.meta.env.DEV`. The scene knows nothing
// about the editor — the field is typed `unknown` over there — so the dependency
// arrow only ever points editor → game.
//
// The two scene shapes are NOT the same. Workshop / Yard / Track spawn their
// chrome through `spawnUiLayer` and relayout with `relayoutUiLayer`; Map is
// still on the older `spawnTiledScene` / `relayoutSpawns` pair. Normalizing that
// difference is this module's whole job, so nothing downstream has to care.
import type { TiledSpawn } from "../game/TiledParser.ts";

/** What a scene hands the editor. Deliberately tiny: the parsed spawns (held by
 *  REFERENCE, which is what makes live preview free — see tiled-mutate.ts), the
 *  background rect every anchor is relative to, and a way to ask the scene to
 *  re-run its own layout. */
export interface EditorSceneHandle {
  /** Which map file this scene was built from, e.g. "workshop". */
  readonly mapName: string;
  /** The layer within that file, e.g. "ui-layer". */
  readonly layerName: string;
  /** The live spawn array. Mutating an element in place and calling `relayout`
   *  is the entire preview mechanism. */
  readonly spawns: readonly TiledSpawn[];
  /** Re-run the scene's own layout pass. */
  relayout(): void;
  /** The scene's current background rect — the anchor space for `placeSpawn`. */
  backgroundRect(): { x: number; y: number; width: number; height: number };
  /** Current camera size, the other input `placeSpawn` needs. */
  cameraSize(): { width: number; height: number };
}

/** A scene that MAY carry a handle (every `BackgroundScene` does structurally;
 *  only DEV builds populate it). */
export interface MaybeEditable {
  editorHandle?: unknown;
}

/** Read a handle off a scene, or null if this build never installed one. */
export function readHandle(scene: unknown): EditorSceneHandle | null {
  const h = (scene as MaybeEditable | null)?.editorHandle;
  if (!h || typeof h !== "object") return null;
  const cand = h as Partial<EditorSceneHandle>;
  if (typeof cand.mapName !== "string" || !Array.isArray(cand.spawns)) return null;
  if (typeof cand.relayout !== "function") return null;
  return cand as EditorSceneHandle;
}
