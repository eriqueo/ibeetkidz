// The Workshop view (v3 — Three-Zone refactor, UI_REFACTOR_DELEGATION.md):
//
//   • Top bar    (panel-header):    ◀ nav → Map, ▶ nav → Yard.
//   • Field:      the open boxcar interior holds the sequencer grid; four
//                 instrument character sprites (drums / mic / guitar / violin) sit
//                 on the ground and open a tool / add a lane on tap.
//   • Bottom bar (panel-transport): Stop · Play · Loop · Tempo− · Tempo+, plus the
//                 SONG / TEMPO LCD rendered as Phaser Text in the panel's empty
//                 LCD frame (no baked text, no mask rectangles).
//
// The ENTIRE static chrome is data-driven from `assets/maps/workshop.json`: each
// object is a `panel` / `ui-button` / `instrument` the generic `spawnUiLayer`
// interprets — placing the real sprite, wiring its idle⇄pressed (buttons) or
// passive→hover→active (instruments) states, and emitting its authored EventBus
// action. The scene owns NO chrome coordinates; it only positions the two DYNAMIC
// fixtures that are gameplay, not chrome: the sequencer grid and the LCD text
// (anchored to the `lcd-transport` display object).
//
// The base plate is the CLEAN open-boxcar environment (workshop-boxcar-open.png)
// — no painted toolbar, transport, LCDs, or instruments. All UI is sprites on top.
//
// (The old 8-icon toolbar, SONG/SPEED baked chrome, and the 4-way car-type picker
// were retired here; their EventBus events + reducers live on for a later sprint.)
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import { loadUiSprites } from "../ui-sprites.ts";
import { WORKSHOP_LAYOUT_V2, WORKSHOP_GRID_V2 } from "../scene-layout.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { placeSpawn } from "../TiledSceneAdapter.ts";
import { spawnUiLayer, relayoutUiLayer, type UiElement } from "../ui-scene.ts";
import { UI_SPRITES, placeUiSprite, type UiSpriteDef } from "../ui-sprites.ts";
import workshopMap from "../../assets/maps/workshop.json";
import { STEP_COUNT, CAR_TYPES, type CarType, type LaneKind } from "../../core/types.ts";
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
  readonly muted: boolean; // whether this lane is currently muted
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
const MUTED_COLOR = "#ff6b6b";

const toInt = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

// LCD font shared by the SONG + TEMPO readouts. Dark plum on a cream chip drawn
// over the transport panel (PROJECT_CHARTER: dark text on light "paper" panels).
const LCD_PLUM = "#2b2440";
const LCD_CREAM = 0xe9d7ac;
const LCD_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: "18px",
  color: LCD_PLUM,
  letterSpacing: 2,
};

interface LaneRow {
  layerId: string;
  band: Phaser.GameObjects.Rectangle; // full-width lane-colour band (separates lanes)
  label: Phaser.GameObjects.Text;
  del: Phaser.GameObjects.Text; // ✕ remove this lane
  edit: Phaser.GameObjects.Text | null; // 🎹 piano-roll (melody lanes only)
  mute: Phaser.GameObjects.Text; // 🔇 mute toggle
  colorInt: number;
  cells: Phaser.GameObjects.Rectangle[];
  on: boolean[];
}

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
  // Data-driven static chrome: parsed Tiled spawns + the generic UI layer.
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chrome: UiElement[] = [];
  // LCD Text (SONG number + TEMPO bpm) on a cream chip, anchored to `lcd-transport`.
  private lcdChip: Phaser.GameObjects.Graphics | undefined;
  private songText: Phaser.GameObjects.Text | undefined;
  private tempoText: Phaser.GameObjects.Text | undefined;
  // Car-type picker dropdown (toggled by the New Car button).
  private carPicker: Phaser.GameObjects.Container | undefined;
  private pickerTiles: { type: CarType; img: Phaser.GameObjects.Image; def: UiSpriteDef }[] = [];
  private pickerOpen = false;
  private toolPanels: Record<string, BaseToolPanel> = {};
  private activeTool: string | null = null;
  private toolModel: ToolModel | null = null;

  constructor() {
    super(WorkshopScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.workshopBoxcarOpen);
    // Only this scene's chrome: the map's sprites plus the (off-map) car-type
    // picker tiles — never the whole manifest, which stalls the first paint.
    this.chromeSpawns = parseTiledLayer(workshopMap, "ui-layer");
    loadUiSprites(this, [
      ...this.chromeSpawns.map((s) => s.sprite ?? s.id),
      ...CAR_TYPES.map((t) => `btn-picker-${t}`),
    ]);
  }

  create(): void {
    this.addBackground("contain"); // never crop the top/bottom bars off-screen
    this.buildChrome();
    this.buildCarPicker();
    this.buildGrid();
    this.buildToolPanels();
    this.layoutFixtures();
    this.bindPickerToggle();
    this.announceReady();
  }

  // ── data-driven static chrome (panels / nav / instruments / transport) ──────
  private buildChrome(): void {
    this.chrome = spawnUiLayer(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      panelDepth: 1,
      hitDepth: 10,
    });

    // SONG + TEMPO LCD: dark-plum text on a cream chip drawn over the panel.
    this.lcdChip = this.add.graphics().setDepth(9);
    this.songText = this.add.text(0, 0, "SONG 001", LCD_STYLE).setOrigin(0.5).setDepth(11);
    this.tempoText = this.add.text(0, 0, "TEMP 120", LCD_STYLE).setOrigin(0.5).setDepth(11);
  }

  // Re-anchor chrome sprites + LCD (chip + text) after a resize.
  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const { width, height } = this.scale.gameSize;
    relayoutUiLayer(this.chrome, r, { width, height });

    const lcd = this.chromeSpawns.find((s) => s.id === "lcd-transport");
    if (lcd && this.songText && this.tempoText && this.lcdChip) {
      const p = placeSpawn(lcd, r, { width, height });
      const rad = Math.min(p.height * 0.28, 18);
      this.lcdChip
        .clear()
        .fillStyle(LCD_CREAM, 1)
        .fillRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, rad)
        .lineStyle(Math.max(2, p.height * 0.04), 0x2b2440, 1)
        .strokeRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, rad);
      const fs = Math.max(10, Math.round(p.height * 0.26));
      this.songText.setPosition(p.x, p.y - p.height * 0.24).setFontSize(fs);
      this.tempoText.setPosition(p.x, p.y + p.height * 0.24).setFontSize(fs);
    }
  }

  // ── car-type picker (toggled by the New Car button) ─────────────────────────
  private bindPickerToggle(): void {
    const onToggle = (): void => this.toggleCarPicker();
    EventBus.on("toggle-car-picker", onToggle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off("toggle-car-picker", onToggle));
  }

  private buildCarPicker(): void {
    this.pickerTiles = CAR_TYPES.map((type) => {
      const def = UI_SPRITES[`btn-picker-${type}`]!;
      const img = this.add.image(0, 0, def.base).setOrigin(0.5).setInteractive({ useHandCursor: true });
      img.on("pointerup", () => this.chooseCarType(type));
      return { type, img, def };
    });
    this.carPicker = this.add
      .container(0, 0, this.pickerTiles.map((t) => t.img))
      .setDepth(30)
      .setVisible(false);
  }

  private toggleCarPicker(): void {
    this.pickerOpen = !this.pickerOpen;
    this.carPicker?.setVisible(this.pickerOpen);
    if (this.pickerOpen) this.layoutCarPicker();
  }

  private chooseCarType(type: CarType): void {
    EventBus.emit("workshop-car-type-changed", type);
    this.pickerOpen = false;
    this.carPicker?.setVisible(false);
  }

  private layoutCarPicker(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    // A vertical dropdown centred under the New Car button. Tile aspect (~3:1) is
    // preserved by placeUiSprite's contain fit within each slot rect.
    const cx = r.x + r.width * 0.5;
    const slotW = r.width * 0.2;
    const slotH = r.height * 0.11;
    this.pickerTiles.forEach((t, i) => {
      const cy = r.y + r.height * (0.30 + i * 0.115);
      placeUiSprite(t.img, t.def, { x: cx, y: cy, width: slotW, height: slotH });
      const selected = t.type === this.model.carType;
      // Boxcar has dedicated `selected` art; others just brighten when chosen.
      const selKey = t.def.states["selected"];
      if (selKey) t.img.setTexture(selected ? selKey : t.def.base);
      t.img.setAlpha(selected ? 1 : 0.82);
    });
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

  /** Test-only read of the currently open satellite tool panel (null = none). */
  get activeToolId(): string | null {
    return this.activeTool;
  }

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
    if (!this.ready) return;
    const key = model.lanes.slice(0, WORKSHOP_GRID_V2.maxLanes).map((l) => l.id).join("|");
    if (key !== this.structKey) {
      this.buildGrid();
      this.layoutFixtures();
    } else {
      this.diffCells();
    }
    this.refreshSelection();
    this.refreshMutes();
    this.refreshLcd();
  }

  private refreshLcd(): void {
    this.tempoText?.setText(`TEMP ${Math.round(this.model.tempoBpm)}`);
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
    this.layoutFixtures();
    if (this.pickerOpen) this.layoutCarPicker();
    if (this.activeTool) {
      const { width, height } = this.scale.gameSize;
      this.toolPanels[this.activeTool]?.layout(width, height);
    }
  }

  // ── grid ────────────────────────────────────────────────────────────────────

  /** A tappable emoji/text used for lane labels + row buttons. Press feedback is
   *  a brief SCALE-only flash (no y-shift — these icons are tiny and a positional
   *  nudge made them flicker/vanish under the cursor). */
  private makeIconText(text: string, onPress: () => void): Phaser.GameObjects.Text {
    const t = this.add
      .text(0, 0, text, { fontFamily: "'Press Start 2P', monospace", fontSize: "16px", color: LABEL_COLOR })
      .setOrigin(0.5)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });
    t.on("pointerdown", () => { t.setScale(0.85); onPress(); })
      .on("pointerup", () => t.setScale(1))
      .on("pointerout", () => t.setScale(1));
    return t;
  }

  private buildGrid(): void {
    this.rows.forEach((r) => {
      r.band.destroy();
      r.label.destroy();
      r.del.destroy();
      r.edit?.destroy();
      r.mute.destroy();
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
      // A faint full-width band tinted with the lane colour, so each lane reads as
      // its own separated row (not one merged jumble of notes). Tap selects it.
      const band = this.add
        .rectangle(0, 0, 10, 10, colorInt, 0.1)
        .setOrigin(0, 0.5)
        .setDepth(3)
        .setInteractive({ useHandCursor: true });
      band.on("pointerdown", () => EventBus.emit("workshop-layer-selected", lane.id));
      const label = this.makeIconText(lane.label, () => EventBus.emit("workshop-layer-selected", lane.id));
      const del = this.makeIconText("✕", () => EventBus.emit("workshop-layer-delete", lane.id));
      del.setColor("#ff6b6b");
      const edit = lane.kind === "melody"
        ? this.makeIconText("🎹", () => EventBus.emit("workshop-edit-melody", lane.id))
        : null;
      // Mute toggle: 🔇 when muted, 🔊 when active. Tapping toggles.
      const muteIcon = lane.muted ? "🔇" : "🔊";
      const mute = this.makeIconText(muteIcon, () => EventBus.emit("workshop-layer-muted", lane.id));
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
      this.rows.push({ layerId: lane.id, band, label, del, edit, mute, colorInt, cells, on });
    });

    // The playhead is a full-height COLUMN highlight (one cell wide) so the
    // currently-playing step is obvious across every lane. Sits below the cells
    // (depth 4) so lit notes still read on top of the tint.
    this.playhead = this.add.rectangle(0, 0, 10, 10, 0xffd166, 0.28).setOrigin(0, 0).setDepth(4).setVisible(false);
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
      row.band.setFillStyle(row.colorInt, on ? 0.28 : 0.1);
      row.label.setColor(on ? LABEL_SELECTED : LABEL_COLOR);
    });
  }

  /** Refresh mute icons to reflect current model state. */
  private refreshMutes(): void {
    const lanes = this.model.lanes.slice(0, WORKSHOP_GRID_V2.maxLanes);
    this.rows.forEach((row, li) => {
      const lane = lanes[li];
      if (!lane) return;
      row.mute.setText(lane.muted ? "🔇" : "🔊");
      row.mute.setColor(lane.muted ? MUTED_COLOR : LABEL_COLOR);
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

    const iconPx = Math.max(11, Math.min(this.cellH * 0.62, labelW * 0.26));
    this.rows.forEach((row, li) => {
      const cy = gy + (li + 0.5) * this.cellH;
      // Lane band: full grid width, a hair shorter than the row so a thin gap
      // separates adjacent lanes.
      row.band.setPosition(gx, cy).setSize(gw, this.cellH * 0.86);
      // Label column layout (left to right):
      //   [✕ delete] [instrument emoji] [🎹 edit (melody only)] [🔇/🔊 mute]
      row.del.setPosition(gx + labelW * 0.12, cy).setFontSize(iconPx);
      row.label.setPosition(gx + labelW * 0.38, cy).setFontSize(iconPx);
      row.edit?.setPosition(gx + labelW * 0.62, cy).setFontSize(iconPx);
      row.mute.setPosition(gx + labelW * 0.86, cy).setFontSize(iconPx);
      row.cells.forEach((cell, i) => {
        cell.setPosition(this.gridLeft + (i + 0.5) * this.cellW, cy);
        cell.setSize(Math.max(2, this.cellW - pad), Math.max(2, this.cellH - pad));
      });
    });

    this.playhead?.setSize(this.cellW, this.cellH * laneCount);
  }

  private layoutFixtures(): void {
    this.layoutChrome();
    this.layoutGrid();
  }
}
