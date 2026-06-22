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

/** One target of a pitch-bend glide: the (already scale-resolved) note to reach
 *  at fraction `t` of the note's length. The core resolves pin rows → note names
 *  so the adapter stays free of music theory. */
export interface BendPoint {
  readonly t: number;
  readonly noteName: string;
}

/** Mix + groove options shared by every transport-scheduled voice. */
export interface StepOptions {
  /** Linear mix level, 0..1. */
  readonly volume: number;
  /** Swing amount, 0..1 (off-beats lean late). */
  readonly swing: number;
  /** Echo send, 0..1 (0 = dry). */
  readonly echo: number;
  /** Tone/brightness, 0..1 (1 = fully open; lower darkens via a low-pass). */
  readonly tone: number;
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

  /** Capture a live Magic Pad performance: start a recorder that the theremin
   *  voice feeds into, then resolve with a new BufferId on stop. No mic needed —
   *  this records the synthesized voice, so it always works. */
  startPerformanceRecording(): Promise<void>;
  stopPerformanceRecording(): Promise<BufferId>;

  /** Bake an effect chain onto a source buffer, returning a new baked BufferId
   *  (render-once model). */
  renderEffects(source: BufferId, effects: readonly EffectDescriptor[]): Promise<BufferId>;

  /** Re-hydrate a recording buffer from a persisted blob (after reload), so a
   *  saved project's recorded clips play again. */
  rehydrate(bufferId: BufferId, blob: Blob): Promise<void>;

  /** The encoded bytes of a recorded buffer, for persistence. Null if unknown
   *  or if the buffer was synthesized rather than recorded. */
  getRecordingBlob(bufferId: BufferId): Blob | null;

  /** Decoded length in seconds of a held buffer, or null if unknown. Lets the
   *  UI snap a take to the nearest whole beat (see `nearestBeatLoop`). */
  getBufferDuration(bufferId: BufferId): number | null;

  /** Trigger a clip once, now. */
  play(clip: Clip): void;

  /** Audition a single melody note now (used when a kid taps a note cell), so
   *  the grid gives instant feedback without waiting for Play. */
  previewNote(noteName: string, wave: ThereminWave): void;

  /** Schedule looping playback of a drum clip on the transport at the given
   *  step. Swing leans the off-beats late; echo adds a per-lane delay tail.
   *  `roll` subdivides the step into that many sub-hits (a fill) with a rising
   *  velocity; `lengthSteps` rings a built-in drum longer (stretch); `pitch`
   *  tunes it (semitones). For recordings/effected clips these last three are
   *  honored where they make sense (a sample still rings at its own length). */
  scheduleStep(
    clip: Clip,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
    lengthSteps?: number,
    roll?: number,
    pitch?: number,
  ): void;

  /** Schedule a looping melody note (pitched synth voice) on the transport at
   *  the given step. `noteName` is scientific pitch (e.g. "C4"). `lengthSteps`
   *  sustains the voice across that many steps; `roll` subdivides the start step
   *  into that many sub-hits (a fill). `bend`, when present, glides the voice's
   *  pitch through its points over the note's length (a swoop) — bend and roll
   *  are mutually exclusive (the core guarantees it). */
  scheduleNote(
    noteName: string,
    wave: ThereminWave,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
    lengthSteps?: number,
    roll?: number,
    bend?: readonly BendPoint[],
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

  /** Tear down scheduled loop voices WITHOUT stopping the transport, so the
   *  loop keeps playing across edits. Reconcile re-schedules right after. */
  clearScheduled(): void;

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
