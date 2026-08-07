// Terrain: the physical thing the train rides through, expressed as what it
// does to the music. A hill slows the song, a bridge opens it up, rain roughs
// it up. Kids pick a terrain the way you pick a Lemmings job — it lands on the
// NEXT bar, holds a couple of bars, then the world goes back to normal.
//
// This module is pure data + pure math. It names no audio vendor and holds no
// timing: `SoundPort.scheduleTerrain` owns *when* (it has the transport), this
// owns *what*. That split is what keeps the mechanic out of the render loop —
// see PROJECT_CHARTER.md Decision A4: the train never drives the audio.
//
// Terrain is EPHEMERAL session state, like a held item. It is deliberately not
// a `Command`, has no reducer entry, and never enters the undo history: it is a
// performance, not part of the kid's saved composition.

/** The terrains a kid can ride through. */
export type TerrainKind = "hill" | "bridge" | "rain";

/** What a terrain does to the sound, as vendor-free numbers. */
export interface TerrainEffect {
  /** Tempo multiplier. 1 = unchanged; below 1 = slower (and lower-pitched). */
  readonly tempoScale: number;
  /** Master reverb send, 0..1 (0 = dry). */
  readonly reverb: number;
  /** Master roughness / overdrive, 0..1 (0 = clean). Deliberately NOT bitcrush:
   *  Tone's BitCrusher is an AudioWorklet node, and an AudioWorklet cannot be
   *  constructed outside a secure context — building one at boot crashed the
   *  page on any plain-http origin. Waveshaping overdrive needs no worklet, and
   *  it is the better sound for rain anyway. */
  readonly grit: number;
  /** How long the change glides in or out, in beats. A hill is a slope; a
   *  bridge you are simply on or off. */
  readonly rampBeats: number;
}

/** Flat, dry, normal — what every terrain reverts to. */
export const NEUTRAL_TERRAIN: TerrainEffect = {
  tempoScale: 1,
  reverb: 0,
  grit: 0,
  rampBeats: 1,
};

/** How many bars a terrain holds before reverting, unless the caller says
 *  otherwise. Eric's brief: "a determined set of time, maybe a couple bars, so
 *  it isn't too quick." */
export const DEFAULT_HOLD_BARS = 2;

export const TERRAIN: Readonly<Record<TerrainKind, TerrainEffect>> = {
  // Going uphill: the train labours, so the whole song leans back. The pitch
  // drops with it (baked loops follow via playbackRate), which is exactly what
  // a machine under load sounds like.
  hill: { tempoScale: 0.72, reverb: 0, grit: 0, rampBeats: 2 },
  // A bridge is a big empty space under a hard deck: the song opens out.
  bridge: { tempoScale: 1, reverb: 0.62, grit: 0, rampBeats: 0.25 },
  // Rain roughs the signal up, with just enough space to sound weather-y.
  rain: { tempoScale: 1, reverb: 0.12, grit: 0.65, rampBeats: 0.5 },
};

export const TERRAIN_KINDS: readonly TerrainKind[] = ["hill", "bridge", "rain"];

export function isTerrainKind(value: string): value is TerrainKind {
  return (TERRAIN_KINDS as readonly string[]).includes(value);
}

/** The effect for a terrain. Unknown kinds fall back to flat ground rather than
 *  throwing — a bad map edit should not be able to silence the song. */
export function terrainEffect(kind: TerrainKind): TerrainEffect {
  return TERRAIN[kind] ?? NEUTRAL_TERRAIN;
}

/** Seconds per beat at a tempo. */
export function beatSeconds(bpm: number): number {
  return 60 / Math.max(1, bpm);
}

/** How long a terrain's glide lasts in seconds at a given tempo. Clamped to a
 *  floor so a ramp is never a click, and to a ceiling so it always finishes
 *  well inside the bars it holds for. */
export function rampSeconds(
  effect: TerrainEffect,
  bpm: number,
  holdBars: number,
  beatsPerBar = 4,
): number {
  const perBeat = beatSeconds(bpm);
  const hold = Math.max(1, holdBars) * beatsPerBar * perBeat;
  return Math.min(hold * 0.4, Math.max(0.02, effect.rampBeats * perBeat));
}

/** Guard a tempo multiplier into a range that stays musical and keeps the
 *  transport well away from 0 (which would stall it outright). */
export function clampTempoScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(2, Math.max(0.25, scale));
}

/** Guard a wet/send amount into 0..1. */
export function clampSend(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
