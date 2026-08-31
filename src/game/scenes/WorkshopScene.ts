// The Workshop view (v3 — Three-Zone refactor):
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
// The base plate is the clean depot interior (`workshop-interior-clean.png`),
// with the open car and all UI drawn as separate sprites on top.
//
// (The old 8-icon toolbar and the SONG/SPEED baked chrome were retired here.
// So was the 4-way car-type picker in its ORIGINAL sense — a control that
// re-skinned the CURRENT car. The dropdown below shares its ART but is a
// different control: it STARTS A NEW CAR and is labelled to say so. The
// `setCarType` command remains live because choosing a different shape while an
// empty car is already on the bench changes that car rather than adding one.)
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { attachUndoToast, type UndoToast } from "../undo-toast.ts";
import { SCENE_BG_V2, CAR_OPEN_SPRITES, CAR_SIDE_SPRITES, CAR_SIDE_CANVAS, CAR_SIDE_VOID, type ImageAsset, type OpenCarAsset } from "../assets.ts";
import { loadUiSprites, CHALKBOARD_SLATE } from "../ui-sprites.ts";
import { WORKSHOP_GRID_V2 } from "../scene-layout.ts";
import { workshopBoardActionSlots, type WorkshopBoardActionSlot } from "../workshop-board-layout.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { placeSpawn } from "../TiledSceneAdapter.ts";
import { spawnUiLayer, relayoutUiLayer, type UiElement } from "../ui-scene.ts";
import { UI_ATLAS_KEY, UI_SPRITES, contentHitRect, hasUiFrame, hitRectContains, placeUiSprite, type UiSpriteDef, type ContentBox } from "../ui-sprites.ts";
import { drawGlyph } from "../car-livery.ts";
import { CHIP_EDGE, colorFor, darken, glyphFor, hexToInt, inkOn } from "../livery-style.ts";
import { asLiveryCoat, setLiveryColor, setLiveryTexture, type LiveryCoat } from "../car-tint.ts";
import workshopMap from "../../assets/maps/workshop.json";
import { CAR_COLORS } from "../../core/car-identity.ts";
import { STEP_COUNT, CAR_TYPES, MAX_CARS, type CarType, type LaneKind } from "../../core/types.ts";
import {
  BaseToolPanel,
  VoiceToolPanel,
  VoiceKeysToolPanel,
  PadsToolPanel,
  PercussionToolPanel,
  MagicToolPanel,
  MelodyEditorPanel,
  type ToolModel,
} from "../tool-panels.ts";

/** One sequencer lane, derived by React from the active car's layers. */
export interface WorkshopLane {
  readonly id: string;
  readonly label: string; // emoji / short tag for the row (icon fallback)
  readonly icon: string | null; // UI_SPRITES key of the row's instrument sprite
  /** The SOUND's own emoji, when the character alone cannot name it — eight
   *  drum lanes share one drummer, so the board needs to say which drum. */
  readonly badge: string | null;
  /** AR-054's painted icon for that same sound (`soundIconFrame`). Drawn over
   *  the badge when the atlas has it; the emoji stays as the fallback. */
  readonly badgeIcon: string | null;
  readonly color: string; // laneColor() — the lane-group colour
  readonly kind: LaneKind; // melody lanes get a piano-roll edit button
  readonly cells: readonly boolean[]; // length STEP_COUNT
  readonly muted: boolean; // whether this lane is currently muted
}

/** One crew member standing on the car, and what tapping them edits. ONE
 *  character per instrument — the frog carries ALL percussion, each melody
 *  character carries its own lane — instead of the one-rider-per-lane row of
 *  five identical frogs Eric reported. Tapping a rider goes STRAIGHT to that
 *  character's editor; the whole-train chalkboard is the conductor's view. */
export interface WorkshopCrewMember {
  readonly key: string; // UI_SPRITES key (inst-*)
  readonly action:
    | { readonly kind: "melody"; readonly layerId: string }
    | { readonly kind: "percussion" };
}

/** What the scene needs to render, pushed from the store on every change. */
export interface WorkshopModel {
  readonly lanes: readonly WorkshopLane[];
  readonly crew: readonly WorkshopCrewMember[];
  readonly carType: CarType;
  /** The active car's NAME and LIVERY index, shown on the LCD. Same glyph, same
   *  colour the Yard paints on that car's flank — seeing them together while
   *  editing is what makes the mark mean something on a siding later. */
  readonly carName: string;
  readonly livery: number;
  /**
   * Which OTHER car wears each taken livery colour, by car id.
   *
   * It used to be a bare list of colours, and the rack drew a ✕ through each
   * one: "this is spoken for, you may not have it". But a colour with an owner
   * is not a dead chip — it is that CAR, sitting right there on the rack, and
   * every screen already teaches the kid that the colour IS the car. So the
   * chip became the way back into it, which is what Eric asked for: tap your
   * red car's red and the red car opens. That needs the owner's id, not just
   * the fact that somebody owns it.
   */
  readonly colorOwners: readonly { color: string; partId: string }[];
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
function chalkTint(colorInt: number, amount = 0.45): number {
  const c = Phaser.Display.Color.IntegerToColor(colorInt);
  const mix = (v: number): number => Math.round(v + (255 - v) * amount);
  return Phaser.Display.Color.GetColor(mix(c.red), mix(c.green), mix(c.blue));
}

/**
 * How a step cell is painted, in ONE place.
 *
 * `buildGrid` and `diffCells` used to spell the same fill/alpha pair out
 * separately, so the on-state existed twice and could drift. It also had to:
 * the note was a flat 95%-alpha bar with a hairline grid stroke, which is
 * exactly the "little bars" Eric keeps reporting. A note now gets a CHALK-WHITE
 * rim around a lane-coloured core — the two-tone edge is what makes a mark read
 * as pressed chalk rather than as a rectangle — while an empty step stays a
 * faint ruling, so the grid is legible without competing with the notes on it.
 */
function paintCell(
  cell: Phaser.GameObjects.Rectangle,
  colorInt: number,
  on: boolean,
  edgePx: number,
): void {
  cell.setFillStyle(on ? chalkTint(colorInt, 0.28) : OFF_FILL, on ? 1 : OFF_ALPHA);
  cell.setStrokeStyle(on ? edgePx : 1, CHALK, on ? 0.92 : CHALK_GRID_ALPHA);
}

const toInt = (hex: string): number => Phaser.Display.Color.HexStringToColor(hex).color;

// ── THE PAINT RACK ──────────────────────────────────────────────────────────
// A kid picks a car's colour here, kidpix-style: a rack of chips that is always
// on screen, not a menu you have to summon. Colour is the channel cars are told
// apart BY in the Yard and on the Track, and until now it was assigned by
// `addCar` and unchangeable — the one identity channel the kid had no say in.
//
// It hangs on the LEFT WALL because that is the only permanently free space in
// this room: the header plate takes everything above y≈0.26, the instrument
// characters stand from y≈0.635 down, the car fills the middle, and the
// transport plate takes the floor. Fractions of the background rect, not pixels,
// so it tracks the contain-fit letterbox the same way the Tiled chrome does.
const RACK = { x0: 0.027, y0: 0.278, x1: 0.16, y1: 0.611 } as const;
const RACK_COLS = 2;

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
// AR-052's cabin pair, both authored on the punched void's own canvas.
//
// PER CAR TYPE, falling back to the shared pair. A hopper is a slatted bin and
// a tanker is a steel cylinder; giving both of them the boxcar's timber room is
// the second half of Eric's report ("it also doesn't change per car"), and the
// fix has to be a lookup rather than a later edit — the art agent drops
// `workshop-car-interior-hopper.png` in and it appears, with no code change and
// no chance of the four getting out of step with the four car types.
function cabinFor(scene: Phaser.Scene, type: CarType, layer: "interior" | "foreground-rail"): UiSpriteDef {
  const perType = UI_SPRITES[`workshop-car-${layer}-${type}`];
  // The ATLAS decides, not the manifest: the per-type keys are registered ahead
  // of the art so the drop needs no code change, which means a registered key
  // whose PNG has not been drawn yet must fall back rather than ask Phaser for
  // a frame that is not there.
  if (perType && hasUiFrame(scene, perType.base)) return perType;
  return UI_SPRITES[`workshop-car-${layer}`]!;
}

const DEPTH_CAR = 0.4;
const DEPTH_WASH = 0.5; // the livery, over the body and under everything else
const DEPTH_RIDER = 0.7; // the crew, standing in the car's open interior
/** The board is a MODAL now — above the chrome, below the tool panels and the
 *  edit-vs-new modal, both of which must be able to cover it. */
const DEPTH_BOARD = 40;

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
  badge: Phaser.GameObjects.Text | null; // the sound's own emoji, when it has one
  /** AR-054's painted sound icon, drawn over the (then blanked) badge. The
   *  badge Text stays underneath as the hit target, so the tap, the press
   *  scale and the layout slot are all still ONE object's job. */
  badgeIcon: Phaser.GameObjects.Image | null;
  edit: Phaser.GameObjects.Text | null; // 🎹 piano-roll (melody lanes only)
  mute: Phaser.GameObjects.Text; // 🔇 mute toggle
  colorInt: number;
  cells: Phaser.GameObjects.Rectangle[];
  on: boolean[];
}

export class WorkshopScene extends BackgroundScene {
  static readonly KEY = "WorkshopScene";

  private model: WorkshopModel = { lanes: [], crew: [], carType: "boxcar", carName: "Loop 1", livery: 0, colorOwners: [], selectedLayerId: null, tempoBpm: 120, carCount: 1 };
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
  /** The car's livery, as two overlays of its own silhouette — see
   *  `car-tint.ts`. This is what makes the paint rack visibly paint the car. */
  private carCoat: LiveryCoat | undefined;
  private carInterior: Phaser.GameObjects.Graphics | undefined;
  private carCabin: Phaser.GameObjects.Image | undefined;
  private cabinCoat: LiveryCoat | undefined;
  private carRail: Phaser.GameObjects.Image | undefined;
  /** AR-060's near lip, drawn over the crew when the open car is in use. */
  private carFront: Phaser.GameObjects.Image | undefined;
  // ── the crew and their board ───────────────────────────────────────────────
  // The chalkboard used to be BOLTED to the car, filling its whole interior, and
  // that was the problem: it hid the car art entirely, and the instrument
  // characters standing on the workshop floor overlapped its lowest rows, so on
  // a car with several lanes those rows could not be tapped at all — you hit a
  // character instead. Eric reported both.
  //
  // So the board became a modal and the car got a CREW. Each lane is a rider
  // standing in the open interior, drawn with that instrument's own character
  // art — the same sprite the kid tapped on the shelf to make the lane. Tapping
  // a rider goes STRAIGHT to that character's editor (melody roll, or the
  // frog's percussion grid) — the whole-train chalkboard is the conductor's
  // view now. The payoff Eric asked for ("you physically see the character on
  // the train car") needs no new art at all in this form: the characters
  // already exist, in three states each.
  private riders: {
    member: WorkshopCrewMember;
    img: Phaser.GameObjects.Image;
    def: UiSpriteDef;
    /** Where the character's visible art is centred, in scene px. The image's
     *  own x/y is its CANVAS centre, which sits well off the art on these
     *  heavily-padded sprites — a test tapping that would miss. */
    cx: number;
    cy: number;
  }[] = [];
  private board: Phaser.GameObjects.Image | undefined;
  private boardModal: Phaser.GameObjects.Container | undefined;
  private boardBackdrop: Phaser.GameObjects.Rectangle | undefined;
  private boardSounds: Phaser.GameObjects.Container | undefined;
  private boardDone: Phaser.GameObjects.Container | undefined;
  private boardOpen = false;
  // The paint rack: one plate, one Graphics for all the chips (redrawn only on
  // layout or model change), and an invisible hit zone per chip.
  private rackPlate: Phaser.GameObjects.Graphics | undefined;
  private rackChips: Phaser.GameObjects.Graphics | undefined;
  private rackHits: Phaser.GameObjects.Rectangle[] = [];
  private rackCells: { x: number; y: number; w: number; h: number }[] = [];
  /** The board's slate surface in screen px — the grid's mount rect. */
  private slateRect = { x: 0, y: 0, w: 0, h: 0 };
  /** The car's open interior in screen px — where the crew stands. */
  private voidRect = { x: 0, y: 0, w: 0, h: 0 };
  private departing = false;
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
    // reposition, so a late arrival is dimensionally safe.
    //
    // It preloads the OPEN car, and that must stay true. Loading it later —
    // from `showCar`, once the scene was already live — put a 4 MB PNG decode
    // on the main thread at whatever moment the kid opened the Workshop, and
    // when that overlapped a mic take the recorder handed back a blob its own
    // decoder rejected and the recording was lost. Preload is the phase for
    // paying that cost; the e2e mic proof is what says so.
    const boot: ImageAsset[] = CAR_OPEN_SPRITES[DEFAULT_CAR_TYPE].url
      ? [CAR_OPEN_SPRITES[DEFAULT_CAR_TYPE], CAR_OPEN_SPRITES[DEFAULT_CAR_TYPE].front]
      : [CAR_SIDE_SPRITES[DEFAULT_CAR_TYPE]];
    for (const a of boot) {
      if (!this.textures.exists(a.key)) this.load.image(a.key, a.url);
    }
    this.chromeSpawns = parseTiledLayer(workshopMap, "ui-layer");
    loadUiSprites(this); // the one packed chrome multiatlas
  }

  create(): void {
    this.addBackground("contain"); // never crop the top/bottom bars off-screen
    this.buildCarLayer();
    this.buildChrome();
    this.buildColorRack();
    this.buildCarPicker();
    this.buildGrid();
    this.buildToolPanels();
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
  /** AR-060's open car for `type`, once its texture is resident. Null until
   *  then (and forever, if the art is absent) — the punched-void assembly is
   *  the fallback and every reader below branches on this. */
  private openCar(type: CarType): OpenCarAsset | null {
    const asset = CAR_OPEN_SPRITES[type];
    return asset.url && this.textures.exists(asset.key) ? asset : null;
  }

  private showCar(type: CarType): void {
    // AR-060 first: a car drawn open, with its own interior, is ONE picture and
    // needs no void, no cabin and no rail. The old body is the fallback.
    const open = CAR_OPEN_SPRITES[type];
    const asset = open.url ? open : CAR_SIDE_SPRITES[type];

    const apply = (): void => {
      // The scene can be torn down mid-flight when navigation swaps scenes.
      if (!this.car?.scene || this.model.carType !== type) return;
      if (!this.textures.exists(asset.key)) return;
      this.car.setTexture(asset.key);
      // The coat is the body's OWN silhouette — it has to follow the swap, or
      // the livery ends up painted on the shape of the previous car type.
      if (this.carCoat) setLiveryTexture(this.carCoat, asset.key);
      if (this.carFront && this.textures.exists(open.front.key)) {
        this.carFront.setTexture(open.front.key);
      }
      // AFTER the texture lands, not before: how much livery a car takes
      // depends on whether it is one of AR-060's already-painted bodies, and
      // that question can only be answered once the body is resident. Set on
      // the way in, it answered "no" for every car and flooded them all.
      this.refreshLivery();
      this.layoutFixtures();
    };

    // The cache check sits HERE, immediately before the queue, and not only
    // because rule 7 measures the distance: an open car is two files, and the
    // body arriving without its near lip is a car whose crew stands in front of
    // the part that should occlude them.
    const pending: ImageAsset[] = [];
    if (!this.textures.exists(asset.key)) pending.push(asset);
    if (open.url && !this.textures.exists(open.front.key)) pending.push(open.front);
    if (pending.length === 0) {
      apply();
      return;
    }
    for (const a of pending) this.load.image(a.key, a.url);
    this.load.once(Phaser.Loader.Events.COMPLETE, apply);
    this.load.start();
  }

  // ── the layered field: car sprite + chalkboard in its void ─────────────────
  private buildCarLayer(): void {
    // The car's interior, BEHIND the body. The legacy car art has a real hole
    // where the chalkboard used to show through; with the board gone,
    // that hole shows the workshop's brick wall, and the crew stands in what
    // reads as a black rectangle. This is the inside of the car — no art has
    // ever existed for it, because it was covered from the day it was cut.
    // Drawn behind the body so the car's own edges mask it and nothing has to
    // match the hole's outline.
    this.carInterior = this.add.graphics().setDepth(DEPTH_CAR - 0.05);
    // AR-052: the painted cabin, in two layers that sandwich the crew — the
    // timber back wall behind the body, the bench rail in front of the riders'
    // legs. The graphics bands above stay as the fallback for a cold atlas.
    if (this.textures.exists(UI_ATLAS_KEY)) {
      // Both start on the DEFAULT car's pair and are re-framed per car type by
      // `drawCarInterior`, which is the one place that runs on every car change.
      this.carCabin = this.add
        .image(0, 0, UI_ATLAS_KEY, cabinFor(this, DEFAULT_CAR_TYPE, "interior").base)
        .setOrigin(0.5)
        .setDepth(DEPTH_CAR - 0.04);
      // THE CABIN WEARS THE CAR'S PAINT. Without this the body is livery-tinted
      // and the room inside it is not, so a gold tanker had a blue-grey steel
      // room in it — two different colour worlds meeting at a hard rectangle,
      // which is most of why the interior still read as pasted on rather than
      // as part of the car. Same coat, same technique as the body itself.
      this.cabinCoat = asLiveryCoat(
        this.carCabin,
        this.add
          .image(0, 0, UI_ATLAS_KEY, cabinFor(this, DEFAULT_CAR_TYPE, "interior").base)
          .setOrigin(0.5)
          .setDepth(DEPTH_CAR - 0.035),
      );
      this.carRail = this.add
        .image(0, 0, UI_ATLAS_KEY, cabinFor(this, DEFAULT_CAR_TYPE, "foreground-rail").base)
        .setOrigin(0.5)
        .setDepth(DEPTH_RIDER + 0.05);
    }
    // AR-060's near lip — the part of the OPEN car that must draw in front of
    // the crew's legs. Same canvas and same transform as the body, so it needs
    // no registration of its own.
    this.carFront = this.add
      .image(0, 0, CAR_OPEN_SPRITES[DEFAULT_CAR_TYPE].front.key)
      .setOrigin(0.5)
      .setDepth(DEPTH_RIDER + 0.06)
      .setVisible(false);
    // Always constructed on the preloaded default, then corrected by `showCar`:
    // the real car type arrives from React and may not be resident yet.
    this.car = this.add
      .image(0, 0, CAR_SIDE_SPRITES[DEFAULT_CAR_TYPE].key)
      .setDepth(DEPTH_CAR);
    // The body IS the coat's shade pass — see `car-tint.ts`. One extra
    // full-scene draw, not two.
    this.carCoat = asLiveryCoat(
      this.car,
      this.add.image(0, 0, CAR_SIDE_SPRITES[DEFAULT_CAR_TYPE].key).setDepth(DEPTH_WASH),
    );
    this.showCar(this.model.carType);
    this.buildBoardModal();
  }

  /** The sequencer, as a popup: a dimmed backdrop, the chalkboard at full size,
   *  and SOUNDS / DONE chips. The grid rows are added to this container as they
   *  are built, so they ride above the backdrop without depth bookkeeping. */
  private buildBoardModal(): void {
    this.boardBackdrop = this.add
      .rectangle(0, 0, 10, 10, 0x000000, 0.66)
      .setOrigin(0)
      .setInteractive();
    // Tapping outside the board closes it — the forgiving way out, alongside
    // the explicit chip. (Eric: "then you click okay when you're ready".)
    this.boardBackdrop.on("pointerup", () => this.closeBoard());
    this.board = this.add.image(0, 0, UI_ATLAS_KEY, UI_SPRITES["sequencer-chalkboard"]!.base);
    this.boardSounds = this.makeBoardChip(
      "SOUNDS",
      "workshop-board:sounds",
      () => EventBus.emit("workshop-open-tool", "sound-pads"),
      "♫",
    );
    this.boardDone = this.makeBoardChip("DONE", "workshop-board:done", () => this.closeBoard(), null);
    this.boardModal = this.add
      .container(0, 0, [this.boardBackdrop, this.board, this.boardSounds, this.boardDone])
      .setDepth(DEPTH_BOARD)
      .setVisible(false);
  }

  /** A board action on the cream chip this app uses for every affirmative. */
  private makeBoardChip(
    text: string,
    name: string,
    onPress: () => void,
    pictogram: string | null,
  ): Phaser.GameObjects.Container {
    const chip = this.add.graphics();
    const icon = this.add
      .text(0, 0, pictogram ?? "", { fontFamily: "system-ui, sans-serif", fontSize: "24px", color: "#2b2440" })
      .setOrigin(0.5)
      .setVisible(pictogram !== null);
    const label = this.add
      .text(0, 0, text, { ...LCD_STYLE, fontSize: "20px" })
      .setOrigin(0.5);
    const hit = this.add
      .rectangle(0, 0, 10, 10, 0xffffff, 0.001)
      .setName(name)
      .setInteractive({ useHandCursor: true });
    const setContentScale = (scale: number): void => {
      icon.setScale(scale);
      label.setScale(scale);
    };
    let armed = false;
    hit.on("pointerdown", () => { armed = true; setContentScale(0.94); });
    hit.on("pointerout", () => { armed = false; setContentScale(1); });
    hit.on("pointerup", () => {
      setContentScale(1);
      if (!armed) return;
      armed = false;
      onPress();
    });
    return this.add.container(0, 0, [chip, icon, label, hit]);
  }

  /** Open the board on a lane. Selecting it is what makes "tap the drummer, edit
   *  the drums" true rather than "tap anyone, get the same board". */
  private openBoard(layerId: string | null): void {
    this.boardOpen = true;
    this.boardModal?.setVisible(true);
    if (layerId) EventBus.emit("workshop-layer-selected", layerId);
    this.layoutBoard();
    this.layoutGrid();
  }

  /** Hiding the container is enough to disarm everything on it: Phaser's
   *  `InputManager.inputCandidate` skips an invisible Game Object *and* any
   *  object with an invisible parent, so the full-screen backdrop stops
   *  swallowing taps on the car the moment the popup closes. */
  private closeBoard(): void {
    this.boardOpen = false;
    this.boardModal?.setVisible(false);
  }

  /** Exposed for the e2e bridge: is the sequencer popup on screen? */
  get boardVisible(): boolean {
    return this.boardOpen;
  }

  /** Exposed for the e2e bridge: the centre of each rider's ART, in scene px.
   *  A real tap on one of these is the only thing that proves the crew is
   *  reachable — geometry alone never has been (see the chrome hit-test spec). */
  get riderPoints(): { key: string; layerId: string | null; x: number; y: number }[] {
    return this.riders.map((r) => ({
      key: r.member.key,
      layerId: r.member.action.kind === "melody" ? r.member.action.layerId : null,
      x: r.cx,
      y: r.cy,
    }));
  }

  /**
   * Size the board to the VIEWPORT, not to a slot on the car.
   *
   * That is the whole point of the move: mounted in the car's interior void the
   * board was ~1600x430 of a 2560x1440 scene, so eight lanes of sixteen steps
   * had 54 px rows and the label column's ✕ / mute / edit glyphs were 11 px —
   * under a fingertip, and half-covered by the characters on the floor.
   */
  private layoutBoard(): void {
    const b = this.board;
    if (!b || !this.boardBackdrop || !this.boardSounds || !this.boardDone) return;
    const { width, height } = this.scale.gameSize;
    this.boardBackdrop.setSize(width, height);

    const def = UI_SPRITES["sequencer-chalkboard"]!;
    const [x0, y0, x1, y1] = def.content;
    // The board is registered as a stretching panel; feed it a rect at its own
    // aspect so the stretch is a no-op and the frame stays square-cornered.
    const aspect = ((y1 - y0) * b.height) / ((x1 - x0) * b.width);
    let w = width * 0.84;
    let h = w * aspect;
    // Capped so the DONE chip below the board still clears the transport plate
    // at the bottom of the screen — the board is big, not maximal.
    if (h > height * 0.6) {
      h = height * 0.6;
      w = h / aspect;
    }
    const cy = height * 0.41;
    placeUiSprite(b, def, { x: width / 2, y: cy, width: w, height: h });

    const bs = b.scaleX;
    const bLeft = b.x - (b.width / 2) * bs;
    const bTop = b.y - (b.height / 2) * b.scaleY;
    const [sx0, sy0, sx1, sy1] = CHALKBOARD_SLATE;
    this.slateRect = {
      x: bLeft + sx0 * b.width * bs,
      y: bTop + sy0 * b.height * b.scaleY,
      w: (sx1 - sx0) * b.width * bs,
      h: (sy1 - sy0) * b.height * b.scaleY,
    };

    const slots = workshopBoardActionSlots({ centerX: width / 2, centerY: cy, width: w, height: h });
    this.layoutBoardChip(this.boardSounds, slots.sounds);
    this.layoutBoardChip(this.boardDone, slots.done);
    this.boardModal?.bringToTop(this.boardSounds);
    this.boardModal?.bringToTop(this.boardDone);
  }

  private layoutBoardChip(
    chip: Phaser.GameObjects.Container,
    slot: WorkshopBoardActionSlot,
  ): void {
    const [chipG, icon, label, hit] = chip.list as [
      Phaser.GameObjects.Graphics,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Rectangle,
    ];
    const { x, y, faceWidth, faceHeight, hitWidth, hitHeight } = slot;
    const hasPictogram = icon.visible;
    icon
      .setFontSize(Math.max(20, Math.round(faceHeight * 0.46)))
      .setPosition(x - faceWidth * 0.31, y);
    label
      .setFontSize(Math.max(14, Math.round(faceHeight * (hasPictogram ? 0.28 : 0.34))))
      .setPosition(x + (hasPictogram ? faceWidth * 0.1 : 0), y);
    hit.setPosition(x, y).setSize(hitWidth, hitHeight);
    chipG
      .clear()
      .fillStyle(LCD_CREAM, 1)
      .fillRoundedRect(x - faceWidth / 2, y - faceHeight / 2, faceWidth, faceHeight, Math.min(faceHeight * 0.3, 18))
      .lineStyle(Math.max(2, faceHeight * 0.06), 0x2b2440, 1)
      .strokeRoundedRect(x - faceWidth / 2, y - faceHeight / 2, faceWidth, faceHeight, Math.min(faceHeight * 0.3, 18));
  }

  /** Place the car on its Tiled anchor (wheels on the rails), then stand the
   *  crew in its standardized interior void. */
  private layoutCarLayer(): void {
    const r = this.backgroundRect;
    if (r.width === 0 || !this.car) return;
    const { width, height } = this.scale.gameSize;
    const anchor = this.chromeSpawns.find((s) => s.id === "car-anchor");
    if (!anchor) return;
    const target = placeSpawn(anchor, r, { width, height });

    // Contain-fit the content box, bottom-aligned so the wheels sit on the
    // anchor rect's bottom edge (the painted near rail).
    //
    // Per type, not the one shared constant. The four `car-side-*` files were
    // drawn on a common box, which is why one constant worked; the AR-060 open
    // cars are four separate drawings whose boxes genuinely differ (the flatcar
    // runs 200px lower in its canvas than the tanker), so each carries its own.
    const content = this.openCar(this.model.carType)?.content ?? CAR_CONTENT;
    const carDef: UiSpriteDef = { states: {}, base: "", content, stretch: false };
    placeUiSprite(this.car, carDef, target);
    const s = this.car.scaleX;
    const contentBottom = this.car.y + (content[3] - 0.5) * CAR_SIDE_CANVAS.h * s;
    this.car.y += target.y + target.height / 2 - contentBottom;
    // Same texture, same transform — the fill IS the car, drawn once more.
    this.carCoat?.fill.setPosition(this.car.x, this.car.y).setScale(this.car.scaleX, this.car.scaleY);
    // The near lip shares the body's canvas, so it shares its transform whole.
    this.carFront
      ?.setVisible(this.openCar(this.model.carType) !== null)
      .setPosition(this.car.x, this.car.y)
      .setScale(this.car.scaleX, this.car.scaleY);

    this.voidRect = this.carVoidRect();
    this.drawCarInterior();
    this.layoutRiders();
  }

  /**
   * The car's inside.
   *
   * AR-052's two painted layers when the atlas has them: both are authored on
   * the void's own 1612x430 canvas, so they stretch onto `voidRect` and land in
   * register with each other and with the punched hole by construction.
   *
   * The two flat colour bands below are what shipped before the art existed —
   * a lit back wall and a lighter floor in the car's own livery — and they are
   * the fallback for a cold atlas ONLY. The painted rear layer covers the void
   * edge to edge, so drawing the bands under it would just be a second answer
   * to the same question, and the one that shows if the registration ever slips.
   */
  private drawCarInterior(): void {
    const g = this.carInterior;
    const v = this.voidRect;
    if (!g || v.w === 0) return;
    // The bands are drawn in absolute screen coords, so the departure tween's
    // leftover x offset has to be cleared before the next car is drawn.
    g.setPosition(0, 0).clear();

    // AR-060: the open car IS its own interior. Nothing to assemble, and every
    // layer of the old assembly has to get out of the way — a cabin stretched
    // into a crew rect that is no longer a punched hole would be a rectangle
    // pasted over the drawing, which is the fault this art replaced.
    if (this.openCar(this.model.carType)) {
      this.carCabin?.setVisible(false);
      this.cabinCoat?.fill.setVisible(false);
      this.carRail?.setVisible(false);
      return;
    }
    this.carCabin?.setVisible(true);
    this.cabinCoat?.fill.setVisible(true);
    this.carRail?.setVisible(true);

    if (this.carCabin || this.carRail) {
      const rect = { x: v.x + v.w / 2, y: v.y + v.h / 2, width: v.w, height: v.h };
      const rear = cabinFor(this, this.model.carType, "interior");
      const rail = cabinFor(this, this.model.carType, "foreground-rail");
      // The frame is re-set here, not only at construction: the car type
      // changes under a live panel (New Car, or opening a different car), and
      // this is the one place that already re-runs on every such change.
      if (this.carCabin) placeUiSprite(this.carCabin.setFrame(rear.base), rear, rect);
      if (this.cabinCoat) {
        // The coat is the SAME picture drawn once more, so it has to follow the
        // cabin's frame and transform exactly — a coat left on last car type's
        // frame paints this car's colour onto last car's room.
        this.cabinCoat.fill.setFrame(rear.base);
        placeUiSprite(this.cabinCoat.fill, rear, rect);
        setLiveryColor(this.cabinCoat, colorFor(this.model.livery));
      }
      if (this.carRail) placeUiSprite(this.carRail.setFrame(rail.base), rail, rect);
      return;
    }

    const color = colorFor(this.model.livery);
    const pad = Math.max(6, v.h * 0.04); // bleed under the car's own edges
    g.fillStyle(darken(color, 0.74), 1)
      .fillRect(v.x - pad, v.y - pad, v.w + pad * 2, v.h + pad * 2)
      .fillStyle(darken(color, 0.52), 1)
      .fillRect(v.x - pad, v.y + v.h * 0.8, v.w + pad * 2, v.h * 0.2 + pad);
  }

  /** The car's standardized interior void, in screen px — where the crew
   *  stands and, when the car is empty, where the prompt goes. */
  private carVoidRect(): { x: number; y: number; w: number; h: number } {
    const car = this.car;
    if (!car) return { x: 0, y: 0, w: 0, h: 0 };
    const sx = car.scaleX;
    const sy = car.scaleY;
    const canvasLeft = car.x - (CAR_SIDE_CANVAS.w / 2) * sx;
    const canvasTop = car.y - (CAR_SIDE_CANVAS.h / 2) * sy;
    // The OPEN car carries its own opening, so the crew stands where that car's
    // artist said they stand — not in one rectangle shared by four bodies.
    const box = this.openCar(this.model.carType)?.crew ?? CAR_SIDE_VOID;
    return {
      x: canvasLeft + box.x * sx,
      y: canvasTop + box.y * sy,
      w: box.w * sx,
      h: box.h * sy,
    };
  }

  /** Screen y the crew's feet stand on. The open car states it per type; the
   *  punched void has no floor of its own, so its crew stands near the bottom
   *  of the hole as it always did. */
  private carFloorY(): number {
    const car = this.car;
    const open = this.openCar(this.model.carType);
    const v = this.voidRect;
    if (!car || !open) return v.y + v.h * 0.9;
    return car.y - (CAR_SIDE_CANVAS.h / 2) * car.scaleY + open.floor * car.scaleY;
  }

  /**
   * One rider per lane, spread across the car's interior.
   *
   * Sized so a full car still gives each character a real touch target: the
   * void is split into equal slots and the character is contain-fitted into its
   * slot, which is the same rule the instrument shelf uses, so a rider and the
   * shelf character it came from read as the same creature at two sizes.
   */
  private layoutRiders(): void {
    const v = this.voidRect;
    if (v.w === 0 || this.riders.length === 0) return;
    const n = this.riders.length;
    const slotW = v.w / n;
    // Feet on the interior floor, not centred in the box: a character standing
    // ON something reads as riding it, and the slight overflow past the car's
    // open side is what makes the crew look like passengers rather than cargo.
    const h = v.h * 0.98;
    const floorY = this.carFloorY();
    this.riders.forEach((rider, i) => {
      rider.cx = v.x + (i + 0.5) * slotW;
      rider.cy = floorY - h / 2;
      placeUiSprite(rider.img, rider.def, {
        x: rider.cx,
        y: rider.cy,
        width: Math.min(slotW * 0.94, v.h * 0.9),
        height: h,
      });
      // Hit the CHARACTER, not the transparent padding around it — these
      // canvases run to roughly twice their content box, and at eight riders
      // the padding of one would swallow taps meant for its neighbour.
      rider.img.setInteractive({
        hitArea: contentHitRect(rider.def, rider.img.width || 1, rider.img.height || 1),
        hitAreaCallback: hitRectContains,
        useHandCursor: true,
      });
    });
  }

  /** Rebuild the crew from the model. Cheap and rare — it runs on the same lane
   *  SET change that rebuilds the grid, never per frame. */
  private buildRiders(): void {
    this.riders.forEach((r) => r.img.destroy());
    this.riders = [];
    this.model.crew.forEach((member) => {
      const def = UI_SPRITES[member.key] ?? UI_SPRITES["inst-drums"]!;
      const img = this.add.image(0, 0, UI_ATLAS_KEY, def.base).setDepth(DEPTH_RIDER);
      let armed = false;
      img.on("pointerdown", () => { armed = true; img.setFrame(def.states["hover"] ?? def.base); });
      img.on("pointerout", () => { armed = false; img.setFrame(def.base); });
      img.on("pointerup", () => {
        img.setFrame(def.base);
        if (!armed) return;
        armed = false;
        // Straight to the character's own editor — the kid tapped the husky,
        // so the husky's piano opens, not the whole-train board.
        if (member.action.kind === "melody") EventBus.emit("workshop-edit-melody", member.action.layerId);
        else EventBus.emit("workshop-open-tool", "beat-grid");
      });
      this.riders.push({ member, img, def, cx: 0, cy: 0 });
    });
  }

  // ── SEND TO YARD: slide the car (grid and all) off right, then hand off ────
  private bindSendToYard(): void {
    const onSend = (): void => this.departCar();
    EventBus.on("workshop-send-to-yard", onSend);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off("workshop-send-to-yard", onSend));
    // The conductor's view: its Tiled floor object emits this separate
    // whole-train intent. Riders still go straight to their own editors.
    const onOpenBoard = (): void => this.openBoard(null);
    EventBus.on("workshop-open-board", onOpenBoard);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off("workshop-open-board", onOpenBoard));
  }

  private departCar(): void {
    if (this.departing || !this.car) return;
    this.departing = true;
    // What leaves is the CAR and everyone riding it. The board is a popup over
    // the whole screen now, so sliding it sideways would read as the furniture
    // falling off the wall; it is simply closed.
    this.closeBoard();
    const targets: Phaser.GameObjects.GameObject[] = [this.car];
    if (this.carCoat) targets.push(this.carCoat.fill);
    // The cabin travels with the car it is the inside of. Left behind, the
    // painted back wall and bench rail would stay hanging in the workshop while
    // the car slid out from around them.
    if (this.carCabin) targets.push(this.carCabin);
    if (this.cabinCoat) targets.push(this.cabinCoat.fill);
    if (this.carRail) targets.push(this.carRail);
    if (this.carInterior) targets.push(this.carInterior);
    this.riders.forEach((rider) => targets.push(rider.img));
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
    for (const element of this.chrome) {
      (element.image ?? element.hit)?.setName(`workshop-control:${element.spawn.id}`);
    }

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

  // ── the paint rack (colour picker) ─────────────────────────────────────────

  /** Twelve chips on a board. One Graphics draws all of them — the rack only
   *  redraws on a layout or a model push, so there is nothing per-frame here —
   *  and each chip carries an invisible rectangle for the tap. */
  private buildColorRack(): void {
    this.rackPlate = this.add.graphics().setDepth(8);
    this.rackChips = this.add.graphics().setDepth(9);
    this.rackHits = CAR_COLORS.map((color) => {
      const hit = this.add
        .rectangle(0, 0, 10, 10, 0xffffff, 0.001)
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      // Armed press, as everywhere else in this scene: Phaser delivers
      // `pointerup` to whatever is under the pointer at release even when the
      // press began elsewhere, so a bare `pointerup` here would repaint the car
      // from a release that started on the car above.
      let armed = false;
      hit.on("pointerdown", () => { armed = true; });
      hit.on("pointerout", () => { armed = false; });
      hit.on("pointerup", () => {
        if (!armed) return;
        armed = false;
        // A chip with an owner OPENS that car; a free chip paints this one.
        // Both are "go to the car that is this colour" — for the free chip the
        // car in question is the one already on the bench.
        const owner = this.ownerOf(color);
        if (owner) EventBus.emit("workshop-open-car", owner);
        else EventBus.emit("workshop-car-color-picked", color);
      });
      return hit;
    });
  }

  /** The OTHER car wearing `color`, or null when the chip is free (or is this
   *  car's own colour, which has no "other" owner and must not be openable —
   *  tapping it would be a trip to where you already are). */
  private ownerOf(color: string): string | null {
    const c = color.toLowerCase();
    return this.model.colorOwners.find((o) => o.color.toLowerCase() === c)?.partId ?? null;
  }

  private layoutColorRack(): void {
    const r = this.backgroundRect;
    if (r.width === 0 || !this.rackPlate) return;
    const x0 = r.x + r.width * RACK.x0;
    const x1 = r.x + r.width * RACK.x1;
    const y0 = r.y + r.height * RACK.y0;
    const y1 = r.y + r.height * RACK.y1;
    const rows = Math.ceil(CAR_COLORS.length / RACK_COLS);
    const cw = (x1 - x0) / RACK_COLS;
    const ch = (y1 - y0) / rows;
    this.rackCells = CAR_COLORS.map((_, i) => ({
      x: x0 + (i % RACK_COLS) * cw,
      y: y0 + Math.floor(i / RACK_COLS) * ch,
      w: cw,
      h: ch,
    }));
    const pad = Math.min(cw, ch) * 0.3;
    this.rackPlate
      .clear()
      .fillStyle(CHIP_EDGE, 0.94)
      .fillRoundedRect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2, pad)
      .lineStyle(Math.max(3, pad * 0.3), 0x8a6b3a, 1)
      .strokeRoundedRect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2, pad);
    this.rackHits.forEach((hit, i) => {
      const c = this.rackCells[i];
      if (c) hit.setPosition(c.x + c.w / 2, c.y + c.h / 2).setSize(c.w, c.h);
    });
    this.drawColorRack();
  }

  /**
   * Chip states, and why each is drawn the way it is.
   *
   * THIS car's colour wears a cream ring — the same "this one" mark the
   * sounding car wears on the Track. Another car's colour wears a brass ring
   * and its full strength, because it is now a DOOR to that car rather than a
   * refusal: it used to be dimmed to 28% and struck through with a ✕, which was
   * the honest drawing while the chip did nothing, and is a lie now that
   * tapping it opens the car. Everything else is a plain full-strength chip.
   *
   * No text anywhere — the player is four.
   */
  private drawColorRack(): void {
    const g = this.rackChips;
    if (!g || this.rackCells.length === 0) return;
    const mine = colorFor(this.model.livery).toLowerCase();
    g.clear();
    CAR_COLORS.forEach((color, i) => {
      const cell = this.rackCells[i];
      if (!cell) return;
      const inset = Math.min(cell.w, cell.h) * 0.16;
      const x = cell.x + inset;
      const y = cell.y + inset;
      const w = cell.w - inset * 2;
      const h = cell.h - inset * 2;
      const rad = Math.min(w, h) * 0.24;
      const edge = Math.max(3, Math.min(w, h) * 0.09);
      const isMine = color.toLowerCase() === mine;
      const owned = !isMine && this.ownerOf(color) !== null;
      g.fillStyle(CHIP_EDGE, 1).fillRoundedRect(
        x - edge, y - edge, w + edge * 2, h + edge * 2, rad + edge,
      );
      g.fillStyle(hexToInt(color), 1).fillRoundedRect(x, y, w, h, rad);
      if (isMine || owned) {
        g.lineStyle(edge * 1.4, isMine ? 0xffe9b0 : 0x8a6b3a, 1).strokeRoundedRect(
          x - edge * 2, y - edge * 2, w + edge * 4, h + edge * 4, rad + edge * 2,
        );
      }
    });
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
      "beat-grid": new PercussionToolPanel(this),
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
    // One modal at a time. The conductor's chalkboard and a tool panel are both
    // full-screen popups with their own DONE, and a tool opening over an open
    // board leaves the board's chip poking out from under the machine — two
    // DONEs on screen, one of them belonging to something you cannot see.
    if (toolId) this.closeBoard();
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
    this.refreshLivery();
    this.refreshLcd();
  }

  /** The car's paint, everywhere it shows: the body wash, the LCD mark, and
   *  which chip on the rack is ringed. One call so they cannot disagree. */
  private refreshLivery(): void {
    // AR-060's cars carry their own materials, so they take a glaze rather than
    // the full coat the neutral-brown `car-side-*` art was tuned for.
    const painted = this.openCar(this.model.carType) !== null;
    if (this.carCoat) setLiveryColor(this.carCoat, colorFor(this.model.livery), painted);
    this.drawCarInterior();
    this.drawColorRack();
  }

  private refreshLcd(): void {
    // "SPEED", matching the Track's LCD — this read "TEMP", a truncation of
    // TEMPO that fit the chip but is not a word. Eric asked for SPEED here.
    this.tempoText?.setText(`SPEED ${Math.round(this.model.tempoBpm)}`);
    this.songText?.setText(
      `${this.model.livery + 1}\u00b7${this.model.carName.toUpperCase()}`,
    );
    this.drawLiveryMark(); // the name's width moved, so the glyph must too
  }

  /** React → scene: transport step 0..STEP_COUNT-1, or <0 when stopped. Called
   *  once per frame from React's rAF (the single getTransportStep read). */
  setPlayhead(step: number): void {
    this.playStep = step;
  }

  update(): void {
    if (!this.playhead) return;
    if (!this.boardOpen || this.playStep < 0 || this.rows.length === 0) {
      this.playhead.setVisible(false);
      return;
    }
    const step = this.playStep % STEP_COUNT;
    this.playhead.setVisible(true).setPosition(this.gridLeft + step * this.cellW, this.gridTop);
  }

  protected onResize(): void {
    if (!this.scene.isActive()) return;
    this.layoutFixtures();
    if (this.boardOpen) this.layoutBoard();
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
      r.badge?.destroy();
      r.badgeIcon?.destroy();
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
    this.buildRiders();

    if (lanes.length === 0) {
      // Nothing to edit, so the board cannot be reached and must not be left
      // open — a kid who deletes their last lane would otherwise be staring at
      // an empty slate with the car hidden behind it.
      this.closeBoard();
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
      // The sound's own emoji, in the slot the piano-roll button leaves empty on
      // a drum lane — which is exactly the lane that needs it.
      const painted = hasUiFrame(this, lane.badgeIcon);
      const badge = lane.badge
        ? this.makeIconText(painted ? "" : lane.badge, () => EventBus.emit("workshop-layer-selected", lane.id))
        : null;
      const badgeIcon = badge && painted
        ? this.add.image(0, 0, UI_ATLAS_KEY, lane.badgeIcon!).setOrigin(0.5).setDepth(7)
        : null;
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
        const cell = this.add.rectangle(0, 0, 10, 10).setOrigin(0.5).setDepth(5);
        paintCell(cell, colorInt, isOn, this.cellEdgePx());
        cell.setInteractive({ useHandCursor: true });
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
      this.rows.push({ layerId: lane.id, band, label, del, badge, badgeIcon, edit, mute, colorInt, cells, on });
    });

    // The playhead is a full-height chalk line sweeping the board (one cell
    // wide). Sits below the cells (depth 4) so notes still read on top.
    this.playhead = this.add.rectangle(0, 0, 10, 10, CHALK, 0.22).setOrigin(0, 0).setDepth(4).setVisible(false);
    // Everything drawn on the slate belongs to the popup, so it rides above the
    // backdrop. Order inside a Container is z-order, so the DONE chip is lifted
    // back to the top afterwards (`layoutBoard`).
    const onBoard: Phaser.GameObjects.GameObject[] = [this.playhead];
    this.rows.forEach((row) => {
      onBoard.push(row.band, row.label, row.del, row.mute, ...row.cells);
      if (row.badge) onBoard.push(row.badge);
      if (row.badgeIcon) onBoard.push(row.badgeIcon);
      if (row.edit) onBoard.push(row.edit);
    });
    this.boardModal?.add(onBoard);
    this.layoutGrid();
    this.refreshSelection();
  }

  /** The chalk rim's thickness, scaled to the cell so it stays a rim rather
   *  than becoming the whole note on a small screen. */
  private cellEdgePx(): number {
    return Math.max(2, Math.round(Math.min(this.cellW, this.cellH) * 0.09));
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
          const cell = row.cells[i];
          if (cell) paintCell(cell, row.colorInt, isOn, this.cellEdgePx());
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
    // The hint gets its OWN backing plate, drawn under it.
    //
    // It used to be bare cream text, and that was fine while the car's inside
    // was a flat dark band. AR-060's cars are drawn rooms — the boxcar's wall
    // is a rack of hand tools and jars — and cream 12px type over a tool board
    // is unreadable. The words have to bring their own quiet background now.
    const hintPlate = this.add.graphics();
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
    return this.add.container(0, 0, [hintPlate, hint, chip, label, hit]).setDepth(6);
  }

  /** Centre the empty prompt on the slate and size its chip to it. */
  private layoutEmptyPrompt(cx: number, cy: number, gw: number, gh: number): void {
    const c = this.emptyText;
    if (!c) return;
    const [hintPlate, hint, chip, label, hit] = c.list as [
      Phaser.GameObjects.Graphics,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Graphics,
      Phaser.GameObjects.Text,
      Phaser.GameObjects.Rectangle,
    ];
    c.setPosition(cx, cy);
    const fs = Math.max(10, Math.round(gh * 0.055));
    hint.setFontSize(fs).setPosition(0, -gh * 0.12);
    label.setFontSize(Math.round(fs * 1.15));
    // Sized to the words it is under, so it dims the tool wall behind them and
    // nothing else.
    const hp = { w: hint.width + fs * 1.6, h: hint.height + fs * 1.1 };
    hintPlate
      .clear()
      .fillStyle(0x1a1220, 0.72)
      .fillRoundedRect(-hp.w / 2, hint.y - hp.h / 2, hp.w, hp.h, Math.min(hp.h * 0.3, 14));

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
    // The empty prompt lives in the CAR now, not on the board: with no lanes
    // there is no board to open, and "tap an instrument below" belongs where
    // the kid is looking.
    if (this.emptyText) {
      const v = this.voidRect;
      if (v.w > 0) this.layoutEmptyPrompt(v.x + v.w / 2, v.y + v.h / 2, v.w, v.h);
    }
    if (r.width === 0 || this.slateRect.w === 0) return;
    // The grid mounts on the chalkboard's slate (layoutBoard computed it).
    const { x: gx, y: gy, w: gw, h: gh } = this.slateRect;

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
      // The badge and the piano roll share a slot: a drum lane has no roll, a
      // melody lane's sound is named by its own character.
      row.badge?.setPosition(gx + labelW * 0.62, cy).setFontSize(iconPx);
      // Bounded by the COLUMN as well as the row: the four label slots are
      // 0.24·labelW apart, so an icon sized only off row height runs into the
      // instrument sprite on its left and the mute on its right.
      const bd = Math.min(this.cellH * 0.86, labelW * 0.18);
      row.badgeIcon?.setPosition(gx + labelW * 0.62, cy).setDisplaySize(bd, bd);
      row.edit?.setPosition(gx + labelW * 0.62, cy).setFontSize(iconPx);
      row.mute.setPosition(gx + labelW * 0.86, cy).setFontSize(iconPx);
      growHit(row.del);
      if (row.badge) growHit(row.badge);
      if (row.edit) growHit(row.edit);
      growHit(row.mute);
      const edge = this.cellEdgePx();
      row.cells.forEach((cell, i) => {
        cell.setPosition(this.gridLeft + (i + 0.5) * this.cellW, cy);
        cell.setSize(Math.max(2, this.cellW - pad), Math.max(2, this.cellH - pad));
        // The chalk rim is sized from the cell, and the cell's size is only
        // known here — so the paint is re-applied rather than left at whatever
        // `buildGrid` could compute before any layout had happened.
        paintCell(cell, row.colorInt, row.on[i] ?? false, edge);
      });
    });

    // The playhead column spans only the REAL lanes, not the min-row padding.
    this.playhead?.setSize(this.cellW, this.cellH * Math.max(1, this.rows.length));
  }

  private layoutFixtures(): void {
    this.layoutChrome();
    this.layoutColorRack();
    this.layoutCarLayer(); // computes voidRect (the crew + the empty prompt)
    this.layoutBoard(); // computes slateRect — must precede the grid
    this.layoutGrid();
  }
}
