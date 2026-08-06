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
// (The old 8-icon toolbar and the SONG/SPEED baked chrome were retired here.
// So was the 4-way car-type picker in its ORIGINAL sense — a control that
// re-skinned the CURRENT car. `workshop-car-type-changed` and the `setCarType`
// reducer are what survive from it: both are unreachable from the running app
// and kept alive only by project-state.test.ts, awaiting a decision on whether
// re-skinning comes back. The dropdown below shares its ART but is a different
// control — it STARTS A NEW CAR, and is labelled to say so.)
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { attachUndoToast, type UndoToast } from "../undo-toast.ts";
import { SCENE_BG_V2, CAR_SIDE_SPRITES, CAR_SIDE_CANVAS, CAR_SIDE_VOID } from "../assets.ts";
import { loadUiSprites, CHALKBOARD_SLATE } from "../ui-sprites.ts";
import { WORKSHOP_GRID_V2 } from "../scene-layout.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { placeSpawn } from "../TiledSceneAdapter.ts";
import { spawnUiLayer, relayoutUiLayer, type UiElement } from "../ui-scene.ts";
import { UI_ATLAS_KEY, UI_SPRITES, placeUiSprite, type UiSpriteDef, type ContentBox } from "../ui-sprites.ts";
import { drawGlyph } from "../car-livery.ts";
import { CHIP_EDGE, colorFor, glyphFor, hexToInt, inkOn } from "../livery-style.ts";
import workshopMap from "../../assets/maps/workshop.json";
import { STEP_COUNT, CAR_TYPES, MAX_CARS, type CarType, type LaneKind } from "../../core/types.ts";
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
  readonly label: string; // emoji / short tag for the row (icon fallback)
  readonly icon: string | null; // UI_SPRITES key of the row's instrument sprite
  readonly color: string; // laneColor() — the lane-group colour
  readonly kind: LaneKind; // melody lanes get a piano-roll edit button
  readonly cells: readonly boolean[]; // length STEP_COUNT
  readonly muted: boolean; // whether this lane is currently muted
}

/** What the scene needs to render, pushed from the store on every change. */
export interface WorkshopModel {
  readonly lanes: readonly WorkshopLane[];
  readonly carType: CarType;
  /** The active car's NAME and LIVERY index, shown on the LCD. Same glyph, same
   *  colour the Yard paints on that car's flank — seeing them together while
   *  editing is what makes the mark mean something on a siding later. */
  readonly carName: string;
  readonly livery: number;
  readonly selectedLayerId: string | null;
  readonly tempoBpm: number;
  /** How many cars the LIBRARY holds. The New Car picker needs it to tell a kid
   *  the yard is full instead of silently doing nothing — `addCar` no-ops at
   *  `MAX_CARS`, which is invisible from in here without this. */
  readonly carCount: number;
}

const LABEL_COLOR = "#e8dcc8";
const LABEL_SELECTED = "#ffd166";
const MUTED_COLOR = "#ff6b6b";

// Chalk rendering (design doc §2): notes are chunky chalk marks on the slate,
// the playhead is a sweeping chalk line, and the step grid is a faint chalk
// ruling — all engine-drawn on the delivered empty board.
const CHALK = 0xf6efdc;
const OFF_FILL = CHALK;
const OFF_ALPHA = 0.05;
const CHALK_GRID_ALPHA = 0.16;

/** A lane colour pushed toward chalk-white, so notes read as coloured chalk
 *  sticks on the slate rather than flat paint swatches. */
function chalkTint(colorInt: number): number {
  const c = Phaser.Display.Color.IntegerToColor(colorInt);
  const mix = (v: number): number => Math.round(v + (255 - v) * 0.45);
  return Phaser.Display.Color.GetColor(mix(c.red), mix(c.green), mix(c.blue));
}

const toInt = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

/** Captions under the New Car tiles. Phrased as the ACTION the tile performs,
 *  not the noun it depicts — the menu starts a car, it does not describe one. */
const PICKER_CAPTIONS: Record<CarType, string> = {
  boxcar: "NEW BOXCAR",
  tanker: "NEW TANKER",
  hopper: "NEW HOPPER",
  flatcar: "NEW FLATCAR",
};

// ── AR-016 layered field (bg → car → chalkboard → grid → characters) ─────────
// All four car-side sprites share one canvas + wheel baseline, so ONE content
// box (the boxcar's) anchors placement for every type — a car-type swap is a
// pure texture change with no reposition, like the chrome state variants.
const CAR_CONTENT: ContentBox = [0.009, 0.158, 0.989, 0.865];
/** The one car texture that preloads. Matches `project-state.ts`'s seed car, so
 *  the common case never waits, and it is what `buildCarLayer` constructs on
 *  before `showCar` corrects it. */
const DEFAULT_CAR_TYPE: CarType = "boxcar";
// Depths: background image is 0; chrome panels are 1; grid bands/cells 3–7.
const DEPTH_CAR = 0.4;
const DEPTH_BOARD = 0.6;

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
  label: Phaser.GameObjects.Text | Phaser.GameObjects.Image; // instrument sprite (emoji fallback)
  del: Phaser.GameObjects.Text; // ✕ remove this lane
  edit: Phaser.GameObjects.Text | null; // 🎹 piano-roll (melody lanes only)
  mute: Phaser.GameObjects.Text; // 🔇 mute toggle
  colorInt: number;
  cells: Phaser.GameObjects.Rectangle[];
  on: boolean[];
}

export class WorkshopScene extends BackgroundScene {
  static readonly KEY = "WorkshopScene";

  private model: WorkshopModel = { lanes: [], carType: "boxcar", carName: "Loop 1", livery: 0, selectedLayerId: null, tempoBpm: 120, carCount: 1 };
  private rows: LaneRow[] = [];
  private structKey = "";
  /** The empty-car prompt (hint + the SURPRISE ME chip), or undefined when
   *  the car has lanes. A Container so the departure tween and the layout
   *  each still address one object. */
  private emptyText: Phaser.GameObjects.Container | undefined;
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
  private liveryMark: Phaser.GameObjects.Graphics | undefined;
  private lcdRect: { x: number; y: number; width: number; height: number } | undefined;
  // Car-type picker dropdown (toggled by the New Car button).
  private carPicker: Phaser.GameObjects.Container | undefined;
  private pickerTiles: { type: CarType; img: Phaser.GameObjects.Image; caption: Phaser.GameObjects.Text; def: UiSpriteDef }[] = [];
  private pickerTitle: Phaser.GameObjects.Text | undefined;
  private pickerOpen = false;
  private toolPanels: Record<string, BaseToolPanel> = {};
  private activeTool: string | null = null;
  private toolModel: ToolModel | null = null;
  // AR-016 layered field: the active car sprite + the chalkboard mounted in its
  // standardized interior void. The note grid draws on the board's slate.
  private car: Phaser.GameObjects.Image | undefined;
  private board: Phaser.GameObjects.Image | undefined;
  /** The board's slate surface in screen px — the grid's mount rect. */
  private slateRect = { x: 0, y: 0, w: 0, h: 0 };
  private departing = false;
  // Edit-vs-New modal (AR-016): offered once per Workshop visit when the
  // active car already has lanes — keep working, or start a fresh car.
  private editOrNew: Phaser.GameObjects.Container | undefined;
  private editOrNewImg: Phaser.GameObjects.Image | undefined;
  private editOrNewHits: { zone: "edit" | "new"; rect: Phaser.GameObjects.Rectangle }[] = [];
  private editOrNewDecided = false;

  /** The "put it back" offer. Public getter below is the e2e seam — it is how
   *  a test proves a kid can actually reach undo, which is the whole point. */
  private undoToast?: UndoToast;

  constructor() {
    super(WorkshopScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.workshopInterior);
    // Only the DEFAULT car type preloads. All four used to, "so a picker swap is
    // instant" — but each is a 2560x1440 PNG that decodes to ~15 MB of GPU
    // texture, so three types nobody is looking at cost ~44 MB of VRAM and
    // ~690 KB of transfer on a scene that shows exactly one car. The others load
    // on first use via `showCar`; the swap is one texture change with no
    // reposition (they share a canvas and a baseline), so a late arrival is
    // dimensionally safe.
    const boot = CAR_SIDE_SPRITES[DEFAULT_CAR_TYPE];
    if (!this.textures.exists(boot.key)) this.load.image(boot.key, boot.url);
    this.chromeSpawns = parseTiledLayer(workshopMap, "ui-layer");
    loadUiSprites(this); // the one packed chrome multiatlas
  }

  create(): void {
    this.addBackground("contain"); // never crop the top/bottom bars off-screen
    this.buildCarLayer();
    this.buildChrome();
    this.buildCarPicker();
    this.buildGrid();
    this.buildToolPanels();
    this.buildEditOrNewModal();
    this.layoutFixtures();
    this.bindPickerToggle();
    this.bindSendToYard();
    // Dev-only seam for the scene editor (`?edit`). `editorHandle` is typed
    // `unknown` on BackgroundScene, so this scene still imports nothing from
    // `src/editor/` — the dependency arrow points one way only, and the whole
    // branch is compile-time dead in a production build.
    if (import.meta.env.DEV) {
      this.editorHandle = {
        mapName: "workshop",
        layerName: "ui-layer",
        spawns: this.chromeSpawns,
        relayout: () => this.layoutChrome(),
        backgroundRect: () => this.backgroundRect,
        cameraSize: () => this.scale.gameSize,
      };
    }
    // "Undo everywhere": the offer chip. React classifies destruction in its
    // one dispatch funnel and emits over the bus, so this scene needs no
    // knowledge of WHICH commands destroy anything.
    this.undoToast = attachUndoToast(this);
    this.announceReady();
  }

  /** Exposed for the e2e bridge: is the empty-car prompt (and with it the only
   *  route to "Surprise me") on screen? */
  get emptyPromptVisible(): boolean {
    return this.emptyText !== undefined;
  }

  /** Exposed for the e2e bridge: is the undo offer on screen, and for what. */
  get undoOffer(): { offering: boolean; lost: string } {
    return { offering: this.undoToast?.offering ?? false, lost: this.undoToast?.lost ?? "" };
  }


  /** Put `type`'s art on the car, fetching the texture first if this is the
   *  first time this session has shown it. See `preload` for why only one type
   *  is resident up front.
   *
   *  The `carType` re-check in the callback matters: two quick swaps would
   *  otherwise race, and the slower load would win and stomp the newer choice. */
  private showCar(type: CarType): void {
    const asset = CAR_SIDE_SPRITES[type];
    if (this.textures.exists(asset.key)) {
      this.car?.setTexture(asset.key);
      return;
    }
    this.load.image(asset.key, asset.url);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      // The scene can be torn down mid-flight (every nav destroys the game).
      if (!this.car?.scene || this.model.carType !== type) return;
      if (!this.textures.exists(asset.key)) return;
      this.car.setTexture(asset.key);
      this.layoutFixtures();
    });
    this.load.start();
  }

  // ── the layered field: car sprite + chalkboard in its void ─────────────────
  private buildCarLayer(): void {
    // Always constructed on the preloaded default, then corrected by `showCar`:
    // the real car type arrives from React and may not be resident yet.
    this.car = this.add
      .image(0, 0, CAR_SIDE_SPRITES[DEFAULT_CAR_TYPE].key)
      .setDepth(DEPTH_CAR);
    this.showCar(this.model.carType);
    this.board = this.add
      .image(0, 0, UI_ATLAS_KEY, UI_SPRITES["sequencer-chalkboard"]!.base)
      .setDepth(DEPTH_BOARD);
  }

  /** Place the car on its Tiled anchor (wheels on the rails), then mount the
   *  chalkboard over the standardized interior void and derive the grid's
   *  slate rect from the board's placement. */
  private layoutCarLayer(): void {
    const r = this.backgroundRect;
    if (r.width === 0 || !this.car || !this.board) return;
    const { width, height } = this.scale.gameSize;
    const anchor = this.chromeSpawns.find((s) => s.id === "car-anchor");
    if (!anchor) return;
    const target = placeSpawn(anchor, r, { width, height });

    // Contain-fit the shared content box, bottom-aligned so the wheels sit on
    // the anchor rect's bottom edge (the painted near rail).
    const carDef: UiSpriteDef = { states: {}, base: "", content: CAR_CONTENT, stretch: false };
    placeUiSprite(this.car, carDef, target);
    const s = this.car.scaleX;
    const contentBottom = this.car.y + (CAR_CONTENT[3] - 0.5) * CAR_SIDE_CANVAS.h * s;
    this.car.y += target.y + target.height / 2 - contentBottom;

    // The car's canvas origin in screen px → the void rect in screen px.
    const canvasLeft = this.car.x - (CAR_SIDE_CANVAS.w / 2) * s;
    const canvasTop = this.car.y - (CAR_SIDE_CANVAS.h / 2) * s;
    const voidX = canvasLeft + CAR_SIDE_VOID.x * s;
    const voidY = canvasTop + CAR_SIDE_VOID.y * s;
    const voidW = CAR_SIDE_VOID.w * s;

    // The board fills the void's width at its OWN aspect (top-aligned to the
    // void), extending down over the car's open side — per the approved
    // chalkboard concept (the board spans the car body, not just the slot).
    // Aspect comes from the atlas FRAME the image carries (a standalone
    // textures.get() lookup misses atlas frames and silently squashed it).
    const boardDef = UI_SPRITES["sequencer-chalkboard"]!;
    const [bx0, by0, bx1, by1] = boardDef.content;
    const bAspect = ((by1 - by0) * this.board.height) / ((bx1 - bx0) * this.board.width);
    const boardH = voidW * bAspect;
    placeUiSprite(this.board, boardDef, {
      x: voidX + voidW / 2, y: voidY + boardH / 2, width: voidW, height: boardH,
    });

    // The grid mounts on the slate surface inside the board's frame.
    const bs = this.board.scaleX;
    const bTexW = this.board.width, bTexH = this.board.height;
    const bLeft = this.board.x - (bTexW / 2) * bs;
    const bTop = this.board.y - (bTexH / 2) * this.board.scaleY;
    const [sx0, sy0, sx1, sy1] = CHALKBOARD_SLATE;
    this.slateRect = {
      x: bLeft + sx0 * bTexW * bs,
      y: bTop + sy0 * bTexH * this.board.scaleY,
      w: (sx1 - sx0) * bTexW * bs,
      h: (sy1 - sy0) * bTexH * this.board.scaleY,
    };
  }

  // ── Edit-vs-New modal (AR-016): shown when arriving at a non-empty car ─────
  /** The baked KEEP EDITING / NEW CAR plaques, as fractions of the modal art's
   *  canvas (measured from modal-edit-or-new.png). */
  private static readonly MODAL_HITS = {
    edit: { x0: 0.14, y0: 0.42, x1: 0.5, y1: 0.8 },
    new: { x0: 0.52, y0: 0.42, x1: 0.89, y1: 0.8 },
  } as const;

  private buildEditOrNewModal(): void {
    const backdrop = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.62).setOrigin(0).setInteractive();
    this.editOrNewImg = this.add.image(0, 0, UI_ATLAS_KEY, UI_SPRITES["modal-edit-or-new"]!.base);
    this.editOrNewHits = (["edit", "new"] as const).map((zone) => {
      const rect = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      // Armed press: fire only a release whose press started on this plaque.
      let armed = false;
      rect.on("pointerdown", () => { armed = true; this.editOrNewImg?.setScale(this.editOrNewImg.scaleX * 1.0); });
      rect.on("pointerout", () => { armed = false; });
      rect.on("pointerup", () => {
        if (!armed) return;
        armed = false;
        if (zone === "new") EventBus.emit("workshop-new-car");
        this.editOrNew?.setVisible(false);
      });
      return { zone, rect };
    });
    this.editOrNew = this.add
      .container(0, 0, [backdrop, this.editOrNewImg, ...this.editOrNewHits.map((h) => h.rect)])
      .setDepth(60)
      .setVisible(false);
    // Keep the backdrop sized on resize; layoutEditOrNew handles the rest.
    this.editOrNew.setDataEnabled();
    this.editOrNew.setData("backdrop", backdrop);
  }

  private layoutEditOrNew(): void {
    if (!this.editOrNew || !this.editOrNewImg) return;
    const { width, height } = this.scale.gameSize;
    const backdrop = this.editOrNew.getData("backdrop") as Phaser.GameObjects.Rectangle;
    backdrop.setSize(width, height);
    placeUiSprite(this.editOrNewImg, UI_SPRITES["modal-edit-or-new"]!, {
      x: width / 2, y: height / 2, width: width * 0.62, height: height * 0.62,
    });
    const img = this.editOrNewImg;
    const left = img.x - (img.width / 2) * img.scaleX;
    const top = img.y - (img.height / 2) * img.scaleY;
    for (const { zone, rect } of this.editOrNewHits) {
      const z = WorkshopScene.MODAL_HITS[zone];
      rect
        .setPosition(left + z.x0 * img.width * img.scaleX, top + z.y0 * img.height * img.scaleY)
        .setSize((z.x1 - z.x0) * img.width * img.scaleX, (z.y1 - z.y0) * img.height * img.scaleY);
    }
  }

  /** Decide once per visit, on the first model push: a car with lanes offers
   *  KEEP EDITING / NEW CAR (design doc §5). An empty car just opens. */
  private maybeOfferEditOrNew(): void {
    if (this.editOrNewDecided) return;
    this.editOrNewDecided = true;
    if (this.model.lanes.length === 0) return;
    this.editOrNew?.setVisible(true);
    this.layoutEditOrNew();
  }

  // ── SEND TO YARD: slide the car (grid and all) off right, then hand off ────
  private bindSendToYard(): void {
    const onSend = (): void => this.departCar();
    EventBus.on("workshop-send-to-yard", onSend);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off("workshop-send-to-yard", onSend));
  }

  private departCar(): void {
    if (this.departing || !this.car || !this.board) return;
    this.departing = true;
    const targets: Phaser.GameObjects.GameObject[] = [this.car, this.board];
    this.rows.forEach((row) => {
      targets.push(row.band, row.label, row.del, row.mute, ...row.cells);
      if (row.edit) targets.push(row.edit);
    });
    if (this.emptyText) targets.push(this.emptyText);
    this.playhead?.setVisible(false);
    const dx = this.scale.gameSize.width - (this.car.x - (this.car.displayWidth / 2));
    this.tweens.add({
      targets,
      x: `+=${Math.ceil(dx)}`,
      duration: 900,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.departing = false;
        EventBus.emit("workshop-car-departed");
      },
    });
  }

  // ── data-driven static chrome (panels / nav / instruments / transport) ──────
  private buildChrome(): void {
    this.chrome = spawnUiLayer(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      panelDepth: 1,
      hitDepth: 10,
    });

    // CAR + SPEED LCD: dark-plum text on a cream chip drawn over the panel.
    //
    // The top line used to read a hardcoded "SONG 001" that nothing ever
    // updated. It is now the ACTIVE CAR's name, with its livery glyph drawn
    // beside it in its livery colour — the same glyph, in the same colour, that
    // the car wears in the Yard. That is what teaches the mapping: a kid sees
    // "this mark" while editing "this car", and later picks "this mark" out of
    // twelve on a siding. A cream chip nobody has ever connected to anything is
    // scenery; this is the connection.
    this.lcdChip = this.add.graphics().setDepth(9);
    this.liveryMark = this.add.graphics().setDepth(11);
    this.songText = this.add.text(0, 0, "", LCD_STYLE).setOrigin(0.5).setDepth(11);
    this.tempoText = this.add.text(0, 0, "SPEED 120", LCD_STYLE).setOrigin(0.5).setDepth(11);
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
      this.lcdRect = p;
      this.drawLiveryMark();
    }
  }

  /** The active car's livery glyph, drawn on the LCD to the left of its name at
   *  the same size the Yard draws it. Redrawn on resize AND on car change, so
   *  the two are never out of step. */
  private drawLiveryMark(): void {
    const g = this.liveryMark;
    const p = this.lcdRect;
    if (!g || !p || !this.songText) return;
    g.clear();
    const r = Math.max(4, p.height * 0.11);
    // Just left of the name, inside the chip.
    const cx = this.songText.x - this.songText.width / 2 - r * 1.9;
    const cy = this.songText.y;
    const color = colorFor(this.model.livery);
    g.fillStyle(CHIP_EDGE, 1).fillCircle(cx, cy, r * 1.5);
    g.fillStyle(hexToInt(color), 1).fillCircle(cx, cy, r * 1.32);
    drawGlyph(g, glyphFor(this.model.livery), cx, cy, r * 0.82, inkOn(color));
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
      const img = this.add.image(0, 0, UI_ATLAS_KEY, def.base).setOrigin(0.5).setInteractive({ useHandCursor: true });
      // Arm on our OWN pointerdown, exactly as `ui-scene.ts` does for chrome:
      // Phaser delivers `pointerup` to whatever is under the pointer at release
      // even when the press began elsewhere, so a bare `pointerup` here could
      // start a car from a release that began on the panel above.
      let armed = false;
      img.on("pointerdown", () => { armed = true; });
      img.on("pointerout", () => { armed = false; });
      img.on("pointerup", () => { if (armed) { armed = false; this.chooseCarType(type); } });
      const caption = this.add
        .text(0, 0, PICKER_CAPTIONS[type], { ...LCD_STYLE, fontSize: "14px", color: LCD_PLUM })
        .setOrigin(0.5);
      return { type, img, caption, def };
    });
    this.pickerTitle = this.add
      .text(0, 0, "START A NEW CAR", { ...LCD_STYLE, fontSize: "16px", color: LCD_PLUM })
      .setOrigin(0.5);
    this.carPicker = this.add
      .container(0, 0, [
        this.pickerTitle,
        ...this.pickerTiles.flatMap((t) => [t.img, t.caption]),
      ])
      .setDepth(30)
      .setVisible(false);
  }

  private toggleCarPicker(): void {
    this.pickerOpen = !this.pickerOpen;
    this.carPicker?.setVisible(this.pickerOpen);
    if (this.pickerOpen) this.layoutCarPicker();
  }

  private chooseCarType(type: CarType): void {
    // The NEW CAR picker starts a FRESH EMPTY car of this type (Eric: "clear
    // all the tracks when you say new car") — re-skinning the current car was
    // the old picker's job and read as NEW CAR doing nothing.
    //
    // `addCar` silently no-ops at MAX_CARS, so without this check the picker
    // closes and NOTHING happens — which reads as the same bug the comment
    // above says was fixed. Say so instead.
    if (this.model.carCount >= MAX_CARS) {
      this.pickerTitle?.setText(`TRAIN YARD FULL — ${MAX_CARS} CARS`);
      return;
    }
    EventBus.emit("workshop-new-car", type);
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
    const full = this.model.carCount >= MAX_CARS;
    this.pickerTitle
      ?.setPosition(cx, r.y + r.height * 0.235)
      .setText(full ? `TRAIN YARD FULL — ${MAX_CARS} CARS` : "START A NEW CAR");
    this.pickerTiles.forEach((t, i) => {
      const cy = r.y + r.height * (0.30 + i * 0.115);
      placeUiSprite(t.img, t.def, { x: cx, y: cy, width: slotW, height: slotH });
      t.caption.setPosition(cx, cy + slotH * 0.42);
      // Every tile reads the same. This menu STARTS A CAR — it is not a picker
      // showing which type the current car is, and highlighting the active type
      // as "selected" was why tapping it looked like it did nothing (it made a
      // new, identical-looking car).
      const selKey = t.def.states["selected"];
      if (selKey) t.img.setFrame(t.def.base);
      t.img.setAlpha(full ? 0.4 : 1);
      t.caption.setAlpha(full ? 0.4 : 1);
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
  /** Exposed for the e2e bridge: the words the open tool is showing a kid.
   *  Used to prove the mic-denied path reaches them with something friendly
   *  rather than failing silently — "mic-denied must leave the app fully
   *  usable" is a stated rule that had no test. */
  get toolStatus(): { voice: string; keys: string } {
    return {
      voice: this.toolModel?.voice.status ?? "",
      keys: this.toolModel?.keys.status ?? "",
    };
  }

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
    const prevCarType = this.model.carType;
    this.model = model;
    if (!this.ready) return;
    // Car-type swap is a pure texture change — same canvas, same baseline.
    if (model.carType !== prevCarType) this.showCar(model.carType);
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
    this.maybeOfferEditOrNew();
  }

  private refreshLcd(): void {
    // "SPEED", matching the Track's LCD — this read "TEMP", a truncation of
    // TEMPO that fit the chip but is not a word. Eric asked for SPEED here.
    this.tempoText?.setText(`SPEED ${Math.round(this.model.tempoBpm)}`);
    this.songText?.setText(this.model.carName.toUpperCase());
    this.drawLiveryMark(); // the name's width moved, so the glyph must too
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
    if (this.editOrNew?.visible) this.layoutEditOrNew();
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
      this.emptyText = this.makeEmptyPrompt();
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
      // Row icon: the instrument's own sprite chalked onto the board's label
      // column (per-track art, design doc §2). Emoji text is the fallback.
      const iconDef = lane.icon ? UI_SPRITES[lane.icon] : undefined;
      const label = iconDef
        ? this.add
            .image(0, 0, UI_ATLAS_KEY, iconDef.base)
            .setDepth(7)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => EventBus.emit("workshop-layer-selected", lane.id))
        : this.makeIconText(lane.label, () => EventBus.emit("workshop-layer-selected", lane.id));
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
          .rectangle(0, 0, 10, 10, isOn ? chalkTint(colorInt) : OFF_FILL, isOn ? 0.95 : OFF_ALPHA)
          .setOrigin(0.5)
          .setStrokeStyle(1, CHALK, CHALK_GRID_ALPHA)
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

    // The playhead is a full-height chalk line sweeping the board (one cell
    // wide). Sits below the cells (depth 4) so notes still read on top.
    this.playhead = this.add.rectangle(0, 0, 10, 10, CHALK, 0.22).setOrigin(0, 0).setDepth(4).setVisible(false);
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
          row.cells[i]?.setFillStyle(isOn ? chalkTint(row.colorInt) : OFF_FILL, isOn ? 0.95 : OFF_ALPHA);
        }
      }
    });
  }

  private refreshSelection(): void {
    const sel = this.model.selectedLayerId;
    this.rows.forEach((row) => {
      const on = row.layerId === sel;
      row.band.setFillStyle(row.colorInt, on ? 0.16 : 0.06);
      if (row.label instanceof Phaser.GameObjects.Text) {
        row.label.setColor(on ? LABEL_SELECTED : LABEL_COLOR);
      } else {
        // Sprite icons brighten when selected, dim slightly otherwise.
        row.label.setAlpha(on ? 1 : 0.85);
        if (on) row.label.clearTint();
        else row.label.setTint(0xdddddd);
      }
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

  /**
   * The empty-car prompt: the hint, plus the ONLY way a kid can reach
   * "Surprise me".
   *
   * `generateBeat` has been implemented, pure and unit-tested since v1;
   * `workshop-surprise` is in the EventBus vocabulary and `Workshop.tsx`
   * subscribes to it — and NOTHING has ever emitted it, because the Tiled
   * toolbar never got a button. The authored chrome has no free keycap slot
   * (see `undo-toast.ts` for the same constraint), and an empty car is exactly
   * the moment "make me something" is worth offering, so the affordance lives
   * in the empty state and disappears the instant the car has anything in it.
   *
   * Caveat worth knowing: a surprise is ~15 commands, so undoing one is ~15
   * taps. The intended way back is to tap it again — `generateBeat` clears the
   * layers it made before laying down a new groove, so it re-rolls rather than
   * stacking.
   */
  private makeEmptyPrompt(): Phaser.GameObjects.Container {
    const style = {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "12px",
      color: LABEL_COLOR,
      align: "center",
      lineSpacing: 8,
    } as const;
    const hint = this.add.text(0, 0, "Empty car —\ntap an instrument below", style).setOrigin(0.5);
    const chip = this.add.graphics();
    // Plain caps: Press Start 2P carries no emoji glyphs (a ✨ renders as tofu).
    const label = this.add
      .text(0, 0, "SURPRISE ME!", { ...style, color: "#2b2440" })
      .setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });
    let armed = false;
    hit.on("pointerdown", () => { armed = true; label.setScale(0.94); });
    hit.on("pointerout", () => { armed = false; label.setScale(1); });
    hit.on("pointerup", () => {
      label.setScale(1);
      if (!armed) return;
      armed = false;
      EventBus.emit("workshop-surprise");
    });
    return this.add.container(0, 0, [hint, chip, label, hit]).setDepth(6);
  }

  /** Centre the empty prompt on the slate and size its chip to it. */
  private layoutEmptyPrompt(cx: number, cy: number, gw: number, gh: number): void {
    const c = this.emptyText;
    if (!c) return;
    const [hint, chip, label, hit] = c.list as [
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Graphics,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Rectangle,
    ];
    c.setPosition(cx, cy);
    const fs = Math.max(10, Math.round(gh * 0.055));
    hint.setFontSize(fs).setPosition(0, -gh * 0.12);
    label.setFontSize(Math.round(fs * 1.15));

    const w = Math.min(gw * 0.5, label.width + gh * 0.14);
    const h = Math.max(fs * 3, gh * 0.14);
    const y = gh * 0.14;
    const rad = Math.min(h * 0.3, 18);
    chip
      .clear()
      .fillStyle(0xe9d7ac, 1)
      .fillRoundedRect(-w / 2, y - h / 2, w, h, rad)
      .lineStyle(Math.max(2, h * 0.06), 0x2b2440, 1)
      .strokeRoundedRect(-w / 2, y - h / 2, w, h, rad);
    label.setPosition(0, y);
    hit.setPosition(0, y).setSize(w * 1.1, h * 1.2);
  }

  private layoutGrid(): void {
    const r = this.backgroundRect;
    if (r.width === 0 || this.slateRect.w === 0) return;
    // The grid mounts on the chalkboard's slate (layoutCarLayer computed it).
    const { x: gx, y: gy, w: gw, h: gh } = this.slateRect;

    if (this.emptyText) this.layoutEmptyPrompt(gx + gw / 2, gy + gh / 2, gw, gh);

    const laneCount = Math.max(WORKSHOP_GRID_V2.minRows, this.rows.length);
    const labelW = gw * WORKSHOP_GRID_V2.labelFrac;
    this.gridLeft = gx + labelW;
    this.gridTop = gy;
    this.cellW = (gw - labelW) / STEP_COUNT;
    this.cellH = gh / laneCount;
    const pad = Math.min(this.cellW, this.cellH) * WORKSHOP_GRID_V2.cellPad;

    const iconPx = Math.max(11, Math.min(this.cellH * 0.62, labelW * 0.26));
    // Kid-size the row buttons: a 12px glyph is an impossible touch target,
    // so grow each text's hit area well past its bounds (row-height pads).
    const growHit = (t: Phaser.GameObjects.Text): void => {
      const pad = Math.max(10, this.cellH * 0.35);
      (t.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(
        -pad, -pad, t.width + pad * 2, t.height + pad * 2,
      );
    };
    this.rows.forEach((row, li) => {
      const cy = gy + (li + 0.5) * this.cellH;
      // Lane band: full grid width, a hair shorter than the row so a thin gap
      // separates adjacent lanes.
      row.band.setPosition(gx, cy).setSize(gw, this.cellH * 0.86);
      // Label column layout (left to right):
      //   [✕ delete] [instrument emoji] [🎹 edit (melody only)] [🔇/🔊 mute]
      row.del.setPosition(gx + labelW * 0.12, cy).setFontSize(iconPx);
      row.label.setPosition(gx + labelW * 0.38, cy);
      if (row.label instanceof Phaser.GameObjects.Text) {
        row.label.setFontSize(iconPx);
      } else {
        // Instrument sprite icon: uniform-fit into the row height.
        const s = Math.min((this.cellH * 0.92) / row.label.height, (labelW * 0.3) / row.label.width);
        row.label.setScale(s);
      }
      row.edit?.setPosition(gx + labelW * 0.62, cy).setFontSize(iconPx);
      row.mute.setPosition(gx + labelW * 0.86, cy).setFontSize(iconPx);
      growHit(row.del);
      if (row.edit) growHit(row.edit);
      growHit(row.mute);
      row.cells.forEach((cell, i) => {
        cell.setPosition(this.gridLeft + (i + 0.5) * this.cellW, cy);
        cell.setSize(Math.max(2, this.cellW - pad), Math.max(2, this.cellH - pad));
      });
    });

    // The playhead column spans only the REAL lanes, not the min-row padding.
    this.playhead?.setSize(this.cellW, this.cellH * Math.max(1, this.rows.length));
  }

  private layoutFixtures(): void {
    this.layoutChrome();
    this.layoutCarLayer(); // must precede the grid: it computes slateRect
    this.layoutGrid();
  }
}
