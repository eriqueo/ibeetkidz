// AudioEngine: the core that reconciles the live audio graph to ProjectState.
// It owns NO DSP itself — everything routes through SoundPort. Its job is the
// state -> sound reconciliation loop and gesture-gated startup.

import type { Layer, Project } from "./types.ts";
import { STEP_COUNT } from "./types.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import type { QuantizeGrid } from "./quantize.ts";
import { degreeToNote } from "./scale.ts";
import { activeLayers, songBars } from "./project-state.ts";

/** What the transport is playing: "loop" repeats the active car forever (Home's
 *  Play — today's behavior); "ride" plays the whole arrangement, car after car,
 *  then loops the song (the Tracks strip's Ride). */
type PlayMode = "loop" | "ride";

export class AudioEngine {
  private started = false;
  private playing = false;
  private mode: PlayMode = "loop";

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

  /** Reconcile transport + scheduled voices to match the project. Clears and
   *  reschedules WITHOUT stopping the transport, so the groove keeps playing
   *  seamlessly while the kid edits. Honors the current play mode: "loop" rides
   *  the active car alone (one bar); "ride" lays out the whole arrangement. */
  reconcile(project: Project): void {
    if (!this.started) return;
    this.sound.setTempo(project.tempoBpm);
    this.sound.clearScheduled();
    if (this.mode === "ride") this.scheduleArrangement(project);
    else this.scheduleLayers(project, activeLayers(project), 1, 0);
  }

  /** Lay out the whole song as one long, repeating loop: each car occupies its
   *  bars in sequence (a car repeated N times fills N consecutive bars), and the
   *  whole arrangement repeats every `songBars`. This reuses the proven 1-bar
   *  scheduler at a longer cycle, so section changes are gapless (Tone handles
   *  the timeline) without any mid-bar reschedule that would clip a bar. */
  private scheduleArrangement(project: Project): void {
    const ids = new Set(project.parts.map((p) => p.id));
    const arrangement = project.arrangement.filter((c) => ids.has(c.partId));
    const total = songBars(project);
    let bar = 0;
    for (const car of arrangement) {
      const part = project.parts.find((p) => p.id === car.partId);
      const reps = Math.max(1, car.repeats);
      if (part) {
        for (let r = 0; r < reps; r++) {
          this.scheduleLayers(project, part.layers, total, bar + r);
        }
      }
      bar += reps;
    }
  }

  /** Schedule one car's lanes onto the transport. `cycleBars` is the loop length
   *  in bars (1 for a single car; the song length when riding) and `barOffset`
   *  positions this car within that cycle. */
  private scheduleLayers(
    project: Project,
    layers: readonly Layer[],
    cycleBars: number,
    barOffset: number,
  ): void {
    for (const layer of layers) {
      if (layer.muted) continue;
      const clip = project.clips[layer.clipId];
      if (!clip) continue;
      // Per-lane groove overrides the song swing once a kid tweaks it.
      const opts = {
        volume: layer.volume,
        swing: layer.swing ?? project.swing,
        echo: layer.echo,
        tone: layer.tone,
      };
      if (layer.kind === "melody") {
        const total = layer.notes.length || STEP_COUNT;
        layer.notes.forEach((chord, i) => {
          for (const n of chord) {
            const note = degreeToNote(project.scaleId, project.keyId, n.row);
            // Resolve bend pin rows → note names here so the adapter stays free
            // of music theory (Magic Notes lives in the core).
            const bend = n.pins?.map((p) => ({
              t: p.t,
              noteName: degreeToNote(project.scaleId, project.keyId, p.row),
            }));
            this.sound.scheduleNote(
              note, layer.wave, i, total, opts, n.length, n.roll ?? 1, bend,
              cycleBars, barOffset,
            );
          }
        });
      } else {
        const total = layer.steps.length || STEP_COUNT;
        layer.steps.forEach((cell, i) => {
          // A drum hit's `row` is its tune (semitone offset); 0 = natural.
          if (cell)
            this.sound.scheduleStep(
              clip, i, total, opts, cell.length, cell.roll ?? 1, cell.row,
              cycleBars, barOffset,
            );
        });
      }
    }
  }

  /** Start (or restart) playback in a mode: reschedule for it, then run the
   *  transport. "loop" = Home's Play (active car); "ride" = the whole song. */
  private playIn(mode: PlayMode, project: Project): void {
    if (!this.started) return;
    this.mode = mode;
    this.reconcile(project);
    this.sound.startTransport();
    this.playing = true;
  }

  /** Home's Play: loop the active car forever (unchanged single-loop behavior). */
  playLoop(project: Project): void {
    this.playIn("loop", project);
  }

  /** The Tracks strip's Ride: play through the whole arrangement, then loop it. */
  playRide(project: Project): void {
    this.playIn("ride", project);
  }

  /** Absolute bar index since playback started, or -1 when stopped. */
  getTransportBar(): number {
    return this.sound.getTransportBar();
  }

  get playMode(): PlayMode {
    return this.mode;
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
