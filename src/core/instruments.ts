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

export type InstrumentId =
  | "soft" // triangle synth — the gentle default
  | "smooth" // sine synth
  | "buzzy" // square synth
  | "sharp" // sawtooth synth
  | "piano" // FM electric-piano-ish pluck
  | "bells" // bright FM bell / music box
  | "organ" // sustained, held tone
  | "pluck" // short filtered pluck (guitar-ish)
  | "brass"; // reedy filtered lead

export interface Instrument {
  readonly id: InstrumentId;
  readonly label: string;
  readonly emoji: string;
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
];

export const DEFAULT_INSTRUMENT: InstrumentId = "soft";

const VALID = new Set<InstrumentId>(INSTRUMENTS.map((i) => i.id));

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
  return instrument && VALID.has(instrument)
    ? instrument
    : instrumentForWave(wave);
}
