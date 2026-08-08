import { describe, expect, it } from "vitest";
import {
  barAtPlayhead,
  barEdgeX,
  bobOffset,
  parallaxOffset,
  playheadX,
  songBarOf,
  terrainSpanX,
  travelPx,
  visibleBars,
  wheelAngle,
  type ScrollView,
} from "../../src/game/track-scroll.ts";

const VIEW: ScrollView = { width: 2560, playhead: 0.3, barWidth: 640 };

describe("playhead", () => {
  it("sits where the view says", () => {
    expect(playheadX(VIEW)).toBe(768);
  });

  it("clamps a nonsense playhead onto the screen", () => {
    expect(playheadX({ ...VIEW, playhead: -3 })).toBe(0);
    expect(playheadX({ ...VIEW, playhead: 9 })).toBe(2560);
    expect(playheadX({ ...VIEW, playhead: Number.NaN })).toBe(0);
  });
});

describe("bar placement", () => {
  it("puts the current bar's edge exactly at the playhead on a bar line", () => {
    expect(barEdgeX(4, 4, VIEW)).toBe(playheadX(VIEW));
  });

  it("scrolls the world leftward as the song advances", () => {
    const atStart = barEdgeX(4, 4, VIEW);
    const halfway = barEdgeX(4, 4.5, VIEW);
    expect(halfway).toBeLessThan(atStart);
    expect(atStart - halfway).toBeCloseTo(VIEW.barWidth / 2);
  });

  it("places the NEXT bar to the right — the terrain you can see coming", () => {
    // This is the whole reason for the side-scroller: at song position 4.0 the
    // hill applied to bar 5 must already be on screen, ahead of the playhead.
    expect(barEdgeX(5, 4, VIEW)).toBeGreaterThan(playheadX(VIEW));
    expect(barEdgeX(5, 4, VIEW)).toBeLessThan(VIEW.width);
  });

  it("wraps absolute bars onto the song, including negatives", () => {
    expect(songBarOf(0, 4)).toBe(0);
    expect(songBarOf(5, 4)).toBe(1);
    expect(songBarOf(-1, 4)).toBe(3);
    expect(songBarOf(7.9, 4)).toBe(3); // floors before wrapping
  });

  it("never divides by a zero-length song", () => {
    expect(songBarOf(3, 0)).toBe(0);
  });

  it("reports the bar under the playhead", () => {
    expect(barAtPlayhead(4.0)).toBe(4);
    expect(barAtPlayhead(4.99)).toBe(4);
    expect(barAtPlayhead(5.0)).toBe(5);
  });
});

describe("visibleBars", () => {
  it("covers the screen with no gap and no overlap", () => {
    const slots = visibleBars(4.37, 4, VIEW);
    expect(slots.length).toBeGreaterThan(0);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]!.absBar).toBe(slots[i - 1]!.absBar + 1);
      expect(slots[i]!.x).toBeCloseTo(slots[i - 1]!.x + VIEW.barWidth);
    }
  });

  it("spans the full width plus bleed at both ends", () => {
    const slots = visibleBars(4.37, 4, VIEW);
    expect(slots[0]!.x).toBeLessThanOrEqual(0);
    expect(slots.at(-1)!.x + VIEW.barWidth).toBeGreaterThanOrEqual(VIEW.width);
  });

  it("keeps cycling the song's bars as the ride goes on", () => {
    const slots = visibleBars(9.5, 3, VIEW);
    for (const s of slots) {
      expect(s.songBar).toBe(((s.absBar % 3) + 3) % 3);
      expect(s.songBar).toBeGreaterThanOrEqual(0);
      expect(s.songBar).toBeLessThan(3);
    }
  });

  it("centres a car in its own bar", () => {
    for (const s of visibleBars(2.2, 4, VIEW)) {
      expect(s.centreX).toBeCloseTo(s.x + VIEW.barWidth / 2);
    }
  });

  it("returns nothing rather than looping forever on a degenerate view", () => {
    expect(visibleBars(1, 4, { ...VIEW, barWidth: 0 })).toEqual([]);
    expect(visibleBars(Number.NaN, 4, VIEW)).toEqual([]);
  });

  it("is stable in count as the song scrolls (no popping in and out)", () => {
    const counts = new Set<number>();
    for (let p = 0; p < 4; p += 0.05) counts.add(visibleBars(p, 4, VIEW).length);
    // At most one bar of difference across a whole lap.
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

describe("motion is driven by distance, not the clock (GAME_FEEL Law 4)", () => {
  it("travel is proportional to song position", () => {
    expect(travelPx(2, VIEW)).toBe(1280);
    expect(travelPx(0, VIEW)).toBe(0);
  });

  it("halving the distance halves the wheel rotation", () => {
    const full = wheelAngle(travelPx(2, VIEW), 20);
    const half = wheelAngle(travelPx(1, VIEW), 20);
    expect(half).toBeCloseTo(full / 2);
  });

  it("a wheel of no size does not divide by zero", () => {
    expect(Number.isFinite(wheelAngle(100, 0))).toBe(true);
  });

  it("parallax planes move at their own rate, always on whole pixels", () => {
    const ground = parallaxOffset(1.5, VIEW, 1);
    const sky = parallaxOffset(1.5, VIEW, 0.1);
    const fore = parallaxOffset(1.5, VIEW, 1.4);
    expect(sky).toBeLessThan(ground);
    expect(fore).toBeGreaterThan(ground);
    for (const v of [ground, sky, fore]) expect(Number.isInteger(v)).toBe(true);
  });

  it("a still train does not bob at all", () => {
    expect(bobOffset(1234, 0)).toBe(0);
  });

  it("bob amplitude grows with speed", () => {
    // Sample the envelope rather than one phase, so this tests amplitude.
    const peak = (speed: number) => {
      let m = 0;
      for (let d = 0; d < 400; d += 1) m = Math.max(m, Math.abs(bobOffset(d, speed)));
      return m;
    };
    expect(peak(0.5)).toBeLessThan(peak(1.5));
    expect(peak(0)).toBe(0);
  });
});

describe("terrain spans", () => {
  it("covers exactly the bars it was scheduled for", () => {
    const span = terrainSpanX(5, 7, 4, VIEW);
    expect(span).not.toBeNull();
    expect(span!.width).toBeCloseTo(2 * VIEW.barWidth);
    expect(span!.x).toBeCloseTo(barEdgeX(5, 4, VIEW));
  });

  it("is culled once it has scrolled well past", () => {
    expect(terrainSpanX(0, 2, 40, VIEW)).toBeNull();
  });

  it("is culled while still far ahead", () => {
    expect(terrainSpanX(80, 82, 1, VIEW)).toBeNull();
  });

  it("never reports a negative width", () => {
    const span = terrainSpanX(6, 6, 5.5, VIEW);
    expect(span!.width).toBeGreaterThanOrEqual(0);
  });
});
