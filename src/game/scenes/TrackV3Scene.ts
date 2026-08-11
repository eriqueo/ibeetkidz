// Track v3 — the side-scroller.
//
// Not a redraw of the oval: a different premise. Eric's mechanic ("hills slow
// the tempo, a bridge adds reverb, rain adds distortion, picked live like a
// Lemmings job and applied to the next bar") is a SEQUENCE, and a ring cannot
// show sequence — on an oval half the cars always travel the opposite way
// across the screen, and "next" has no direction.
//
// So the loop is unrolled into a line: one world laid out in bar order,
// scrolling right-to-left past a fixed playhead. The ground under bar b, the car
// for bar b and the terrain applied to bar b all travel together and reach the
// playhead at the same instant, so the next bar's terrain is drawn ON the
// approaching ground, visibly coming.
//
// ── TERRAIN IS GEOMETRY ────────────────────────────────────────────────────
// A hill really lifts the rails and the train really climbs it, nose-up on the
// way and nose-down off the back. A bridge is a real deck over a real gap. Rain
// is real weather in a moving shaft. All three read `../terrain-profile.ts`,
// which is the SINGLE source of truth for a terrain's shape: the greybox texture
// is generated from it, the train's height is it, and the train's tilt is it
// differentiated. Nothing here draws a silhouette of its own.
//
// ── SWAPPING THE ART ───────────────────────────────────────────────────────
// Drop a PNG into `src/assets/sprites/track3/` and it wins. That is the entire
// procedure: no manifest to edit, no code to touch. `DROPPED_ART` globs the
// folder at build time, `preload` loads every file it finds under the key
// `trk-<filename>`, and the greybox generator is told which keys it must NOT
// draw. A half-delivered batch runs fine — each slot falls back on its own.
//
// The one contract art must honour is the profile: a hill sprite has to match
// `liftSamples`, or the train will float above it or sink into it exactly the
// way the oval did. That is why the greybox mound is drawn FROM that function
// rather than eyeballed — the brief for the artist is a curve, not a vibe.

import Phaser from "phaser";
import { EventBus } from "../EventBus.ts";
import {
  barAtPlayhead,
  bobOffset,
  parallaxOffset,
  playheadX,
  terrainSpanX,
  travelPx,
  wheelAngle,
  type ScrollView,
} from "../track-scroll.ts";
import {
  BRIDGE_GAP,
  HILL_PEAK,
  carPose,
  groundDrop,
  liftSamples,
  type TerrainSpan,
} from "../terrain-profile.ts";
import { colorFor, hexToInt, inkOnCss } from "../livery-style.ts";
import { UI_ATLAS_KEY, UI_SPRITES, loadUiSprites, placeUiSprite } from "../ui-sprites.ts";
import type { TerrainKind } from "../../core/terrain.ts";
import type { CarType } from "../../core/types.ts";

/**
 * Real art, if any has been delivered. Vite resolves this at build time, so an
 * empty folder costs nothing and a dropped file needs no other edit anywhere.
 * `sky.png` → texture key `trk-sky`.
 */
const DROPPED_ART = import.meta.glob("../../assets/sprites/track3/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function artKeyOf(path: string): string {
  const file = path.split("/").pop() ?? "";
  return `trk-${file.replace(/\.png$/i, "")}`;
}

/** One car of the train, as the view needs it. Mirrors `core.CarIdentity` —
 *  the same numbers the Workshop LCD and the Yard sidings show. */
export interface V3Car {
  readonly id: string;
  /** The car's spoken name: "car 3". Stable across every view. */
  readonly number: number;
  readonly livery: number;
  readonly carType: CarType;
  readonly muted: boolean;
}

/** Body art per car type. The art is drawn WITHOUT wheels so they can turn, and
 *  with its bottom edge on the railhead — so a body is placed by putting its
 *  origin at (0.5, 1) on the contact point and nothing has to be measured. */
const CAR_BODY_KEY: Readonly<Record<CarType, string>> = {
  boxcar: "trk-car-boxcar",
  tanker: "trk-car-tanker",
  hopper: "trk-car-hopper",
  flatcar: "trk-car-flatcar",
};

/** Where the blank flank panel sits on a car body, per AR-036: 170 x 68,
 *  centred horizontally, centred 110 px above the railhead. The livery plate and
 *  the car's number go here — the same identity language `car-livery.ts` paints
 *  in the Yard and on the oval. */
const FLANK = { w: 170, h: 68, cy: -110 } as const;

// ── THE TRAIN IS ONE TRAIN ──────────────────────────────────────────────────
// It was a repeating frieze: the world was laid out in bar order forever, so a
// one-bar song drew loco/wagon/loco/wagon edge to edge and the eye read a
// wallpaper pattern, not a vehicle. Now there is exactly ONE consist — a
// locomotive plus one car per car in the Yard — coupled bumper to bumper.
//
// The song's LOOP is no longer drawn by repeating the train. It is the playhead
// marker walking back along the consist, car by car, and snapping to the front
// when the song comes round. One train, one lap of the marker per cycle.
const LOCO_W = 380;
const COUPLING = 14;
/** Where the locomotive's nose sits, as a fraction of the screen, when the
 *  whole consist fits. A long train anchors its nose here and lets its tail run
 *  off the left edge, which is what a long train should do. */
const NOSE_X_FRAC = 0.82;
/** Peak forward surge within each bar, px. Net zero over the bar — the train
 *  pulls ahead on the downbeat and the camera eases back onto it, so there IS
 *  real motion against the ground without the train ever leaving the frame.
 *  (Any *persistent* drift would walk it off screen within a few bars.) */
const TRAIN_SURGE = 30;

/** A terrain the transport has committed to, in absolute bars. */
export interface V3TerrainRide {
  readonly kind: TerrainKind;
  readonly startBar: number;
  readonly endBar: number;
}

const W = 2560;
const H = 1440;

// Horizon bands, back to front.
const SKY_Y = 0;
const HILLS_Y = 470;
const TREES_Y = 690;
const GROUND_Y = 980; // top of the ground slab
const RAIL_Y = 1010; // where wheels touch on FLAT ground
const FORE_Y = 975;
const FORE_H = 130;
const TERRAIN_LABEL_Y = 330;
/** How much larger than 1:1 the rain sheet is drawn. */
const RAIN_TILE_SCALE = 3.5;

/** Reference width every terrain texture is drawn at before being stretched to
 *  its span. Height is NEVER scaled — the profile is normalized across the span
 *  in x but absolute in y, so stretching horizontally keeps picture and physics
 *  in agreement. */
const TERRAIN_REF_W = 1280;

const DEPTH = {
  sky: 0,
  hills: 1,
  trees: 2,
  ground: 3,
  mound: 3.5, // a hill: the train stands ON it
  shadow: 5,
  train: 6,
  foreground: 7,
  // A bridge means there is no ground and no grass here, so both its void and
  // its structure draw IN FRONT of the near fringe — otherwise the fringe (a
  // full-width strip that cannot have a hole punched in it) covers the whole
  // thing, which is exactly how the first pass shipped an invisible bridge.
  gap: 7.05,
  deck: 7.1,
  rain: 7.5,
  playhead: 8,
  hud: 10,
} as const;

const CAR_W = 300;
/** Distance between the axles, as a fraction of a bar. The car is 300 px wide
 *  with its wheels at ±28% of that, in a 640 px bar. */
const WHEELBASE_BARS = (CAR_W * 0.56) / 640;
const WHEEL_R = 30;

const TERRAIN_PAINT: Record<TerrainKind, number> = {
  hill: 0x4f8f38,
  bridge: 0x8a7a5c,
  rain: 0x3a6fa5,
};

export class TrackV3Scene extends Phaser.Scene {
  static readonly KEY = "TrackV3Scene";

  protected ready = false;

  private view: ScrollView = { width: W, playhead: 0.28, barWidth: 640 };
  private pos = 0; // song position in ABSOLUTE bars, fed from the transport
  private moving = false;
  private cars: V3Car[] = [];
  private ride: V3TerrainRide | null = null;

  private sky?: Phaser.GameObjects.TileSprite;
  private hills?: Phaser.GameObjects.TileSprite;
  private trees?: Phaser.GameObjects.TileSprite;
  private ground?: Phaser.GameObjects.TileSprite;
  private fore?: Phaser.GameObjects.TileSprite;

  private slots: SlotView[] = [];
  private loco?: Phaser.GameObjects.Image;
  private locoShadow?: Phaser.GameObjects.Image;
  private nowPost?: Phaser.GameObjects.Image;
  private smoke: Phaser.GameObjects.Image[] = [];
  private smokeDebt = 0;
  private smokeNext = 0;
  private mound?: Phaser.GameObjects.Image;
  private deck?: Phaser.GameObjects.Image;
  private gap?: Phaser.GameObjects.Rectangle;
  /** Rain is a fast-scrolling streak sheet clipped to its bar span, not a
   *  particle emitter. Deterministic, no RNG (`Math.random` is banned in src/
   *  and view jitter does not earn an RngPort), and one object instead of
   *  hundreds — for a shaft of rain seen for two bars the read is identical. */
  private rainSheet?: Phaser.GameObjects.TileSprite;
  private gloom?: Phaser.GameObjects.Image;
  /** The approaching storm cloud. Rain is the one terrain that is WEATHER
   *  rather than ground, so what you see coming is a cloud in the sky — not a
   *  wall of water standing on the track. */
  private cloud?: Phaser.GameObjects.Image;
  private splashes: Phaser.GameObjects.Image[] = [];
  private splashDebt = 0;
  private splashSeed = 0;
  private terrainLabel?: Phaser.GameObjects.Text;
  private lastPos = 0;
  private speedBars = 0; // bars per second, smoothed
  private lastAt = -1;

  preload(): void {
    // The same packed chrome atlas every other view uses, so this scene's nav
    // and transport are the SAME buttons as the Workshop, Yard and oval Track —
    // not a second set that drifts. Idempotent; the atlas is already resident
    // whenever the kid arrives from another view.
    loadUiSprites(this);
    // Delivered art first, so the generator below knows what to skip.
    const delivered = new Set<string>();
    for (const [path, url] of Object.entries(DROPPED_ART)) {
      const key = artKeyOf(path);
      delivered.add(key);
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
    makeGreyboxTextures(this, delivered);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#87ceeb");

    this.sky = this.add
      .tileSprite(0, SKY_Y, W, HILLS_Y, "trk-sky")
      .setOrigin(0, 0)
      .setDepth(DEPTH.sky);
    this.hills = this.add
      .tileSprite(0, HILLS_Y, W, TREES_Y - HILLS_Y + 40, "trk-hills")
      .setOrigin(0, 0)
      .setDepth(DEPTH.hills);
    this.trees = this.add
      .tileSprite(0, TREES_Y, W, GROUND_Y - TREES_Y + 40, "trk-trees")
      .setOrigin(0, 0)
      .setDepth(DEPTH.trees);
    this.ground = this.add
      .tileSprite(0, GROUND_Y, W, H - GROUND_Y, "trk-ground")
      .setOrigin(0, 0)
      .setDepth(DEPTH.ground);
    // Law 3: the actor must be able to pass BEHIND something, or the scene is a
    // decal on a photograph. A strip, not a slab — a slab hides the rails.
    this.fore = this.add
      .tileSprite(0, FORE_Y, W, FORE_H, "trk-fringe")
      .setOrigin(0, 0)
      .setDepth(DEPTH.foreground);

    // ── terrain bodies, all hidden until a ride commits one ─────────────────
    this.gap = this.add
      .rectangle(0, GROUND_Y, 0, BRIDGE_GAP, 0x1d2b3a, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH.gap)
      .setVisible(false);
    this.mound = this.add
      // Anchored to the RAILHEAD, not the ground line. The profile measures lift
      // from where the wheels touch, so a mound based 30 px lower puts its crest
      // 30 px above the car that is supposed to be standing on it.
      .image(0, RAIL_Y, "trk-mound")
      .setOrigin(0, 1)
      .setDepth(DEPTH.mound)
      .setVisible(false);
    this.deck = this.add
      .image(0, RAIL_Y, "trk-bridge")
      .setOrigin(0, 0)
      .setDepth(DEPTH.deck)
      .setVisible(false);
    // A soft-edged, top-weighted wash — NOT a flat rectangle. A hard vertical
    // edge is the single thing that made the first pass read as "a grey box
    // over the scene" instead of as weather.
    this.gloom = this.add
      .image(0, 0, "trk-gloom")
      .setOrigin(0, 0)
      .setDepth(DEPTH.rain - 0.1)
      .setVisible(false);
    this.cloud = this.add
      .image(0, 250, "trk-raincloud")
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.rain - 0.2)
      .setVisible(false);

    for (let i = 0; i < 18; i++) {
      this.splashes.push(
        this.add
          .image(0, 0, "trk-splash")
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.rain + 0.1)
          .setVisible(false),
      );
    }
    this.rainSheet = this.add
      .tileSprite(0, 0, 10, H, "trk-rain")
      .setOrigin(0, 0)
      .setDepth(DEPTH.rain)
      .setAlpha(0.6)
      .setVisible(false);
    // The sheet is 128 px drawn across a 1440 px scene: at 1:1 each streak is a
    // few pixels and the whole thing reads as film grain. Scaled up, the
    // streaks are actual streaks.
    this.rainSheet.setTileScale(RAIN_TILE_SCALE, RAIN_TILE_SCALE);

    this.terrainLabel = this.add
      .text(0, TERRAIN_LABEL_Y, "", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
        stroke: "#1a1526",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setFontSize(34)
      .setDepth(DEPTH.playhead)
      .setVisible(false);

    // The playhead WALKS THE TRAIN. With one fixed consist a trackside post at
    // a fixed x would point at the same car forever, so the marker now travels
    // car by car and snaps to the front when the song comes round — that
    // journey IS the loop, drawn as motion instead of as repetition.
    // BEHIND the train, not in front of it: planted at the sounding car's
    // centre, the post's sign clears the car roof while its shaft is occluded
    // by the body — so it reads as a signal standing behind the train rather
    // than as a sticker across the car's number.
    this.nowPost = this.add
      .image(0, RAIL_Y + 16, "trk-now-post")
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.train - 0.2)
      .setVisible(false);

    for (let i = 0; i < 14; i++) {
      this.smoke.push(
        this.add
          .image(0, 0, "trk-smoke")
          .setOrigin(0.5)
          .setDepth(DEPTH.train - 0.1)
          .setVisible(false),
      );
    }

    this.loco = this.add
      .image(0, RAIL_Y, "trk-loco")
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.train)
      .setVisible(false);
    this.locoShadow = this.add
      .image(0, 0, "trk-shadow")
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.shadow)
      .setVisible(false);

    this.buildTopBar();
    this.buildLegend();
    this.rebuildSlots();
    this.ready = true;
    EventBus.emit("current-scene-ready", this);
  }

  /** Nav + transport. The oval gets these from Tiled chrome authored against its
   *  plate; the greybox has no plate, so it draws its own. */
  private buildTopBar(): void {
    const items = [
      { sprite: "btn-nav-map", label: "MAP", fire: () => void EventBus.emit("track-nav", "map") },
      { sprite: "btn-track-ride", label: "RIDE", fire: () => void EventBus.emit("transport-play", "ride") },
      { sprite: "btn-transport-stop", label: "STOP", fire: () => void EventBus.emit("transport-stop") },
    ];
    const SLOT = 300;
    const GAP = 60;
    const total = items.length * SLOT + (items.length - 1) * GAP;
    // CENTRED. They were pinned to the left corner, which read as debug chrome
    // rather than as the same control deck the other three views carry.
    const x0 = (W - total) / 2 + SLOT / 2;
    const cy = 120;

    this.add.rectangle(W / 2, cy, W, 240, 0x1a1526, 0.72).setDepth(DEPTH.hud);

    items.forEach((item, i) => {
      const cx = x0 + i * (SLOT + GAP);
      const def = UI_SPRITES[item.sprite];
      if (def && this.textures.exists(UI_ATLAS_KEY)) {
        const img = this.add
          .image(0, 0, UI_ATLAS_KEY, def.base)
          .setOrigin(0.5)
          .setDepth(DEPTH.hud + 1);
        // Content-fit through the shared helper, so these sit at the same
        // optical size as the identical buttons in every other scene.
        placeUiSprite(img, def, { x: cx, y: cy, width: SLOT, height: 190 });
        this.pressableAtlas(img, def, item.fire);
        return;
      }
      this.pressable(
        this.add.rectangle(cx, cy, 250, 110, 0x3a3350, 1).setDepth(DEPTH.hud + 1),
        item.fire,
      );
      this.add
        .text(cx, cy, item.label, {
          fontFamily: "'Press Start 2P', monospace",
          color: "#ffe9b0",
        })
        .setOrigin(0.5)
        .setFontSize(28)
        .setDepth(DEPTH.hud + 2);
    });
  }

  /** Armed press on an atlas button, swapping to its `-pressed` frame when the
   *  sprite ships one — the same idle/pressed contract `ui-scene.ts` uses. */
  private pressableAtlas(
    img: Phaser.GameObjects.Image,
    def: { base: string; states: Record<string, string> },
    fire: () => void,
  ): void {
    const idle = def.states[def.base] ?? def.base;
    const down = def.states[`${def.base}-pressed`] ?? idle;
    let armed = false;
    img.setInteractive({ useHandCursor: true });
    img.on("pointerdown", () => { armed = true; img.setFrame(down); });
    img.on("pointerout", () => { armed = false; img.setFrame(idle); });
    img.on("pointerup", () => {
      img.setFrame(idle);
      if (!armed) return;
      armed = false;
      fire();
    });
  }

  /** Armed press: pointerdown arms, pointerout cancels, pointerup fires. The
   *  oval hand-copies this rule at eleven sites; here it exists once. */
  private pressable(target: Phaser.GameObjects.Rectangle, fire: () => void): void {
    let armed = false;
    target.setInteractive({ useHandCursor: true });
    target.on("pointerdown", () => {
      armed = true;
      target.setScale(0.94);
    });
    target.on("pointerout", () => {
      armed = false;
      target.setScale(1);
    });
    target.on("pointerup", () => {
      target.setScale(1);
      if (!armed) return;
      armed = false;
      fire();
    });
  }

  /** Armed press on a two-state sprite: the pressed art IS the feedback, so
   *  there is no scale tween fighting it. */
  private pressableImage(
    img: Phaser.GameObjects.Image,
    idle: string,
    pressed: string,
    fire: () => void,
  ): void {
    let armed = false;
    img.setInteractive({ useHandCursor: true });
    img.on("pointerdown", () => {
      armed = true;
      img.setTexture(pressed);
    });
    img.on("pointerout", () => {
      armed = false;
      img.setTexture(idle);
    });
    img.on("pointerup", () => {
      img.setTexture(idle);
      if (!armed) return;
      armed = false;
      fire();
    });
  }

  /** The Lemmings job bar. */
  private buildLegend(): void {
    const kinds: TerrainKind[] = ["hill", "bridge", "rain"];
    const bw = 260;
    const gap = 40;
    const total = kinds.length * bw + (kinds.length - 1) * gap;
    const x0 = (W - total) / 2;
    const y = H - 210;

    if (this.textures.exists("trk-legend-plate")) {
      this.add.image(W / 2, y + 90, "trk-legend-plate").setDepth(DEPTH.hud);
    } else {
      this.add
        .rectangle(W / 2, y + 90, total + 80, 220, 0x1a1526, 0.78)
        .setDepth(DEPTH.hud);
    }

    kinds.forEach((kind, i) => {
      const cx = x0 + i * (bw + gap) + bw / 2;
      const idle = `trk-btn-${kind}`;
      const down = `trk-btn-${kind}-pressed`;
      const fire = (): void => void EventBus.emit("terrain-picked", kind);

      if (this.textures.exists(idle)) {
        // Picture buttons: the player is four and cannot read. The caption is
        // for the adult, so it is only drawn when there is no picture.
        const btn = this.add.image(cx, y + 60, idle).setDepth(DEPTH.hud + 1);
        this.pressableImage(btn, idle, this.textures.exists(down) ? down : idle, fire);
        return;
      }
      const swatch = this.add
        .rectangle(cx, y + 60, bw, 120, TERRAIN_PAINT[kind], 1)
        .setDepth(DEPTH.hud + 1);
      this.add
        .text(cx, y + 130, kind.toUpperCase(), {
          fontFamily: "'Press Start 2P', monospace",
          color: "#ffe9b0",
        })
        .setOrigin(0.5, 0)
        .setFontSize(30)
        .setDepth(DEPTH.hud + 2);
      // Law 8: the response happens THIS frame, even though the sound lands on
      // the next bar.
      this.pressable(swatch, fire);
    });
  }

  // ── React → scene ────────────────────────────────────────────────────────

  setCars(cars: V3Car[]): void {
    this.cars = cars;
    if (this.ready) this.rebuildSlots();
  }

  /** Absolute song position in bars, straight off the transport. */
  setSongPosition(bars: number): void {
    if (Number.isFinite(bars)) this.pos = bars;
  }

  setMoving(moving: boolean): void {
    this.moving = moving;
    if (!moving) this.speedBars = 0;
  }

  /** The transport committed a terrain to a bar span; build it there. */
  setTerrainRide(ride: V3TerrainRide | null): void {
    this.ride = ride;
  }

  // ── frame ────────────────────────────────────────────────────────────────

  update(time: number): void {
    if (!this.ready) return;
    const dt = this.lastAt < 0 ? 0 : Math.max(0, (time - this.lastAt) / 1000);
    this.lastAt = time;
    if (dt > 0) {
      const inst = Math.abs(this.pos - this.lastPos) / dt;
      // Smooth, so one long frame does not spike every speed-scaled animation.
      this.speedBars += (inst - this.speedBars) * Math.min(1, dt * 6);
    }
    this.lastPos = this.pos;

    // Parallax. Every offset is floored to a whole pixel inside
    // `parallaxOffset` — a fractional tilePosition makes pixel art shimmer.
    if (this.sky) this.sky.tilePositionX = parallaxOffset(this.pos, this.view, 0.05);
    if (this.hills) this.hills.tilePositionX = parallaxOffset(this.pos, this.view, 0.18);
    if (this.trees) this.trees.tilePositionX = parallaxOffset(this.pos, this.view, 0.42);
    if (this.ground) this.ground.tilePositionX = parallaxOffset(this.pos, this.view, 1);
    if (this.fore) this.fore.tilePositionX = parallaxOffset(this.pos, this.view, 1.45);


    this.layoutTerrain();
    this.layoutTrain(travelPx(this.pos, this.view));
  }

  private get span(): TerrainSpan | null {
    return this.ride;
  }

  /** Screen x of the consist's nose, and each car's centre, left to right.
   *  Pure geometry over the car count — no bars involved, because the train is
   *  one object now rather than a bar-indexed frieze. */
  private consistLayout(surge: number): { noseX: number; carX: number[] } {
    const n = this.cars.length;
    const trainLen = LOCO_W + n * (CAR_W + COUPLING);
    // Centre a short train; anchor a long one by the nose and let its tail run
    // off the left, which is what a long train should look like.
    const noseX =
      trainLen + 160 <= W ? (W + trainLen) / 2 : W * NOSE_X_FRAC;
    const carX: number[] = [];
    // Car 0 couples directly behind the locomotive; the rest trail leftward.
    let right = noseX - LOCO_W - COUPLING;
    for (let i = 0; i < n; i++) {
      carX.push(right - CAR_W / 2);
      right -= CAR_W + COUPLING;
    }
    return { noseX: noseX + surge, carX: carX.map((x) => x + surge) };
  }

  /** The bar position of a point on screen — the inverse of `barEdgeX`. Each
   *  car reads the terrain at its OWN x, so a long train climbs a hill car by
   *  car instead of teleporting onto it as a block. */
  private barAtX(x: number): number {
    return this.pos + (x - playheadX(this.view)) / this.view.barWidth;
  }

  private layoutTrain(dist: number): void {
    const n = this.cars.length;
    if (n === 0) {
      for (const s of this.slots) s.hide();
      this.loco?.setVisible(false);
      this.locoShadow?.setVisible(false);
      this.nowPost?.setVisible(false);
      return;
    }
    const sounding = ((barAtPlayhead(this.pos) % n) + n) % n;
    const frac = this.pos - Math.floor(this.pos);
    // One forward surge per bar, returning to zero: real motion against the
    // ground with no net drift, so the train never walks out of frame.
    const surge = TRAIN_SURGE * Math.sin(Math.PI * frac) * (this.moving ? 1 : 0);
    const { noseX, carX } = this.consistLayout(surge);
    const bob = bobOffset(dist, this.speedBars);
    const angle = wheelAngle(dist, WHEEL_R);
    const span = this.span;

    const place = (
      x: number,
      body: Phaser.GameObjects.Image,
      shadow: Phaser.GameObjects.Image,
      wheelbase: number,
    ): { lift: number; tilt: number } => {
      const pose = carPose(this.barAtX(x), wheelbase, span, this.view.barWidth);
      const y = Math.round(RAIL_Y - pose.lift + bob);
      body.setPosition(Math.round(x), y).setRotation(pose.angle);
      shadow
        .setVisible(true)
        .setPosition(Math.round(x), Math.round(RAIL_Y - pose.lift + 10))
        .setRotation(pose.angle)
        .setScale(1 - Math.abs(bob) / 60, 1);
      return { lift: pose.lift, tilt: pose.angle };
    };

    this.slots.forEach((s, i) => {
      const car = this.cars[i];
      if (!car) {
        s.hide();
        return;
      }
      const x = carX[i] as number;
      const isNow = i === sounding;
      s.show();
      const pose = carPose(this.barAtX(x), WHEELBASE_BARS, span, this.view.barWidth);
      s.root
        .setPosition(Math.round(x), Math.round(RAIL_Y - pose.lift + bob))
        .setRotation(pose.angle)
        .setAlpha(car.muted ? 0.45 : 1); // tarped = still there, not sounding
      s.body.setTexture(CAR_BODY_KEY[car.carType] ?? CAR_BODY_KEY.boxcar);
      s.label.setText(String(car.number));
      if (s.liveryDrawn !== car.livery || s.soundingDrawn !== isNow) {
        s.liveryDrawn = car.livery;
        s.soundingDrawn = isNow;
        paintFlank(s, car.livery, isNow);
      }
      // Law 4: the wheels turn because the world moved, not because time passed.
      s.wheelA.setRotation(angle);
      s.wheelB.setRotation(angle);
      s.shadow
        .setVisible(true)
        .setPosition(Math.round(x), Math.round(RAIL_Y - pose.lift + 10))
        .setRotation(pose.angle)
        .setScale(1 - Math.abs(bob) / 60, 1);
    });

    if (this.loco && this.locoShadow) {
      this.loco.setVisible(true);
      place(
        noseX - LOCO_W / 2,
        this.loco,
        this.locoShadow,
        (LOCO_W * 0.56) / this.view.barWidth,
      );
    }

    // The marker rides beside whichever car is sounding.
    if (this.nowPost) {
      const x = carX[sounding] as number;
      const pose = carPose(this.barAtX(x), WHEELBASE_BARS, span, this.view.barWidth);
      this.nowPost
        .setVisible(true)
        .setPosition(Math.round(x), Math.round(RAIL_Y - pose.lift + 16));
    }

    this.puffSmoke(noseX, dist);
  }

  /**
   * How hard it is raining ON THE TRAIN, 0..1 — the overlap between the rain's
   * bar span and the consist, ramped so the squall arrives and leaves instead
   * of switching on. This is what replaces clipping the rain to a rectangle.
   */
  private wetness(span: { x: number; width: number } | null): number {
    if (!span) return 0;
    const { noseX } = this.consistLayout(0);
    const t = noseX - LOCO_W / 2;
    const d =
      t < span.x ? span.x - t : t > span.x + span.width ? t - (span.x + span.width) : 0;
    return Math.max(0, Math.min(1, 1 - d / 760));
  }

  /**
   * Drops bursting on the ballast — the strongest single cue that it is
   * actually raining rather than that a grey filter has been applied.
   *
   * Scattered with a small integer hash rather than `Math.random`, which the
   * architecture guard bans in `src/`: view jitter does not earn an RngPort, and
   * a hash gives the same look while staying replayable.
   */
  private splashRain(spanX: number, spanW: number, wet: number): void {
    if (wet <= 0.15) return;
    this.splashDebt += this.game.loop.delta * wet;
    while (this.splashDebt > 55) {
      this.splashDebt -= 55;
      const sp = this.splashes.find((q) => !q.visible);
      if (!sp) break;
      this.splashSeed = (this.splashSeed * 1103515245 + 12345) & 0x7fffffff;
      const across = (this.splashSeed >>> 8) % Math.max(1, Math.round(spanW));
      sp.setVisible(true)
        .setPosition(Math.round(spanX + across), RAIL_Y + 34)
        .setAlpha(0.9)
        .setScale(0.7);
      this.tweens.add({
        targets: sp,
        scaleX: 1.7,
        scaleY: 0.5,
        alpha: 0,
        duration: 300,
        ease: "Quad.easeOut",
        onComplete: () => sp.setVisible(false),
      });
    }
  }

  /**
   * Chimney smoke, spawned per DISTANCE travelled rather than on a timer, so it
   * thins out as the train slows and stops dead when it does (Law 6). This is
   * the strongest single cue that the train — not the scenery — is the thing
   * moving, which is exactly what the frieze version failed to say.
   */
  private puffSmoke(noseX: number, dist: number): void {
    const EVERY = 46; // px of travel per puff
    if (this.moving) {
      this.smokeDebt += Math.abs(dist - this.smokeNext);
      this.smokeNext = dist;
    } else {
      this.smokeNext = dist;
      this.smokeDebt = 0;
    }
    while (this.smokeDebt >= EVERY) {
      this.smokeDebt -= EVERY;
      const puff = this.smoke.find((p) => !p.visible);
      if (!puff) break;
      puff
        .setVisible(true)
        .setPosition(noseX - LOCO_W * 0.34, RAIL_Y - 210)
        .setScale(0.5)
        .setAlpha(0.85);
      this.tweens.add({
        targets: puff,
        // Drifts up and BACKWARD along the train — the direction it would go if
        // the train were driving forward through still air.
        x: puff.x - 300,
        y: puff.y - 150,
        scale: 1.6,
        alpha: 0,
        duration: 2100,
        ease: "Quad.easeOut",
        onComplete: () => puff.setVisible(false),
      });
    }
  }

  private layoutTerrain(): void {
    const ride = this.ride;
    const span = ride
      ? terrainSpanX(ride.startBar, ride.endBar, this.pos, this.view)
      : null;

    if (!ride || !span || span.width <= 0) {
      this.mound?.setVisible(false);
      this.deck?.setVisible(false);
      this.gap?.setVisible(false);
      this.gloom?.setVisible(false);
      this.rainSheet?.setVisible(false);
      this.terrainLabel?.setVisible(false);
      return;
    }

    const x = Math.round(span.x);
    const w = Math.round(span.width);

    // Keep the caption over its own span but inside the screen, so a terrain
    // half off the edge still reads instead of leaving a stray letter behind.
    const label = this.terrainLabel;
    if (label) {
      label.setText(ride.kind.toUpperCase()).setVisible(true);
      const halfText = label.width / 2 + 20;
      const wanted = span.x + span.width / 2;
      const lo = Math.max(halfText, span.x + halfText);
      const hi = Math.min(W - halfText, span.x + span.width - halfText);
      label.setPosition(
        Math.round(hi >= lo ? Math.min(hi, Math.max(lo, wanted)) : wanted),
        TERRAIN_LABEL_Y,
      );
    }

    // A hill: a real mound the train stands on. Stretched in x only — the
    // profile is normalized across the span, so the silhouette still matches
    // `railLift` at every point.
    const isHill = ride.kind === "hill";
    this.mound?.setVisible(isHill);
    if (isHill && this.mound) {
      this.mound.setPosition(x, RAIL_Y);
      this.mound.setDisplaySize(w, HILL_PEAK);
    }

    // A bridge: the ground falls away and a deck carries the rails across it.
    const isBridge = ride.kind === "bridge";
    this.gap?.setVisible(isBridge);
    this.deck?.setVisible(isBridge);
    if (isBridge && this.gap && this.deck) {
      // Inset by the shoulder so the dark gap starts where the ground actually
      // drops, rather than squarely at the bar line.
      // Girder immediately under the wheels, piers hanging into the void.
      const deckH = 170;
      this.deck.setPosition(x, RAIL_Y);
      this.deck.setDisplaySize(w, deckH);
      // The void is clipped to the STRUCTURE, not to the profile's full drop:
      // `groundDrop` is how far the ground falls away in the physics, but a
      // void drawn past the bottom of the trestle just reads as a grey box.
      const drop = Math.min(
        groundDrop((ride.startBar + ride.endBar) / 2, ride),
        deckH - 26,
      );
      this.gap.setPosition(x, RAIL_Y + 26);
      this.gap.setSize(w, Math.max(1, drop));
    }

    // Rain: weather in a moving shaft, plus the sky going over.
    const isRain = ride.kind === "rain";
    // ── weather, not a wall ────────────────────────────────────────────────
    // Two earlier passes clipped the rain to its bar span, which put a hard
    // vertical cut down the middle of the sky and read as a grey box over the
    // scene. Phaser 4 has no `BitmapMask` (only the hard-edged `GeometryMask`),
    // so the edge cannot be feathered — and a wall of rain standing on the
    // track was the wrong idea anyway. What you see coming is the CLOUD; when
    // it arrives the rain falls across the whole screen and then passes.
    const wet = isRain ? this.wetness(span) : 0;
    this.cloud?.setVisible(isRain);
    if (isRain && this.cloud) {
      this.cloud.setPosition(Math.round(x + w / 2), 250);
      this.cloud.setDisplaySize(Math.max(320, w * 0.9), 300);
    }
    this.gloom?.setVisible(wet > 0.01);
    if (wet > 0.01 && this.gloom) {
      this.gloom.setPosition(0, 0);
      this.gloom.setDisplaySize(W, H);
      this.gloom.setAlpha(wet);
    }
    this.rainSheet?.setVisible(wet > 0.01);
    if (wet > 0.01 && this.rainSheet) {
      this.rainSheet.setAlpha(0.62 * wet);
      this.rainSheet.setPosition(0, 0);
      this.rainSheet.setSize(W, H);
      // Falls fast and drifts with the world, so it belongs to the scene rather
      // than sitting on the glass in front of it.
      // 0.45 px/ms, not 2.2. At 2.2 the 128 px sheet advanced ~35 px per frame
      // — 27 % of the texture — which aliases into static rather than reading
      // as falling rain. This is the rate that actually looks like weather.
      this.rainSheet.tilePositionY = Math.floor(this.time.now * 0.45);
      this.rainSheet.tilePositionX = parallaxOffset(this.pos, this.view, 1);
      this.splashRain(0, W, wet);
    }
  }

  /** Read-only geometry for tests. A screenshot cannot test speed-scaling, or
   *  whether the train is standing ON the hill it is drawn over. */
  debugState(): {
    pos: number;
    playheadX: number;
    wheelAngle: number;
    soundingCarX: number | null;
    soundingCarY: number | null;
    soundingCarAngle: number;
    terrain: { x: number; width: number; kind: string } | null;
  } {
    const dist = travelPx(this.pos, this.view);
    const n = Math.max(1, this.cars.length);
    const sounding = ((barAtPlayhead(this.pos) % n) + n) % n;
    const { carX } = this.consistLayout(0);
    const now = this.cars.length > 0 ? { centreX: carX[sounding] as number } : null;
    const pose = carPose(
      this.barAtX(now ? now.centreX : playheadX(this.view)),
      WHEELBASE_BARS, this.span, this.view.barWidth,
    );
    const span = this.ride
      ? terrainSpanX(this.ride.startBar, this.ride.endBar, this.pos, this.view)
      : null;
    return {
      pos: this.pos,
      playheadX: playheadX(this.view),
      wheelAngle: wheelAngle(dist, WHEEL_R),
      soundingCarX: now ? now.centreX : null,
      soundingCarY: now ? RAIL_Y - pose.lift : null,
      soundingCarAngle: pose.angle,
      terrain: span && this.ride ? { ...span, kind: this.ride.kind } : null,
    };
  }

  /** One pooled body per visible slot; the pool only grows. */
  /** Exactly one body per car in the Yard train — the consist IS the train the
   *  kid built, so the pool is sized by that and nothing else. */
  private rebuildSlots(): void {
    const needed = this.cars.length;
    while (this.slots.length < needed) this.slots.push(this.makeSlot());
    for (let i = needed; i < this.slots.length; i++) this.slots[i]!.hide();
  }

  private makeSlot(): SlotView {
    const shadow = this.add
      .image(0, 0, "trk-shadow")
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.shadow);
    const root = this.add.container(0, 0).setDepth(DEPTH.train);
    // Origin (0.5, 1): the art's bottom edge IS the railhead, so a body needs no
    // per-type offset table — the thing that goes stale the moment art changes.
    const body = this.add.image(0, 0, "trk-car-boxcar").setOrigin(0.5, 1);
    // The livery plate, painted on the blank flank the art leaves for it.
    const plate = this.add.graphics();
    const wheelA = this.add.image(-CAR_W * 0.28, -WHEEL_R, "trk-wheel");
    const wheelB = this.add.image(CAR_W * 0.28, -WHEEL_R, "trk-wheel");
    const label = this.add
      .text(0, FLANK.cy, "1", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#1a1526",
      })
      .setOrigin(0.5)
      .setFontSize(44);
    root.add([body, wheelA, wheelB, plate, label]);
    const view: SlotView = {
      root, body, plate, wheelA, wheelB, label, shadow,
      liveryDrawn: -1,
      soundingDrawn: false,
      show: () => {
        root.setVisible(true);
        shadow.setVisible(true);
      },
      hide: () => {
        root.setVisible(false);
        shadow.setVisible(false);
      },
    };
    view.hide();
    return view;
  }
}

interface SlotView {
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly plate: Phaser.GameObjects.Graphics;
  readonly wheelA: Phaser.GameObjects.Image;
  readonly wheelB: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly shadow: Phaser.GameObjects.Image;
  /** Last livery painted, so the plate is redrawn only when it changes rather
   *  than every frame for every car. */
  liveryDrawn: number;
  soundingDrawn: boolean;
  readonly show: () => void;
  readonly hide: () => void;
}

/**
 * Paint the livery plate and outline on the blank flank the car art leaves.
 *
 * Same three channels the Yard and the oval use (`car-livery.ts`): a flat
 * colour panel, an ink that is contrast-checked against it, and the car's
 * NUMBER. Never a tint — `setTint` is a multiply and these bodies are dark, so
 * every livery would collapse into "dark thing" (measured, twice).
 */
function paintFlank(s: SlotView, livery: number, sounding: boolean): void {
  const color = colorFor(livery);
  const g = s.plate;
  const { w, h, cy } = FLANK;
  const edge = 5;
  g.clear();
  g.fillStyle(0x2b2440, 1).fillRoundedRect(
    -w / 2 - edge, cy - h / 2 - edge, w + edge * 2, h + edge * 2, 14,
  );
  g.fillStyle(hexToInt(color), 1).fillRoundedRect(-w / 2, cy - h / 2, w, h, 10);
  // The sounding car is a palette change, not new art — the era's own technique
  // and the reason this is a drawn ring rather than a second sprite.
  if (sounding) {
    g.lineStyle(7, 0xffe9b0, 1).strokeRoundedRect(
      -w / 2 - edge - 4, cy - h / 2 - edge - 4, w + edge * 2 + 8, h + edge * 2 + 8, 18,
    );
  }
  s.label.setColor(inkOnCss(color));
}

/**
 * Every texture the scene needs, drawn at runtime.
 *
 * `tex` early-returns when the key already exists, which IS the art-swap seam:
 * load a real texture under the same key in `preload` and the generator below
 * never runs. Nothing else in the file refers to "greybox".
 */
function makeGreyboxTextures(scene: Phaser.Scene, delivered: ReadonlySet<string>): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key: string, w: number, h: number, draw: () => void): void => {
    // Real art wins — either already resident, or queued from the drop folder
    // this same frame (in which case the texture does not exist YET).
    if (delivered.has(key) || scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  tex("trk-sky", 512, 512, () => {
    g.fillStyle(0x87ceeb, 1).fillRect(0, 0, 512, 512);
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(120, 120, 220, 80);
    g.fillEllipse(360, 210, 170, 60);
  });

  // Receding planes desaturate and lose contrast — atmospheric perspective is
  // what makes a STATIC frame read as deep. Parallax amplifies depth; it cannot
  // create it.
  tex("trk-hills", 640, 300, () => {
    g.fillStyle(0x9db8a0, 1);
    for (let i = 0; i < 5; i++) g.fillEllipse(i * 160, 250, 360, 300);
  });

  tex("trk-trees", 480, 320, () => {
    g.fillStyle(0x4f7a4a, 1);
    for (let i = 0; i < 6; i++) {
      const x = i * 80 + 40;
      g.fillTriangle(x - 34, 250, x + 34, 250, x, 90);
    }
    g.fillStyle(0x3d6b3a, 1).fillRect(0, 245, 480, 75);
  });

  tex("trk-ground", 320, 460, () => {
    g.fillStyle(0x6f9440, 1).fillRect(0, 0, 320, 460);
    g.fillStyle(0x8a7355, 1).fillRect(0, 22, 320, 60);
    g.fillStyle(0x5d4a36, 1);
    for (let i = 0; i < 8; i++) g.fillRect(i * 40 + 6, 26, 22, 52);
    g.fillStyle(0xb9b9c4, 1).fillRect(0, 24, 320, 8);
    g.fillStyle(0x5f8438, 1).fillRect(0, 96, 320, 364);
  });

  tex("trk-fringe", 360, FORE_H, () => {
    g.fillStyle(0x24421f, 1).fillRect(0, 70, 360, FORE_H - 70);
    g.fillStyle(0x2f5230, 1);
    for (let i = 0; i < 18; i++) {
      const x = i * 20 + 8;
      g.fillTriangle(x - 11, 78, x + 11, 78, x, 2);
    }
  });

  // THE MOUND IS DRAWN FROM THE PROFILE. Not an approximation of it — the same
  // samples the train's height is read from. This is the contract real art has
  // to honour, and drawing it this way is how the greybox proves it is possible.
  tex("trk-mound", TERRAIN_REF_W, HILL_PEAK, () => {
    const samples = liftSamples(
      { kind: "hill", startBar: 0, endBar: 1 },
      TERRAIN_REF_W / 10,
    );
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, HILL_PEAK)];
    samples.forEach((lift, i) => {
      const x = (i / (samples.length - 1)) * TERRAIN_REF_W;
      pts.push(new Phaser.Math.Vector2(x, HILL_PEAK - lift));
    });
    pts.push(new Phaser.Math.Vector2(TERRAIN_REF_W, HILL_PEAK));
    g.fillStyle(0x5f8438, 1).fillPoints(pts, true);
    // A rail line following the crest, so the surface reads as track.
    g.lineStyle(7, 0x8a7355, 1).strokePoints(pts.slice(1, -1), false);
  });

  tex("trk-bridge", TERRAIN_REF_W, 150, () => {
    g.fillStyle(0x6b5334, 1).fillRect(0, 0, TERRAIN_REF_W, 26); // deck
    g.fillStyle(0x8a7a5c, 1);
    for (let i = 0; i < 26; i++) g.fillRect(i * 40 + 6, 26, 12, 124); // piers
    g.fillStyle(0x5b4529, 1).fillRect(0, 92, TERRAIN_REF_W, 14); // cross brace
  });

  // Diagonal streaks that tile seamlessly in both axes: each streak is drawn
  // twice, offset by the tile size, so the wrap has no seam.
  tex("trk-rain", 128, 128, () => {
    g.fillStyle(0xbcd8f0, 0.9);
    for (let i = 0; i < 7; i++) {
      const x = i * 18;
      for (const dy of [-128, 0]) {
        g.fillTriangle(x, dy, x + 4, dy, x - 14, dy + 128);
        g.fillTriangle(x + 4, dy, x - 10, dy + 128, x - 14, dy + 128);
      }
    }
  });

  // Soft-edged, top-weighted rain wash. Built from strips because Graphics has
  // no gradient fill — 48 columns is more than enough for the edges to stop
  // reading as a cut.
  // Vertical weighting only — heaviest at the cloud base, lightest at the
  // ground. The horizontal fade is the mask's job.
  tex("trk-gloom", 16, 256, () => {
    const ROWS = 32;
    for (let r = 0; r < ROWS; r++) {
      const v = (r + 0.5) / ROWS;
      g.fillStyle(0x24303f, 0.30 * (1 - v * 0.55));
      g.fillRect(0, (r * 256) / ROWS, 16, 256 / ROWS + 1);
    }
  });

  tex("trk-raincloud", 512, 256, () => {
    g.fillStyle(0x5c6472, 1);
    g.fillEllipse(150, 150, 240, 150);
    g.fillEllipse(300, 130, 280, 170);
    g.fillEllipse(420, 155, 200, 130);
    g.fillStyle(0x757f90, 1);
    g.fillEllipse(220, 110, 200, 110);
    g.fillEllipse(360, 100, 170, 95);
    g.fillStyle(0x434b58, 1).fillRect(40, 190, 440, 28);
  });

  tex("trk-splash", 40, 22, () => {
    g.fillStyle(0xd8ecff, 0.95);
    g.fillEllipse(20, 18, 34, 8);
    g.fillRect(6, 6, 4, 10);
    g.fillRect(30, 4, 4, 12);
    g.fillRect(18, 0, 4, 9);
  });

  tex("trk-smoke", 96, 96, () => {
    g.fillStyle(0xf2efe6, 1);
    g.fillCircle(48, 52, 30);
    g.fillCircle(28, 60, 20);
    g.fillCircle(68, 60, 18);
    g.fillCircle(44, 34, 20);
  });

  tex("trk-wheel", WHEEL_R * 2, WHEEL_R * 2, () => {
    g.fillStyle(0x2b2440, 1).fillCircle(WHEEL_R, WHEEL_R, WHEEL_R);
    g.fillStyle(0xb9b9c4, 1).fillCircle(WHEEL_R, WHEEL_R, WHEEL_R * 0.36);
    // A spoke, so rotation is actually visible on a circle.
    g.fillStyle(0xb9b9c4, 1).fillRect(WHEEL_R - 3, 4, 6, WHEEL_R * 0.8);
  });

  g.destroy();
}
