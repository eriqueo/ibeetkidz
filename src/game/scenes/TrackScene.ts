// The Track view: a top-down loop railway. Phaser renders the painted track
// scene and rides a train of cars around an ellipse calibrated to the painted
// oval. React owns only the floating transport bar (Ride / Stop) and feeds the
// scene two things: the car list (colours, from project.arrangement) and the
// playback progress 0..1 (from the audio transport, once per rAF frame).
//
// The ellipse is an approximation of the perspective-drawn track — the four
// OVAL constants below are normalized to the background image and meant to be
// nudged by eye against the running app.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG } from "../assets.ts";

export interface TrackCar {
  readonly id: string;
  readonly color: string;
  readonly name: string;
}

// Painted oval, as fractions of the background image (centre + radii).
const OVAL = { cx: 0.5, cy: 0.4, rx: 0.4, ry: 0.26 } as const;
const LOCO_COLOR = 0xd4a017;

export class TrackScene extends BackgroundScene {
  static readonly KEY = "TrackScene";

  private path!: Phaser.Curves.Ellipse;
  private loco!: Phaser.GameObjects.Container;
  private cars: TrackCar[] = [];
  private carTokens: Phaser.GameObjects.Container[] = [];
  private progress = 0;

  constructor() {
    super(TrackScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG.track);
  }

  create(): void {
    this.addBackground("cover");
    this.path = new Phaser.Curves.Ellipse(0, 0, 1, 1);
    this.layoutPath();
    this.loco = this.makeCar(LOCO_COLOR, true);
    this.rebuildCars();
    this.announceReady();
  }

  /** React -> scene: the cars to draw (one per arrangement repeat). */
  setCars(cars: TrackCar[]): void {
    this.cars = cars;
    if (this.scene.isActive()) this.rebuildCars();
  }

  /** React -> scene: playback head position around the loop, 0..1. */
  setProgress(t: number): void {
    this.progress = ((t % 1) + 1) % 1;
  }

  update(): void {
    if (!this.path || !this.loco) return;
    this.placeOnPath(this.loco, this.progress);
    const spacing = 1 / Math.max(10, this.carTokens.length + 2);
    this.carTokens.forEach((token, i) => {
      this.placeOnPath(token, this.progress - (i + 1) * spacing);
    });
  }

  protected onResize(): void {
    if (this.path) this.layoutPath();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private layoutPath(): void {
    const r = this.backgroundRect;
    this.path.x = r.x + r.width * OVAL.cx;
    this.path.y = r.y + r.height * OVAL.cy;
    this.path.xRadius = r.width * OVAL.rx;
    this.path.yRadius = r.height * OVAL.ry;
  }

  private placeOnPath(token: Phaser.GameObjects.Container, t: number): void {
    const u = ((t % 1) + 1) % 1;
    const p = this.path.getPoint(u);
    token.setPosition(p.x, p.y);
  }

  private rebuildCars(): void {
    this.carTokens.forEach((c) => c.destroy());
    this.carTokens = this.cars.map((car) =>
      this.makeCar(Phaser.Display.Color.HexStringToColor(car.color).color, false),
    );
    this.update();
  }

  /** A pixel-art car as a container (body + bevel + two wheels). */
  private makeCar(color: number, isLoco: boolean): Phaser.GameObjects.Container {
    const w = isLoco ? 40 : 34;
    const h = isLoco ? 26 : 20;
    const g = this.add.graphics();
    g.fillStyle(0x1a1712, 1).fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    g.fillStyle(color, 1).fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(0xffffff, 0.25).fillRect(-w / 2, -h / 2, w, 3);
    g.fillStyle(0x000000, 0.3).fillRect(-w / 2, h / 2 - 3, w, 3);
    g.fillStyle(0x222222, 1);
    g.fillCircle(-w / 4, h / 2 + 3, 4);
    g.fillCircle(w / 4, h / 2 + 3, 4);
    const c = this.add.container(0, 0, [g]);
    c.setDepth(isLoco ? 6 : 4);
    return c;
  }
}
