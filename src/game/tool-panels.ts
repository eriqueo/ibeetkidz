// Phaser-native satellite tool panels (My Voice / Voice Keys / Sound Pads /
// Beat Maker / Magic Pad). These replace the old React HTML modals in
// machines/tools.tsx: each is a modal Container shown inside WorkshopScene.
//
// The panels are PURE UI — they render state pushed from React (ToolModel) and
// emit intents over the EventBus. All audio + state mutation stays in React
// (Workshop.tsx listeners), so the hexagonal boundary holds and the EventBus is
// the only bridge.
import Phaser from "phaser";
import { EventBus } from "./EventBus.ts";
import { WORKSHOP_TOOL_MODAL } from "./scene-layout.ts";
import { DRUM_SOUNDS } from "../core/sound-catalog.ts";
import { MELODY_ROWS } from "../core/scale.ts";
import { STEP_COUNT, type EffectId, type ThereminWave } from "../core/types.ts";

const FONT = "'Press Start 2P', monospace";
const PANEL_BG = 0x1a140d;
const BTN_BG = 0x2a2118;
const ACCENT = 0xffd166;
const TEXT = "#e8dcc8";

/** Funny-effect tiles for My Voice (mirrors the old EFFECT_TILES presentation). */
const FX_TILES: { id: EffectId; label: string; emoji: string; color: number }[] = [
  { id: "reverse", label: "Backwards", emoji: "⏪", color: 0xff5d8f },
  { id: "pitchUp", label: "Chipmunk", emoji: "🐿️", color: 0xffd166 },
  { id: "pitchDown", label: "Monster", emoji: "👹", color: 0x8338ec },
  { id: "robot", label: "Robot", emoji: "🤖", color: 0x3a86ff },
  { id: "echo", label: "Echo", emoji: "🌀", color: 0x06d6a0 },
  { id: "reverb", label: "Big Room", emoji: "🏛️", color: 0x118ab2 },
  { id: "bitcrush", label: "Crunchy", emoji: "🎮", color: 0xef476f },
  { id: "crazy", label: "CRAZY!", emoji: "🤪", color: 0xfb5607 },
];

const WAVES: { wave: ThereminWave; label: string; emoji: string }[] = [
  { wave: "triangle", label: "Soft", emoji: "🔺" },
  { wave: "sine", label: "Smooth", emoji: "🌊" },
  { wave: "square", label: "Buzzy", emoji: "🟦" },
  { wave: "sawtooth", label: "Sharp", emoji: "🪚" },
];

/** What every tool panel needs to render, pushed from React on each change. */
export interface ToolModel {
  readonly voice: { hasClip: boolean; status: string; appliedFx: number; onHome: boolean };
  readonly keys: { hasClip: boolean; status: string; keyLabels: readonly string[]; onHome: boolean };
  readonly pads: readonly { id: string; label: string; emoji: string; color: string }[];
  readonly beat: readonly { id: string; emoji: string; cells: readonly boolean[] }[];
  readonly magic: { recording: boolean; hasClip: boolean; onHome: boolean; status: string };
  // Piano-roll editor for the selected melody lane (MELODY_ROWS × STEP_COUNT).
  readonly melody: {
    active: boolean;
    title: string;
    keyLabels: readonly string[]; // index = scale degree (0 = lowest), length MELODY_ROWS
    cells: readonly (readonly boolean[])[]; // [degree][step] → note present
  };
}

interface Box { x: number; y: number; w: number; h: number }

// ── reusable pixel button ────────────────────────────────────────────────────
class PanelButton {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private hit: Phaser.Geom.Rectangle;
  private enabled = true;

  constructor(scene: Phaser.Scene, text: string, onPress: () => void, fill = BTN_BG) {
    this.bg = scene.add.rectangle(0, 0, 10, 10, fill).setStrokeStyle(3, 0x000000);
    this.label = scene.add.text(0, 0, text, { fontFamily: FONT, fontSize: "12px", color: TEXT, align: "center" }).setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.label]);
    this.hit = new Phaser.Geom.Rectangle(-5, -5, 10, 10);
    this.container.setInteractive(this.hit, Phaser.Geom.Rectangle.Contains);
    if (this.container.input) this.container.input.cursor = "pointer";
    this.container
      .on("pointerdown", () => {
        if (!this.enabled) return;
        this.container.setScale(0.94);
        this.bg.setFillStyle(0xffffff, 0.18);
        onPress();
      })
      .on("pointerup", () => this.rest())
      .on("pointerout", () => this.rest());
  }

  private rest(): void {
    this.container.setScale(1);
    this.bg.setFillStyle(BTN_BG, 1);
  }

  place(b: Box, fontPx = 12): void {
    this.bg.setSize(b.w, b.h);
    this.hit.setTo(-b.w / 2, -b.h / 2, b.w, b.h);
    this.label.setFontSize(fontPx);
    this.label.setWordWrapWidth(b.w - 8);
    this.container.setPosition(b.x + b.w / 2, b.y + b.h / 2);
  }

  setText(t: string): void { this.label.setText(t); }
  setFill(c: number): void { this.bg.setFillStyle(c, 1); }
  setVisible(v: boolean): void { this.container.setVisible(v); }
  setEnabled(v: boolean): void {
    this.enabled = v;
    this.container.setAlpha(v ? 1 : 0.4);
  }
}

// ── base modal panel ──────────────────────────────────────────────────────────
export abstract class BaseToolPanel extends Phaser.GameObjects.Container {
  protected backdrop: Phaser.GameObjects.Rectangle;
  protected frame: Phaser.GameObjects.Rectangle;
  protected titleText: Phaser.GameObjects.Text;
  protected closeBtn: PanelButton;
  /** Inner content box (inside the frame padding), in screen px. */
  protected inner: Box = { x: 0, y: 0, w: 0, h: 0 };
  private built = false;

  constructor(scene: Phaser.Scene, title: string) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(50).setVisible(false);
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.62).setOrigin(0).setInteractive();
    this.frame = scene.add.rectangle(0, 0, 10, 10, PANEL_BG, 0.98).setStrokeStyle(4, ACCENT).setOrigin(0);
    this.titleText = scene.add.text(0, 0, title, { fontFamily: FONT, fontSize: "14px", color: "#ffd166" }).setOrigin(0, 0.5);
    this.closeBtn = new PanelButton(scene, "✕", () => EventBus.emit("tool-closed"));
    this.add([this.backdrop, this.frame, this.titleText, this.closeBtn.container]);
  }

  /** Position the modal over the viewport and re-flow content. */
  layout(screenW: number, screenH: number): void {
    if (!this.built) { this.buildContent(); this.built = true; }
    this.backdrop.setSize(screenW, screenH).setPosition(0, 0);
    const m = WORKSHOP_TOOL_MODAL;
    const fx = screenW * m.x, fy = screenH * m.y, fw = screenW * m.w, fh = screenH * m.h;
    this.frame.setSize(fw, fh).setPosition(fx, fy);
    const pad = Math.round(Math.min(fw, fh) * 0.05);
    const headerH = Math.round(fh * 0.12);
    this.titleText.setPosition(fx + pad, fy + headerH / 2);
    this.titleText.setFontSize(Math.max(12, Math.round(headerH * 0.42)));
    const closeSz = Math.min(headerH * 0.9, fw * 0.1);
    this.closeBtn.place({ x: fx + fw - pad - closeSz, y: fy + (headerH - closeSz) / 2, w: closeSz, h: closeSz }, Math.round(closeSz * 0.45));
    this.inner = { x: fx + pad, y: fy + headerH, w: fw - pad * 2, h: fh - headerH - pad };
    this.layoutContent();
  }

  protected abstract buildContent(): void;
  protected abstract layoutContent(): void;
  abstract apply(model: ToolModel): void;
}

// ── My Voice ──────────────────────────────────────────────────────────────────
export class VoiceToolPanel extends BaseToolPanel {
  private recordBtn!: PanelButton;
  private status!: Phaser.GameObjects.Text;
  private fxBtns: { id: EffectId; btn: PanelButton }[] = [];
  private sendBeat!: PanelButton;
  private sendNotes!: PanelButton;

  constructor(scene: Phaser.Scene) { super(scene, "🎤 My Voice"); }

  protected buildContent(): void {
    this.recordBtn = new PanelButton(this.scene, "🎤 HOLD TO RECORD", () => {}, 0x7a2540);
    // Hold-to-record: emit on the raw down/up of the button container.
    this.recordBtn.container
      .on("pointerdown", () => EventBus.emit("tool-voice-record", true))
      .on("pointerup", () => EventBus.emit("tool-voice-record", false))
      .on("pointerout", () => EventBus.emit("tool-voice-record", false));
    this.status = this.scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "10px", color: TEXT, align: "center" }).setOrigin(0.5);
    this.fxBtns = FX_TILES.map((t) => ({ id: t.id, btn: new PanelButton(this.scene, `${t.emoji}\n${t.label}`, () => EventBus.emit("tool-voice-fx", t.id), t.color) }));
    this.sendBeat = new PanelButton(this.scene, "🥁 Send as Beat", () => EventBus.emit("tool-voice-send", "beat"), 0x2a5c2a);
    this.sendNotes = new PanelButton(this.scene, "🎹 Send as Notes", () => EventBus.emit("tool-voice-send", "notes"), 0x2a5c2a);
    this.add([this.recordBtn.container, this.status, ...this.fxBtns.map((f) => f.btn.container), this.sendBeat.container, this.sendNotes.container]);
  }

  protected layoutContent(): void {
    const i = this.inner;
    this.recordBtn.place({ x: i.x, y: i.y, w: i.w, h: i.h * 0.2 }, Math.max(11, i.h * 0.045));
    this.status.setPosition(i.x + i.w / 2, i.y + i.h * 0.27);
    this.status.setFontSize(Math.max(9, i.h * 0.03));
    // 4×2 FX grid in the middle band.
    const gx = i.x, gy = i.y + i.h * 0.33, gw = i.w, gh = i.h * 0.42;
    const cols = 4, rows = 2, gap = gw * 0.02;
    const cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
    this.fxBtns.forEach(({ btn }, k) => {
      const c = k % cols, r = Math.floor(k / cols);
      btn.place({ x: gx + c * (cw + gap), y: gy + r * (ch + gap), w: cw, h: ch }, Math.max(9, ch * 0.18));
    });
    const sy = i.y + i.h * 0.8, sgap = i.w * 0.04, sw = (i.w - sgap) / 2, sh = i.h * 0.16;
    this.sendBeat.place({ x: i.x, y: sy, w: sw, h: sh }, Math.max(10, sh * 0.3));
    this.sendNotes.place({ x: i.x + sw + sgap, y: sy, w: sw, h: sh }, Math.max(10, sh * 0.3));
  }

  apply(model: ToolModel): void {
    const v = model.voice;
    this.recordBtn.setText(v.hasClip ? "🎤 RECORD AGAIN" : "🎤 HOLD TO RECORD");
    this.status.setText(v.status);
    this.fxBtns.forEach(({ btn }) => btn.setVisible(v.hasClip));
    this.sendBeat.setVisible(v.hasClip);
    this.sendNotes.setVisible(v.hasClip);
    this.sendBeat.setEnabled(!v.onHome);
    this.sendNotes.setEnabled(!v.onHome);
  }
}

// ── Voice Keys ────────────────────────────────────────────────────────────────
export class VoiceKeysToolPanel extends BaseToolPanel {
  private recordBtn!: PanelButton;
  private status!: Phaser.GameObjects.Text;
  private keys: PanelButton[] = [];
  private sendBtn!: PanelButton;

  constructor(scene: Phaser.Scene) { super(scene, "🎙️ Voice Keys"); }

  protected buildContent(): void {
    this.recordBtn = new PanelButton(this.scene, "🎙️ HOLD TO SING", () => {}, 0x7a6a25);
    this.recordBtn.container
      .on("pointerdown", () => EventBus.emit("tool-keys-record", true))
      .on("pointerup", () => EventBus.emit("tool-keys-record", false))
      .on("pointerout", () => EventBus.emit("tool-keys-record", false));
    this.status = this.scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "10px", color: TEXT, align: "center" }).setOrigin(0.5);
    this.keys = Array.from({ length: MELODY_ROWS }, (_, row) =>
      new PanelButton(this.scene, "", () => EventBus.emit("tool-keys-audition", row), 0x6a5520));
    this.sendBtn = new PanelButton(this.scene, "➡️ Add to Car", () => EventBus.emit("tool-keys-send"), 0x2a5c2a);
    this.add([this.recordBtn.container, this.status, ...this.keys.map((k) => k.container), this.sendBtn.container]);
  }

  protected layoutContent(): void {
    const i = this.inner;
    this.recordBtn.place({ x: i.x, y: i.y, w: i.w, h: i.h * 0.22 }, Math.max(11, i.h * 0.05));
    this.status.setPosition(i.x + i.w / 2, i.y + i.h * 0.3);
    this.status.setFontSize(Math.max(9, i.h * 0.03));
    const ky = i.y + i.h * 0.38, kh = i.h * 0.4, n = this.keys.length, gap = i.w * 0.01;
    const kw = (i.w - gap * (n - 1)) / n;
    this.keys.forEach((k, idx) => k.place({ x: i.x + idx * (kw + gap), y: ky, w: kw, h: kh }, Math.max(9, kw * 0.3)));
    this.sendBtn.place({ x: i.x + i.w * 0.25, y: i.y + i.h * 0.84, w: i.w * 0.5, h: i.h * 0.14 }, Math.max(10, i.h * 0.035));
  }

  apply(model: ToolModel): void {
    const k = model.keys;
    this.recordBtn.setText(k.hasClip ? "🎙️ SING AGAIN" : "🎙️ HOLD TO SING");
    this.status.setText(k.status);
    this.keys.forEach((key, idx) => {
      key.setVisible(k.hasClip);
      key.setText(k.keyLabels[idx] ?? "");
    });
    this.sendBtn.setVisible(k.hasClip);
    this.sendBtn.setEnabled(!k.onHome);
  }
}

// ── Sound Pads ────────────────────────────────────────────────────────────────
export class PadsToolPanel extends BaseToolPanel {
  private pads: { id: string; btn: PanelButton }[] = [];
  private signature = "";

  constructor(scene: Phaser.Scene) { super(scene, "🥁 Sound Pads"); }

  protected buildContent(): void { /* pads built lazily in apply() */ }

  protected layoutContent(): void {
    const i = this.inner;
    const n = Math.max(1, this.pads.length);
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const gap = i.w * 0.02;
    const cw = (i.w - gap * (cols - 1)) / cols;
    const ch = (i.h - gap * (rows - 1)) / rows;
    this.pads.forEach(({ btn }, k) => {
      const c = k % cols, r = Math.floor(k / cols);
      btn.place({ x: i.x + c * (cw + gap), y: i.y + r * (ch + gap), w: cw, h: ch }, Math.max(9, ch * 0.14));
    });
  }

  apply(model: ToolModel): void {
    const sig = model.pads.map((p) => p.id).join("|");
    if (sig === this.signature) return; // pad set unchanged
    this.signature = sig;
    this.pads.forEach(({ btn }) => btn.container.destroy());
    this.pads = model.pads.map((p) => {
      const btn = new PanelButton(this.scene, `${p.emoji}\n${p.label}`, () => EventBus.emit("tool-pads-play", p.id), Phaser.Display.Color.HexStringToColor(p.color).color);
      this.add(btn.container);
      return { id: p.id, btn };
    });
    this.layoutContent();
  }
}

// ── Beat Maker ────────────────────────────────────────────────────────────────
export class BeatToolPanel extends BaseToolPanel {
  private rows: { id: string; label: Phaser.GameObjects.Text; cells: Phaser.GameObjects.Rectangle[]; on: boolean[]; color: number }[] = [];

  constructor(scene: Phaser.Scene) { super(scene, "🎛️ Beat Maker"); }

  protected buildContent(): void {
    this.rows = DRUM_SOUNDS.map((drum) => {
      const color = Phaser.Display.Color.HexStringToColor(drum.color).color;
      const label = this.scene.add.text(0, 0, drum.emoji, { fontSize: "16px" }).setOrigin(0.5);
      this.add(label);
      const cells: Phaser.GameObjects.Rectangle[] = [];
      const on: boolean[] = [];
      for (let s = 0; s < STEP_COUNT; s++) {
        const cell = this.scene.add.rectangle(0, 0, 10, 10, BTN_BG, 0.35).setStrokeStyle(1, 0x000000, 0.5).setInteractive({ useHandCursor: true });
        const step = s;
        cell.on("pointerdown", () => EventBus.emit("tool-beat-toggle", drum.assetId, step));
        this.add(cell);
        cells.push(cell);
        on.push(false);
      }
      return { id: drum.assetId, label, cells, on, color };
    });
  }

  protected layoutContent(): void {
    const i = this.inner;
    const n = this.rows.length;
    const rowH = i.h / n;
    const labelW = i.w * 0.08;
    const cellW = (i.w - labelW) / STEP_COUNT;
    const pad = Math.min(cellW, rowH) * 0.12;
    this.rows.forEach((row, r) => {
      const cy = i.y + (r + 0.5) * rowH;
      row.label.setPosition(i.x + labelW / 2, cy).setFontSize(Math.max(10, rowH * 0.5));
      row.cells.forEach((cell, s) => {
        cell.setPosition(i.x + labelW + (s + 0.5) * cellW, cy);
        cell.setSize(Math.max(2, cellW - pad), Math.max(2, rowH - pad));
      });
    });
  }

  apply(model: ToolModel): void {
    model.beat.forEach((b, r) => {
      const row = this.rows[r];
      if (!row) return;
      for (let s = 0; s < STEP_COUNT; s++) {
        const isOn = b.cells[s] ?? false;
        if (isOn !== row.on[s]) {
          row.on[s] = isOn;
          row.cells[s]?.setFillStyle(isOn ? row.color : BTN_BG, isOn ? 1 : 0.35);
        }
      }
    });
  }
}

// ── Magic Pad ─────────────────────────────────────────────────────────────────
export class MagicToolPanel extends BaseToolPanel {
  private zone!: Phaser.GameObjects.Rectangle;
  private dot!: Phaser.GameObjects.Arc;
  private hint!: Phaser.GameObjects.Text;
  private waveBtns: { wave: ThereminWave; btn: PanelButton }[] = [];
  private recordBtn!: PanelButton;
  private sendBtn!: PanelButton;
  private dragging = false;
  private zoneBox: Box = { x: 0, y: 0, w: 0, h: 0 };

  constructor(scene: Phaser.Scene) { super(scene, "✨ Magic Pad"); }

  protected buildContent(): void {
    this.zone = this.scene.add.rectangle(0, 0, 10, 10, 0x2a1f3a, 0.9).setStrokeStyle(3, 0x8338ec).setOrigin(0).setInteractive();
    this.dot = this.scene.add.circle(0, 0, 10, 0xffd166).setVisible(false);
    this.hint = this.scene.add.text(0, 0, "Drag your finger to play! ✨", { fontFamily: FONT, fontSize: "10px", color: TEXT, align: "center" }).setOrigin(0.5);
    this.zone.on("pointerdown", (p: Phaser.Input.Pointer) => { this.dragging = true; this.emitPointer("down", p); });
    this.scene.input.on("pointermove", (p: Phaser.Input.Pointer) => { if (this.dragging && this.visible) this.emitPointer("move", p); });
    this.scene.input.on("pointerup", () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.dot.setVisible(false);
      EventBus.emit("tool-magic-pointer", "up", 0, 0);
    });
    this.waveBtns = WAVES.map((w) => ({ wave: w.wave, btn: new PanelButton(this.scene, `${w.emoji}\n${w.label}`, () => EventBus.emit("tool-magic-wave", w.wave)) }));
    this.recordBtn = new PanelButton(this.scene, "🎙️ Record", () => EventBus.emit("tool-magic-record"), 0x7a2540);
    this.sendBtn = new PanelButton(this.scene, "➡️ Send to Car", () => EventBus.emit("tool-magic-send"), 0x2a5c2a);
    this.add([this.zone, this.dot, this.hint, ...this.waveBtns.map((w) => w.btn.container), this.recordBtn.container, this.sendBtn.container]);
  }

  private emitPointer(phase: "down" | "move" | "up", p: Phaser.Input.Pointer): void {
    const x = Phaser.Math.Clamp((p.x - this.zoneBox.x) / this.zoneBox.w, 0, 1);
    const y = Phaser.Math.Clamp((p.y - this.zoneBox.y) / this.zoneBox.h, 0, 1);
    this.dot.setVisible(true).setPosition(this.zoneBox.x + x * this.zoneBox.w, this.zoneBox.y + y * this.zoneBox.h);
    EventBus.emit("tool-magic-pointer", phase, x, y);
  }

  protected layoutContent(): void {
    const i = this.inner;
    // Wave selector row across the top.
    const wy = i.y, wh = i.h * 0.14, n = this.waveBtns.length, gap = i.w * 0.02;
    const ww = (i.w - gap * (n - 1)) / n;
    this.waveBtns.forEach(({ btn }, k) => btn.place({ x: i.x + k * (ww + gap), y: wy, w: ww, h: wh }, Math.max(9, wh * 0.22)));
    // XY zone fills the middle.
    this.zoneBox = { x: i.x, y: i.y + i.h * 0.18, w: i.w, h: i.h * 0.55 };
    this.zone.setSize(this.zoneBox.w, this.zoneBox.h).setPosition(this.zoneBox.x, this.zoneBox.y);
    this.hint.setPosition(this.zoneBox.x + this.zoneBox.w / 2, this.zoneBox.y + this.zoneBox.h / 2).setFontSize(Math.max(9, i.h * 0.03));
    this.dot.setRadius(Math.max(6, i.w * 0.012));
    // Record + Send row at the bottom.
    const by = i.y + i.h * 0.78, bgap = i.w * 0.04, bw = (i.w - bgap) / 2, bh = i.h * 0.16;
    this.recordBtn.place({ x: i.x, y: by, w: bw, h: bh }, Math.max(10, bh * 0.28));
    this.sendBtn.place({ x: i.x + bw + bgap, y: by, w: bw, h: bh }, Math.max(10, bh * 0.28));
  }

  apply(model: ToolModel): void {
    const m = model.magic;
    this.recordBtn.setText(m.recording ? "⏹️ Stop" : "🎙️ Record");
    this.recordBtn.setFill(m.recording ? 0xb03050 : 0x7a2540);
    this.hint.setText(m.status);
    this.sendBtn.setVisible(m.hasClip);
    this.sendBtn.setEnabled(!m.onHome);
  }
}

// ── Melody piano-roll editor ──────────────────────────────────────────────────
// A BeepBox-style grid: MELODY_ROWS pitch rows (high at top) × STEP_COUNT steps.
// Tapping a cell toggles a note at that (degree, step); React updates the lane.
export class MelodyEditorPanel extends BaseToolPanel {
  private rowLabels: Phaser.GameObjects.Text[] = [];
  // cells[r] is the visual row from the TOP (r=0 = highest degree).
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  private cellOn: boolean[][] = [];

  constructor(scene: Phaser.Scene) { super(scene, "🎹 Melody"); }

  protected buildContent(): void {
    for (let r = 0; r < MELODY_ROWS; r++) {
      const degree = MELODY_ROWS - 1 - r; // top row = highest degree
      const label = this.scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "9px", color: TEXT }).setOrigin(0.5);
      this.add(label);
      this.rowLabels.push(label);
      const rowCells: Phaser.GameObjects.Rectangle[] = [];
      const rowOn: boolean[] = [];
      for (let s = 0; s < STEP_COUNT; s++) {
        const cell = this.scene.add.rectangle(0, 0, 10, 10, BTN_BG, 0.35).setStrokeStyle(1, 0x000000, 0.4).setInteractive({ useHandCursor: true });
        const step = s;
        cell.on("pointerdown", () => {
          cell.setScale(0.85);
          EventBus.emit("tool-melody-toggle", step, degree);
        });
        cell.on("pointerup", () => cell.setScale(1));
        cell.on("pointerout", () => cell.setScale(1));
        this.add(cell);
        rowCells.push(cell);
        rowOn.push(false);
      }
      this.cells.push(rowCells);
      this.cellOn.push(rowOn);
    }
  }

  protected layoutContent(): void {
    const i = this.inner;
    const labelW = i.w * 0.1;
    const rowH = i.h / MELODY_ROWS;
    const cellW = (i.w - labelW) / STEP_COUNT;
    const pad = Math.min(cellW, rowH) * 0.12;
    for (let r = 0; r < MELODY_ROWS; r++) {
      const cy = i.y + (r + 0.5) * rowH;
      this.rowLabels[r]?.setPosition(i.x + labelW / 2, cy).setFontSize(Math.max(8, rowH * 0.32));
      for (let s = 0; s < STEP_COUNT; s++) {
        this.cells[r]?.[s]?.setPosition(i.x + labelW + (s + 0.5) * cellW, cy).setSize(Math.max(2, cellW - pad), Math.max(2, rowH - pad));
      }
    }
  }

  apply(model: ToolModel): void {
    const m = model.melody;
    this.titleText.setText(`🎹 ${m.title}`);
    for (let r = 0; r < MELODY_ROWS; r++) {
      const degree = MELODY_ROWS - 1 - r;
      this.rowLabels[r]?.setText(m.keyLabels[degree] ?? "");
      for (let s = 0; s < STEP_COUNT; s++) {
        const isOn = m.cells[degree]?.[s] ?? false;
        if (isOn !== this.cellOn[r]?.[s]) {
          this.cellOn[r]![s] = isOn;
          this.cells[r]?.[s]?.setFillStyle(isOn ? 0x06d6a0 : BTN_BG, isOn ? 1 : 0.35);
        }
      }
    }
  }
}
