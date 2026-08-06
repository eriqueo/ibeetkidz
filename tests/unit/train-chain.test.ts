import { describe, expect, it } from "vitest";
import {
  TRAIN_MAX_FILL,
  chainSqueeze,
  couplingOffsets,
  popScale,
} from "../../src/game/train-chain.ts";

// The shipped oval at the reference size: ~4076 px around, a car body ~200 px
// wide on screen, the loco ~1.5× that.
const LAP = 4076;
const CAR = 200;
const LOCO = 300;

describe("couplingOffsets — spacing comes from vehicle length, not song length", () => {
  it("puts adjacent centres half of each neighbour apart", () => {
    const offsets = couplingOffsets([CAR, CAR, CAR], LAP);
    expect(offsets).toEqual([0, CAR, CAR * 2]);
  });

  it("uses each vehicle's own length, so a long loco pushes further", () => {
    const [loco, car0, car1] = couplingOffsets([LOCO, CAR, CAR], LAP);
    expect(loco).toBe(0);
    expect(car0).toBe((LOCO + CAR) / 2);
    expect(car1).toBe((LOCO + CAR) / 2 + CAR);
  });

  it("anchors on the requested vehicle, putting the loco AHEAD (negative)", () => {
    // The consist as the Track builds it: loco first, then car 0..n-1, anchored
    // on car 0 because car 0 at progress 0 is parked on the crossing signal.
    const offsets = couplingOffsets([LOCO, CAR, CAR, CAR, CAR], LAP, 1);
    expect(offsets[1]).toBe(0);
    expect(offsets[0]).toBe(-(LOCO + CAR) / 2);
    expect(offsets[2]).toBe(CAR);
    expect(offsets[4]).toBe(CAR * 3);
  });

  it("does NOT scale with the car count — the old i/n bug", () => {
    const four = couplingOffsets([CAR, CAR, CAR, CAR], LAP);
    const eight = couplingOffsets(new Array(8).fill(CAR), LAP);
    // Same gap between neighbours whether the song is 4 bars or 8. Under the
    // old model these were LAP/4 = 1019 and LAP/8 = 509.
    expect(four[1]).toBe(CAR);
    expect(eight[1]).toBe(CAR);
    expect(four[1]).toBeLessThan(LAP / 8);
  });

  it("spans a small fraction of the lap for a typical train", () => {
    const offsets = couplingOffsets([LOCO, CAR, CAR, CAR, CAR], LAP, 1);
    const span = offsets[offsets.length - 1]! - offsets[0]!;
    expect(span / LAP).toBeLessThan(0.25);
  });

  it("survives degenerate input", () => {
    expect(couplingOffsets([], LAP)).toEqual([]);
    expect(couplingOffsets([CAR], LAP)).toEqual([0]);
    // A token whose texture has not sized yet reports 0 width; it must not
    // produce NaN positions for every vehicle behind it.
    expect(couplingOffsets([0, CAR, CAR], LAP, 1)).toEqual([-CAR / 2, 0, CAR]);
    expect(couplingOffsets([NaN, CAR], LAP).every(Number.isFinite)).toBe(true);
    expect(couplingOffsets([CAR, CAR], 0).every(Number.isFinite)).toBe(true);
  });
});

describe("chainSqueeze — a train longer than the lap compresses, it does not wrap", () => {
  it("leaves a normal consist alone", () => {
    expect(chainSqueeze([LOCO, CAR, CAR, CAR, CAR], LAP)).toBe(1);
    // Right up to the fill limit, still untouched.
    const justFits = new Array(18).fill(CAR); // 3600 px < 0.9 × 4076
    expect(chainSqueeze(justFits, LAP)).toBe(1);
  });

  it("compresses proportionally once the consist outgrows the lap", () => {
    const long = new Array(40).fill(CAR); // 8000 px on a 4076 px oval
    const k = chainSqueeze(long, LAP);
    expect(k).toBeLessThan(1);
    expect(k).toBeCloseTo((LAP * TRAIN_MAX_FILL) / (40 * CAR), 10);
  });

  it("keeps the squeezed train inside the lap with a gap behind it", () => {
    for (const count of [20, 40, 120]) {
      const lengths = new Array(count).fill(CAR);
      const offsets = couplingOffsets(lengths, LAP);
      const k = chainSqueeze(lengths, LAP);
      // Nose of the loco to tail of the last car, in arc length.
      const span = offsets[count - 1]! + (CAR / 2) * k + (CAR / 2) * k;
      expect(span).toBeLessThanOrEqual(LAP * TRAIN_MAX_FILL + 1e-9);
      expect(span).toBeLessThan(LAP); // never laps itself
    }
  });

  it("keeps the order of the consist under compression", () => {
    const offsets = couplingOffsets(new Array(40).fill(CAR), LAP, 1);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]!).toBeGreaterThan(offsets[i - 1]!);
    }
  });

  it("survives a zero-length path or an empty consist", () => {
    expect(chainSqueeze([], LAP)).toBe(1);
    expect(chainSqueeze([CAR], 0)).toBe(1);
    expect(chainSqueeze([0, 0], LAP)).toBe(1);
  });
});

describe("popScale — the sounding car's bounce", () => {
  it("snaps up on the beat and settles back to 1", () => {
    expect(popScale(0)).toBeCloseTo(1.3, 10);
    expect(popScale(260)).toBe(1);
    expect(popScale(10_000)).toBe(1);
  });

  it("decays monotonically", () => {
    let prev = popScale(0);
    for (let ms = 10; ms <= 260; ms += 10) {
      const v = popScale(ms);
      expect(v).toBeLessThan(prev);
      prev = v;
    }
  });

  it("is neutral for nonsense input", () => {
    expect(popScale(-1)).toBe(1);
    expect(popScale(NaN)).toBe(1);
    expect(popScale(100, 0)).toBe(1);
  });
});
