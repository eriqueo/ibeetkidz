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

// SPEED control: discrete levels 1..N mapped onto BPM (level 4 = 120, matching
// the painted defaults). The ↓/↑ buttons step one level (±SPEED_STEP_BPM via the
// Tiled map); the SPEED LCD shows the level — replacing the confusing live-TEMPO
// readout the "speed" arrows used to drive.
const SPEED_BASE_BPM = 60;
const SPEED_STEP_BPM = 20;
const SPEED_MAX_LEVEL = 8;
const speedLevel = (bpm: number): number =>
  Math.max(1, Math.min(SPEED_MAX_LEVEL, Math.round((bpm - SPEED_BASE_BPM) / SPEED_STEP_BPM) + 1));

// Human-readable labels for each toolbar icon, in Tiled map order.
const TOOLBAR_LABELS = ["SONG", "THEREMIN", "PADS", "VOICE", "BEATS", "YARD", "BONUS", "KEYS"] as const;
// Human-readable labels for each car type, in CAR_TYPES order.
const CAR_TYPE_LABELS: Record<CarType, string> = {
  boxcar: "BOXCAR",
  tanker: "TANKER",
  hopper: "HOPPER",
  flatcar: "FLATCAR",
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
  private carBtns: { type: CarType; img: Phaser.GameObjects.Image; lbl: Phaser.GameObjects.Text; base: number }[] = [];
  // Data-driven static chrome: parsed Tiled spawns + their adapter hit-areas
  // (index-aligned), re-anchored to the painted art on resize.
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chromeHits: Phaser.GameObjects.Rectangle[] = [];
  private speedText: Phaser.GameObjects.Text | undefined; // live SPEED level over the painted SPEED LCD
  private speedBg: Phaser.GameObjects.Rectangle | undefined; // mask under the level digits
  private tempoHideBg: Phaser.GameObjects.Rectangle | undefined; // covers the now-unused painted TEMPO section
  private toolbarLabels: Phaser.GameObjects.Text[] = []; // labels below each toolbar icon
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
  private buildChrome(): void {
    this.chromeSpawns = parseTiledLayer(workshopMap, "ui-layer");
    const { hits } = spawnTiledScene(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      hitDepth: 10,
    });
    this.chromeHits = hits;

    // Live SPEED level over the painted SPEED LCD — mask its digits, redraw the
    // level in lime green. Font size is set in layoutChrome() from the LCD rect.
    this.speedBg = this.add.rectangle(0, 0, 10, 10, 0x000000).setDepth(9);
    this.speedText = this.add
      .text(0, 0, "", {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "14px",
        color: "#90BA4F",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Black mask covering the entire SONG/TEMPO left panel (TEMPO label + digits).
    // The painted TEMPO text is retired — SPEED is the kid-facing control now.
    this.tempoHideBg = this.add.rectangle(0, 0, 10, 10, 0x000000).setDepth(9);

    // Pixel-art labels below each toolbar icon (all 8 icons, skipping EXIT which
    // already has a painted label). Built once; positioned in layoutChrome().
    const iconSpawns = this.chromeSpawns.filter(
      (s) => s.id.startsWith("icon-") && s.id !== "icon-exit",
    );
    this.toolbarLabels = iconSpawns.map((_spawn, i) => {
      const lbl = this.add
        .text(0, 0, TOOLBAR_LABELS[i] ?? "", {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#D4B483",
        })
        .setOrigin(0.5, 0)
        .setDepth(10);
      return lbl;
    });
  }

  // Re-anchor the chrome hit-areas + LCD mask/text + toolbar labels after resize.
  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const { width, height } = this.scale.gameSize;
    relayoutSpawns(this.chromeHits, this.chromeSpawns, r, { width, height });

    // SPEED LCD: expand mask by 4px on each side so it fully covers painted digits.
    const speed = this.chromeSpawns.find((s) => s.id === "lcd-speed-screen");
    if (speed && this.speedBg && this.speedText) {
      const p = placeSpawn(speed, r, { width, height });
      const pad = 4;
      this.speedBg.setSize(p.width + pad * 2, p.height + pad * 2).setPosition(p.x, p.y);
      // Font size at 75% of LCD height so digits fill the box without overflow.
      this.speedText.setPosition(p.x, p.y).setFontSize(Math.max(11, Math.round(p.height * 0.75)));
      this.refreshSpeed();
    }

    // TEMPO hide: cover the full SONG/TEMPO left panel (TEMPO label + digit area).
    // The lcd-tempo-screen object covers only the digit row; we extend upward to
    // cover the "TEMPO" label text as well (approx 60% of the panel height above).
    const tempo = this.chromeSpawns.find((s) => s.id === "lcd-tempo-screen");
    if (tempo && this.tempoHideBg) {
      const p = placeSpawn(tempo, r, { width, height });
      // Extend the mask upward by ~60% of its own height to cover the TEMPO label.
      const extraH = p.height * 0.6;
      this.tempoHideBg
        .setSize(p.width, p.height + extraH)
        .setPosition(p.x, p.y + extraH / 2);
    }

    // Toolbar labels: position each label centred below its icon.
    const iconSpawns = this.chromeSpawns.filter(
      (s) => s.id.startsWith("icon-") && s.id !== "icon-exit",
    );
    iconSpawns.forEach((_spawn, i) => {
      const lbl = this.toolbarLabels[i];
      if (!lbl) return;
      const spawn = iconSpawns[i]!;
      const p = placeSpawn(spawn, r, { width, height });
      // Place label just below the bottom edge of the icon hit-area.
      lbl.setPosition(p.x, p.y + p.height / 2 + 2);
      lbl.setFontSize(Math.max(7, Math.round(p.height * 0.18)));
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
    this.refreshMutes();
  }

  private refreshSpeed(): void {
    this.speedText?.setText(String(speedLevel(this.model.tempoBpm)).padStart(2, "0"));
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

  // ── car-type picker ──────────────────────────────────────────────────────────

  private buildCarPicker(): void {
    this.carBtns = CAR_TYPES.map((type) => {
      const img = this.add
        .image(0, 0, "train", frameKey(type, "E"))
        .setOrigin(0.5, 1) // anchor to bottom so label sits below
        .setDepth(9)
        .setInteractive({ useHandCursor: true });
      img.on("pointerdown", () => EventBus.emit("workshop-car-type-changed", type));
      pressPop(img);

      const lbl = this.add
        .text(0, 0, CAR_TYPE_LABELS[type], {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#D4B483",
        })
        .setOrigin(0.5, 0)
        .setDepth(9);

      return { type, img, lbl, base: 1 };
    });
  }

  private layoutCarPicker(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const p = WORKSHOP_LAYOUT_V2.carTypePicker;
    const slotW = (r.width * p.w) / CAR_TYPES.length;
    // cy is the vertical centre of the picker region; images anchor bottom so
    // they sit in the upper half of the slot and the label sits below.
    const cy = r.y + r.height * (p.y + p.h * 0.4);
    const lblY = r.y + r.height * (p.y + p.h * 0.75);
    // Scale to fill ~80% of slot width. Use FRAME_SIZE (128) as fallback if the
    // atlas frame hasn't reported its size yet — avoids the (0,0) stuck bug.
    const frameW = 128;
    const targetScale = (slotW * 0.8) / frameW;
    this.carBtns.forEach((entry, i) => {
      const cx = r.x + r.width * p.x + (i + 0.5) * slotW;
      entry.img.setPosition(cx, cy);
      entry.base = targetScale;
      entry.img.setScale(targetScale);
      entry.lbl.setPosition(cx, lblY);
    });
    this.refreshCarPicker();
  }

  private refreshCarPicker(): void {
    this.carBtns.forEach(({ type, img, lbl }) => {
      const active = type === this.model.carType;
      img.setAlpha(active ? 1 : 0.45);
      img.setTint(active ? 0xffffff : 0x888888);
      lbl.setAlpha(active ? 1 : 0.45);
      lbl.setColor(active ? "#ffd166" : "#D4B483");
    });
  }

  private layoutFixtures(): void {
    this.layoutChrome();
    this.layoutCarPicker();
    this.layoutGrid();
  }
}
