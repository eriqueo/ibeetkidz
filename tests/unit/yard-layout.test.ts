// Yard palette geometry.
//
// Every assertion here is a REGRESSION GUARD for a shipped bug. The Yard's
// palette overlapped itself for as long as it existed: `fitToken` scaled a car's
// 128 px atlas cell by WIDTH only, so `carH` sized the slot rect and was then
// never used to constrain the sprite. At the 2560×1440 reference that scaled the
// cell 2.2×, drew a 238 px-tall body on a 132.5 px siding pitch, and buried each
// car under the next one — which is also why only the LAST name label in each
// column was visible.
//
// Arithmetic is the right test for this. The bug was not "the numbers looked
// wrong on screen" (they looked plausible); it was that one axis of the fit was
// silently dropped, and no amount of eyeballing tells you that a NEW pair of
// tuning constants has quietly re-broken it. These tests fail on the numbers.

import { describe, expect, it } from "vitest";
import {
  paletteSlot,
  trainSlot,
  trainStep,
  trainIndexAtX,
  moveTrainOrder,
  carFitScale,
  namePlateBox,
  PALETTE_DIR,
  TALLEST_CAR_BODY,
  type SlotRect,
} from "../../src/game/yard-geometry.ts";
import { YARD_SIDINGS_V2, YARD_LAYOUT_V2 } from "../../src/game/scene-layout.ts";
import { CAR_CONTENT_E, FRAME_SIZE } from "../../src/game/car-geometry.ts";
import { MAX_CARS } from "../../src/core/types.ts";

/** The reference canvas every fraction in `scene-layout.ts` is authored against. */
const REF: SlotRect = { x: 0, y: 0, width: 2560, height: 1440 };
/** A small 16:9 canvas — the fractions are ratios, so both must hold. */
const SMALL: SlotRect = { x: 0, y: 0, width: 1280, height: 720 };

/** Opaque height of a car body once fitted into `slot`, in screen px. */
const bodyHeight = (slot: { w: number; h: number }, type: keyof typeof CAR_CONTENT_E): number => {
  const [, y0, , y1] = CAR_CONTENT_E[type];
  return (y1 - y0) * FRAME_SIZE * carFitScale(slot);
};

describe("carFitScale — the axis that was missing", () => {
  it("fits the cell to the SMALLER of the two axes", () => {
    expect(carFitScale({ w: 200, h: 64 }, 128)).toBe(0.5); // height binds
    expect(carFitScale({ w: 64, h: 200 }, 128)).toBe(0.5); // width binds
  });

  it("would have been 2.2× under the width-only fit, and is not", () => {
    const slot = paletteSlot(REF, 0);
    // The shipped bug, spelled out: `slot.w / FRAME_SIZE` alone.
    expect(slot.w / FRAME_SIZE).toBeGreaterThan(1);
    expect(carFitScale(slot)).toBeLessThan(1);
    expect(carFitScale(slot)).toBe(slot.h / FRAME_SIZE);
  });
});

describe("a car and its name chip fit inside one siding pitch", () => {
  // THE invariant. Body + gap + chip must clear `dy`, or cars occlude each
  // other and labels land under the next car's body — the original complaint.
  for (const rect of [REF, SMALL]) {
    it(`holds at ${rect.width}×${rect.height} for every car type, on EVERY siding pair`, () => {
      // The sidings recede, so the pitch is not constant (0.0937 / 0.0903 /
      // 0.0875 of image height). Checking only the first pair would pass on the
      // widest gap while the bottom pair overlapped — so every consecutive pair
      // is checked, and the binding one is the tightest.
      for (let row = 0; row + 1 < YARD_SIDINGS_V2.rows; row += 1) {
        const slot = paletteSlot(rect, row);
        const next = paletteSlot(rect, row + 1);
        const railY = YARD_SIDINGS_V2.railY;
        expect(next.cy - slot.cy).toBeCloseTo(
          rect.height * (railY[row + 1]! - railY[row]!),
          6,
        );

        const chip = namePlateBox(rect, slot, rect.width * YARD_SIDINGS_V2.dx);
        const chipBottom = chip.cy + chip.h / 2;

        for (const type of Object.keys(CAR_CONTENT_E) as (keyof typeof CAR_CONTENT_E)[]) {
          if (type === "loco") continue; // the loco is never in the palette
          // Wheels sit on the rail (slot.cy); the body grows upward from there.
          const bodyTopOfNextCar = next.cy - bodyHeight(next, type);
          expect(chipBottom, `row ${row} → ${row + 1}, ${type}`).toBeLessThan(bodyTopOfNextCar);
        }
      }
    });
  }

  it("stands each car on the NEAR railhead of its own siding", () => {
    // The regression this replaces: `y0 + row * dy` put every car on the FAR
    // rail of its pair (or between the two), floating 7-16 px above the rail
    // its wheels are drawn to touch. These are the measured near railheads.
    expect(YARD_SIDINGS_V2.railY).toEqual([0.5278, 0.6215, 0.7118, 0.7993]);
    for (let row = 0; row < YARD_SIDINGS_V2.rows; row += 1) {
      expect(paletteSlot(REF, row).cy).toBeCloseTo(REF.height * YARD_SIDINGS_V2.railY[row]!, 6);
    }
  });

  it("has a receding pitch that no single spacing constant could express", () => {
    // The REASON railY is a table and not `y0 + row * dy`, asserted rather than
    // left in prose: if these three gaps were ever equal, the table would be
    // redundant and someone would be right to collapse it.
    const railY = YARD_SIDINGS_V2.railY;
    const gaps = [railY[1]! - railY[0]!, railY[2]! - railY[1]!, railY[3]! - railY[2]!];
    expect(gaps[0]).toBeGreaterThan(gaps[1]!);
    expect(gaps[1]).toBeGreaterThan(gaps[2]!);
  });

  it("leaves the tallest body clear of the siding above it", () => {
    const slot = paletteSlot(REF, 1);
    const above = paletteSlot(REF, 0);
    const tallest = TALLEST_CAR_BODY * carFitScale(slot);
    expect(slot.cy - tallest).toBeGreaterThan(above.cy);
  });
});

describe("paletteSlot — every car, 4 sidings, no collisions", () => {
  it("fills the sidings top to bottom, then wraps to the next column", () => {
    const rows = YARD_SIDINGS_V2.rows;
    // NOT `MAX_CARS % rows === 0`. That held while the cap was 12 and read as a
    // requirement, but it never was one: the cap is set by the PALETTE (ten
    // distinct car colours, `CAR_COLORS`), and a partly-filled last column is a
    // yard with room left in it, not a broken layout. What has to hold is the
    // wrap itself, and the no-overlap property the next test proves.
    const first = paletteSlot(REF, 0);
    expect(paletteSlot(REF, rows).cy).toBeCloseTo(first.cy, 6); // wrapped
    expect(paletteSlot(REF, rows).cx).toBeGreaterThan(first.cx);
  });

  it("keeps every pair of the MAX_CARS slots apart on at least one axis", () => {
    const slots = Array.from({ length: MAX_CARS }, (_, i) => paletteSlot(REF, i));
    const bw = (CAR_CONTENT_E.boxcar[2] - CAR_CONTENT_E.boxcar[0]) * FRAME_SIZE;
    for (let a = 0; a < slots.length; a += 1) {
      for (let b = a + 1; b < slots.length; b += 1) {
        const A = slots[a]!;
        const B = slots[b]!;
        const w = bw * carFitScale(A);
        const dx = Math.abs(A.cx - B.cx);
        const dy = Math.abs(A.cy - B.cy);
        const bodiesOverlapX = dx < w;
        const sameSiding = dy < 1;
        expect(bodiesOverlapX && sameSiding).toBe(false);
      }
    }
  });

  it("starts clear of the buffer stops at the left end of the rails", () => {
    // The painted sidings begin around 0.10 of image width; a car centred left
    // of that would sit on the buffer stops rather than on its rail.
    const first = paletteSlot(REF, 0);
    expect(first.cx / REF.width).toBeGreaterThan(0.1);
  });
});

describe("assembly line", () => {
  it("packs tighter as the train grows, so slots stay on the painted track", () => {
    const a = YARD_LAYOUT_V2.assemblyLine;
    const last = trainSlot(REF, MAX_CARS - 1, MAX_CARS);
    expect(last.cx).toBeLessThan(REF.width * (a.x + a.w));
    expect(trainStep(REF, MAX_CARS)).toBeLessThanOrEqual(trainStep(REF, 1));
  });

  it("gives each car a name chip no wider than the gap to the next car", () => {
    const step = trainStep(REF, MAX_CARS);
    const chip = namePlateBox(REF, trainSlot(REF, 0, MAX_CARS), step);
    expect(chip.maxW).toBeLessThanOrEqual(step);
    expect(chip.w).toBeLessThanOrEqual(chip.maxW);
  });
});

describe("drag-to-reorder on the assembly line", () => {
  it("maps a drop x back to the slot it landed on", () => {
    const count = 5;
    for (let i = 0; i < count; i += 1) {
      const slot = trainSlot(REF, i, count);
      expect(trainIndexAtX(REF, slot.cx, count)).toBe(i);
    }
  });

  it("clamps a drag off either end to first/last instead of out of the train", () => {
    // A kid dragging enthusiastically past the buffers must still get a valid
    // slot — dropping "outside" the train is not a state the reducer can hold.
    expect(trainIndexAtX(REF, -99999, 5)).toBe(0);
    expect(trainIndexAtX(REF, 99999, 5)).toBe(4);
    expect(trainIndexAtX(REF, 12345, 1)).toBe(0); // a one-car train has one slot
  });

  it("snaps to the NEAREST slot, not the one it passed", () => {
    const count = 4;
    const a = trainSlot(REF, 1, count);
    const b = trainSlot(REF, 2, count);
    expect(trainIndexAtX(REF, a.cx + (b.cx - a.cx) * 0.4, count)).toBe(1);
    expect(trainIndexAtX(REF, a.cx + (b.cx - a.cx) * 0.6, count)).toBe(2);
  });

  it("MOVES a car through the order rather than swapping two", () => {
    // The bug a swap would ship: dragging the first car to the end would fling
    // the last car to the front, which is not what the kid dragged.
    expect(moveTrainOrder(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(moveTrainOrder(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveTrainOrder(["a", "b", "c", "d"], 1, 2)).toEqual(["a", "c", "b", "d"]);
  });

  it("is a no-op for a drag that lands where it started, and never loses a car", () => {
    const ids = ["a", "b", "c", "d"];
    expect(moveTrainOrder(ids, 2, 2)).toEqual(ids);
    // Whatever the indices, every car survives exactly once — a reorder that
    // drops or duplicates an instanceId would corrupt the train.
    for (let from = 0; from < ids.length; from += 1) {
      for (let to = 0; to < ids.length; to += 1) {
        expect([...moveTrainOrder(ids, from, to)].sort()).toEqual([...ids].sort());
      }
    }
  });
});

describe("palette orientation", () => {
  it("faces cars along the rails, not across them", () => {
    expect(PALETTE_DIR).toBe("E");
  });

  it("…because the E frame is the one that is wider than it is tall", () => {
    // This is the REASON for the line above, asserted rather than asserted-in-
    // prose: the sidings run east–west, so the car whose silhouette is wide is
    // the one that lies along a rail.
    const [x0, y0, x1, y1] = CAR_CONTENT_E.boxcar;
    expect(x1 - x0).toBeGreaterThan(y1 - y0);
  });
});
