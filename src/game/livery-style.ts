// What a car's identity LOOKS like, as pure data + arithmetic.
//
// `core/car-identity.ts` decides WHICH livery a car wears and WHAT it carries;
// this module turns those two numbers into a colour, a shape and a contrasting
// ink. Phaser-free (`car-livery.ts` does the drawing) so the contrast rule and
// the glyph assignment are reachable by the unit suite — a livery whose glyph
// is invisible against its own panel is exactly the kind of failure that never
// shows up in the one screenshot somebody happens to take.
import { CAR_COLORS } from "../core/car-identity.ts";
import type { LaneGroup } from "../core/lane-color.ts";

/** Cream chip face + dark-plum edge — the `undo-toast` / LCD chip language, so
 *  the livery invents no new dialect. */
export const CHIP_FACE = 0xe9d7ac;
export const CHIP_EDGE = 0x2b2440;
export const CHIP_EDGE_CSS = "#2b2440";

/**
 * Instrument family → the `inst-*` sprite that stands for it.
 *
 * THE single producer of this mapping. It was previously written out twice —
 * `tool-panels.ts`'s shelf list and a `laneGroup(...) === "tone"` ternary in
 * `Workshop.tsx` — and a third copy for the Yard's car loads would have made
 * "which picture means drums" a fact with three owners. `tool-panels.ts` now
 * derives its shelf sprites from this table.
 *
 * Atlas frame names live in `src/game/` on purpose: the core names families,
 * not textures.
 */
export const LANE_GROUP_SPRITE: Readonly<Record<LaneGroup, string>> = {
  drum: "inst-drums",
  tone: "inst-pads",
  melody: "inst-piano",
  voice: "inst-mic",
};

/** The eight livery shapes, indexed by `liveryIndex % 8`. All eight read at
 *  ~20 px and in monochrome, which is the whole point of having them: shape and
 *  colour move together, so either channel alone names the car. */
export const LIVERY_GLYPHS = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "star",
  "plus",
  "hexagon",
  "ring",
] as const;
export type LiveryGlyph = typeof LIVERY_GLYPHS[number];

/** Non-negative modulo, so a stray negative index still resolves. */
const wrap = (i: number, n: number): number => ((i % n) + n) % n;

export const glyphFor = (liveryIndex: number): LiveryGlyph =>
  LIVERY_GLYPHS[wrap(liveryIndex, LIVERY_GLYPHS.length)] as LiveryGlyph;

export const colorFor = (liveryIndex: number): string =>
  CAR_COLORS[wrap(liveryIndex, CAR_COLORS.length)] as string;

/** `#rrggbb` → 0xrrggbb. Hand-rolled rather than `Phaser.Display.Color` so this
 *  module needs no Phaser at runtime. */
export function hexToInt(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16) | 0;
}

/** Rec. 601 luma of a `#rrggbb` colour, 0..1 — "how bright does this look" for
 *  a flat fill. */
export function luma(hex: string): number {
  const v = hexToInt(hex);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Ink that contrasts with `hex`: dark plum on a light livery, cream on a dark
 * one.
 *
 * The brief's accessibility note asks for a contrast check of the colour field
 * against the chip, not against the background — this is that check, done once
 * at draw time instead of eyeballed per palette entry, so adding a colour to
 * `CAR_COLORS` cannot silently produce an unreadable glyph. `paper` (#f4e8c1)
 * is the entry that proves it is needed: a cream glyph on it would vanish.
 */
export function inkOn(hex: string): number {
  return luma(hex) > 0.55 ? CHIP_EDGE : CHIP_FACE;
}
