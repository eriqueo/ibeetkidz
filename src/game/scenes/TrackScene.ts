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
import type { CarType } from "../../core/types.ts";

export interface TrackCar {
  readonly id: string;
  readonly color: string;
  readonly carType: CarType;
  readonly muted: boolean;
}

const OVAL = TRACK_LAYOUT_V2.oval;
const SMOKE_INTERVAL_MS = 800;

// The bottom transport panel: each button's painted-centre (fraction of the
// scene width, from TRACK_LAYOUT_V2.controls) + its label + what it does. These
// are rendered as pixel-styled rectangles over the painted panel and fire
// EventBus messages that React turns into engine calls.
type ControlAction =
  | { kind: "play" }
  | { kind: "stop" }
  | { kind: "tempo"; delta: number };

interface ControlSpec {
  readonly cx: number;
  readonly label: string;
  readonly action: ControlAction;
}

const CONTROL_SPECS: readonly ControlSpec[] = [
  { cx: TRACK_LAYOUT_V2.controls.rewind, label: "🐢", action: { kind: "tempo", delta: -10 } },
  { cx: TRACK_LAYOUT_V2.controls.stop, label: "■", action: { kind: "stop" } },
  { cx: TRACK_LAYOUT_V2.controls.play, label: "▶", action: { kind: "play" } },
  { cx: TRACK_LAYOUT_V2.controls.ff, label: "🐇", action: { kind: "tempo", delta: 10 } },
];

export class TrackScene extends BackgroundScene {
  static readonly KEY = "TrackScene";

  private path!: Phaser.Curves.Ellipse;
  private loco!: Phaser.GameObjects.Container;
  private signal?: Phaser.GameObjects.Sprite;
  private cars: TrackCar[] = [];
  private carTokens: Phaser.GameObjects.Container[] = [];
  private progress = 0;
  private direction: 1 | -1 = 1;
  private moving = false;
  private lastSignalBar = -1;
  private controlBtns: { spec: ControlSpec; btn: Phaser.GameObjects.Container }[] = [];

  constructor() {
    super(TrackScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.track);
    // train / smoke / signal / tarp atlases (the single source of truth).
    loadSpriteAssets(this);
  }

  create(): void {
    this.addBackground("contain");
    registerAnimations(this);
    this.path = new Phaser.Curves.Ellipse(0, 0, 1, 1);
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
    this.buildControls();
    this.layoutFixtures();
    this.rebuildCars();
    this.announceReady();
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

  update(): void {
    if (!this.path || !this.loco) return;
    const n = Math.max(1, this.carTokens.length);
    const dir = this.direction;
    // Each car occupies 1/n of the oval; car i is at the signal when
    // progress = i/n. The loco rides just ahead of car 0.
    this.cars.forEach((car, i) => {
      const token = this.carTokens[i];
      if (!token) return;
      const u = TRACK_LAYOUT_V2.signalAngle + dir * (this.progress - i / n);
      this.placeOnPath(token, u, i);
      this.faceAlongPath(token, u, dir, car.carType);
    });
    const locoU = TRACK_LAYOUT_V2.signalAngle + dir * (this.progress + 0.5 / n);
    this.placeOnPath(this.loco, locoU, -1);
    this.faceAlongPath(this.loco, locoU, dir, "loco");

    // Fire the crossing signal when the car at the signal changes (a new bar).
    if (this.moving) {
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

  private layoutPath(): void {
    const r = this.backgroundRect;
    this.path.x = r.x + r.width * OVAL.cx;
    this.path.y = r.y + r.height * OVAL.cy;
    this.path.xRadius = r.width * OVAL.rx;
    this.path.yRadius = r.height * OVAL.ry;
  }

  /** Build the pixel-styled transport buttons over the painted control panel.
   *  Each fires an EventBus message; React owns the engine. */
  private buildControls(): void {
    this.controlBtns = CONTROL_SPECS.map((spec) => {
      const bg = this.add.rectangle(0, 0, 10, 10, 0x2a2118).setStrokeStyle(3, 0x000000);
      const label = this.add
        .text(0, 0, spec.label, {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "18px",
          color: "#f4e8d0",
        })
        .setOrigin(0.5);
      const btn = this.add.container(0, 0, [bg, label]).setDepth(10);
      btn.setData("bg", bg);
      btn.setData("label", label);
      // Centred hit area (container-local origin is its centre); resized in
      // layoutControls once the background rect is known.
      const hit = new Phaser.Geom.Rectangle(-5, -5, 10, 10);
      btn.setData("hit", hit);
      btn.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
      if (btn.input) btn.input.cursor = "pointer";
      btn
        .on("pointerdown", () => {
          btn.setAlpha(0.7); // visual down state
          this.fireControl(spec.action);
        })
        .on("pointerup", () => btn.setAlpha(1))
        .on("pointerout", () => btn.setAlpha(1));
      return { spec, btn };
    });
  }

  private fireControl(action: ControlAction): void {
    switch (action.kind) {
      case "play":
        EventBus.emit("transport-play", "ride");
        break;
      case "stop":
        EventBus.emit("transport-stop");
        break;
      case "tempo":
        EventBus.emit("tempo-changed", action.delta);
        break;
    }
  }

  /** Position + size the transport buttons against the painted panel band. */
  private layoutControls(): void {
    const r = this.backgroundRect;
    const w = r.width * TRACK_LAYOUT_V2.controls.w;
    const h = r.height * TRACK_LAYOUT_V2.controls.h;
    const y = r.y + r.height * TRACK_LAYOUT_V2.controls.y;
    for (const { spec, btn } of this.controlBtns) {
      const bg = btn.getData("bg") as Phaser.GameObjects.Rectangle;
      const label = btn.getData("label") as Phaser.GameObjects.Text;
      const hit = btn.getData("hit") as Phaser.Geom.Rectangle;
      bg.setSize(w, h);
      hit.setTo(-w / 2, -h / 2, w, h);
      label.setFontSize(Math.round(h * 0.42));
      btn.setPosition(r.x + r.width * spec.cx, y);
    }
  }

  private layoutFixtures(): void {
    this.layoutControls();
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

  private placeOnPath(token: Phaser.GameObjects.Container, t: number, index: number): void {
    const u = ((t % 1) + 1) % 1;
    const p = this.path.getPoint(u);
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
    this.update();
  }

  /** A car: directional atlas body; overlay a tarp frame when muted. */
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
    if (body.width > 0) c.setScale(targetW / body.width);
    c.setDepth(4);
    return c;
  }

  private makeLoco(): Phaser.GameObjects.Container {
    const r = this.backgroundRect;
    const targetW = r.width * 0.11; // loco ~1.5× a car
    const img = this.add.image(0, 0, "train", frameKey("loco", "E")).setOrigin(0.5);
    const c = this.add.container(0, 0, [img]);
    c.setData("body", img);
    if (img.width > 0) c.setScale(targetW / img.width);
    c.setDepth(6);
    return c;
  }
}
