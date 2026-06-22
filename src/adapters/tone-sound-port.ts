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
} from "../core/sound-catalog.ts";
import { createRng } from "../core/rng.ts";
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
  private readonly scheduledSynths: Tone.Synth[] = [];
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
   *  recordings played quiet on every device. Peak-normalizing on decode — for
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

  previewNote(noteName: string, wave: ThereminWave): void {
    const synth = new Tone.Synth({
      oscillator: { type: wave },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0.15, release: 0.2 },
    }).toDestination();
    synth.triggerAttackRelease(noteName, "8n");
    // One-shot: free the voice after it has rung out.
    setTimeout(() => synth.dispose(), 700);
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

    return head;
  }

  scheduleStep(
    clip: Clip,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
    _lengthSteps = 1,
    roll = 1,
  ): void {
    const offset = this.stepOffset(stepIndex, totalSteps, opts.swing);
    // A roll fires `roll` evenly-spaced hits within the start step (a fill).
    // length is intentionally unused here: a one-shot drum sample rings at its
    // own natural length, so "stretching" a drum is a visual/placement concept.
    const subs = subHitOffsets(roll, this.stepDurationSec(totalSteps));
    // Resolve through resolveClip so effected clips (a "funny" voice recording
    // sent to Home) loop with their baked effects, not the dry source. Drums are
    // un-effected builtins, so this resolves on the next microtask — inaudibly
    // soon. The generation guard discards a result that a reschedule superseded.
    const gen = this.scheduleGen;
    void this.resolveClip(clip).then((buf) => {
      if (!buf || gen !== this.scheduleGen) return;
      const player = new Tone.Player(buf).connect(
        this.scheduledDestination(opts),
      );
      player.volume.value = Tone.gainToDb(Math.max(0.0001, opts.volume));
      this.scheduledVoices.push(player);
      Tone.getTransport().scheduleRepeat(
        (time) => {
          for (const s of subs) player.start(time + s);
        },
        "1m",
        offset,
      );
    });
  }

  scheduleNote(
    noteName: string,
    wave: ThereminWave,
    stepIndex: number,
    totalSteps: number,
    opts: StepOptions,
    lengthSteps = 1,
    roll = 1,
    bend?: readonly BendPoint[],
  ): void {
    const synth = new Tone.Synth({
      oscillator: { type: wave },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
    }).connect(this.scheduledDestination(opts));
    synth.volume.value = Tone.gainToDb(Math.max(0.0001, opts.volume));
    this.scheduledSynths.push(synth);
    const offset = this.stepOffset(stepIndex, totalSteps, opts.swing);
    const stepDur = this.stepDurationSec(totalSteps);
    const hasBend = !!bend && bend.length > 0;
    Tone.getTransport().scheduleRepeat(
      (time) => {
        const dur = Math.max(0.05, lengthSteps * stepDur * 0.92);
        if (hasBend) {
          // Swoop: hold one voice and ramp its pitch through the bend points.
          // triggerAttack anchors the start frequency; each point is an
          // exponential ramp (equal pitch steps sound even). Clear last loop's
          // ramps first so they don't bleed into this one.
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
      "1m",
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

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  // ── Procedural synthesis ─────────────────────────────────────────────────

  private synthesize(sound: BuiltinSound): AudioBuffer {
    if (sound.recipe.kind === "tone") {
      return this.synthesizeTone(Tone.Frequency(sound.recipe.note).toFrequency());
    }
    return this.synthesizeDrum(sound.recipe.drum);
  }

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

  private synthesizeDrum(drum: string): AudioBuffer {
    const noise = seededNoise(drum.length * 7919 + 1);
    switch (drum) {
      case "kick":
        return this.makeBuffer(0.4, (d, sr) => {
          let phase = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const freq = 45 + 120 * Math.exp(-t * 22);
            phase += (2 * Math.PI * freq) / sr;
            d[i] = Math.sin(phase) * Math.exp(-t * 9);
          }
        });
      case "snare":
        return this.makeBuffer(0.25, (d, sr) => {
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const env = Math.exp(-t * 22);
            d[i] = (0.6 * noise() + 0.4 * Math.sin(2 * Math.PI * 180 * t)) * env;
          }
        });
      case "hihat":
        return this.makeBuffer(0.08, (d, sr) => {
          let prev = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const n = noise();
            const hp = n - prev; // crude high-pass → metallic
            prev = n;
            d[i] = hp * Math.exp(-t * 90);
          }
        });
      case "clap":
        return this.makeBuffer(0.2, (d, sr) => {
          const bursts = [0, 0.012, 0.024];
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            let env = 0;
            for (const b of bursts) {
              if (t >= b) env += Math.exp(-(t - b) * 90);
            }
            d[i] = noise() * Math.min(1, env) * Math.exp(-t * 8);
          }
        });
      case "tom":
        return this.makeBuffer(0.35, (d, sr) => {
          let phase = 0;
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const freq = 90 + 80 * Math.exp(-t * 12);
            phase += (2 * Math.PI * freq) / sr;
            d[i] = Math.sin(phase) * Math.exp(-t * 7);
          }
        });
      case "cowbell":
        return this.makeBuffer(0.3, (d, sr) => {
          for (let i = 0; i < d.length; i++) {
            const t = i / sr;
            const sq = (f: number) => Math.sign(Math.sin(2 * Math.PI * f * t));
            d[i] = 0.4 * (sq(540) + sq(800)) * Math.exp(-t * 9);
          }
        });
      default:
        return this.makeBuffer(0.1, (d) => d.fill(0));
    }
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

/** Peak-normalize an AudioBuffer in place toward a target ceiling. Quiet mic
 *  input (the common case on phones) gets boosted; near-silent buffers are left
 *  alone so we never amplify pure noise into a roar. */
function normalizeBuffer(buf: AudioBuffer, target = 0.97): void {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i] as number);
      if (a > peak) peak = a;
    }
  }
  if (peak < 1e-4) return; // effectively silent — nothing worth lifting
  const gain = target / peak;
  if (gain <= 1.0001) return; // already at/above target — don't attenuate
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      data[i] = (data[i] as number) * gain;
    }
  }
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
