import { describe, expect, it } from "vitest";
import {
  TRACK_CAR_ACTION_LAYOUT,
  trackCarActionChoices,
  trackCarActionDisarmsTarp,
  trackCarActionSlots,
} from "../../src/game/track-car-actions.ts";

describe("Track car action choices", () => {
  it("offers edit, tarp, and close without changing the action vocabulary", () => {
    expect(trackCarActionChoices(false)).toEqual([
      { kind: "edit", objectName: "track-car-action:edit", label: "EDIT CAR" },
      { kind: "toggle-mute", objectName: "track-car-action:tarp", label: "TARP CAR" },
      { kind: "close", objectName: "track-car-action:close", label: "CLOSE" },
    ]);
    expect(trackCarActionChoices(true)[1]?.label).toBe("UNCOVER");
  });

  it("keeps every choice at the scene's large touch-control scale", () => {
    expect(TRACK_CAR_ACTION_LAYOUT.buttonWidth).toBeGreaterThanOrEqual(300);
    expect(TRACK_CAR_ACTION_LAYOUT.buttonHeight).toBeGreaterThanOrEqual(100);
    expect(
      TRACK_CAR_ACTION_LAYOUT.buttonWidth * 3 + TRACK_CAR_ACTION_LAYOUT.buttonGap * 2,
    ).toBeLessThanOrEqual(TRACK_CAR_ACTION_LAYOUT.panelWidth);
  });

  it("consumes an armed tarp only when tarp or uncover is confirmed", () => {
    expect(trackCarActionDisarmsTarp("toggle-mute")).toBe(true);
    expect(trackCarActionDisarmsTarp("close")).toBe(false);
    expect(trackCarActionDisarmsTarp("edit")).toBe(false);
  });

  it("lays out three equal, centered, non-overlapping action targets", () => {
    const slots = trackCarActionSlots(2560);
    expect(Object.keys(slots).sort()).toEqual(["close", "edit", "toggle-mute"]);
    expect(slots.edit.x + slots.close.x).toBe(2560);
    expect(slots.edit.y).toBe(slots["toggle-mute"].y);
    expect(slots.close.y).toBe(slots["toggle-mute"].y);
    expect(slots["toggle-mute"].x - slots.edit.x).toBe(
      TRACK_CAR_ACTION_LAYOUT.buttonWidth + TRACK_CAR_ACTION_LAYOUT.buttonGap,
    );
    for (const slot of Object.values(slots)) {
      expect(slot.width).toBe(TRACK_CAR_ACTION_LAYOUT.buttonWidth);
      expect(slot.height).toBe(TRACK_CAR_ACTION_LAYOUT.buttonHeight);
    }
  });
});
