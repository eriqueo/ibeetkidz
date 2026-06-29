// The Workshop view (v2): the sequencer lives INSIDE Phaser now. The painted
// boxcar interior holds a step grid (one row per lane, STEP_COUNT cells each);
// the painted shelf adds lanes; a 4-way picker sets the (cosmetic) car type; a
// Play/Stop pair drives the loop. All interaction flows out over the typed
// EventBus — React owns state + audio and pushes a derived model back in.
//
// The grid is built once per lane-set and only its cell tints/alpha change on a
// store update (diffed); `update()` only sweeps the playhead. Every coordinate
// comes from scene-layout.ts — nothing is hardcoded here.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import { loadSpriteAssets, frameKey } from "../sprite-assets.ts";
import {
  WORKSHOP_LAYOUT_V2,
  WORKSHOP_GRID_V2,
  WORKSHOP_INSTRUMENTS,
  rowCell,
} from "../scene-layout.ts";
import { STEP_COUNT, CAR_TYPES, type CarType, type LaneKind } from "../../core/types.ts";
import { WORKSHOP_TOOLBAR } from "../scene-layout.ts";
import { pressPop } from "../press.ts";
import {
  BaseToolPanel,
  VoiceToolPanel,
  VoiceKeysToolPanel,
  PadsToolPanel,
  BeatToolPanel,
  MagicToolPanel,
  MelodyEditorPanel,
  type ToolModel,
} from "../tool-panels.ts";

/** One sequencer lane, derived by React from the active car's layers. */
export interface WorkshopLane {
  readonly id: string;
  readonly label: string; // emoji / short tag for the row
  readonly color: string; // laneColor() — the lane-group colour
  readonly kind: LaneKind; // melody lanes get a piano-roll edit button
  readonly cells: readonly boolean[]; // length STEP_COUNT
}

/** What the scene needs to render, pushed from the store on every change. */
export interface WorkshopModel {
  readonly lanes: readonly WorkshopLane[];
  readonly carType: CarType;
  readonly selectedLayerId: string | null;
  readonly tempoBpm: number;
}

const OFF_FILL = 0x2a2118;
const OFF_ALPHA = 0.32;
const LABEL_COLOR = "#e8dcc8";
const LABEL_SELECTED = "#ffd166";

const toInt = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

interface LaneRow {
  layerId: string;
  label: Phaser.GameObjects.Text;
  del: Phaser.GameObjects.Text; // ✕ remove this lane
  edit: Phaser.GameObjects.Text | null; // 🎹 piano-roll (melody lanes only)
  colorInt: number;
  cells: Phaser.GameObjects.Rectangle[];
  on: boolean[];
}

// Painted top-toolbar icon → intent, keyed by WORKSHOP_TOOLBAR's labels.
const TOOLBAR_ACTIONS: Record<string, () => void> = {
  newcar: () => EventBus.emit("workshop-new-car"),
  magicpad: () => EventBus.emit("workshop-open-tool", "theremin-xy"),
  soundpads: () => EventBus.emit("workshop-open-tool", "sound-pads"),
  myvoice: () => EventBus.emit("workshop-open-tool", "record-voicefx"),
  beatgrid: () => EventBus.emit("workshop-open-tool", "beat-grid"),
  voicekeys: () => EventBus.emit("workshop-open-tool", "voice-keys"),
  yard: () => EventBus.emit("workshop-nav", "yard"),
  map: () => EventBus.emit("workshop-nav", "map"),
  surprise: () => EventBus.emit("workshop-surprise"),
};

export class WorkshopScene extends BackgroundScene {
  static readonly KEY = "WorkshopScene";

  private model: WorkshopModel = { lanes: [], carType: "boxcar", selectedLayerId: null, tempoBpm: 120 };
  private rows: LaneRow[] = [];
  private structKey = "";
  private emptyText: Phaser.GameObjects.Text | undefined;
  private playhead: Phaser.GameObjects.Rectangle | undefined;
  private playStep = -1;
  private cellW = 0;
  private cellH = 0;
  private gridLeft = 0;
  private gridTop = 0;
  private carBtns: { type: CarType; img: Phaser.GameObjects.Image; base: number }[] = [];
  private transportBtns: {
    btn: Phaser.GameObjects.Container;
    cx: number;
  }[] = [];
  private toolbarBtns: Phaser.GameObjects.Container[] = [];
  private shelfBtns: Phaser.GameObjects.Container[] = [];
  private tempoText: Phaser.GameObjects.Text | undefined;
  private tempoBg: Phaser.GameObjects.Rectangle | undefined;
  private toolPanels: Record<string, BaseToolPanel> = {};
  private activeTool: string | null = null;
  private toolModel: ToolModel | null = null;

  constructor() {
    super(WorkshopScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.workshop);
    loadSpriteAssets(this); // train atlas → car-type picker sprites
  }

  create(): void {
    this.addBackground("cover");
    this.buildToolbar();
    this.buildShelf();
    this.buildCarPicker();
    this.buildTransport();
    this.buildGrid();
    this.buildToolPanels();
    this.layoutFixtures();
    this.announceReady();
  }

  private buildToolPanels(): void {
    this.toolPanels = {
      "record-voicefx": new VoiceToolPanel(this),
      "voice-keys": new VoiceKeysToolPanel(this),
      "sound-pads": new PadsToolPanel(this),
      "beat-grid": new BeatToolPanel(this),
      "theremin-xy": new MagicToolPanel(this),
      "melody-editor": new MelodyEditorPanel(this),
    };
  }

  // ── painted top toolbar (replaces the old HTML nav + dock) ───────────────────
  private buildToolbar(): void {
    this.toolbarBtns = WORKSHOP_TOOLBAR.map((key) =>
      this.makeButton(TOOLBAR_ACTIONS[key] ?? (() => {})));
  }

  private layoutToolbar(): void {
    const r = this.backgroundRect;
    const t = WORKSHOP_LAYOUT_V2.toolbar;
    this.toolbarBtns.forEach((btn, i) => {
      const c = rowCell(i, t.count, t.c0, t.c1, t.y, t.w, t.h);
      const w = r.width * c.w, h = r.height * c.h;
      const bg = btn.getData("bg") as Phaser.GameObjects.Rectangle;
      const hit = btn.getData("hit") as Phaser.Geom.Rectangle;
      bg.setSize(w, h);
      hit.setTo(-w / 2, -h / 2, w, h);
      btn.setPosition(r.x + r.width * (c.x + c.w / 2), r.y + r.height * (c.y + c.h / 2));
    });
  }

  /** React → scene: which satellite tool panel is open (null = none). */
  setActiveTool(toolId: string | null): void {
    this.activeTool = toolId;
    for (const [id, panel] of Object.entries(this.toolPanels)) {
      const show = id === toolId;
      panel.setVisible(show);
      if (show) {
        const { width, height } = this.scale.gameSize;
        panel.layout(width, height);
        if (this.toolModel) panel.apply(this.toolModel);
      }
    }
  }

  /** React → scene: the tool panels' render state. */
  setToolModel(model: ToolModel): void {
    this.toolModel = model;
    if (this.activeTool) this.toolPanels[this.activeTool]?.apply(model);
  }

  /** React → scene: the derived sequencer model. Rebuilds the grid only when the
   *  lane SET changes; otherwise just diffs cell states + selection highlight. */
  setModel(model: WorkshopModel): void {
    this.model = model;
    if (!this.scene.isActive()) return;
    const key = model.lanes.slice(0, WORKSHOP_GRID_V2.maxLanes).map((l) => l.id).join("|");
    if (key !== this.structKey) {
      this.buildGrid();
      this.layoutFixtures();
    } else {
      this.diffCells();
    }
    this.refreshSelection();
    this.refreshCarPicker();
    this.refreshSpeed();
  }

  private refreshSpeed(): void {
    this.tempoText?.setText(String(this.model.tempoBpm));
  }

  /** React → scene: transport step 0..STEP_COUNT-1, or <0 when stopped. Called
   *  once per frame from React's rAF (the single getTransportStep read). */
  setPlayhead(step: number): void {
    this.playStep = step;
  }

  update(): void {
    if (!this.playhead) return;
    if (this.playStep < 0 || this.rows.length === 0) {
      this.playhead.setVisible(false);
      return;
    }
    const step = this.playStep % STEP_COUNT;
    this.playhead.setVisible(true).setPosition(this.gridLeft + step * this.cellW, this.gridTop);
  }

  protected onResize(): void {
    if (!this.scene.isActive()) return;
    this.layoutGrid();
    this.layoutFixtures();
    if (this.activeTool) {
      const { width, height } = this.scale.gameSize;
      this.toolPanels[this.activeTool]?.layout(width, height);
    }
  }

  // ── grid ────────────────────────────────────────────────────────────────────

  /** A tappable emoji/text with a press-pop, used for lane labels + row buttons. */
  private makeIconText(text: string, onPress: () => void): Phaser.GameObjects.Text {
    const t = this.add
      .text(0, 0, text, { fontFamily: "'Press Start 2P', monospace", fontSize: "14px", color: LABEL_COLOR })
      .setOrigin(0.5)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });
    t.on("pointerdown", onPress);
    pressPop(t);
    return t;
  }

  private buildGrid(): void {
    this.rows.forEach((r) => {
      r.label.destroy();
      r.del.destroy();
      r.edit?.destroy();
      r.cells.forEach((c) => c.destroy());
    });
    this.rows = [];
    this.playhead?.destroy();
    this.playhead = undefined;
    this.emptyText?.destroy();
    this.emptyText = undefined;

    const lanes = this.model.lanes.slice(0, WORKSHOP_GRID_V2.maxLanes);
    this.structKey = lanes.map((l) => l.id).join("|");

    if (lanes.length === 0) {
      this.emptyText = this.add
        .text(0, 0, "Empty car —\ntap an instrument below", {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "12px",
          color: LABEL_COLOR,
          align: "center",
          lineSpacing: 8,
        })
        .setOrigin(0.5)
        .setDepth(6);
      this.layoutGrid();
      return;
    }

    lanes.forEach((lane) => {
      const colorInt = toInt(lane.color);
      const label = this.makeIconText(lane.label, () => EventBus.emit("workshop-layer-selected", lane.id));
      const del = this.makeIconText("✕", () => EventBus.emit("workshop-layer-delete", lane.id));
      del.setColor("#ff6b6b");
      const edit = lane.kind === "melody"
        ? this.makeIconText("🎹", () => EventBus.emit("workshop-edit-melody", lane.id))
        : null;
      const cells: Phaser.GameObjects.Rectangle[] = [];
      const on: boolean[] = [];
      for (let i = 0; i < STEP_COUNT; i++) {
        const isOn = lane.cells[i] ?? false;
        const cell = this.add
          .rectangle(0, 0, 10, 10, isOn ? colorInt : OFF_FILL, isOn ? 1 : OFF_ALPHA)
          .setOrigin(0.5)
          .setStrokeStyle(1, 0x000000, 0.5)
          .setDepth(5)
          .setInteractive({ useHandCursor: true });
        const stepIndex = i;
        cell
          .on("pointerdown", () => {
            cell.setScale(0.82); // press pop
            const next = !this.rowOn(lane.id, stepIndex);
            EventBus.emit("workshop-cell-toggled", { layerId: lane.id, stepIndex, on: next });
          })
          .on("pointerup", () => cell.setScale(1))
          .on("pointerout", () => cell.setScale(1));
        cells.push(cell);
        on.push(isOn);
      }
      this.rows.push({ layerId: lane.id, label, del, edit, colorInt, cells, on });
    });

    this.playhead = this.add.rectangle(0, 0, 3, 10, 0xffffff, 0.5).setOrigin(0, 0).setDepth(8).setVisible(false);
    this.layoutGrid();
    this.refreshSelection();
  }

  private rowOn(layerId: string, step: number): boolean {
    const row = this.rows.find((r) => r.layerId === layerId);
    return row ? (row.on[step] ?? false) : false;
  }

  /** Diff the model's cell states against what's drawn; recolour only changes. */
  private diffCells(): void {
    const lanes = this.model.lanes.slice(0, WORKSHOP_GRID_V2.maxLanes);
    this.rows.forEach((row, li) => {
      const lane = lanes[li];
      if (!lane) return;
      for (let i = 0; i < STEP_COUNT; i++) {
        const isOn = lane.cells[i] ?? false;
        if (isOn !== row.on[i]) {
          row.on[i] = isOn;
          row.cells[i]?.setFillStyle(isOn ? row.colorInt : OFF_FILL, isOn ? 1 : OFF_ALPHA);
        }
      }
    });
  }

  private refreshSelection(): void {
    const sel = this.model.selectedLayerId;
    this.rows.forEach((row) => {
      const on = row.layerId === sel;
      row.label.setColor(on ? LABEL_SELECTED : LABEL_COLOR).setScale(on ? 1.25 : 1);
    });
  }

  private layoutGrid(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const g = WORKSHOP_LAYOUT_V2.carInterior;
    const gx = r.x + r.width * g.x;
    const gy = r.y + r.height * g.y;
    const gw = r.width * g.w;
    const gh = r.height * g.h;

    if (this.emptyText) this.emptyText.setPosition(gx + gw / 2, gy + gh / 2);

    const laneCount = Math.max(1, this.rows.length);
    const labelW = gw * WORKSHOP_GRID_V2.labelFrac;
    this.gridLeft = gx + labelW;
    this.gridTop = gy;
    this.cellW = (gw - labelW) / STEP_COUNT;
    this.cellH = gh / laneCount;
    const pad = Math.min(this.cellW, this.cellH) * WORKSHOP_GRID_V2.cellPad;

    const iconPx = Math.max(9, Math.min(this.cellH * 0.5, labelW * 0.22));
    this.rows.forEach((row, li) => {
      const cy = gy + (li + 0.5) * this.cellH;
      // Label column: [✕ delete] [instrument emoji] [🎹 edit (melody only)].
      row.del.setPosition(gx + labelW * 0.16, cy).setFontSize(iconPx);
      row.label.setPosition(gx + labelW * 0.5, cy).setFontSize(iconPx);
      row.edit?.setPosition(gx + labelW * 0.84, cy).setFontSize(iconPx);
      row.cells.forEach((cell, i) => {
        cell.setPosition(this.gridLeft + (i + 0.5) * this.cellW, cy);
        cell.setSize(Math.max(2, this.cellW - pad), Math.max(2, this.cellH - pad));
      });
    });

    this.playhead?.setSize(3, this.cellH * laneCount);
  }

  // ── instrument shelf ─────────────────────────────────────────────────────────

  // One transparent tap-zone over each of the 4 painted ground instruments (no
  // emoji chrome — the painted art is the button). Tapping either OPENS that
  // instrument's tool panel (drum→Beat Maker, mic→My Voice) or ADDS a melody lane
  // voiced by its synth + opens the note editor (guitar→pluck, keyboard→piano).
  private buildShelf(): void {
    this.shelfBtns = WORKSHOP_INSTRUMENTS.map((inst) =>
      this.makeButton(() => {
        const o = inst.opens;
        if ("tool" in o) EventBus.emit("workshop-open-tool", o.tool);
        else EventBus.emit("workshop-add-melody", o.melody);
      }));
  }

  private layoutShelf(): void {
    const r = this.backgroundRect;
    this.shelfBtns.forEach((btn, i) => {
      const inst = WORKSHOP_INSTRUMENTS[i];
      if (!inst) return;
      const w = r.width * inst.w, h = r.height * inst.h;
      const bg = btn.getData("bg") as Phaser.GameObjects.Rectangle;
      const hit = btn.getData("hit") as Phaser.Geom.Rectangle;
      bg.setSize(w, h);
      hit.setTo(-w / 2, -h / 2, w, h);
      btn.setPosition(r.x + r.width * inst.cx, r.y + r.height * inst.cy);
    });
  }

  // ── car-type picker ──────────────────────────────────────────────────────────

  private buildCarPicker(): void {
    this.carBtns = CAR_TYPES.map((type) => {
      const img = this.add
        .image(0, 0, "train", frameKey(type, "E"))
        .setOrigin(0.5)
        .setDepth(9)
        .setInteractive({ useHandCursor: true });
      const entry = { type, img, base: 1 };
      img.on("pointerdown", () => EventBus.emit("workshop-car-type-changed", type));
      pressPop(img);
      return entry;
    });
  }

  private layoutCarPicker(): void {
    const r = this.backgroundRect;
    const p = WORKSHOP_LAYOUT_V2.carTypePicker;
    const slotW = (r.width * p.w) / CAR_TYPES.length;
    const cy = r.y + r.height * (p.y + p.h / 2);
    this.carBtns.forEach((entry, i) => {
      const cx = r.x + r.width * p.x + (i + 0.5) * slotW;
      entry.img.setPosition(cx, cy);
      if (entry.img.width > 0) { entry.base = (slotW * 0.8) / entry.img.width; entry.img.setScale(entry.base); }
    });
    this.refreshCarPicker();
  }

  private refreshCarPicker(): void {
    this.carBtns.forEach(({ type, img }) => {
      const active = type === this.model.carType;
      img.setAlpha(active ? 1 : 0.5);
      img.setTint(active ? 0xffffff : 0x888888);
    });
  }

  // ── transport ────────────────────────────────────────────────────────────────
  // The painted bottom panel already draws the STOP / PLAY / LOOP / SPEED faces,
  // so each control is a TRANSPARENT hit-area over its painted button (the Phase-1
  // container/centred-hit/press-state mechanics, just with no opaque fill) plus a
  // brief highlight flash on press. Play and Loop both loop the active car.

  private buildTransport(): void {
    const t = WORKSHOP_LAYOUT_V2.transport;
    this.transportBtns = [
      { btn: this.makeButton(() => EventBus.emit("transport-stop")), cx: t.stop },
      { btn: this.makeButton(() => EventBus.emit("transport-play", "loop")), cx: t.play },
      { btn: this.makeButton(() => EventBus.emit("transport-play", "loop")), cx: t.loop },
      { btn: this.makeButton(() => EventBus.emit("tempo-changed", -10)), cx: t.speedDown },
      { btn: this.makeButton(() => EventBus.emit("tempo-changed", 10)), cx: t.speedUp },
    ];
    // Mask the painted TEMPO LCD's screen (it is BLACK, #000000) and redraw the
    // live BPM in the LCD's lime green, so the panel reflects the real tempo (no
    // painted "120" bleeding through). The painted "TEMPO" label above the screen
    // stays — only the digits are masked.
    this.tempoBg = this.add.rectangle(0, 0, 10, 10, 0x000000).setDepth(9);
    this.tempoText = this.add
      .text(0, 0, String(this.model.tempoBpm), { fontFamily: "'Press Start 2P', monospace", fontSize: "14px", color: "#90BA4F" })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private makeButton(onPress: () => void): Phaser.GameObjects.Container {
    // Transparent face so the painted button shows through; flashes on press.
    const bg = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0.5);
    const btn = this.add.container(0, 0, [bg]).setDepth(10);
    const hit = new Phaser.Geom.Rectangle(-5, -5, 10, 10);
    btn.setData("bg", bg);
    btn.setData("hit", hit);
    btn.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    if (btn.input) btn.input.cursor = "pointer";
    const rest = (): void => { bg.setFillStyle(0xffffff, 0); };
    btn
      .on("pointerdown", () => {
        bg.setFillStyle(0xffffff, 0.22); // press flash over the painted face
        onPress();
      })
      .on("pointerup", rest)
      .on("pointerout", rest);
    return btn;
  }

  private layoutTransport(): void {
    const r = this.backgroundRect;
    const t = WORKSHOP_LAYOUT_V2.transport;
    const w = r.width * t.w;
    const h = r.height * t.h;
    const y = r.y + r.height * t.y;
    for (const { btn, cx } of this.transportBtns) {
      const bg = btn.getData("bg") as Phaser.GameObjects.Rectangle;
      const hit = btn.getData("hit") as Phaser.Geom.Rectangle;
      bg.setSize(w, h);
      hit.setTo(-w / 2, -h / 2, w, h);
      btn.setPosition(r.x + r.width * cx, y);
    }
    if (this.tempoText && this.tempoBg) {
      const d = t.display;
      const dx = r.x + r.width * d.x;
      const dy = r.y + r.height * d.y;
      const dw = r.width * d.w;
      const dh = r.height * d.h;
      this.tempoBg.setSize(dw, dh).setPosition(dx, dy);
      this.tempoText.setPosition(dx, dy).setFontSize(Math.max(11, dh * 0.66));
      this.refreshSpeed();
    }
  }

  private layoutFixtures(): void {
    this.layoutToolbar();
    this.layoutShelf();
    this.layoutCarPicker();
    this.layoutTransport();
    this.layoutGrid();
  }
}
