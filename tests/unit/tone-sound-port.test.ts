import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Clip } from "../../src/core/types.ts";

// A fake Tone: only the handful of exports the beat-snap path actually calls is
// replaced (everything else stays the real module), so the adapter can boot,
// bake and hand a buffer to a Player inside jsdom — where there is no Web Audio.
const h = vi.hoisted(() => {
  const SR = 8000; // low, so the synthesized buffers stay cheap

  interface FakeBuffer {
    numberOfChannels: number;
    length: number;
    sampleRate: number;
    duration: number;
    getChannelData: (c: number) => Float32Array;
  }

  const makeBuffer = (channels: number, length: number, sampleRate: number): FakeBuffer => {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (c: number) => data[c] as Float32Array,
    };
  };

  const ctx = {
    sampleRate: SR,
    state: "running",
    currentTime: 0,
    createBuffer: makeBuffer,
    createAnalyser: () => ({ fftSize: 0, getByteTimeDomainData: () => {} }),
    addEventListener: () => {},
    resume: async () => {},
    // The fake mic below encodes one byte per millisecond captured, so decoding
    // maps bytes back to real duration: a decoded take's length IS how long the
    // recorder ran. That is what makes the cap assertion meaningful.
    decodeAudioData: async (bytes: ArrayBuffer): Promise<FakeBuffer> => {
      const buf = makeBuffer(1, Math.max(1, Math.round((bytes.byteLength / 1000) * SR)), SR);
      buf.getChannelData(0).fill(0.5); // real signal, so normalizeBuffer has work
      return buf;
    },
  };

  // The transport is a plain value holder here — the point of the test is that
  // the bake does NOT consult it.
  const transport = {
    bpm: { value: 120 },
    state: "stopped",
    nextSubdivision: () => 0,
    scheduleRepeat: () => 0,
    cancel: () => {},
    start: () => {},
    stop: () => {},
  };

  /** One destination, shared — the adapter pins `context.destination` at boot
   *  and must see the same node `getDestination()` names. */
  const destination = {
    connect: () => {},
    chain: () => {},
    mute: false,
    volume: { value: 0 },
  };

  /** Every buffer a Player was constructed with, in order. */
  const played: FakeBuffer[] = [];

  class FakePlayer {
    onstop: (() => void) | undefined;
    readonly buffer: FakeBuffer;
    // The adapter constructs players as `new Player(buffer)` inside the bake
    // and `new Player({ url, context })` on live paths — record the buffer
    // either way, like the real Player accepts both shapes.
    constructor(arg: FakeBuffer | { url: FakeBuffer }) {
      this.buffer = "url" in arg ? arg.url : arg;
      played.push(this.buffer);
    }
    toDestination(): this {
      return this;
    }
    connect(): this {
      return this;
    }
    start(): this {
      return this;
    }
    dispose(): void {}
  }

  // Offline "renders" the chain asynchronously (as the real one does) without
  // running the callback — the await is what matters: it is the window a tempo
  // change can slip through.
  const Offline = async (): Promise<{ get: () => FakeBuffer }> => {
    const baked = makeBuffer(1, Math.floor(SR * 0.25), SR);
    return { get: () => baked };
  };

  return { SR, ctx, transport, destination, played, FakePlayer, Offline, makeBuffer };
});

vi.mock("tone", async (importOriginal) => {
  const actual = await importOriginal<typeof import("tone")>();
  return {
    ...actual,
    start: async () => {},
    // The context carries transport/destination now: the adapter pins them off
    // the booted context (see `live` in the adapter) instead of re-reading the
    // global accessors that `Tone.Offline` swaps.
    getContext: () => ({
      rawContext: h.ctx,
      transport: h.transport,
      destination: h.destination,
      lookAhead: 0.1,
      immediate: () => 0,
    }),
    getDestination: () => h.destination,
    getTransport: () => h.transport,
    Player: h.FakePlayer,
    Offline: h.Offline,
  };
});

const {
  ToneSoundPort,
  loopCacheKey,
  normalizeBpm,
  MAX_RECORD_SEC,
  normalizeBuffer,
  estimateSignalRms,
} = await import("../../src/adapters/tone-sound-port.ts");

/** A snapped clip WITH an effect, so resolving it awaits the offline bake. */
function snappedClip(): Clip {
  return {
    id: "c1",
    source: { kind: "synth", note: "C4" },
    effects: [{ id: "echo", amount: 0.5 }],
    color: "#fff",
    label: "take",
    loopBeats: 4,
  };
}

/** Sample length `loopToBeats` must produce for `beats` whole beats at `bpm`. */
function beatLength(beats: number, bpm: number): number {
  return Math.max(1, Math.round(beats * (60 / bpm) * h.SR));
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("loopCacheKey", () => {
  it("names a different entry for every tempo", () => {
    const clip = snappedClip();
    expect(loopCacheKey(clip, 90)).not.toBe(loopCacheKey(clip, 180));
    expect(loopCacheKey(clip, 90)).toBe(loopCacheKey(clip, 90));
  });

  it("keeps the bake signature, so effects still key separately", () => {
    const clip = snappedClip();
    const other: Clip = { ...clip, effects: [{ id: "echo", amount: 0.9 }] };
    expect(loopCacheKey(clip, 120)).not.toBe(loopCacheKey(other, 120));
  });

  it("falls back to 120 for a missing or nonsense tempo", () => {
    expect(normalizeBpm(0)).toBe(120);
    expect(normalizeBpm(Number.NaN)).toBe(120);
    expect(loopCacheKey(snappedClip(), 0)).toBe(loopCacheKey(snappedClip(), 120));
  });
});

describe("ToneSoundPort beat-snap cache", () => {
  it("bakes at the tempo in force when playback was asked for, not the one it lands in", async () => {
    const port = new ToneSoundPort();
    await port.resume();
    h.played.length = 0;

    port.setTempo(90);
    port.play(snappedClip()); // suspends inside the offline bake
    port.setTempo(180); // tempo moves WHILE the bake is in flight
    await flush();

    expect(h.played).toHaveLength(1);
    // Reading the transport after the await would have keyed (and rendered)
    // this buffer at 180 — a half-length loop under a wrong key.
    expect(h.played[0]?.length).toBe(beatLength(4, 90));
  });

  it("re-bakes on a tempo change and caches each tempo under its own key", async () => {
    const port = new ToneSoundPort();
    await port.resume();
    h.played.length = 0;

    port.setTempo(90);
    port.play(snappedClip());
    await flush();

    port.setTempo(180);
    port.play(snappedClip());
    await flush();

    port.setTempo(90);
    port.play(snappedClip());
    await flush();

    expect(h.played).toHaveLength(3);
    expect(h.played[0]?.length).toBe(beatLength(4, 90));
    expect(h.played[1]?.length).toBe(beatLength(4, 180));
    // Back at 90: the first entry is still there under its own key.
    expect(h.played[2]).toBe(h.played[0]);
  });
});

// ── MAX_RECORD_SEC auto-stop (S7) ────────────────────────────────────────────

/** Minimal Blob stand-in. jsdom's Blob has no `arrayBuffer()` (every browser
 *  does), so the adapter's real decode path — blob → bytes → decodeAudioData —
 *  is unrunnable against it. Stubbed as the global, so the blob the ADAPTER
 *  builds from the recorder's chunks is one of these too. */
class TestBlob {
  readonly size: number;
  readonly type: string;
  private readonly bytes: Uint8Array;
  constructor(parts: (Uint8Array | TestBlob)[] = [], opts: { type?: string } = {}) {
    const chunks = parts.map((p) => (p instanceof TestBlob ? p.bytes : p));
    this.size = chunks.reduce((n, c) => n + c.byteLength, 0);
    this.bytes = new Uint8Array(this.size);
    let at = 0;
    for (const c of chunks) {
      this.bytes.set(c, at);
      at += c.byteLength;
    }
    this.type = opts.type ?? "";
  }
  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(this.bytes.slice().buffer as ArrayBuffer);
  }
}

/** A MediaRecorder that yields one byte per millisecond it ran, delivered on a
 *  macrotask AFTER stop() — like the real one, whose final `dataavailable`
 *  never arrives in the same tick as the stop call. */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  state: "inactive" | "recording" = "inactive";
  readonly mimeType = "audio/webm";
  ondataavailable: ((e: { data: TestBlob }) => void) | null = null;
  onstop: ((e: Event) => void) | null = null;
  onerror: (() => void) | null = null;
  private startedAt = 0;
  constructor(readonly stream: unknown) {
    FakeMediaRecorder.instances.push(this);
  }
  start(): void {
    this.state = "recording";
    this.startedAt = Date.now();
  }
  stop(): void {
    const ms = Date.now() - this.startedAt;
    this.state = "inactive";
    setTimeout(() => {
      this.ondataavailable?.({ data: new TestBlob([new Uint8Array(ms)]) });
      this.onstop?.(new Event("stop"));
    }, 0);
  }
}

/** Tracks whose `stop()` was called — proof the mic hardware was released. */
class FakeTrack {
  stopped = false;
  stop(): void {
    this.stopped = true;
  }
}

describe("ToneSoundPort recording cap", () => {
  let tracks: FakeTrack[] = [];

  const bootedPort = async (): Promise<InstanceType<typeof ToneSoundPort>> => {
    const port = new ToneSoundPort();
    await port.resume();
    return port;
  };

  /** Let the fake recorder's deferred chunk land while awaiting a real promise. */
  const settle = async <T,>(p: Promise<T>): Promise<T> => {
    await vi.advanceTimersByTimeAsync(1);
    return p;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    FakeMediaRecorder.instances = [];
    tracks = [];
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    // The adapter reads the global `Blob` at call time — see TestBlob.
    vi.stubGlobal("Blob", TestBlob);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const track = new FakeTrack();
          tracks.push(track);
          return { getTracks: () => [track] };
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("auto-stops a held take at MAX_RECORD_SEC and frees the mic", async () => {
    const port = await bootedPort();
    await port.startRecording();

    // Still holding at one second short of the cap: nothing has closed.
    await vi.advanceTimersByTimeAsync((MAX_RECORD_SEC - 1) * 1000);
    expect(FakeMediaRecorder.instances[0]?.state).toBe("recording");
    expect(tracks[0]?.stopped).toBe(false);

    await vi.advanceTimersByTimeAsync(1000 + 1);
    expect(FakeMediaRecorder.instances[0]?.state).toBe("inactive");
    expect(tracks[0]?.stopped).toBe(true); // the mic is released, not left open
  });

  it("hands the capped take back when the finger finally lifts", async () => {
    const port = await bootedPort();
    await port.startRecording();

    // The cap fires, then the kid keeps holding for another ten seconds.
    await vi.advanceTimersByTimeAsync(MAX_RECORD_SEC * 1000 + 1);
    await vi.advanceTimersByTimeAsync(10_000);

    // A capped take is a SUCCESSFUL take: release still yields a usable buffer…
    const id = await settle(port.stopRecording());
    expect(id).toMatch(/^rec-/);
    // …holding MAX_RECORD_SEC of audio — not zero, and not the 40s they held.
    expect(port.getBufferDuration(id)).toBeCloseTo(MAX_RECORD_SEC, 1);
    expect(port.getRecordingBlob(id)).not.toBeNull();
  });

  it("leaves a normal short take untouched and disarms the timer", async () => {
    const port = await bootedPort();
    await port.startRecording();
    await vi.advanceTimersByTimeAsync(1500); // the e2e's hold-to-record gesture

    const id = await settle(port.stopRecording());
    expect(port.getBufferDuration(id)).toBeCloseTo(1.5, 1);
    // Nothing left armed to fire into a closed mic.
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(MAX_RECORD_SEC * 1000);
    expect(FakeMediaRecorder.instances).toHaveLength(1);
  });
});

// ── normalizeBuffer: the microphone-static fix ──────────────────────────────
// Eric play-tested the deployed build and every recording came back as static.
// Root cause was `normalizeBuffer` measuring its RMS over a fixed 0.003 floor,
// which excludes digital silence but INCLUDES room tone: on a quiet take the
// level it read was the room's, the gain went to its cap of 60, and `Math.tanh`
// over every sample at that drive is a square-wave shaper (measured crest factor
// 1.005, where a literal square wave is 1.000).
//
// These tests pin the two-sided property that fix has to hold: quiet SPEECH must
// get loud, while the ROOM AROUND IT must not. A one-sided "gets louder" test is
// what the buggy version would also have passed.

/** Deterministic ±1 noise. No Math.random: a flaky audio test is worse than none. */
function makeNoise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0x100000000) * 2 - 1;
  };
}

const SR_TEST = 8000;

function makeAudioBuffer(samples: Float32Array): AudioBuffer {
  return {
    numberOfChannels: 1,
    length: samples.length,
    sampleRate: SR_TEST,
    duration: samples.length / SR_TEST,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

/** Room tone alone — nobody in the room, mic left open. */
function roomTone(seconds: number, amplitude: number): Float32Array {
  const noise = makeNoise(7);
  const out = new Float32Array(Math.round(seconds * SR_TEST));
  for (let i = 0; i < out.length; i++) out[i] = noise() * amplitude;
  return out;
}

/** A realistic quiet take: room tone throughout, with short spoken bursts. The
 *  burst windows are returned so a test can measure signal and silence apart. */
function quietSpeech(): { samples: Float32Array; burst: [number, number]; quiet: [number, number] } {
  const noise = makeNoise(11);
  const seconds = 4;
  const out = new Float32Array(seconds * SR_TEST);
  for (let i = 0; i < out.length; i++) out[i] = noise() * 0.004; // room floor
  // Two ~0.4s syllables at a genuinely quiet speaking level (peak 0.05).
  for (const [from, to] of [[1.0, 1.4], [2.2, 2.6]] as const) {
    for (let i = Math.round(from * SR_TEST); i < Math.round(to * SR_TEST); i++) {
      out[i] = (out[i] as number) + Math.sin((i / SR_TEST) * 2 * Math.PI * 180) * 0.05;
    }
  }
  return { samples: out, burst: [1.0, 1.4], quiet: [3.0, 3.9] };
}

function rmsOf(samples: Float32Array, fromSec: number, toSec: number): number {
  const from = Math.round(fromSec * SR_TEST);
  const to = Math.round(toSec * SR_TEST);
  let sumSq = 0;
  for (let i = from; i < to; i++) sumSq += (samples[i] as number) ** 2;
  return Math.sqrt(sumSq / (to - from));
}

const peakOf = (s: Float32Array): number => s.reduce((m, x) => Math.max(m, Math.abs(x)), 0);

describe("normalizeBuffer", () => {
  it("leaves an empty room exactly as recorded", () => {
    // THE regression guard. The old code lifted this to ~0.25 RMS of constant
    // hiss, which is the static Eric heard on every take.
    const samples = roomTone(3, 0.01);
    const before = Float32Array.from(samples);
    normalizeBuffer(makeAudioBuffer(samples));
    expect(Array.from(samples)).toEqual(Array.from(before));
  });

  it("makes quiet speech loud WITHOUT bringing the room up with it", () => {
    const { samples, burst, quiet } = quietSpeech();
    const roomBefore = rmsOf(samples, quiet[0], quiet[1]);
    normalizeBuffer(makeAudioBuffer(samples));

    // The voice arrives at a usable level…
    expect(rmsOf(samples, burst[0], burst[1])).toBeGreaterThan(0.04);
    // …and the room stays down where it belongs. Measured: this fix leaves the
    // silent region at 0.005 RMS; the old normalizer pushed it to 0.023 —
    // audible, continuous hiss between every word. 0.01 sits between the two
    // with better than 2x margin either side.
    expect(rmsOf(samples, quiet[0], quiet[1])).toBeLessThan(0.01);
    // Still a real recording of a real room, not a gate that chopped it out.
    expect(rmsOf(samples, quiet[0], quiet[1])).toBeGreaterThan(roomBefore);
  });

  it("passes everything below the limiter knee through untouched", () => {
    // The structural half of the fix. The old code ran `Math.tanh(gain * x)` over
    // EVERY sample, so no part of the signal survived un-warped. Here the gain is
    // exact wherever the result lands below the knee — only genuine peaks bend —
    // which is what preserves the shape of a voice.
    const { samples } = quietSpeech();
    const before = Float32Array.from(samples);
    normalizeBuffer(makeAudioBuffer(samples));

    // Recover the gain from a sample that is nowhere near the knee.
    let gain = 0;
    for (let i = 0; i < before.length; i++) {
      const b = before[i] as number;
      if (Math.abs(b) > 1e-3) { gain = (samples[i] as number) / b; break; }
    }
    expect(gain).toBeGreaterThan(1);

    let checked = 0;
    for (let i = 0; i < before.length; i++) {
      const linear = gain * (before[i] as number);
      if (Math.abs(linear) < 0.7) {
        expect(samples[i]).toBeCloseTo(linear, 6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(before.length * 0.9);
  });

  it("keeps the peaks proportional instead of squashing them flat", () => {
    // Secondary sanity check, not the regression guard: on THIS fixture the old
    // code also scored ~3.3, because its gain here was only ~10. Crest factor
    // only collapses once the old gain approached its cap of 60. The guards that
    // actually bite on the bug are the two tests above.
    const { samples } = quietSpeech();
    normalizeBuffer(makeAudioBuffer(samples));
    const overall = rmsOf(samples, 0, samples.length / SR_TEST);
    expect(peakOf(samples) / overall).toBeGreaterThan(3);
  });

  it("never exceeds full scale, however quiet the input", () => {
    for (const amp of [0.002, 0.02, 0.2, 0.9]) {
      const noise = makeNoise(3);
      const samples = new Float32Array(2 * SR_TEST);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = noise() * amp * (i % 1000 < 300 ? 1 : 0.05);
      }
      normalizeBuffer(makeAudioBuffer(samples));
      expect(peakOf(samples)).toBeLessThanOrEqual(1);
    }
  });

  it("leaves an already-loud take alone", () => {
    const noise = makeNoise(5);
    const samples = new Float32Array(2 * SR_TEST);
    for (let i = 0; i < samples.length; i++) samples[i] = noise() * 0.6;
    const before = Float32Array.from(samples);
    normalizeBuffer(makeAudioBuffer(samples));
    for (let i = 0; i < samples.length; i++) {
      expect(samples[i]).toBeCloseTo(before[i] as number, 5);
    }
  });

  it("does not touch a digitally silent buffer", () => {
    const samples = new Float32Array(SR_TEST);
    normalizeBuffer(makeAudioBuffer(samples));
    expect(peakOf(samples)).toBe(0);
  });
});

describe("estimateSignalRms", () => {
  it("reads the voice's level, not the room's", () => {
    const { samples } = quietSpeech();
    const { rms, hasBursts } = estimateSignalRms(makeAudioBuffer(samples));
    expect(hasBursts).toBe(true);
    // Room is 0.004 RMS, speech ~0.035. A whole-buffer RMS lands near 0.013;
    // the estimate has to come back up at the speech, which is the whole point.
    expect(rms).toBeGreaterThan(0.02);
  });

  it("reports a uniform take as burstless so the caller can refuse to boost it", () => {
    const { rms, hasBursts } = estimateSignalRms(makeAudioBuffer(roomTone(3, 0.01)));
    expect(hasBursts).toBe(false);
    expect(rms).toBeLessThan(0.02);
  });
});
