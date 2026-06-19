// ─────────────────────────────────────────────────────────────────────────
// Core domain types for iBeetKidz.
//
// Invariant "everything is a clip": prebuilt sounds, recorded voice, drum
// patterns, and synth notes all reduce to a `Clip`. Machines produce Commands;
// ProjectState reduces Commands into a serializable Project; AudioEngine
// reconciles the live Web Audio graph to match the Project.
// ─────────────────────────────────────────────────────────────────────────

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
}

/** A layer on the Stage — one looping/triggerable lane in the mix. */
export interface Layer {
  readonly id: string;
  readonly clipId: string;
  readonly volume: number; // 0..1
  readonly muted: boolean;
  /** Step pattern for the beat grid; empty for one-shot/looper layers. */
  readonly steps: readonly boolean[];
}

/** The serializable source of truth. Save/load round-trips this exactly. */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly tempoBpm: number;
  readonly clips: Readonly<Record<string, Clip>>;
  readonly layers: readonly Layer[];
  /** Id of the machine currently in focus. */
  readonly activeMachineId: string;
}

/** Commands are the only way to mutate a Project. Pure reducers consume them,
 *  enabling undo/redo and deterministic tests. */
export type Command =
  | { readonly type: "addClip"; readonly clip: Clip }
  | { readonly type: "applyEffect"; readonly clipId: string; readonly effect: EffectDescriptor }
  | { readonly type: "addLayer"; readonly layer: Layer }
  | { readonly type: "removeLayer"; readonly layerId: string }
  | { readonly type: "setLayerVolume"; readonly layerId: string; readonly volume: number }
  | { readonly type: "toggleLayerMuted"; readonly layerId: string }
  | { readonly type: "toggleStep"; readonly layerId: string; readonly index: number }
  | { readonly type: "setTempo"; readonly bpm: number }
  | { readonly type: "setActiveMachine"; readonly machineId: string };

export const MIN_BPM = 40;
export const MAX_BPM = 220;
export const STEP_COUNT = 16;
/** CPU ceiling for cheap tablets: cap simultaneous layers (oldest gets stolen). */
export const MAX_LAYERS = 8;
