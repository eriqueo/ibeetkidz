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
import { UI_ATLAS_KEY, UI_SPRITES, hasUiFrame, placeUiSprite, soundIconFrame, type UiSpriteDef } from "./ui-sprites.ts";
import { LANE_GROUP_SPRITE } from "./livery-style.ts";
import { DRUM_SOUNDS } from "../core/sound-catalog.ts";
import { MELODY_ROWS } from "../core/scale.ts";
import { MAX_LAYERS, STEP_COUNT, type EffectId, type ThereminWave } from "../core/types.ts";

export const FONT = "'Press Start 2P', monospace";
// Charter: light "paper" panels with dark text (the old flat near-black
// modals read as debug UI next to the steampunk chrome). Parchment face,
// dark-plum edge + hard offset shadow, plum body text; buttons stay dark
// keycaps (same contrast pairing as the parchment header's plaques).
// Exported: the Track's send panel speaks the same language.
export const PANEL_BG = 0xe9d7ac;
export const PANEL_EDGE = 0x2b2440;
const BTN_BG = 0x2a2118;
const TEXT = "#e8dcc8";
export const INK = "#2b2440";

/**
 * AR-056's painted icon frame for a voice effect, derived from the effect id.
 *
 * `pitchUp` → `fx-pitch-up`, and so on: the art was named off the same ids, so
 * deriving beats a table for the same reason `soundIconFrame` does — a table
 * would be a second copy of `EffectId` and would rot the first time one is
 * added. The drawing site checks the atlas; a missing icon keeps its emoji.
 */
function fxIconFrame(id: string): string {
  return `fx-${id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Press Start 2P metrics, as multiples of the font size. Its advance measures
 *  exactly 1.0 em in-browser at every size; the 1.06 buys margin for the emoji
 *  that share these labels, which are wider than the pixel glyphs around them.
 *  Used to fit button text without measuring — see `PanelButton.place`. */
const FONT_ADVANCE_EM = 1.06;
const FONT_LINE_EM = 1.45;

/** Dark ink on light button fills, cream on dark ones. */
function labelColorFor(fill: number): string {
  const r = (fill >> 16) & 0xff, g = (fill >> 8) & 0xff, b = fill & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.45 ? INK : TEXT;
}

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
  readonly pads: readonly {
    id: string;
    label: string;
    emoji: string;
    color: string;
    /** Instrument family — the shelf this pad sits on. Matches `LaneGroup`. */
    group: "drum" | "tone" | "voice";
    /** Big numeral shown INSTEAD of the emoji, for pads whose emoji is identical
     *  across the whole shelf (every recording is a 🎤). Empty = use the emoji. */
    badge: string;
    /** Is this sound already a lane in the active car? */
    inCar: boolean;
  }[];
  /** The car has as many lanes as the chalkboard can show — a further pad tap
   *  auditions but cannot land. The panel says so rather than going quiet. */
  readonly padsFull: boolean;
  /** The percussion editor: the car's REAL drum lanes, one row each. The old
   *  Beat Maker drew ten fixed rows over synthetic `beat-*` lanes that were
   *  not the car's lanes at all — a second, parallel percussion surface, which
   *  is exactly what Eric called "a meta instrument, I don't get it". */
  readonly percussion: {
    readonly rows: readonly {
      id: string;
      emoji: string;
      /** AR-054 icon frame for the row's built-in sound (`soundIconFrame`), or
       *  null for a recorded lane, which has no built-in sound to picture. */
      icon: string | null;
      color: string;
      cells: readonly boolean[];
      muted: boolean;
    }[];
    /** Lane cap not reached — the add-a-drum strip greys out when false. */
    readonly canAdd: boolean;
  };
  readonly magic: { recording: boolean; hasClip: boolean; onHome: boolean; status: string };
  // Instrument editor for the selected melody lane (MELODY_ROWS × STEP_COUNT).
  readonly melody: {
    active: boolean;
    title: string;
    keyLabels: readonly string[]; // index = scale degree (0 = lowest), length MELODY_ROWS
    cells: readonly (readonly boolean[])[]; // [degree][step] → note present
    doubles: readonly (readonly boolean[])[]; // [degree][step] → note rolls (×2 fill)
    // The control deck (AR-016 panel-editor): silliness knobs + level fader.
    wobble: number; // 0..1
    crunch: number; // 0..1
    volume: number; // 0..1
  };
}

interface Box { x: number; y: number; w: number; h: number }

// ── reusable pixel button ────────────────────────────────────────────────────
export class PanelButton {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private hit: Phaser.Geom.Rectangle;
  private enabled = true;
  /** AR-054's painted keycap + its sound icon, when the caller asked for the
   *  authored face and the atlas has the art. Both null on the plain button. */
  private face: Phaser.GameObjects.Image | null = null;
  private faceDef: UiSpriteDef | null = null;
  private icon: Phaser.GameObjects.Image | null = null;

  private fill: number;

  constructor(
    scene: Phaser.Scene,
    text: string,
    onPress: () => void,
    fill = BTN_BG,
    // A painted FACE replaces the flat colour rectangle. `pad-key` is AR-054's
    // neutral keycap, tinted with the same `fill` the rectangle wore so a sound
    // keeps its colour identity; AR-057's `btn-panel-close` / `btn-panel-done`
    // are authored controls that carry their own colour and are not tinted.
    opts: { face?: string; tintFace?: boolean; bakedLabel?: boolean; icon?: string | null } = {},
  ) {
    this.fill = fill;
    this.bg = scene.add.rectangle(0, 0, 10, 10, fill).setStrokeStyle(3, PANEL_EDGE);
    this.label = scene.add.text(0, 0, text, { fontFamily: FONT, fontSize: "12px", color: labelColorFor(fill), align: "center" }).setOrigin(0.5);
    const kids: Phaser.GameObjects.GameObject[] = [this.bg];
    const faceDef = opts.face ? UI_SPRITES[opts.face] : undefined;
    if (faceDef && hasUiFrame(scene, faceDef.base)) {
      this.faceDef = faceDef;
      this.bg.setVisible(false);
      this.face = scene.add.image(0, 0, UI_ATLAS_KEY, faceDef.base).setOrigin(0.5);
      if (opts.tintFace) this.face.setTint(fill);
      kids.push(this.face);
      // A face that paints its own word does not want the engine's copy of it
      // on top. The caller still passes the text, because it is what the button
      // says when the art has not loaded — the same greybox-then-art seam as
      // everywhere else, and the reason this is a flag rather than an empty
      // string at the call site.
      if (opts.bakedLabel) this.label.setText("");
    }
    kids.push(this.label);
    if (hasUiFrame(scene, opts.icon)) {
      this.icon = scene.add.image(0, 0, UI_ATLAS_KEY, opts.icon!).setOrigin(0.5);
      kids.push(this.icon);
      // The icon IS the label for a non-reader; the emoji it replaces would
      // just sit on top of it.
      this.label.setText("");
    }
    this.container = scene.add.container(0, 0, kids);
    this.hit = new Phaser.Geom.Rectangle(-5, -5, 10, 10);
    this.container.setInteractive(this.hit, Phaser.Geom.Rectangle.Contains);
    if (this.container.input) this.container.input.cursor = "pointer";
    this.container
      .on("pointerdown", () => {
        if (!this.enabled) return;
        this.container.setScale(0.94);
        // The pressed art IS the feedback, so no wash over it. A keycap calls
        // that state `seated` (it drops into its socket) and a plaque calls it
        // `pressed`; either way it is the one frame that is not the base.
        if (this.face) this.face.setFrame(this.pressedFrame());
        else this.bg.setFillStyle(0xffffff, 0.18);
        onPress();
      })
      .on("pointerup", () => this.rest())
      .on("pointerout", () => this.rest());
  }

  /** The face's pressed-looking state, whatever this sprite calls it. */
  private pressedFrame(): string {
    const s = this.faceDef?.states ?? {};
    return s["pressed"] ?? s["seated"] ?? this.faceDef?.base ?? "";
  }

  private rest(): void {
    this.container.setScale(1);
    // Restore the button's OWN fill — resetting to the dark default turned
    // every coloured tile (pads / FX) permanently dark after its first tap.
    if (this.face && this.faceDef) this.face.setFrame(this.faceDef.base);
    else this.bg.setFillStyle(this.fill, 1);
  }

  place(b: Box, fontPx = 12): void {
    this.bg.setSize(b.w, b.h);
    this.hit.setTo(-b.w / 2, -b.h / 2, b.w, b.h);
    // FIT THE TEXT TO THE BUTTON, rather than to the button's height alone.
    //
    // The caller passes a size derived from the tile height, and Press Start 2P
    // is a fixed-width pixel face with no narrow glyphs and no way to break a
    // long word — so "Backwards" in a tile a third as wide as that word ran
    // straight out through both sides and across its neighbours. That is most
    // of what made the My Voice effect rack look broken.
    //
    this.container.setPosition(b.x + b.w / 2, b.y + b.h / 2);
    // The FACE goes first, because it decides how much room the text has. A
    // keycap is square art contain-fitted into the slot, so in a wide slot the
    // visible key is narrower than the box — text fitted to the box then ran
    // off both sides of the key it was sitting on.
    if (this.face && this.faceDef) placeUiSprite(this.face, this.faceDef, { x: 0, y: 0, width: b.w, height: b.h });
    const faceW = this.face ? this.face.displayWidth * 0.86 : b.w;
    const faceH = this.face ? this.face.displayHeight * 0.86 : b.h;

    // Computed from the LONGEST LINE, not measured off the Text object. The
    // measuring version of this was written first and was wrong on the only run
    // that matters: a panel lays out before the webfont finishes loading, so it
    // measured the browser's FALLBACK face, fitted to that, and then Press
    // Start 2P arrived and overflowed anyway. Arithmetic over the string cannot
    // be fooled by which font happens to be resident.
    //
    // Press Start 2P is fixed-width with a one-em advance (measured in-browser,
    // exactly 1.0 at every size), so a line is `chars * size` wide and a row is
    // about 1.45 em tall — same answer before and after the font loads.
    const pad = Math.max(8, Math.min(faceW, faceH) * 0.12);
    const lines = this.label.text.split("\n");
    const cols = Math.max(1, ...lines.map((l) => l.length));
    const fit = Math.min(
      fontPx,
      (faceW - pad) / (cols * FONT_ADVANCE_EM),
      (faceH - pad) / (lines.length * FONT_LINE_EM),
    );
    this.label.setFontSize(Math.max(7, Math.floor(fit)));
    this.label.setWordWrapWidth(faceW - pad);
    // Inside the keycap's face, not filling it — the socket's bevel has to stay
    // visible or the raised/seated states stop reading.
    if (this.icon) {
      const d = Math.min(b.w, b.h) * 0.62;
      this.icon.setDisplaySize(d, d).setPosition(0, 0);
    }
  }

  setText(t: string): void { this.label.setText(t); }
  setFill(c: number): void {
    this.fill = c;
    this.bg.setFillStyle(c, 1);
    this.label.setColor(labelColorFor(c));
  }
  setVisible(v: boolean): void { this.container.setVisible(v); }
  setEnabled(v: boolean): void {
    this.enabled = v;
    this.container.setAlpha(v ? 1 : 0.4);
  }
}

// ── base modal panel ──────────────────────────────────────────────────────────
export abstract class BaseToolPanel extends Phaser.GameObjects.Container {
  protected backdrop: Phaser.GameObjects.Rectangle;
  protected shadow: Phaser.GameObjects.Rectangle;
  protected frame: Phaser.GameObjects.Rectangle;
  protected titleText: Phaser.GameObjects.Text;
  protected closeBtn: PanelButton;
  /**
   * The one way out of every machine.
   *
   * Each tool used to end differently — Voice Keys said "Add to Car", the Magic
   * Pad said "Send to Car", the drum grid said nothing at all and left the ✕ in
   * the corner as the only exit. Three tools, three finishing moves, none of
   * them in the same place. A four-year-old learns ONE gesture for "I'm done
   * with this machine", so there is one button, with one word on it, in the
   * same slot on every panel, and what it commits is the panel's business.
   */
  protected doneBtn: PanelButton;
  /** Inner content box (inside the frame padding), in screen px. */
  protected inner: Box = { x: 0, y: 0, w: 0, h: 0 };
  private built = false;
  /** The painted machine face (AR-050/AR-051), once `mountPlate` finds it. */
  protected plateImg?: Phaser.GameObjects.Image | undefined;
  private plateDef?: UiSpriteDef | undefined;
  private plateHeightScale = 1;

  constructor(scene: Phaser.Scene, title: string) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(50).setVisible(false);
    this.backdrop = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.62).setOrigin(0).setInteractive();
    // Parchment plate with a dark-plum edge and a hard offset drop shadow —
    // the charter's paper-panel language (no gradients, no glow).
    this.shadow = scene.add.rectangle(0, 0, 10, 10, PANEL_EDGE, 0.55).setOrigin(0);
    this.frame = scene.add.rectangle(0, 0, 10, 10, PANEL_BG, 1).setStrokeStyle(4, PANEL_EDGE).setOrigin(0);
    this.titleText = scene.add.text(0, 0, title, { fontFamily: FONT, fontSize: "14px", color: INK }).setOrigin(0, 0.5);
    // AR-057's authored pair: a recessed brass-ringed ✕ socket and a wide green
    // DONE plaque, both carrying their own baked label and their own colour, so
    // neither is tinted. They briefly wore the drum keycap as a stand-in; the
    // ✕ looked right and DONE did not, because a square keycap contain-fitted
    // into a wide slot shrinks to a small square with the word hanging off both
    // ends of it. The real plaque is drawn wide, which is why it can be.
    this.closeBtn = new PanelButton(scene, "✕", () => EventBus.emit("tool-closed"), 0x7a2540, { face: "btn-panel-close", bakedLabel: true });
    this.doneBtn = new PanelButton(scene, "DONE", () => this.onDone(), 0x2a5c2a, { face: "btn-panel-done", bakedLabel: true });
    this.add([this.backdrop, this.shadow, this.frame, this.titleText, this.closeBtn.container, this.doneBtn.container]);
  }

  /** What DONE means for this tool. The default is the honest one: a panel that
   *  edits the car's lanes live has nothing left to commit, so finishing IS
   *  closing. Tools holding an uncommitted take override this to send it. */
  protected onDone(): void {
    EventBus.emit("tool-closed");
  }

  /** Position the modal over the viewport and re-flow content. */
  layout(screenW: number, screenH: number): void {
    if (!this.built) { this.buildContent(); this.built = true; }
    this.backdrop.setSize(screenW, screenH).setPosition(0, 0);
    const m = WORKSHOP_TOOL_MODAL;
    const fx = screenW * m.x, fy = screenH * m.y, fw = screenW * m.w, fh = screenH * m.h;
    const drop = Math.max(4, Math.round(fh * 0.012));
    this.shadow.setSize(fw, fh).setPosition(fx + drop, fy + drop);
    this.frame.setSize(fw, fh).setPosition(fx, fy);
    const pad = Math.round(Math.min(fw, fh) * 0.05);
    const headerH = Math.round(fh * 0.12);
    this.titleText.setPosition(fx + pad, fy + headerH / 2);
    this.titleText.setFontSize(Math.max(12, Math.round(headerH * 0.42)));
    const closeSz = Math.min(headerH * 0.9, fw * 0.1);
    this.closeBtn.place({ x: fx + fw - pad - closeSz, y: fy + (headerH - closeSz) / 2, w: closeSz, h: closeSz }, Math.round(closeSz * 0.45));
    this.placeDone(fx + fw / 2, fy + fh, fw);
    this.inner = { x: fx + pad, y: fy + headerH, w: fw - pad * 2, h: fh - headerH - pad };
    this.layoutContent();
  }

  /** DONE hangs just BELOW the machine, centred — the same place and the same
   *  gesture as the conductor chalkboard's own DONE chip, so "finished" looks
   *  identical everywhere in the Workshop. */
  private placeDone(cx: number, bottomY: number, width: number): void {
    const w = Math.max(190, width * 0.26);
    const h = Math.max(66, width * 0.085);
    this.doneBtn.place({ x: cx - w / 2, y: bottomY + h * 0.22, w, h }, Math.round(h * 0.34));
  }

  /**
   * Swap the generic parchment for a painted machine face.
   *
   * Four tools have one now (AR-050's drum plate, AR-051's voice / keys / magic
   * plates) and every one of them needs the identical four moves: hide the
   * parchment and its drop shadow, lift the title off the dark steel, mount the
   * art, and expose where its recesses landed. That was written once per panel
   * until this existed; the second copy is where the drift starts.
   *
   * Call from `buildContent`. A missing sprite or a cold atlas is not an error —
   * the panel simply keeps the parchment it was drawn on before the art existed.
   */
  protected mountPlate(key: string, heightScale = 1): void {
    const def = UI_SPRITES[key];
    if (!def || !hasUiFrame(this.scene, def.base)) return;
    this.frame.setVisible(false);
    this.shadow.setVisible(false);
    this.titleText.setColor("#ffd166");
    this.plateDef = def;
    this.plateHeightScale = heightScale;
    this.plateImg = this.scene.add.image(0, 0, UI_ATLAS_KEY, def.base);
    this.add(this.plateImg);
    // The plate joins the container last, so it covers everything the base
    // constructor added — and `placePlate` moves the header ONTO the plate.
    this.bringToTop(this.titleText);
    this.bringToTop(this.closeBtn.container);
    this.bringToTop(this.doneBtn.container);
  }

  /**
   * Lay the mounted plate over the modal frame and return a mapper from the
   * plate's own normalized coordinates to screen boxes — so a panel says where
   * a control goes in the coordinates the art was MEASURED in, and the contain
   * fit stops being every panel's arithmetic.
   *
   * Null when no plate is mounted: the caller then falls back to its
   * proportional layout inside `inner`, which is what it did before the art.
   */
  protected placePlate(): ((r: PlateRegion) => Box) | null {
    const img = this.plateImg;
    const def = this.plateDef;
    if (!img || !def) return null;
    const f = this.frame; // laid out by `layout` just before `layoutContent`
    placeUiSprite(img, def, {
      x: f.x + f.width / 2,
      y: f.y + f.height / 2,
      width: f.width,
      height: f.height * this.plateHeightScale,
    });
    const left = img.x - (img.width / 2) * img.scaleX;
    const top = img.y - (img.height / 2) * img.scaleY;
    const iw = img.width * img.scaleX;
    const ih = img.height * img.scaleY;
    // Re-anchor the header to the PLATE. `layout` put the title and ✕ on the
    // parchment frame's corners, and a contain-fitted plate is narrower than
    // that frame — so both were left stranded out on the dark backdrop, the
    // title half-hidden behind the plate's own edge.
    const inset = iw * 0.03;
    this.titleText.setX(left + inset);
    const sz = Math.min(ih * 0.1, iw * 0.09);
    this.closeBtn.place({ x: left + iw - inset - sz, y: this.titleText.y - sz / 2, w: sz, h: sz }, Math.round(sz * 0.45));
    this.placeDone(left + iw / 2, top + ih, iw);
    return (r) => ({
      x: left + r.x0 * iw,
      y: top + r.y0 * ih,
      w: (r.x1 - r.x0) * iw,
      h: (r.y1 - r.y0) * ih,
    });
  }

  protected abstract buildContent(): void;
  protected abstract layoutContent(): void;
  abstract apply(model: ToolModel): void;
}

/** A rectangle on a plate, normalized to the plate's OWN canvas — the space the
 *  recesses were measured in, straight off the delivered PNG. */
interface PlateRegion { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

/** Split a plate region into an `cols`×`rows` grid of boxes, in reading order.
 *  Shared by every plate whose art is a rack of matching recesses. */
function gridIn(b: Box, cols: number, rows: number, gapFrac = 0.02): Box[] {
  const gx = b.w * gapFrac;
  const gy = b.h * gapFrac;
  const cw = (b.w - gx * (cols - 1)) / cols;
  const ch = (b.h - gy * (rows - 1)) / rows;
  return Array.from({ length: cols * rows }, (_, k) => ({
    x: b.x + (k % cols) * (cw + gx),
    y: b.y + Math.floor(k / cols) * (ch + gy),
    w: cw,
    h: ch,
  }));
}

// ── My Voice ──────────────────────────────────────────────────────────────────
export class VoiceToolPanel extends BaseToolPanel {
  /** AR-051's recorder-machine face. Regions measured off the delivered PNG
   *  (1536×1152): the mic record bay, the rivet rail its status reads on, the
   *  4×2 FX rack, and the two send bays under it. */
  private static readonly PLATE = {
    // Right of the painted microphone, which is the bay's own icon — a button
    // face across the whole bay would cover the one picture that says "record".
    record: { x0: 0.285, y0: 0.135, x1: 0.832, y1: 0.275 },
    statusY: 0.318,
    fx: { x0: 0.126, y0: 0.359, x1: 0.876, y1: 0.766 },
    sendA: { x0: 0.105, y0: 0.786, x1: 0.491, y1: 0.9 },
    sendB: { x0: 0.52, y0: 0.786, x1: 0.903, y1: 0.9 },
  } as const;

  private recordBtn!: PanelButton;
  private status!: Phaser.GameObjects.Text;
  private fxBtns: { id: EffectId; btn: PanelButton }[] = [];
  private sendBeat!: PanelButton;
  private sendNotes!: PanelButton;

  constructor(scene: Phaser.Scene) { super(scene, "🎤 My Voice"); }

  protected buildContent(): void {
    this.mountPlate("panel-voice");
    this.recordBtn = new PanelButton(this.scene, "🎤 HOLD TO RECORD", () => {}, 0x7a2540);
    // Hold-to-record: emit on the raw down/up of the button container.
    this.recordBtn.container
      .on("pointerdown", () => EventBus.emit("tool-voice-record", true))
      .on("pointerup", () => EventBus.emit("tool-voice-record", false))
      .on("pointerout", () => EventBus.emit("tool-voice-record", false));
    // Ink on parchment, cream on steel — the plate's field is dark.
    this.status = this.scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "10px", color: this.plateImg ? TEXT : INK, align: "center" }).setOrigin(0.5);
    // The effect rack wears the SAME keycap the drum shelf does. Eight flat
    // neon rectangles were the loudest thing on a painted steel plate and read
    // as stickers stuck to the machine; the keycap is neutral art the engine
    // tints, so each effect keeps its colour and stops fighting the plate.
    this.fxBtns = FX_TILES.map((t) => ({
      id: t.id,
      btn: new PanelButton(this.scene, `${t.emoji}\n${t.label}`, () => EventBus.emit("tool-voice-fx", t.id), t.color, { face: "pad-key", tintFace: true, icon: fxIconFrame(t.id) }),
    }));
    // NOT two "done" buttons — a CHOICE of what the recording becomes, which is
    // the one thing DONE cannot decide for the kid. Labelled as a pick ("make
    // it a…") rather than as two rival ways to finish, so the single DONE below
    // stays the only way out of every machine.
    this.sendBeat = new PanelButton(this.scene, "🥁 MAKE A BEAT", () => EventBus.emit("tool-voice-send", "beat"), 0x2a5c2a);
    this.sendNotes = new PanelButton(this.scene, "🎹 MAKE NOTES", () => EventBus.emit("tool-voice-send", "notes"), 0x2a5c2a);
    this.add([this.recordBtn.container, this.status, ...this.fxBtns.map((f) => f.btn.container), this.sendBeat.container, this.sendNotes.container]);
  }

  protected layoutContent(): void {
    const i = this.inner;
    const at = this.placePlate();
    const P = VoiceToolPanel.PLATE;
    // The plate's recesses, or the proportional bands the parchment used before
    // the art existed. Same five boxes either way — only the source differs.
    const rec = at ? at(P.record) : { x: i.x, y: i.y, w: i.w, h: i.h * 0.2 };
    const statusY = at ? at({ ...P.record, y0: P.statusY, y1: P.statusY }).y : i.y + i.h * 0.27;
    const fx = at ? at(P.fx) : { x: i.x, y: i.y + i.h * 0.33, w: i.w, h: i.h * 0.42 };
    const sgap = i.w * 0.04, sw = (i.w - sgap) / 2, sh = i.h * 0.16, sy = i.y + i.h * 0.8;
    const sendA = at ? at(P.sendA) : { x: i.x, y: sy, w: sw, h: sh };
    const sendB = at ? at(P.sendB) : { x: i.x + sw + sgap, y: sy, w: sw, h: sh };

    this.recordBtn.place(rec, Math.max(11, rec.h * 0.22));
    this.status.setPosition(i.x + i.w / 2, statusY).setFontSize(Math.max(9, i.h * 0.03));
    gridIn(fx, 4, 2).forEach((b, k) => this.fxBtns[k]?.btn.place(b, Math.max(9, b.h * 0.18)));
    this.sendBeat.place(sendA, Math.max(10, sendA.h * 0.3));
    this.sendNotes.place(sendB, Math.max(10, sendB.h * 0.3));
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
  /** AR-051's vocal-keyboard face. Regions measured off the delivered PNG
   *  (1536×1152): record bay (right of its painted mic), status rail, the eight
   *  tall key recesses, and the wide send bay across the bottom. */
  private static readonly PLATE = {
    record: { x0: 0.285, y0: 0.14, x1: 0.832, y1: 0.278 },
    statusY: 0.322,
    keys: { x0: 0.118, y0: 0.364, x1: 0.884, y1: 0.772 },
    send: { x0: 0.135, y0: 0.788, x1: 0.868, y1: 0.888 },
  } as const;

  private recordBtn!: PanelButton;
  private status!: Phaser.GameObjects.Text;
  private keys: PanelButton[] = [];
  /** Whether DONE has a take to commit, from the last `apply`. */
  private pending = false;

  constructor(scene: Phaser.Scene) { super(scene, "🎙️ Voice Keys"); }

  protected buildContent(): void {
    this.mountPlate("panel-keys");
    this.recordBtn = new PanelButton(this.scene, "🎙️ HOLD TO SING", () => {}, 0x7a6a25);
    this.recordBtn.container
      .on("pointerdown", () => EventBus.emit("tool-keys-record", true))
      .on("pointerup", () => EventBus.emit("tool-keys-record", false))
      .on("pointerout", () => EventBus.emit("tool-keys-record", false));
    this.status = this.scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "10px", color: this.plateImg ? TEXT : INK, align: "center" }).setOrigin(0.5);
    this.keys = Array.from({ length: MELODY_ROWS }, (_, row) =>
      new PanelButton(this.scene, "", () => EventBus.emit("tool-keys-audition", row), 0x6a5520));
    this.add([this.recordBtn.container, this.status, ...this.keys.map((k) => k.container)]);
  }

  /** Voice Keys holds an uncommitted take, so finishing sends it to the car —
   *  which is exactly what its old "➡️ Add to Car" button did, now under the
   *  word every other machine uses. */
  protected override onDone(): void {
    if (this.pending) EventBus.emit("tool-keys-send");
    EventBus.emit("tool-closed");
  }

  protected layoutContent(): void {
    const i = this.inner;
    const at = this.placePlate();
    const P = VoiceKeysToolPanel.PLATE;
    const rec = at ? at(P.record) : { x: i.x, y: i.y, w: i.w, h: i.h * 0.22 };
    const statusY = at ? at({ ...P.record, y0: P.statusY, y1: P.statusY }).y : i.y + i.h * 0.3;
    const keys = at ? at(P.keys) : { x: i.x, y: i.y + i.h * 0.38, w: i.w, h: i.h * 0.4 };

    this.recordBtn.place(rec, Math.max(11, rec.h * 0.22));
    this.status.setPosition(i.x + i.w / 2, statusY).setFontSize(Math.max(9, i.h * 0.03));
    gridIn(keys, this.keys.length, 1, 0.012).forEach((b, idx) =>
      this.keys[idx]?.place(b, Math.max(9, b.w * 0.3)));
  }

  apply(model: ToolModel): void {
    const k = model.keys;
    this.recordBtn.setText(k.hasClip ? "🎙️ SING AGAIN" : "🎙️ HOLD TO SING");
    this.status.setText(k.status);
    this.keys.forEach((key, idx) => {
      key.setVisible(k.hasClip);
      key.setText(k.keyLabels[idx] ?? "");
    });
    this.pending = k.hasClip && !k.onHome;
  }
}

// ── Sound Pads ────────────────────────────────────────────────────────────────
//
// The sound LIBRARY: every built-in sound plus the newest bounded shelf of the
// child's recordings. Tapping a pad hears it AND puts it in the car (see
// `onPadsPlay` in Workshop.tsx for why that is the tool's job).
//
// Three things this panel has to do that the old flat grid did not:
//
//   1. GROUP. ~34 undifferentiated pads is not a menu a four-year-old can read,
//      and the built-in pack's per-sound colours collide across families (Do is
//      the same blue as Ding, Mi the same pink as Snap). `core/lane-color.ts`
//      already states the rule — the mix reads by colour = KIND — so the pads
//      are shelved by family, each shelf headed by the character sprite that
//      owns it, and the shelf is where the family colour lives.
//   2. SHOW THE OUTCOME. The panel covers the chalkboard, so a lane landing
//      behind it is invisible. Each pad shows whether its sound is in the car.
//   3. BE PRESSABLE. The old pads were flat `Rectangle`s whose whole label —
//      emoji included — was rendered in Press Start 2P at ~12px, which makes the
//      emoji an unreadable speck and the pixel font the only thing carrying the
//      sound's identity. The glyph is now drawn in the system font at pad scale
//      (the same thing `BeatToolPanel` does for its row icons) with the word
//      kept underneath, so a pre-reader has a picture and a reader has a name.
//
// Drawn with Graphics in the scene's established chip language — cream/plum,
// rounded, hard offset shadow, no gradients — the same treatment `undo-toast.ts`
// and the LCD chips use. Painted keycap art is requested as AR-025; this is the
// honest interim, not a permanent choice.

/** Pads per row, on every shelf. Six makes the tone shelf exactly one row —
 *  Do·Re·Mi·Sol·La·Do! reads as the scale it is — and splits the ten drums into
 *  a full row and a part row. */
const PAD_COLS = 6;
/** Most recordings shown on the YOUR SOUNDS shelf. Past this the pads would
 *  shrink below a thumb; the clips are still in the project, just not all on the
 *  shelf at once. */
const PADS_PER_SHELF = 12;

/** The shelves, in draw order. Built-ins first so the layout a kid learns does
 *  not reshuffle every time they record something. */
// `sprite` is DERIVED from `LANE_GROUP_SPRITE`, not restated: "which picture
// means drums" is one fact, and the Yard's car loads now draw the same set.
const PAD_SHELVES: readonly {
  group: "drum" | "tone" | "voice";
  title: string;
  sprite: string;
  empty: string;
}[] = [
  { group: "drum", title: "DRUMS", sprite: LANE_GROUP_SPRITE.drum, empty: "" },
  { group: "tone", title: "NOTES", sprite: LANE_GROUP_SPRITE.tone, empty: "" },
  { group: "voice", title: "YOUR SOUNDS", sprite: LANE_GROUP_SPRITE.voice, empty: "Record one with the mic or the magic pad!" },
];

const PAD_GOLD = 0xffd166;

/** One sound, as a pressable keycap. Deliberately NOT a `PanelButton`: that
 *  class is shared with My Voice / Voice Keys / Magic Pad, and restyling it
 *  would restyle them too. */
class PadKey {
  readonly container: Phaser.GameObjects.Container;
  private readonly chip: Phaser.GameObjects.Graphics;
  private readonly glyph: Phaser.GameObjects.Text;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly tick: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };
  private inCar = false;

  constructor(scene: Phaser.Scene, private readonly fill: number, glyph: string, label: string, onPress: () => void) {
    this.chip = scene.add.graphics();
    // No fontFamily: Press Start 2P carries no emoji glyphs, so an emoji set in
    // it renders as tofu or a speck. The system font is what `BeatToolPanel`
    // already uses for exactly this reason.
    this.glyph = scene.add.text(0, 0, glyph, { fontSize: "24px", align: "center" }).setOrigin(0.5);
    this.caption = scene.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: "9px", color: labelColorFor(fill), align: "center" })
      .setOrigin(0.5);
    this.tick = scene.add.text(0, 0, "✓", { fontFamily: FONT, fontSize: "10px", color: "#2b2440" }).setOrigin(0.5).setVisible(false);
    this.hit = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setInteractive({ useHandCursor: true });
    // Fire on PRESS, matching `PanelButton`: a pad is a drum head, and a sound
    // that waits for the release feels broken. A press cannot leak in from
    // elsewhere the way a release can, so this needs no arming.
    this.hit.on("pointerdown", () => { this.container.setScale(0.94); onPress(); });
    this.hit.on("pointerup", () => this.container.setScale(1));
    this.hit.on("pointerout", () => this.container.setScale(1));
    this.container = scene.add.container(0, 0, [this.chip, this.glyph, this.caption, this.tick, this.hit]);
  }

  /** Give the live hit target a stable production-E2E identity. */
  setName(name: string): this {
    this.hit.setName(name);
    return this;
  }

  /** Is this sound already a lane in the car? Seats the keycap and lights it. */
  setInCar(v: boolean): void {
    if (v === this.inCar) return;
    this.inCar = v;
    this.redraw();
  }

  place(b: Box): void {
    this.box = b;
    this.container.setPosition(b.x + b.w / 2, b.y + b.h / 2);
    // Off the SHORT side, so a wide slot gives a big glyph rather than a wide
    // one — these are picture-first controls for a child who cannot read.
    const glyphPx = Math.max(14, Math.round(Math.min(b.w * 0.46, b.h * 0.46)));
    this.glyph.setFontSize(glyphPx);
    // Long names ("Voice Keys 1") wrap to two lines, so the caption is sized to
    // keep two lines clear of the glyph rather than to fill one.
    this.caption
      .setFontSize(Math.max(7, Math.round(Math.min(b.w * 0.11, b.h * 0.15))))
      .setWordWrapWidth(b.w - 8);
    this.tick.setFontSize(Math.max(9, Math.round(b.h * 0.2)));
    this.hit.setSize(b.w, b.h);
    this.redraw();
  }

  private redraw(): void {
    const { w, h } = this.box;
    if (w <= 0) return;
    const rad = Math.min(h * 0.24, 14);
    const drop = Math.max(3, Math.round(h * 0.09));
    // Seated pads shift onto where their shadow was, so the content moves with
    // the face rather than floating over it.
    const dx = this.inCar ? drop / 2 : 0;
    const g = this.chip.clear();
    if (this.inCar) {
      // In the car: the keycap is pressed down into its socket, rimmed in gold,
      // and wears a tick on a gold badge. Three cues, because this is the only
      // place the outcome of a tap is visible — the panel covers the chalkboard
      // where the lane actually lands.
      const fx = -w / 2 + drop, fy = -h / 2 + drop, fw = w - drop, fh = h - drop;
      g.fillStyle(PANEL_EDGE, 0.55).fillRoundedRect(-w / 2, -h / 2, w, h, rad);
      g.fillStyle(this.fill, 1).fillRoundedRect(fx, fy, fw, fh, rad);
      g.lineStyle(Math.max(3, h * 0.07), PAD_GOLD, 1).strokeRoundedRect(fx, fy, fw, fh, rad);
      // Gold badge behind the tick: a plum tick straight on a pink or gold pad
      // is nearly invisible, and this cue has to survive a glance.
      const bs = Math.max(14, h * 0.3);
      g.fillStyle(PAD_GOLD, 1).fillRoundedRect(fx + fw - bs * 0.9, fy - bs * 0.1, bs, bs, bs * 0.3);
      g.lineStyle(2, PANEL_EDGE, 1).strokeRoundedRect(fx + fw - bs * 0.9, fy - bs * 0.1, bs, bs, bs * 0.3);
      this.tick.setVisible(true).setPosition(fx + fw - bs * 0.4, fy + bs * 0.4);
    } else {
      g.fillStyle(PANEL_EDGE, 0.45).fillRoundedRect(-w / 2 + drop, -h / 2 + drop, w, h, rad);
      g.fillStyle(this.fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, rad);
      g.lineStyle(Math.max(2, h * 0.045), PANEL_EDGE, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
      this.tick.setVisible(false);
    }
    this.glyph.setPosition(dx, -h * 0.21 + dx);
    this.caption.setPosition(dx, h * 0.28 + dx);
  }

  destroy(): void { this.container.destroy(); }
}

// The conductor's SOUNDS board chip opens this library. It remains the one
// surface that lists a kid's past recordings (the voice tools offer just the
// newest take), alongside the built-in drum and tone shelves.
export class PadsToolPanel extends BaseToolPanel {
  private pads: { id: string; group: string; key: PadKey }[] = [];
  private shelves: {
    group: string;
    icon: Phaser.GameObjects.Image;
    title: Phaser.GameObjects.Text;
    empty: Phaser.GameObjects.Text;
  }[] = [];
  private footer!: Phaser.GameObjects.Text;
  /** STRUCTURAL signature only — which pads exist, not what state they are in.
   *  In-car state changes on every tap and is applied in place; folding it in
   *  here would destroy and rebuild all ~34 pads on each press, including the
   *  one under the child's finger. */
  private signature = "";

  constructor(scene: Phaser.Scene) {
    super(scene, "🥁 Sound Pads");
    this.doneBtn.container.setName("workshop-sound:done");
  }

  protected buildContent(): void {
    this.shelves = PAD_SHELVES.map((s) => {
      const def = UI_SPRITES[s.sprite]!;
      const icon = this.scene.add.image(0, 0, UI_ATLAS_KEY, def.base);
      const title = this.scene.add.text(0, 0, s.title, { fontFamily: FONT, fontSize: "11px", color: INK }).setOrigin(0, 0.5);
      const empty = this.scene.add
        .text(0, 0, s.empty, { fontFamily: FONT, fontSize: "9px", color: "#5b5470", align: "center" })
        .setOrigin(0.5)
        .setVisible(false);
      this.add([icon, title, empty]);
      return { group: s.group, icon, title, empty };
    });
    // Says what the tool is for. The panel previously carried no instruction at
    // all, and "tap a pad to hear a noise" was the only thing it could have said.
    this.footer = this.scene.add
      .text(0, 0, "", { fontFamily: FONT, fontSize: "9px", color: INK, align: "center" })
      .setOrigin(0.5);
    this.add(this.footer);
  }

  protected layoutContent(): void {
    const i = this.inner;
    if (this.shelves.length === 0) return;
    const footerH = i.h * 0.1;
    this.footer.setPosition(i.x + i.w / 2, i.y + i.h - footerH / 2).setFontSize(Math.max(8, i.h * 0.033));

    const body = i.h - footerH;
    const headerH = body * 0.11;
    const gap = i.w * 0.014;
    const cw = (i.w - gap * (PAD_COLS - 1)) / PAD_COLS;

    // Every shelf pays for one header; the pad rows share what is left, so a
    // kid with no recordings gets bigger drums rather than a hole.
    const rowsFor = (group: string): number => {
      const n = this.pads.filter((p) => p.group === group).length;
      return n === 0 ? 1 : Math.ceil(n / PAD_COLS);
    };
    const totalRows = PAD_SHELVES.reduce((a, s) => a + rowsFor(s.group), 0);
    const rowH = (body - headerH * PAD_SHELVES.length - gap * totalRows) / Math.max(1, totalRows);
    // Keycaps, not letterboxes. A full-width column on a wide panel makes a pad
    // ~3:1, which wastes the space the glyph should be using; cap the width and
    // centre the row instead.
    const padW = Math.min(cw, rowH * 1.9);
    const rowW = padW * PAD_COLS + gap * (PAD_COLS - 1);
    const x0 = i.x + (i.w - rowW) / 2;

    let y = i.y;
    for (const shelf of this.shelves) {
      const iconDef = UI_SPRITES[PAD_SHELVES.find((s) => s.group === shelf.group)!.sprite]!;
      const iconW = headerH * 0.9;
      placeUiSprite(shelf.icon, iconDef, { x: x0 + iconW / 2, y: y + headerH / 2, width: iconW, height: headerH * 0.95 });
      shelf.title.setPosition(x0 + iconW * 1.35, y + headerH / 2).setFontSize(Math.max(9, headerH * 0.4));
      y += headerH;

      const mine = this.pads.filter((p) => p.group === shelf.group);
      const rows = rowsFor(shelf.group);
      if (mine.length === 0) {
        shelf.empty.setVisible(true).setPosition(i.x + i.w / 2, y + rowH / 2).setFontSize(Math.max(8, rowH * 0.16));
      } else {
        shelf.empty.setVisible(false);
        mine.forEach(({ key }, k) => {
          const c = k % PAD_COLS, r = Math.floor(k / PAD_COLS);
          key.place({ x: x0 + c * (padW + gap), y: y + r * (rowH + gap), w: padW, h: rowH });
        });
      }
      y += rows * (rowH + gap);
    }
  }

  apply(model: ToolModel): void {
    const shown = PAD_SHELVES.flatMap((s) => {
      const mine = model.pads.filter((p) => p.group === s.group);
      // Newest wins the shelf when a kid has recorded more than it holds.
      return mine.length > PADS_PER_SHELF ? mine.slice(-PADS_PER_SHELF) : mine;
    });
    const sig = shown.map((p) => p.id).join("|");
    if (sig !== this.signature) {
      this.signature = sig;
      this.pads.forEach(({ key }) => key.destroy());
      this.pads = shown.map((p) => {
        const key = new PadKey(
          this.scene,
          Phaser.Display.Color.HexStringToColor(p.color).color,
          p.badge || p.emoji,
          p.label,
          () => EventBus.emit("tool-pads-play", p.id),
        );
        key.setName(`workshop-sound:${p.id}`);
        this.add(key.container);
        return { id: p.id, group: p.group, key };
      });
      this.layoutContent();
    }
    // Cheap per-pad state pass — no rebuild.
    shown.forEach((p, k) => this.pads[k]?.key.setInCar(p.inCar));
    this.footer.setText(
      model.padsFull
        ? "CAR IS FULL — TAKE ONE OUT TO ADD MORE"
        : "TAP A SOUND TO PUT IT IN YOUR CAR",
    );
  }
}

// ── Percussion editor (the frog's tool) ──────────────────────────────────────
//
// One drum machine over the car's REAL drum lanes — the standard the whole
// genre converged on (BeepBox's drum channels, Chrome Music Lab's Song Maker,
// every hardware step sequencer): rows are sounds, columns are the 16 steps,
// everything the kid's percussion does is on ONE screen. What it replaced (the
// "Beat Maker") drew ten fixed rows over synthetic `beat-*` lanes that were
// NOT the car's lanes, so the frog's tool and the car's actual drums could
// disagree — the "meta instrument" confusion Eric reported.
//
// Interactions, chosen for a four-year-old:
//   • tap a cell to toggle it — same as the chalkboard;
//   • DRAG to paint: the first cell touched decides on/off and every cell the
//     finger crosses follows it (the single biggest usability win a step grid
//     can offer small fingers — one gesture lays a whole hi-hat line);
//   • each row wears the sound's own emoji, its mute, and its ✕;
//   • the strip along the bottom is the drum shelf — tap a drum to add a row.
// Everything routes through the SAME events the chalkboard already emits, so
// this panel adds zero new reducers and cannot disagree with the board.
export class PercussionToolPanel extends BaseToolPanel {
  /** AR-050's painted drum-machine plate. Regions MEASURED off the delivered
   *  PNG (1536×1152): the recessed grid field inside the wooden frame, and
   *  the ten-recess drum shelf strip — the engine controls mount INTO them.
   *  The plate's own row rail sits at 16% of the field, matching `HEAD_FRAC`. */
  // Re-measured for AR-058's redrawn machine face. `field` spans the row RAIL
  // and the grid together, because `HEAD_FRAC` splits the heads off the front
  // of it — and 0.16 of this span lands exactly on the rail the plate now
  // draws, which is what makes the ✕/icon/mute column sit in its sockets.
  private static readonly PLATE = {
    field: { x0: 0.0605, y0: 0.0868, x1: 0.9408, y1: 0.7378 },
    shelf: { x0: 0.0788, y0: 0.7934, x1: 0.9206, y1: 0.8733 },
  } as const;

  /** Empty cells are pale chalk on the plate's dark field — the parchment
   *  era's dark-plum-on-dark cells were invisible the moment AR-050 landed. */
  private static readonly CELL_OFF = 0xf6efdc;
  private static readonly CELL_OFF_ALPHA = 0.1;
  private rows: {
    id: string;
    label: Phaser.GameObjects.Text;
    /** AR-054's painted sound icon, drawn INSTEAD of the emoji label when the
     *  atlas has one for this row's sound. */
    icon: Phaser.GameObjects.Image | null;
    mute: Phaser.GameObjects.Text;
    del: Phaser.GameObjects.Text;
    cells: Phaser.GameObjects.Rectangle[];
    on: boolean[];
    muted: boolean;
    color: number;
  }[] = [];
  private rowKey = "";
  private addButtons: PanelButton[] = [];
  private hint!: Phaser.GameObjects.Text;
  /** While a paint drag is live: the state every crossed cell is set to. */
  private paintTo: boolean | null = null;

  constructor(scene: Phaser.Scene) { super(scene, "🥁 Drums"); }

  protected buildContent(): void {
    // 1.06: the plate carries its own header band above the grid field.
    this.mountPlate("panel-percussion", 1.06);
    this.hint = this.scene.add
      .text(0, 0, "TAP A DRUM BELOW TO ADD IT", { fontFamily: FONT, fontSize: "12px", color: "#e8dcc8" })
      .setOrigin(0.5);
    this.add(this.hint);
    this.addButtons = DRUM_SOUNDS.map((drum) => {
      const btn = new PanelButton(
        this.scene,
        drum.emoji,
        () => EventBus.emit("workshop-instrument-added", "drum", drum.assetId),
        Phaser.Display.Color.HexStringToColor(drum.color).color,
        // AR-054: the shelf is ten sockets in the plate, so its faces are the
        // painted keycap with the sound's own icon on it — not ten flat
        // stickers wearing system emoji next to chunky pixel art.
        { face: "pad-key", tintFace: true, icon: soundIconFrame(drum.assetId) },
      );
      this.add(btn.container);
      return btn;
    });
    // The paint drag ends wherever the finger lifts — on a cell, on the frame,
    // or off the canvas — so the release is heard scene-wide, not per cell.
    this.scene.input.on("pointerup", () => { this.paintTo = null; });
  }

  /** Rebuild the row objects for a new lane SET (add/delete). Cheap and rare;
   *  cell/mute updates go through `apply` without a rebuild. */
  private rebuildRows(model: ToolModel): void {
    this.rows.forEach((r) => {
      r.label.destroy();
      r.icon?.destroy();
      r.mute.destroy();
      r.del.destroy();
      r.cells.forEach((c) => c.destroy());
    });
    this.rows = model.percussion.rows.map((row) => {
      const color = Phaser.Display.Color.HexStringToColor(row.color).color;
      const iconFrame = row.icon;
      const icon = hasUiFrame(this.scene, iconFrame)
        ? this.scene.add.image(0, 0, UI_ATLAS_KEY, iconFrame!).setOrigin(0.5)
        : null;
      if (icon) this.add(icon);
      // Kept, and emptied, when the icon takes over: the row still needs a text
      // object for the layout to size against, and a recorded lane (no built-in
      // sound, so no painted icon) still shows its emoji here.
      const label = this.scene.add.text(0, 0, icon ? "" : row.emoji, { fontSize: "16px" }).setOrigin(0.5);
      const mute = this.scene.add.text(0, 0, "🔊", { fontSize: "14px" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const del = this.scene.add.text(0, 0, "✕", { fontFamily: FONT, fontSize: "14px", color: "#ff5d8f" }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      mute.on("pointerdown", () => EventBus.emit("workshop-layer-muted", row.id));
      del.on("pointerdown", () => EventBus.emit("workshop-layer-delete", row.id));
      this.add([label, mute, del]);
      const cells: Phaser.GameObjects.Rectangle[] = [];
      const on: boolean[] = [];
      const view = { id: row.id, label, icon, mute, del, cells, on, muted: row.muted, color };
      for (let s = 0; s < STEP_COUNT; s++) {
        const cell = this.scene.add
          .rectangle(0, 0, 10, 10, PercussionToolPanel.CELL_OFF, PercussionToolPanel.CELL_OFF_ALPHA)
          .setStrokeStyle(1, PercussionToolPanel.CELL_OFF, 0.35)
          .setInteractive({ useHandCursor: true });
        const step = s;
        const paint = (to: boolean): void => {
          if (view.on[step] === to) return;
          view.on[step] = to; // optimistic — the model echo confirms it
          cell.setFillStyle(
            to ? view.color : PercussionToolPanel.CELL_OFF,
            to ? 1 : PercussionToolPanel.CELL_OFF_ALPHA,
          );
          EventBus.emit("workshop-cell-toggled", { layerId: view.id, stepIndex: step, on: to });
        };
        cell.on("pointerdown", () => {
          this.paintTo = !view.on[step];
          paint(this.paintTo);
        });
        cell.on("pointerover", () => {
          if (this.paintTo !== null) paint(this.paintTo);
        });
        this.add(cell);
        cells.push(cell);
        on.push(false);
      }
      return view;
    });
    this.layoutContent();
  }

  protected layoutContent(): void {
    // With the painted plate: the grid mounts INTO its recessed field and the
    // pads INTO its ten shelf recesses. Without it (atlas not yet loaded),
    // the generic parchment's inner box carries the same proportions.
    let grid: Box;
    let shelf: Box;
    const at = this.placePlate();
    if (at) {
      const P = PercussionToolPanel.PLATE;
      grid = at(P.field);
      shelf = at(P.shelf);
    } else {
      const i = this.inner;
      const shelfH = i.h * 0.16;
      grid = { x: i.x, y: i.y, w: i.w, h: i.h - shelfH };
      shelf = { x: i.x, y: i.y + i.h - shelfH, w: i.w, h: shelfH };
    }

    // One row per LANE the car can hold, so a full car fills the field exactly.
    //
    // Tried aligning to the plate's painted rail sockets instead, and it is the
    // wrong trade: AR-058 draws NINE of them against a cap of six, so the pitch
    // came out a third too small and the drum icon in each head shrank to about
    // 45px of a 2560-wide stage — too small for the four-year-old who has to
    // hit it. A tappable row that does not line up with a decorative socket
    // beats a tidy row nobody can hit. (AR-058's follow-up asks for six.)
    const rowH = grid.h / MAX_LAYERS;
    const headW = grid.w * 0.16; // the plate's row rail is drawn at this split
    const cellW = (grid.w - headW) / STEP_COUNT;
    const pad = Math.min(cellW, rowH) * 0.12;
    this.rows.forEach((row, r) => {
      const cy = grid.y + (r + 0.5) * rowH;
      row.del.setPosition(grid.x + headW * 0.16, cy).setFontSize(Math.max(10, rowH * 0.34));
      row.label.setPosition(grid.x + headW * 0.5, cy).setFontSize(Math.max(12, rowH * 0.5));
      // Bounded by the RAIL as well as the row: the head carries ✕, icon and
      // mute across `headW`, and an icon sized only off row height grows into
      // its neighbours as soon as there are few enough rows to be chunky.
      const iconD = Math.max(14, Math.min(rowH * 0.62, headW * 0.3));
      row.icon?.setDisplaySize(iconD, iconD).setPosition(grid.x + headW * 0.5, cy);
      row.mute.setPosition(grid.x + headW * 0.84, cy).setFontSize(Math.max(10, rowH * 0.38));
      row.cells.forEach((cell, s) => {
        cell.setPosition(grid.x + headW + (s + 0.5) * cellW, cy);
        cell.setSize(Math.max(2, cellW - pad), Math.max(2, rowH - pad));
      });
    });
    // The drum shelf: one pad per recess.
    const bw = shelf.w / this.addButtons.length;
    this.addButtons.forEach((btn, k) => {
      btn.place({ x: shelf.x + k * bw + bw * 0.1, y: shelf.y + shelf.h * 0.1, w: bw * 0.8, h: shelf.h * 0.8 }, Math.max(12, shelf.h * 0.3));
    });
    this.hint.setPosition(grid.x + grid.w / 2, grid.y + grid.h * 0.5).setFontSize(Math.max(11, grid.h * 0.05));
  }

  apply(model: ToolModel): void {
    const key = model.percussion.rows.map((r) => r.id).join("|");
    if (key !== this.rowKey) {
      this.rowKey = key;
      this.rebuildRows(model);
    }
    this.hint.setVisible(model.percussion.rows.length === 0);
    model.percussion.rows.forEach((row, r) => {
      const view = this.rows[r];
      if (!view) return;
      if (row.muted !== view.muted) {
        view.muted = row.muted;
        view.mute.setText(row.muted ? "🔇" : "🔊");
      }
      const rowAlpha = row.muted ? 0.35 : 1;
      for (let s = 0; s < STEP_COUNT; s++) {
        const isOn = row.cells[s] ?? false;
        if (isOn !== view.on[s]) {
          view.on[s] = isOn;
          view.cells[s]?.setFillStyle(
            isOn ? view.color : PercussionToolPanel.CELL_OFF,
            isOn ? 1 : PercussionToolPanel.CELL_OFF_ALPHA,
          );
        }
        view.cells[s]?.setAlpha(rowAlpha);
      }
    });
    const canAdd = model.percussion.canAdd;
    this.addButtons.forEach((b) => b.setEnabled(canAdd));
  }
}

// ── Magic Pad ─────────────────────────────────────────────────────────────────
export class MagicToolPanel extends BaseToolPanel {
  /** AR-051's theremin face. Regions measured off the delivered PNG
   *  (1536×1152): the four wave recesses, the big XY playfield, and the paired
   *  Record / Send bays. */
  private static readonly PLATE = {
    waves: { x0: 0.097, y0: 0.105, x1: 0.897, y1: 0.245 },
    xy: { x0: 0.135, y0: 0.316, x1: 0.877, y1: 0.742 },
    record: { x0: 0.105, y0: 0.78, x1: 0.48, y1: 0.895 },
    send: { x0: 0.513, y0: 0.78, x1: 0.895, y1: 0.895 },
  } as const;

  private zone!: Phaser.GameObjects.Rectangle;
  private dot!: Phaser.GameObjects.Arc;
  private hint!: Phaser.GameObjects.Text;
  private waveBtns: { wave: ThereminWave; btn: PanelButton }[] = [];
  private recordBtn!: PanelButton;
  /** Whether DONE has a take to commit, from the last `apply`. */
  private pending = false;
  private dragging = false;
  private zoneBox: Box = { x: 0, y: 0, w: 0, h: 0 };

  constructor(scene: Phaser.Scene) { super(scene, "✨ Magic Pad"); }

  protected buildContent(): void {
    this.mountPlate("panel-magic");
    // On the plate the playfield IS painted, and AR-051 asked for it to stay
    // clear — so the zone keeps its hit area and gives up its face. Alpha 0
    // does not affect Phaser's hit test, which uses the shape.
    this.zone = this.plateImg
      ? this.scene.add.rectangle(0, 0, 10, 10, 0x2a1f3a, 0).setOrigin(0).setInteractive()
      : this.scene.add.rectangle(0, 0, 10, 10, 0x2a1f3a, 0.9).setStrokeStyle(3, 0x8338ec).setOrigin(0).setInteractive();
    this.dot = this.scene.add.circle(0, 0, 10, 0xffd166).setVisible(false);
    // The hint floats INSIDE the dark XY pad, so it stays cream (not ink).
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
    this.add([this.zone, this.dot, this.hint, ...this.waveBtns.map((w) => w.btn.container), this.recordBtn.container]);
  }

  /** Like Voice Keys, the Magic Pad holds a take until it is sent — so DONE is
   *  what its "➡️ Send to Car" button used to be. */
  protected override onDone(): void {
    if (this.pending) EventBus.emit("tool-magic-send");
    EventBus.emit("tool-closed");
  }

  private emitPointer(phase: "down" | "move" | "up", p: Phaser.Input.Pointer): void {
    const x = Phaser.Math.Clamp((p.x - this.zoneBox.x) / this.zoneBox.w, 0, 1);
    const y = Phaser.Math.Clamp((p.y - this.zoneBox.y) / this.zoneBox.h, 0, 1);
    this.dot.setVisible(true).setPosition(this.zoneBox.x + x * this.zoneBox.w, this.zoneBox.y + y * this.zoneBox.h);
    EventBus.emit("tool-magic-pointer", phase, x, y);
  }

  protected layoutContent(): void {
    const i = this.inner;
    const at = this.placePlate();
    const P = MagicToolPanel.PLATE;
    const bgap = i.w * 0.04, bw = (i.w - bgap) / 2, bh = i.h * 0.16, by = i.y + i.h * 0.78;
    const waves = at ? at(P.waves) : { x: i.x, y: i.y, w: i.w, h: i.h * 0.14 };
    // RECORD spans both bottom bays now: the right one held "Send to Car",
    // which DONE has taken over, and a half-width control beside an empty
    // recess reads as a missing button rather than a deliberate one.
    const recA = at ? at(P.record) : { x: i.x, y: by, w: bw, h: bh };
    const recB = at ? at(P.send) : { x: i.x + bw + bgap, y: by, w: bw, h: bh };
    const rec = { x: recA.x, y: recA.y, w: recB.x + recB.w - recA.x, h: recA.h };

    gridIn(waves, this.waveBtns.length, 1).forEach((b, k) =>
      this.waveBtns[k]?.btn.place(b, Math.max(9, b.h * 0.22)));
    this.zoneBox = at ? at(P.xy) : { x: i.x, y: i.y + i.h * 0.18, w: i.w, h: i.h * 0.55 };
    this.zone.setSize(this.zoneBox.w, this.zoneBox.h).setPosition(this.zoneBox.x, this.zoneBox.y);
    this.hint.setPosition(this.zoneBox.x + this.zoneBox.w / 2, this.zoneBox.y + this.zoneBox.h / 2).setFontSize(Math.max(9, i.h * 0.03));
    this.dot.setRadius(Math.max(6, i.w * 0.012));
    this.recordBtn.place(rec, Math.max(10, rec.h * 0.28));
  }

  apply(model: ToolModel): void {
    const m = model.magic;
    this.recordBtn.setText(m.recording ? "⏹️ Stop" : "🎙️ Record");
    this.recordBtn.setFill(m.recording ? 0xb03050 : 0x7a2540);
    this.hint.setText(m.status);
    this.pending = m.hasClip && !m.onHome;
  }
}

// ── Melody piano-roll editor ──────────────────────────────────────────────────
// A BeepBox-style grid: MELODY_ROWS pitch rows (high at top) × STEP_COUNT steps.
// Tapping a cell toggles a note at that (degree, step); React updates the lane.

/**
 * The instrument editor gets its OWN modal region rather than the shared
 * `WORKSHOP_TOOL_MODAL`. That constant is tuned for the five ENGINE-DRAWN
 * landscape parchment panels; this panel's art is PORTRAIT (1152×1536), and
 * `placeUiSprite` contain-fits it, so the region's 0.70 height was the only
 * binding axis and the panel used barely two-thirds of the canvas. Eric:
 * "i also think the whole thing should be a little bigger".
 *
 * Phaser runs a FIXED 2560×1440 design space under `Scale.FIT` (see
 * `game/main.ts`), so this is orientation-invariant: portrait and landscape get
 * the identical layout, letterboxed differently by the browser. The art is
 * height-bound at every viewport, so height is the number that matters.
 */
const MELODY_MODAL = { x: 0.02, y: 0.03, w: 0.96, h: 0.94 } as const;

/** Fraction of the region reserved ABOVE the art for the title + ✕. They hang
 *  off the art's top edge, so growing the art into the whole region pushed the
 *  close button off the top of the canvas. */
const MELODY_HEADER_FRAC = 0.09;

// The ×2 switch is an ordinary two-frame control now. It spent a while as ONE
// frame (lever down, "OFF" plaque) with a cropped, mirrored copy of its own
// column drawn over it to fake the throw, plus a cream chip covering the baked
// word while armed — AR-026 delivered `toggle-double-idle`/`-on` (2026-08-12)
// and all three compensations retired together.

export class MelodyEditorPanel extends BaseToolPanel {
  private rowLabels: Phaser.GameObjects.Text[] = [];
  // cells[r] is the visual row from the TOP (r=0 = highest degree).
  private cells: Phaser.GameObjects.Rectangle[][] = [];
  /** The slot drawn THROUGH a doubled cell, so the note reads as two blocks. */
  private cellSplits: Phaser.GameObjects.Rectangle[][] = [];
  private cellOn: boolean[][] = [];

  private cellDouble: boolean[][] = [];
  // AR-016 instrument editor: the framed panel art + its control deck.
  private panelImg!: Phaser.GameObjects.Image;
  private knobWobble!: Phaser.GameObjects.Image;
  private knobCrunch!: Phaser.GameObjects.Image;
  private fader!: Phaser.GameObjects.Image;
  /** How full the LEVEL fader is, drawn UP the baked track behind the handle.
   *  "LEVEL" is a word a five-year-old cannot read; a gold column that grows is
   *  a quantity they can. */
  private levelFill!: Phaser.GameObjects.Rectangle;
  private levelFillW = 2;
  private toggle!: Phaser.GameObjects.Image;
  /** 0 = at rest, 1 = fully compressed. Drives the throw's squash-and-spring;
   *  Back.easeOut carries it slightly negative, which stretches. */
  private toggleSquash = 0;
  private toggleTween?: Phaser.Tweens.Tween;
  /** The base toggle's rest transform, captured by `layoutContent` so the throw
   *  animation can be replayed without re-running the placement maths. */
  private toggleRest = { x: 0, y: 0, scale: 1 };
  private values = { wobble: 0, crunch: 0, volume: 1 };
  private draggingKnob: string | null = null;
  /** ×2 mode: while armed, tapping a note doubles it, and tapping a doubled
   *  note removes it — so a note is never stuck, whichever way the lever is. */
  private doubleMode = false;
  private faderTrack = { y0: 0, y1: 0, x: 0 };

  constructor(scene: Phaser.Scene) { super(scene, "🎹 Melody"); }

  /** The panel-editor art's geometry, as fractions of its canvas (measured
   *  from the PNG: slate bounds + the baked knob/fader/toggle recesses). */
  private static readonly ART = {
    slate: { x0: 0.117, y0: 0.095, x1: 0.885, y1: 0.624 },
    // Control positions/sizes measured from the BAKED controls before they
    // were erased from the plate (the sprites replace them 1:1).
    knobWobble: { cx: 0.1665, cy: 0.76, w: 0.185 },
    knobCrunch: { cx: 0.399, cy: 0.76, w: 0.185 },
    // MEASURED off the plate, not eyeballed. The deck's four tiles are found by
    // their gold corner rivets (centres 0.173 / 0.396 / 0.611 / 0.8325 of the
    // art's width), and the LEVEL tile's baked slot by its dark column
    // (centre 0.6042, width 0.0304). Two of these were out:
    //   • the fader rode at 0.5985 with a handle 0.1 wide — over three times
    //     the width of the slot it is supposed to sit IN, which is what makes
    //     it read as a gold brick lying on the plate;
    //   • the ×2 switch sat at 0.82 against a tile centred on 0.8325, i.e.
    //     ~14 px left of its own recess.
    fader: { x: 0.6042, y0: 0.695, y1: 0.838, w: 0.062, slotW: 0.024 },
    toggle: { cx: 0.8325, cy: 0.775, w: 0.16 },
  } as const;

  protected buildContent(): void {
    // The framed art replaces the generic parchment plate + shadow; the title
    // floats over the DARK dimmed scene, so it stays cream, not ink.
    this.frame.setVisible(false);
    this.shadow.setVisible(false);
    this.titleText.setColor("#ffd166");
    this.panelImg = this.scene.add.image(0, 0, UI_ATLAS_KEY, UI_SPRITES["panel-editor"]!.base);
    this.add(this.panelImg);

    for (let r = 0; r < MELODY_ROWS; r++) {
      const degree = MELODY_ROWS - 1 - r; // top row = highest degree
      const label = this.scene.add.text(0, 0, "", { fontFamily: FONT, fontSize: "9px", color: "#e8dcc8" }).setOrigin(0.5);
      this.add(label);
      this.rowLabels.push(label);
      const rowCells: Phaser.GameObjects.Rectangle[] = [];
      const rowSplits: Phaser.GameObjects.Rectangle[] = [];
      const rowOn: boolean[] = [];
      const rowDouble: boolean[] = [];
      for (let s = 0; s < STEP_COUNT; s++) {
        const cell = this.scene.add.rectangle(0, 0, 10, 10, 0xf6efdc, 0.06).setStrokeStyle(1, 0xf6efdc, 0.16).setInteractive({ useHandCursor: true });
        const step = s;
        cell.on("pointerdown", () => {
          cell.setScale(0.85);
          // ×2 mode retunes an existing note into a double-beat; otherwise a
          // tap toggles the note as always.
          if (this.doubleMode && this.cellOn[r]?.[step]) {
            EventBus.emit("tool-melody-double", step, degree);
          } else {
            EventBus.emit("tool-melody-toggle", step, degree);
          }
        });
        cell.on("pointerup", () => cell.setScale(1));
        cell.on("pointerout", () => cell.setScale(1));
        this.add(cell);
        // The ×2 cue. A doubled note is one step that SOUNDS TWICE, so it is
        // drawn as two blocks with a slot cut between them — the picture IS the
        // effect. (It used to be a gold ring, which a comment claimed "reads as
        // ×2 at kid size"; a ring is a decoration, not a count.) Non-interactive
        // so it never steals the cell's tap.
        const split = this.scene.add.rectangle(0, 0, 2, 10, 0x1b3c24, 1).setVisible(false);
        this.add(split);
        rowCells.push(cell);
        rowSplits.push(split);
        rowOn.push(false);
        rowDouble.push(false);
      }
      this.cells.push(rowCells);
      this.cellSplits.push(rowSplits);
      this.cellOn.push(rowOn);
      this.cellDouble.push(rowDouble);
    }

    // Control deck: the movable sprites over the baked recesses.
    this.knobWobble = this.makeKnob("knob-wobble", "wobble", (v) => EventBus.emit("tool-lane-wobble", v));
    this.knobCrunch = this.makeKnob("knob-crunch", "crunch", (v) => EventBus.emit("tool-lane-crunch", v));
    // Added BEFORE the handle so the fill reads as liquid in the track and the
    // handle rides on top of it.
    this.levelFill = this.scene.add.rectangle(0, 0, 2, 2, 0xffd166, 1).setOrigin(0.5, 1);
    this.fader = this.scene.add.image(0, 0, UI_ATLAS_KEY, UI_SPRITES["fader-handle"]!.base).setInteractive({ useHandCursor: true });
    this.bindVerticalDrag(
      this.fader,
      "volume",
      (v) => {
        EventBus.emit("tool-lane-volume", v);
        this.placeFader();
      },
      // On RELEASE the lane speaks at its new loudness. A fader whose only
      // feedback is a word nobody can read teaches nothing; one note at the new
      // level teaches it in one gesture.
      (v) => EventBus.emit("tool-lane-volume-done", v),
    );
    this.toggle = this.scene.add.image(0, 0, UI_ATLAS_KEY, UI_SPRITES["toggle-double"]!.base).setInteractive({ useHandCursor: true });
    // Acting on pointerDOWN (rather than the scenes' armed press/release pair)
    // is deliberate: a pointerup that began somewhere else can never reach a
    // down-handler.
    this.toggle.on("pointerdown", () => {
      this.setDoubleMode(!this.doubleMode);
      this.kickToggle();
    });
    this.add([this.knobWobble, this.knobCrunch, this.levelFill, this.fader, this.toggle]);
    this.bringToTop(this.closeBtn.container);
  }

  /** The one place ×2 is armed or disarmed, so the lever frame, the note
   *  ghosts and the audible demo can never disagree. The art itself carries
   *  the state now — lever up + ON plaque against lever down + OFF (AR-026). */
  private setDoubleMode(on: boolean): void {
    this.doubleMode = on;
    this.renderToggle();
    this.refreshSplits();
    EventBus.emit("tool-melody-twice-mode", on);
  }

  /** A mode nobody can see is a trap, so it never survives the panel closing:
   *  ×2 armed in one lane used to still be armed the next time the editor
   *  opened, on a different instrument, with the switch reading OFF. */
  override setVisible(value: boolean): this {
    if (value && this.doubleMode) this.setDoubleMode(false);
    return super.setVisible(value);
  }

  /** Throw the lever: it snaps to its other pose immediately and the switch
   *  compresses then springs back, which is what sells it as mechanical. The
   *  pose itself is `renderToggle`; this only drives the squash. */
  private kickToggle(): void {
    this.toggleTween?.remove();
    // Tween a plain object and read the property back — the same shape
    // `undo-toast.ts` and `TrackScene` use. (`tweens.addCounter` + `getValue()`
    // works too; this just matches the dialect.) Note when measuring this: a
    // headless Playwright run renders at roughly 9 fps, so a 240 ms tween gets
    // about two onUpdate calls there and looks like it is not animating at all.
    const state = { v: 1 };
    this.toggleTween = this.scene.tweens.add({
      targets: state,
      v: 0,
      duration: 240,
      ease: "Back.easeOut",
      onUpdate: () => {
        this.toggleSquash = state.v;
        this.renderToggle();
      },
      onComplete: () => {
        this.toggleSquash = 0;
        this.renderToggle();
      },
    });
  }

  /** Pose the ×2 switch from `doubleMode` + `toggleSquash`: the right frame
   *  for the mode, squashed while the throw's spring settles. */
  private renderToggle(): void {
    if (!this.toggle) return;
    const def = UI_SPRITES["toggle-double"]!;
    this.toggle.setFrame(def.states[this.doubleMode ? "on" : "idle"] ?? def.base);
    const squash = 1 - this.toggleSquash * 0.22;
    this.toggle
      .setScale(this.toggleRest.scale, this.toggleRest.scale * squash)
      .setPosition(this.toggleRest.x, this.toggleRest.y);
  }

  private makeKnob(frame: string, key: "wobble" | "crunch", emit: (v: number) => void): Phaser.GameObjects.Image {
    const img = this.scene.add.image(0, 0, UI_ATLAS_KEY, UI_SPRITES[frame]!.base).setInteractive({ useHandCursor: true });
    this.bindVerticalDrag(img, key, (v) => {
      emit(v);
      img.setRotation((v - 0.5) * 4.2); // ±120° sweep
    });
    return img;
  }

  /** Drag up = value towards 1, down = towards 0 (kid-simple, works for knobs
   *  and the fader alike). Emits only on real change while the drag lives;
   *  `onRelease` fires once when the finger lifts, for controls that answer
   *  with a sound rather than a continuous stream of them. */
  private bindVerticalDrag(
    img: Phaser.GameObjects.Image,
    key: "wobble" | "crunch" | "volume",
    onChange: (v: number) => void,
    onRelease?: (v: number) => void,
  ): void {
    img.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const startY = p.y;
      const startV = this.values[key];
      this.draggingKnob = key;
      const move = (mp: Phaser.Input.Pointer): void => {
        const v = Math.min(1, Math.max(0, startV + (startY - mp.y) / 140));
        if (Math.abs(v - this.values[key]) > 0.01) {
          this.values[key] = v;
          onChange(v);
        }
      };
      const up = (): void => {
        this.draggingKnob = null;
        this.scene.input.off("pointermove", move);
        this.scene.input.off("pointerup", up);
        onRelease?.(this.values[key]);
      };
      this.scene.input.on("pointermove", move);
      this.scene.input.on("pointerup", up);
    });
  }

  /** The art's placed content rect in screen px (contain-fit, centre origin). */
  private artRect(): Box {
    const img = this.panelImg;
    const def = UI_SPRITES["panel-editor"]!;
    const [x0, y0, x1, y1] = def.content;
    const w = (x1 - x0) * img.width * img.scaleX;
    const h = (y1 - y0) * img.height * img.scaleY;
    return { x: img.x - w / 2, y: img.y - h / 2, w, h };
  }

  private placeFader(): void {
    const t = this.faderTrack;
    this.fader.setPosition(t.x, t.y1 + (t.y0 - t.y1) * this.values.volume);
    // …and fill the track underneath it, so "how loud" is a height a
    // pre-reader can compare rather than a five-letter word.
    this.levelFill.setPosition(t.x, t.y1).setSize(this.levelFillW, Math.max(1, t.y1 - this.fader.y));
  }

  protected layoutContent(): void {
    // Contain-fit the framed art into the modal region (it's portrait), with a
    // band reserved at the top for the title + ✕, which hang off the art.
    const m = MELODY_MODAL;
    const { width: sw, height: sh } = this.scene.scale.gameSize;
    const region = { x: sw * m.x, y: sh * m.y, w: sw * m.w, h: sh * m.h };
    const headerH = region.h * MELODY_HEADER_FRAC;
    placeUiSprite(this.panelImg, UI_SPRITES["panel-editor"]!, {
      x: region.x + region.w / 2,
      y: region.y + headerH + (region.h - headerH) / 2,
      width: region.w,
      height: region.h - headerH,
    });
    const art = this.artRect();
    const A = MelodyEditorPanel.ART;

    // Title + close anchor to the ART (the base layout spread them across the
    // whole modal region, which is wider than the portrait panel).
    const closeSz = Math.max(28, art.w * 0.09);
    this.titleText.setPosition(art.x, art.y - closeSz * 0.55).setFontSize(Math.max(12, Math.round(closeSz * 0.5)));
    this.closeBtn.place({ x: art.x + art.w - closeSz, y: art.y - closeSz - 4, w: closeSz, h: closeSz }, Math.round(closeSz * 0.45));

    // Note canvas on the slate.
    const i = {
      x: art.x + art.w * A.slate.x0,
      y: art.y + art.h * A.slate.y0,
      w: art.w * (A.slate.x1 - A.slate.x0),
      h: art.h * (A.slate.y1 - A.slate.y0),
    };
    const labelW = i.w * 0.1;
    const rowH = i.h / MELODY_ROWS;
    const cellW = (i.w - labelW) / STEP_COUNT;
    const pad = Math.min(cellW, rowH) * 0.12;
    for (let r = 0; r < MELODY_ROWS; r++) {
      const cy = i.y + (r + 0.5) * rowH;
      this.rowLabels[r]?.setPosition(i.x + labelW / 2, cy).setFontSize(Math.max(8, rowH * 0.32));
      for (let s = 0; s < STEP_COUNT; s++) {
        const cx = i.x + labelW + (s + 0.5) * cellW;
        this.cells[r]?.[s]?.setPosition(cx, cy).setSize(Math.max(2, cellW - pad), Math.max(2, rowH - pad));
        this.cellSplits[r]?.[s]?.setPosition(cx, cy).setSize(Math.max(2, cellW * 0.14), Math.max(2, rowH - pad));
      }
    }

    // Control deck sprites over their baked recesses.
    const knobW = art.w * A.knobWobble.w;
    placeUiSprite(this.knobWobble, UI_SPRITES["knob-wobble"]!, { x: art.x + art.w * A.knobWobble.cx, y: art.y + art.h * A.knobWobble.cy, width: knobW, height: knobW });
    placeUiSprite(this.knobCrunch, UI_SPRITES["knob-crunch"]!, { x: art.x + art.w * A.knobCrunch.cx, y: art.y + art.h * A.knobCrunch.cy, width: knobW, height: knobW });
    this.knobWobble.setRotation((this.values.wobble - 0.5) * 4.2);
    this.knobCrunch.setRotation((this.values.crunch - 0.5) * 4.2);
    const toggleW = art.w * A.toggle.w;
    placeUiSprite(this.toggle, UI_SPRITES["toggle-double"]!, { x: art.x + art.w * A.toggle.cx, y: art.y + art.h * A.toggle.cy, width: toggleW, height: toggleW * 1.6 });
    // The throw animation re-derives its transform from this rest pose.
    this.toggleRest = { x: this.toggle.x, y: this.toggle.y, scale: this.toggle.scaleX };
    this.renderToggle();
    const faderW = art.w * A.fader.w;
    const fDef = UI_SPRITES["fader-handle"]!;
    const [fx0, fy0, fx1, fy1] = fDef.content;
    const fH = faderW * (((fy1 - fy0) * 512) / ((fx1 - fx0) * 512));
    placeUiSprite(this.fader, fDef, { x: art.x + art.w * A.fader.x, y: art.y + art.h * A.fader.y1, width: faderW, height: fH });
    this.faderTrack = {
      x: this.fader.x,
      y0: art.y + art.h * A.fader.y0,
      y1: art.y + art.h * A.fader.y1,
    };
    // Match the baked slot's width so the fill reads as the track filling up
    // rather than as a hairline drawn beside it.
    this.levelFillW = Math.max(2, art.w * A.fader.slotW);
    this.placeFader();
  }

  apply(model: ToolModel): void {
    const m = model.melody;
    this.titleText.setText(`🎹 ${m.title}`);
    for (let r = 0; r < MELODY_ROWS; r++) {
      const degree = MELODY_ROWS - 1 - r;
      this.rowLabels[r]?.setText(m.keyLabels[degree] ?? "");
      for (let s = 0; s < STEP_COUNT; s++) {
        const isOn = m.cells[degree]?.[s] ?? false;
        const isDouble = m.doubles[degree]?.[s] ?? false;
        if (isOn !== this.cellOn[r]?.[s] || isDouble !== this.cellDouble[r]?.[s]) {
          this.cellOn[r]![s] = isOn;
          this.cellDouble[r]![s] = isDouble;
          const cell = this.cells[r]?.[s];
          cell?.setFillStyle(isOn ? 0x06d6a0 : 0xf6efdc, isOn ? 1 : 0.06);
          cell?.setStrokeStyle(isDouble ? 3 : 1, isDouble ? 0xffd166 : 0x000000, isDouble ? 1 : 0.4);
          this.refreshSplit(r, s);
        }
      }
    }
    // Deck values come from the store — unless the kid is mid-drag on one.
    if (this.draggingKnob !== "wobble") {
      this.values.wobble = m.wobble;
      this.knobWobble?.setRotation((m.wobble - 0.5) * 4.2);
    }
    if (this.draggingKnob !== "crunch") {
      this.values.crunch = m.crunch;
      this.knobCrunch?.setRotation((m.crunch - 0.5) * 4.2);
    }
    if (this.draggingKnob !== "volume") {
      this.values.volume = m.volume;
      if (this.fader) this.placeFader();
    }
  }

  /**
   * The ×2 cue for one cell.
   *
   * A doubled note shows the slot solid — the block is visibly TWO blocks. While
   * the lever is armed, every note that is NOT yet doubled shows it as a ghost:
   * that is the whole lesson, offered before the child commits to it, because
   * arming a mode that changes nothing until the next tap is exactly why nobody
   * could tell what this switch did.
   */
  private refreshSplit(r: number, s: number): void {
    const split = this.cellSplits[r]?.[s];
    if (!split) return;
    const on = this.cellOn[r]?.[s] ?? false;
    const doubled = this.cellDouble[r]?.[s] ?? false;
    // The ghost is deliberately thinner AND fainter than the real slot: at equal
    // width and 0.35 alpha the offer was indistinguishable from the outcome, so
    // every note looked already-doubled the moment the lever came on.
    if (on && doubled) split.setVisible(true).setAlpha(1).setScale(1);
    else if (on && this.doubleMode) split.setVisible(true).setAlpha(0.22).setScale(0.5, 1);
    else split.setVisible(false);
  }

  private refreshSplits(): void {
    for (let r = 0; r < MELODY_ROWS; r++) {
      for (let s = 0; s < STEP_COUNT; s++) this.refreshSplit(r, s);
    }
  }
}
