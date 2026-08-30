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
  buttonWidth: 320,
  buttonHeight: 110,
  buttonGap: 36,
} as const;

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

/** The header TARP key is an arming latch: confirmation consumes that arm.
 *  Closing the chooser or editing the car does not consume the kid's pending
 *  tarp intent. */
export function trackCarActionDisarmsTarp(kind: TrackCarActionKind): boolean {
  return kind === "toggle-mute";
}
