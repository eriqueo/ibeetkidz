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

  /** Every buffer a Player was constructed with, in order. */
  const played: FakeBuffer[] = [];

  class FakePlayer {
    onstop: (() => void) | undefined;
    constructor(readonly buffer: FakeBuffer) {
      played.push(buffer);
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

  return { SR, ctx, transport, played, FakePlayer, Offline, makeBuffer };
});

vi.mock("tone", async (importOriginal) => {
  const actual = await importOriginal<typeof import("tone")>();
  return {
    ...actual,
    start: async () => {},
    getContext: () => ({ rawContext: h.ctx }),
    getDestination: () => ({ connect: () => {}, mute: false, volume: { value: 0 } }),
    getTransport: () => h.transport,
    Player: h.FakePlayer,
    Offline: h.Offline,
  };
});

const { ToneSoundPort, loopCacheKey, normalizeBpm, MAX_RECORD_SEC } = await import(
  "../../src/adapters/tone-sound-port.ts"
);

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
