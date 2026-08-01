// "Oops — put it back." The undo affordance, as a transient in-scene chip.
//
// Why a chip and not a button in the bar: the Workshop and Yard chrome bars are
// authored art and are FULL — every keycap slot on both is taken, and finding
// room means re-cutting Eric's layout. An offer that appears when something is
// destroyed and leaves on its own needs no permanent space, and for a
// five-year-old it beats a button they have to know about before they need it.
//
// Drawn with Graphics in the scene's established chip language (cream face, plum
// edge, Press Start 2P) — the same treatment `TrackScene` gives the SPEED LCD
// and the SEND plaque, so it needs no art. Camera-anchored rather than
// Tiled-placed on purpose: it is not part of any scene's painted chrome, it has
// to sit above whatever is underneath it, and one placement rule for all scenes
// means it cannot drift between them.
import Phaser from "phaser";
import { EventBus } from "./EventBus.ts";

const FACE = 0xe9d7ac;
const EDGE = 0x2b2440;
/** How long the offer stands before it withdraws, ms. Long enough for a kid to
 *  notice, register and reach — short enough that it is gone before it becomes
 *  scenery. */
const LIFETIME_MS = 7000;
const FADE_MS = 220;
/** Draw order: above every scene's chrome (Track's hit layer sits at 10). */
const DEPTH = 40;

export class UndoToast {
  private readonly scene: Phaser.Scene;
  private readonly onUndo: () => void;
  private readonly container: Phaser.GameObjects.Container;
  private readonly chip: Phaser.GameObjects.Graphics;
  private readonly lostText: Phaser.GameObjects.Text;
  private readonly actionText: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private timer: Phaser.Time.TimerEvent | undefined;
  private shown = false;

  constructor(scene: Phaser.Scene, onUndo: () => void) {
    this.scene = scene;
    this.onUndo = onUndo;
    this.chip = scene.add.graphics();
    this.lostText = scene.add
      .text(0, 0, "", { fontFamily: "'Press Start 2P', monospace", color: "#5b5470" })
      .setOrigin(0.5);
    this.actionText = scene.add
      .text(0, 0, "PUT IT BACK", { fontFamily: "'Press Start 2P', monospace", color: "#2b2440" })
      .setOrigin(0.5);
    this.hit = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0);
    this.container = scene.add
      .container(0, 0, [this.chip, this.lostText, this.actionText, this.hit])
      .setDepth(DEPTH)
      .setAlpha(0)
      .setVisible(false);

    this.hit.setInteractive({ useHandCursor: true });
    // Armed press/release, matching every other control in these scenes: a
    // pointerup that began somewhere else must not trigger an undo.
    let armed = false;
    this.hit.on("pointerdown", () => { armed = true; this.container.setScale(0.97); });
    this.hit.on("pointerout", () => { armed = false; this.container.setScale(1); });
    this.hit.on("pointerup", () => {
      this.container.setScale(1);
      if (!armed) return;
      armed = false;
      this.hide();
      this.onUndo();
    });

    this.layout();
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  /** Offer to restore what `lost` describes. Re-offering restarts the clock —
   *  a kid deleting three lanes in a row gets one chip, not three. */
  show(lost: string): void {
    this.lostText.setText(lost.toUpperCase());
    this.layout();
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(LIFETIME_MS, () => this.hide());
    if (this.shown) return;
    this.shown = true;
    this.container.setVisible(true);
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_MS });
  }

  hide(): void {
    this.timer?.remove();
    this.timer = undefined;
    if (!this.shown) return;
    this.shown = false;
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: FADE_MS,
      // Invisible objects take no input in Phaser, so this is also what stops
      // the chip leaving a phantom tap target behind after it withdraws.
      onComplete: () => this.container.setVisible(false),
    });
  }

  /** Visible right now? Read by the e2e bridge. */
  get offering(): boolean {
    return this.shown;
  }

  /** What the chip currently says was lost. */
  get lost(): string {
    return this.lostText.text;
  }

  private layout(): void {
    const { width, height } = this.scene.scale.gameSize;
    // Sized off the camera, not the background art: the chip is chrome the kid
    // reads, so it must stay legible on a letterboxed phone where the painted
    // plate is small.
    const w = Math.min(width * 0.44, 860);
    const h = Math.max(96, height * 0.085);
    // Just under the top header plate (which ends around 0.26 of the design
    // height in every scene) and well above the bottom bar (which starts around
    // 0.79). Chosen by looking: at 0.70 it sat squarely on the Workshop's row of
    // instrument characters — the very things a kid reaches for next — and this
    // band is empty chrome in both scenes that show it.
    this.container.setPosition(width / 2, height * 0.31);

    const rad = Math.min(h * 0.3, 22);
    this.chip
      .clear()
      .fillStyle(EDGE, 0.35)
      .fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, rad) // soft drop shadow
      .fillStyle(FACE, 1)
      .fillRoundedRect(-w / 2, -h / 2, w, h, rad)
      .lineStyle(Math.max(3, h * 0.05), EDGE, 1)
      .strokeRoundedRect(-w / 2, -h / 2, w, h, rad);

    const fs = Math.max(9, Math.round(h * 0.19));
    this.lostText.setFontSize(fs).setPosition(0, -h * 0.19);
    this.actionText.setFontSize(Math.round(fs * 1.25)).setPosition(0, h * 0.20);
    // Generous target — this is the rescue control, so it is forgiving to hit.
    this.hit.setPosition(0, 0).setSize(w, h * 1.15);
    this.hit.setInteractive({ useHandCursor: true }); // re-arm for the new size
  }

  destroy(): void {
    this.timer?.remove();
    this.container.destroy();
  }
}

/**
 * Give a scene the undo offer. One line per scene, and the bus wiring lives
 * here rather than being copied into each `create()` — the two scenes that need
 * it would otherwise carry identical subscribe/unsubscribe blocks, which is the
 * shape that drifts.
 *
 * The withdrawal is not optional politeness: `store.undo()` pops the LAST
 * history entry, so once the kid does anything else, "put it back" would undo
 * the new thing instead of the deletion. React emits `undo-withdrawn` on every
 * non-destructive command for exactly that reason.
 */
export function attachUndoToast(scene: Phaser.Scene): UndoToast {
  const toast = new UndoToast(scene, () => EventBus.emit("undo-requested"));
  const onOffer = (lost: string): void => toast.show(lost);
  const onWithdraw = (): void => toast.hide();
  EventBus.on("undo-offered", onOffer);
  EventBus.on("undo-withdrawn", onWithdraw);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    EventBus.off("undo-offered", onOffer);
    EventBus.off("undo-withdrawn", onWithdraw);
  });
  return toast;
}
