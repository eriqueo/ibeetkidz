// Data-driven scene layout: parse a Tiled 1.10 object layer into normalized
// spawn descriptors. This REPLACES hand-measured coordinates in scene-layout.ts
// — the Tiled JSON (authored visually, exported as data) is the source of truth.
//
// This module is PURE: it validates + transforms JSON and knows nothing about
// Phaser, the DOM, or audio. A scene (the adapter, Phase B) consumes the
// descriptors to spawn sprites, wire EventBus actions, and apply safe-zone
// anchoring. Keeping it Phaser-free is what makes it fully unit-testable and is
// why the schema/parser can be proven against a fixture before any real art or
// scene rewrite lands — when a real Tiled export arrives, only pixel values move.
//
// Contract (Principle 4 — validate at the trust boundary): every interactive
// element is a Tiled object whose
//   - name   → the sprite/texture key (e.g. "icon-notepad", "btn-play")
//   - type   → a semantic class       (e.g. "toolbar", "instrument", "transport")
//   - x/y/w/h → its pixel rect on the source image
//   - custom properties:
//       action (string) → EventBus event to emit on tap (absent ⇒ non-interactive)
//       arg    (string|int) → single payload for that event (e.g. a toolId/delta)
//       anchor (string) → "bg" (default) | "top-right" | "bottom-center"
import { z } from "zod";

// ── Tiled 1.10 JSON shapes (only the parts we consume; rest passes through) ──
const PropValue = z.union([z.string(), z.number(), z.boolean()]);
const TiledProperty = z.object({
  name: z.string(),
  type: z.string(),
  value: PropValue,
});

const TiledObject = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string().default(""), // Tiled "Class" (serialized as `type` in 1.10 JSON)
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rotation: z.number().optional(),
  visible: z.boolean().optional(),
  gid: z.number().optional(), // present when placed as a tile object (Insert Tile)
  properties: z.array(TiledProperty).optional(),
});
export type TiledObject = z.infer<typeof TiledObject>;

const TiledLayer = z
  .object({
    name: z.string(),
    type: z.string(),
    objects: z.array(TiledObject).optional(),
  })
  .passthrough();

export const TiledMapSchema = z
  .object({
    type: z.literal("map"),
    width: z.number().int().positive(), // in TILES
    height: z.number().int().positive(), // in TILES
    tilewidth: z.number().int().positive(),
    tileheight: z.number().int().positive(),
    layers: z.array(TiledLayer).min(1),
  })
  .passthrough();
export type TiledMap = z.infer<typeof TiledMapSchema>;

// ── Normalized spawn descriptor (what a scene consumes) ──────────────────────
export const ANCHORS = ["bg", "ui-top-right", "ui-bottom-center"] as const;
export type Anchor = (typeof ANCHORS)[number];

export interface TiledSpawn {
  /** object.name → sprite/texture key. */
  id: string;
  /** object.type → semantic class ("toolbar" | "instrument" | "transport" | …). */
  klass: string;
  /** Three-Zone UI: the `sprite` custom property → a UI_SPRITES base id
   *  (e.g. "btn-play", "inst-drums", "panel-header"). Absent ⇒ the spawn has no
   *  standalone art and renders as a transparent hit-area (legacy behaviour). */
  sprite?: string;
  /** The `label` custom property → a caption rendered under a button sprite
   *  (icon-only transport buttons). Absent ⇒ no caption (e.g. plaques with
   *  baked-in text). */
  label?: string;
  /** Normalized centre on the source image, 0..1 (resolution-independent). */
  cx: number;
  cy: number;
  /** Normalized size, 0..1. */
  w: number;
  h: number;
  /** EventBus event to emit on tap; absent ⇒ non-interactive (e.g. an LCD anchor). */
  action?: string;
  /** Single payload to emit with `action` (toolId, nav view, tempo delta, …). */
  arg?: string | number;
  /** Viewport safe-zone behaviour for the spawned sprite. */
  anchor: Anchor;
}

function recordOf(
  props: readonly z.infer<typeof TiledProperty>[] | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const p of props ?? []) out[p.name] = p.value;
  return out;
}

function toAnchor(v: string | number | boolean | undefined): Anchor {
  return typeof v === "string" && (ANCHORS as readonly string[]).includes(v)
    ? (v as Anchor)
    : "bg";
}

// Tiled rectangle objects anchor at top-left; tile objects (with a gid, placed
// via Insert Tile) anchor at bottom-left. Resolve both to a true centre so the
// descriptor is anchoring-convention-agnostic.
function centrePx(o: TiledObject): { cx: number; cy: number } {
  return {
    cx: o.x + o.width / 2,
    cy: o.gid !== undefined ? o.y - o.height / 2 : o.y + o.height / 2,
  };
}

/**
 * Validate a Tiled map and project the named object layer into normalized spawn
 * descriptors. Throws (ZodError) if the JSON is not a valid Tiled map, or Error
 * if the named object layer is absent. An empty object layer yields `[]`.
 */
export function parseTiledLayer(mapJson: unknown, layerName: string): TiledSpawn[] {
  const map = TiledMapSchema.parse(mapJson);
  const pxW = map.width * map.tilewidth;
  const pxH = map.height * map.tileheight;

  const layer = map.layers.find((l) => l.type === "objectgroup" && l.name === layerName);
  if (!layer) {
    const groups = map.layers.filter((l) => l.type === "objectgroup").map((l) => l.name);
    throw new Error(
      `Tiled map has no object layer named "${layerName}". Object layers: [${groups.join(", ")}]`,
    );
  }

  return (layer.objects ?? []).map((o) => {
    const props = recordOf(o.properties);
    const { cx, cy } = centrePx(o);
    const action = props["action"];
    const arg = props["arg"];
    const sprite = props["sprite"];
    const label = props["label"];

    const spawn: TiledSpawn = {
      id: o.name,
      klass: o.type,
      cx: cx / pxW,
      cy: cy / pxH,
      w: o.width / pxW,
      h: o.height / pxH,
      anchor: toAnchor(props["anchor"]),
    };
    // exactOptionalPropertyTypes: only attach optional keys when truly present.
    if (typeof action === "string" && action.length > 0) spawn.action = action;
    if (typeof arg === "string" || typeof arg === "number") spawn.arg = arg;
    if (typeof sprite === "string" && sprite.length > 0) spawn.sprite = sprite;
    if (typeof label === "string" && label.length > 0) spawn.label = label;
    return spawn;
  });
}
