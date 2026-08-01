// `bandLevels` — the FFT→bars reduction (`src/visualizer/spectrum.ts`).
//
// Pure, so it gets real tests rather than a screenshot. The properties below are
// the ones that made the difference between a jumbotron with two stubs on the
// left and one that reads as an equalizer.

import { describe, expect, it } from "vitest";
import { bandLevels } from "../../src/visualizer/spectrum.ts";

/** A 1024-bin spectrum (what a 2048-point FFT gives) with one loud bin. */
function spike(bin: number, value = 255, size = 1024): Uint8Array {
  const s = new Uint8Array(size);
  s[bin] = value;
  return s;
}

describe("bandLevels", () => {
  it("returns one level per band, normalized to 0..1", () => {
    const levels = bandLevels(spike(4), 28);
    expect(levels.length).toBe(28);
    for (const v of levels) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("spreads a kid's melody across the WHOLE width, not the first two bars", () => {
    // The defect this file exists for. A 2048-point FFT at 48 kHz is ~23 Hz per
    // bin, so notes, voice and drums all sit in roughly the first 3% of bins.
    // Linear binning put every one of them in band 0.
    //
    // Bins 4 / 40 / 400 are ~90 Hz, ~940 Hz and ~9 kHz — low note, upper
    // harmonic, cymbal air. They must land in three clearly separate bands.
    const bandOf = (bin: number): number => {
      const levels = bandLevels(spike(bin), 28);
      return levels.indexOf(Math.max(...levels));
    };
    const low = bandOf(4);
    const mid = bandOf(40);
    const high = bandOf(400);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    // …and they should be well spread, not crowded into one end.
    expect(mid - low).toBeGreaterThan(5);
    expect(high - mid).toBeGreaterThan(5);
  });

  it("reports each band's PEAK, so a loud harmonic is not averaged away", () => {
    // The top bands span hundreds of bins. Averaging buried a single loud bin
    // under the silence either side and the bars never left the floor.
    const levels = bandLevels(spike(900), 28);
    expect(Math.max(...levels)).toBe(1);
  });

  it("skips DC, which is an offset and never music", () => {
    const dcOnly = new Uint8Array(1024);
    dcOnly[0] = 255;
    expect(Math.max(...bandLevels(dcOnly, 28))).toBe(0);
  });

  it("gives every band its own bins — none is left permanently empty", () => {
    // The ideal log edges collapse onto one bin at the bottom; without the
    // `lo + 1` floor the first several bands would share bin 1 and read
    // identically, which looks like a broken meter.
    const all = new Uint8Array(1024).fill(255);
    const levels = bandLevels(all, 28);
    for (const [i, v] of levels.entries()) {
      expect(v, `band ${i} covered no bins`).toBe(1);
    }
  });

  it("reuses its buffer between frames but re-cuts it per band count", () => {
    // Documented contract: read-and-draw, do not retain. A render loop that
    // allocated here every frame would stutter on GC.
    const a = bandLevels(spike(4), 28);
    const b = bandLevels(spike(4), 28);
    expect(a).toBe(b);
    expect(bandLevels(spike(4), 32).length).toBe(32);
  });

  it("survives degenerate inputs instead of returning NaN into a canvas", () => {
    expect(bandLevels(new Uint8Array(1024), 0).length).toBe(0);
    expect(Array.from(bandLevels(new Uint8Array(1), 4))).toEqual([0, 0, 0, 0]);
  });
});
