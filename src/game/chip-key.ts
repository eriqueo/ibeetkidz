// A key drawn in the chip language (cream face, plum edge, Press Start 2P) —
// the treatment the "put it back" chip and the LCDs already use, for controls
// that have no painted keycap yet. UNDO / REDO and the Yard's train scroll
// arrows (card C6) are built from it; AR-080 asks for painted ones.
import Phaser from "phaser";

const FACE = 0xe9d7ac;
export const CHIP_KEY_INK = 0x2b2440;
/** A key that cannot act right now: still visible, so a row of keys never
 *  jumps about, but plainly not ready. */
const DIM_ALPHA = 0.38;

export interface ChipKeyOptions {
  /** Scene-graph name of the tap area, the e2e handle. */
  readonly name: string;
  /** Word under the picture; none for a picture-only key. */
  readonly word?: string;
  /** Draw the picture, centred on (0, `cy`), `size` across. */
  readonly glyph: (g: Phaser.GameObjects.Graphics, size: number, cy: number) => void;
  readonly onPress: () => void;
}

export class ChipKey {
  readonly container: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Graphics;
  private readonly glyph: Phaser.GameObjects.Graphics;
  private readonly word: Phaser.GameObjects.Text | null;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private enabled = true;

  constructor(scene: Phaser.Scene, private readonly opts: ChipKeyOptions, depth: number) {
    this.face = scene.add.graphics();
    this.glyph = scene.add.graphics();
    this.word = opts.word
      ? scene.add.text(0, 0, opts.word, { fontFamily: "'Press Start 2P', monospace", color: "#2b2440" }).setOrigin(0.5)
      : null;
    this.hit = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setName(opts.name);
    const kids: Phaser.GameObjects.GameObject[] = [this.face, this.glyph];
    if (this.word) kids.push(this.word);
    kids.push(this.hit);
    this.container = scene.add.container(0, 0, kids).setDepth(depth);
    // Armed press, like every other control: a lift that began elsewhere does
    // nothing.
    let armed = false;
    this.hit.on("pointerdown", () => { armed = true; this.container.setScale(0.95); });
    this.hit.on("pointerout", () => { armed = false; this.container.setScale(1); });
    this.hit.on("pointerup", () => {
      this.container.setScale(1);
      if (!armed || !this.enabled) return;
      armed = false;
      opts.onPress();
    });
    this.hit.setInteractive({ useHandCursor: true });
  }

  /** Draw the key `w`×`h` centred on (`cx`, `cy`); the tap area is at least
   *  `minHit` each way. */
  place(cx: number, cy: number, w: number, h: number, minHit = 0): void {
    this.container.setPosition(cx, cy);
    const rad = Math.min(h * 0.18, 22);
    const edge = Math.max(3, h * 0.035);
    this.face
      .clear()
      .fillStyle(CHIP_KEY_INK, 0.35)
      .fillRoundedRect(-w / 2 + 5, -h / 2 + 7, w, h, rad)
      .fillStyle(FACE, 1)
      .fillRoundedRect(-w / 2, -h / 2, w, h, rad)
      .lineStyle(edge, CHIP_KEY_INK, 1)
      .strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
    this.glyph.clear();
    this.opts.glyph(this.glyph, Math.min(w, h), this.word ? -h * 0.08 : 0);
    this.word?.setFontSize(Math.max(10, Math.round(h * 0.15))).setPosition(0, h * 0.29);
    this.hit.setSize(Math.max(w, minHit), Math.max(h, minHit)).setPosition(0, 0);
    if (this.enabled) this.hit.setInteractive({ useHandCursor: true });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.container.setAlpha(enabled ? 1 : DIM_ALPHA);
    if (enabled) this.hit.setInteractive({ useHandCursor: true });
    else this.hit.disableInteractive();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setVisible(shown: boolean): void {
    this.container.setVisible(shown);
  }

  destroy(): void {
    this.container.destroy();
  }
}
