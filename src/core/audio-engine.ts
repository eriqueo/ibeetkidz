// AudioEngine: the core that reconciles the live audio graph to ProjectState.
// It owns NO DSP itself — everything routes through SoundPort. Its job is the
// state -> sound reconciliation loop and gesture-gated startup.

import type { Project } from "./types.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import type { QuantizeGrid } from "./quantize.ts";
import { liveTrain } from "./project-state.ts";
import { playbackPlan, playbackFingerprint, preparePlayback, schedulePlayback, type PlayMode } from "./playback-plan.ts";
import {
  DEFAULT_HOLD_BARS,
  LATCH_HOLD_BARS,
  combineModes,
  terrainEffect,
  type ModeKind,
  type TerrainKind,
  type TerrainRide,
} from "./terrain.ts";

/** Plan events scheduled per task while rehearsing. A newly built voice costs
 *  about 3 ms, so four keeps a slice near one 60 Hz frame at worst. */
const REHEARSE_SLICE = 4;

export class AudioEngine {
  private started = false;
  private playing = false;
  private mode: PlayMode = "loop";
  /** Supersedes an in-flight cold-cache play request. Preparation may await an
   *  offline bake; only the newest intent may commit a schedule or start audio. */
  private playGen = 0;
  /** Supersedes in-flight live reconciliations. The old schedule stays intact
   *  while a cold clip prepares; only the newest project may replace it. */
  private reconcileGen = 0;
  /** Single-entry, disposable cache: replace on commit; discard on stop/export.
   * No history or project objects are retained. */
  private scheduledFingerprint: string | null = null;

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
   *   2. the STEPS within a bar run last-to-first    (`playbackPlan`)
   *   3. the BARS of the train run last-to-first     (`playbackPlan`)
   *
   * Toggling while the song runs reconciles in place, so the flip is heard on
   * the very next scheduled pass without stopping the groove. Like terrain,
   * this is a performance — no Command, no history, never saved.
   */
  private reversed = false;

  async toggleReversed(project: Project): Promise<boolean> {
    this.reversed = !this.reversed;
    this.sound.setReversed(this.reversed);
    if (this.playing) await this.reconcile(project);
    return this.reversed;
  }

  get isReversed(): boolean {
    return this.reversed;
  }

  /** Set the global on-beat snap grid for one-off triggers. */
  setQuantize(grid: QuantizeGrid): void {
    this.sound.setQuantize(grid);
  }

  /** Reconcile transport + scheduled voices to match the project. Audible edits
   *  replace the schedule without stopping; presentation-only edits leave the
   *  live graph untouched. Honors the current play mode: "loop" rides
   *  the active car alone (one bar); "ride" lays out the whole arrangement. */
  async reconcile(project: Project): Promise<void> {
    if (!this.started) return;
    await this.reconcileIn(this.mode, project);
  }

  private async reconcileIn(mode: PlayMode, project: Project, force = false): Promise<boolean> {
    // Even an unchanged plan supersedes a pending edit (e.g. undo while baking).
    const gen = ++this.reconcileGen;
    const plan = playbackPlan(project, mode, this.reversed);
    const fingerprint = playbackFingerprint(plan);
    if (!force && this.playing && fingerprint === this.scheduledFingerprint) return true;
    await preparePlayback(plan, this.sound);
    if (gen !== this.reconcileGen) return false;
    this.sound.setTempo(plan.tempoBpm);
    this.sound.clearScheduled();
    schedulePlayback(plan, this.sound);
    this.scheduledFingerprint = fingerprint;
    return true;
  }

  /** Track view: stop everything, then loop just one library car (one bar). Used
   *  when a single car should sound on its own — independent of the train order. */
  async playCarLoop(partId: string, project: Project): Promise<void> {
    if (!this.started) return;
    const part = project.parts.find((p) => p.id === partId);
    if (!part) return;
    const gen = ++this.playGen;
    this.reconcileGen++;
    const plan = playbackPlan(project, "loop", this.reversed, part.layers);
    await preparePlayback(plan, this.sound);
    if (gen !== this.playGen) return;
    this.mode = "loop";
    this.sound.setTempo(plan.tempoBpm);
    this.sound.clearScheduled();
    schedulePlayback(plan, this.sound);
    this.scheduledFingerprint = playbackFingerprint(plan);
    this.sound.startTransport();
    this.playing = true;
  }

  /** Start (or restart) playback in a mode: reschedule for it, then run the
   *  transport. "loop" = Home's Play (active car); "ride" = the whole song. */
  private async playIn(mode: PlayMode, project: Project): Promise<void> {
    if (!this.started) return;
    const gen = ++this.playGen;
    const committed = await this.reconcileIn(mode, project, true);
    if (!committed || gen !== this.playGen) return;
    this.mode = mode;
    this.sound.startTransport();
    this.playing = true;
  }

  /** Build what a Ride will need BEFORE it is pressed, a few events at a time.
   *
   *  The adapter banks cleared voices and players for the next schedule, so
   *  only the FIRST schedule of a session builds them — ~90 Tone nodes, one
   *  230–290 ms freeze on Eric's laptop, landing on the Ride press just as the
   *  train starts to move. This schedules the same plan against the stopped
   *  transport in small slices (nothing sounds: the transport is not running),
   *  then clears it, which banks everything. Any play or edit supersedes it;
   *  whatever was built by then is still banked by that path's own clear. */
  async rehearse(project: Project, mode: PlayMode = "ride"): Promise<void> {
    if (!this.started || this.playing) return;
    const play = this.playGen;
    const reconcile = this.reconcileGen;
    const superseded = (): boolean =>
      this.playing || play !== this.playGen || reconcile !== this.reconcileGen;
    const plan = playbackPlan(project, mode, this.reversed);
    await preparePlayback(plan, this.sound);
    if (superseded()) return;
    this.sound.setTempo(plan.tempoBpm);
    this.sound.clearScheduled();
    for (let i = 0; i < plan.events.length; i += REHEARSE_SLICE) {
      schedulePlayback({ ...plan, events: plan.events.slice(i, i + REHEARSE_SLICE) }, this.sound);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (superseded()) return;
    }
    this.sound.clearScheduled();
  }

  /** Home's Play: loop the active car forever (unchanged single-loop behavior). */
  playLoop(project: Project): Promise<void> {
    return this.playIn("loop", project);
  }

  /** The Tracks strip's Ride: play through the whole arrangement, then loop it. */
  playRide(project: Project): Promise<void> {
    return this.playIn("ride", project);
  }

  /** Render the whole arrangement to a shareable WAV blob by riding the song
   *  once through while capturing the master output — the train audibly (and
   *  visibly: mode is "ride", so the Track scene animates) records its own take.
   *  Resolves with the file; playback is fully stopped afterwards. */
  async renderSong(project: Project): Promise<Blob> {
    if (!this.started) throw new Error("audio not started");
    const gen = ++this.playGen;
    this.reconcileGen++;
    this.sound.stopTransport();
    this.mode = "ride";
    this.scheduledFingerprint = null;
    const plan = playbackPlan(project, "ride", this.reversed);
    await preparePlayback(plan, this.sound);
    if (gen !== this.playGen) throw new Error("audio render superseded");
    this.sound.setTempo(plan.tempoBpm);
    this.sound.clearScheduled();
    schedulePlayback(plan, this.sound);
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

  /** Fractional song position in bars for drawing, or -1 when stopped. */
  getTransportBars(frameMs?: number): number {
    return this.sound.getTransportBars(frameMs);
  }

  get playMode(): PlayMode {
    return this.mode;
  }

  stop(): void {
    this.playGen++;
    this.reconcileGen++;
    this.sound.stopTransport();
    this.playing = false;
    this.scheduledFingerprint = null;
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

}
