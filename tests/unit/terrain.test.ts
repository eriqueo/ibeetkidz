import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOLD_BARS,
  NEUTRAL_TERRAIN,
  TERRAIN,
  TERRAIN_KINDS,
  beatSeconds,
  clampSend,
  clampTempoScale,
  isTerrainKind,
  rampSeconds,
  terrainEffect,
} from "../../src/core/terrain.ts";

describe("terrain vocabulary", () => {
  it("maps each terrain to the musical idea it stands for", () => {
    // The mechanic only reads if the physical thing and the sound agree.
    expect(TERRAIN.hill.tempoScale).toBeLessThan(1); // uphill = labouring
    expect(TERRAIN.bridge.reverb).toBeGreaterThan(0.4); // a big empty space
    expect(TERRAIN.rain.grit).toBeGreaterThan(0.4); // rough weather
  });

  it("keeps the terrains distinguishable — no two do the same thing", () => {
    const signatures = TERRAIN_KINDS.map((k) => {
      const e = TERRAIN[k];
      return `${e.tempoScale}|${e.reverb}|${e.grit}`;
    });
    expect(new Set(signatures).size).toBe(TERRAIN_KINDS.length);
  });

  it("only the hill touches tempo, so only it can move the grid", () => {
    expect(TERRAIN.bridge.tempoScale).toBe(1);
    expect(TERRAIN.rain.tempoScale).toBe(1);
  });

  it("flat ground is genuinely neutral", () => {
    expect(NEUTRAL_TERRAIN.tempoScale).toBe(1);
    expect(NEUTRAL_TERRAIN.reverb).toBe(0);
    expect(NEUTRAL_TERRAIN.grit).toBe(0);
  });

  it("holds for a couple of bars by default, not one", () => {
    // Eric's brief: long enough that a four-year-old connects cause to effect.
    expect(DEFAULT_HOLD_BARS).toBeGreaterThanOrEqual(2);
  });

  it("recognises its own kinds and rejects anything else", () => {
    for (const k of TERRAIN_KINDS) expect(isTerrainKind(k)).toBe(true);
    expect(isTerrainKind("volcano")).toBe(false);
  });

  it("an unknown terrain falls back to flat ground instead of throwing", () => {
    // A bad map edit must not be able to silence the song.
    expect(terrainEffect("swamp" as never)).toEqual(NEUTRAL_TERRAIN);
  });
});

describe("terrain timing math", () => {
  it("beatSeconds tracks tempo", () => {
    expect(beatSeconds(120)).toBeCloseTo(0.5);
    expect(beatSeconds(60)).toBeCloseTo(1);
  });

  it("beatSeconds refuses to divide by a stopped clock", () => {
    expect(Number.isFinite(beatSeconds(0))).toBe(true);
  });

  it("a glide always finishes well inside the bars it holds for", () => {
    for (const k of TERRAIN_KINDS) {
      for (const bpm of [40, 120, 220]) {
        const hold = 1;
        const r = rampSeconds(TERRAIN[k], bpm, hold);
        const holdSec = hold * 4 * beatSeconds(bpm);
        expect(r).toBeLessThanOrEqual(holdSec * 0.4 + 1e-9);
        expect(r).toBeGreaterThan(0); // never an instant click
      }
    }
  });

  it("a glide scales with tempo — slower song, longer glide", () => {
    const fast = rampSeconds(TERRAIN.bridge, 200, 2);
    const slow = rampSeconds(TERRAIN.bridge, 60, 2);
    expect(slow).toBeGreaterThan(fast);
  });
});

describe("terrain guards", () => {
  it("clamps a tempo scale away from zero, which would stall the transport", () => {
    expect(clampTempoScale(0)).toBeGreaterThan(0);
    expect(clampTempoScale(-5)).toBeGreaterThan(0);
    expect(clampTempoScale(Number.NaN)).toBe(1);
    expect(clampTempoScale(Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(2);
  });

  it("clamps sends into 0..1", () => {
    expect(clampSend(-1)).toBe(0);
    expect(clampSend(5)).toBe(1);
    expect(clampSend(Number.NaN)).toBe(0);
    expect(clampSend(0.4)).toBe(0.4);
  });

  it("every shipped terrain is already inside the guards", () => {
    for (const k of TERRAIN_KINDS) {
      const e = TERRAIN[k];
      expect(clampTempoScale(e.tempoScale)).toBe(e.tempoScale);
      expect(clampSend(e.reverb)).toBe(e.reverb);
      expect(clampSend(e.grit)).toBe(e.grit);
    }
  });
});
