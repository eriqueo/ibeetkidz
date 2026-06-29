// ─────────────────────────────────────────────────────────────────────────
// Melody-lane instruments (timbres).
//
// The `InstrumentId` is the domain handle a melody lane carries; the Tone.js
// adapter owns the actual synth recipe (oscillator / envelope / modulation), so
// the core stays vendor-free. Kid-facing label + emoji live here too, so the
// picker UI is data-driven (one entry = one instrument, no plumbing edits).
//
// The first four ids mirror the original oscillator-shape voices so old saved
// lanes (which only carried a `wave`) keep sounding the same — see
// `instrumentForWave`. The rest are richer, distinctly different instruments.
// ─────────────────────────────────────────────────────────────────────────

import type { ThereminWave } from "./types.ts";

/** The built-in synth voices (the adapter has a Tone recipe per id). */
export type SynthInstrumentId =
  | "soft" // triangle synth — the gentle default
  | "smooth" // sine synth
  | "buzzy" // square synth
  | "sharp" // sawtooth synth
  | "piano" // FM electric-piano-ish pluck
  | "bells" // bright FM bell / music box
  | "organ" // sustained, held tone
  | "pluck" // short filtered pluck (synth-y)
  | "brass" // reedy filtered lead
  | "guitar"; // Karplus-Strong plucked string — a real guitar

/** A melody lane's voice. Either a built-in synth, OR `voice:<bufferId>` — the
 *  kid's own recording played chromatically through a sampler (Voice Keys). The
 *  bufferId is encoded into the id so it threads through `scheduleNote(instrument)`
 *  without widening any signature; the lane's `clipId` still points at the same
 *  recording Clip (for color, naming, persistence). */
export type InstrumentId = SynthInstrumentId | `voice:${string}`;

export interface Instrument {
  readonly id: SynthInstrumentId;
  readonly label: string;
  readonly emoji: string;
}

/** Prefix marking a recording-backed sampler instrument. */
export const VOICE_PREFIX = "voice:";

/** Build the instrument id for a melody lane voiced by a recording buffer. */
export function voiceInstrumentId(bufferId: string): InstrumentId {
  return `${VOICE_PREFIX}${bufferId}`;
}

/** True when an instrument id is a recording-backed sampler voice. */
export function isVoiceInstrument(
  id: InstrumentId | undefined,
): id is `voice:${string}` {
  return !!id && id.startsWith(VOICE_PREFIX);
}

/** The recording bufferId behind a voice instrument id, or null for synths. */
export function voiceBufferId(id: InstrumentId): string | null {
  return id.startsWith(VOICE_PREFIX) ? id.slice(VOICE_PREFIX.length) : null;
}

/** The picker order (data-driven). Append-only so saved `instrument` ids hold. */
export const INSTRUMENTS: readonly Instrument[] = [
  { id: "soft", label: "Soft", emoji: "🔺" },
  { id: "smooth", label: "Smooth", emoji: "🌊" },
  { id: "buzzy", label: "Buzzy", emoji: "🟦" },
  { id: "sharp", label: "Sharp", emoji: "🪚" },
  { id: "piano", label: "Piano", emoji: "🎹" },
  { id: "bells", label: "Bells", emoji: "🔔" },
  { id: "organ", label: "Organ", emoji: "🎹" },
  { id: "pluck", label: "Pluck", emoji: "🪕" },
  { id: "brass", label: "Brass", emoji: "🎺" },
  { id: "guitar", label: "Guitar", emoji: "🎸" },
];

export const DEFAULT_INSTRUMENT: InstrumentId = "soft";

const VALID = new Set<SynthInstrumentId>(INSTRUMENTS.map((i) => i.id));

/** Map the four legacy oscillator shapes onto their equivalent instrument, so a
 *  melody lane saved before instruments (only a `wave`) shows the right picker
 *  selection and sounds unchanged. */
export function instrumentForWave(wave: ThereminWave): InstrumentId {
  switch (wave) {
    case "sine":
      return "smooth";
    case "square":
      return "buzzy";
    case "sawtooth":
      return "sharp";
    default:
      return "soft"; // triangle
  }
}

/** The lane's effective instrument: its own if set + valid, else derived from
 *  the legacy `wave`. One place so every reader (engine, UI) agrees. */
export function resolveInstrument(
  instrument: InstrumentId | undefined,
  wave: ThereminWave,
): InstrumentId {
  if (instrument && (isVoiceInstrument(instrument) || VALID.has(instrument)))
    return instrument;
  return instrumentForWave(wave);
}
