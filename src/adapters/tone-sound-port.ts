// ToneSoundPort: concrete SoundPort backed by Tone.js (the only file that knows
// Tone exists). Built against Tone v15. Marked TODO where the DSP needs to be
// fleshed out and verified in a browser — the structure and contract are firm,
// the inner node wiring is the build-out work.

import * as Tone from "tone";
import type { Clip, EffectDescriptor } from "../core/types.ts";
import {
  MicDeniedError,
  NoMicError,
  type BufferId,
  type SoundPort,
} from "../ports/sound-port.ts";

export class ToneSoundPort implements SoundPort {
  private analyser!: AnalyserNode;
  private readonly buffers = new Map<BufferId, AudioBuffer>();
  private mic?: Tone.UserMedia | undefined;
  private recorder?: Tone.Recorder | undefined;
  private bufferSeq = 0;

  async resume(): Promise<void> {
    await Tone.start();
    // A raw AnalyserNode tapped off the master output feeds the visualizer.
    const ctx = Tone.getContext().rawContext as AudioContext;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    Tone.getDestination().connect(this.analyser);
  }

  async loadBuiltins(): Promise<void> {
    // TODO(build): load the bundled sample pack from /public/sounds into Tone
    // buffers, keyed by assetId. No-op until assets are added.
  }

  async startRecording(): Promise<void> {
    try {
      this.mic = new Tone.UserMedia();
      this.recorder = new Tone.Recorder();
      await this.mic.open(); // throws if denied / no device
      this.mic.connect(this.recorder);
      this.recorder.start();
    } catch (err) {
      this.mic?.close();
      this.mic = undefined;
      this.recorder = undefined;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw new MicDeniedError();
      }
      throw new NoMicError();
    }
  }

  async stopRecording(): Promise<BufferId> {
    if (!this.recorder || !this.mic) throw new NoMicError();
    const blob = await this.recorder.stop();
    this.mic.close();
    const arrayBuf = await blob.arrayBuffer();
    const audioBuf = await Tone.getContext().decodeAudioData(arrayBuf);
    const id = `rec-${this.bufferSeq++}`;
    this.buffers.set(id, audioBuf);
    this.mic = undefined;
    this.recorder = undefined;
    return id;
  }

  async renderEffects(
    source: BufferId,
    effects: readonly EffectDescriptor[],
  ): Promise<BufferId> {
    const src = this.buffers.get(source);
    if (!src) throw new Error(`unknown buffer: ${source}`);
    // TODO(build): use Tone.Offline to render `src` through the effect chain
    // (reverse = reversed buffer, pitch = PitchShift, robot = stacked presets,
    // echo = FeedbackDelay, reverb = Reverb, bitcrush = BitCrusher, crazy =
    // seeded random stack). For now, pass the source through unchanged so the
    // pipeline is wired end-to-end.
    void effects;
    const id = `baked-${this.bufferSeq++}`;
    this.buffers.set(id, src);
    return id;
  }

  play(clip: Clip): void {
    // TODO(build): resolve clip.source -> buffer, build a one-shot Player.
    void clip;
  }

  scheduleStep(clip: Clip, stepIndex: number, totalSteps: number): void {
    // TODO(build): schedule on Tone.getTransport() at the step's time.
    void clip;
    void stepIndex;
    void totalSteps;
  }

  setThereminXY(x: number, y: number): void {
    // TODO(build): map x -> pitch (quantized to a kid-friendly scale),
    // y -> filter cutoff / timbre on a live-running oscillator voice.
    void x;
    void y;
  }
  thereminOn(): void {
    /* TODO(build): start the live oscillator voice. */
  }
  thereminOff(): void {
    /* TODO(build): release the live oscillator voice. */
  }

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }
  startTransport(): void {
    Tone.getTransport().start();
  }
  stopTransport(): void {
    Tone.getTransport().stop();
  }
  stopAll(): void {
    Tone.getTransport().cancel();
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }
}
