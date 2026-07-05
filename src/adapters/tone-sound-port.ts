// ToneSoundPort: the ONLY file that knows Tone.js exists. It implements the
// SoundPort contract — builtin synthesis, mic recording, offline effect baking,
// one-shot + transport-scheduled playback, and the live theremin voice.
//
// Built against Tone v15.1. Built-in sounds are synthesized procedurally (no
// binary assets ship), keeping the app fully offline.

import * as Tone from "tone";
import type { Clip, ClipSource, EffectDescriptor } from "../core/types.ts";
import {
  BUILTIN_SOUNDS,
  getBuiltin,
  type BuiltinSound,
  type DrumKind,
} from "../core/sound-catalog.ts";
import { createRng } from "../core/rng.ts";
import { voiceBufferId, type InstrumentId } from "../core/instruments.ts";
import { gridSubdivision, type QuantizeGrid } from "../core/quantize.ts";
import {
  stepIndexFromProgress,
  subHitOffsets,
  swingDelayFraction,
} from "../core/timeline.ts";
import {
  MicDeniedError,
  NoMicError,
  type BendPoint,
  type BufferId,
  type SoundPort,
  type StepOptions,
  type ThereminWave,
} from "../ports/sound-port.ts";
import { encodeWav } from "./wav.ts";

/** A melody voice. The Mono-family synths share `.frequency`, so bend/roll/
 *  stretch all work on them. `Tone.Sampler` (Voice Keys — the kid's recording
 *  repitched chromatically) and `Tone.PluckSynth` (the guitar — a Karplus-Strong
 *  string model) have NO `.frequency` signal, so they cannot bend; the scheduler
 *  degrades a bend to a flat note for them (roll + stretch still work via
 *  `triggerAttackRelease`). All share `.volume`/`.connect`/`.triggerAttackRelease`/
 *  `.dispose`, so the scheduler is otherwise uniform. */
type MelodyVoice = Tone.Synth | Tone.FMSynth | Tone.MonoSynth | Tone.Sampler | Tone.PluckSynth;

/** Build a fresh voice for an instrument id. The recipe (oscillator + envelope
 *  + modulation/filter) lives HERE — it's the vendor detail the core delegates.
 *  Adding a timbre = one case here + one entry in `INSTRUMENTS` (core). */
function makeMelodyVoice(instrument: InstrumentId): MelodyVoice {
  switch (instrument) {
    case "smooth":
      return new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.2 },
      });
    case "buzzy":
      return new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
      });
    case "sharp":
      return new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
      });
    case "piano":
      // FM electric-piano: instant attack, plucky decay, low sustain.
      return new Tone.FMSynth({
        harmonicity: 2,
        modulationIndex: 6,
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 0.9, sustain: 0.08, release: 0.6 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.2 },
      });
    case "bells":
      // Bright inharmonic FM → bell / music box (no sustain, long ring).
      return new Tone.FMSynth({
        harmonicity: 3.01,
        modulationIndex: 12,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 1.2 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.5 },
      });
    case "organ":
      // Held, fat, no decay → sustained organ pad.
      return new Tone.Synth({
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.02, decay: 0.0, sustain: 1, release: 0.12 },
      });
    case "pluck":
      // Filtered short pluck (guitar-ish) via a fast filter envelope.
      return new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.2 },
        filterEnvelope: {
          attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.2,
          baseFrequency: 300, octaves: 3,
        },
      });
    case "brass":
      // Reedy sustained lead with a slower filter sweep.
      return new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.06, decay: 0.2, sustain: 0.7, release: 0.2 },
        filterEnvelope: {
          attack: 0.08, decay: 0.3, sustain: 0.6, release: 0.3,
          baseFrequency: 200, octaves: 3.5,
        },
      });
    case "guitar":
      // Karplus-Strong plucked string — a real guitar pluck: bright pick attack,
      // string-like decay + ring. No `.frequency` signal (so bend degrades to a
      // flat note, like the Voice Keys sampler).
      return new Tone.PluckSynth({
        attackNoise: 1.2,
        dampening: 4500,
        resonance: 0.93,
        release: 1.2,
      });
    case "soft":
    default:
      return new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
      });
  }
}

export class ToneSoundPort implements SoundPort {
  private analyser!: AnalyserNode;
  private ctx!: AudioContext;
  /** Decoded audio data keyed by buffer id (builtins, recordings, baked). */
  private readonly buffers = new Map<BufferId, AudioBuffer>();
  /** Encoded recording bytes, kept so the app can persist them. */
  private readonly recordingBlobs = new Map<BufferId, Blob>();
  /** Baked effect-chain results, keyed by source+chain signature. */
  private readonly bakedCache = new Map<string, AudioBuffer>();
  /** Beat-snapped (looped/trimmed) buffers, keyed by source+chain+beats@bpm. */
  private readonly loopCache = new Map<string, AudioBuffer>();
  /** Silence-trimmed copies of recordings, keyed by buffer id, used as the
   *  Voice Keys sampler one-shot so a note speaks immediately (a raw take has
   *  dead air before the voice starts — a short note would otherwise be silent). */
  private readonly voiceSampleCache = new Map<BufferId, Tone.ToneAudioBuffer>();
  private mic?: Tone.UserMedia | undefined;
  private recorder?: Tone.Recorder | undefined;
  /** Active while capturing a Magic Pad performance; live theremin voices
   *  connect to it (see thereminOn) so the whole performance — gaps and all —
   *  is recorded without needing the mic. */
  private perfRecorder?: Tone.Recorder | undefined;
  private bufferSeq = 0;
  private builtinsLoaded = false;
  private keepAliveBound = false;
  /** Bumped on every clearScheduled so an in-flight async (re)schedule whose
   *  generation is stale bails instead of leaking a voice onto the transport. */
  private scheduleGen = 0;
  /** Global snap grid for one-off triggers. Default: snap to each beat. */
  private quantizeGrid: QuantizeGrid = "beat";

  // Live one-shot + scheduled players, tracked for cleanup.
  private readonly liveVoices = new Set<Tone.Player>();
  private readonly scheduledVoices: Tone.Player[] = [];
  /** Per-melody-lane synth voices, scheduled on the transport. */
  private readonly scheduledSynths: MelodyVoice[] = [];
  /** Per-lane echo sends (FeedbackDelay nodes), torn down with the transport. */
  private readonly scheduledFx: Tone.ToneAudioNode[] = [];

  // Theremin voice (live, never baked).
  private thereminWave: ThereminWave = "triangle";
  private theremin?:
    | {
        osc: Tone.Oscillator;
        filter: Tone.Filter;
        gain: Tone.Gain;
      }
    | undefined;

  async resume(): Promise<void> {
    await Tone.start();
    // iOS routes Web Audio through the "ambient" session by default, which the
    // hardware mute/ringer switch silences — so the app boots and the
    // visualizer animates, but nothing is audible. Asking for the "playback"
    // session (iOS 16.4+) makes our sound ignore the silent switch. No-op on
    // platforms that don't expose `navigator.audioSession`.
    setAudioSession("playback");
    this.ctx = Tone.getContext().rawContext as AudioContext;
    // A raw AnalyserNode tapped off the master output feeds the visualizer —
    // it sees every real voice (builtins, recordings, theremin), never a fake.
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    Tone.getDestination().connect(this.analyser);
    this.installKeepAlive();
  }

  /** Dev-only diagnostics for the test bridge: is the context actually
   *  running, is the transport rolling, and is signal reaching the master
   *  output? `masterPeak` is the normalized peak deviation read off the same
   *  analyser that feeds the visualizer (0 = digital silence, ~1 = full scale),
   *  so it measures the REAL destination signal, never a fake. */
  getAudioDiag(): {
    contextState: string;
    currentTime: number;
    transportState: string;
    destinationMute: boolean;
    destinationVolumeDb: number;
    masterPeak: number;
  } {
    let masterPeak = -1;
    if (this.analyser) {
      const data = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      masterPeak = peak / 128;
    }
    const dest = Tone.getDestination();
    return {
      contextState: this.ctx ? this.ctx.state : "unbooted",
      currentTime: this.ctx ? this.ctx.currentTime : -1,
      transportState: Tone.getTransport().state,
      destinationMute: dest.mute,
      destinationVolumeDb: dest.volume.value,
      masterPeak,
    };
  }

  /** iOS suspends the AudioContext on interruptions (incoming call, screen
   *  lock, backgrounding) and does NOT auto-resume it — the app would go silent
   *  until reload. Resume on return-to-foreground and on any context state
   *  change. Bound once; the listeners live for the page's lifetime. */
  private installKeepAlive(): void {
    if (this.keepAliveBound) return;
    this.keepAliveBound = true;
    const resumeIfNeeded = (): void => {
      // `state` is "suspended"/"interrupted"(iOS) when paused; resume is a
      // no-op if already running and safe to call repeatedly.
      if (this.ctx.state !== "running") void this.ctx.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resumeIfNeeded();
    });
    this.ctx.addEventListener("statechange", resumeIfNeeded);
  }

  async loadBuiltins(): Promise<void> {
    if (this.builtinsLoaded) return;
    for (const sound of BUILTIN_SOUNDS) {
      this.buffers.set(`builtin:${sound.assetId}`, this.synthesize(sound));
    }
    this.builtinsLoaded = true;
  }

  // ── Recording ──────────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    // The "playback" session blocks mic capture on iOS — switch to
    // play-and-record before opening the mic, and restore playback on failure.
    setAudioSession("play-and-record");
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
      setAudioSession("playback");
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
    // Back to loud, silent-switch-defying playback now the mic is closed.
    setAudioSession("playback");
    const audioBuf = await this.decodeRecording(blob);
    const id = `rec-${this.bufferSeq++}`;
    this.buffers.set(id, audioBuf);
    this.recordingBlobs.set(id, blob);
    this.mic = undefined;
    this.recorder = undefined;
    return id;
  }

  async rehydrate(bufferId: BufferId, blob: Blob): Promise<void> {
    if (this.buffers.has(bufferId)) return;
    const audioBuf = await this.decodeRecording(blob);
    this.buffers.set(bufferId, audioBuf);
    this.recordingBlobs.set(bufferId, blob);
  }

  /** Decode a recorded blob and lift it to a consistent, audible level. Phone
   *  and laptop mics capture wildly different (often very low) input; raw
   *  recordings played quiet on every device. RMS-normalizing on decode — for
   *  both fresh and rehydrated recordings — makes "my voice" loud and even.
   *  The stored blob stays raw; the boost is reapplied on every reload. */
  private async decodeRecording(blob: Blob): Promise<AudioBuffer> {
    const arrayBuf = await blob.arrayBuffer();
    const audioBuf = await this.ctx.decodeAudioData(arrayBuf.slice(0));
    normalizeBuffer(audioBuf);
    return audioBuf;
  }

  async startPerformanceRecording(): Promise<void> {
    this.perfRecorder = new Tone.Recorder();
    this.perfRecorder.start();
    // A voice already playing won't be connected; thereminOn wires up voices
    // started after this point (the kid presses Record, then drags to play).
  }

  async stopPerformanceRecording(): Promise<BufferId> {
    const rec = this.perfRecorder;
    this.perfRecorder = undefined;
    if (!rec) throw new NoMicError();
    const blob = await rec.stop();
    rec.dispose();
    const audioBuf = await this.decodeRecording(blob);
    const id = `perf-${this.bufferSeq++}`;
    this.buffers.set(id, audioBuf);
    this.recordingBlobs.set(id, blob);
    return id;
  }

  getRecordingBlob(bufferId: BufferId): Blob | null {
    return this.recordingBlobs.get(bufferId) ?? null;
  }

  getBufferDuration(bufferId: BufferId): number | null {
    return this.buffers.get(bufferId)?.duration ?? null;
  }

  // ── Effect baking (render-once) ──────────────────────────────────────────

  async renderEffects(
    source: BufferId,
    effects: readonly EffectDescriptor[],
  ): Promise<BufferId> {
    const src = this.buffers.get(source);
    if (!src) throw new Error(`unknown buffer: ${source}`);
    const baked = await this.renderChain(src, effects);
    const id = `baked-${this.bufferSeq++}`;
    this.buffers.set(id, baked);
    return id;
  }

  /** Offline-render `src` through the effect chain into a new AudioBuffer. */
  private async renderChain(
    src: AudioBuffer,
    effects: readonly EffectDescriptor[],
  ): Promise<AudioBuffer> {
    if (effects.length === 0) return src;

    // "crazy" expands to a seeded random stack; everything else maps 1:1.
    const chain = effects.flatMap((e) =>
      e.id === "crazy" ? expandCrazy(e.amount) : [e],
    );

    // Reverse is a pure buffer op done up front; it isn't a graph node.
    let source = src;
    const reverseCount = chain.filter((e) => e.id === "reverse").length;
    if (reverseCount % 2 === 1) source = reverseBuffer(this.ctx, src);
    const graphFx = chain.filter((e) => e.id !== "reverse");

    const tail = graphFx.some((e) => e.id === "echo" || e.id === "reverb")
      ? 3
      : 0.1;
    const duration = source.duration + tail;

    const rendered = await Tone.Offline(async () => {
      const player = new Tone.Player(source);
      let node: Tone.ToneAudioNode = player;
      for (const fx of graphFx) {
        const made = makeEffectNode(fx);
        if (!made) continue;
        node.connect(made.node);
        node = made.node;
        if (made.ready) await made.ready;
      }
      node.toDestination();
      player.start(0);
    }, duration);

    return rendered.get() as AudioBuffer;
  }

  /** Resolve a clip to a playable AudioBuffer (baking effects + beat-snapping,
   *  both cached). */
  private async resolveClip(clip: Clip): Promise<AudioBuffer | undefined> {
    const base = this.resolveSource(clip.source);
    if (!base) return undefined;

    let buf = base;
    if (clip.effects.length > 0) {
      const key = bakeKey(clip);
      const cached = this.bakedCache.get(key);
      if (cached) buf = cached;
      else {
        buf = await this.renderChain(base, clip.effects);
        this.bakedCache.set(key, buf);
      }
    }

    // Snap-to-beat: loop/trim the (possibly effected) buffer to a whole number
    // of beats at the LIVE tempo, so it stays in the groove even after a tempo
    // change. Keyed off the bake signature + beats@bpm so it recomputes only
    // when something it depends on actually moves.
    if (clip.loopBeats !== undefined) {
      const bpm = Tone.getTransport().bpm.value || 120;
      const lkey = `${bakeKey(clip)}|loop:${clip.loopBeats}@${bpm.toFixed(2)}`;
      const cached = this.loopCache.get(lkey);
      if (cached) buf = cached;
      else {
        buf = loopToBeats(this.ctx, buf, clip.loopBeats, bpm);
        this.loopCache.set(lkey, buf);
      }
    }

    return buf;
  }

  private resolveSource(source: ClipSource): AudioBuffer | undefined {
    switch (source.kind) {
      case "builtin":
        return this.buffers.get(`builtin:${source.assetId}`);
      case "recording":
        return this.buffers.get(source.bufferId);
      case "synth": {
        const id = `synth:${source.note}`;
        let buf = this.buffers.get(id);
        if (!buf) {
          buf = this.synthesizeTone(Tone.Frequency(source.note).toFrequency());
          this.buffers.set(id, buf);
        }
        return buf;
      }
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────

  play(clip: Clip): void {
    void this.resolveClip(clip).then((buf) => {
      if (!buf) return;
      const player = new Tone.Player(buf).toDestination();
      this.liveVoices.add(player);
      player.onstop = () => {
        this.liveVoices.delete(player);
        player.dispose();
      };
      this.startQuantized(player);
    });
  }

  /** Start a one-shot player on the beat when the transport is running and a
   *  snap grid is set; otherwise start it immediately. A small near-boundary
   *  guard avoids an audible stall when the next grid line is essentially now. */
  private startQuantized(player: Tone.Player): void {
    const subdivision = gridSubdivision(this.quantizeGrid);
    const transport = Tone.getTransport();
    if (subdivision === null || transport.state !== "started") {
      player.start();
      return;
    }
    const when = transport.nextSubdivision(subdivision);
    const now = this.ctx.currentTime;
    if (when - now < 0.03) {
      player.start();
    } else {
      player.start(when);
    }
  }

  /** Build a melody voice for an instrument id. A `voice:<bufferId>` id makes a
   *  `Tone.Sampler` from the kid's recording (mapped to C4, repitched across the
   *  scale); everything else is a built-in synth. Falls back to a synth if the
   *  recording buffer isn't loaded yet, so a lane always makes sound. */
  private buildMelodyVoice(instrument: InstrumentId): MelodyVoice {
    const bufId = voiceBufferId(instrument);
    if (bufId !== null) {
      const sample = this.voiceSample(bufId);
      if (sample) return new Tone.Sampler({ urls: { C4: sample } });
      return makeMelodyVoice("soft"); // buffer not ready → still make sound
    }
    return makeMelodyVoice(instrument);
  }

  /** The silence-trimmed sampler buffer for a recording, built (and cached) on
   *  first use. A raw take leads with dead air before the voice starts; a short
   *  melody note would play only that silence. Trimming makes the sampled voice
   *  speak the instant a note fires. Returns null until the recording decodes. */
  private voiceSample(bufId: BufferId): Tone.ToneAudioBuffer | null {
    const cached = this.voiceSampleCache.get(bufId);
    if (cached) return cached;
    const buf = this.buffers.get(bufId);
    if (!buf) return null;
    const trimmed = new Tone.ToneAudioBuffer(trimSilence(this.ctx, buf));
    this.voiceSampleCache.set(bufId, trimmed);
    return trimmed;
  }

  /** Natural (trimmed) length of a voice instrument's recording, or null for a
   *  synth / not-yet-loaded buffer. Used to ring the sampled voice for its whole
   *  duration instead of cutting it off at a short note. */
  private voiceSampleDuration(instrument: InstrumentId): number | null {
    const bufId = voiceBufferId(instrument);
    if (bufId === null) return null;
    const sample = this.voiceSample(bufId);
    return sample ? sample.duration : null;
  }

  previewNote(noteName: string, instrument: InstrumentId): void {
    // Audition with the lane's real instrument so the tap matches Play.
    const synth = this.buildMelodyVoice(instrument).toDestination();
    // A sampled voice rings for its whole recorded length (clamped) so the tap
    // plays the full "aaah" instead of cutting it short; synths stay snappy.
    const voiceDur = this.voiceSampleDuration(instrument);
    const dur = voiceDur !== null ? Math.min(4, Math.max(0.4, voiceDur)) : "8n";
    synth.triggerAttackRelease(noteName, dur);
    // Free the voice once it has rung out (bells/piano + long takes ring longer).
    const holdMs = typeof dur === "number" ? dur * 1000 + 600 : 1600;
    setTimeout(() => synth.dispose(), holdMs);
  }

  /** Duration of one bar (measure) in seconds at the live tempo. */
  private barSec(): number {
    return Tone.Time("1m").toSeconds();
  }

  /** Duration of one step in seconds at the live tempo. */
  private stepDurationSec(totalSteps: number): number {
    return Tone.Time("1m").toSeconds() / Math.max(1, totalSteps);
  }

  /** Seconds-into-the-bar a step fires, with swing leaning the off-beats late. */
  private stepOffset(stepIndex: number, totalSteps: number, swing: number): number {
    const stepDur = this.stepDurationSec(totalSteps);
    return stepDur * (stepIndex + swingDelayFraction(stepIndex, swing));
  }

  /** Build the input node for a scheduled voice: an optional tone (low-pass)
   *  stage feeding an optional echo send, ending at the main output. Returns
   *  the head of the chain (what the voice connects into). Created nodes are
   *  tracked in `scheduledFx` so re-scheduling never leaks. */
  private scheduledDestination(opts: StepOptions): Tone.ToneAudioNode {
    // Build back-to-front so each stage targets the next; default = master out.
    let head: Tone.ToneAudioNode = Tone.getDestination();

    if (opts.echo > 0) {
      const delay = new Tone.FeedbackDelay({
        delayTime: "8n",
        feedback: 0.2 + opts.echo * 0.5,
        wet: Math.min(0.6, opts.echo),
      }).toDestination();
      this.scheduledFx.push(delay);
      head = delay;
    }

    if (opts.tone < 0.999) {
      // tone 1 → ~14 kHz (open); tone 0 → ~500 Hz (muffled). Log-ish mapping.
      const cutoff = 500 + opts.tone * opts.tone * 13500;
      const filter = new Tone.Filter(cutoff, "lowpass");
      filter.connect(head);
      this.scheduledFx.push(filter);
      head = filter;
    }

    // Silliness knobs (live per-lane sends, adapted from the offline FX bakes):
    // crunch = the bitcrush stage (fewer bits as the knob turns), wobble = a
    // chorus whose depth/mix track the knob (the offline "robot"/wobble family).
    if ((opts.crunch ?? 0) > 0.01) {
      const crunch = opts.crunch ?? 0;
      const crusher = new Tone.BitCrusher(Math.round(8 - crunch * 5)); // 8→3 bits
      crusher.wet.value = Math.min(1, 0.3 + crunch * 0.7);
      crusher.connect(head);
      this.scheduledFx.push(crusher);
      head = crusher;
    }
    if ((opts.wobble ?? 0) > 0.01) {
      const wobble = opts.wobble ?? 0;
      const chorus = new Tone.Chorus({
        frequency: 1.5 + wobble * 4.5, // gentle shimmer → seasick wobble
        depth: 0.3 + wobble * 0.7,
        wet: Math.min(1, 0.35 + wobble * 0.65),
      }).start();
      chorus.connect(head);
      this.scheduledFx.push(chorus);
      head = chorus;
    }

    return head;
  }

  scheduleStep(
    clip: Clip,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
    lengthSteps = 1,
    roll = 1,
    pitch = 0,
    cycleBars = 1,
    barOffset = 0,
  ): void {
    const interval = `${Math.max(1, cycleBars)}m`;
    const offset =
      this.barSec() * barOffset + this.stepOffset(stepIndex, totalSteps, opts.swing);
    const stepDur = this.stepDurationSec(totalSteps);
    // A roll fires `roll` evenly-spaced hits within the start step with a rising
    // velocity (a crescendo fill).
    const subs = subHitOffsets(roll, stepDur);
    const baseVol = Math.max(0.0001, opts.volume);
    const startAll = (player: Tone.Player, time: number): void => {
      subs.forEach((s, k) => {
        const v =
          roll > 1 ? baseVol * (0.5 + 0.5 * (k / (roll - 1))) : baseVol;
        player.volume.setValueAtTime(Tone.gainToDb(Math.max(0.0001, v)), time + s);
        player.start(time + s);
      });
    };

    // Built-in, un-effected drums render parametrically: `length` rings them
    // longer (stretch now audible) and `pitch` tunes them. Effected clips and
    // recordings (a "funny" voice sent to Home) still go through resolveClip so
    // they loop with their baked effects.
    const kind = builtinDrumKind(clip);
    if (kind) {
      // A rolled drum stays its natural length (crisp sub-hits); otherwise length
      // stretches the ring up to the note's span.
      const defDur = ToneSoundPort.DRUM_DUR[kind];
      const durationSec =
        roll > 1
          ? defDur
          : Math.max(defDur, Math.min(lengthSteps, totalSteps) * stepDur);
      const player = new Tone.Player(
        this.drumBuffer(kind, durationSec, pitch),
      ).connect(this.scheduledDestination(opts));
      this.scheduledVoices.push(player);
      Tone.getTransport().scheduleRepeat((time) => startAll(player, time), interval, offset);
      return;
    }

    const gen = this.scheduleGen;
    void this.resolveClip(clip).then((buf) => {
      if (!buf || gen !== this.scheduleGen) return;
      const player = new Tone.Player(buf).connect(
        this.scheduledDestination(opts),
      );
      this.scheduledVoices.push(player);
      Tone.getTransport().scheduleRepeat((time) => startAll(player, time), interval, offset);
    });
  }

  /** Synthesize-and-cache a built-in drum at a requested ring duration + pitch.
   *  Bucketed so the cache actually hits while the kid drags length/tune. */
  private drumBuffer(kind: DrumKind, durationSec: number, pitch: number): AudioBuffer {
    const durBucket = Math.round(durationSec * 20) / 20; // 0.05s steps
    const pitchBucket = Math.max(-24, Math.min(24, Math.round(pitch)));
    const key = `drum:${kind}:${durBucket}:${pitchBucket}`;
    let buf = this.buffers.get(key);
    if (!buf) {
      buf = this.synthDrum(kind, { durationSec: durBucket, pitch: pitchBucket });
      this.buffers.set(key, buf);
    }
    return buf;
  }

  scheduleNote(
    noteName: string,
    instrument: InstrumentId,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
    lengthSteps = 1,
    roll = 1,
    bend?: readonly BendPoint[],
    cycleBars = 1,
    barOffset = 0,
  ): void {
    const synth = this.buildMelodyVoice(instrument).connect(
      this.scheduledDestination(opts),
    );
    synth.volume.value = Tone.gainToDb(Math.max(0.0001, opts.volume));
    this.scheduledSynths.push(synth);
    const interval = `${Math.max(1, cycleBars)}m`;
    const offset =
      this.barSec() * barOffset + this.stepOffset(stepIndex, totalSteps, opts.swing);
    const stepDur = this.stepDurationSec(totalSteps);
    const hasBend = !!bend && bend.length > 0;
    // A sampled voice rings for at least its whole recorded length, so a short
    // note doesn't chop the "aaah" off; a longer note still stretches past it.
    const voiceDur = synth instanceof Tone.Sampler
      ? this.voiceSampleDuration(instrument)
      : null;
    Tone.getTransport().scheduleRepeat(
      (time) => {
        const noteDur = Math.max(0.05, lengthSteps * stepDur * 0.92);
        const dur = voiceDur !== null ? Math.max(noteDur, Math.min(4, voiceDur)) : noteDur;
        if (hasBend && "frequency" in synth) {
          // Swoop: hold one voice and ramp its pitch through the bend points.
          // triggerAttack anchors the start frequency; each point is an
          // exponential ramp (equal pitch steps sound even). Clear last loop's
          // ramps first so they don't bleed into this one. (Sampler + PluckSynth
          // have no `.frequency` signal, so they fall through to a flat note.)
          synth.frequency.cancelScheduledValues(time);
          synth.triggerAttack(noteName, time);
          for (const pt of bend) {
            const when = time + Math.min(1, Math.max(0, pt.t)) * dur;
            const hz = Math.max(1, Tone.Frequency(pt.noteName).toFrequency());
            synth.frequency.exponentialRampToValueAtTime(hz, when);
          }
          synth.triggerRelease(time + dur);
        } else if (roll > 1) {
          // Re-pluck the note `roll` times inside the start step (a melody fill).
          const subDur = (stepDur / roll) * 0.9;
          for (const s of subHitOffsets(roll, stepDur)) {
            synth.triggerAttackRelease(noteName, subDur, time + s);
          }
        } else {
          // Sustain the voice across the note's length (Stretch), held just shy
          // of the next note so consecutive notes don't smear together.
          synth.triggerAttackRelease(noteName, dur, time);
        }
      },
      interval,
      offset,
    );
  }

  // ── Theremin (live voice) ─────────────────────────────────────────────

  // C-major pentatonic across ~2 octaves: kid-friendly, no wrong notes.
  private static readonly THEREMIN_SCALE = [
    261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
    1046.5,
  ];

  thereminOn(): void {
    if (this.theremin) return;
    const osc = new Tone.Oscillator(440, this.thereminWave);
    const filter = new Tone.Filter(1200, "lowpass");
    const gain = new Tone.Gain(0).toDestination();
    osc.connect(filter);
    filter.connect(gain);
    // While a performance is being captured, also feed this voice to the
    // recorder so the Magic Pad track records what you hear.
    if (this.perfRecorder) gain.connect(this.perfRecorder);
    osc.start();
    gain.gain.rampTo(0.25, 0.05);
    this.theremin = { osc, filter, gain };
  }

  setThereminXY(x: number, y: number): void {
    if (!this.theremin) return;
    const scale = ToneSoundPort.THEREMIN_SCALE;
    const idx = Math.min(scale.length - 1, Math.floor(x * scale.length));
    this.theremin.osc.frequency.rampTo(scale[idx] as number, 0.04);
    // y → brightness (filter cutoff), 300 Hz .. 6 kHz.
    this.theremin.filter.frequency.rampTo(300 + y * 5700, 0.04);
  }

  setThereminWaveform(wave: ThereminWave): void {
    this.thereminWave = wave;
    if (this.theremin) this.theremin.osc.type = wave;
  }

  thereminOff(): void {
    const t = this.theremin;
    if (!t) return;
    this.theremin = undefined;
    t.gain.gain.rampTo(0, 0.08);
    // Dispose after the fade so we don't cut with a click.
    const osc = t.osc;
    const filter = t.filter;
    const gain = t.gain;
    osc.stop("+0.1");
    setTimeout(() => {
      osc.dispose();
      filter.dispose();
      gain.dispose();
    }, 200);
  }

  // ── Transport ────────────────────────────────────────────────────────────

  /** How long the take keeps rolling after the last bar, so per-lane echo
   *  (FeedbackDelay) tails ring out instead of being cut mid-decay. */
  private static readonly CAPTURE_TAIL_MS = 1200;

  /** Blob-module URL for the capture worklet, created once per page. Inlined
   *  so the app stays a self-contained bundle (no extra asset to serve —
   *  matters for the offline posture). */
  private captureTapUrl?: string | undefined;

  private tapModuleUrl(): string {
    if (!this.captureTapUrl) {
      const src = `registerProcessor("ibk-capture-tap", class extends AudioWorkletProcessor {
        process(inputs) {
          const i = inputs[0];
          if (i && i[0]) this.port.postMessage({ l: new Float32Array(i[0]), r: new Float32Array(i[1] ?? i[0]) });
          return true;
        }
      });`;
      this.captureTapUrl = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
    }
    return this.captureTapUrl;
  }

  /** Open a raw-sample tap on the master output. Raw Float32 frames → WAV is
   *  one lossless path with no per-engine codec differences (MediaRecorder is
   *  deliberately avoided: absent on some WebKit builds, engine-dependent
   *  intermediate codec on the rest).
   *
   *  Tone v15 wraps every node in standardized-audio-context, and the wrapper
   *  exposes neither ScriptProcessor nor a usable second worklet module (Tone's
   *  addAudioWorkletModule caches a single promise, so a second URL is silently
   *  never loaded). So the ONE path, verified on Chromium + WebKit + Firefox:
   *  bridge the master out of the wrapped graph as a MediaStream (the wrapper
   *  does implement MediaStreamAudioDestinationNode), then tap the stream on
   *  the UNDERLYING NATIVE context — native worklet preferred, ScriptProcessor
   *  as the fallback for engines predating worklets.
   *  The tap node must stay pulled into the graph to process, so its (silent)
   *  output is wired to the destination — it adds nothing audible. */
  private async openMasterTap(): Promise<{
    start(): void;
    stop(): { left: Float32Array; right: Float32Array };
    dispose(): void;
  }> {
    const chunks: { l: Float32Array; r: Float32Array }[] = [];
    let on = false;
    const collect = (): { left: Float32Array; right: Float32Array } => {
      let frames = 0;
      for (const c of chunks) frames += c.l.length;
      const left = new Float32Array(frames);
      const right = new Float32Array(frames);
      let o = 0;
      for (const c of chunks) {
        left.set(c.l, o);
        right.set(c.r, o);
        o += c.l.length;
      }
      return { left, right };
    };
    const dest = Tone.getDestination(); // same tap point as the visualizer

    // The bridge node lives in Tone's graph; its .stream is a real MediaStream
    // we can tap with NATIVE nodes on the native context underneath the
    // wrapper (`_nativeAudioContext` is pinned by the lockfile — if the lib
    // ever renames it, we fall back to the wrapper and the worklet/SP probes
    // below surface the failure loudly instead of recording silence).
    const bridge = this.ctx.createMediaStreamDestination();
    dest.connect(bridge as unknown as AudioNode);
    const native =
      (this.ctx as unknown as { _nativeAudioContext?: AudioContext })._nativeAudioContext ??
      this.ctx;
    const source = native.createMediaStreamSource(bridge.stream);
    const unbridge = (): void => {
      source.disconnect();
      dest.disconnect(bridge as unknown as AudioNode);
    };

    if (native.audioWorklet) {
      try {
        await native.audioWorklet.addModule(this.tapModuleUrl());
        const node = new AudioWorkletNode(native, "ibk-capture-tap");
        node.port.onmessage = (e) => {
          if (on) chunks.push(e.data as { l: Float32Array; r: Float32Array });
        };
        source.connect(node);
        node.connect(native.destination);
        return {
          start: () => {
            on = true;
          },
          stop: () => {
            on = false;
            return collect();
          },
          dispose: () => {
            node.port.onmessage = null;
            unbridge();
            node.disconnect();
          },
        };
      } catch (err) {
        // e.g. an engine that rejects blob worklet modules — fall through to
        // ScriptProcessor, but say so: a silent downgrade hides breakage.
        console.warn("capture: native worklet tap unavailable, falling back", err);
      }
    }

    if (typeof native.createScriptProcessor === "function") {
      const sp = native.createScriptProcessor(4096, 2, 2);
      sp.onaudioprocess = (e) => {
        if (!on) return;
        chunks.push({
          l: new Float32Array(e.inputBuffer.getChannelData(0)),
          r: new Float32Array(e.inputBuffer.getChannelData(1)),
        });
      };
      source.connect(sp);
      sp.connect(native.destination);
      return {
        start: () => {
          on = true;
        },
        stop: () => {
          on = false;
          return collect();
        },
        dispose: () => {
          sp.onaudioprocess = null;
          unbridge();
          sp.disconnect();
        },
      };
    }

    unbridge();
    throw new Error("no master capture available (no AudioWorklet or ScriptProcessor)");
  }

  async captureBars(bars: number): Promise<Blob> {
    const transport = Tone.getTransport();
    transport.stop(); // also rewinds the playhead to bar 0
    const tap = await this.openMasterTap();
    try {
      const beatsPerBar =
        typeof transport.timeSignature === "number" ? transport.timeSignature : 4;
      // Stop one tick shy of the loop boundary: at exactly `bars` measures the
      // scheduleRepeat cycle would re-trigger the song's first hit into the tail.
      const endTicks = bars * beatsPerBar * transport.PPQ - 1;
      const rideDone = new Promise<void>((resolve) => {
        transport.scheduleOnce((time) => {
          transport.stop(time);
          resolve();
        }, `${endTicks}i`);
      });
      tap.start();
      transport.start();
      await rideDone;
      // Let the per-lane echo tails ring out before cutting the take.
      await new Promise((r) => setTimeout(r, ToneSoundPort.CAPTURE_TAIL_MS));
      const { left, right } = tap.stop();
      return encodeWav({
        numberOfChannels: 2,
        length: left.length,
        sampleRate: this.ctx.sampleRate,
        getChannelData: (c) => (c === 0 ? left : right),
      });
    } finally {
      transport.stop();
      tap.dispose();
    }
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
  /** Cancel scheduled repeats + dispose loop voices, but leave the transport
   *  running. Re-scheduling continues on the next bar, so editing a loop while
   *  it plays never interrupts the groove. */
  clearScheduled(): void {
    this.scheduleGen++; // invalidate any async scheduleStep still in flight
    Tone.getTransport().cancel();
    for (const p of this.scheduledVoices) p.dispose();
    this.scheduledVoices.length = 0;
    for (const s of this.scheduledSynths) s.dispose();
    this.scheduledSynths.length = 0;
    for (const fx of this.scheduledFx) fx.dispose();
    this.scheduledFx.length = 0;
  }

  stopAll(): void {
    Tone.getTransport().stop();
    this.clearScheduled();
  }

  setQuantize(grid: QuantizeGrid): void {
    this.quantizeGrid = grid;
  }

  getTransportStep(totalSteps: number): number {
    const t = Tone.getTransport();
    if (t.state !== "started") return -1;
    const beatsPerBar = typeof t.timeSignature === "number" ? t.timeSignature : 4;
    const ticksPerBar = t.PPQ * beatsPerBar;
    const progress = (t.ticks % ticksPerBar) / ticksPerBar;
    return stepIndexFromProgress(progress, totalSteps);
  }

  getTransportBar(): number {
    const t = Tone.getTransport();
    if (t.state !== "started") return -1;
    const beatsPerBar = typeof t.timeSignature === "number" ? t.timeSignature : 4;
    const ticksPerBar = t.PPQ * beatsPerBar;
    return Math.floor(t.ticks / ticksPerBar);
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  // ── Procedural synthesis ─────────────────────────────────────────────────

  private synthesize(sound: BuiltinSound): AudioBuffer {
    if (sound.recipe.kind === "tone") {
      return this.synthesizeTone(Tone.Frequency(sound.recipe.note).toFrequency());
    }
    return this.synthDrum(sound.recipe.drum, {});
  }

  /** Default ring time (seconds) per drum at pitch 0. Length-aware playback (the
   *  rework's Increment 2) scales the decay so a stretched drum rings longer. */
  private static readonly DRUM_DUR: Record<DrumKind, number> = {
    kick: 0.5, snare: 0.25, hihat: 0.08, clap: 0.22, tom: 0.45, cowbell: 0.32,
    openhat: 0.5, rim: 0.06, shaker: 0.14, conga: 0.34,
  };

  private makeBuffer(
    seconds: number,
    render: (data: Float32Array, sampleRate: number) => void,
  ): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(seconds * sr));
    const buf = this.ctx.createBuffer(1, len, sr);
    render(buf.getChannelData(0), sr);
    return buf;
  }

  private synthesizeTone(freq: number): AudioBuffer {
    return this.makeBuffer(0.5, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const env = Math.min(1, t / 0.005) * Math.exp(-t * 5);
        d[i] =
          0.6 *
          env *
          (Math.sin(2 * Math.PI * freq * t) +
            0.3 * Math.sin(4 * Math.PI * freq * t) +
            0.12 * Math.sin(6 * Math.PI * freq * t));
      }
    });
  }

  /** Parametric drum voice: a fuller layered-synthesis render of one drum, with
   *  an optional requested `durationSec` (length-aware ring) and `pitch`
   *  (semitone tune of the tonal component). All recipes are peak-limited so the
   *  richer layering never clips. `pitch`/`durationSec` are honored now; the
   *  scheduler wires them through in Increment 2. */
  private synthDrum(
    kind: DrumKind,
    params: { durationSec?: number; pitch?: number },
  ): AudioBuffer {
    const defDur = ToneSoundPort.DRUM_DUR[kind] ?? 0.3;
    const dur = Math.max(0.02, params.durationSec ?? defDur);
    const pm = Math.pow(2, (params.pitch ?? 0) / 12); // pitch multiplier
    const ds = defDur / dur; // >1 shortens, <1 lengthens the ring (stretch)
    const noise = seededNoise(kind.length * 7919 + 1);
    const buf = this.makeBuffer(dur, (d, sr) => {
      switch (kind) {
        case "kick": {
          // Sine body with a fast pitch drop + a noisy click transient for punch.
          let phase = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            phase += (2 * Math.PI * (48 + 80 * Math.exp(-t * 32)) * pm) / sr;
            const body = 0.9 * Math.sin(phase) * Math.exp(-t * 6.5 * ds);
            const click = t < 0.006 ? 0.5 * noise() * Math.exp(-t * 800) : 0;
            d[i] = body + click;
          }
          break;
        }
        case "snare": {
          // Noise burst over a two-tone shell.
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const tone =
              0.32 * Math.sin(2 * Math.PI * 180 * pm * t) +
              0.18 * Math.sin(2 * Math.PI * 330 * pm * t);
            d[i] = (0.6 * noise() + tone) * Math.exp(-t * 22 * ds);
          }
          break;
        }
        case "hihat": {
          let prev = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const n = noise();
            const hp = (n - prev) * 0.6;
            prev = n;
            d[i] = hp * Math.exp(-t * 90 * ds);
          }
          break;
        }
        case "openhat": {
          // Like the hat but with a long, slightly metallic tail.
          let prev = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const n = noise();
            const hp = (n - prev) * 0.5;
            prev = n;
            const ring =
              0.1 *
              (Math.sign(Math.sin(2 * Math.PI * 6300 * pm * t)) +
                Math.sign(Math.sin(2 * Math.PI * 9200 * pm * t)));
            d[i] = (hp + ring) * Math.exp(-t * 8 * ds);
          }
          break;
        }
        case "clap": {
          const bursts = [0, 0.011, 0.022, 0.035];
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            let env = 0;
            for (const b of bursts) if (t >= b) env += Math.exp(-(t - b) * 120);
            d[i] = noise() * Math.min(1, env) * Math.exp(-t * 7 * ds);
          }
          break;
        }
        case "tom": {
          let phase = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            phase += (2 * Math.PI * (92 + 70 * Math.exp(-t * 13)) * pm) / sr;
            d[i] = Math.sin(phase) * Math.exp(-t * 6 * ds);
          }
          break;
        }
        case "conga": {
          // A higher, tighter tom with a noisy slap on the attack.
          let phase = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            phase += (2 * Math.PI * (210 + 130 * Math.exp(-t * 30)) * pm) / sr;
            const slap = t < 0.008 ? 0.4 * noise() * Math.exp(-t * 400) : 0;
            d[i] = Math.sin(phase) * Math.exp(-t * 8 * ds) + slap;
          }
          break;
        }
        case "cowbell": {
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const sq = (f: number) => Math.sign(Math.sin(2 * Math.PI * f * pm * t));
            d[i] = 0.4 * (sq(540) + sq(800)) * Math.exp(-t * 8 * ds);
          }
          break;
        }
        case "rim": {
          // Short woody click: a high tone ping + a tiny noise tick.
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            d[i] =
              Math.sin(2 * Math.PI * 1700 * pm * t) * Math.exp(-t * 240) +
              0.3 * noise() * Math.exp(-t * 500);
          }
          break;
        }
        case "shaker": {
          // Band-ish noise with a soft attack then decay → "shh-k".
          let prev = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const n = noise();
            const hp = (n - prev) * 0.7;
            prev = n;
            d[i] = hp * Math.min(1, t / 0.02) * Math.exp(-t * 26 * ds);
          }
          break;
        }
        default:
          d.fill(0);
      }
    });
    limitPeak(buf.getChannelData(0), 0.97);
    return buf;
  }
}

// ── Effect node factory (module-scoped: pure mapping, no instance state) ─────

interface MadeNode {
  node: Tone.ToneAudioNode;
  ready?: Promise<void> | undefined;
}

function makeEffectNode(fx: EffectDescriptor): MadeNode | null {
  const amt = clamp01(fx.amount);
  switch (fx.id) {
    case "pitchUp":
      return { node: new Tone.PitchShift(Math.round(3 + amt * 9)) };
    case "pitchDown":
      return { node: new Tone.PitchShift(-Math.round(3 + amt * 9)) };
    case "robot":
      // Metallic comb + crunch: short feedback delay stacked under a pitch drop.
      return { node: new Tone.FeedbackDelay(0.018, 0.55 + amt * 0.3) };
    case "echo":
      return { node: new Tone.FeedbackDelay(0.22, 0.25 + amt * 0.5) };
    case "reverb": {
      const reverb = new Tone.Reverb(0.8 + amt * 4);
      return { node: reverb, ready: reverb.ready.then(() => undefined) };
    }
    case "bitcrush":
      return { node: new Tone.BitCrusher(Math.max(1, Math.round(8 - amt * 6))) };
    case "reverse":
    case "crazy":
      return null; // handled before the graph is built
  }
}

/** "Make it crazy" → a deterministic random stack seeded from `amount`. */
function expandCrazy(amount: number): EffectDescriptor[] {
  const rng = createRng(Math.max(1, Math.floor(amount * 1_000_000)));
  const palette = ["pitchUp", "pitchDown", "robot", "echo", "bitcrush"] as const;
  const count = rng.int(2, 3);
  const out: EffectDescriptor[] = [];
  if (rng.next() < 0.5) out.push({ id: "reverse", amount: 1 });
  for (let i = 0; i < count; i++) {
    out.push({ id: rng.pick(palette), amount: rng.next() });
  }
  return out;
}

/** Make a recording LOUD in place. Peak-normalizing alone left takes quiet: one
 *  stray click sets the peak while the voice's average energy — what we actually
 *  hear as loudness — stays low. Instead, normalize toward a target RMS measured
 *  over the *active* signal (samples above a small absolute floor, so silence
 *  doesn't deflate the estimate and — unlike a peak-relative floor — a single
 *  click can't exclude the real, quieter voice), then soft-clip every sample
 *  through `tanh` so the boost saturates gently instead of clipping harshly.
 *  Near-silent buffers are left alone so we never amplify pure noise into a roar. */
function normalizeBuffer(buf: AudioBuffer, targetRms = 0.25): void {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i] as number);
      if (a > peak) peak = a;
    }
  }
  if (peak < 1e-4) return; // effectively silent — nothing worth lifting
  // Absolute floor: counts real (even quiet) signal, skips digital silence, and
  // isn't thrown off by a lone transient the way a 5%-of-peak floor would be.
  const floor = 0.003;
  let sumSq = 0;
  let n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const x = data[i] as number;
      if (Math.abs(x) >= floor) {
        sumSq += x * x;
        n++;
      }
    }
  }
  if (n === 0) return;
  const rms = Math.sqrt(sumSq / n);
  if (rms < 1e-5) return;
  // Cap the gain so a whisper-quiet take isn't blown up to pure saturation.
  const gain = Math.min(60, Math.max(1, targetRms / rms));
  if (gain <= 1.0001) return; // already loud enough — leave it
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.tanh(gain * (data[i] as number));
    }
  }
}

/** Trim leading and trailing near-silence from a recording so it works as a
 *  sampled instrument: a note (often a fraction of a second) must hit the voice
 *  immediately, not the dead air before the singer starts. The threshold is
 *  relative to the take's own peak so it works for quiet and loud recordings;
 *  a few ms of head-room is kept so the onset isn't clipped. Returns the source
 *  unchanged if it's silent or already tight. */
function trimSilence(ctx: AudioContext, buf: AudioBuffer): AudioBuffer {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i] as number);
      if (a > peak) peak = a;
    }
  }
  if (peak < 1e-4) return buf; // effectively silent — nothing to trim against
  const threshold = Math.max(peak * 0.05, 0.01);
  let start = buf.length;
  let end = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i] as number) >= threshold) {
        if (i < start) start = i;
        if (i > end) end = i;
      }
    }
  }
  if (start >= end) return buf; // no sustained signal found — leave it be
  const pad = Math.round(buf.sampleRate * 0.005); // 5ms onset head-room
  const tail = Math.round(buf.sampleRate * 0.05); // 50ms release tail
  start = Math.max(0, start - pad);
  end = Math.min(buf.length - 1, end + tail);
  const length = end - start + 1;
  if (length >= buf.length) return buf; // already tight
  const out = ctx.createBuffer(buf.numberOfChannels, length, buf.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buf.getChannelData(ch).subarray(start, end + 1));
  }
  return out;
}

/** Loop/trim a buffer to exactly `beats` whole beats at `bpm`. Shorter takes
 *  wrap (repeat) to fill the length; longer takes are trimmed. This is the
 *  buffer-side of snap-to-beat — the pure beat math lives in `nearestBeatLoop`. */
function loopToBeats(
  ctx: AudioContext,
  src: AudioBuffer,
  beats: number,
  bpm: number,
): AudioBuffer {
  const sr = src.sampleRate;
  const targetLen = Math.max(1, Math.round((beats * (60 / bpm)) * sr));
  const out = ctx.createBuffer(src.numberOfChannels, targetLen, sr);
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const inData = src.getChannelData(ch);
    const outData = out.getChannelData(ch);
    const n = inData.length;
    for (let i = 0; i < targetLen; i++) {
      outData[i] = inData[i % n] as number; // wrap = loop; first slice = trim
    }
  }
  return out;
}

function reverseBuffer(ctx: AudioContext, src: AudioBuffer): AudioBuffer {
  const out = ctx.createBuffer(
    src.numberOfChannels,
    src.length,
    src.sampleRate,
  );
  for (let ch = 0; ch < src.numberOfChannels; ch++) {
    const inData = src.getChannelData(ch);
    const outData = out.getChannelData(ch);
    for (let i = 0, n = inData.length; i < n; i++) {
      outData[i] = inData[n - 1 - i] as number;
    }
  }
  return out;
}

function bakeKey(clip: Clip): string {
  const srcKey =
    clip.source.kind === "builtin"
      ? `b:${clip.source.assetId}`
      : clip.source.kind === "recording"
        ? `r:${clip.source.bufferId}`
        : `s:${clip.source.note}`;
  const fx = clip.effects.map((e) => `${e.id}@${e.amount.toFixed(3)}`).join(",");
  return `${srcKey}|${fx}`;
}

/** The DrumKind of a clip IFF it's a plain built-in drum (no effects, not
 *  beat-snapped) — the case we can render parametrically for length/pitch.
 *  Recordings, tone blips, and effected clips return null (resolveClip path). */
function builtinDrumKind(clip: Clip): DrumKind | null {
  if (clip.source.kind !== "builtin") return null;
  if (clip.effects.length > 0 || clip.loopBeats !== undefined) return null;
  const recipe = getBuiltin(clip.source.assetId)?.recipe;
  return recipe?.kind === "drum" ? recipe.drum : null;
}

/** Scale a channel down so its peak sits at `ceil` (no boost). Keeps the fuller,
 *  layered drum recipes from clipping without hand-tuning every amplitude. */
function limitPeak(data: Float32Array, ceil: number): void {
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i] as number);
    if (a > peak) peak = a;
  }
  if (peak <= ceil || peak === 0) return;
  const g = ceil / peak;
  for (let i = 0; i < data.length; i++) data[i] = (data[i] as number) * g;
}

/** Deterministic noise generator (LCG) so synthesized drums are reproducible. */
function seededNoise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s / 4294967296) * 2 - 1;
  };
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Set the iOS audio session category. "playback" plays through the silent
 *  switch but is OUTPUT-ONLY — it blocks the mic — so recording must switch to
 *  "play-and-record" first and restore "playback" after. Guarded by feature
 *  detection; the property is read-only on older WebKit, so a throw is
 *  swallowed. No-op where `navigator.audioSession` is absent (desktop/Android). */
function setAudioSession(type: "playback" | "play-and-record"): void {
  const session = (
    navigator as Navigator & { audioSession?: { type: string } }
  ).audioSession;
  if (!session) return;
  try {
    session.type = type;
  } catch {
    // Older/locked-down WebKit exposes a read-only stub — safe to ignore.
  }
}

// Re-export so callers needing the catalog can pull through the adapter barrel.
export { getBuiltin };
