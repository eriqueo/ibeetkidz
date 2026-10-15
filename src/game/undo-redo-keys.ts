// UNDO and REDO, always on screen (card C6, "forgiving controls").
//
// The "put it back" chip (`undo-toast.ts`) answers a loss in the moment it
// happens and then leaves. These two keys stay: a kid who changed a beat a
// minute ago, or undid one step too many, can still get back. The composition
// root owns the history and says whether each key has anything behind it
// (`history-changed`); a key with nothing behind it is dimmed and takes no tap.
//
// Each scene places the pair in a rect from its own map (`undo-redo`), so
// `?edit` can move it.
import Phaser from "phaser";
import { EventBus } from "./EventBus.ts";
import { ChipKey, CHIP_KEY_INK } from "./chip-key.ts";

export interface KeyRect { x: number; y: number; width: number; height: number }

/** A curved arrow: UNDO turns back to the left, REDO on to the right. */
function historyArrow(dir: -1 | 1) {
  return (g: Phaser.GameObjects.Graphics, size: number, cy: number): void => {
    const r = size * 0.2;
    const thick = Math.max(4, r * 0.32);
    // The arc runs over the top, from the far side round to the near side.
    const start = Phaser.Math.DegToRad(dir < 0 ? 20 : 160);
    const end = Phaser.Math.DegToRad(dir < 0 ? 200 : -20);
    g.lineStyle(thick, CHIP_KEY_INK, 1).beginPath().arc(0, cy, r, start, end, dir > 0).strokePath();
    // Arrowhead at the arc's end, pointing down.
    const tipX = Math.cos(end) * r;
    const tipY = cy + Math.sin(end) * r;
    const head = thick * 1.6;
    g.fillStyle(CHIP_KEY_INK, 1).fillTriangle(
      tipX - head, tipY - head * 0.2,
      tipX + head, tipY - head * 0.2,
      tipX, tipY + head * 1.1,
    );
  };
}

// The last answer the composition root gave, so a pair built mid-scene (the
// Track rebuilds its chrome when `?edit` drags it) starts right instead of dim.
let lastHistory = { canUndo: false, canRedo: false };
EventBus.on("history-changed", (canUndo, canRedo) => {
  lastHistory = { canUndo, canRedo };
});

export class UndoRedoKeys {
  private readonly undo: ChipKey;
  private readonly redo: ChipKey;
  private readonly onHistory = (canUndo: boolean, canRedo: boolean): void => {
    this.undo.setEnabled(canUndo);
    this.redo.setEnabled(canRedo);
  };

  constructor(scene: Phaser.Scene, depth: number) {
    this.undo = new ChipKey(scene, {
      name: "undo-key",
      word: "UNDO",
      glyph: historyArrow(-1),
      onPress: () => void EventBus.emit("undo-requested"),
    }, depth);
    this.redo = new ChipKey(scene, {
      name: "redo-key",
      word: "REDO",
      glyph: historyArrow(1),
      onPress: () => void EventBus.emit("redo-requested"),
    }, depth);
    this.onHistory(lastHistory.canUndo, lastHistory.canRedo);
    EventBus.on("history-changed", this.onHistory);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Take the pair down and stop listening. */
  destroy(): void {
    EventBus.off("history-changed", this.onHistory);
    this.undo.destroy();
    this.redo.destroy();
  }

  /** Two square keys side by side, filling `rect` (centre x/y). */
  place(rect: KeyRect): void {
    const gap = rect.width * 0.08;
    const size = Math.min(rect.height, (rect.width - gap) / 2);
    const dx = (size + gap) / 2;
    this.undo.place(rect.x - dx, rect.y, size, size);
    this.redo.place(rect.x + dx, rect.y, size, size);
  }

  /** Read by the e2e bridge. */
  get state(): { canUndo: boolean; canRedo: boolean } {
    return { canUndo: this.undo.isEnabled, canRedo: this.redo.isEnabled };
  }
}
