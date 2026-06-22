// ─────────────────────────────────────────────────────────────────────────
// Core domain types for iBeetKidz.
//
// Invariant "everything is a clip": prebuilt sounds, recorded voice, drum
// patterns, and synth notes all reduce to a `Clip`. Machines produce Commands;
// ProjectState reduces Commands into a serializable Project; AudioEngine
// reconciles the live Web Audio graph to match the Project.
// ─────────────────────────────────────────────────────────────────────────

import type { ScaleId, KeyId } from "./scale.ts";

/** Oscillator shape for melody lanes and the Magic Pad / theremin voice. */
export type ThereminWave = "sine" | "triangle" | "square" | "sawtooth";

/** Identifier for one of the effect presets a kid can stack onto a clip. */
export type EffectId =
  | "reverse"
  | "pitchUp"
  | "pitchDown"
  | "robot"
  | "echo"
  | "reverb"
  | "bitcrush"
  | "crazy"; // "make it crazy" = a curated random stack, seeded via RngPort

/** A non-destructive effect application. Effects are baked on apply (render-once),
 *  but the descriptor is retained so undo can reconstruct the source chain. */
export interface EffectDescriptor {
  readonly id: EffectId;
  /** 0..1 normalized intensity; meaning is effect-specific. */
  readonly amount: number;
}

/** Where a clip's audio data originated. */
export type ClipSource =
  | { readonly kind: "builtin"; readonly assetId: string }
  | { readonly kind: "recording"; readonly bufferId: string }
  | { readonly kind: "synth"; readonly note: string }; // e.g. "C4"

/** The one playable thing. Audio buffers live in the engine/storage, keyed by id;
 *  the Project only holds serializable references + the effect chain. */
export interface Clip {
  readonly id: string;
  readonly source: ClipSource;
  /** Ordered effect chain; rendered into a baked buffer on apply. */
  readonly effects: readonly EffectDescriptor[];
  /** Display color/label for the playful UI. */
  readonly color: string;
  readonly label: string;
  /** Snap-to-beat: when set, this clip is looped/trimmed to exactly this many
   *  whole beats (at the live tempo) when it plays, so a recorded take sits in
   *  the groove on Home. Absent = play the take at its natural length. */
  readonly loopBeats?: number;
}

/** Drum lanes toggle a sound on/off per step; melody lanes place a pitched
 *  note (a grid row) per step. Both share the Loop Stage timeline. */
export type LaneKind = "drum" | "melody";

/** How many sub-hits a `roll` packs into the start step (drum fills). 1 is the
 *  default and is represented by an ABSENT `roll` field, so the common case
 *  stays field-free (same "absent = default" convention as `swing`/`loopBeats`). */
export type Roll = 2 | 4;

/** A pitch-bend control point on a melody note (BeepBox's "pin", step-quantized
 *  and in-scale). `t` is the position within the note as a fraction of its
 *  length (0 = start, 1 = end); `row` is the scale-degree at that point, so a
 *  bend snaps to the scale (Magic Notes) by construction. The note's base `row`
 *  is the implicit pin at t=0; `pins` describe the path AFTER the start. */
export interface PitchPin {
  readonly t: number;
  readonly row: number;
}

/** The one placed note/hit behind BOTH melody and drum lanes ("everything is a
 *  note"). `row` is the melody scale-degree — Magic Notes maps it to an in-scale
 *  pitch at schedule time (`degreeToNote`); drum hits ignore it (row 0). */
export interface StepNote {
  /** Melody grid-row / scale degree; 0 for drum hits. Also the bend's t=0 pitch. */
  readonly row: number;
  /** Steps this note spans (sustain). >= 1; clamped to the bar end on edit. */
  readonly length: number;
  /** Sub-hits packed into the start step (a fill). Absent = a single hit.
   *  Mutually exclusive with `pins` (a note either rolls or bends, not both). */
  readonly roll?: Roll;
  /** Pitch-bend path after the start (melody only). Absent = a flat note (the
   *  default — no scheduler/UI change). Sorted by `t`, in-scale by construction. */
  readonly pins?: readonly PitchPin[];
}

/** A layer on the Stage — one looping/triggerable lane in the mix. */
export interface Layer {
  readonly id: string;
  readonly clipId: string;
  readonly volume: number; // 0..1
  readonly muted: boolean;
  /** "drum" → use `steps`; "melody" → use `notes`. */
  readonly kind: LaneKind;
  /** Drum lane: one hit (a `StepNote`) or `null` (rest) per step. Empty for
   *  melody lanes. (Was `boolean[]`; `null`/object preserve on/off truthiness.) */
  readonly steps: readonly (StepNote | null)[];
  /** Melody lane: the chord of notes sounding from each step (multiple = a
   *  chord). Empty inner array = a rest. Empty outer array for drum lanes. */
  readonly notes: readonly (readonly StepNote[])[];
  /** Melody timbre (ignored by drum lanes). */
  readonly wave: ThereminWave;
  /** Per-lane echo send, 0..1 (0 = dry). */
  readonly echo: number;
  /** Per-lane tone/brightness, 0..1 (1 = fully open/bright, lower = darker). */
  readonly tone: number;
  /** Per-lane groove/swing, 0..1. Absent = inherit the song-level swing, so a
   *  lane only departs from the global groove once a kid tweaks it. */
  readonly swing?: number;
}

/** The serializable source of truth. Save/load round-trips this exactly. */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly tempoBpm: number;
  readonly clips: Readonly<Record<string, Clip>>;
  readonly layers: readonly Layer[];
  /** Song-level musical settings driving the melody lanes + groove. */
  readonly scaleId: ScaleId;
  readonly keyId: KeyId;
  /** Swing amount, 0..1 (0 = straight). */
  readonly swing: number;
  /** Id of the machine currently in focus. */
  readonly activeMachineId: string;
}

/** Commands are the only way to mutate a Project. Pure reducers consume them,
 *  enabling undo/redo and deterministic tests. */
export type Command =
  | { readonly type: "addClip"; readonly clip: Clip }
  | { readonly type: "removeClip"; readonly clipId: string }
  | { readonly type: "applyEffect"; readonly clipId: string; readonly effect: EffectDescriptor }
  | { readonly type: "renameClip"; readonly clipId: string; readonly label: string }
  | { readonly type: "setClipLoop"; readonly clipId: string; readonly loopBeats: number | null }
  | { readonly type: "addLayer"; readonly layer: Layer }
  | { readonly type: "removeLayer"; readonly layerId: string }
  | { readonly type: "setLayerVolume"; readonly layerId: string; readonly volume: number }
  | { readonly type: "toggleLayerMuted"; readonly layerId: string }
  | { readonly type: "toggleStep"; readonly layerId: string; readonly index: number }
  | { readonly type: "toggleNote"; readonly layerId: string; readonly index: number; readonly row: number }
  // Note model (length/roll). `row` picks the note within a step (drums pass 0).
  | { readonly type: "addNote"; readonly layerId: string; readonly index: number; readonly row: number; readonly length?: number }
  | { readonly type: "removeNote"; readonly layerId: string; readonly index: number; readonly row: number }
  | { readonly type: "resizeNote"; readonly layerId: string; readonly index: number; readonly row: number; readonly length: number }
  | { readonly type: "setRoll"; readonly layerId: string; readonly index: number; readonly row: number; readonly roll: 1 | Roll }
  // Pitch bend (melody only): set/move/clear control points on the note keyed by
  // its base `row`. `addPin` upserts a pin at fraction `t` targeting `toRow`.
  | { readonly type: "addPin"; readonly layerId: string; readonly index: number; readonly row: number; readonly t: number; readonly toRow: number }
  | { readonly type: "clearPins"; readonly layerId: string; readonly index: number; readonly row: number }
  // Tune a drum hit: its `row` doubles as a semitone pitch offset (drums have no
  // chord, so row is free). Melody lanes ignore this.
  | { readonly type: "tuneDrum"; readonly layerId: string; readonly index: number; readonly pitch: number }
  | { readonly type: "setLayerWave"; readonly layerId: string; readonly wave: ThereminWave }
  | { readonly type: "setLayerEcho"; readonly layerId: string; readonly echo: number }
  | { readonly type: "setLayerTone"; readonly layerId: string; readonly tone: number }
  | { readonly type: "setLayerSwing"; readonly layerId: string; readonly swing: number }
  | { readonly type: "setTempo"; readonly bpm: number }
  | { readonly type: "setScale"; readonly scaleId: ScaleId }
  | { readonly type: "setKey"; readonly keyId: KeyId }
  | { readonly type: "setSwing"; readonly swing: number }
  | { readonly type: "setActiveMachine"; readonly machineId: string };

export const MIN_BPM = 40;
export const MAX_BPM = 220;
export const STEP_COUNT = 16;
/** CPU ceiling for cheap tablets: cap simultaneous layers (oldest gets stolen). */
export const MAX_LAYERS = 8;
