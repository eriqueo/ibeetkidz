// The Track view (v2): the assembled train (loco + cars) rides the painted oval
// COUPLED — every vehicle sits half of each neighbour's on-screen length behind
// the one in front, so a four-car song reads as one train and not as four wagons
// that lost each other. Smoke puffs from the loco while moving; cars bounce.
//
// GAME FEEL (`design/GAME_FEEL.md`) — the rules this scene is held to, because
// "correctly positioned" was never the same thing as "lives in the scene":
//   Law 1  one pixel grid. `WORLD_PIXEL_SCALE` is the base size of every world
//          sprite; the plate's perspective multiplies it (see `depthScaleAt`,
//          which AR-033 will retire).
//   Law 2  every vehicle stands on a contact shadow (interim, pending AR-032).
//   Law 4  the bob's phase comes from distance travelled, not from `time.now`.
//   Law 5  bob and smoke ramp in and out (`TrainMotion.energy`).
//   Law 6  smoke is emitted per unit of DISTANCE, never on a timer.
//   Law 7  world sprites are positioned on whole pixels.
// Law 3 (passing behind scenery) is blocked on AR-030: the plate is one baked
// image, so there is nothing in the scene for a train to go behind yet.
//
// AND THE THING UNDERNEATH ALL OF IT: a vehicle is anchored at the point where
// its WHEELS meet the rail (`car-geometry.ts`), not at the centre of its atlas
// cell. Centre-anchoring is why the train sat beside the painted track rather
// than on it, and it gets worse the more the perspective scales the sprite.
//
// Cars + loco are drawn from the directional spritesheet atlas (sprite-assets.ts):
// each frame is one of 8 compass directions, picked every frame from the path
// tangent so the sprite always faces the way it's travelling.
//
// Audio stays transport-driven (gapless, the BeepBox trait): React feeds
// `setProgress(0..1)` from the live transport each frame. Which bar is sounding
// is shown by the HIGHLIGHT (glow + bounce on the sounding car), derived from
// that same progress — see `placeTrain`. Direction + speed are visual / tempo
// controls owned by React.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import {
  loadSpriteAssets,
  registerAnimations,
  frameKey,
  velocityToDirection,
  FRAME_SIZE,
  type Direction,
  type TrainType,
} from "../sprite-assets.ts";
import { decorateMovingCar } from "../car-livery.ts";
import { TRACK_LAYOUT_V2 } from "../scene-layout.ts";
import { alignCarBody, carBodySize, CAR_CONTENT_E } from "../car-geometry.ts";
import { couplingOffsets, popScale, popHop, HOP_HEIGHT_PX } from "../train-chain.ts";
import {
  advanceMotion,
  bobOffset,
  motionIntensity,
  puffsDue,
  reseatMotion,
  MOTION_AT_REST,
  SMOKE_PIXEL_SCALE,
  WORLD_PIXEL_SCALE,
  type TrainMotion,
} from "../train-motion.ts";
import {
  shadowPixels,
  shadowSpecFor,
  ALL_SHADOW_SPECS,
  SHADOW_ALPHA,
} from "../pixel-shadow.ts";
import { parseTiledLayer, parseTiledPath, type TiledSpawn } from "../TiledParser.ts";
import { placeSpawn } from "../TiledSceneAdapter.ts";
import { loadUiSprites } from "../ui-sprites.ts";
import { spawnUiLayer, relayoutUiLayer, type UiElement } from "../ui-scene.ts";
import { SendSongPanel, type SendUiState } from "../send-panel.ts";
import { SceneVisualizer } from "../scene-visualizer.ts";
import { VISUAL_STYLES } from "../../visualizer/styles.ts";
import trackMap from "../../assets/maps/track.json";
import type { CarType, Project } from "../../core/types.ts";
import type { LaneGroup } from "../../core/lane-color.ts";

export interface TrackCar {
  readonly id: string;
  /** Livery index + carried family — the same two identity channels the Yard
   *  draws, derived in React from the project (`core/car-identity.ts`). The
   *  Track deliberately skips the Yard's name chip: a text plate under every
   *  car on a moving oval is clutter, and the load, the livery panel and the
   *  silhouette carry it without one. */
  readonly livery: number;
  readonly cargo: LaneGroup | null;
  readonly carType: CarType;
  readonly muted: boolean;
}

// Depth band the train tokens draw in (y-sorted within it, under the chrome).
const TRAIN_DEPTH = 4;
// Contact shadows ride under every vehicle and over the sounding-car lamp — the
// car blocks the lamp's light, which is the whole point of a shadow.
const SHADOW_DEPTH = TRAIN_DEPTH - 0.25;
// Smoke draws in FRONT of the train (and of the jumbotron), under the signal.
const SMOKE_DEPTH = TRAIN_DEPTH + 1.5;
// The plate lights everything from the upper left, so shade falls to the right.
// In unscaled cell px; the perspective scales it with everything else.
const SHADOW_DX = 2;
// The ride path traces the CENTRELINE between the two painted rails, but every
// vehicle frame is drawn from the side, showing the near-side wheels — so the
// line those wheels stand on is the NEAR rail, half a gauge below it on screen.
// In unscaled cell px (× the perspective scale): ~33 px at the bottom of the
// oval, where the painted gauge is 72, and ~7 at the top, where it is 10.
const RAIL_DROP = 15;
// The sounding-car glow rides just under the train band, so it reads as light
// on the ground beneath the car rather than a sticker on top of it.
const GLOW_DEPTH = TRAIN_DEPTH - 0.5;
// Warm lamp yellow. Deliberately drawn BESIDE the sprite, never `setTint`:
// tint is a multiply blend and this atlas's art is dark brown, so every tint
// came out indistinguishable (measured).
const GLOW_COLOR = 0xffc93c;
// The jumbotron stands in the middle of the oval, so the train rides IN FRONT
// of it — above the painted plate, below every vehicle.
const VIZ_DEPTH = 2;

export class TrackScene extends BackgroundScene {
  static readonly KEY = "TrackScene";

  private path!: Phaser.Curves.Path;
  // Vertical extent of the ride path: y-sorts the train within its depth band,
  // and drives the plate's perspective (`farScale`→`nearScale`, authored on the
  // `track-path` Tiled object). See `depthScaleAt`.
  private pathYMin = 0;
  private pathYMax = 1;
  private farScale = 1;
  private nearScale = 1;
  private loco!: Phaser.GameObjects.Container;
  private signal?: Phaser.GameObjects.Sprite;
  private cars: TrackCar[] = [];
  private carTokens: Phaser.GameObjects.Container[] = [];
  private progress = 0;
  private direction: 1 | -1 = 1;
  private moving = false;
  private lastSignalBar = -1;
  // Which car the bounce is currently on, and when it started. Coupled cars no
  // longer encode the bar in their POSITION, so the bar is shown directly: a
  // glow under the sounding car plus a pop on every bar change.
  private popBar = -1;
  private popStartedAt = -1;
  private glow?: Phaser.GameObjects.Ellipse;
  // Motion state: distance travelled, smoothed speed, and the 0..1 ramp every
  // piece of secondary motion is multiplied by. Advanced once per frame from
  // the transport-fed `progress` — the train still owns no clock of its own
  // (PROJECT_CHARTER §2.5); this only measures the one it is given.
  private motion: TrainMotion = MOTION_AT_REST;
  /** Timestamp of the previous `update`, so the frame gap is measured and not
   *  taken from Phaser's smoothed `delta`. -1 until the first frame. */
  private lastUpdateAt = -1;
  // Distance since the last stack puff, in px. Smoke is emitted per unit of
  // distance travelled, the way a stack puffs per wheel revolution.
  private smokeDebt = 0;
  // One contact shadow per vehicle, index-aligned with `[loco, ...carTokens]`.
  private shadows: Phaser.GameObjects.Image[] = [];
  // Scratch vectors — `getPoint`/`getTangent` allocate a Vector2 per call
  // otherwise, and both run once per vehicle per frame.
  private readonly scratchPoint = new Phaser.Math.Vector2();
  private readonly scratchTangent = new Phaser.Math.Vector2();
  // Unit heading of the loco, kept so smoke drifts back along the train.
  private readonly locoHeading = new Phaser.Math.Vector2(1, 0);
  // Data-driven static chrome (track.json): nav plaques + the sprite transport
  // bar (SLOW/STOP/RIDE/FAST) placed on the base plate's painted panel frame.
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chrome: UiElement[] = [];
  // SPEED LCD: dark-plum text on a cream chip, anchored to the `lcd-transport`
  // Tiled display object (same treatment as the Workshop's SONG/TEMPO LCD).
  private lcdChip?: Phaser.GameObjects.Graphics;
  private tempoText?: Phaser.GameObjects.Text;
  private tempoBpm = 120;
  /** Transient "HILL"/"BRIDGE"/"RAIN" acknowledgement over the oval. */
  private terrainToast?: Phaser.GameObjects.Text | undefined;
  private lcdRect?: { width: number; height: number };
  // SEND flow: a plaque in the header (same cream-chip treatment as the LCD,
  // anchored to the `btn-send` Tiled display object) + the result panel. State
  // is pushed in by React (`setSendState`); taps emit `track-send*` intents.
  private sendChip?: Phaser.GameObjects.Graphics;
  private sendText?: Phaser.GameObjects.Text;
  private sendHit?: Phaser.GameObjects.Rectangle;
  private sendPulse?: Phaser.Tweens.Tween | undefined;
  private sendPanel?: SendSongPanel;
  private sendState: SendUiState = { kind: "idle" };
  // "See the sound": the jumbotron in the middle of the oval. Constructed only
  // once React hands over the master-output tap (`attachVisualizer`), because
  // the analyser belongs to the audio port and the scene must not reach for it.
  private geometrySpawns: readonly TiledSpawn[] = [];
  private viz?: SceneVisualizer;

  constructor() {
    super(TrackScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.track);
    // train / smoke / signal / tarp atlases (the single source of truth).
    loadSpriteAssets(this);
    this.chromeSpawns = parseTiledLayer(trackMap, "ui-layer");
    this.geometrySpawns = parseTiledLayer(trackMap, "geometry-layer");
    loadUiSprites(this); // the one packed chrome multiatlas
  }

  create(): void {
    this.addBackground("contain");
    registerAnimations(this);
    this.buildShadowTextures();
    this.layoutPath();
    // The "this car is sounding" lamp, under the train band. Sized + moved onto
    // the sounding car every frame by `placeTrain`.
    this.glow = this.add
      .ellipse(0, 0, 10, 10, GLOW_COLOR, 1)
      .setDepth(GLOW_DEPTH)
      .setVisible(false);
    this.loco = this.makeLoco();
    this.signal = this.add
      .sprite(0, 0, "signal", "signal-up")
      .setOrigin(0.5, 1)
      .setDepth(7);
    // NOTE: smoke used to puff here on a `time.addEvent` interval — the same
    // 800 ms whether the train was crawling or flat out, and (until `puffSmoke`
    // checked) whether it was moving at all. It is emitted per unit of distance
    // travelled now; see `advanceRide`.
    this.buildChrome();
    this.layoutFixtures();
    this.rebuildCars();
    // Dev-only seam for the scene editor (`?edit`). `editorHandle` is typed
    // `unknown` on BackgroundScene, so this scene still imports nothing from
    // `src/editor/` — the dependency arrow points one way only, and the whole
    // branch is compile-time dead in a production build.
    if (import.meta.env.DEV) {
      this.editorHandle = {
        mapName: "track",
        layerName: "ui-layer",
        spawns: this.chromeSpawns,
        relayout: () => this.layoutChrome(),
        backgroundRect: () => this.backgroundRect,
        cameraSize: () => this.scale.gameSize,
      };
    }
    this.announceReady();
  }

  // ── data-driven chrome (nav plaques + sprite transport bar + SPEED LCD) ─────
  // The clean base plate paints an EMPTY panel frame at the bottom; every button
  // is a real sprite spawned by the generic Three-Zone engine from track.json.
  private buildChrome(): void {
    this.chrome = spawnUiLayer(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      panelDepth: 1,
      hitDepth: 10,
    });
    this.lcdChip = this.add.graphics().setDepth(9);
    this.tempoText = this.add
      .text(0, 0, "", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#2b2440",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setDepth(11);

    // SEND plaque: cream chip + plum text, the header's chip language. During
    // a take it flips to a pulsing ● REC readout — the train riding the oval
    // IS the progress indicator, so no modal covers the scene while recording.
    this.sendChip = this.add.graphics().setDepth(9);
    this.sendText = this.add
      .text(0, 0, "", { fontFamily: "'Press Start 2P', monospace", color: "#2b2440", letterSpacing: 2 })
      .setOrigin(0.5)
      .setDepth(11);
    this.sendHit = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setDepth(12);
    this.sendHit.setInteractive({ useHandCursor: true });
    let armed = false;
    this.sendHit.on("pointerdown", () => {
      if (this.sendState.kind !== "idle") return;
      armed = true;
      this.sendText?.setScale(0.94);
    });
    const restore = (): void => this.sendText?.setScale(1) as unknown as void;
    this.sendHit.on("pointerout", () => { armed = false; restore(); });
    this.sendHit.on("pointerup", () => {
      restore();
      if (!armed) return;
      armed = false;
      if (this.sendState.kind === "idle") EventBus.emit("track-send");
    });

    this.sendPanel = new SendSongPanel(this);
  }

  /**
   * React → scene: hand over the master-output analyser and a Project reader,
   * which is what lets the jumbotron exist. Idempotent — React calls it from
   * `onSceneReady`, which fires once per visit.
   *
   * The analyser arrives as an argument rather than being fetched here on
   * purpose: `SoundPort` is React's to own, and a scene that reached for it
   * would put a vendor audio dependency behind the EventBus boundary.
   */
  attachVisualizer(analyser: AnalyserNode, getProject: () => Project): void {
    if (this.viz) return;
    const viz = new SceneVisualizer(this, {
      analyser,
      getProject,
      styles: VISUAL_STYLES,
      depth: VIZ_DEPTH,
    });
    this.viz = viz;
    // Tap the screen to change the look. Same armed press/release rule as the
    // rest of the scene, so a pointerup that started elsewhere cannot cycle it.
    let armed = false;
    viz.hitTarget.on("pointerdown", () => { armed = true; });
    viz.hitTarget.on("pointerout", () => { armed = false; });
    viz.hitTarget.on("pointerup", () => {
      if (!armed) return;
      armed = false;
      viz.cycleStyle();
    });
    this.layoutViz();
  }

  /** Exposed for the e2e bridge: what the jumbotron is showing, and how visible
   *  it is. Visibility is driven by REAL master-output level, so asserting it
   *  rose while a song played proves the screen is fed by audio, not by a flag. */
  get vizState(): { style: string; visibility: number } | null {
    return this.viz ? { style: this.viz.styleLabel, visibility: this.viz.visibility } : null;
  }

  private layoutViz(): void {
    const r = this.backgroundRect;
    if (!this.viz || r.width === 0) return;
    const spawn = this.geometrySpawns.find((s) => s.id === "viz-screen");
    if (!spawn) return;
    const { width, height } = this.scale.gameSize;
    this.viz.layout(placeSpawn(spawn, r, { width, height }));
  }

  /** React → scene: the SEND flow's current state (drives plaque + panel). */
  setSendState(state: SendUiState): void {
    this.sendState = state;
    if (this.ready) this.refreshSend();
  }

  /** Exposed for the e2e bridge: what the SEND UI currently shows. */
  get sendUiState(): SendUiState {
    return this.sendState;
  }

  private refreshSend(): void {
    if (!this.sendChip || !this.sendText) return;
    const recording = this.sendState.kind === "recording";
    // Plain caps only: the chip renders in Press Start 2P, which has no emoji
    // glyphs (a 📮 came out as tofu boxes on some platforms).
    this.sendText.setText(recording ? "● REC" : "SEND");
    this.sendText.setColor(recording ? "#b03050" : "#2b2440");
    this.sendPulse?.remove();
    this.sendPulse = undefined;
    this.sendText.setAlpha(1);
    if (recording) {
      this.sendPulse = this.tweens.add({
        targets: this.sendText,
        alpha: { from: 1, to: 0.35 },
        yoyo: true,
        repeat: -1,
        duration: 450,
      });
    }
    const { width, height } = this.scale.gameSize;
    this.sendPanel?.setUiState(this.sendState);
    this.sendPanel?.layout(width, height);
  }

  // Re-anchor the chrome sprites + the LCD (chip + text) after the bg refits.
  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const { width, height } = this.scale.gameSize;
    relayoutUiLayer(this.chrome, r, { width, height });

    const send = this.chromeSpawns.find((s) => s.id === "btn-send");
    if (send && this.sendChip && this.sendText && this.sendHit) {
      const p = placeSpawn(send, r, { width, height });
      const rad = Math.min(p.height * 0.28, 18);
      this.sendChip
        .clear()
        .fillStyle(0xe9d7ac, 1)
        .fillRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, rad)
        .lineStyle(Math.max(2, p.height * 0.04), 0x2b2440, 1)
        .strokeRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, rad);
      this.sendText.setPosition(p.x, p.y);
      const fs = Math.max(10, Math.round(p.height * 0.32));
      this.sendText.setFontSize(fs);
      this.sendHit.setPosition(p.x, p.y).setSize(p.width * 1.15, p.height * 1.3);
      this.refreshSend();
      this.sendPanel?.layout(width, height);
    }

    const lcd = this.chromeSpawns.find((s) => s.id === "lcd-transport");
    if (lcd && this.tempoText && this.lcdChip) {
      const p = placeSpawn(lcd, r, { width, height });
      const rad = Math.min(p.height * 0.28, 18);
      this.lcdChip
        .clear()
        .fillStyle(0xe9d7ac, 1)
        .fillRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, rad)
        .lineStyle(Math.max(2, p.height * 0.04), 0x2b2440, 1)
        .strokeRoundedRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height, rad);
      this.tempoText.setPosition(p.x, p.y);
      this.lcdRect = { width: p.width, height: p.height };
      this.refreshLcd();
    }
  }

  /** React → scene: acknowledge a terrain pick THE INSTANT it is tapped.
   *
   *  The sound itself lands on the next bar, which is deliberate — but a gap
   *  between a tap and any response is exactly how a four-year-old learns that
   *  a button does nothing. This closes it: the tap answers now, the music
   *  answers on the beat. (GAME_FEEL Law 8.) */
  showTerrain(kind: string): void {
    if (!this.ready) return;
    this.terrainToast?.destroy();
    const r = this.backgroundRect;
    const toast = this.add
      .text(r.centerX, r.y + r.height * 0.26, kind.toUpperCase(), {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
        stroke: "#2b2440",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setFontSize(Math.max(14, Math.round(r.height * 0.055)));
    this.terrainToast = toast;
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - r.height * 0.06,
      duration: 1400,
      ease: "Quad.easeIn",
      onComplete: () => {
        toast.destroy();
        if (this.terrainToast === toast) this.terrainToast = undefined;
      },
    });
  }

  /** React → scene: the song tempo shown on the SPEED LCD. */
  setTempo(bpm: number): void {
    this.tempoBpm = bpm;
    if (this.ready) this.refreshLcd();
  }

  private refreshLcd(): void {
    if (!this.tempoText || !this.lcdRect) return;
    this.tempoText.setText(`SPEED ${Math.round(this.tempoBpm)}`);
    // Fit the readout inside the chip (shrink long text; never overflow).
    const fs = Math.max(10, Math.round(this.lcdRect.height * 0.32));
    this.tempoText.setFontSize(fs);
    const maxW = this.lcdRect.width * 0.86;
    if (this.tempoText.width > maxW) {
      this.tempoText.setFontSize(Math.max(8, Math.floor((fs * maxW) / this.tempoText.width)));
    }
  }

  /** React → scene: the cars to draw (one per train slot, in order). */
  setCars(cars: TrackCar[]): void {
    this.cars = cars;
    if (this.ready) this.rebuildCars();
  }

  /** React → scene: playback head position around the loop, 0..1 (transport). */
  setProgress(t: number): void {
    this.progress = ((t % 1) + 1) % 1;
  }

  /** React → scene: ride direction (visual). 1 = forward, -1 = reverse. */
  setDirection(dir: 1 | -1): void {
    this.direction = dir;
  }

  /** React → scene: whether the train is moving (drives smoke + bounce). */
  setMoving(moving: boolean): void {
    if (this.moving === moving) return;
    this.moving = moving;
    // Re-seat the sampler on the current position. Without this, the first
    // frame after a start reads the whole gap since the last sample as one
    // enormous step and fires a burst of smoke.
    this.motion = reseatMotion(this.motion, this.progress);
    if (!moving) this.lastSignalBar = -1;
  }

  update(time: number, delta: number): void {
    // The jumbotron follows the master output, not the train, so it runs before
    // (and independently of) the ride-path work below. It eases on the real
    // frame delta, so its timings are the same at 27 fps (a headless CI frame
    // rate) as at 120 Hz.
    this.viz?.update(delta);
    // …but the ride measures the gap ITSELF rather than trusting `delta`.
    // Phaser's TimeStep smooths and clamps the delta it hands out, and on a slow
    // frame that makes it several times SMALLER than the real gap — which turned
    // "distance moved ÷ delta" into a speed four times too high (measured at
    // 14 fps headless). Speed drives the bob and the smoke, so it has to be true
    // at any frame rate.
    const dt = this.lastUpdateAt < 0 ? delta : time - this.lastUpdateAt;
    this.lastUpdateAt = time;
    this.advanceRide(dt);
    this.placeTrain();
  }

  /**
   * Measure the ride: how far the train moved this frame, how fast it is going,
   * and how much smoke that owes.
   *
   * This is the whole of Law 4 in one place — nothing downstream reads a clock.
   * `advanceMotion` refuses to integrate a step bigger than a quarter-lap, so a
   * scrub, a scene rebuild or a backgrounded tab cannot spin the wheels.
   */
  private advanceRide(dtMs: number): void {
    if (!this.path) return;
    const before = this.motion.travelled;
    this.motion = advanceMotion(this.motion, {
      progress: this.progress,
      pathLength: this.path.getLength() || 1,
      dtMs,
      moving: this.moving,
    });
    this.smokeDebt += this.motion.travelled - before;
    const { puffs, debt } = puffsDue(this.smokeDebt);
    this.smokeDebt = debt;
    for (let i = 0; i < puffs; i++) this.puffSmoke();
  }

  /** Exposed for the e2e bridge: the measured ride, so a test can assert that
   *  the animation really is a function of movement (and stops when it does). */
  get rideMotion(): TrainMotion {
    return this.motion;
  }

  /** Position the loco + cars along the path for the current progress. Split
   *  out of `update` so `rebuildCars` can re-place immediately without having a
   *  frame delta to hand — it has no business advancing the visualizer. */
  private placeTrain(): void {
    if (!this.path || !this.loco) return;
    const dir = this.direction;
    const len = this.path.getLength() || 1;

    // COUPLED spacing. Every gap is an arc length over the path length — the
    // model the loco always used, now generalised to the whole consist by
    // `couplingOffsets`. A vehicle's length is its atlas cell at the size it is
    // drawn, so the coupling adapts to perspective with no hardcoded arc; the
    // frame's ~8% transparent padding is the coupler.
    //
    // Solved TWICE. The first pass sizes each vehicle where it is standing NOW,
    // which is a frame behind and — under this plate's steep perspective — wrong
    // by up to 18% on the far side, where a gap of that size is a visibly
    // uncoupled train. The second pass re-sizes each vehicle where the first
    // pass says it will BE and re-solves, which converges immediately because
    // the scale field is smooth. (With a flat plate — AR-033 — both passes give
    // the same answer and this costs one extra path sample per vehicle.)
    //
    // Car 0 is still the phase reference: at progress 0 it is parked ON the
    // crossing signal, and the consist trails behind it. What position NO
    // LONGER encodes is which bar is sounding — spacing is a function of car
    // size now, not of song length. That readout moved to the highlight below,
    // which is derived from the same `progress`, so the visual is still
    // rendered FROM the transport and never the reverse (PROJECT_CHARTER §2.5).
    //
    // The old model spaced car i at `i / carCount` of the WHOLE LAP, so a
    // four-bar song sat its cars a quarter-lap apart and the train read as four
    // wagons that had lost each other.
    const consist = [this.loco, ...this.carTokens];
    // Anchor on car 0 when there is one; on the loco alone when there is not.
    const anchor = this.carTokens.length > 0 ? 1 : 0;
    const uFor = (offset: number): number =>
      TRACK_LAYOUT_V2.parkAngle + dir * (this.progress - offset / len);
    let offsets = couplingOffsets(consist.map((t) => this.coupledLen(t)), len, anchor);
    offsets = couplingOffsets(
      consist.map((t, i) => {
        const body = t.getData("body") as Phaser.GameObjects.Image | undefined;
        if (!body) return 0;
        const u = uFor(offsets[i] ?? 0);
        const p = this.path.getPoint(((u % 1) + 1) % 1, this.scratchPoint);
        return body.width * this.worldScaleAt(p ? p.y : this.pathYMax);
      }),
      len,
      anchor,
    );
    const uAt = (i: number): number => uFor(offsets[i] ?? 0);

    // Bar change first, so the bounce and the signal fire on the SAME frame the
    // bar turns over rather than one frame late.
    //
    // The BOUNCE is not gated on `moving`: it answers the question "which car
    // just became the sounding one", which is true of a parked train too (and
    // of one whose consist just changed under it). The crossing SIGNAL is
    // gated — a level crossing that flashes at a stopped train is a lie.
    const bar = this.soundingBar();
    if (bar !== this.popBar) {
      this.popBar = bar;
      this.popStartedAt = this.time.now;
    }
    if (this.moving && bar !== this.lastSignalBar) {
      this.lastSignalBar = bar;
      this.flashSignal();
    }

    this.cars.forEach((car, i) => {
      const token = this.carTokens[i];
      if (!token) return;
      // The sounding car HOPS; every other car rides flat. (It used to grow by
      // up to 1.3×, which was the last fractional scale left on a world sprite
      // — see `popHop`.)
      const hop = i === bar ? popHop(this.time.now - this.popStartedAt) : 0;
      this.placeVehicle(token, uAt(i + 1), i + 1, dir, car.carType, hop);
    });
    this.placeVehicle(this.loco, uAt(0), 0, dir, "loco", 0);

    this.placeGlow(bar);
  }

  /** Which car is sounding: the bar the transport is in. The ride covers one
   *  lap per song, so this is just `progress` in bar units — a pure function of
   *  the clock React feeds in, computed the same whether the train is moving or
   *  parked so the readout is never blank. */
  private soundingBar(): number {
    const n = this.carTokens.length;
    if (n === 0) return -1;
    return Math.min(n - 1, Math.floor(this.progress * n));
  }

  /** Park the lamp under the sounding car, sized to that car's live width. */
  private placeGlow(bar: number): void {
    const glow = this.glow;
    if (!glow) return;
    const token = bar >= 0 ? this.carTokens[bar] : undefined;
    if (!token) {
      glow.setVisible(false);
      return;
    }
    const w = this.coupledLen(token);
    if (w <= 0) {
      glow.setVisible(false);
      return;
    }
    // A pool of light wider than the car and much flatter, so it reads as light
    // on the ground in the oval's perspective rather than a halo — with a bright
    // rim, which is what makes it look deliberate instead of like a smudge. A
    // first pass at 0.19 effective alpha was measured on a screenshot as barely
    // distinguishable from the painted grass; this is the fix.
    // Sized just under the atlas cell, which is about the car's visible body:
    // at 1.35 the pool was half again as wide as the car and read as a patch of
    // sand on the ballast rather than as light under a vehicle.
    glow.setSize(w * 0.98, w * 0.42);
    glow.setStrokeStyle(Math.max(2, w * 0.035), 0xfffbe6, 0.95);
    // The token's origin is its wheels, so the pool of light goes there — it
    // used to be offset down from the car's centre to reach the ground.
    glow.setPosition(token.x, token.y);
    // Breathe with the pop so the beat is felt as well as seen.
    const beat = popScale(this.time.now - this.popStartedAt, 260, 0.35);
    glow.setScale(beat);
    glow.setAlpha(0.55 + (beat - 1));
    glow.setVisible(true);
  }

  /** Exposed for the e2e bridge: which car the ride says is sounding, and
   *  whether the lamp under it is actually lit. */
  get rideHighlight(): { bar: number; visible: boolean } {
    return { bar: this.soundingBar(), visible: this.glow?.visible === true };
  }

  protected onResize(): void {
    if (!this.path) return;
    this.layoutPath();
    this.layoutFixtures();
  }

  // ── internals ────────────────────────────────────────────────────────────

  /** Build the three contact-shadow textures (one per direction bucket) as raw
   *  dithered pixels. Idempotent: one `TextureManager` serves every scene, so a
   *  revisit must not try to re-create a key that already exists. */
  private buildShadowTextures(): void {
    for (const spec of ALL_SHADOW_SPECS) {
      if (this.textures.exists(spec.key)) continue;
      const tex = this.textures.createCanvas(spec.key, spec.width, spec.height);
      const image = tex?.imageData;
      if (!tex || !image) continue;
      image.data.set(shadowPixels(spec.width, spec.height));
      tex.putData(image, 0, 0);
      tex.refresh();
    }
  }

  /** Rebuild the ride path from the `track-path` polygon authored in
   *  track.json's geometry-layer — the track centreline traced over the
   *  painted art (64 arc-uniform vertices, clockwise from the right apex, so
   *  t=0.25 is the bottom-centre park position at the crossing signal). The
   *  path is pure Tiled data: repaint the plate, retrace the polygon, done. */
  private layoutPath(): void {
    const r = this.backgroundRect;
    const data = parseTiledPath(trackMap, "geometry-layer", "track-path");
    const pts = data.points.map((p) => ({ x: r.x + p.x * r.width, y: r.y + p.y * r.height }));
    const first = pts[0]!;
    const path = new Phaser.Curves.Path(first.x, first.y);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i]!.x, pts[i]!.y);
    if (data.closed) path.lineTo(first.x, first.y);
    this.path = path;

    this.pathYMin = Math.min(...pts.map((p) => p.y));
    this.pathYMax = Math.max(...pts.map((p) => p.y));
    this.farScale = typeof data.props["farScale"] === "number" ? data.props["farScale"] : 1;
    this.nearScale = typeof data.props["nearScale"] === "number" ? data.props["nearScale"] : 1;
  }

  /** Where a screen y sits in the ride path's vertical extent, 0 (far) → 1
   *  (near). Drives the depth sort and the perspective. */
  private depthFractionAt(y: number): number {
    const span = Math.max(1, this.pathYMax - this.pathYMin);
    return Phaser.Math.Clamp((y - this.pathYMin) / span, 0, 1);
  }

  /**
   * The plate's perspective factor at a contact y: far (top of the loop) → near.
   *
   * THIS IS INTERIM AND IT IS MEANT TO GO. `track-scene-clean-v2.png` is drawn
   * in one-point perspective — the painted track really is ~3.7× bigger at the
   * bottom of the oval than at the top, measured off its sleeper pitch — and it
   * is the only one of the four plates that is: the Map and the Yard are both
   * flat oblique top-down, and the Map even contains an oval of track whose far
   * and near sides are the same size. **AR-033 redraws this plate with no
   * perspective.** When it lands, set `farScale` and `nearScale` both to 1.0 in
   * `track.json` and every world sprite draws at one flat `WORLD_PIXEL_SCALE`;
   * this function returns a constant and can then be deleted outright. Nothing
   * else in the scene needs to change — that is deliberate.
   *
   * The shipped values (0.25 → 1.10) were calibrated by compositing a car onto
   * the plate at the far and near extremes and picking the size whose wheels sat
   * on the painted rails. The values they replaced (0.9 → 1.06) claimed an 18%
   * swing against the plate's real 370%, which is why the train looked like it
   * was floating beside the track on the far side.
   */
  private depthScaleAt(y: number): number {
    if (this.farScale === this.nearScale) return this.nearScale;
    return this.farScale + (this.nearScale - this.farScale) * this.depthFractionAt(y);
  }

  /** What a world sprite standing at contact y is drawn at. */
  private worldScaleAt(y: number): number {
    return WORLD_PIXEL_SCALE * this.depthScaleAt(y);
  }

  private layoutFixtures(): void {
    this.layoutChrome();
    this.layoutViz();
    const r = this.backgroundRect;
    if (this.signal) {
      const targetW = r.width * TRACK_LAYOUT_V2.signal.w;
      if (this.signal.width > 0) this.signal.setScale(targetW / this.signal.width);
      this.signal.setPosition(
        r.x + r.width * TRACK_LAYOUT_V2.signal.x,
        r.y + r.height * TRACK_LAYOUT_V2.signal.y,
      );
    }
  }

  /** A vehicle's current on-screen length along the track (atlas frame width
   *  at its live scale — the frame's transparent padding doubles as coupler).
   *
   *  Every vehicle is drawn at `WORLD_PIXEL_SCALE` and the frame loop never
   *  changes that, so this is a constant per token now. It stays a live read so
   *  that the day the atlas gains a second (FAR) tier, the couplings follow the
   *  art instead of a hardcoded arc. */
  private coupledLen(token: Phaser.GameObjects.Container): number {
    const body = token.getData("body") as Phaser.GameObjects.Image | undefined;
    return body ? body.width * token.scaleX : 0;
  }

  /**
   * Put one vehicle on the path: position, facing, size, depth, bob, hop — and
   * its shadow. One method rather than the `placeOnPath` + `faceAlongPath` pair
   * it replaces, because the shadow needs the ground point AND the facing.
   *
   * The token's origin is its WHEELS (`alignCarBody`), so the path point is the
   * contact point: the vehicle grows and shrinks about the rail instead of
   * about its own middle, which is what keeps it on the track as the plate's
   * perspective scales it.
   *
   * `Path.getTangent` walks the same arc-length table `getPoint` does and
   * returns the segment's unit tangent directly — one curve sample instead of a
   * two-point finite difference, and with no `eps` to get wrong near a vertex.
   */
  private placeVehicle(
    token: Phaser.GameObjects.Container,
    t: number,
    index: number,
    dir: 1 | -1,
    type: TrainType,
    hopPx: number,
  ): void {
    const u = ((t % 1) + 1) % 1;
    const p = this.path.getPoint(u, this.scratchPoint);
    if (!p) return;
    const body = token.getData("body") as Phaser.GameObjects.Image | undefined;
    // Tangent for increasing u; flip for reverse so the sprite faces its travel.
    const tan = this.path.getTangent(u, this.scratchTangent);
    const facing: Direction = tan ? velocityToDirection(tan.x * dir, tan.y * dir) : "E";
    body?.setFrame(frameKey(type, facing));
    // Remember which way the head of the train is pointing, so smoke can drift
    // BACK over the train instead of along a fixed screen axis.
    if (index === 0 && tan) this.locoHeading.set(tan.x * dir, tan.y * dir);

    const scale = this.worldScaleAt(p.y);
    token.setScale(scale);
    // Law 4: the bob's phase is distance travelled, so it speeds up with the
    // train and stops with it. Law 7: whole pixels, or the art shimmers between
    // frames. The coupling arithmetic upstream stays in floats — only the draw
    // is snapped. Both bob and hop scale with the perspective, or a far-side
    // car bounces four times its own height.
    const bob = bobOffset(this.motion, index) * scale;
    const lift = hopPx * scale - bob;
    const ground = p.y + RAIL_DROP * scale;
    token.setPosition(Math.round(p.x), Math.round(ground - lift));
    // Y-sort within the train's depth band: nearer vehicles draw over farther
    // ones. Normalised across the path's own vertical extent, so the whole band
    // is used whatever the plate's geometry. This ordering is ALL that is left
    // of the old perspective treatment, and it is the half that was never the
    // problem.
    token.setDepth(TRAIN_DEPTH + this.depthFractionAt(p.y));
    // Both readable from the e2e bridge: "the bob is a function of movement"
    // and "the sounding car hops" are claims a test should be able to check.
    token.setData("hop", hopPx);
    token.setData("bob", bob);
    this.placeShadow(index, p.x, ground, facing, scale, Math.max(0, lift / scale));
  }

  /** Park a vehicle's contact shadow on the ground under it (Law 2).
   *
   *  The token's origin is already the contact point, so the shadow goes right
   *  there — and it STAYS there while the vehicle bobs and hops above it, which
   *  is the whole reason a shadow reads as contact. It tightens and fades as the
   *  vehicle lifts. */
  private placeShadow(
    index: number,
    groundX: number,
    groundY: number,
    facing: Direction,
    scale: number,
    liftCellPx: number,
  ): void {
    const shadow = this.shadows[index];
    if (!shadow) return;
    const spec = shadowSpecFor(facing);
    if (shadow.texture.key !== spec.key) shadow.setTexture(spec.key);
    shadow.setPosition(Math.round(groundX + SHADOW_DX * scale), Math.round(groundY));
    const t = Math.min(1, Math.max(0, liftCellPx / HOP_HEIGHT_PX));
    shadow.setScale(scale * (1 - 0.12 * t));
    shadow.setAlpha(SHADOW_ALPHA * (1 - 0.35 * t));
  }

  /** One puff from the stack. Called by `advanceRide` per unit of DISTANCE
   *  travelled (Law 6), never on a timer, so a stopped train stops smoking and
   *  a fast one smokes harder. The puff drifts back over the tender as it
   *  dissipates — its own dissipation is genuinely time-based, which is fine:
   *  Law 4 is about cycles that must stay in step with movement. */
  private puffSmoke(): void {
    if (!this.moving || !this.loco) return;
    const intensity = motionIntensity(this.motion);
    // The loco's origin is its wheels, so the stack is one body-height up.
    const scale = this.loco.scaleX || WORLD_PIXEL_SCALE;
    const stack = carBodySize("loco").h * scale * 0.95;
    const puff = this.add
      .sprite(this.loco.x, this.loco.y - stack, "smoke", "smoke-1")
      .setScale(SMOKE_PIXEL_SCALE * scale)
      .setDepth(SMOKE_DEPTH)
      .setAlpha(0.45 + 0.4 * intensity);
    puff.play("smoke");
    const drift = (20 + 34 * intensity) * scale;
    this.tweens.add({
      targets: puff,
      x: puff.x - this.locoHeading.x * drift,
      y: puff.y - this.locoHeading.y * drift - (12 + 20 * intensity) * scale,
      alpha: 0,
      duration: 520,
      onComplete: () => puff.destroy(),
    });
  }

  private flashSignal(): void {
    if (!this.signal) return;
    this.signal.setFrame("signal-down");
    this.tweens.killTweensOf(this.signal);
    this.signal.setAlpha(1);
    this.tweens.add({
      targets: this.signal,
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      duration: 150,
      onComplete: () => {
        this.signal?.setFrame("signal-up");
        this.signal?.setAlpha(1);
      },
    });
  }

  private rebuildCars(): void {
    this.carTokens.forEach((c) => c.destroy());
    this.carTokens = this.cars.map((car) => this.makeCar(car));
    // One shadow per vehicle, index-aligned with `[loco, ...carTokens]`. Built
    // here rather than with each token because the loco outlives every rebuild.
    this.shadows.forEach((s) => s.destroy());
    this.shadows = [this.loco, ...this.carTokens].map(() =>
      this.add
        .image(0, 0, ALL_SHADOW_SPECS[0]!.key)
        .setOrigin(0.5)
        .setScale(WORLD_PIXEL_SCALE)
        .setDepth(SHADOW_DEPTH)
        .setAlpha(SHADOW_ALPHA),
    );
    this.placeTrain();
  }

  /** A car: directional atlas body; overlay a tarp frame when muted. Tapping
   *  the car toggles its tarp (mute) — the kid covers/uncovers the load.
   *
   *  `alignCarBody` moves the body inside the container so the container's
   *  origin is where the wheels meet the rail. The tarp shares the atlas's
   *  128×128 cell and is offset the same way, so it stays over the load — it
   *  used to be `setDisplaySize(body.width * 1.05, …)`, a 5% overhang that drew
   *  the muted car fractionally larger than the car underneath it. */
  private makeCar(car: TrackCar): Phaser.GameObjects.Container {
    const body = this.add.image(0, 0, "train", frameKey(car.carType, "E")).setOrigin(0.5);
    alignCarBody(body, CAR_CONTENT_E[car.carType]);
    const children: Phaser.GameObjects.GameObject[] = [body];
    // Identity rides BETWEEN the body and the tarp: a tarped car is covered, so
    // its load and livery are covered too, which is the truth the tarp states.
    children.push(
      ...decorateMovingCar(this, FRAME_SIZE, car.livery, car.cargo, car.livery + 1),
    );
    if (car.muted) {
      const tarp = this.add.image(0, 0, "tarp", "tarp").setOrigin(0.5);
      tarp.setPosition(body.x, body.y);
      children.push(tarp);
    }
    const c = this.add.container(0, 0, children);
    c.setData("body", body);
    c.setDepth(TRAIN_DEPTH);
    // Kid-sized hit area (1.6× the body) around the moving car, over where the
    // art actually is. Same armed press/release rule as the chrome so nothing
    // leaks a stray pointerup.
    const hit = new Phaser.Geom.Rectangle(
      body.x - body.width * 0.8, body.y - body.height * 0.8,
      body.width * 1.6, body.height * 1.6,
    );
    c.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    if (c.input) c.input.cursor = "pointer";
    let armed = false;
    c.on("pointerdown", () => { armed = true; });
    c.on("pointerout", () => { armed = false; });
    c.on("pointerup", () => {
      if (!armed) return;
      armed = false;
      EventBus.emit("track-car-mute-toggled", car.id);
    });
    return c;
  }

  /** The loco. Drawn at the same scale as every car: it used to be 0.11 of the
   *  plate against a car's 0.075 (~1.5× bigger), but the loco art fills its cell
   *  about as much as a boxcar does (113 px of content against 117), so the
   *  difference was pure scaling of the same-sized art. One scale for the whole
   *  consist is also the size AR-031 specifies for every vehicle type. */
  private makeLoco(): Phaser.GameObjects.Container {
    const img = this.add.image(0, 0, "train", frameKey("loco", "E")).setOrigin(0.5);
    alignCarBody(img, CAR_CONTENT_E["loco"]);
    const c = this.add.container(0, 0, [img]);
    c.setData("body", img);
    c.setDepth(TRAIN_DEPTH);
    return c;
  }
}
