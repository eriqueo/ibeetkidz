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

/** Side margin of the chooser panel around its row of buttons. */
const PANEL_SIDE = 64;

/** The car chooser's panel and its `count` buttons, centred in the design
 *  width — for the Track's three choices and the Yard's three or four alike
 *  (`car-chooser.ts` draws it). Three buttons give exactly the original
 *  1160-wide panel; more widen it. */
export function carChooserLayout(count: number, designWidth: number): {
  readonly panelX: number;
  readonly panelWidth: number;
  readonly slots: readonly TrackCarActionSlot[];
} {
  const L = TRACK_CAR_ACTION_LAYOUT;
  const n = Math.max(1, count);
  const rowWidth = n * L.buttonWidth + (n - 1) * L.buttonGap;
  const panelWidth = Math.max(L.panelWidth, rowWidth + PANEL_SIDE * 2);
  const rowX = (designWidth - rowWidth) / 2;
  const slots = Array.from({ length: n }, (_, i) => ({
    x: rowX + i * (L.buttonWidth + L.buttonGap) + L.buttonWidth / 2,
    y: L.panelY + L.buttonOffsetY + L.buttonHeight / 2,
    width: L.buttonWidth,
    height: L.buttonHeight,
  }));
  return { panelX: (designWidth - panelWidth) / 2, panelWidth, slots };
}

/** Fixed-HUD button rectangles, keyed by the same action vocabulary the scene
 *  emits. Production-shaped canvas tests use this producer too, so moving the
 *  chooser cannot silently strand its real kid-facing targets. */
export function trackCarActionSlots(
  designWidth: number,
): Record<TrackCarActionKind, TrackCarActionSlot> {
  const choices = trackCarActionChoices(false);
  const { slots } = carChooserLayout(choices.length, designWidth);
  return Object.fromEntries(
    choices.map(({ kind }, index) => [kind, slots[index]!]),
  ) as Record<TrackCarActionKind, TrackCarActionSlot>;
}
