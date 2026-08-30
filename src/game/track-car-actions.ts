/** The three explicit outcomes offered after tapping a Track car. The scene
 *  renders these labels today; future painted art can replace their faces
 *  without inventing a second action vocabulary. */
export type TrackCarActionKind = "edit" | "toggle-mute" | "close";

export interface TrackCarActionChoice {
  readonly kind: TrackCarActionKind;
  readonly objectName: string;
  readonly label: string;
}

/** Large enough to remain a deliberate target in the fixed 2560×1440 canvas.
 *  The whole app scales with Phaser FIT, so this follows the existing canvas
 *  interaction contract rather than introducing a DOM overlay. */
export const TRACK_CAR_ACTION_LAYOUT = {
  panelWidth: 1160,
  panelHeight: 330,
  panelY: 555,
  titleOffsetY: 72,
  buttonOffsetY: 150,
  buttonWidth: 320,
  buttonHeight: 110,
  buttonGap: 36,
} as const;

export interface TrackCarActionSlot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function trackCarActionChoices(muted: boolean): readonly TrackCarActionChoice[] {
  return [
    { kind: "edit", objectName: "track-car-action:edit", label: "EDIT CAR" },
    {
      kind: "toggle-mute",
      objectName: "track-car-action:tarp",
      label: muted ? "UNCOVER" : "TARP CAR",
    },
    { kind: "close", objectName: "track-car-action:close", label: "CLOSE" },
  ];
}

/** Fixed-HUD button rectangles, keyed by the same action vocabulary the scene
 *  emits. Production-shaped canvas tests use this producer too, so moving the
 *  chooser cannot silently strand its real kid-facing targets. */
export function trackCarActionSlots(
  designWidth: number,
): Record<TrackCarActionKind, TrackCarActionSlot> {
  const layout = TRACK_CAR_ACTION_LAYOUT;
  const choices = trackCarActionChoices(false);
  const rowWidth =
    choices.length * layout.buttonWidth + (choices.length - 1) * layout.buttonGap;
  const rowX = (designWidth - rowWidth) / 2;
  return Object.fromEntries(
    choices.map(({ kind }, index) => [
      kind,
      {
        x: rowX + index * (layout.buttonWidth + layout.buttonGap) + layout.buttonWidth / 2,
        y: layout.panelY + layout.buttonOffsetY + layout.buttonHeight / 2,
        width: layout.buttonWidth,
        height: layout.buttonHeight,
      },
    ]),
  ) as Record<TrackCarActionKind, TrackCarActionSlot>;
}

/** The header TARP key is an arming latch: confirmation consumes that arm.
 *  Closing the chooser or editing the car does not consume the kid's pending
 *  tarp intent. */
export function trackCarActionDisarmsTarp(kind: TrackCarActionKind): boolean {
  return kind === "toggle-mute";
}
