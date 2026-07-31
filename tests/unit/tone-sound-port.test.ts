import { describe, expect, it, vi } from "vitest";
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

const { ToneSoundPort, loopCacheKey, normalizeBpm } = await import(
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
