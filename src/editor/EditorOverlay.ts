// The dev-only drag layer, drawn over a live scene.
//
// Deliberately NOT a React panel and NOT a second renderer. It draws one outline
// per draggable spawn straight into the scene it is editing, and a drag mutates
// the map JSON and asks the scene to re-run its OWN layout. So what you see
// while dragging is produced by exactly the code that will render it on the next
// page load — there is no preview that can disagree with the real thing.
//
// The reference-holding is what makes that free: `UiElement.spawn` is the same
// object as the entry in the parsed spawn array (`ui-scene.ts` keeps it, it does
// not copy it), so writing fresh values onto that object and calling the scene's
// relayout is the entire preview mechanism. `tests/unit/editor-live-preview.test.ts`
// pins that behaviour so a future refactor to index-alignment fails loudly.
import type Phaser from "phaser";
import type { TiledSpawn } from "../game/TiledParser.ts";
import { placeSpawn } from "../game/TiledSceneAdapter.ts";
import { invertPlaceSpawn, normToTiledRect, roundRect } from "./inverse.ts";
import { mapPixelSize, moveObject, isDirty, type EditableMap } from "./tiled-mutate.ts";
import { save, type SinkKind } from "./save-sink.ts";
import type { EditorSceneHandle } from "./scene-handle.ts";

const OUTLINE = 0x39ff88;
const OUTLINE_SELECTED = 0xffd166;
const DEPTH = 9000;

export interface EditorDeps {
  readonly scene: Phaser.Scene;
  readonly handle: EditorSceneHandle;
  readonly edit: EditableMap;
  /** Re-parse the mutated JSON into fresh spawns for the handle's layer. */
  readonly reparse: () => TiledSpawn[];
}

export class EditorOverlay {
  private boxes: Phaser.GameObjects.Rectangle[] = [];
  private hud?: Phaser.GameObjects.Text;
  private selected = -1;
  private sink: SinkKind = "hmr";
  private status = "";

  constructor(private readonly deps: EditorDeps) {
    this.build();
    this.bindKeys();
    this.layout();
    // Paint the HUD immediately. `build()` creates it empty and every other
    // caller of `refreshHud` is a selection or a keypress, so arriving in the
    // editor used to show outlines and a blank chip — the one place that says
    // which map you are editing and which keys do anything stayed invisible
    // until you happened to click an outline.
    this.refreshHud();
  }

  private build(): void {
    const { scene, handle } = this.deps;
    handle.spawns.forEach((_spawn, i) => {
      const box = scene.add
        .rectangle(0, 0, 10, 10)
        .setStrokeStyle(3, OUTLINE)
        .setFillStyle(OUTLINE, 0.06)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true, draggable: true });
      scene.input.setDraggable(box);
      box.on("drag", (_p: unknown, x: number, y: number) => this.onDrag(i, x, y));
      box.on("pointerdown", () => this.select(i));
      this.boxes.push(box);
    });
    this.hud = scene.add
      .text(12, 12, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#0b1a12",
        backgroundColor: "#39ff88",
        padding: { x: 10, y: 8 },
      })
      .setDepth(DEPTH + 1)
      .setScrollFactor(0);
  }

  private bindKeys(): void {
    const kb = this.deps.scene.input.keyboard;
    if (!kb) return;
    kb.on("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void this.save();
        return;
      }
      // Nudge the selection by whole pixels — a drag gets you close, arrows get
      // you exact.
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      if ((dx || dy) && this.selected >= 0) {
        e.preventDefault();
        const box = this.boxes[this.selected];
        if (box) this.onDrag(this.selected, box.x + dx, box.y + dy);
      }
      if (e.key === "Tab") {
        e.preventDefault();
        this.select((this.selected + 1) % this.boxes.length);
      }
    });
  }

  private select(i: number): void {
    this.selected = i;
    this.boxes.forEach((b, j) => b.setStrokeStyle(3, j === i ? OUTLINE_SELECTED : OUTLINE));
    this.refreshHud();
  }

  /** A drag: screen pixels -> normalized -> Tiled pixels -> the map file, then
   *  let the SCENE redraw itself from the mutated data. */
  private onDrag(i: number, x: number, y: number): void {
    const { handle, edit, reparse } = this.deps;
    const spawn = handle.spawns[i];
    if (!spawn) return;

    const bg = handle.backgroundRect();
    const cam = handle.cameraSize();
    const placed = placeSpawn(spawn, bg, cam);
    const box = invertPlaceSpawn(spawn.anchor, { ...placed, x, y }, bg, cam);
    const px = mapPixelSize(edit.raw);
    const rect = roundRect(normToTiledRect(box, px.w, px.h));

    const refusal = moveObject(edit.raw, handle.layerName, spawn.id, rect);
    if (refusal) {
      this.status = `cannot move ${spawn.id}: ${refusal}`;
      this.refreshHud();
      return;
    }

    // Re-parse and write the fresh values ONTO the live spawn objects. The scene
    // holds these by reference, so its own relayout now sees the new numbers.
    const fresh = reparse();
    handle.spawns.forEach((live, j) => {
      const next = fresh[j];
      if (next) Object.assign(live, next);
    });
    handle.relayout();
    this.layout();
    this.status = `${spawn.id} → ${rect.x}, ${rect.y}`;
    this.refreshHud();
  }

  /** Re-draw the outlines over wherever the scene just put things. */
  layout(): void {
    const { handle } = this.deps;
    const bg = handle.backgroundRect();
    const cam = handle.cameraSize();
    handle.spawns.forEach((spawn, i) => {
      const p = placeSpawn(spawn, bg, cam);
      this.boxes[i]?.setPosition(p.x, p.y).setSize(p.width, p.height);
    });
  }

  private refreshHud(): void {
    const { handle, edit } = this.deps;
    const sel = this.selected >= 0 ? handle.spawns[this.selected]?.id : undefined;
    this.hud?.setText(
      [
        `EDIT ${edit.name}.json${isDirty(edit) ? " *" : ""}   sink:${this.sink}`,
        sel ? `selected: ${sel}` : "click an outline to select · Tab cycles",
        "drag to move · arrows nudge (shift=10) · ctrl+S save",
        this.status,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  private async save(): Promise<void> {
    const res = await save(this.deps.edit, this.sink);
    this.status = res.detail;
    if (res.ok) {
      // The file on disk is now what we hold, so the next save's base hash must
      // describe THIS content, not the content we opened.
      (this.deps.edit as { baseline: string }).baseline = JSON.stringify(
        this.deps.edit.raw,
        null,
        2,
      ).concat("\n");
    }
    this.refreshHud();
  }

  destroy(): void {
    this.boxes.forEach((b) => b.destroy());
    this.boxes = [];
    this.hud?.destroy();
  }
}
