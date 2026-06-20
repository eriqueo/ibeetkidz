// AudioEngine: the core that reconciles the live audio graph to ProjectState.
// It owns NO DSP itself — everything routes through SoundPort. Its job is the
// state -> sound reconciliation loop and gesture-gated startup.

import type { Project } from "./types.ts";
import { STEP_COUNT } from "./types.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import type { QuantizeGrid } from "./quantize.ts";
import { degreeToNote } from "./scale.ts";

export class AudioEngine {
  private started = false;
  private playing = false;

  constructor(private readonly sound: SoundPort) {}

  /** Must be invoked from a user gesture (the boot gate button). */
  async start(): Promise<void> {
    if (this.started) return;
    await this.sound.resume();
    await this.sound.loadBuiltins();
    this.started = true;
  }

  get isStarted(): boolean {
    return this.started;
  }

  setTempo(bpm: number): void {
    this.sound.setTempo(bpm);
  }

  /** Set the global on-beat snap grid for one-off triggers. */
  setQuantize(grid: QuantizeGrid): void {
    this.sound.setQuantize(grid);
  }

  /** Reconcile transport + scheduled steps to match the project's layers. */
  reconcile(project: Project): void {
    if (!this.started) return;
    this.sound.setTempo(project.tempoBpm);
    // Clear + reschedule WITHOUT stopping the transport, so a loop keeps
    // playing seamlessly while the kid adds lanes or toggles steps.
    this.sound.clearScheduled();
    for (const layer of project.layers) {
      if (layer.muted) continue;
      const clip = project.clips[layer.clipId];
      if (!clip) continue;
      const opts = { volume: layer.volume, swing: project.swing, echo: layer.echo };
      if (layer.kind === "melody") {
        layer.notes.forEach((rows, i) => {
          for (const row of rows) {
            const note = degreeToNote(project.scaleId, project.keyId, row);
            this.sound.scheduleNote(note, layer.wave, i, layer.notes.length, opts);
          }
        });
      } else {
        const total = layer.steps.length || STEP_COUNT;
        layer.steps.forEach((on, i) => {
          if (on) this.sound.scheduleStep(clip, i, total, opts);
        });
      }
    }
  }

  play(): void {
    if (!this.started) return;
    this.sound.startTransport();
    this.playing = true;
  }

  stop(): void {
    this.sound.stopTransport();
    this.playing = false;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  getAnalyser(): AnalyserNode {
    return this.sound.getAnalyser();
  }
}
