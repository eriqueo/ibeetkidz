// AudioEngine: the core that reconciles the live audio graph to ProjectState.
// It owns NO DSP itself — everything routes through SoundPort. Its job is the
// state -> sound reconciliation loop and gesture-gated startup.

import type { Layer, Project } from "./types.ts";
import { STEP_COUNT } from "./types.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import type { QuantizeGrid } from "./quantize.ts";
import { degreeToNote } from "./scale.ts";
import { activeLayers, liveTrain, partForCar } from "./project-state.ts";
import { resolveInstrument } from "./instruments.ts";
import {
  DEFAULT_HOLD_BARS,
  LATCH_HOLD_BARS,
  combineModes,
  terrainEffect,
  type ModeKind,
  type TerrainKind,
  type TerrainRide,
} from "./terrain.ts";

/** What the transport is playing: "loop" repeats the active car forever (Home's
 *  Play — today's behavior); "ride" plays the whole arrangement, car after car,
 *  then loops the song (the Tracks strip's Ride). */
type PlayMode = "loop" | "ride";

/**
 * Where an event that starts at step `i` and lasts `span` steps lands when the
 * bar is played backwards.
 *
 * `total - i - span`, not `total - 1 - i`, and the difference matters for
 * anything longer than one step: reversing time reverses an event's ENDS, so a
 * note occupying [i, i+span) has to come back occupying [total-i-span, total-i).
 * Mirroring the start alone would push every long note `span-1` steps late and
 * hang the last one off the end of the bar.
 *
 * Pure and total: clamped at 0 so a malformed span cannot schedule before the
 * downbeat.
 */
function mirrorIndex(i: number, span: number, total: number): number {
  return Math.max(0, total - i - Math.max(1, span));
}

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

  /** Every ride mode currently LATCHED on — they STACK (a night ride through
   *  rain on a hill in a tiny train is one combined effect). Empty = flat,
   *  dry, normal ground. */
  private readonly latched = new Set<ModeKind>();

  /** Ride through a terrain: it lands on the NEXT bar, holds for `holdBars`,
   *  then the world goes back to normal. Ephemeral by design — no `Command`, no
   *  reducer entry, no undo history: this is a performance, not a composition.
   *
   *  `when` is resolved from the TRANSPORT inside the adapter, never from the
   *  train's on-screen position. PROJECT_CHARTER.md Decision A4: the audio
   *  clock drives the visual, never the reverse. */
  applyTerrain(
    kind: TerrainKind,
    project: Project,
    holdBars: number = DEFAULT_HOLD_BARS,
  ): TerrainRide | null {
    if (!this.started || !this.playing) return null;
    const span = this.sound.scheduleTerrain(
      terrainEffect(kind), holdBars, project.tempoBpm,
    );
    return span ? { kind, ...span } : null;
  }

  /** LATCH a ride mode: tap it on, tap it off, stack as many as you like
   *  (Eric, 2026-08-13). Each toggle recomputes the ONE combined effect from
   *  everything still latched (`combineModes` — tempo scales multiply, sends
   *  take the max) and lands it on the next bar; the hold sits
   *  `LATCH_HOLD_BARS` out and each toggle's generation supersedes the last,
   *  so toggling the final mode off IS the revert (the empty set combines to
   *  neutral). Returns whether the toggled kind is now on, plus where the
   *  change lands — the bar always comes FROM the transport (charter A4),
   *  never from where the train is drawn. */
  toggleMode(
    kind: ModeKind,
    project: Project,
  ): { on: boolean; atBar: number | null } {
    if (!this.started || !this.playing) return { on: this.latched.has(kind), atBar: null };
    const wasOn = this.latched.has(kind);
    if (wasOn) this.latched.delete(kind);
    else this.latched.add(kind);
    const span = this.sound.scheduleTerrain(
      combineModes(this.latched, kind),
      LATCH_HOLD_BARS,
      project.tempoBpm,
    );
    if (!span) {
      // The transport refused (not started): undo the flip so state stays true.
      if (wasOn) this.latched.add(kind);
      else this.latched.delete(kind);
      return { on: this.latched.has(kind), atBar: null };
    }
    return { on: !wasOn, atBar: span.startBar };
  }

  get latchedModes(): ReadonlySet<ModeKind> {
    return this.latched;
  }

  /** Drop any terrain and return to flat ground now. */
  clearTerrain(): void {
    if (!this.started) return;
    this.latched.clear();
    this.sound.clearTerrain();
  }

  /**
   * BACKWARDS mode: the song plays backwards.
   *
   * All of it, which took two goes. The first version only asked the adapter to
   * play each SAMPLE tape-reversed and left the schedule alone — so the beat
   * still landed 1-2-3-4 in the same places and every hit was a backwards
   * whoosh in its original slot. Eric heard exactly that: "it doesn't actually
   * play the song backwards, it just makes swishing backwards sounds."
   *
   * Playing a song backwards is three mirrors, and the sample was only one:
   *
   *   1. the SAMPLE plays tape-reversed              (`sound.setReversed`)
   *   2. the STEPS within a bar run last-to-first    (`mirrorIndex`)
   *   3. the BARS of the train run last-to-first     (`scheduleArrangement`)
   *
   * Toggling while the song runs reconciles in place, so the flip is heard on
   * the very next scheduled pass without stopping the groove. Like terrain,
   * this is a performance — no Command, no history, never saved.
   */
  private reversed = false;

  toggleReversed(project: Project): boolean {
    this.reversed = !this.reversed;
    this.sound.setReversed(this.reversed);
    if (this.playing) this.reconcile(project);
    return this.reversed;
  }

  get isReversed(): boolean {
    return this.reversed;
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

  /** Lay out the whole train as one long, repeating loop: each slot occupies one
   *  bar in order, and the whole song repeats every `train.length` bars. This
   *  reuses the proven 1-bar scheduler at a longer cycle, so section changes are
   *  gapless (Tone handles the timeline) without any mid-bar reschedule that
   *  would clip a bar. Muted (tarped) cars are simply skipped — that bar is
   *  silent while the slot still occupies its place in the timeline. */
  private scheduleArrangement(project: Project): void {
    const train = liveTrain(project);
    const length = Math.max(1, train.length);
    train.forEach((car, k) => {
      if (car.muted) return; // tarped → silent bar
      const part = partForCar(project, car);
      // BACKWARDS mirror 3 of 3: the last car's bar plays first. A song run
      // backwards has to arrive at its beginning, so the ORDER of the sections
      // reverses, not only what happens inside each one.
      const slot = this.reversed ? length - 1 - k : k;
      if (part) this.scheduleLayers(project, part.layers, length, slot);
    });
  }

  /** Track view: stop everything, then loop just one library car (one bar). Used
   *  when a single car should sound on its own — independent of the train order. */
  playCarLoop(partId: string, project: Project): void {
    if (!this.started) return;
    const part = project.parts.find((p) => p.id === partId);
    if (!part) return;
    this.mode = "loop";
    this.sound.setTempo(project.tempoBpm);
    this.sound.clearScheduled();
    this.scheduleLayers(project, part.layers, 1, 0);
    this.sound.startTransport();
    this.playing = true;
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
        wobble: layer.wobble ?? 0,
        crunch: layer.crunch ?? 0,
        // One live fx chain per lane, shared by all its cells (see StepOptions).
        laneKey: layer.id,
      };
      // BACKWARDS mirror 2 of 3: within the bar, the last step plays first.
      const at = (i: number, span: number, total: number): number =>
        this.reversed ? mirrorIndex(i, span, total) : i;
      if (layer.kind === "melody") {
        const total = layer.notes.length || STEP_COUNT;
        const instrument = resolveInstrument(layer.instrument, layer.wave);
        layer.notes.forEach((chord, i) => {
          for (const n of chord) {
            const note = degreeToNote(project.scaleId, project.keyId, n.row);
            // Resolve bend pin rows → note names here so the adapter stays free
            // of music theory (Magic Notes lives in the core).
            const bend = n.pins?.map((p) => ({
              // A pin's `t` is a position INSIDE its note, so a backwards song
              // runs it backwards too — otherwise a bend that rose to its peak
              // would still rise while everything around it fell.
              t: this.reversed ? 1 - p.t : p.t,
              noteName: degreeToNote(project.scaleId, project.keyId, p.row),
            }));
            this.sound.scheduleNote(
              note, instrument, at(i, n.length ?? 1, total), total, opts,
              n.length, n.roll ?? 1, bend, cycleBars, barOffset,
            );
          }
        });
      } else {
        const total = layer.steps.length || STEP_COUNT;
        layer.steps.forEach((cell, i) => {
          // A drum hit's `row` is its tune (semitone offset); 0 = natural.
          if (cell)
            this.sound.scheduleStep(
              clip, at(i, cell.length ?? 1, total), total, opts,
              cell.length, cell.roll ?? 1, cell.row,
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

  /** Render the whole arrangement to a shareable WAV blob by riding the song
   *  once through while capturing the master output — the train audibly (and
   *  visibly: mode is "ride", so the Track scene animates) records its own take.
   *  Resolves with the file; playback is fully stopped afterwards. */
  async renderSong(project: Project): Promise<Blob> {
    if (!this.started) throw new Error("audio not started");
    this.sound.stopTransport();
    this.mode = "ride";
    this.sound.setTempo(project.tempoBpm);
    this.sound.clearScheduled();
    this.scheduleArrangement(project);
    this.playing = true;
    try {
      return await this.sound.captureBars(Math.max(1, liveTrain(project).length));
    } finally {
      this.playing = false;
      this.sound.stopTransport();
      this.sound.clearScheduled();
    }
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
    // Latches are a property of the RIDE; stopping the ride is flat ground.
    this.latched.clear();
  }

  /** Alias for `stop()` — reads clearer at call sites that mean "silence all". */
  stopAll(): void {
    this.stop();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  getAnalyser(): AnalyserNode {
    return this.sound.getAnalyser();
  }
}
