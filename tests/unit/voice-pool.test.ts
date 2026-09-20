import { describe, expect, it } from "vitest";
import { VoicePool, spansCollide } from "../../src/adapters/voice-pool.ts";
import { ByteLru } from "../../src/adapters/byte-lru.ts";

describe("spansCollide", () => {
  it("separates notes whose spans do not touch", () => {
    expect(spansCollide({ startSec: 0, needSec: 0.5 }, { startSec: 1, needSec: 0.5 }, 4)).toBe(false);
    // Order of arguments never matters.
    expect(spansCollide({ startSec: 1, needSec: 0.5 }, { startSec: 0, needSec: 0.5 }, 4)).toBe(false);
  });

  it("collides a chord: two notes on the same instant", () => {
    expect(spansCollide({ startSec: 1, needSec: 0.1 }, { startSec: 1, needSec: 0.1 }, 4)).toBe(true);
  });

  it("collides a tail that is still ringing when the next note starts", () => {
    expect(spansCollide({ startSec: 0, needSec: 1.2 }, { startSec: 1, needSec: 0.1 }, 4)).toBe(true);
  });

  it("wraps: a tail at the end of the cycle lands on a note at its start", () => {
    expect(spansCollide({ startSec: 3.5, needSec: 1 }, { startSec: 0.2, needSec: 0.1 }, 4)).toBe(true);
    expect(spansCollide({ startSec: 3.5, needSec: 0.4 }, { startSec: 0.2, needSec: 0.1 }, 4)).toBe(false);
  });

  it("never collides a zero-need span (a voice polyphonic by itself)", () => {
    expect(spansCollide({ startSec: 1, needSec: 0 }, { startSec: 1, needSec: 0 }, 4)).toBe(false);
  });

  it("refuses to share across a degenerate cycle", () => {
    expect(spansCollide({ startSec: 0, needSec: 0.1 }, { startSec: 1, needSec: 0.1 }, 0)).toBe(true);
  });
});

describe("VoicePool", () => {
  const pool = (): { p: VoicePool<number>; build: () => number; built: () => number } => {
    let n = 0;
    return { p: new VoicePool<number>(), build: () => ++n, built: () => n };
  };

  it("serves a run of separated notes with one voice", () => {
    const { p, build, built } = pool();
    const voices = [0, 1, 2, 3].map((s) => p.acquire("lane", { startSec: s, needSec: 0.6 }, 4, build));
    expect(new Set(voices).size).toBe(1);
    expect(built()).toBe(1);
  });

  it("gives every note of a chord its own voice — never steals", () => {
    const { p, build } = pool();
    const chord = [0, 0, 0].map(() => p.acquire("lane", { startSec: 0, needSec: 0.5 }, 4, build));
    expect(new Set(chord).size).toBe(3);
    // …and the next chord reuses exactly those three.
    const next = [0, 0, 0].map(() => p.acquire("lane", { startSec: 2, needSec: 0.5 }, 4, build));
    expect(new Set([...chord, ...next]).size).toBe(3);
  });

  it("does not hand a voice back while its tail crosses the loop point", () => {
    const { p, build } = pool();
    const late = p.acquire("lane", { startSec: 3.8, needSec: 1 }, 4, build);
    const early = p.acquire("lane", { startSec: 0.1, needSec: 0.2 }, 4, build);
    expect(early).not.toBe(late);
  });

  it("never shares across keys, and forgets assignments on clear", () => {
    const { p, build } = pool();
    const a = p.acquire("lane-a", { startSec: 0, needSec: 0.1 }, 4, build);
    const b = p.acquire("lane-b", { startSec: 2, needSec: 0.1 }, 4, build);
    expect(b).not.toBe(a);
    p.clear();
    expect(p.acquire("lane-a", { startSec: 2, needSec: 0.1 }, 4, build)).not.toBe(a);
  });

  it("plateaus: repeating the same bar across a longer ride adds no voices per bar", () => {
    const { p, build, built } = pool();
    const barSec = 2;
    const voicesFor = (bars: number): number => {
      p.clear();
      const before = built();
      for (let bar = 0; bar < bars; bar++) {
        for (let step = 0; step < 16; step++) {
          p.acquire("lane", { startSec: bar * barSec + step * 0.125, needSec: 0.63 }, bars * barSec, build);
        }
      }
      return built() - before;
    };
    // 16th notes each needing 0.63 s overlap 6 deep. The old rule built one
    // voice per note: 16, 48, 144. The pool tracks the overlap, not the count.
    const one = voicesFor(1);
    expect(one).toBeLessThan(16);
    expect(voicesFor(3)).toBeLessThanOrEqual(one);
    expect(voicesFor(9)).toBeLessThanOrEqual(one);
  });
});

describe("ByteLru", () => {
  const lru = (max: number): ByteLru<string, number> => new ByteLru<string, number>(max, (v) => v);

  it("drops the least-recently-used entry at the cap, and a read refreshes", () => {
    const c = lru(10);
    c.set("a", 4);
    c.set("b", 4);
    expect(c.get("a")).toBe(4); // a is now fresher than b
    c.set("c", 4);
    expect(c.has("b")).toBe(false);
    expect(c.get("a")).toBe(4);
    expect(c.get("c")).toBe(4);
    expect(c.stats).toEqual({ entries: 2, bytes: 8 });
  });

  it("keeps an entry larger than the whole budget — alone — so it still plays", () => {
    const c = lru(10);
    c.set("a", 4);
    c.set("huge", 50);
    expect(c.get("huge")).toBe(50);
    expect(c.has("a")).toBe(false);
    expect(c.stats).toEqual({ entries: 1, bytes: 50 });
  });

  it("replacing a key re-counts its bytes instead of leaking them", () => {
    const c = lru(10);
    c.set("a", 8);
    c.set("a", 2);
    expect(c.stats).toEqual({ entries: 1, bytes: 2 });
  });

  it("has() refreshes, so an entry a caller is about to rely on outlives the next write", () => {
    const c = lru(10);
    c.set("a", 5);
    c.set("b", 5);
    expect(c.has("a")).toBe(true);
    c.set("c", 5);
    expect(c.get("a")).toBe(5);
    expect(c.get("b")).toBeUndefined();
  });
});
