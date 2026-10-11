// The side-scroller's header deck: does every control actually land on the
// plate's parchment?
//
// This is a REGRESSION GUARD for a shipped bug that only a human eye caught.
// `TrackV3Scene.buildTopBar` placed nine controls by arithmetic against a field
// it had GUESSED as "~400..2064" and documented as such in a comment. Measured
// off the packed `panel-header-v2` frame, the parchment was really 509..2028 —
// so SLOW stood on the left gear medallion, SEND SONG ran onto the right-hand
// wooden rail, and the loop counter hung 92 px below the row, clean off the
// bottom of the plate and into the sky.
//
// Arithmetic is the right test for it. Every one of those controls rendered, was
// clickable, and passed every e2e assertion the deck has; the only thing wrong
// was WHERE, and nothing in the suite could see where. These tests fail on the
// numbers instead.
//
// Since 2026-10-05 the header is one row of four (MAP · RIDE/STOP · SPEED ·
// SEND) on a SLICED plate: its ends keep their drawn shape and its middle
// repeats, so the field's side margins are fixed pixels.

import { describe, expect, it } from "vitest";
import {
  HEADER_PLATE_FIELD,
  HEADER_PLATE_SLICE,
  TRACK_HEADER,
  headerColumnCentres,
  slicedHeaderField,
  trackHeaderSlots,
  trackSpeedSlider,
} from "../../src/game/scene-layout.ts";
import * as sceneLayout from "../../src/game/scene-layout.ts";
import { SPEED_STEP } from "../../src/game/speed-slider.ts";

const field = slicedHeaderField(TRACK_HEADER.plate);
const slots = trackHeaderSlots();
const plateTop = TRACK_HEADER.plate.y - TRACK_HEADER.plate.height / 2;
const plateBottom = TRACK_HEADER.plate.y + TRACK_HEADER.plate.height / 2;

describe("track header field", () => {
  it("resolves the parchment of the sliced plate as mounted", () => {
    // Uniform scale 340/687 on the ends: the margins are the measured
    // fractions of the ART's width, not of the plate's.
    // The plate is 2156 wide: its two ends plus exactly two middle repeats.
    expect(TRACK_HEADER.plate.width).toBe(2156);
    expect(field.x0).toBeCloseTo(348.9, 1);
    expect(field.x1).toBeCloseTo(2195.6, 1);
    expect(field.y0).toBeCloseTo(40.4, 1);
    expect(field.y1).toBeCloseTo(257.1, 1);
  });

  it("is a strictly smaller box than the plate it belongs to", () => {
    expect(HEADER_PLATE_FIELD.x0).toBeGreaterThan(0);
    expect(HEADER_PLATE_FIELD.x1).toBeLessThan(1);
    expect(HEADER_PLATE_FIELD.y0).toBeGreaterThan(0);
    expect(HEADER_PLATE_FIELD.y1).toBeLessThan(1);
  });

  it("is less than a quarter of the screen tall, down from a third", () => {
    // Eric, 2026-10-05: "make the header not so tall, its huge". It ended at 460.
    expect(plateBottom).toBeLessThanOrEqual(1440 / 4);
  });
});

describe("the sliced plate", () => {
  it("cuts inside the parchment's side margins, so the ends carry the frame", () => {
    expect(HEADER_PLATE_SLICE.left).toBeGreaterThan(HEADER_PLATE_FIELD.x0);
    expect(HEADER_PLATE_SLICE.right).toBeLessThan(HEADER_PLATE_FIELD.x1);
  });

  it("repeats a whole number of rivet pitches, so the rivet row continues", () => {
    const pitch = 139.2;
    const middle = (HEADER_PLATE_SLICE.right - HEADER_PLATE_SLICE.left) * HEADER_PLATE_SLICE.texW;
    expect(middle / pitch).toBeCloseTo(12, 1);
  });
});

describe("headerColumnCentres", () => {
  it("splits the field into equal columns and centres each", () => {
    const xs = headerColumnCentres({ x0: 0, x1: 1000 }, 5);
    expect(xs).toEqual([100, 300, 500, 700, 900]);
  });
});

describe("Track toolbar toggles", () => {
  it("gives each deck its own reachable edge key", () => {
    expect((sceneLayout as Record<string, unknown>).TRACK_TOOLBAR_TOGGLES).toEqual({
      header: { x: 2440, y: 150, width: 120, height: 100 },
      jobs: { x: 2440, y: 1275, width: 120, height: 100 },
    });
  });

  it("keeps the header's key clear of the plate", () => {
    const key = sceneLayout.TRACK_TOOLBAR_TOGGLES.header;
    const plateRight = TRACK_HEADER.plate.x + TRACK_HEADER.plate.width / 2;
    expect(key.x - key.width / 2).toBeGreaterThan(plateRight);
  });
});

describe("every header control lands on the parchment", () => {
  const ids = TRACK_HEADER.order;

  it("is MAP, SPEED, RIDE/STOP and SEND, in that order", () => {
    expect([...ids]).toEqual(["map", "speed", "ride", "send"]);
    expect(Object.keys(slots).sort()).toEqual([...ids].sort());
    const xs = ids.map((id) => slots[id]!.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("puts RIDE/STOP in the middle, as the biggest key", () => {
    // Eric, 2026-10-05: "the ride/stop button should be the biggest/most central".
    expect(slots["ride"]!.x).toBeCloseTo((field.x0 + field.x1) / 2, 6);
    for (const id of ["map", "send"]) {
      expect(slots["ride"]!.height).toBeGreaterThan(slots[id]!.height);
    }
  });

  it("keeps MAP at the left end and SEND at the right", () => {
    expect(slots["map"]!.x - field.x0).toBeCloseTo(field.x1 - slots["send"]!.x, 6);
  });

  it.each(ids)("%s sits inside the parchment on both axes", (id) => {
    const r = slots[id]!;
    expect(r.x - r.width / 2).toBeGreaterThanOrEqual(field.x0);
    expect(r.x + r.width / 2).toBeLessThanOrEqual(field.x1 + 1e-6);
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

  it("makes every key bigger than the two-row deck's 134", () => {
    for (const id of ids) expect(slots[id]!.height).toBeGreaterThan(134);
  });

  it("never overlaps two controls", () => {
    const rects = ids.map((id) => slots[id]!);
    for (let i = 1; i < rects.length; i++) {
      const gap = (rects[i]!.x - rects[i]!.width / 2) - (rects[i - 1]!.x + rects[i - 1]!.width / 2);
      expect(gap).toBeGreaterThan(0);
    }
  });

  it("divides the speed cell into a readout and a rail that stay inside it", () => {
    const cell = slots["speed"]!;
    const { readout, rail, hit } = trackSpeedSlider();
    const left = cell.x - cell.width / 2;
    const right = cell.x + cell.width / 2;
    expect(readout.x - readout.width / 2).toBeCloseTo(left, 6);
    // The rail starts clear of the readout and leaves room for half a handle.
    expect(rail.x0).toBeGreaterThan(readout.x + readout.width / 2);
    expect(rail.x1).toBeLessThan(right);
    expect(hit.x - hit.width / 2).toBeGreaterThanOrEqual(readout.x + readout.width / 2);
    expect(hit.x + hit.width / 2).toBeLessThanOrEqual(right + 1e-6);
    // Long enough that one step of speed is a deliberate finger movement…
    expect((rail.x1 - rail.x0) / ((220 - 40) / SPEED_STEP)).toBeGreaterThan(12);
    // …and short: "make the slider smaller, not as wide" (Eric, 2026-10-05).
    expect(rail.x1 - rail.x0).toBeLessThan((field.x1 - field.x0) / 5);
  });
});
