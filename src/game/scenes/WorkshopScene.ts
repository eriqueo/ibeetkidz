// The Workshop view (v2): the sequencer lives INSIDE Phaser now. The painted
// boxcar interior holds a step grid (one row per lane, STEP_COUNT cells each); a
// 4-way picker sets the (cosmetic) car type; a Play/Stop pair drives the loop.
// All interaction flows out over the typed EventBus — React owns state + audio
// and pushes a derived model back in.
//
// The STATIC chrome (top toolbar, instrument shelf, transport buttons + the
// TEMPO LCD anchor) is DATA-DRIVEN from the Tiled map `assets/maps/workshop.json`
// via TiledParser + TiledSceneAdapter: each object becomes a transparent hit-area
// over the painted base plate that emits its authored EventBus action on tap. The
// scene owns the clean background (BackgroundScene.addBackground) and hands the
// adapter its `bgRect`, so there is exactly one background; `relayoutSpawns`
// re-anchors the hit-areas to the painted art on every resize.
//
// The grid is built once per lane-set and only its cell tints/alpha change on a
// store update (diffed); `update()` only sweeps the playhead.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import { loadSpriteAssets, frameKey } from "../sprite-assets.ts";
import { WORKSHOP_LAYOUT_V2, WORKSHOP_GRID_V2 } from "../scene-layout.ts";
import {
  parseTiledLayer,
  type TiledSpawn,
} from "../TiledParser.ts";
import { spawnTiledScene, relayoutSpawns, placeSpawn } from "../TiledSceneAdapter.ts";
import workshopMap from "../../assets/maps/workshop.json";
import { STEP_COUNT, CAR_TYPES, type CarType, type LaneKind } from "../../core/types.ts";
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
  band: Phaser.GameObjects.Rectangle; // full-width lane-colour band (separates lanes)
  label: Phaser.GameObjects.Text;
  del: Phaser.GameObjects.Text; // ✕ remove this lane
  edit: Phaser.GameObjects.Text | null; // 🎹 piano-roll (melody lanes only)
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
  private carBtns: { type: CarType; img: Phaser.GameObjects.Image; base: number }[] = [];
  // Data-driven static chrome: parsed Tiled spawns + their adapter hit-areas
  // (index-aligned), re-anchored to the painted art on resize.
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chromeHits: Phaser.GameObjects.Rectangle[] = [];
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
    this.addBackground("contain"); // never crop the toolbar/transport off-screen
    this.buildChrome();
    this.buildCarPicker();
    this.buildGrid();
    this.buildToolPanels();
    this.layoutFixtures();
    this.announceReady();
  }

  // ── data-driven static chrome (toolbar / shelf / transport / TEMPO LCD) ──────
  // Parse the Tiled UI layer once and let the adapter spawn a transparent hit-area
  // per object (each emits its authored EventBus action on tap). The scene owns
  // the clean background, so the adapter gets `bgRect` and creates NO second
  // background image. The TEMPO LCD object (`lcd-tempo-screen`, no action) is the
  // positioned anchor for the live BPM mask+text below.
  private buildChrome(): void {
    this.chromeSpawns = parseTiledLayer(workshopMap, "ui-layer");
    const { hits } = spawnTiledScene(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      hitDepth: 10,
    });
    this.chromeHits = hits;

    // Mask the painted TEMPO LCD's BLACK screen and redraw the live BPM in the
    // LCD's lime green, so the panel reflects the real tempo (no painted "120"
    // bleeding through). Positioned from the `lcd-tempo-screen` spawn rect.
    this.tempoBg = this.add.rectangle(0, 0, 10, 10, 0x000000).setDepth(9);
    this.tempoText = this.add
      .text(0, 0, String(this.model.tempoBpm), { fontFamily: "'Press Start 2P', monospace", fontSize: "14px", color: "#90BA4F" })
      .setOrigin(0.5)
      .setDepth(10);
  }

  // Re-anchor the chrome hit-areas + the TEMPO LCD mask/text to the painted art
  // after the background refits (the adapter only places them once at create).
  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const { width, height } = this.scale.gameSize;
    relayoutSpawns(this.chromeHits, this.chromeSpawns, r, { width, height });

    const lcd = this.chromeSpawns.find((s) => s.id === "lcd-tempo-screen");
    if (lcd && this.tempoBg && this.tempoText) {
      const p = placeSpawn(lcd, r, { width, height });
      this.tempoBg.setSize(p.width, p.height).setPosition(p.x, p.y);
      this.tempoText.setPosition(p.x, p.y).setFontSize(Math.max(11, p.height * 0.66));
      this.refreshSpeed();
    }
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

  /** React → scene: which satellite tool panel is open (null = none). */
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
      this.rows.push({ layerId: lane.id, band, label, del, edit, colorInt, cells, on });
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
      // Selected lane: brighter band + highlighted label. No scale (it fought the
      // press flash and made tiny icons jump).
      row.band.setFillStyle(row.colorInt, on ? 0.28 : 0.1);
      row.label.setColor(on ? LABEL_SELECTED : LABEL_COLOR);
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
      // Label column: [✕ delete] [instrument emoji] [🎹 edit (melody only)] — well
      // spaced so a tap doesn't land on the destructive ✕ by accident.
      row.del.setPosition(gx + labelW * 0.18, cy).setFontSize(iconPx);
      row.label.setPosition(gx + labelW * 0.52, cy).setFontSize(iconPx);
      row.edit?.setPosition(gx + labelW * 0.85, cy).setFontSize(iconPx);
      row.cells.forEach((cell, i) => {
        cell.setPosition(this.gridLeft + (i + 0.5) * this.cellW, cy);
        cell.setSize(Math.max(2, this.cellW - pad), Math.max(2, this.cellH - pad));
      });
    });

    this.playhead?.setSize(this.cellW, this.cellH * laneCount);
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

  private layoutFixtures(): void {
    this.layoutChrome();
    this.layoutCarPicker();
    this.layoutGrid();
  }
}
