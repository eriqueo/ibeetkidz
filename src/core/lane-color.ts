// Lane colour derivation. Moved here from the deleted v1 `machines/tools.tsx`
// (ticket M1) — it is pure data + a pure function over core types, so it
// belongs in the core, not in a React module. No framework, no adapter.

import type { Clip, LaneKind } from "./types.ts";
import { BUILTIN_SOUNDS } from "./sound-catalog.ts";

/** Instrument FAMILY a lane belongs to. Lane color is DERIVED from this —
 *  consistent per group (all drums share a hue, all melodies another, your voice
 *  another), so the mix reads by color = kind, never a random per-clip swatch. */
export type LaneGroup = "drum" | "tone" | "melody" | "voice";

const GROUP_COLORS: Record<LaneGroup, string> = {
  drum: "#ef476f", // percussion — warm red/pink
  tone: "#3a86ff", // pitched pads (Do/Re/Mi…) — blue
  melody: "#06d6a0", // melody grid — green/teal
  voice: "#ffd166", // recordings (voice + Magic Pad) — gold
};

export const laneGroup = (kind: LaneKind, clip?: Clip): LaneGroup => {
  if (kind === "melody") return "melody";
  const source = clip?.source;
  if (source?.kind === "recording") return "voice";
  if (source?.kind === "builtin") {
    const snd = BUILTIN_SOUNDS.find((s) => s.assetId === source.assetId);
    if (snd?.recipe.kind === "tone") return "tone";
  }
  return "drum";
};

export const laneColor = (kind: LaneKind, clip?: Clip): string =>
  GROUP_COLORS[laneGroup(kind, clip)];
