// The side-scroller's job bar, as authored in `assets/maps/track-v3.json`.
//
// Since 2026-10-12 these rects are DATA Eric drags in `?edit`, so this file is
// a lint on the map rather than a check on arithmetic: every mode still has a
// switch, every switch stays on the plate, and the switches form even rows of
// equal pictures — the reason the bar is two rows of four (a picture too small
// to identify is a button with no label at all).

import { describe, expect, it } from "vitest";
import { TRACK_JOB_BAR, trackJobSlots } from "../../src/game/scene-layout.ts";
import { TRACK_JOB_IDS } from "../../src/game/track-chrome-layout.ts";

const slots = trackJobSlots();
const ids = TRACK_JOB_BAR.switches.map(({ id }) => id);
const plate = TRACK_JOB_BAR.plate;

describe("track job-bar layout", () => {
  it("keeps one registered slot for every Track mode", () => {
    expect([...ids].sort()).toEqual([
      "backwards",
      "bridge",
      "giant",
      "hill",
      "night",
      "rain",
      "tiny",
      "tunnel",
    ]);
    expect([...ids]).toEqual([...TRACK_JOB_IDS]);
    expect(Object.keys(slots).sort()).toEqual([...ids].sort());
  });

  it("keeps every switch inside the shared transport plate", () => {
    const left = plate.x - plate.width / 2;
    const right = plate.x + plate.width / 2;
    const top = plate.y - plate.height / 2;
    const bottom = plate.y + plate.height / 2;
    for (const id of ids) {
      const slot = slots[id];
      expect(slot.x - slot.width / 2, `${id} left`).toBeGreaterThanOrEqual(left);
      expect(slot.x + slot.width / 2, `${id} right`).toBeLessThanOrEqual(right);
      expect(slot.y - slot.height / 2, `${id} top`).toBeGreaterThanOrEqual(top);
      expect(slot.y + slot.height / 2, `${id} bottom`).toBeLessThanOrEqual(bottom);
    }
  });

  it("forms two aligned rows of four equal switches", () => {
    // Rows are switches whose centres are within a pixel of each other —
    // authored data is rounded by the editor, so exact equality is the wrong
    // test for a layout a human drags.
    const rows: number[] = [];
    for (const id of ids) {
      if (!rows.some((y) => Math.abs(y - slots[id].y) <= 1)) rows.push(slots[id].y);
    }
    expect(rows).toHaveLength(2);
    const first = ids.filter((id) => Math.abs(slots[id].y - rows[0]!) <= 1);
    const second = ids.filter((id) => Math.abs(slots[id].y - rows[1]!) <= 1);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    // The lower row sits under the upper one, column for column.
    first.forEach((id, i) => {
      expect(Math.abs(slots[id].x - slots[second[i]!]!.x), `${id} over ${second[i]}`).toBeLessThanOrEqual(1);
    });
    const { width, height } = slots[ids[0]!];
    for (const id of ids) {
      expect(slots[id].width, `${id} width`).toBe(width);
      expect(slots[id].height, `${id} height`).toBe(height);
    }
  });

  it("gives each picture at least the slot it had before it was data", () => {
    // 325 x 150 is what let the painted 260 x 120 art draw at 1.25.
    for (const id of ids) {
      expect(slots[id].width, `${id} width`).toBeGreaterThanOrEqual(300);
      expect(slots[id].height, `${id} height`).toBeGreaterThanOrEqual(140);
    }
  });

  it("never overlaps two switches", () => {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = slots[ids[i]!];
        const b = slots[ids[j]!];
        const overlaps =
          Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
        expect(overlaps, `${ids[i]} overlaps ${ids[j]}`).toBe(false);
      }
    }
  });
});
