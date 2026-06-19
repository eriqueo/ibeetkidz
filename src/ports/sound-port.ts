// SoundPort: the single boundary behind which all DSP / Tone.js lives.
// The core AudioEngine talks only to this interface, so the audio vendor is
// swappable and the core stays unit-testable with a fake implementation.

import type { Clip, EffectDescriptor, ThereminWave } from "../core/types.ts";
import type { QuantizeGrid } from "../core/quantize.ts";

/** Opaque handle to an audio buffer held by the adapter (keyed by id). */
export type BufferId = string;

// `ThereminWave` is a pure domain type; re-exported here so existing importers
// (the Tone adapter, the UI tools) can keep pulling it from the port boundary.
export type { ThereminWave };

/** Mix + groove options shared by every transport-scheduled voice. */
export interface StepOptions {
  /** Linear mix level, 0..1. */
  readonly volume: number;
  /** Swing amount, 0..1 (off-beats lean late). */
  readonly swing: number;
  /** Echo send, 0..1 (0 = dry). */
  readonly echo: number;
}

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

  /** Audition a single melody note now (used when a kid taps a note cell), so
   *  the grid gives instant feedback without waiting for Play. */
  previewNote(noteName: string, wave: ThereminWave): void;

  /** Schedule looping playback of a drum clip on the transport at the given
   *  step. Swing leans the off-beats late; echo adds a per-lane delay tail. */
  scheduleStep(
    clip: Clip,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
  ): void;

  /** Schedule a looping melody note (pitched synth voice) on the transport at
   *  the given step. `noteName` is scientific pitch (e.g. "C4"). */
  scheduleNote(
    noteName: string,
    wave: ThereminWave,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
  ): void;

  /** Real-time XY control for the theremin machine (resolved live, not baked). */
  setThereminXY(x: number, y: number): void;
  thereminOn(): void;
  thereminOff(): void;
  /** Choose the theremin's oscillator shape (applies live if a voice is held). */
  setThereminWaveform(wave: ThereminWave): void;

  setTempo(bpm: number): void;
  startTransport(): void;
  stopTransport(): void;
  stopAll(): void;

  /** Set the global snap grid for one-off triggers (`play`). "off" disables
   *  snapping. Looping steps (`scheduleStep`) are already bar-aligned. */
  setQuantize(grid: QuantizeGrid): void;

  /** Current playhead step (0..totalSteps-1) from the running transport, or -1
   *  when stopped. Drives the Loop Stage playhead. */
  getTransportStep(totalSteps: number): number;

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
