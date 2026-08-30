import { describe, expect, it } from "vitest";
import { TRACK_JOB_BAR, trackJobSlots } from "../../src/game/scene-layout.ts";

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
    expect(Object.keys(slots).sort()).toEqual([...ids].sort());
  });

  it("keeps every switch inside the shared transport plate", () => {
    const left = plate.x - plate.width / 2;
    const right = plate.x + plate.width / 2;
    const top = plate.y - plate.height / 2;
    const bottom = plate.y + plate.height / 2;
    for (const id of ids) {
      const slot = slots[id];
      expect(slot.x - slot.width / 2).toBeGreaterThanOrEqual(left);
      expect(slot.x + slot.width / 2).toBeLessThanOrEqual(right);
      expect(slot.y - slot.height / 2).toBeGreaterThanOrEqual(top);
      expect(slot.y + slot.height / 2).toBeLessThanOrEqual(bottom);
    }
  });

  it("forms two aligned rows of four equal switches", () => {
    const rows = [...new Set(ids.map((id) => slots[id].y))];
    expect(rows).toHaveLength(2);
    for (const y of rows) {
      const row = ids.map((id) => slots[id]).filter((slot) => slot.y === y);
      expect(row).toHaveLength(TRACK_JOB_BAR.columns);
      expect(row.map((slot) => slot.x)).toEqual(
        ids.slice(0, TRACK_JOB_BAR.columns).map((id) => slots[id].x),
      );
      for (const slot of row) {
        expect(slot.width).toBe(TRACK_JOB_BAR.switch.width);
        expect(slot.height).toBe(TRACK_JOB_BAR.switch.height);
      }
    }
  });
});
