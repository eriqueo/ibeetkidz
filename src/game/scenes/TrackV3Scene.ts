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
import { colorFor } from "../livery-style.ts";
import { asLiveryCoat, setLiveryColor, setLiveryTexture, type LiveryCoat } from "../car-tint.ts";
import { attachUndoToast, type UndoToast } from "../undo-toast.ts";
import { UI_ATLAS_KEY, UI_SPRITES, loadUiSprites, measureContentBox, placeUiSprite } from "../ui-sprites.ts";
import {
  TRACK_HEADER,
  TRACK_JOB_BAR,
  TRACK_VISUALIZER,
  trackHeaderSlots,
  trackJobSlots,
  type TrackJobId,
  type PlacedRect,
} from "../scene-layout.ts";
import type { ModeKind, TerrainKind } from "../../core/terrain.ts";
import type { CarType, Project } from "../../core/types.ts";
// The oval already owns both of these; the side-scroller mounts the SAME
// classes rather than growing its own SEND panel and its own visualizer, so
// "see the sound" and "send your song" behave identically in both views.
import { SendSongPanel, type SendUiState } from "../send-panel.ts";
import { SceneVisualizer } from "../scene-visualizer.ts";
import { VISUAL_STYLES } from "../../visualizer/styles.ts";
import { PanelButton, FONT, INK, PANEL_BG, PANEL_EDGE } from "../tool-panels.ts";
import {
  TRACK_CAR_ACTION_LAYOUT,
  trackCarActionChoices,
  trackCarActionDisarmsTarp,
  type TrackCarActionKind,
} from "../track-car-actions.ts";

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
  /** The crew riding this car — UI_SPRITES keys, one character per instrument
   *  (same collapse rule the Workshop crew uses: all percussion = the frog).
   *  Drawn standing on the roof until AR-042's riding poses land. */
  readonly crew: readonly string[];
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

// ── HOW A CAR SAYS WHICH CAR IT IS ─────────────────────────────────────────
// It used to say it with a 170 x 68 rounded slab of livery colour and a 44 px
// number stamped on the flank. That is 30 % of a 300 px car: it covered the
// door, the ironwork and the painted nameplate the art already carries, so the
// only thing you could see of a boxcar was the sticker on it.
//
// The channels are now the ones the ART already offers:
//
//   COLOUR  the WHOLE car wears its livery — the body's own silhouette drawn a
//           second time in that colour and composited back over itself. Shading,
//           not a repaint: every plank, rivet and shadow still reads underneath,
//           and not one pixel of new art is needed. `car-tint.ts` owns the
//           technique, so the Workshop's car and this one cannot drift apart.
//   NUMBER  small, on the blank nameplate all four bodies are drawn with.
/** The sounding car is lifted toward cream rather than ringed. Same technique,
 *  same silhouette, one more overlay — the era's own trick (a palette change),
 *  and it cannot cover the art the way a stroked outline around a plate did. */
const SOUNDING_LIFT = 0.16;
/** The blank nameplate every body carries, measured off the delivered art: all
 *  four types put a ~104 x 45 panel a little over 100 px above the railhead. */
const NAMEPLATE = { cy: -108, fontPx: 30 } as const;

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

/** `pad-key`'s pale label face as fractions of its 512 canvas, measured by
 *  scanning the packed frame (2026-08-16). It is 64 % of the canvas wide and
 *  sits ~4 % LEFT of centre, which is why a caption centred on the cell and
 *  sized to the cell overhung the brass frame on both sides. */
const PAD_KEY_FACE = { x0: 0.1543, x1: 0.7969 } as const;


/** Beats to the bar, and how much of each beat the Beat Lantern spends in its
 *  raised frame — short, so the flick reads as a hit rather than a wobble. */
const BEATS_PER_BAR = 4;
const BEAT_FLICK = 0.38;
/** The square canvas AR-059's two lantern frames share, and the gap it keeps
 *  above the tallest thing on the car so the lamp reads as hanging over the
 *  crew rather than resting on one. */
const LANTERN_CANVAS = 160;
const LANTERN_CLEARANCE = 26;

// Horizon bands, back to front.
const SKY_Y = 0;
const HILLS_Y = 470;
const TREES_Y = 690;
const GROUND_Y = 980; // top of the ground slab
const RAIL_Y = 1010; // where wheels touch on FLAT ground
const FORE_Y = 975;
const FORE_H = 130;
/** Clear of the top plate (which hangs to y=370), so the caption for an
 *  approaching terrain is never half-behind the nav bar. */
const TERRAIN_LABEL_Y = 430;
/** The three control columns, shared by the nav bar and the job bar so a
 *  terrain button sits directly under the button above it. */
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
/** Where the axles sit in a car body, as a fraction of its width — measured off
 *  the arches the frame art is drawn with (centres at 24% and 76% of a 300 px
 *  canvas) rather than guessed. It was 0.28, which stood the wheels a little
 *  outside their own arches. */
const WHEEL_AT = 0.258;
/** Distance between the axles, as a fraction of a bar, in a 640 px bar. */
const WHEELBASE_BARS = (CAR_W * WHEEL_AT * 2) / 640;
const WHEEL_R = 30;

/**
 * The locomotive's wheels, as offsets from its centre in its own 380 px art.
 *
 * The engine has been running on air since the side-scroller landed: `loco.png`
 * draws two frame arches — a big one under the cab, a small one behind the
 * cowcatcher — and the scene put nothing in either, while every wagon got two.
 * These are the arch centres measured off the file, so a driver and a pilot
 * wheel land in the holes the art already cut for them.
 */
const LOCO_WHEELS: readonly { dx: number; r: number }[] = [
  { dx: -112, r: 30 },
  { dx: 80, r: 19 },
];

export class TrackV3Scene extends Phaser.Scene {
  static readonly KEY = "TrackV3Scene";

  protected ready = false;

  private view: ScrollView = { width: W, playhead: 0.28, barWidth: 640 };
  private pos = 0; // song position in ABSOLUTE bars, fed from the transport
  private moving = false;
  private cars: V3Car[] = [];
  private undoToast?: UndoToast;
  /** Every geometry mode's committed span, keyed by kind — modes STACK, so a
   *  mound, a deck and a squall can all be in the world at once. The newest
   *  toggle is remembered for the caption and the debug probe. */
  private readonly rides = new Map<TerrainKind, V3TerrainRide>();
  private newestRide: V3TerrainRide | null = null;
  /** The tiny/giant switches' train size (1 = normal). */
  private trainScale = 1;
  private nightShade?: Phaser.GameObjects.Rectangle | undefined;
  private tunnelShade?: Phaser.GameObjects.Rectangle | undefined;
  /** AR-053's painted night band, drawn OVER the day sky in the same rect. */
  private nightSky?: Phaser.GameObjects.TileSprite | undefined;

  private sky?: Phaser.GameObjects.TileSprite;
  private hills?: Phaser.GameObjects.TileSprite;
  private trees?: Phaser.GameObjects.TileSprite;
  private ground?: Phaser.GameObjects.TileSprite;
  private fore?: Phaser.GameObjects.TileSprite;

  private slots: SlotView[] = [];
  /** The locomotive is a container for the same reason a car is: its wheels
   *  have to tilt with it when it climbs, and a loose Image cannot carry them. */
  private locoRoot?: Phaser.GameObjects.Container;
  private locoWheels: Phaser.GameObjects.Image[] = [];
  private locoShadow?: Phaser.GameObjects.Image;
  private nowPost?: Phaser.GameObjects.Image;
  /** AR-059's Beat Lantern — the NOW marker, riding the sounding car's roof. */
  private beatLantern?: Phaser.GameObjects.Image;
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
  /** Declared Track files that failed and have no generated replacement.
   *  `create` refuses to draw them, because Phaser otherwise substitutes its
   *  neon `__MISSING` texture and turns one broken request into a corrupt scene. */
  private readonly unrecoveredArtLoads = new Set<string>();

  preload(): void {
    this.unrecoveredArtLoads.clear();
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

    // `delivered` means Vite declared a URL, not that the browser fetched it.
    // If that request fails, restore the existing per-slot greybox while the
    // loader is still running. Slots without a generator fail at the scene
    // boundary below instead of being silently replaced by Phaser's marker.
    const recoverFailedTrackArt = (file: Phaser.Loader.File): void => {
      const key = String(file.key);
      if (!delivered.delete(key)) return;
      makeGreyboxTextures(this, delivered);
      if (!this.textures.exists(key)) this.unrecoveredArtLoads.add(key);
    };
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, recoverFailedTrackArt);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, recoverFailedTrackArt);
    });
  }

  create(): void {
    if (this.unrecoveredArtLoads.size > 0) {
      const keys = [...this.unrecoveredArtLoads].sort().join(", ");
      throw new Error(`TRACK_ART_LOAD_FAILED: ${keys}`);
    }

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
    // AR-059's Beat Lantern retires the post where the art exists: a signal
    // lamp riding ON the sounding car's roof, flicking high on every beat, so a
    // non-reader sees which car is playing AND hears the beat in the same
    // object. The post stays as the fallback for a cold drop folder.
    if (this.textures.exists("trk-beat-lantern-low")) {
      this.beatLantern = this.add
        .image(0, 0, "trk-beat-lantern-low")
        // Both frames share one 160px canvas and the rise is drawn INSIDE it,
        // so anchoring the canvas bottom is what makes the flick a flick rather
        // than a jump: the anchor never moves, only the art within it.
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.train + 0.1)
        .setVisible(false);
    } else {
      this.nowPost = this.add
        .image(0, RAIL_Y + 16, "trk-now-post")
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.train - 0.2)
        .setVisible(false);
    }

    for (let i = 0; i < 14; i++) {
      this.smoke.push(
        this.add
          .image(0, 0, "trk-smoke")
          .setOrigin(0.5)
          .setDepth(DEPTH.train - 0.1)
          .setVisible(false),
      );
    }

    // The engine, with wheels in the arches its own art draws for them.
    const locoBody = this.add.image(0, 0, "trk-loco").setOrigin(0.5, 1);
    this.locoWheels = LOCO_WHEELS.map((w) =>
      this.add.image(w.dx, -w.r, "trk-wheel").setScale(w.r / WHEEL_R),
    );
    this.locoRoot = this.add
      .container(0, RAIL_Y, [locoBody, ...this.locoWheels])
      .setDepth(DEPTH.train)
      .setVisible(false);
    this.locoShadow = this.add
      .image(0, 0, "trk-shadow")
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.shadow)
      .setVisible(false);

    // AR-053's painted night band: moon, stars and cloud, tiling on the same
    // rect and the same slow parallax as the day sky it covers. It replaces the
    // sky HALF of the night treatment only — the wash below still has to darken
    // the ground, hills and train, which no sky texture can do.
    if (this.textures.exists("trk-sky-night")) {
      this.nightSky = this.add
        .tileSprite(0, SKY_Y, W, HILLS_Y, "trk-sky-night")
        .setOrigin(0, 0)
        .setDepth(DEPTH.sky + 0.5)
        .setVisible(false);
    }

    // The NIGHT and TUNNEL washes: shades under the HUD (the job bar must stay
    // daylight-legible whatever the world is doing). AR-049's painted tunnel
    // walls would replace the tunnel rect the same way.
    this.nightShade = this.add
      // With the painted sky mounted the wash starts BELOW it and covers only
      // the land: washing over the night band as well would put a blue film
      // over the moon and stars, which is the flat-rectangle look the painted
      // sky was drawn to replace.
      .rectangle(0, this.nightSky ? HILLS_Y : 0, W, this.nightSky ? H - HILLS_Y : H, 0x141c4a, 0.45)
      .setOrigin(0)
      .setDepth(DEPTH.hud - 1)
      .setVisible(false);
    this.tunnelShade = this.add
      .rectangle(0, 0, W, H, 0x08060f, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.hud - 1)
      .setVisible(false);

    this.buildTopBar();
    this.buildLegend();
    this.rebuildSlots();
    // CLEAR empties the whole train, so this view must be able to show the
    // "put it back" chip the Workshop and Yard already carry.
    this.undoToast = attachUndoToast(this);
    // The SEND result panel. Built here (not on first use) so it is already
    // laid out when React pushes the first state mid-render.
    this.sendPanel = new SendSongPanel(this);
    this.sendPanel.setUiState(this.sendState);
    this.sendPanel.layout(this.scale.gameSize.width, this.scale.gameSize.height);
    this.ready = true;
    EventBus.emit("current-scene-ready", this);
  }

  /**
   * The two control decks — the SAME plates, at the SAME size, as every other
   * view.
   *
   * What was here: a full-width `0x1a1526` rectangle at 72 % alpha with three
   * keycaps floating on it, and a second plaque lying in the grass. Next to the
   * Workshop's brass-and-wood header it read as debug chrome, and it is the
   * complaint Eric has now filed twice. The buttons themselves were never the
   * problem — they are the identical atlas frames the Workshop uses.
   *
   * So the Track stops inventing chrome. `panel-header-v2` and
   * `panel-transport-v2` are the plates the Workshop's Tiled map mounts, both
   * views lay out in the same fixed 2560x1440 space, and the rects below are
   * that map's rects (`assets/maps/workshop.json`) narrowed to this view's
   * three-across content. Same art, same proportions, same docking — the top
   * plate hangs off the top edge and the bottom one off the bottom edge, which
   * is what makes a bar read as the frame of the game instead of as an object
   * lying on the field.
   */
  private buildTopBar(): void {
    // Overhangs the screen edge on purpose. A plate with sky visible all round
    // it is an object floating in the world; a plate running off the top of the
    // frame is the frame — that is the whole difference Eric is pointing at
    // when he says the bars are "superimposed" rather than "natively embedded".
    //
    // TWO ROWS, for the reason `buildLegend` gives about its own plate: the
    // side-scroller had to grow a real transport deck to stop being a
    // feature-loss against the oval (tempo, SEND and the song's loop count all
    // lived only on the oval), and squeezing nine controls into one row would
    // give each the ~200 px slot that made the job-bar pictures unreadable.
    // Row 1 is WHERE you are and WHETHER it is playing; row 2 is HOW it plays.
    this.plate("panel-header-v2", TRACK_HEADER.plate);

    // A 5-column GRID, solved in `scene-layout.ts` against the plate's MEASURED
    // parchment field. The x's this replaces were picked by hand against a
    // GUESSED field ("~400..2064"); it is really 509..2028.
    const s = trackHeaderSlots();
    this.placeButton("btn-nav-map", s["map"]!,
      () => void EventBus.emit("track-nav", "map"), "MAP");
    this.placeButton("btn-track-ride", s["ride"]!,
      () => void EventBus.emit("transport-play", "ride"), "RIDE");
    this.placeButton("btn-transport-stop", s["stop"]!,
      () => void EventBus.emit("transport-stop"), "STOP");
    // Empty the train and start the build over. AR-043's painted plaque is a
    // near-square 512 canvas, so it takes a square slot like RIDE and STOP
    // rather than the landscape one the keycap fallback wanted.
    this.placeButton("btn-track-clear", s["clear"]!,
      () => void EventBus.emit("track-clear-train"), "CLEAR");
    // Render the song to a WAV and offer share/save. On row 1, bookending MAP:
    // both are wide painted plaques and both are ways OUT of this view, and
    // putting it here leaves row 2 as five even cells instead of six crammed
    // ones. The oval has had SEND since AR-020; without it the side-scroller
    // could not have become the default without losing the one feature that
    // gets a song off the device.
    this.placeButton("btn-send-song", s["send"]!,
      () => void EventBus.emit("track-send"), "SEND");

    this.buildTransportRow(s);
  }

  /**
   * Row 2 of the header: the controls the oval had and the side-scroller did
   * not. Every sprite here is already in the packed atlas — this deck needed no
   * new art, which is why it could be built rather than queued.
   *
   *   SLOW / FAST   `btn-transport-slow` / `-fast`, the Workshop's own keycaps
   *   the readout   drawn text, because `lcd-transport` is a Tiled display
   *                 anchor the oval mounts from its map and this scene has no
   *                 map — same numbers, same job, no second sprite invented
   *   LOOP          `btn-transport-loop`, cycling how many times the song runs
   *   TARP          arms tap-a-car-to-tarp without stealing tap-to-edit
   *   SEND          AR-020's `btn-send-song` plaque
   */
  private buildTransportRow(s: Record<string, PlacedRect>): void {
    this.placeButton("btn-transport-slow", s["slow"]!,
      () => void EventBus.emit("tempo-changed", -10), "SLOW");
    // The readout sits BETWEEN the two tempo keycaps, which is where a kid
    // looks when they have just pressed one of them.
    //
    // DARK ink, not the cream every other caption uses: this is the one label
    // that sits directly on the parchment rather than on a dark keycap, and
    // cream-on-parchment was very nearly invisible.
    //
    // "SPEED" over the number, because a bare 100 on a plank says nothing —
    // and SPEED is already the word the Workshop's own transport bar uses for
    // tempo, so the two views name it the same thing.
    const tempo = s["tempo"]!;
    this.add
      .text(tempo.x, tempo.y - 34, "SPEED", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#7a5433",
      })
      .setOrigin(0.5)
      .setFontSize(24)
      .setDepth(DEPTH.hud + 2);
    this.tempoText = this.add
      .text(tempo.x, tempo.y + 16, "120", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#4a2f1c",
      })
      .setOrigin(0.5)
      .setFontSize(44)
      .setDepth(DEPTH.hud + 2);
    this.placeButton("btn-transport-fast", s["fast"]!,
      () => void EventBus.emit("tempo-changed", 10), "FAST");

    // How many times round before the train stops. The charter puts "Mute/Loop
    // controls" on the Track's bottom bar; mute became tap-a-car and loop-count
    // was never built at all, so the song only ever looped forever.
    const loop = s["loop"]!;
    this.loopBtn = this.placeLatchButton(
      "btn-transport-loop",
      loop,
      () => void EventBus.emit("track-loop-cycled"),
      "LOOP",
    );
    // The count BADGES the key it belongs to. It used to hang 92 px below the
    // row, which put it past the plate's bottom rail and off the plate — a
    // stray "∞" lying in the sky with nothing to say it meant LOOP.
    //
    // On the CORNER rather than centred on the face: the keycap art has arrows
    // across its middle and the word LOOP along its foot, so there is no clear
    // space on it.
    //
    // STROKED TEXT, not a filled chip. The first attempt drew a dark disc behind
    // the number so it would read over the mottled stone; against the painted
    // deck that disc was simply a black blob stuck to the key. An outline does
    // the same legibility job without adding a shape to the picture.
    // Sized and placed so the WIDEST value it can hold ("2x") still clears the
    // key's right edge: `btn-transport-loop` contain-fits to ~0.9 of its cell
    // width, and Press Start 2P advances 1 em per glyph, so two glyphs plus half
    // the outline must fit inside that from the offset below.
    this.loopText = this.add
      .text(loop.x + loop.width * 0.2, loop.y - loop.height * 0.28, "∞", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
        stroke: "#1a1526",
        strokeThickness: 8,
      })
      .setName("track-display:loop")
      .setOrigin(0.5)
      .setFontSize(24)
      .setDepth(DEPTH.hud + 2);

    // TARP arms the tarp gesture instead of replacing tap-to-edit. Tapping a
    // car on this view opens THAT car in the Workshop — a deliberate choice
    // (edit on the fly, 2026-08-13) that muting must not quietly take back. So
    // muting gets its own latch: arm it, and the next car you tap gets covered.
    //
    // It wore `btn-transport-loop` until 2026-08-16, which paints the word LOOP
    // into the keycap — so the deck showed TWO buttons both reading LOOP and
    // nothing anywhere reading TARP. There is no authored tarp keycap, so this
    // borrows AR-054's blank `pad-key`: the face the sound pads label at run
    // time, which is exactly this job.
    this.tarpLatch = this.placeCaptionedKey(
      s["tarp"]!,
      () => void EventBus.emit("track-tarp-armed"),
      "TARP",
    );
  }

  /** A blank `pad-key` slab wearing a run-time caption, for a control the atlas
   *  has no authored keycap for. Returns the same latch setter
   *  `placeLatchButton` does. */
  private placeCaptionedKey(
    rect: { x: number; y: number; width: number; height: number },
    fire: () => void,
    caption: string,
  ): (on: boolean) => void {
    const def = UI_SPRITES["pad-key"];
    // `pad-key` is a two-state sprite, not an idle/pressed animation: `seated` is
    // the slab dropped into its socket. That makes it the right art for an
    // ARMING LATCH — the key visibly stays down while TARP is armed, which is a
    // state a four-year-old can read. The gold wash the other latch uses is a
    // hint; a key that is physically down is not.
    const idle = def?.states["idle"] ?? def?.base ?? "";
    const seated = def?.states["seated"] ?? idle;
    let latched = false;
    let img: Phaser.GameObjects.Image | undefined;
    const restFrame = (): string => (latched ? seated : idle);

    if (def && this.textures.exists(UI_ATLAS_KEY)) {
      // UNTINTED. The first attempt washed this slab with the tarp's own blue,
      // and a tint multiplies: it crushed the painted shading into one flat
      // rectangle — precisely what `plate()` refuses to draw, and what the rest
      // of this deck exists to have stopped being. The slab's own grey stone and
      // brass corners already belong to the header's material language.
      const key = this.add
        .image(0, 0, UI_ATLAS_KEY, def.base)
        .setName("track-control:tarp")
        .setOrigin(0.5)
        .setDepth(DEPTH.hud + 1);
      placeUiSprite(key, def, rect);
      let armed = false;
      key.setInteractive({ useHandCursor: true });
      key.on("pointerdown", () => { armed = true; key.setFrame(seated); });
      key.on("pointerout", () => { armed = false; key.setFrame(restFrame()); });
      key.on("pointerup", () => {
        key.setFrame(restFrame());
        if (!armed) return;
        armed = false;
        fire();
      });
      img = key;
    } else {
      this.pressable(
        this.add
          .rectangle(rect.x, rect.y, rect.width, rect.height * 0.7, 0x8d8878, 1)
          .setName("track-control:tarp")
          .setDepth(DEPTH.hud + 1),
        fire,
      );
    }
    // DARK ink on the SLAB — not on the cell, and not the cream the stone keys
    // use. Three separate things had to be measured rather than guessed:
    //
    //  - the slab's pale face is `PAD_KEY_FACE` of the canvas, only 64 % of its
    //    width, so a caption sized to the cell runs out under the brass frame;
    //  - that face is NOT centred on the sprite — it sits ~4 % left — so a
    //    caption centred on the cell overhangs the right side even when it fits;
    //  - Press Start 2P advances exactly 1 em per glyph (measured: "TARP" at
    //    100 px is 400 px), so the width IS `chars x fontSize`. Arithmetic over
    //    the string, never a measurement off the Text object: a scene lays out
    //    before the webfont resolves, so measuring sizes to the fallback face
    //    and then Press Start 2P arrives and overflows anyway.
    const faceW = (PAD_KEY_FACE.x1 - PAD_KEY_FACE.x0) * (img?.displayWidth ?? rect.width);
    const faceCx = (img?.x ?? rect.x)
      + ((PAD_KEY_FACE.x0 + PAD_KEY_FACE.x1) / 2 - 0.5) * (img?.displayWidth ?? rect.width);
    this.add
      .text(faceCx, rect.y, caption, {
        fontFamily: "'Press Start 2P', monospace",
        color: "#33302b",
      })
      .setOrigin(0.5)
      .setFontSize(Math.floor((faceW * 0.86) / caption.length))
      .setDepth(DEPTH.hud + 2);
    const glow = this.add
      .rectangle(rect.x, rect.y, rect.width * 1.12, rect.height * 1.12, 0xffd166, 0.32)
      .setDepth(DEPTH.hud)
      .setVisible(false);
    return (on: boolean) => {
      latched = on;
      glow.setVisible(on);
      img?.setFrame(restFrame());
    };
  }

  /** A chrome button that also carries a latched (gold) look, for the two
   *  controls in this row that are states rather than one-shots. */
  private placeLatchButton(
    sprite: string,
    rect: { x: number; y: number; width: number; height: number },
    fire: () => void,
    caption: string,
  ): (on: boolean) => void {
    this.placeButton(sprite, rect, fire, caption);
    const glow = this.add
      .rectangle(rect.x, rect.y, rect.width * 1.12, rect.height * 1.12, 0xffd166, 0.32)
      .setDepth(DEPTH.hud)
      .setVisible(false);
    return (on: boolean) => glow.setVisible(on);
  }

  /** One of the shared stretched zone plates, or nothing at all if the atlas is
   *  still in flight. Deliberately NOT a coloured rectangle fallback: a slab of
   *  flat colour over the sky is precisely the thing being removed here, and
   *  the buttons are legible on their own. */
  private plate(sprite: string, rect: { x: number; y: number; width: number; height: number }): void {
    const def = UI_SPRITES[sprite];
    if (!def || !this.textures.exists(UI_ATLAS_KEY)) return;
    const img = this.add.image(0, 0, UI_ATLAS_KEY, def.base).setOrigin(0.5).setDepth(DEPTH.hud);
    placeUiSprite(img, def, rect);
  }

  /** A chrome button on a plate: the real atlas art contain-fitted into its
   *  slot, or a labelled keycap when the atlas has not arrived. */
  private placeButton(
    sprite: string,
    rect: { x: number; y: number; width: number; height: number },
    fire: () => void,
    caption: string,
  ): void {
    const def = UI_SPRITES[sprite];
    if (def && this.textures.exists(UI_ATLAS_KEY)) {
      const img = this.add
        .image(0, 0, UI_ATLAS_KEY, def.base)
        .setName(`track-control:${sprite}`)
        .setOrigin(0.5)
        .setDepth(DEPTH.hud + 1);
      // Content-fit through the shared helper, so these sit at the same
      // optical size as the identical buttons in every other scene.
      placeUiSprite(img, def, rect);
      this.pressableAtlas(img, def, fire);
      return;
    }
    this.pressable(
      this.add
        .rectangle(rect.x, rect.y, rect.width, rect.height * 0.7, 0x3a3350, 1)
        .setName(`track-control:${sprite}`)
        .setDepth(DEPTH.hud + 1),
      fire,
    );
    this.add
      .text(rect.x, rect.y, caption, {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
      })
      .setOrigin(0.5)
      .setFontSize(28)
      .setDepth(DEPTH.hud + 2);
  }

  /** Armed press on an atlas button, swapping to its `-pressed` frame when the
   *  sprite ships one — the same idle/pressed contract `ui-scene.ts` uses. */
  private pressableAtlas(
    img: Phaser.GameObjects.Image,
    def: { base: string; states: Record<string, string> },
    fire: () => void,
  ): void {
    // `states` is keyed by ROLE ("idle" / "pressed" / "seated"), not by frame
    // name — `ui-scene.ts` is the contract. This looked the roles up by frame
    // name instead (`states["btn-track-ride-idle"]`), so both reads always
    // missed, `down` collapsed to `idle`, and every authored `-pressed` frame on
    // this deck was dead: nothing on the side-scroller's header has ever visibly
    // depressed. `pad-key` calls its pressed state `seated`.
    const idle = def.states["idle"] ?? def.base;
    const down = def.states["pressed"] ?? def.states["seated"] ?? idle;
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

  /** Every mode switch on the job bar, keyed by kind, so a LATCHED mode can
   *  visibly hold its gold wash whatever art it currently wears. */
  /** Row-2 transport deck: the tempo readout, the loop counter and its keycap
   *  glow, the TARP arm latch. All written by React, never read by the scene. */
  private tempoText?: Phaser.GameObjects.Text;
  private loopText?: Phaser.GameObjects.Text;
  private loopBtn: (on: boolean) => void = () => {};
  private tarpLatch: (on: boolean) => void = () => {};
  /** Mirrors the TARP latch, read on a car tap. React owns the truth. */
  private tarpArmed = false;
  /** The SEND flow's panel + the state React drives it with. */
  private sendPanel?: SendSongPanel;
  private sendState: SendUiState = { kind: "idle" };
  /** "See the sound" — the same jumbotron the oval carries. */
  private viz?: SceneVisualizer;
  private modeBtns: Record<string, { setLatched: (on: boolean) => void }> = {};
  /** The BACKWARDS switch's latched look — picture or keycap alike. */
  private backwardsLatch: (on: boolean) => void = () => {};
  /** Temporary in-scene chooser for one car. It deliberately uses the existing
   *  panel chrome so Manus can replace the faces later without changing what
   *  the choices emit. */
  private carActionPanel: Phaser.GameObjects.Container | null = null;

  /** The Lemmings job bar — on the shared transport plate, docked to the
   *  bottom edge. EIGHT switches (geometry trio + night/tunnel/tiny/giant +
   *  BACKWARDS), all latching, all stacking. Keycaps stand in wherever
   *  AR-048/AR-049 have not painted a picture button yet.
   *
   * TWO ROWS OF FOUR, not one row of eight. Eight across the plate gave each
   * switch a ~200px slot, so the 260x120 painted art drew at 0.72 and the
   * picture inside it — a hill, a moon, a mouse — was the size of a thumbnail.
   * The player cannot read the captions (that is the whole reason these are
   * pictures), so a picture too small to identify is a button with no label at
   * all. Four across doubles the column to 416px and the art now draws at 1.25,
   * which is 2.7x the area it had.
   *
   * The plate grows upward to hold the second row (top rim 1090, was 1200) and
   * stops well clear of RAIL_Y — the wheels still stand on visible ground.
   */
  private buildLegend(): void {
    // Runs off the bottom edge, for the reason `buildTopBar` gives.
    this.plate("panel-transport-v2", TRACK_JOB_BAR.plate);
    const slots = trackJobSlots();

    /** One switch in its shared slot: the painted pair when it exists, a labelled
     *  keycap when it does not. Returns its latched-look setter. Written once —
     *  BACKWARDS used to hand-copy this whole body for its single slot. */
    const switchAt = (
      id: TrackJobId,
      label: string,
      fire: () => void,
    ): ((on: boolean) => void) => {
      const { x, y, width, height } = slots[id];
      const idle = `trk-btn-${id}`;
      const down = `trk-btn-${id}-pressed`;
      if (this.textures.exists(idle)) {
        // Picture buttons: the player is four and cannot read. The caption is
        // for the adult, so it is only drawn when there is no picture.
        const btn = this.add
          .image(x, y, idle)
          .setName(`track-mode:${id}`)
          .setDepth(DEPTH.hud + 1);
        // Contain-fit each button's MEASURED content into the identical slot,
        // rather than drawing every canvas at one scale. The eight files share
        // a 260x120 canvas but not the plaque inside it — hill fills 258x120,
        // night only 226x73 — so a fixed scale produced a row of buttons at
        // eight different sizes. The idle box is the reference for the pressed
        // frame too: the pressed art is drawn a shade smaller ON PURPOSE, and
        // re-fitting it would cancel exactly that feedback.
        placeUiSprite(
          btn,
          { states: {}, base: idle, content: measureContentBox(this, idle), stretch: false },
          { x, y, width, height },
        );
        this.pressableImage(btn, idle, this.textures.exists(down) ? down : idle, fire);
        return (on) => (on ? btn.setTint(0xffd166) : btn.clearTint());
      }
      const swatch = this.add
        .rectangle(x, y, width, height, 0x3a3350, 1)
        .setName(`track-mode:${id}`)
        .setDepth(DEPTH.hud + 1);
      const cap = this.add
        .text(x, y, label, {
          fontFamily: "'Press Start 2P', monospace",
          color: "#ffe9b0",
        })
        .setOrigin(0.5)
        .setFontSize(24)
        .setDepth(DEPTH.hud + 2);
      // Law 8: the response happens THIS frame, even though the sound lands on
      // the next bar.
      this.pressable(swatch, fire);
      return (on) => {
        swatch.setFillStyle(on ? 0xffd166 : 0x3a3350, 1);
        cap.setColor(on ? "#2b2440" : "#ffe9b0");
      };
    };

    // Row 1 is what the WORLD does; row 2 is what the TRAIN does. BACKWARDS
    // closes the second row because it is the other thing that rewrites how the
    // whole consist sounds without touching the landscape.
    for (const { id, label } of TRACK_JOB_BAR.switches) {
      if (id === "backwards") {
        // Reverses every sampled voice; its own latch, stacks with the modes.
        this.backwardsLatch = switchAt(id, label, () =>
          void EventBus.emit("track-backwards-toggled"));
      } else {
        const kind: ModeKind = id;
        this.modeBtns[kind] = {
          setLatched: switchAt(kind, label, () =>
            void EventBus.emit("track-mode-toggled", kind)),
        };
      }
    }
  }

  /** React → scene: the set of LATCHED modes. Every latched switch holds a
   *  gold wash so what is on is visible from across the room — a latch nobody
   *  can see is the ×2-lever trap all over again. */
  setModeLatched(kinds: ReadonlySet<string>): void {
    for (const [k, btn] of Object.entries(this.modeBtns)) {
      btn.setLatched(kinds.has(k));
    }
  }

  /** React → scene: the BACKWARDS switch's latched look. */
  setBackwards(on: boolean): void {
    this.backwardsLatch(on);
  }

  /** React → scene: the tempo readout between SLOW and FAST. */
  setTempo(bpm: number): void {
    this.tempoText?.setText(String(Math.round(bpm)));
  }

  /** React → scene: how many times the song runs before stopping (null = for
   *  ever). The keycap wears the latch glow whenever a FINITE count is set, so
   *  "this will stop" is visible without reading the number. */
  setLoopCount(loops: number | null): void {
    this.loopText?.setText(loops === null ? "∞" : `${loops}x`);
    this.loopBtn(loops !== null);
  }

  /** React → scene: is the tarp gesture armed? */
  setTarpArmed(on: boolean): void {
    this.tarpArmed = on;
    this.tarpLatch(on);
  }

  /**
   * React → scene: the master-output analyser + a Project reader, which is what
   * lets the jumbotron exist. Same contract as the oval's — the analyser is
   * PUSHED in, because `SoundPort` is React's to own and a scene reaching for
   * it would put a vendor audio dependency behind the EventBus boundary.
   *
   * The screen hangs in the sky on the far side of the header, where nothing
   * else is drawn and the parallax bands are quietest; it is fixed rather than
   * scrolling, because it is a readout of the SOUND and not a thing in the
   * world the train rides through.
   */
  attachVisualizer(analyser: AnalyserNode, getProject: () => Project): void {
    if (this.viz) return;
    const viz = new SceneVisualizer(this, {
      analyser,
      getProject,
      styles: VISUAL_STYLES,
      depth: DEPTH.hud - 1,
    });
    this.viz = viz;
    let armed = false;
    viz.hitTarget.on("pointerdown", () => { armed = true; });
    viz.hitTarget.on("pointerout", () => { armed = false; });
    viz.hitTarget.on("pointerup", () => {
      if (!armed) return;
      armed = false;
      viz.cycleStyle();
    });
    viz.layout(TRACK_VISUALIZER);
  }

  /** Exposed for the e2e bridge: what the jumbotron is showing, and how visible
   *  it is. Visibility is driven by REAL master-output level, so asserting it
   *  rose while a song played proves the screen is fed by audio, not a flag. */
  get vizState(): { style: string; visibility: number } | null {
    return this.viz ? { style: this.viz.styleLabel, visibility: this.viz.visibility } : null;
  }

  /** React → scene: the SEND flow's state (drives the result panel). */
  setSendState(state: SendUiState): void {
    this.sendState = state;
    this.sendPanel?.setUiState(state);
    this.sendPanel?.layout(this.scale.gameSize.width, this.scale.gameSize.height);
  }

  /** Exposed for the e2e bridge: what the SEND UI currently shows. */
  get sendUiState(): SendUiState {
    return this.sendState;
  }

  /** React → scene: the NIGHT and TUNNEL shades — full-scene washes under the
   *  HUD, dark blue for night and near-black for the tunnel, stacked when
   *  both are on. The painted versions are AR-049's. */
  setNightTunnel(night: boolean, tunnel: boolean): void {
    this.nightSky?.setVisible(night);
    this.nightShade?.setVisible(night);
    this.tunnelShade?.setVisible(tunnel);
  }

  /** React → scene: the tiny/giant switches' train size. The whole consist —
   *  spacing included — scales, which IS the joke. */
  setTrainScale(scale: number): void {
    this.trainScale = scale;
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

  /** The transport committed these geometry spans; build them there. One per
   *  kind, stacked freely; order carries recency (last = newest toggle, which
   *  is what the caption follows). */
  setTerrainRides(rides: readonly V3TerrainRide[]): void {
    this.rides.clear();
    for (const ride of rides) this.rides.set(ride.kind, ride);
    this.newestRide = rides.length > 0 ? (rides[rides.length - 1] as V3TerrainRide) : null;
  }

  // ── frame ────────────────────────────────────────────────────────────────

  update(time: number): void {
    if (!this.ready) return;
    const dt = this.lastAt < 0 ? 0 : Math.max(0, (time - this.lastAt) / 1000);
    // The jumbotron ticks off the SCENE's update, not its own rAF — same as the
    // oval. Missing this call is not a visible crash: the screen simply stays
    // dark for ever, because `visibility` only ever moves inside `update`. An
    // e2e caught it (visibility stuck at 0 while a song played) and that is the
    // only way it WOULD be caught, which is why the spec asserts a real level
    // rather than that a visualizer object exists.
    this.viz?.update(dt * 1000);
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
    if (this.nightSky) this.nightSky.tilePositionX = parallaxOffset(this.pos, this.view, 0.05);
    if (this.hills) this.hills.tilePositionX = parallaxOffset(this.pos, this.view, 0.18);
    if (this.trees) this.trees.tilePositionX = parallaxOffset(this.pos, this.view, 0.42);
    if (this.ground) this.ground.tilePositionX = parallaxOffset(this.pos, this.view, 1);
    if (this.fore) this.fore.tilePositionX = parallaxOffset(this.pos, this.view, 1.45);


    this.layoutTerrain();
    this.layoutTrain(travelPx(this.pos, this.view));
  }

  /** The span that LIFTS the train — only a hill does (the bridge deck keeps
   *  the rails level and rain is weather), so the pose follows the hill's
   *  ride alone however many modes are stacked. */
  private get span(): TerrainSpan | null {
    return this.rides.get("hill") ?? null;
  }

  /** Screen x of the consist's nose, and each car's centre, left to right.
   *  Pure geometry over the car count — no bars involved, because the train is
   *  one object now rather than a bar-indexed frieze. */
  private consistLayout(surge: number): { noseX: number; carX: number[] } {
    const n = this.cars.length;
    // The tiny/giant switches scale the WHOLE consist — bodies and spacing
    // together, or a small train would ride with huge gaps between cars.
    const S = this.trainScale;
    const trainLen = (LOCO_W + n * (CAR_W + COUPLING)) * S;
    // Centre a short train; anchor a long one by the nose and let its tail run
    // off the left, which is what a long train should look like.
    const noseX =
      trainLen + 160 <= W ? (W + trainLen) / 2 : W * NOSE_X_FRAC;
    const carX: number[] = [];
    // Car 0 couples directly behind the locomotive; the rest trail leftward.
    let right = noseX - (LOCO_W + COUPLING) * S;
    for (let i = 0; i < n; i++) {
      carX.push(right - (CAR_W * S) / 2);
      right -= (CAR_W + COUPLING) * S;
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
      this.locoRoot?.setVisible(false);
      this.locoShadow?.setVisible(false);
      this.nowPost?.setVisible(false);
      this.beatLantern?.setVisible(false);
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

    const S = this.trainScale;
    const place = (
      x: number,
      body: Phaser.GameObjects.Container,
      shadow: Phaser.GameObjects.Image,
      wheelbase: number,
    ): { lift: number; tilt: number } => {
      const pose = carPose(this.barAtX(x), wheelbase, span, this.view.barWidth);
      const y = Math.round(RAIL_Y - pose.lift + bob);
      body.setPosition(Math.round(x), y).setRotation(pose.angle).setScale(S);
      shadow
        .setVisible(true)
        .setPosition(Math.round(x), Math.round(RAIL_Y - pose.lift + 10))
        .setRotation(pose.angle)
        .setScale(S * (1 - Math.abs(bob) / 60), S);
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
        .setScale(S)
        .setAlpha(car.muted ? 0.45 : 1); // tarped = still there, not sounding
      // The coat and the lift are the SAME silhouette as the body, so a car-type
      // swap has to move all of them or the colour ends up on last frame's shape.
      const tex = CAR_BODY_KEY[car.carType] ?? CAR_BODY_KEY.boxcar;
      if (s.body.texture.key !== tex) {
        s.body.setTexture(tex);
        setLiveryTexture(s.coat, tex);
        s.lift.setTexture(tex);
      }
      s.label.setText(String(car.number));
      if (s.liveryDrawn !== car.livery) {
        s.liveryDrawn = car.livery;
        setLiveryColor(s.coat, colorFor(car.livery));
      }
      this.drawCrew(s, car);
      if (s.soundingDrawn !== isNow) {
        s.soundingDrawn = isNow;
        s.lift.setAlpha(isNow ? SOUNDING_LIFT : 0);
      }
      // Law 4: the wheels turn because the world moved, not because time passed.
      s.wheelA.setRotation(angle);
      s.wheelB.setRotation(angle);
      s.shadow
        .setVisible(true)
        .setPosition(Math.round(x), Math.round(RAIL_Y - pose.lift + 10))
        .setRotation(pose.angle)
        .setScale(S * (1 - Math.abs(bob) / 60), S);
    });

    if (this.locoRoot && this.locoShadow) {
      this.locoRoot.setVisible(true);
      place(
        noseX - LOCO_W / 2,
        this.locoRoot,
        this.locoShadow,
        (LOCO_W * 0.56) / this.view.barWidth,
      );
      // Each wheel turns at its OWN radius, so the little pilot wheel spins
      // faster than the driver over the same ground — Law 4 again.
      this.locoWheels.forEach((w, i) =>
        w.setRotation(wheelAngle(dist, LOCO_WHEELS[i]?.r ?? WHEEL_R)),
      );
    }

    // The marker rides with whichever car is sounding.
    if (this.beatLantern) {
      const x = carX[sounding] as number;
      const pose = carPose(this.barAtX(x), WHEELBASE_BARS, span, this.view.barWidth);
      const slot = this.slots[sounding];
      // Above the car AND above whoever is riding it. The roofline alone put
      // the lamp through the drummer's head — the crew's integrated poses stand
      // proud of the roof, so the roof is not the top of the car. Asking the
      // drawn objects for their own tops means a taller rider pushes the
      // lantern up instead of wearing it.
      let top = RAIL_Y - pose.lift + bob - (slot ? slot.body.height * S : 0);
      for (const rider of slot?.riderImgs ?? []) {
        if (rider.visible) top = Math.min(top, rider.getBounds().top);
      }
      // Anchored by the LOW frame's painted base, not by the canvas edge: both
      // frames are drawn inside a 160px square with the lamp at different
      // heights, so hanging the canvas bottom on that line left the lamp
      // floating half a car above it, detached — which is the exact fault the
      // lantern was drawn to fix in the NOW post. Measured, so a redelivered
      // lantern with different padding still lands where it should.
      const base = (1 - measureContentBox(this, "trk-beat-lantern-low")[3]) * LANTERN_CANVAS;
      const roofY = top + base * S - LANTERN_CLEARANCE * S;
      // The flick is on the BEAT, read off the transport position — four beats
      // to the bar — not off distance travelled like the bob. A beat lantern
      // that pulsed with the wheels would be a wheel lantern.
      const beat = this.pos * BEATS_PER_BAR;
      const key = beat - Math.floor(beat) < BEAT_FLICK
        ? "trk-beat-lantern-high"
        : "trk-beat-lantern-low";
      if (this.beatLantern.texture.key !== key && this.textures.exists(key)) {
        this.beatLantern.setTexture(key);
      }
      this.beatLantern
        .setVisible(true)
        .setScale(S)
        .setPosition(Math.round(x), Math.round(roofY));
    } else if (this.nowPost) {
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
    // Modes STACK: every geometry kind lays out from its own span, so a
    // mound, a deck and a squall can all be in the world at once.
    const spanOf = (kind: TerrainKind): { ride: V3TerrainRide; span: { x: number; width: number } } | null => {
      const ride = this.rides.get(kind);
      if (!ride) return null;
      const span = terrainSpanX(ride.startBar, ride.endBar, this.pos, this.view);
      return span && span.width > 0 ? { ride, span } : null;
    };
    const hill = spanOf("hill");
    const bridge = spanOf("bridge");
    const rain = spanOf("rain");

    // Keep the caption over the NEWEST span but inside the screen, so a
    // terrain half off the edge still reads instead of leaving a stray letter.
    const label = this.terrainLabel;
    const newest =
      this.newestRide && this.rides.get(this.newestRide.kind) === this.newestRide
        ? spanOf(this.newestRide.kind)
        : null;
    if (label) {
      if (newest) {
        const span = newest.span;
        label.setText(newest.ride.kind.toUpperCase()).setVisible(true);
        const halfText = label.width / 2 + 20;
        const wanted = span.x + span.width / 2;
        const lo = Math.max(halfText, span.x + halfText);
        const hi = Math.min(W - halfText, span.x + span.width - halfText);
        label.setPosition(
          Math.round(hi >= lo ? Math.min(hi, Math.max(lo, wanted)) : wanted),
          TERRAIN_LABEL_Y,
        );
      } else {
        label.setVisible(false);
      }
    }

    // A hill: a real mound the train stands on. Stretched in x only — the
    // profile is normalized across the span, so the silhouette still matches
    // `railLift` at every point.
    this.mound?.setVisible(!!hill);
    if (hill && this.mound) {
      this.mound.setPosition(Math.round(hill.span.x), RAIL_Y);
      this.mound.setDisplaySize(Math.round(hill.span.width), HILL_PEAK);
    }

    // A bridge: the ground falls away and a deck carries the rails across it.
    this.gap?.setVisible(!!bridge);
    this.deck?.setVisible(!!bridge);
    if (bridge && this.gap && this.deck) {
      const x = Math.round(bridge.span.x);
      const w = Math.round(bridge.span.width);
      // Girder immediately under the wheels, piers hanging into the void.
      const deckH = 170;
      this.deck.setPosition(x, RAIL_Y);
      this.deck.setDisplaySize(w, deckH);
      // The void is clipped to the STRUCTURE, not to the profile's full drop:
      // `groundDrop` is how far the ground falls away in the physics, but a
      // void drawn past the bottom of the trestle just reads as a grey box.
      const drop = Math.min(
        groundDrop((bridge.ride.startBar + bridge.ride.endBar) / 2, bridge.ride),
        deckH - 26,
      );
      this.gap.setPosition(x, RAIL_Y + 26);
      this.gap.setSize(w, Math.max(1, drop));
    }

    // Rain: weather in a moving shaft, plus the sky going over.
    // ── weather, not a wall ────────────────────────────────────────────────
    // Two earlier passes clipped the rain to its bar span, which put a hard
    // vertical cut down the middle of the sky and read as a grey box over the
    // scene. Phaser 4 has no `BitmapMask` (only the hard-edged `GeometryMask`),
    // so the edge cannot be feathered — and a wall of rain standing on the
    // track was the wrong idea anyway. What you see coming is the CLOUD; when
    // it arrives the rain falls across the whole screen and then passes.
    const wet = rain ? this.wetness(rain.span) : 0;
    this.cloud?.setVisible(!!rain);
    if (rain && this.cloud) {
      this.cloud.setPosition(Math.round(rain.span.x + rain.span.width / 2), 250);
      this.cloud.setDisplaySize(Math.max(320, rain.span.width * 0.9), 300);
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

  /** Read-only scene state for tests. A screenshot cannot test speed-scaling,
   *  latch lifecycle, or whether the train stands ON the hill it is drawn over. */
  debugState(): {
    pos: number;
    playheadX: number;
    wheelAngle: number;
    tarpArmed: boolean;
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
    // The probe reports the NEWEST ride — with stacking there can be several,
    // and "the one the kid just picked" is what the tests reason about.
    const newest = this.newestRide;
    const span = newest
      ? terrainSpanX(newest.startBar, newest.endBar, this.pos, this.view)
      : null;
    return {
      pos: this.pos,
      playheadX: playheadX(this.view),
      wheelAngle: wheelAngle(dist, WHEEL_R),
      tarpArmed: this.tarpArmed,
      soundingCarX: now ? now.centreX : null,
      soundingCarY: now ? RAIL_Y - pose.lift : null,
      soundingCarAngle: pose.angle,
      terrain: span && newest ? { ...span, kind: newest.kind } : null,
    };
  }

  /** Exposed for end-to-end observation; interaction still uses real pixels. */
  get undoOffer(): { offering: boolean; lost: string } {
    return {
      offering: this.undoToast?.offering ?? false,
      lost: this.undoToast?.lost ?? "",
    };
  }

  /** One pooled body per visible slot; the pool only grows. */
  /** Exactly one body per car in the Yard train — the consist IS the train the
   *  kid built, so the pool is sized by that and nothing else. */
  private rebuildSlots(): void {
    const needed = this.cars.length;
    while (this.slots.length < needed) this.slots.push(this.makeSlot(this.slots.length));
    for (let i = needed; i < this.slots.length; i++) this.slots[i]!.hide();
  }

  /** The car's crew rides INSIDE the car, not on top of it (Eric, 2026-08-12).
   *
   *  The mechanism is GAME_FEEL Law 3 — an actor passes BEHIND something: the
   *  riders are inserted at the BOTTOM of the slot's container, so the car
   *  body occludes their lower halves and only head-and-shoulders rise above
   *  the near wall. On a boxcar or hopper that reads as standing in the car;
   *  on a tanker, as riding behind the tank; on a flatcar (a low body) most of
   *  the character shows, standing on the deck. As children of the container
   *  they inherit its pose (climbs, tilts, bob) for free.
   *
   *  Art seam (AR-046): a dropped `track3/ride-<station>-<carType>.png` wins
   *  over `track3/ride-<station>.png`, which wins over the atlas shelf sprite —
   *  per-car integrated poses land file by file with no code change, the same
   *  contract every other track3 slot uses. Rebuilt only when the crew set or
   *  the body art changes, never per frame. */
  /** Where a rider peeks out of each body, in CANVAS px from the art's top —
   *  measured off the delivered `track3/car-*.png`, not eyeballed: the
   *  boxcar's roofline, the hopper's open rim, the tanker's barrel top, the
   *  flatcar's deck lip. The car canvas bottom sits on the railhead at scale
   *  1, so container-space y of the line is `-(canvasH - PEEK_Y)`. */
  private static readonly PEEK_Y: Readonly<Record<CarType, number>> = {
    boxcar: 8,
    hopper: 14,
    tanker: 30,
    flatcar: 10,
  };

  private drawCrew(s: SlotView, car: V3Car): void {
    const key = `${car.crew.join("|")}@${s.body.texture.key}`;
    if (key === s.crewDrawn) return;
    s.crewDrawn = key;
    s.riderImgs.forEach((img) => img.destroy());
    s.riderImgs = [];
    const peekLineY = -(s.body.height - (TrackV3Scene.PEEK_Y[car.carType] ?? 10));
    // One world size for every rider on every car — the crew are the same
    // creatures wherever they ride; only how much the wall hides varies.
    const SLOT_W = 100;
    const SLOT_H = 116;
    const n = car.crew.length;
    car.crew.forEach((spriteKey, i) => {
      // "inst-drums" → dropped art keys "ride-drums-boxcar" / "ride-drums".
      const station = spriteKey.replace(/^inst-/, "");
      const x = (i - (n - 1) / 2) * CAR_W * 0.24;

      // AR-046 per-car INTEGRATED pose: the file carries its own crop (its
      // bottom edge IS the car's peek line — nothing below the wall is in the
      // art), so it draws IN FRONT of the body, bottom-anchored on the line:
      // hands over the rim, elbows on the roof, native to that car's art.
      const perCar = `trk-ride-${station}-${car.carType}`;
      if (this.textures.exists(perCar)) {
        const img = this.add.image(x, peekLineY, perCar).setOrigin(0.5, 1);
        const fit = Math.min(SLOT_W / img.width, SLOT_H / img.height, 1);
        img.setScale(fit);
        s.root.add(img); // in front — the art brings its own occlusion
        s.riderImgs.push(img);
        return;
      }

      // Interim (generic pose, or the shelf sprite): draw BEHIND the body and
      // let the near wall occlude. Contain-fit the CONTENT, then TOP-ANCHOR it
      // so a third of the drawn character rises above the peek line whatever
      // its aspect — centring instead is how a wide drummer vanished entirely
      // behind a tall wall.
      const generic = `trk-ride-${station}`;
      let img: Phaser.GameObjects.Image;
      if (this.textures.exists(generic)) {
        img = this.add.image(0, 0, generic);
        const fit = Math.min(SLOT_W / img.width, SLOT_H / img.height);
        img.setScale(fit);
        const drawnH = img.height * fit;
        img.setPosition(x, peekLineY - drawnH * 0.32 + drawnH / 2);
      } else if (this.textures.exists(UI_ATLAS_KEY) && UI_SPRITES[spriteKey]) {
        const def = UI_SPRITES[spriteKey]!;
        img = this.add.image(0, 0, UI_ATLAS_KEY, def.base);
        const [cx0, cy0, cx1, cy1] = def.content;
        const contentW = Math.max(1, (cx1 - cx0) * img.width);
        const contentH = Math.max(1, (cy1 - cy0) * img.height);
        const drawnH = contentH * Math.min(SLOT_W / contentW, SLOT_H / contentH);
        placeUiSprite(img, def, {
          x,
          y: peekLineY - drawnH * 0.32 + drawnH / 2,
          width: SLOT_W,
          height: SLOT_H,
        });
      } else {
        return;
      }
      s.root.addAt(img, 0); // BEHIND the body: the near wall is the occluder
      s.riderImgs.push(img);
    });
  }

  private makeSlot(index: number): SlotView {
    const shadow = this.add
      .image(0, 0, "trk-shadow")
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.shadow);
    const root = this.add.container(0, 0).setDepth(DEPTH.train);
    // Origin (0.5, 1): the art's bottom edge IS the railhead, so a body needs no
    // per-type offset table — the thing that goes stale the moment art changes.
    const body = this.add.image(0, 0, "trk-car-boxcar").setOrigin(0.5, 1);
    // The livery: the body itself, tinted, plus ONE overlay of its own
    // silhouette. `car-tint.ts` owns what they are and why there are two passes.
    const coat = asLiveryCoat(
      body,
      this.add.image(0, 0, "trk-car-boxcar").setOrigin(0.5, 1),
    );
    const lift = this.add
      .image(0, 0, "trk-car-boxcar")
      .setOrigin(0.5, 1)
      .setAlpha(0)
      .setTint(0xffe9b0)
      .setTintMode(Phaser.TintModes.FILL);
    // Wheels go on AFTER the wash: they are iron on every car, and a red or
    // yellow wheel would be the one part of the tint that reads as a mistake.
    const wheelA = this.add.image(-CAR_W * WHEEL_AT, -WHEEL_R, "trk-wheel");
    const wheelB = this.add.image(CAR_W * WHEEL_AT, -WHEEL_R, "trk-wheel");
    const label = this.add
      .text(0, NAMEPLATE.cy, "1", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
        stroke: "#1a1526",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setFontSize(NAMEPLATE.fontPx);
    root.add([body, coat.fill, lift, wheelA, wheelB, label]);
    const view: SlotView = {
      root, body, coat, lift, wheelA, wheelB, label, shadow,
      riderImgs: [],
      crewDrawn: "",
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
    // Tap a car → choose what to do with THAT car. Armed press like every other
    // control; the press feedback borrows the sounding lift (the cream flood),
    // so no new art channel is invented. Slots are pooled by INDEX and cars are
    // laid out by index, so `this.cars[index]` is always the car this slot is
    // currently wearing.
    const restLift = (): number => (view.soundingDrawn ? SOUNDING_LIFT : 0);
    let armed = false;
    body.setInteractive({ useHandCursor: true });
    body.on("pointerdown", () => {
      armed = true;
      lift.setAlpha(Math.max(lift.alpha, 0.4));
    });
    body.on("pointerout", () => {
      armed = false;
      lift.setAlpha(restLift());
    });
    body.on("pointerup", () => {
      lift.setAlpha(restLift());
      if (!armed) return;
      armed = false;
      const car = this.cars[index];
      if (!car) return;
      // The tap itself is selection only. Navigation and muting happen only
      // after a second, explicit choice; the TARP latch merely highlights the
      // corresponding choice instead of secretly changing this gesture.
      this.showCarAction(car);
    });
    view.hide();
    return view;
  }

  /** A fixed HUD chooser rather than a world-space popup that would drift away
   *  from its car during a ride. Existing panel chrome is an honest temporary
   *  surface; the named choices are stable integration points for painted art. */
  private showCarAction(car: V3Car): void {
    this.dismissCarAction();

    const layout = TRACK_CAR_ACTION_LAYOUT;
    const panelX = (W - layout.panelWidth) / 2;
    const panelY = 555;
    const drop = 10;
    const root = this.add.container(0, 0).setDepth(DEPTH.hud + 20);
    const backdrop = this.add
      .rectangle(0, 0, W, H, 0x000000, 0.48)
      .setOrigin(0)
      .setInteractive();
    const shadow = this.add
      .rectangle(
        panelX + drop,
        panelY + drop,
        layout.panelWidth,
        layout.panelHeight,
        PANEL_EDGE,
        0.55,
      )
      .setOrigin(0);
    const frame = this.add
      .rectangle(
        panelX,
        panelY,
        layout.panelWidth,
        layout.panelHeight,
        PANEL_BG,
        1,
      )
      .setStrokeStyle(6, PANEL_EDGE)
      .setOrigin(0);
    const title = this.add
      .text(W / 2, panelY + 72, `CAR ${car.number} — WHAT NEXT?`, {
        fontFamily: FONT,
        color: INK,
        align: "center",
      })
      .setOrigin(0.5)
      .setFontSize(28);
    root.add([backdrop, shadow, frame, title]);

    const choices = trackCarActionChoices(car.muted);
    const rowWidth =
      choices.length * layout.buttonWidth + (choices.length - 1) * layout.buttonGap;
    const rowX = (W - rowWidth) / 2;
    const rowY = panelY + 150;
    choices.forEach((choice, index) => {
      const highlighted = choice.kind === "toggle-mute" && this.tarpArmed;
      const button = new PanelButton(
        this,
        choice.label,
        () => this.chooseCarAction(choice.kind, car.id),
        highlighted ? 0x2c6bc7 : undefined,
      );
      button.container.setName(choice.objectName);
      button.place(
        {
          x: rowX + index * (layout.buttonWidth + layout.buttonGap),
          y: rowY,
          w: layout.buttonWidth,
          h: layout.buttonHeight,
        },
        24,
      );
      root.add(button.container);
    });

    this.carActionPanel = root;
  }

  private chooseCarAction(kind: TrackCarActionKind, instanceId: string): void {
    this.dismissCarAction();
    if (kind === "edit") EventBus.emit("track-car-edit", instanceId);
    if (kind === "toggle-mute") EventBus.emit("track-car-mute-toggled", instanceId);
    // React owns the latch truth. Confirmation consumes an existing arm through
    // the same typed toggle event the header uses; choosing TARP directly while
    // unarmed must not accidentally arm it for the next car.
    if (this.tarpArmed && trackCarActionDisarmsTarp(kind)) {
      EventBus.emit("track-tarp-armed");
    }
  }

  private dismissCarAction(): void {
    this.carActionPanel?.destroy(true);
    this.carActionPanel = null;
  }
}

interface SlotView {
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  /** The livery coat — two overlays of the body's own silhouette. */
  readonly coat: LiveryCoat;
  /** The sounding-car lift — the same silhouette, flooded cream. */
  readonly lift: Phaser.GameObjects.Image;
  readonly wheelA: Phaser.GameObjects.Image;
  readonly wheelB: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly shadow: Phaser.GameObjects.Image;
  /** The crew standing on the car — children of `root`, so they ride every
   *  transform (position, tilt, bob) for free. */
  riderImgs: Phaser.GameObjects.Image[];
  /** crew keys + body texture last drawn, so riders rebuild only on change. */
  crewDrawn: string;
  /** Last livery applied, so the tint is re-set only when it changes rather
   *  than every frame for every car. */
  liveryDrawn: number;
  soundingDrawn: boolean;
  readonly show: () => void;
  readonly hide: () => void;
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
