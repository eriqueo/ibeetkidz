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

/** The terrains a kid can ride through — the ones with world GEOMETRY. */
export type TerrainKind = "hill" | "bridge" | "rain";

/** Every latchable ride mode: the geometry trio plus the atmosphere/scale
 *  switches. All of them STACK — a night ride through rain on a hill in a
 *  tiny train is one combined effect (see `combineModes`) — and each toggles
 *  off independently. BACKWARDS is deliberately not here: it reverses
 *  buffers rather than shaping the mix, and stacks with all of these via its
 *  own switch. */
export type ModeKind = TerrainKind | "night" | "tunnel" | "tiny" | "giant";

/** Where a terrain landed, in ABSOLUTE transport bars. Returned by the port
 *  because only the transport knows — and handing it back is what lets the
 *  Track draw the hill in the right place without ever computing the bar
 *  itself. The audio clock decides; the picture follows. */
export interface TerrainRide {
  readonly kind: TerrainKind;
  /** First bar the terrain is in force. */
  readonly startBar: number;
  /** First bar it is NOT: the ride covers `[startBar, endBar)`. */
  readonly endBar: number;
}

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
  /** Master muffle, 0..1 (0 = fully open, 1 = deep low-pass). A tunnel. */
  readonly muffle: number;
  /** Master slap-echo send, 0..1 (0 = dry). The tunnel answering back. */
  readonly echo: number;
  /** How long the change glides in or out, in beats. A hill is a slope; a
   *  bridge you are simply on or off. */
  readonly rampBeats: number;
}

/** Flat, dry, normal — what every terrain reverts to. */
export const NEUTRAL_TERRAIN: TerrainEffect = {
  tempoScale: 1,
  reverb: 0,
  grit: 0,
  muffle: 0,
  echo: 0,
  rampBeats: 1,
};

/** How many bars a terrain holds before reverting, unless the caller says
 *  otherwise. Eric's brief: "a determined set of time, maybe a couple bars, so
 *  it isn't too quick." */
export const DEFAULT_HOLD_BARS = 2;

export const TERRAIN: Readonly<Record<ModeKind, TerrainEffect>> = {
  // Going uphill: the train labours, so the whole song leans back. The pitch
  // drops with it (baked loops follow via playbackRate), which is exactly what
  // a machine under load sounds like.
  hill: { tempoScale: 0.72, reverb: 0, grit: 0, muffle: 0, echo: 0, rampBeats: 2 },
  // A bridge is a big empty space under a hard deck: the song opens out.
  bridge: { tempoScale: 1, reverb: 0.62, grit: 0, muffle: 0, echo: 0, rampBeats: 0.25 },
  // Rain roughs the signal up, with just enough space to sound weather-y.
  // Grit backed off from 0.65 (2026-08-13): at 0.65 into the master shaper the
  // full mix broke up into aliasing crackle that Eric reported as "audio
  // skipping, especially with the rain" — the distortion node now oversamples
  // (see the adapter) and the send sits where rough stays musical.
  rain: { tempoScale: 1, reverb: 0.22, grit: 0.42, muffle: 0, echo: 0, rampBeats: 0.5 },
  // Night: the song slows into a lullaby and opens into a big dark space,
  // with the top rolled off a touch — half asleep, not underwater.
  night: { tempoScale: 0.62, reverb: 0.55, grit: 0, muffle: 0.25, echo: 0, rampBeats: 2 },
  // A tunnel: muffled hard, and the walls answer back.
  tunnel: { tempoScale: 1, reverb: 0.15, grit: 0, muffle: 0.8, echo: 0.5, rampBeats: 0.5 },
  // Tiny train: everything small, fast and squeaky. The tempo lever shifts
  // pitch with speed (baked loops follow via playbackRate) — that IS the joke.
  tiny: { tempoScale: 1.45, reverb: 0, grit: 0, muffle: 0, echo: 0, rampBeats: 1 },
  // Giant train: huge, slow, booming.
  giant: { tempoScale: 0.62, reverb: 0.25, grit: 0, muffle: 0.15, echo: 0, rampBeats: 1 },
};

export const MODE_KINDS: readonly ModeKind[] = [
  "hill", "bridge", "rain", "night", "tunnel", "tiny", "giant",
];

export function isModeKind(value: string): value is ModeKind {
  return (MODE_KINDS as readonly string[]).includes(value);
}

/**
 * The one combined effect for a SET of latched modes — how stacking works,
 * and where it stays pure and testable:
 *
 *   • tempo scales MULTIPLY (a hill in a tiny train ≈ back to normal speed,
 *     which is its own joke), then clamp to the transport-safe range;
 *   • every send takes the MAX — reverbs don't add, the biggest room wins;
 *   • the ramp is the TOGGLED kind's own, so a bridge still snaps on while a
 *     hill still leans in, whatever else is already latched.
 *
 * The empty set is exactly `NEUTRAL_TERRAIN` — toggling the last mode off IS
 * the revert.
 */
export function combineModes(
  kinds: Iterable<ModeKind>,
  toggled?: ModeKind,
): TerrainEffect {
  let tempo = 1;
  let reverb = 0;
  let grit = 0;
  let muffle = 0;
  let echo = 0;
  let any = false;
  for (const kind of kinds) {
    const e = TERRAIN[kind];
    if (!e) continue;
    any = true;
    tempo *= e.tempoScale;
    reverb = Math.max(reverb, e.reverb);
    grit = Math.max(grit, e.grit);
    muffle = Math.max(muffle, e.muffle);
    echo = Math.max(echo, e.echo);
  }
  if (!any && toggled === undefined) return NEUTRAL_TERRAIN;
  return {
    tempoScale: clampTempoScale(tempo),
    reverb,
    grit,
    muffle,
    echo,
    rampBeats: (toggled ? TERRAIN[toggled]?.rampBeats : undefined) ?? NEUTRAL_TERRAIN.rampBeats,
  };
}

/** A latched terrain's audio hold: far enough out that it never expires in a
 *  session (~6h of 4/4 at 100bpm), superseded the moment the kid toggles.
 *  The VISUAL span stays short and slides while latched — see Track.tsx. */
export const LATCH_HOLD_BARS = 9999;

/** The visual unit a latched terrain repeats in, in bars: mound after mound
 *  reads as a mountain range, deck after deck as a viaduct. */
export const LATCH_UNIT_BARS = 4;

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
