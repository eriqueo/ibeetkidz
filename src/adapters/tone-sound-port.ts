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
  NEUTRAL_TERRAIN,
  clampSend,
  clampTempoScale,
  rampSeconds,
  type TerrainEffect,
} from "../core/terrain.ts";
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

/** Longest a single hold-to-record take may run, in seconds — the ONE producer
 *  of that fact. Recording is hold-to-record, so a finger resting on the button
 *  (a toddler, a pocket, a forgotten tab) otherwise captures until release and
 *  then decodes AND rms-normalizes the whole take in memory at once.
 *
 *  30s is roughly ten times a real take (kids record a word, a raspberry, a
 *  "BEEEEP") and still leaves room for a whole silly sentence, while bounding
 *  one take to a few MB of decoded audio. At the cap the take is CLOSED, not
 *  discarded — see startRecording: the kid still gets the sound they made. */
export const MAX_RECORD_SEC = 30;

/** A raw-sample recorder over a MediaStream (see openStreamTap): start/stop
 *  gates collection; stop returns the gathered stereo frames at `sampleRate`. */
interface StreamTap {
  readonly sampleRate: number;
  start(): void;
  stop(): { left: Float32Array; right: Float32Array };
  dispose(): void;
}

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
function makeMelodyVoice(
  instrument: InstrumentId,
  context: ReturnType<typeof Tone.getContext>,
): MelodyVoice {
  switch (instrument) {
    case "smooth":
      return new Tone.Synth({
        context,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.2 },
      });
    case "buzzy":
      return new Tone.Synth({
        context,
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
      });
    case "sharp":
      return new Tone.Synth({
        context,
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
      });
    case "piano":
      // FM electric-piano: instant attack, plucky decay, low sustain.
      return new Tone.FMSynth({
        context,
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
        context,
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
        context,
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.02, decay: 0.0, sustain: 1, release: 0.12 },
      });
    case "pluck":
      // Filtered short pluck (guitar-ish) via a fast filter envelope.
      return new Tone.MonoSynth({
        context,
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
        context,
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
        context,
        attackNoise: 1.2,
        dampening: 4500,
        resonance: 0.93,
        release: 1.2,
      });
    case "soft":
    default:
      return new Tone.Synth({
        context,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.18, release: 0.18 },
      });
  }
}

export class ToneSoundPort implements SoundPort {
  private analyser!: AnalyserNode;
  private ctx!: AudioContext;
  /** The context the app PLAYS through, captured once at `resume`.
   *
   *  Live paths must never read Tone's GLOBAL accessors: `Tone.Offline` (the
   *  fx bake) swaps the global context synchronously and restores it only
   *  after its callback settles, so a `Tone.getTransport()` — or a bare node
   *  constructor — on a live path during that window binds to a throwaway
   *  offline context: the voice schedules into the void and the car is
   *  silently dead. Worse, two overlapping bakes restore each other's
   *  contexts and strand the whole app on a dead context until reload. Both
   *  were measured on a real ride (2026-08-12); `tests/unit/architecture.test.ts`
   *  rule 9 pins this. Everything below goes through `liveTransport` /
   *  `liveDestination` / `liveCtx`, and scheduled nodes pass
   *  `context: this.liveCtx` explicitly. */
  private live?: ReturnType<typeof Tone.getContext> | undefined;

  private get liveCtx(): ReturnType<typeof Tone.getContext> {
    return this.live ?? Tone.getContext();
  }

  private get liveTransport(): ReturnType<typeof Tone.getTransport> {
    // The one sanctioned global read (pre-boot fallback; no bake can be in
    // flight before `resume` has run).
    return this.live ? this.live.transport : Tone.getTransport();
  }

  private get liveDestination(): ReturnType<typeof Tone.getDestination> {
    // The one sanctioned global read — same pre-boot fallback as above.
    return this.live ? this.live.destination : Tone.getDestination();
  }
  /** Decoded audio data keyed by buffer id (builtins, recordings, baked). */
  private readonly buffers = new Map<BufferId, AudioBuffer>();
  /** Encoded recording bytes, kept so the app can persist them. */
  private readonly recordingBlobs = new Map<BufferId, Blob>();
  /** Baked effect-chain results, keyed by source+chain signature. */
  private readonly bakedCache = new Map<string, AudioBuffer>();
  /** In-flight bakes by the same key — a twin request (the same clip riding
   *  two train slots) awaits the one render instead of launching a double. */
  private readonly pendingBakes = new Map<string, Promise<AudioBuffer>>();
  /** Bakes run STRICTLY one at a time. `Tone.Offline` swaps the global
   *  context, and two overlapping swaps restore each other's throwaway
   *  contexts — measured stranding the app on a dead context until reload.
   *  Unbounded by design: at most one entry per un-baked clip+fx signature,
   *  each render bounded by MAX_RECORD_SEC plus the effect tail. */
  private bakeQueue: Promise<unknown> = Promise.resolve();
  /** Beat-snapped (looped/trimmed) buffers, keyed by source+chain+beats@bpm. */
  private readonly loopCache = new Map<string, AudioBuffer>();
  /** Silence-trimmed copies of recordings, keyed by buffer id, used as the
   *  Voice Keys sampler one-shot so a note speaks immediately (a raw take has
   *  dead air before the voice starts — a short note would otherwise be silent). */
  private readonly voiceSampleCache = new Map<BufferId, Tone.ToneAudioBuffer>();
  // Mic capture: the RAW getUserMedia stream + a MediaRecorder on it. The mic
  // deliberately does NOT route through WebAudio: on iOS, opening the mic
  // flips the audio session to play-and-record, which can change the hardware
  // sample rate (44.1k → 48k) — a MediaStreamAudioSourceNode on the already-
  // running context then delivers pure SILENCE (the recording "works" but is
  // empty). MediaRecorder on the raw stream is immune to that mismatch.
  private micStream?: MediaStream | undefined;
  private micRecorder?: MediaRecorder | undefined;
  private micChunks: Blob[] = [];
  /** Raw-sample fallback for engines without MediaRecorder (some WebKit builds). */
  private micTap?: StreamTap | undefined;
  /** Armed while the mic is open; fires the MAX_RECORD_SEC auto-stop. */
  private micCapTimer?: ReturnType<typeof setTimeout> | undefined;
  /** The single in-flight finalize of the current take. Both the cap timer and
   *  the kid's release go through it, so the take is closed exactly ONCE and a
   *  release after the cap resolves to the same (capped) audio. Checking
   *  `micRecorder.state` at release instead would race: the recorder is already
   *  "inactive" the instant the cap calls stop(), but its final chunk has not
   *  arrived yet — a release in that window would hand back an empty blob. */
  private micTake?: Promise<Blob> | undefined;
  /** Active while capturing a Magic Pad performance; live theremin voices
   *  connect to this bus (see thereminOn) so the whole performance — gaps and
   *  all — is captured without needing the mic. Tapped raw → WAV (Tone.Recorder
   *  rode MediaRecorder, which is flaky over WebAudio streams on iOS and absent
   *  on some WebKit builds). */
  private perfBus?: MediaStreamAudioDestinationNode | undefined;
  private perfTap?: StreamTap | undefined;
  private bufferSeq = 0;
  private builtinsLoaded = false;
  private keepAliveBound = false;
  /** Bumped on every clearScheduled so an in-flight async (re)schedule whose
   *  generation is stale bails instead of leaking a voice onto the transport. */
  private scheduleGen = 0;
  /** Global snap grid for one-off triggers. Default: snap to each beat. */
  private quantizeGrid: QuantizeGrid = "beat";
  /** The app's tempo, as last written by `setTempo` — the engine is the only
   *  caller, so this is the single-writer value. Beat-snapping keys and renders
   *  off THIS, never `Tone.getTransport().bpm.value`: the transport is a live
   *  signal that can move (or be re-created at its 120 default) between the call
   *  and the `await` inside `resolveClip`, which would key a baked buffer under
   *  a tempo it was not rendered at. */
  private tempoBpm = 120;

  /** Scheduler-health counters, read via `getAudioDiag`. A transport callback
   *  normally runs ~lookAhead (100ms) BEFORE its event's audio-clock `time`;
   *  when the main thread stalls past that window the callback runs after
   *  `time` has already passed, Web Audio clamps `start(past)` to "now", and
   *  the hit lands audibly late — that is a skip. `late` counts events whose
   *  window was missed at all; `late20` ones late enough (>20ms) to hear. */
  private readonly schedStats = { events: 0, late: 0, late20: 0, worstMs: 0 };

  private recordSchedTiming(time: number): void {
    const lateMs = (this.ctx.currentTime - time) * 1000;
    const s = this.schedStats;
    s.events++;
    if (lateMs > 0) s.late++;
    if (lateMs > 20) {
      s.late20++;
      this.adaptLookAhead();
    }
    if (lateMs > s.worstMs) s.worstMs = lateMs;
  }

  /** Trade tap-latency for loop-integrity, but only on devices that have
   *  already audibly missed: from the third >20ms miss on, widen Tone's
   *  scheduling horizon a step per miss, capped. A healthy device never pays a
   *  millisecond of extra latency (the whole app schedules through Tone's
   *  `now()`, so a blanket raise would lag every pad tap); a device whose main
   *  thread stalls past the default 100ms window keeps its groove instead of
   *  skipping. Deliberately never decays within a session: a machine that
   *  missed three times will miss again, and oscillating latency is worse for
   *  a kid than steady latency. */
  private static readonly LOOKAHEAD_MAX_SEC = 0.3;

  private adaptLookAhead(): void {
    if (this.schedStats.late20 < 3 || !this.live) return;
    const next = Math.min(
      ToneSoundPort.LOOKAHEAD_MAX_SEC,
      0.1 + 0.05 * (this.schedStats.late20 - 2),
    );
    if (next > this.live.lookAhead) this.live.lookAhead = next;
  }

  // Live one-shot + scheduled players, tracked for cleanup.
  private readonly liveVoices = new Set<Tone.Player>();
  private readonly scheduledVoices: Tone.Player[] = [];
  /** Per-melody-lane synth voices, scheduled on the transport. */
  private readonly scheduledSynths: MelodyVoice[] = [];
  /** Per-lane echo sends (FeedbackDelay nodes), torn down with the transport. */
  private readonly scheduledFx: Tone.ToneAudioNode[] = [];
  /** One live fx chain per lane (keyed by `StepOptions.laneKey`), shared by all
   *  of that lane's scheduled cells. Cleared with `clearScheduled`. */
  private readonly laneChains = new Map<string, Tone.ToneAudioNode>();

  // Terrain (Track ride): a master-bus insert plus a momentary tempo scale.
  // `tempoScale` is deliberately SEPARATE from `tempoBpm` — the bake cache keys
  // off `tempoBpm`, so scaling here can never mint a new cache entry.
  private tempoScale = 1;
  private terrainFx?:
    | { reverb: Tone.Reverb; grit: Tone.Distortion }
    | undefined;
  private terrainChainReady?: Promise<void> | undefined;
  /** Bumped per `scheduleTerrain` so a superseded ride's revert can't fire. */
  private terrainGen = 0;

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
    // Pin the booted context NOW — every later read goes through the pin, so
    // an in-flight `Tone.Offline` swap can never redirect a live path.
    this.live = Tone.getContext();
    this.ctx = this.live.rawContext as AudioContext;
    // A raw AnalyserNode tapped off the master output feeds the visualizer —
    // it sees every real voice (builtins, recordings, theremin), never a fake.
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.liveDestination.connect(this.analyser);
    this.installKeepAlive();
    // Build the terrain insert now, while we are already in the boot await:
    // `Tone.Reverb` renders an impulse response asynchronously, and the Track
    // must never wait on that when a kid taps a terrain mid-ride.
    await this.ensureTerrainChain();
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
    /** Live transport tempo — the BASE tempo times any terrain in force. */
    transportBpm: number;
    /** The terrain tempo multiplier currently applied (1 = flat ground). */
    terrainScale: number;
    /** Scheduler health (cumulative since boot — sample twice and diff):
     *  how many transport callbacks ran, how many ran after their event's
     *  audio-clock time (missed the lookahead window), how many missed it
     *  audibly (>20ms), and the worst miss seen. */
    schedEvents: number;
    schedLate: number;
    schedLate20: number;
    schedWorstLateMs: number;
    /** Tone's live scheduling horizon — 0.1 until the adaptive ratchet fires. */
    lookAheadSec: number;
  } {
    let masterPeak = -1;
    if (this.analyser) {
      const data = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      masterPeak = peak / 128;
    }
    const dest = this.liveDestination;
    return {
      contextState: this.ctx ? this.ctx.state : "unbooted",
      currentTime: this.ctx ? this.ctx.currentTime : -1,
      transportState: this.liveTransport.state,
      destinationMute: dest.mute,
      destinationVolumeDb: dest.volume.value,
      masterPeak,
      transportBpm: this.liveTransport.bpm.value,
      terrainScale: this.tempoScale,
      schedEvents: this.schedStats.events,
      schedLate: this.schedStats.late,
      schedLate20: this.schedStats.late20,
      schedWorstLateMs: this.schedStats.worstMs,
      lookAheadSec: this.liveCtx.lookAhead,
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
    // A fresh take: drop any blob the previous one left memoized.
    this.micTake = undefined;
    // The "playback" session blocks mic capture on iOS — switch to
    // play-and-record before opening the mic, and restore playback on failure.
    setAudioSession("play-and-record");
    try {
      if (!navigator.mediaDevices) throw new NoMicError();
      // See the micStream field note: the raw stream is recorded directly —
      // never routed through WebAudio — so the iOS session-flip sample-rate
      // mismatch can't silence the take.
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (typeof MediaRecorder === "function") {
        this.micChunks = [];
        this.micRecorder = new MediaRecorder(this.micStream);
        this.micRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.micChunks.push(e.data);
        };
        this.micRecorder.start();
      } else {
        // Engines without MediaRecorder: tap the stream with the same native
        // worklet/ScriptProcessor used for the song capture.
        this.micTap = await this.openStreamTap(this.micStream);
        this.micTap.start();
      }
      // Auto-stop the held take at MAX_RECORD_SEC. This closes the take exactly
      // as a release would — the audio is kept and the mic hardware is freed —
      // so a kid who never lets go still gets their sound when they do.
      this.micCapTimer = setTimeout(() => {
        void this.finishMicTake().catch((capErr: unknown) => {
          console.warn("recording auto-stop failed", capErr);
        });
      }, MAX_RECORD_SEC * 1000);
    } catch (err) {
      // Log the ORIGINAL failure before collapsing it into the kid-safe error
      // types — otherwise a platform-specific getUserMedia/recorder failure is
      // indistinguishable from "no mic" in the field.
      console.warn("mic capture failed to open", err);
      this.closeMic();
      setAudioSession("playback");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        throw new MicDeniedError();
      }
      throw new NoMicError();
    }
  }

  async stopRecording(): Promise<BufferId> {
    // `micTake` set with no stream means the MAX_RECORD_SEC cap already closed
    // this take out: the mic is gone, the kid's audio is not.
    if (!this.micStream && !this.micTake) throw new NoMicError();
    const blob = await this.finishMicTake();
    this.micTake = undefined;
    if (blob.size === 0) throw new NoMicError(); // a zero-length take (instant release)
    const audioBuf = await this.decodeRecording(blob);
    const id = `rec-${this.bufferSeq++}`;
    this.buffers.set(id, audioBuf);
    this.recordingBlobs.set(id, blob);
    return id;
  }

  /** Close out the current take once, whoever asks first — the release gesture
   *  or the MAX_RECORD_SEC cap. The memoized promise IS the mutual exclusion:
   *  reserve before the side effect rather than testing recorder state after. */
  private finishMicTake(): Promise<Blob> {
    this.micTake ??= this.captureMicTake();
    return this.micTake;
  }

  /** Stop the capture, collect its bytes, and release the mic. */
  private async captureMicTake(): Promise<Blob> {
    let blob: Blob;
    if (this.micRecorder) {
      const rec = this.micRecorder;
      blob = await new Promise<Blob>((resolve, reject) => {
        rec.onstop = () => resolve(new Blob(this.micChunks, { type: rec.mimeType || "audio/webm" }));
        rec.onerror = () => reject(new NoMicError());
        if (rec.state === "inactive") rec.onstop(new Event("stop"));
        else rec.stop();
      });
    } else if (this.micTap) {
      const tap = this.micTap;
      const { left, right } = tap.stop();
      blob = encodeWav({
        numberOfChannels: 2,
        length: left.length,
        sampleRate: tap.sampleRate,
        getChannelData: (c) => (c === 0 ? left : right),
      });
    } else {
      throw new NoMicError();
    }
    this.closeMic();
    // Back to loud, silent-switch-defying playback now the mic is closed.
    setAudioSession("playback");
    return blob;
  }

  private closeMic(): void {
    if (this.micCapTimer !== undefined) {
      clearTimeout(this.micCapTimer);
      this.micCapTimer = undefined;
    }
    this.micTap?.dispose();
    this.micTap = undefined;
    if (this.micRecorder) {
      this.micRecorder.ondataavailable = null;
      this.micRecorder = undefined;
    }
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = undefined;
    this.micChunks = [];
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
    // A bus the live theremin voices feed (see thereminOn), tapped raw → WAV.
    // A voice already playing won't be connected; thereminOn wires up voices
    // started after this point (the kid presses Record, then drags to play).
    this.perfBus = this.ctx.createMediaStreamDestination();
    this.perfTap = await this.openStreamTap(this.perfBus.stream);
    this.perfTap.start();
  }

  async stopPerformanceRecording(): Promise<BufferId> {
    const tap = this.perfTap;
    const bus = this.perfBus;
    this.perfTap = undefined;
    this.perfBus = undefined;
    if (!tap || !bus) throw new NoMicError();
    const { left, right } = tap.stop();
    tap.dispose();
    const blob = encodeWav({
      numberOfChannels: 2,
      length: left.length,
      sampleRate: tap.sampleRate,
      getChannelData: (c) => (c === 0 ? left : right),
    });
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

  /** Test/diagnostic only: peak |sample| of a decoded buffer (0 = silence).
   *  Exists because the iOS mic bug's failure mode is a take that "succeeds"
   *  but contains nothing — duration alone can't catch it. */
  getBufferPeak(bufferId: BufferId): number | null {
    const buf = this.buffers.get(bufferId);
    if (!buf) return null;
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
    }
    return peak;
  }

  // ── Effect baking (render-once) ──────────────────────────────────────────

  async renderEffects(
    source: BufferId,
    effects: readonly EffectDescriptor[],
  ): Promise<BufferId> {
    const src = this.buffers.get(source);
    if (!src) throw new Error(`unknown buffer: ${source}`);
    const baked = await this.queueRender(src, effects);
    const id = `baked-${this.bufferSeq++}`;
    this.buffers.set(id, baked);
    return id;
  }

  /** The ONLY entrance to `renderChain`: bakes queue single-file (see
   *  `bakeQueue`). A failed bake breaks its caller, never the queue. */
  private queueRender(
    src: AudioBuffer,
    effects: readonly EffectDescriptor[],
  ): Promise<AudioBuffer> {
    const run = this.bakeQueue.then(() => this.renderChain(src, effects));
    this.bakeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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
   *  both cached). `bpm` is passed in — captured synchronously by the caller —
   *  so the beat-snap key and the buffer it names are always the same tempo,
   *  even when the effect bake awaits across a tempo change. */
  private async resolveClip(clip: Clip, bpm: number): Promise<AudioBuffer | undefined> {
    const base = this.resolveSource(clip.source);
    if (!base) return undefined;

    let buf = base;
    if (clip.effects.length > 0) {
      const key = bakeKey(clip);
      const cached = this.bakedCache.get(key);
      if (cached) buf = cached;
      else {
        let pending = this.pendingBakes.get(key);
        if (!pending) {
          pending = this.queueRender(base, clip.effects).then((b) => {
            this.bakedCache.set(key, b);
            return b;
          });
          this.pendingBakes.set(key, pending);
          // Cleanup on a side chain so a rejection still reaches the awaiters.
          void pending.catch(() => undefined).then(() => this.pendingBakes.delete(key));
        }
        buf = await pending;
      }
    }

    // Snap-to-beat: loop/trim the (possibly effected) buffer to a whole number
    // of beats at the app's tempo, so it stays in the groove even after a tempo
    // change. Keyed off the bake signature + beats@bpm so it recomputes only
    // when something it depends on actually moves — and the SAME normalized bpm
    // both names the entry and renders it.
    if (clip.loopBeats !== undefined) {
      const tempo = normalizeBpm(bpm);
      const lkey = loopCacheKey(clip, tempo);
      const cached = this.loopCache.get(lkey);
      if (cached) buf = cached;
      else {
        buf = loopToBeats(this.ctx, buf, clip.loopBeats, tempo);
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
    void this.resolveClip(clip, this.tempoBpm).then((buf) => {
      if (!buf) return;
      const player = new Tone.Player({ url: buf, context: this.liveCtx }).toDestination();
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
    const transport = this.liveTransport;
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
      if (sample) return new Tone.Sampler({ urls: { C4: sample }, context: this.liveCtx });
      return makeMelodyVoice("soft", this.liveCtx); // buffer not ready → still make sound
    }
    return makeMelodyVoice(instrument, this.liveCtx);
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

  previewNote(noteName: string, instrument: InstrumentId, volume = 1): void {
    // Audition with the lane's real instrument so the tap matches Play.
    const synth = this.buildMelodyVoice(instrument).toDestination();
    // …at the lane's own level, so a LEVEL fader's answer is audibly quieter or
    // louder. Same gain→dB conversion the scheduler uses for lane volume.
    synth.volume.value = Tone.gainToDb(Math.max(0.0001, volume));
    // A sampled voice rings for its whole recorded length (clamped) so the tap
    // plays the full "aaah" instead of cutting it short; synths stay snappy.
    const voiceDur = this.voiceSampleDuration(instrument);
    const dur = voiceDur !== null ? Math.min(4, Math.max(0.4, voiceDur)) : "8n";
    synth.triggerAttackRelease(noteName, dur);
    // Free the voice once it has rung out (bells/piano + long takes ring longer).
    const holdMs = typeof dur === "number" ? dur * 1000 + 600 : 1600;
    setTimeout(() => synth.dispose(), holdMs);
  }

  /** Duration of one bar (measure) in seconds at the live tempo. Computed off
   *  the PINNED transport — `Tone.Time("1m")` reads the global one, which mid-
   *  bake is the offline default (120), not the song. */
  private barSec(): number {
    const t = this.liveTransport;
    const beats = typeof t.timeSignature === "number" ? t.timeSignature : 4;
    return (60 / t.bpm.value) * beats;
  }

  /** Duration of one step in seconds at the live tempo. */
  private stepDurationSec(totalSteps: number): number {
    return this.barSec() / Math.max(1, totalSteps);
  }

  /** Seconds-into-the-bar a step fires, with swing leaning the off-beats late. */
  private stepOffset(stepIndex: number, totalSteps: number, swing: number): number {
    const stepDur = this.stepDurationSec(totalSteps);
    return stepDur * (stepIndex + swingDelayFraction(stepIndex, swing));
  }

  /** Build the input node for a scheduled voice: an optional tone (low-pass)
   *  stage feeding an optional echo send, ending at the main output. Returns
   *  the head of the chain (what the voice connects into). Created nodes are
   *  tracked in `scheduledFx` so re-scheduling never leaks.
   *
   *  The chain is built ONCE per lane and shared by every cell of that lane
   *  (`opts.laneKey`, written by the engine). These are per-LANE knobs; built
   *  per cell, a busy car with wobble/crunch up carried 30+ chorus/bitcrush
   *  nodes and the audio thread fell to ~0.6x realtime — heard as skipping. */
  private scheduledDestination(opts: StepOptions): Tone.ToneAudioNode {
    const cached = opts.laneKey ? this.laneChains.get(opts.laneKey) : undefined;
    if (cached) return cached;
    // Build back-to-front so each stage targets the next; default = master out.
    let head: Tone.ToneAudioNode = this.liveDestination;

    if (opts.echo > 0) {
      const delay = new Tone.FeedbackDelay({
        delayTime: "8n",
        feedback: 0.2 + opts.echo * 0.5,
        wet: Math.min(0.6, opts.echo),
        context: this.liveCtx,
      }).toDestination();
      this.scheduledFx.push(delay);
      head = delay;
    }

    if (opts.tone < 0.999) {
      // tone 1 → ~14 kHz (open); tone 0 → ~500 Hz (muffled). Log-ish mapping.
      const cutoff = 500 + opts.tone * opts.tone * 13500;
      const filter = new Tone.Filter({ frequency: cutoff, type: "lowpass", context: this.liveCtx });
      filter.connect(head);
      this.scheduledFx.push(filter);
      head = filter;
    }

    // Silliness knobs (live per-lane sends, adapted from the offline FX bakes):
    // crunch = the bitcrush stage (fewer bits as the knob turns), wobble = a
    // chorus whose depth/mix track the knob (the offline "robot"/wobble family).
    if ((opts.crunch ?? 0) > 0.01) {
      const crunch = opts.crunch ?? 0;
      const crusher = new Tone.BitCrusher({
        bits: Math.round(8 - crunch * 5), // 8→3 bits
        context: this.liveCtx,
      });
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
        context: this.liveCtx,
      }).start();
      chorus.connect(head);
      this.scheduledFx.push(chorus);
      head = chorus;
    }

    if (opts.laneKey) this.laneChains.set(opts.laneKey, head);
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
      const player = new Tone.Player({
        url: this.drumBuffer(kind, durationSec, pitch),
        context: this.liveCtx,
      }).connect(this.scheduledDestination(opts));
      player.playbackRate = this.tempoScale; // join a terrain already underway
      this.scheduledVoices.push(player);
      this.liveTransport.scheduleRepeat((time) => {
        this.recordSchedTiming(time);
        startAll(player, time);
      }, interval, offset);
      return;
    }

    const gen = this.scheduleGen;
    void this.resolveClip(clip, this.tempoBpm).then((buf) => {
      if (!buf || gen !== this.scheduleGen) return;
      const player = new Tone.Player({ url: buf, context: this.liveCtx }).connect(
        this.scheduledDestination(opts),
      );
      player.playbackRate = this.tempoScale; // join a terrain already underway
      this.scheduledVoices.push(player);
      this.liveTransport.scheduleRepeat((time) => {
        this.recordSchedTiming(time);
        startAll(player, time);
      }, interval, offset);
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
    this.liveTransport.scheduleRepeat(
      (time) => {
        this.recordSchedTiming(time);
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
    const osc = new Tone.Oscillator({
      frequency: 440,
      type: this.thereminWave,
      context: this.liveCtx,
    });
    const filter = new Tone.Filter({ frequency: 1200, type: "lowpass", context: this.liveCtx });
    const gain = new Tone.Gain({ gain: 0, context: this.liveCtx }).toDestination();
    osc.connect(filter);
    filter.connect(gain);
    // While a performance is being captured, also feed this voice to the
    // capture bus so the Magic Pad track records what you hear.
    if (this.perfBus) gain.connect(this.perfBus as unknown as AudioNode);
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
      // Deliberately writes NO output: this is a capture tap, not an insert.
      // The graph it hangs off is already routed to the destination, so echoing
      // input to output here would double the signal. `process` returning true
      // with an untouched output buffer is the intended "listen only" shape —
      // it is not an oversight, and it is not what causes recording static.
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
  private async openMasterTap(): Promise<StreamTap> {
    // The bridge node lives in Tone's graph; its .stream is a real MediaStream
    // the generic stream tap can consume.
    const dest = this.liveDestination; // same tap point as the visualizer
    const bridge = this.ctx.createMediaStreamDestination();
    dest.connect(bridge as unknown as AudioNode);
    const tap = await this.openStreamTap(bridge.stream).catch((err: unknown) => {
      dest.disconnect(bridge as unknown as AudioNode);
      throw err;
    });
    return {
      sampleRate: tap.sampleRate,
      start: tap.start,
      stop: tap.stop,
      dispose: () => {
        tap.dispose();
        dest.disconnect(bridge as unknown as AudioNode);
      },
    };
  }

  /** Tap any MediaStream to raw Float32 frames on the NATIVE context
   *  underneath the wrapper (`_nativeAudioContext` is pinned by the lockfile —
   *  if the lib ever renames it, we fall back to the wrapper and the worklet/SP
   *  probes below surface the failure loudly instead of recording silence).
   *  Native worklet preferred; ScriptProcessor for engines predating worklets.
   *  The tap node must stay pulled into the graph to process, so its (silent)
   *  output is wired to the destination — it adds nothing audible. */
  private async openStreamTap(stream: MediaStream): Promise<StreamTap> {
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
    const native =
      (this.ctx as unknown as { _nativeAudioContext?: AudioContext })._nativeAudioContext ??
      this.ctx;
    const source = native.createMediaStreamSource(stream);

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
          sampleRate: native.sampleRate,
          start: () => {
            on = true;
          },
          stop: () => {
            on = false;
            return collect();
          },
          dispose: () => {
            node.port.onmessage = null;
            source.disconnect();
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
        sampleRate: native.sampleRate,
        start: () => {
          on = true;
        },
        stop: () => {
          on = false;
          return collect();
        },
        dispose: () => {
          sp.onaudioprocess = null;
          source.disconnect();
          sp.disconnect();
        },
      };
    }

    source.disconnect();
    throw new Error("no capture available (no AudioWorklet or ScriptProcessor)");
  }

  async captureBars(bars: number): Promise<Blob> {
    const transport = this.liveTransport;
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
        sampleRate: tap.sampleRate,
        getChannelData: (c) => (c === 0 ? left : right),
      });
    } finally {
      transport.stop();
      tap.dispose();
    }
  }

  setTempo(bpm: number): void {
    // The engine is the single writer of tempo; record it before handing it to
    // the transport so beat-snapping never has to read the signal back.
    this.tempoBpm = normalizeBpm(bpm);
    // An active terrain scales the LIVE transport but never `tempoBpm`, so the
    // bake cache stays keyed on the base tempo and cannot grow per terrain.
    this.liveTransport.bpm.value = bpm * this.tempoScale;
  }

  /** Build the master-bus terrain insert. Called once, at boot, because
   *  `Tone.Reverb` has to render an impulse response and exposes `.ready` — the
   *  await belongs here and not on the hot path. `Destination.chain` splices
   *  these between the master volume and the speakers, so no individual voice's
   *  routing changes, and the analyser (which taps the destination's output)
   *  sees the terrain too — the visualizer keeps showing real signal. */
  private async ensureTerrainChain(): Promise<void> {
    if (this.terrainFx) return;
    this.terrainChainReady ??= (async () => {
      try {
        const reverb = new Tone.Reverb({ decay: 2.4, wet: 0, context: this.liveCtx });
        await reverb.ready;
        // Waveshaper, NOT BitCrusher. Tone's BitCrusher is an AudioWorklet, and
        // `new AudioWorkletNode` throws outside a secure context — constructing
        // one at boot took the whole page down on a plain-http origin (caught by
        // `tests/e2e/built-artifact.spec.ts`, which serves the build over http).
        // Distortion is a plain WaveShaperNode: no worklet, works anywhere.
        const grit = new Tone.Distortion({ distortion: 0.85, wet: 0, context: this.liveCtx });
        this.liveDestination.chain(grit, reverb);
        this.terrainFx = { reverb, grit };
      } catch {
        // Terrain is a garnish; booting the app is not. If this environment
        // can't give us a reverb or an AudioWorklet, the kid still gets the
        // whole instrument — and `applyTerrainNow` degrades to tempo alone.
        this.terrainFx = undefined;
      }
    })();
    return this.terrainChainReady;
  }

  /** Move the world to `effect` right now. Tempo STEPS (see below); the wet
   *  sends glide over `sendRamp` seconds.
   *
   *  Tempo steps rather than ramps on purpose. `Player.playbackRate` is a plain
   *  number, not a ramp-able Param, so a gliding tempo with a stepped playback
   *  rate would let baked loops drift against the grid for the length of the
   *  glide. Landing the change squarely on the bar line is both phase-exact and
   *  the clearer read for a kid: you hit the hill, the song leans back. */
  private applyTerrainNow(effect: TerrainEffect, sendRamp: number): void {
    const scale = clampTempoScale(effect.tempoScale);
    this.tempoScale = scale;
    this.liveTransport.bpm.value = this.tempoBpm * scale;
    // Baked loops are fixed buffers: they follow a tempo change only if their
    // playback rate follows too. This is what makes terrain free — no re-bake,
    // no new cache entries, no reschedule.
    for (const p of this.scheduledVoices) p.playbackRate = scale;
    const fx = this.terrainFx;
    if (!fx) return;
    fx.reverb.wet.rampTo(clampSend(effect.reverb), sendRamp);
    fx.grit.wet.rampTo(clampSend(effect.grit), sendRamp);
  }

  /** Ticks → seconds on the PINNED transport. `Tone.Ticks(...).toSeconds()`
   *  reads the GLOBAL transport's PPQ + tempo, which mid-bake is the offline
   *  one; same conversion, pinned clock. */
  private ticksToSec(ticks: number): number {
    const t = this.liveTransport;
    return (ticks / t.PPQ) * (60 / t.bpm.value);
  }

  scheduleTerrain(
    effect: TerrainEffect,
    holdBars: number,
    bpm: number,
  ): { startBar: number; endBar: number } | null {
    const transport = this.liveTransport;
    if (transport.state !== "started") return null; // no ride, no terrain
    const gen = ++this.terrainGen;
    const hold = Math.max(1, Math.round(holdBars));
    const tpb = this.ticksPerBar;
    // Strictly the NEXT bar line, never the one we are standing on: a repeat
    // scheduled at the exact tick the transport already occupies can be missed
    // outright (measured in `spike/tempo-phase.ts`).
    const startTicks = Math.floor(transport.ticks / tpb) * tpb + tpb;
    const endTicks = startTicks + hold * tpb;
    const sendRamp = rampSeconds(effect, bpm, hold);
    // Ticks → seconds here, seconds → ticks inside Tone, both at the tempo in
    // force right now: an identity round-trip. The events therefore land on the
    // intended BAR however the tempo moves in between.
    transport.scheduleOnce(() => {
      if (gen !== this.terrainGen) return;
      this.applyTerrainNow(effect, sendRamp);
    }, this.ticksToSec(startTicks));
    transport.scheduleOnce(() => {
      if (gen !== this.terrainGen) return;
      this.applyTerrainNow(NEUTRAL_TERRAIN, sendRamp);
    }, this.ticksToSec(endTicks));
    return { startBar: startTicks / tpb, endBar: endTicks / tpb };
  }

  clearTerrain(): void {
    this.terrainGen++; // strand any armed ride
    if (this.tempoScale === 1 && !this.terrainFx) return;
    this.applyTerrainNow(NEUTRAL_TERRAIN, 0.05);
  }
  startTransport(): void {
    this.liveTransport.start();
  }
  stopTransport(): void {
    this.liveTransport.stop();
  }
  /** Cancel scheduled repeats + dispose loop voices, but leave the transport
   *  running. Re-scheduling continues on the next bar, so editing a loop while
   *  it plays never interrupts the groove. */
  clearScheduled(): void {
    this.scheduleGen++; // invalidate any async scheduleStep still in flight
    // `cancel()` below wipes EVERY transport event, including an armed
    // terrain's revert — which would strand the song slowed or drenched
    // forever. Editing while riding therefore ends the terrain, deliberately.
    this.clearTerrain();
    this.liveTransport.cancel();
    for (const p of this.scheduledVoices) p.dispose();
    this.scheduledVoices.length = 0;
    for (const s of this.scheduledSynths) s.dispose();
    this.scheduledSynths.length = 0;
    for (const fx of this.scheduledFx) fx.dispose();
    this.scheduledFx.length = 0;
    this.laneChains.clear();
  }

  stopAll(): void {
    this.liveTransport.stop();
    this.clearScheduled();
  }

  setQuantize(grid: QuantizeGrid): void {
    this.quantizeGrid = grid;
  }

  /** Transport position at the AUDIBLE now, in ticks (-1 when stopped).
   *
   *  NOT `Transport.ticks`: Tone evaluates that at `context.now()`, which is
   *  `currentTime` PLUS the scheduling `lookAhead`. Reading it put every
   *  transport-driven visual that lead ahead of the sound — measured +98 ms on
   *  the Track ride, so the train reached the crossing signal before the bar
   *  it belongs to was audible. `immediate()` is the same clock without the
   *  lead, which is the position a viewer is actually hearing. */
  private audibleTicks(): number {
    const t = this.liveTransport;
    if (t.state !== "started") return -1;
    return Math.max(0, t.getTicksAtTime(this.liveCtx.immediate()));
  }

  private get ticksPerBar(): number {
    const t = this.liveTransport;
    const beatsPerBar = typeof t.timeSignature === "number" ? t.timeSignature : 4;
    return t.PPQ * beatsPerBar;
  }

  getTransportStep(totalSteps: number): number {
    const ticks = this.audibleTicks();
    if (ticks < 0) return -1;
    const progress = (ticks % this.ticksPerBar) / this.ticksPerBar;
    return stepIndexFromProgress(progress, totalSteps);
  }

  getTransportBar(): number {
    const ticks = this.audibleTicks();
    if (ticks < 0) return -1;
    return Math.floor(ticks / this.ticksPerBar);
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

/** Peak of a whole buffer, across every channel. */
function bufferPeak(buf: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i] as number);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

/** 20ms — long enough that a frame's RMS is a stable level reading, short enough
 *  that a syllable lands inside a handful of frames. */
const FRAME_SEC = 0.02;

/** Estimate the level of the SIGNAL in a take, ignoring the room it was recorded
 *  in. This is the heart of the anti-static fix.
 *
 *  The previous approach measured RMS over every sample above an absolute floor
 *  of 0.003 — which excludes digital silence but happily *includes room tone*.
 *  On a quiet take (a kid a foot from a laptop mic in a normal room) almost all
 *  the energy is room tone, so the estimate came back as the room's level, the
 *  gain went to ~50, and the room got amplified into constant hiss. That hiss is
 *  the bug Eric heard.
 *
 *  Instead: chop into short frames and read each frame's own RMS. Speech is
 *  bursty — on a quiet take MOST frames are room tone and a MINORITY are voice,
 *  so the median frame is a good estimate of the noise floor. Anything well
 *  above that median is signal. Measuring only those frames gives the level of
 *  the voice, not the level of the room, and it degrades gracefully: on a take
 *  that IS wall-to-wall voice the median is the voice, the gate lands above
 *  everything, and we fall back to the whole-buffer RMS.
 *
 *  `hasBursts` reports whether any frame actually stood out. A take where none
 *  did is *uniform* — either a held note or a room with nobody in it — and the
 *  caller needs to tell those apart by level, because boosting the second one is
 *  precisely the static.
 *
 *  O(n), allocation-proportional-to-frames, and pure — exported for unit test. */
export function estimateSignalRms(buf: AudioBuffer): { rms: number; hasBursts: boolean } {
  const frameLen = Math.max(1, Math.round(buf.sampleRate * FRAME_SEC));
  const frameCount = Math.floor(buf.length / frameLen);
  if (frameCount < 4) {
    // Too short to reason about bursts — fall back to plain RMS over everything.
    let sumSq = 0;
    let n = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const x = data[i] as number;
        sumSq += x * x;
        n++;
      }
    }
    return { rms: n === 0 ? 0 : Math.sqrt(sumSq / n), hasBursts: false };
  }

  const frames = new Float64Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    let sumSq = 0;
    let n = 0;
    const from = f * frameLen;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = from; i < from + frameLen; i++) {
        const x = data[i] as number;
        sumSq += x * x;
        n++;
      }
    }
    frames[f] = n === 0 ? 0 : Math.sqrt(sumSq / n);
  }

  const sorted = Float64Array.from(frames).sort();
  const median = sorted[Math.floor(frameCount / 2)] as number;
  // 4x the median frame: comfortably above room tone, well below any syllable.
  // The absolute term keeps a digitally-silent take from producing a zero gate.
  const gate = Math.max(0.003, 4 * median);

  let sumSq = 0;
  let n = 0;
  for (let f = 0; f < frameCount; f++) {
    const level = frames[f] as number;
    if (level >= gate) {
      sumSq += level * level;
      n++;
    }
  }
  if (n === 0) {
    // No frame stood out — the take is uniform (a held note, or an empty room).
    // Its own overall level is the honest estimate; `hasBursts: false` tells the
    // caller it must decide by level which of those two this is.
    let all = 0;
    for (let f = 0; f < frameCount; f++) {
      const level = frames[f] as number;
      all += level * level;
    }
    return { rms: Math.sqrt(all / frameCount), hasBursts: false };
  }
  return { rms: Math.sqrt(sumSq / n), hasBursts: true };
}

/** Target level for a normalized take: ~-22 dBFS RMS, inside the range broadcast
 *  speech sits at. The old value was 0.25 (~-12 dBFS), which is louder than a
 *  mastered pop record and only reachable by squashing everything flat. */
const TARGET_RMS = 0.08;
/** Below this the limiter is perfectly transparent; only peaks above it round off. */
const LIMIT_KNEE = 0.7;
/** A uniform take quieter than this (~-34 dBFS) is an empty room, not a held
 *  note, so it is left exactly as recorded. Without this floor the gain cap is
 *  the only thing standing between room tone and an 8x amplified hiss — which is
 *  a quieter version of the original bug, not a fix for it. */
const UNIFORM_SIGNAL_FLOOR = 0.02;

/** Soft-knee limiter. Linear below the knee — the body of the signal passes
 *  through UNTOUCHED — and only the part above it is compressed into the
 *  remaining headroom. The old code ran `Math.tanh` over every sample, which at
 *  the gains it was reaching is a square-wave shaper: measured crest factor 1.005
 *  at gain 60, where a literal square wave is 1.000. That is why takes came back
 *  as a flat buzz. */
function limit(x: number): number {
  const a = Math.abs(x);
  if (a <= LIMIT_KNEE) return x;
  const over = (a - LIMIT_KNEE) / (1 - LIMIT_KNEE);
  const shaped = LIMIT_KNEE + (1 - LIMIT_KNEE) * Math.tanh(over);
  return x < 0 ? -shaped : shaped;
}

/** Make a recording loud in place, without making it a fuzz pedal.
 *
 *  Peak-normalizing alone leaves takes quiet — one stray click sets the peak
 *  while the voice's average energy, which is what we hear as loudness, stays
 *  low. So we still normalize toward a target RMS. The three things that made
 *  the old version generate static are all fixed here:
 *
 *  1. The level is measured over the SIGNAL, not the room (`estimateSignalRms`).
 *  2. The gain is capped twice — an absolute ceiling, and a peak-relative one so
 *     nothing ever arrives at the limiter more than 2.5x over full scale. The
 *     old cap of 60 meant a quiet take hit the shaper at 60x.
 *  3. Peaks are limited, not waveshaped, so crest factor survives.
 *
 *  Exported for unit test. */
export function normalizeBuffer(buf: AudioBuffer, targetRms = TARGET_RMS): void {
  const peak = bufferPeak(buf);
  if (peak < 1e-4) return; // effectively silent — nothing worth lifting

  const { rms, hasBursts } = estimateSignalRms(buf);
  if (rms < 1e-5) return;
  // Nothing in this take stood out from its own background, and the whole thing
  // is quiet: it is a room, not a performance. Leave it alone.
  if (!hasBursts && rms < UNIFORM_SIGNAL_FLOOR) return;

  // Two independent caps. The RMS cap stops a whisper being blown up; the peak
  // cap stops ANY take driving the limiter into audible distortion.
  const gain = Math.min(8, 2.5 / peak, Math.max(1, targetRms / rms));
  if (gain <= 1.0001) {
    // Already loud enough to leave the gain alone — but a take can still arrive
    // hot enough to clip, so run the limiter if (and only if) it would do work.
    if (peak <= LIMIT_KNEE) return;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = limit(data[i] as number);
    }
    return;
  }
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = limit(gain * (data[i] as number));
  }
}

/** Trim leading and trailing near-silence from a recording so it works as a
 *  sampled instrument: a note (often a fraction of a second) must hit the voice
 *  immediately, not the dead air before the singer starts. The threshold is
 *  relative to the take's own peak so it works for quiet and loud recordings;
 *  a few ms of head-room is kept so the onset isn't clipped. Returns the source
 *  unchanged if it's silent or already tight.
 *
 *  NOTE: this was a no-op on every take until the `normalizeBuffer` rewrite. It
 *  runs on the ALREADY-NORMALIZED buffer (`decodeRecording` -> `voiceSample`),
 *  and the old normalizer left post-`tanh` peak ~= 1.0 with the room tone
 *  amplified above `peak * 0.05` — so the threshold was met from the first
 *  sample to the last and nothing was ever trimmed. It starts doing real work
 *  now that takes retain their crest factor. */
function trimSilence(ctx: AudioContext, buf: AudioBuffer): AudioBuffer {
  const peak = bufferPeak(buf);
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

/** A usable tempo: anything non-finite or non-positive falls back to 120 (the
 *  transport default), matching the old `|| 120` guard. Applied ONCE so the
 *  cache key and the rendered length can never disagree. */
export function normalizeBpm(bpm: number): number {
  return Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
}

/** Cache key for the beat-snapped copy of `clip` at `bpm`. Tempo is an explicit
 *  argument — never read off the transport — so two different tempos always
 *  name two different entries. */
export function loopCacheKey(clip: Clip, bpm: number): string {
  return `${bakeKey(clip)}|loop:${clip.loopBeats}@${normalizeBpm(bpm).toFixed(2)}`;
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
