// The Track view (v2): the assembled train (loco + cars) rides the painted oval.
// Each car occupies an equal arc of the oval; as the train moves, each car in
// turn passes the crossing signal at the bottom-centre straight, where it lights
// up. Smoke puffs from the loco while moving; cars bounce gently.
//
// Cars + loco are drawn from the directional spritesheet atlas (sprite-assets.ts):
// each frame is one of 8 compass directions, picked every frame from the car's
// tangent along the oval so the sprite always faces the way it's travelling.
//
// Audio stays transport-driven (gapless, the BeepBox trait): React feeds
// `setProgress(0..1)` from the live transport each frame, so the car at the
// signal is exactly the bar that's sounding. Direction + speed are visual /
// tempo controls owned by React.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import {
  loadSpriteAssets,
  registerAnimations,
  frameKey,
  velocityToDirection,
  spawnSmoke,
  type TrainType,
} from "../sprite-assets.ts";
import { TRACK_LAYOUT_V2 } from "../scene-layout.ts";
import { parseTiledLayer, parseTiledPath, type TiledSpawn } from "../TiledParser.ts";
import { placeSpawn } from "../TiledSceneAdapter.ts";
import { loadUiSprites } from "../ui-sprites.ts";
import { spawnUiLayer, relayoutUiLayer, type UiElement } from "../ui-scene.ts";
import { SendSongPanel, type SendUiState } from "../send-panel.ts";
import { SceneVisualizer } from "../scene-visualizer.ts";
import { VISUAL_STYLES } from "../../visualizer/styles.ts";
import trackMap from "../../assets/maps/track.json";
import type { CarType, Project } from "../../core/types.ts";

export interface TrackCar {
  readonly id: string;
  readonly color: string;
  readonly carType: CarType;
  readonly muted: boolean;
}

const SMOKE_INTERVAL_MS = 800;
// Depth band the train tokens draw in (y-sorted within it, under the chrome).
const TRAIN_DEPTH = 4;
// The jumbotron stands in the middle of the oval, so the train rides IN FRONT
// of it — above the painted plate, below every vehicle.
const VIZ_DEPTH = 2;

export class TrackScene extends BackgroundScene {
  static readonly KEY = "TrackScene";

  private path!: Phaser.Curves.Path;
  // Perspective: token scale interpolates farScale→nearScale across the path's
  // vertical extent (authored on the `track-path` Tiled object, tuned per plate).
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
  // Data-driven static chrome (track.json): nav plaques + the sprite transport
  // bar (SLOW/STOP/RIDE/FAST) placed on the base plate's painted panel frame.
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chrome: UiElement[] = [];
  // SPEED LCD: dark-plum text on a cream chip, anchored to the `lcd-transport`
  // Tiled display object (same treatment as the Workshop's SONG/TEMPO LCD).
  private lcdChip?: Phaser.GameObjects.Graphics;
  private tempoText?: Phaser.GameObjects.Text;
  private tempoBpm = 120;
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
    this.layoutPath();
    this.loco = this.makeLoco();
    this.signal = this.add
      .sprite(0, 0, "signal", "signal-up")
      .setOrigin(0.5, 1)
      .setDepth(7);
    // Puff smoke from the loco stack on a steady interval while the train moves.
    this.time.addEvent({
      delay: SMOKE_INTERVAL_MS,
      loop: true,
      callback: this.puffSmoke,
      callbackScope: this,
    });
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
    if (!moving) this.lastSignalBar = -1;
  }

  update(_time: number, delta: number): void {
    // The jumbotron follows the master output, not the train, so it runs before
    // (and independently of) the ride-path work below. It eases on the real
    // frame delta, so its timings are the same at 27 fps (a headless CI frame
    // rate) as at 120 Hz.
    this.viz?.update(delta);
    this.placeTrain();
  }

  /** Position the loco + cars along the path for the current progress. Split
   *  out of `update` so `rebuildCars` can re-place immediately without having a
   *  frame delta to hand — it has no business advancing the visualizer. */
  private placeTrain(): void {
    if (!this.path || !this.loco) return;
    const dir = this.direction;
    // Signal-sync spacing. The train rides exactly ONE lap per song, so one bar
    // IS one 1/n of the oval: car i must sit 1/n of the path behind car i-1, or
    // it cannot be at the crossing signal on its own bar. Car 0 is the phase
    // reference — at progress 0 (bar 0) it is parked ON the signal.
    //
    // This replaces bumper-to-bumper coupling for the cars, which read better as
    // a train but is geometrically incompatible with the invariant: a car body
    // is ~0.05 of the perimeter, so a 4-bar song's consist crossed the signal
    // inside its first bar (measured: bars 0.30 / 0.49 / 0.71 / 0.90 instead of
    // 0 / 1 / 2 / 3, with nothing at the crossing for the other 3 bars while the
    // signal kept flashing). Spacing and sync cannot both be free — the clock
    // wins, PROJECT_CHARTER.md §2.5.
    const n = Math.max(1, this.cars.length);
    this.cars.forEach((car, i) => {
      const token = this.carTokens[i];
      if (!token) return;
      const u = TRACK_LAYOUT_V2.parkAngle + dir * (this.progress - i / n);
      this.placeOnPath(token, u, i);
      this.faceAlongPath(token, u, dir, car.carType);
    });
    // The loco couples onto the head car BUMPER-TO-BUMPER — the one gap that
    // still can, because the loco sounds no bar of its own. Its distance from
    // car 0 is half of each of their on-screen coupled lengths, read from the
    // tokens' live display size (which the perspective depth-scale already
    // shrank toward the far side), so the coupling adapts to car size AND
    // perspective with no hardcoded arc; the ~8% transparent frame padding is
    // the coupler.
    const len = this.path.getLength() || 1;
    const head = this.carTokens[0];
    const gap = head ? (this.coupledLen(this.loco) / 2 + this.coupledLen(head) / 2) / len : 0;
    const headU = TRACK_LAYOUT_V2.parkAngle + dir * (this.progress + gap);
    this.placeOnPath(this.loco, headU, -1);
    this.faceAlongPath(this.loco, headU, dir, "loco");

    // Flash the crossing signal as the train passes the bottom-centre each bar.
    if (this.moving) {
      const n = Math.max(1, this.carTokens.length);
      const bar = Math.floor(this.progress * n) % n;
      if (bar !== this.lastSignalBar) {
        this.lastSignalBar = bar;
        this.flashSignal();
      }
    }
  }

  protected onResize(): void {
    if (!this.path) return;
    this.layoutPath();
    this.layoutFixtures();
  }

  // ── internals ────────────────────────────────────────────────────────────

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

  /** Perspective size factor at a screen y: far (top of the loop) → near. */
  private depthScaleAt(y: number): number {
    const span = Math.max(1, this.pathYMax - this.pathYMin);
    const t = Phaser.Math.Clamp((y - this.pathYMin) / span, 0, 1);
    return this.farScale + (this.nearScale - this.farScale) * t;
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
   *  at its live scale — the frame's transparent padding doubles as coupler). */
  private coupledLen(token: Phaser.GameObjects.Container): number {
    const body = token.getData("body") as Phaser.GameObjects.Image | undefined;
    return body ? body.width * token.scaleX : 0;
  }

  private placeOnPath(token: Phaser.GameObjects.Container, t: number, index: number): void {
    const u = ((t % 1) + 1) % 1;
    const p = this.path.getPoint(u);
    // Perspective: shrink toward the far (top) side and y-sort so nearer
    // vehicles draw over farther ones.
    token.setScale(((token.getData("baseScale") as number) || 1) * this.depthScaleAt(p.y));
    token.setDepth(TRAIN_DEPTH + p.y / Math.max(1, this.pathYMax));
    // Gentle bounce while moving — phase-offset per car so they don't sync.
    const bounce =
      this.moving && index >= 0
        ? Math.sin(this.time.now / 160 + index * 0.9) * 2
        : 0;
    token.setPosition(p.x, p.y + bounce);
  }

  /** Pick the directional atlas frame from the path tangent at `u`. */
  private faceAlongPath(
    token: Phaser.GameObjects.Container,
    t: number,
    dir: 1 | -1,
    type: TrainType,
  ): void {
    const body = token.getData("body") as Phaser.GameObjects.Image | undefined;
    if (!body) return;
    const u = ((t % 1) + 1) % 1;
    const eps = 0.01;
    const a = this.path.getPoint(u);
    const b = this.path.getPoint(((u + eps) % 1 + 1) % 1);
    // Tangent for increasing u; flip for reverse so the sprite faces its travel.
    const d = velocityToDirection((b.x - a.x) * dir, (b.y - a.y) * dir);
    body.setFrame(frameKey(type, d));
  }

  private puffSmoke(): void {
    if (!this.moving || !this.loco) return;
    spawnSmoke(this, this.loco.x, this.loco.y - 6, 0.3);
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
    this.placeTrain();
  }

  /** A car: directional atlas body; overlay a tarp frame when muted. Tapping
   *  the car toggles its tarp (mute) — the kid covers/uncovers the load. */
  private makeCar(car: TrackCar): Phaser.GameObjects.Container {
    const r = this.backgroundRect;
    const targetW = r.width * 0.075;
    const body = this.add.image(0, 0, "train", frameKey(car.carType, "E")).setOrigin(0.5);
    const children: Phaser.GameObjects.GameObject[] = [body];
    if (car.muted) {
      const tarp = this.add.image(0, 0, "tarp", "tarp").setOrigin(0.5);
      tarp.setDisplaySize(body.width * 1.05, body.height * 1.05);
      children.push(tarp);
    }
    const c = this.add.container(0, 0, children);
    c.setData("body", body);
    const baseScale = body.width > 0 ? targetW / body.width : 1;
    c.setData("baseScale", baseScale);
    c.setScale(baseScale);
    c.setDepth(TRAIN_DEPTH);
    // Kid-sized hit area (1.6× the body) around the moving car. Same armed
    // press/release rule as the chrome so nothing leaks a stray pointerup.
    const hit = new Phaser.Geom.Rectangle(
      -body.width * 0.8, -body.height * 0.8, body.width * 1.6, body.height * 1.6,
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

  private makeLoco(): Phaser.GameObjects.Container {
    const r = this.backgroundRect;
    const targetW = r.width * 0.11; // loco ~1.5× a car
    const img = this.add.image(0, 0, "train", frameKey("loco", "E")).setOrigin(0.5);
    const c = this.add.container(0, 0, [img]);
    c.setData("body", img);
    const baseScale = img.width > 0 ? targetW / img.width : 1;
    c.setData("baseScale", baseScale);
    c.setScale(baseScale);
    c.setDepth(TRAIN_DEPTH);
    return c;
  }
}
