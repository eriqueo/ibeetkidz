// The side-scroller's header deck: does every control actually land on the
// plate's parchment?
//
// This is a REGRESSION GUARD for a shipped bug that only a human eye caught.
// `TrackV3Scene.buildTopBar` placed nine controls by arithmetic against a field
// it had GUESSED as "~400..2064" and documented as such in a comment. Measured
// off the packed `panel-header-v2` frame, the parchment is really 509..2028 —
// so SLOW stood on the left gear medallion, SEND SONG ran onto the right-hand
// wooden rail, and the loop counter hung 92 px below the row, clean off the
// bottom of the plate and into the sky.
//
// Arithmetic is the right test for it. Every one of those controls rendered, was
// clickable, and passed every e2e assertion the deck has; the only thing wrong
// was WHERE, and nothing in the suite could see where. These tests fail on the
// numbers instead.

import { describe, expect, it } from "vitest";
import {
  HEADER_PLATE_FIELD,
  TRACK_HEADER,
  headerPlateField,
  headerRowCentres,
  trackHeaderSlots,
} from "../../src/game/scene-layout.ts";

const field = headerPlateField(TRACK_HEADER.plate);
const slots = trackHeaderSlots();
const plateTop = TRACK_HEADER.plate.y - TRACK_HEADER.plate.height / 2;
const plateBottom = TRACK_HEADER.plate.y + TRACK_HEADER.plate.height / 2;

describe("track header field", () => {
  it("resolves the measured parchment box for the plate as mounted", () => {
    // The numbers the layout was rebuilt around, pinned so a change to the
    // plate rect or the fractions has to restate them deliberately.
    expect(field.x0).toBeCloseTo(508.8, 1);
    expect(field.x1).toBeCloseTo(2028.2, 1);
    expect(field.y0).toBeCloseTo(59.9, 1);
    expect(field.y1).toBeCloseTo(346.8, 1);
  });

  it("is a strictly smaller box than the plate it belongs to", () => {
    expect(HEADER_PLATE_FIELD.x0).toBeGreaterThan(0);
    expect(HEADER_PLATE_FIELD.x1).toBeLessThan(1);
    expect(HEADER_PLATE_FIELD.y0).toBeGreaterThan(0);
    expect(HEADER_PLATE_FIELD.y1).toBeLessThan(1);
  });
});

describe("headerRowCentres", () => {
  it("runs the row flush from one end of the field to the other", () => {
    const widths = [100, 200, 100];
    const [a, , c] = headerRowCentres({ x0: 0, x1: 1000 }, widths);
    expect(a! - widths[0]! / 2).toBeCloseTo(0, 6);
    expect(c! + widths[2]! / 2).toBeCloseTo(1000, 6);
  });

  it("leaves equal gaps between neighbours", () => {
    const widths = [100, 200, 60, 140];
    const xs = headerRowCentres({ x0: 0, x1: 1000 }, widths);
    const gaps = xs.slice(1).map((x, i) => (x - widths[i + 1]! / 2) - (xs[i]! + widths[i]! / 2));
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 6);
  });

  it("reports a row that does not fit as overlap rather than clamping it", () => {
    // Silently squeezing an over-wide row back inside would hide exactly the
    // condition the containment tests below exist to catch.
    const xs = headerRowCentres({ x0: 0, x1: 100 }, [80, 80]);
    expect(xs[1]! - xs[0]!).toBeLessThan(80);
  });
});

describe("every header control lands on the plate", () => {
  const ids = TRACK_HEADER.rows.flatMap((r) => r.slots.map((s) => s.id));

  it("covers every slot the scene binds", () => {
    expect(ids.sort()).toEqual(
      ["clear", "fast", "loop", "map", "ride", "send", "slow", "stop", "tarp", "tempo"],
    );
  });

  // There is deliberately NO "each control is inside the field horizontally"
  // assertion. The solver places every row flush from x0 to x1, so such a test
  // passes by construction whatever the field is — it would restate the
  // definition rather than check it, and it duly went green when the field was
  // seeded back to the wrong numbers. The honest horizontal check is that a row
  // FITS: an over-subscribed row is exactly what negative gaps mean, and that is
  // the overlap test below.

  // Vertically the rule is the PLATE, not the parchment: a keycap standing proud
  // of the top or bottom rail reads as hardware mounted on the plate, and
  // shrinking every control to clear a 287 px field would cost a four-year-old a
  // third of every touch target. Falling off the plate entirely — which the loop
  // counter did — is the thing that was actually wrong.
  it.each(ids)("%s sits inside the plate vertically", (id) => {
    const r = slots[id]!;
    expect(r.y - r.height / 2).toBeGreaterThanOrEqual(plateTop);
    expect(r.y + r.height / 2).toBeLessThanOrEqual(plateBottom);
  });

  it("gives the two rows the same left and right margin", () => {
    for (const row of TRACK_HEADER.rows) {
      const first = slots[row.slots[0]!.id]!;
      const last = slots[row.slots[row.slots.length - 1]!.id]!;
      expect(first.x - first.width / 2).toBeCloseTo(field.x0, 6);
      expect(last.x + last.width / 2).toBeCloseTo(field.x1, 6);
    }
  });

  it("never overlaps two controls in the same row", () => {
    for (const row of TRACK_HEADER.rows) {
      const rects = row.slots.map((s) => slots[s.id]!);
      for (let i = 1; i < rects.length; i++) {
        const gap = (rects[i]!.x - rects[i]!.width / 2) - (rects[i - 1]!.x + rects[i - 1]!.width / 2);
        expect(gap).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the rows clear of each other", () => {
    const [top, bottom] = TRACK_HEADER.rows;
    const lowest = Math.max(...top!.slots.map((s) => top!.cy + s.height / 2));
    const highest = Math.min(...bottom!.slots.map((s) => bottom!.cy - s.height / 2));
    expect(highest).toBeGreaterThan(lowest);
  });
});
