// Shared press feedback for SELF-DRAWN interactive objects (icon labels, the
// car-type sprites, tool-panel buttons): on pointerdown dip to 92% scale and
// nudge down 2px (a physical "press"), restore on release. The rest state is
// captured at press time so this composes with selection scaling and relayout.
//
// NOTE: this is for objects that draw their own pixels. TRANSPARENT hit-areas
// over painted art (WorkshopScene.makeButton) have nothing to scale, so they use
// a brief fill-flash for feedback instead.
import Phaser from "phaser";

type PressTarget = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

export function pressPop(obj: PressTarget): void {
  let baseY = 0;
  let baseScale = 1;
  obj.on("pointerdown", () => {
    baseY = obj.y;
    baseScale = obj.scaleX;
    obj.setScale(baseScale * 0.92);
    obj.setY(baseY + 2);
  });
  const restore = (): void => {
    obj.setScale(baseScale);
    obj.setY(baseY);
  };
  obj.on("pointerup", restore);
  obj.on("pointerout", restore);
}
