// Mutating a Tiled map file in memory, safely.
//
// The one rule here: mutate LEAF VALUES on the raw imported JSON. Never rebuild
// a map, and never round-trip it through a parser.
//
// Two separate losses make that rule necessary:
//
//  1. `TiledSpawn` is a lossy PROJECTION. `parseTiledLayer` reads a handful of
//     fields and drops the rest — the numeric `id`, `rotation`, `visible`,
//     `gid`, polygons, every custom property nothing consumes yet, plus all
//     non-object layers, the tilesets, and the editor settings Tiled
//     round-trips. Serializing a rebuild would quietly delete all of it.
//  2. `TiledMapSchema.parse` is ALSO lossy, less obviously. `TiledMapSchema` and
//     `TiledLayer` are `.passthrough()`, but `TiledObject` is not — so parse
//     output silently drops any object key the schema does not name (`ellipse`,
//     `point`, `text`, `template`…). So we validate WITH the schema and then
//     throw its output away, serializing the clone instead.
//
// Because the only changes are leaf values, `JSON.stringify(raw, null, 2)`
// preserves key order and matches Tiled 1.10's own formatting — which makes
// `git diff` a trustworthy review of a whole editing session, and a no-op drag
// a zero-line diff.
import { TiledMapSchema } from "../game/TiledParser.ts";

/** The shape we need to walk. Everything else on the JSON rides along untouched
 *  precisely because we never re-emit it from a typed model. */
interface RawObject {
  id?: number;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gid?: number;
  polygon?: unknown;
  polyline?: unknown;
}

interface RawLayer {
  name?: string;
  type?: string;
  objects?: RawObject[];
}

export interface RawMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: RawLayer[];
}

/** A map file being edited, plus the pristine text to diff against. */
export interface EditableMap {
  readonly name: string;
  /** The mutable clone. Serialize THIS — not a parse result. */
  readonly raw: RawMap;
  /** Serialization of the map as imported, for change detection. */
  readonly baseline: string;
}

/** Clone + validate. Throws if the input is not a well-formed Tiled map, so a
 *  malformed file is rejected at the boundary rather than half-edited. */
export function openMap(name: string, imported: unknown): EditableMap {
  TiledMapSchema.parse(imported); // validate only; the OUTPUT is deliberately discarded
  const raw = structuredClone(imported) as RawMap;
  return { name, raw, baseline: serializeMap(raw) };
}

/** Map pixel dimensions — the space Tiled object coordinates live in. */
export function mapPixelSize(map: RawMap): { w: number; h: number } {
  return { w: map.width * map.tilewidth, h: map.height * map.tileheight };
}

/** Why an object cannot be dragged. Returned rather than thrown so the editor
 *  can refuse a gesture with a reason instead of crashing the page. */
export type MoveRefusal = "no-such-layer" | "no-such-object" | "tile-anchored" | "not-a-rect";

/**
 * Write a new rect onto one object, in place.
 *
 * Refuses `gid` objects. `centrePx` treats those as BOTTOM-left anchored rather
 * than top-left, so writing a top-left rect to one would silently shift it by
 * its own height. No map uses `gid` today; refusing is cheaper than carrying an
 * untested second convention, and a refusal is visible where a silent shift is
 * not. Polygons are refused for the same reason — their geometry lives in
 * `polygon`/`polyline`, which a rect write would not touch.
 */
export function moveObject(
  map: RawMap,
  layerName: string,
  objectName: string,
  rect: { x: number; y: number; width: number; height: number },
): MoveRefusal | null {
  const layer = map.layers.find((l) => l.type === "objectgroup" && l.name === layerName);
  if (!layer?.objects) return "no-such-layer";
  const obj = layer.objects.find((o) => o.name === objectName);
  if (!obj) return "no-such-object";
  if (obj.gid !== undefined) return "tile-anchored";
  if (obj.polygon !== undefined || obj.polyline !== undefined) return "not-a-rect";

  obj.x = rect.x;
  obj.y = rect.y;
  obj.width = rect.width;
  obj.height = rect.height;
  return null;
}

/** The exact bytes to write to disk.
 *
 *  The four committed maps were normalized to exactly this form (verified: each
 *  file is byte-identical to `JSON.stringify(JSON.parse(file), null, 2) + "\n"`,
 *  and each normalization was checked deep-equal before being written). That
 *  normalization is what makes a no-op drag a zero-line diff.
 *
 *  It was NOT free, and it is worth knowing why. Tiled 1.10 and `JSON.stringify`
 *  disagree twice: Tiled omitted the trailing newline on three of the four
 *  files, and it writes whole floats as `1981.0` where JS can only write `1981`
 *  (JSON has no int/float distinction, so this is not fixable in JS). Left
 *  alone, editing `track.json` would have produced 30 lines of incidental churn
 *  around every real change.
 *
 *  Consequence to expect: re-saving a map from Tiled itself reintroduces the
 *  `.0` style, and the next editor save will normalize it back out. That shows
 *  up as one noisy diff, once, and is not a bug. */
export function serializeMap(map: RawMap): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

/** Has anything actually changed since the file was opened? */
export function isDirty(edit: EditableMap): boolean {
  return serializeMap(edit.raw) !== edit.baseline;
}
