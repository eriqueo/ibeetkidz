// SoundPort: the single boundary behind which all DSP / Tone.js lives.
// The core AudioEngine talks only to this interface, so the audio vendor is
// swappable and the core stays unit-testable with a fake implementation.

import type { Clip, EffectDescriptor } from "../core/types.ts";
import type { QuantizeGrid } from "../core/quantize.ts";

/** Opaque handle to an audio buffer held by the adapter (keyed by id). */
export type BufferId = string;

export interface SoundPort {
  /** Resume the (single, shared) AudioContext. Must be called from a user gesture. */
  resume(): Promise<void>;

  /** Load the built-in sample pack. Idempotent. */
  loadBuiltins(): Promise<void>;

  /** Record from the mic until stop() is called; resolves with a new BufferId.
   *  Rejects with MicDeniedError / NoMicError on permission/hardware failure. */
  startRecording(): Promise<void>;
  stopRecording(): Promise<BufferId>;

  /** Bake an effect chain onto a source buffer, returning a new baked BufferId
   *  (render-once model). */
  renderEffects(source: BufferId, effects: readonly EffectDescriptor[]): Promise<BufferId>;

  /** Re-hydrate a recording buffer from a persisted blob (after reload), so a
   *  saved project's recorded clips play again. */
  rehydrate(bufferId: BufferId, blob: Blob): Promise<void>;

  /** The encoded bytes of a recorded buffer, for persistence. Null if unknown
   *  or if the buffer was synthesized rather than recorded. */
  getRecordingBlob(bufferId: BufferId): Blob | null;

  /** Trigger a clip once, now. */
  play(clip: Clip): void;

  /** Schedule looping playback of a clip on the transport at the given step.
   *  `volume` is linear 0..1 (the layer's mix level). */
  scheduleStep(clip: Clip, stepIndex: number, totalSteps: number, volume?: number): void;

  /** Real-time XY control for the theremin machine (resolved live, not baked). */
  setThereminXY(x: number, y: number): void;
  thereminOn(): void;
  thereminOff(): void;

  setTempo(bpm: number): void;
  startTransport(): void;
  stopTransport(): void;
  stopAll(): void;

  /** Set the global snap grid for one-off triggers (`play`). "off" disables
   *  snapping. Looping steps (`scheduleStep`) are already bar-aligned. */
  setQuantize(grid: QuantizeGrid): void;

  /** Analyser node feeding the visualizer. */
  getAnalyser(): AnalyserNode;
}

export class MicDeniedError extends Error {
  constructor() {
    super("Microphone permission denied");
    this.name = "MicDeniedError";
  }
}

export class NoMicError extends Error {
  constructor() {
    super("No microphone available");
    this.name = "NoMicError";
  }
}
