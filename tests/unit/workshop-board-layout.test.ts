import { describe, expect, it } from "vitest";
import { workshopBoardActionSlots } from "../../src/game/workshop-board-layout.ts";

const layout = workshopBoardActionSlots({
  centerX: 1280,
  centerY: 590,
  width: 1720,
  height: 864,
});

describe("Workshop board action layout", () => {
  it("places SOUNDS and DONE as one aligned pair below the board", () => {
    expect(layout.sounds.y).toBe(layout.done.y);
    expect(layout.sounds.x).toBeLessThan(1280);
    expect(layout.done.x).toBeGreaterThan(1280);
    expect(layout.sounds.faceWidth).toBe(layout.done.faceWidth);
    expect(layout.sounds.faceHeight).toBe(layout.done.faceHeight);
  });

  it("keeps both child-sized hit targets clear of each other and the board", () => {
    const boardBottom = 590 + 864 / 2;
    const soundsRight = layout.sounds.x + layout.sounds.hitWidth / 2;
    const doneLeft = layout.done.x - layout.done.hitWidth / 2;

    expect(layout.sounds.y - layout.sounds.hitHeight / 2).toBeGreaterThan(boardBottom);
    expect(layout.done.y - layout.done.hitHeight / 2).toBeGreaterThan(boardBottom);
    expect(soundsRight).toBeLessThan(doneLeft);
    expect(layout.sounds.hitWidth).toBeGreaterThanOrEqual(180);
    expect(layout.sounds.hitHeight).toBeGreaterThanOrEqual(64);
  });

  it("keeps both hit targets inside the board's horizontal span", () => {
    const left = 1280 - 1720 / 2;
    const right = 1280 + 1720 / 2;
    for (const slot of [layout.sounds, layout.done]) {
      expect(slot.x - slot.hitWidth / 2).toBeGreaterThanOrEqual(left);
      expect(slot.x + slot.hitWidth / 2).toBeLessThanOrEqual(right);
    }
  });
});
