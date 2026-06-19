// Pure music theory for the Loop Stage melody lanes — no Tone, no DOM.
//
// The whole point of "Magic Notes" (BeepBox's "easy :)" scale) is that a kid
// can tap ANY cell and it sounds good, because we only ever offer notes that
// belong to the chosen scale + key. The melody grid has a fixed number of rows
// (MELODY_ROWS); each row maps to a real note through (scale, key, row).

/** Which notes are allowed. `magic` = pentatonic (no wrong notes, ever);
 *  `rainbow` = full major (more notes, a little more adventurous). */
export type ScaleId = "magic" | "rainbow";

/** Friendly "home" notes. Kept to a handful so the picker stays kid-sized. */
export type KeyId = "C" | "D" | "F" | "G" | "A";

/** Vertical size of every melody lane's note grid (low row → high row). */
export const MELODY_ROWS = 7;

export interface ScaleDef {
  readonly id: ScaleId;
  readonly label: string;
  /** One-line coach: what it does + why a kid would want it. */
  readonly coach: string;
  /** Semitone offsets from the key root, one octave's worth. */
  readonly intervals: readonly number[];
}

export const SCALES: Readonly<Record<ScaleId, ScaleDef>> = {
  magic: {
    id: "magic",
    label: "Magic Notes",
    coach: "Every note sounds nice together — you can't play a wrong one.",
    intervals: [0, 2, 4, 7, 9], // major pentatonic
  },
  rainbow: {
    id: "rainbow",
    label: "Rainbow Notes",
    coach: "More notes to explore. A few can clash — try them and listen!",
    intervals: [0, 2, 4, 5, 7, 9, 11], // major
  },
};

export interface KeyDef {
  readonly id: KeyId;
  readonly label: string;
  /** MIDI note number of this key's root, sitting in a comfy kid octave. */
  readonly rootMidi: number;
}

export const KEYS: Readonly<Record<KeyId, KeyDef>> = {
  C: { id: "C", label: "C", rootMidi: 60 },
  D: { id: "D", label: "D", rootMidi: 62 },
  F: { id: "F", label: "F", rootMidi: 65 },
  G: { id: "G", label: "G", rootMidi: 67 },
  A: { id: "A", label: "A", rootMidi: 69 },
};

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];
export const KEY_IDS = Object.keys(KEYS) as KeyId[];

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

/** MIDI number → scientific pitch name Tone understands, e.g. 60 → "C4". */
export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** The note a given melody-grid row plays under the current scale + key.
 *  Row 0 is the lowest; rows climb through the scale, wrapping up octaves. */
export function degreeToNote(
  scaleId: ScaleId,
  keyId: KeyId,
  row: number,
): string {
  const scale = SCALES[scaleId] ?? SCALES.magic;
  const key = KEYS[keyId] ?? KEYS.C;
  const len = scale.intervals.length;
  const r = ((row % (len * 4)) + len * 4) % (len * 4); // guard stray rows
  const octave = Math.floor(r / len);
  const interval = scale.intervals[r % len] ?? 0;
  return midiToNoteName(key.rootMidi + 12 * octave + interval);
}
