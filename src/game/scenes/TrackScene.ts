// The Track view (v2): the assembled train (loco + cars) rides the painted oval.
// Each car occupies an equal arc of the oval; as the train moves, each car in
// turn passes the crossing signal at the bottom-centre straight, where it lights
// up. Smoke puffs from the loco while moving; cars bounce gently.
//
// Audio stays transport-driven (gapless, the BeepBox trait): React feeds
// `setProgress(0..1)` from the live transport each frame, so the car at the
// signal is exactly the bar that's sounding. Direction + speed are visual /
// tempo controls owned by React.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG_V2, SPRITES, CAR_SPRITES, carSpriteKey } from "../assets.ts";
import { TRACK_LAYOUT_V2 } from "../scene-layout.ts";
import type { CarType } from "../../core/types.ts";

export interface TrackCar {
  readonly id: string;
  readonly color: string;
  readonly carType: CarType;
  readonly muted: boolean;
}

const OVAL = TRACK_LAYOUT_V2.oval;

export class TrackScene extends BackgroundScene {
  static readonly KEY = "TrackScene";

  private path!: Phaser.Curves.Ellipse;
  private loco!: Phaser.GameObjects.Container;
  private signal?: Phaser.GameObjects.Image;
  private smoke?: Phaser.GameObjects.Particles.ParticleEmitter;
  private cars: TrackCar[] = [];
  private carTokens: Phaser.GameObjects.Container[] = [];
  private progress = 0;
  private direction: 1 | -1 = 1;
  private moving = false;
  private lastSignalBar = -1;

  constructor() {
    super(TrackScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.track);
    for (const a of [
      ...CAR_SPRITES,
      SPRITES.loco,
      SPRITES.tarp,
      SPRITES.signalUp,
      SPRITES.signalDown,
      SPRITES.smokePuff,
    ]) {
      if (!this.textures.exists(a.key)) this.load.image(a.key, a.url);
    }
  }

  create(): void {
    this.addBackground("contain");
    this.path = new Phaser.Curves.Ellipse(0, 0, 1, 1);
    this.layoutPath();
    this.loco = this.makeLoco();
    this.signal = this.add.image(0, 0, SPRITES.signalUp.key).setOrigin(0.5, 1).setDepth(7);
    this.smoke = this.add
      .particles(0, 0, SPRITES.smokePuff.key, {
        lifespan: 1500,
        speedY: { min: -40, max: -20 },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.5, end: 1.1 },
        alpha: { start: 0.8, end: 0 },
        frequency: 500,
        emitting: false,
      })
      .setDepth(9);
    this.layoutFixtures();
    this.rebuildCars();
    this.announceReady();
  }

  /** React → scene: the cars to draw (one per train slot, in order). */
  setCars(cars: TrackCar[]): void {
    this.cars = cars;
    if (this.scene.isActive()) this.rebuildCars();
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
    this.smoke?.[moving ? "start" : "stop"]();
    if (!moving) this.lastSignalBar = -1;
  }

  update(): void {
    if (!this.path || !this.loco) return;
    const n = Math.max(1, this.carTokens.length);
    const dir = this.direction;
    // Each car occupies 1/n of the oval; car i is at the signal when
    // progress = i/n. The loco rides just ahead of car 0.
    this.cars.forEach((_car, i) => {
      const token = this.carTokens[i];
      if (!token) return;
      const u = TRACK_LAYOUT_V2.signalAngle + dir * (this.progress - i / n);
      this.placeOnPath(token, u, i);
    });
    const locoU = TRACK_LAYOUT_V2.signalAngle + dir * (this.progress + 0.5 / n);
    this.placeOnPath(this.loco, locoU, -1);

    // Smoke rises from the loco's stack.
    if (this.smoke) this.smoke.setPosition(this.loco.x, this.loco.y - 6);

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

  private layoutFixtures(): void {
    const r = this.backgroundRect;
    this.signal?.setPosition(
      r.x + r.width * TRACK_LAYOUT_V2.signal.x,
      r.y + r.height * TRACK_LAYOUT_V2.signal.y,
    );
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

  private flashSignal(): void {
    if (!this.signal) return;
    this.signal.setTexture(SPRITES.signalDown.key);
    this.tweens.killTweensOf(this.signal);
    this.signal.setAlpha(1);
    this.tweens.add({
      targets: this.signal,
      alpha: { from: 1, to: 0.4 },
      yoyo: true,
      duration: 150,
      onComplete: () => {
        this.signal?.setTexture(SPRITES.signalUp.key);
        this.signal?.setAlpha(1);
      },
    });
  }

  private rebuildCars(): void {
    this.carTokens.forEach((c) => c.destroy());
    this.carTokens = this.cars.map((car) => this.makeCar(car));
    this.update();
  }

  /** Tint the car body sprite; overlay a tarp when muted. */
  private makeCar(car: TrackCar): Phaser.GameObjects.Container {
    const r = this.backgroundRect;
    const targetW = r.width * 0.075;
    const body = this.add.image(0, 0, carSpriteKey[car.carType]).setOrigin(0.5);
    body.setTint(Phaser.Display.Color.HexStringToColor(car.color).color);
    const children: Phaser.GameObjects.GameObject[] = [body];
    if (car.muted && this.textures.exists(SPRITES.tarp.key)) {
      const tarp = this.add.image(0, 0, SPRITES.tarp.key).setOrigin(0.5);
      tarp.setDisplaySize(body.width * 1.05, body.height * 1.05);
      children.push(tarp);
    }
    const c = this.add.container(0, 0, children);
    if (body.width > 0) c.setScale(targetW / body.width);
    c.setDepth(4);
    return c;
  }

  private makeLoco(): Phaser.GameObjects.Container {
    const r = this.backgroundRect;
    const targetW = r.width * 0.11; // loco ~1.5× a car
    const img = this.add.image(0, 0, SPRITES.loco.key).setOrigin(0.5);
    const c = this.add.container(0, 0, [img]);
    if (img.width > 0) c.setScale(targetW / img.width);
    c.setDepth(6);
    return c;
  }
}
