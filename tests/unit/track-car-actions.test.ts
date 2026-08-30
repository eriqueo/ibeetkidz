import { describe, expect, it } from "vitest";
import {
  TRACK_CAR_ACTION_LAYOUT,
  trackCarActionChoices,
  trackCarActionDisarmsTarp,
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
});
