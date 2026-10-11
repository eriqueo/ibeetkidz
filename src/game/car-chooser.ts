// The "CAR n — WHAT NEXT?" pop-up a Track car tap opens (EDIT CAR / TARP CAR /
// CLOSE). The scene hands it its choices.
import Phaser from "phaser";
import { GAME_DESIGN_SIZE } from "./game-dimensions.ts";
import { PanelButton, FONT, INK, PANEL_BG, PANEL_EDGE } from "./tool-panels.ts";
import { TRACK_CAR_ACTION_LAYOUT, carChooserLayout } from "./track-car-actions.ts";

export interface CarChooserChoice {
  /** Scene-graph name, the e2e handle (`track-car-action:tarp`, …). */
  readonly objectName: string;
  readonly label: string;
  readonly choose: () => void;
}

/**
 * Open the pop-up over a dimmed world. Tapping the dim is the forgiving way
 * out, like the Workshop's sequencer pop-up. Every choice closes the pop-up
 * before it acts. Returns the close function.
 */
export function openCarChooser(
  scene: Phaser.Scene,
  title: string,
  choices: readonly CarChooserChoice[],
  depth: number,
): () => void {
  const W = GAME_DESIGN_SIZE.width;
  const H = GAME_DESIGN_SIZE.height;
  const L = TRACK_CAR_ACTION_LAYOUT;
  const { panelX, panelWidth, slots } = carChooserLayout(choices.length, W);
  const drop = 10;
  const root = scene.add.container(0, 0).setDepth(depth);
  let open = true;
  const close = (): void => {
    if (!open) return;
    open = false;
    root.destroy(true);
  };
  const backdrop = scene.add.rectangle(0, 0, W, H, 0x000000, 0.48).setOrigin(0).setInteractive();
  // Armed: only a press that STARTED on the dim closes it. A car that opens
  // this on pointerdown would otherwise have its own finger-lift land here and
  // close the pop-up the instant it appeared (the Yard's sidings do).
  let armed = false;
  backdrop.on("pointerdown", () => { armed = true; });
  backdrop.on("pointerout", () => { armed = false; });
  backdrop.on("pointerup", () => { if (armed) close(); });
  const shadow = scene.add
    .rectangle(panelX + drop, L.panelY + drop, panelWidth, L.panelHeight, PANEL_EDGE, 0.55)
    .setOrigin(0);
  const frame = scene.add
    .rectangle(panelX, L.panelY, panelWidth, L.panelHeight, PANEL_BG, 1)
    .setStrokeStyle(6, PANEL_EDGE)
    .setOrigin(0);
  const heading = scene.add
    .text(W / 2, L.panelY + L.titleOffsetY, title, { fontFamily: FONT, color: INK, align: "center" })
    .setOrigin(0.5)
    .setFontSize(28);
  root.add([backdrop, shadow, frame, heading]);
  choices.forEach((choice, i) => {
    const slot = slots[i]!;
    const button = new PanelButton(scene, choice.label, () => {
      close();
      choice.choose();
    });
    button.container.setName(choice.objectName);
    button.place(
      { x: slot.x - slot.width / 2, y: slot.y - slot.height / 2, w: slot.width, h: slot.height },
      24,
    );
    root.add(button.container);
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, close);
  return close;
}
