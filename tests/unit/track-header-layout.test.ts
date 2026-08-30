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
  TRACK_VISUALIZER,
  headerColumnCentres,
  headerPlateField,
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
    expect(field.y0).toBeCloseTo(65.2, 1);
    expect(field.y1).toBeCloseTo(371.2, 1);
    // 306 px of usable height is the whole reason the controls are 134 tall.
    expect(field.y1 - field.y0).toBeCloseTo(306, 0);
  });

  it("is a strictly smaller box than the plate it belongs to", () => {
    expect(HEADER_PLATE_FIELD.x0).toBeGreaterThan(0);
    expect(HEADER_PLATE_FIELD.x1).toBeLessThan(1);
    expect(HEADER_PLATE_FIELD.y0).toBeGreaterThan(0);
    expect(HEADER_PLATE_FIELD.y1).toBeLessThan(1);
  });
});

describe("headerColumnCentres", () => {
  it("splits the field into equal columns and centres each", () => {
    const xs = headerColumnCentres({ x0: 0, x1: 1000 }, 5);
    expect(xs).toEqual([100, 300, 500, 700, 900]);
  });

  it("keeps the outer columns symmetric about the field", () => {
    const xs = headerColumnCentres({ x0: 200, x1: 800 }, 4);
    expect(xs[0]! - 200).toBeCloseTo(800 - xs[3]!, 6);
  });
});

describe("Track visualizer placement", () => {
  it("is the compact left-side signal box approved for the side-scroller", () => {
    expect(TRACK_VISUALIZER).toEqual({
      x: 420,
      y: 565,
      width: 340,
      height: 102,
    });
  });

  it("stays below the header and outside the central focus corridor", () => {
    const top = TRACK_VISUALIZER.y - TRACK_VISUALIZER.height / 2;
    const right = TRACK_VISUALIZER.x + TRACK_VISUALIZER.width / 2;
    expect(top).toBeGreaterThanOrEqual(plateBottom);
    expect(right).toBeLessThanOrEqual(640);
  });

  it("preserves the visualizer aspect while bounding its footprint", () => {
    expect(TRACK_VISUALIZER.width / TRACK_VISUALIZER.height).toBeCloseTo(320 / 96, 6);
    expect(TRACK_VISUALIZER.width).toBeLessThanOrEqual(340);
    expect(TRACK_VISUALIZER.height).toBeLessThanOrEqual(102);
  });
});

describe("every header control lands on the parchment", () => {
  const ids = TRACK_HEADER.rows.flatMap((r) => r.cells.map((c) => c.id));

  it("covers every cell the scene binds", () => {
    expect([...ids].sort()).toEqual(
      ["clear", "fast", "loop", "map", "ride", "send", "slow", "stop", "tarp", "tempo"],
    );
  });

  // BOTH axes now. An earlier pass checked only the plate vertically, on the
  // theory that a keycap standing proud of the top or bottom rail read as
  // mounted hardware. It did not: on the live site the row hung visibly off the
  // bottom rail, worst on TARP, whose `pad-key` art fills its cell edge to edge
  // where the stone keycaps contain-fit narrower. The rule is the parchment.
  it.each(ids)("%s sits inside the parchment on both axes", (id) => {
    const r = slots[id]!;
    expect(r.x - r.width / 2).toBeGreaterThanOrEqual(field.x0);
    expect(r.x + r.width / 2).toBeLessThanOrEqual(field.x1);
    expect(r.y - r.height / 2).toBeGreaterThanOrEqual(field.y0);
    expect(r.y + r.height / 2).toBeLessThanOrEqual(field.y1);
  });

  it("stays on the plate, which the parchment is inside of", () => {
    for (const id of ids) {
      const r = slots[id]!;
      expect(r.y - r.height / 2).toBeGreaterThanOrEqual(plateTop);
      expect(r.y + r.height / 2).toBeLessThanOrEqual(plateBottom);
    }
  });

  // THE grid assertion: a cell in column i of row 1 shares its centre with the
  // cell in column i of row 2. This is what the deck was missing — the two rows
  // were each spread flush end-to-end with equal gaps, which lines nothing up
  // when one row holds four controls and the other holds six.
  it("hangs both rows off the same column centres", () => {
    const xs = headerColumnCentres(field, TRACK_HEADER.columns);
    for (const row of TRACK_HEADER.rows) {
      expect(row.cells.length).toBeLessThanOrEqual(TRACK_HEADER.columns);
      row.cells.forEach((c, i) => expect(slots[c.id]!.x).toBeCloseTo(xs[i]!, 6));
    }
  });

  it("never overlaps two controls in the same row", () => {
    for (const row of TRACK_HEADER.rows) {
      const rects = row.cells.map((c) => slots[c.id]!);
      for (let i = 1; i < rects.length; i++) {
        const gap = (rects[i]!.x - rects[i]!.width / 2) - (rects[i - 1]!.x + rects[i - 1]!.width / 2);
        expect(gap).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the rows clear of each other", () => {
    const [top, bottom] = TRACK_HEADER.rows;
    const lowest = Math.max(...top!.cells.map((c) => top!.cy + c.height / 2));
    const highest = Math.min(...bottom!.cells.map((c) => bottom!.cy - c.height / 2));
    expect(highest).toBeGreaterThan(lowest);
  });
});
