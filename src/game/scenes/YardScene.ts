// The Yard view: parked train cars on the painted sidings. Phaser renders one
// tappable car sprite per `project.parts` entry; tapping emits `car-selected`
// over the EventBus. React keeps the floating action bar (Edit / Duplicate /
// Send to Track) and the selection state — it tells the scene which car is
// highlighted via setSelected.
//
// Slot anchors are normalized to the background image (eyeballed against the
// painted sidings) and meant to be nudged in-app.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { EventBus } from "../EventBus.ts";
import { SCENE_BG } from "../assets.ts";

export interface YardCar {
  readonly id: string;
  readonly color: string;
  readonly name: string;
}

// 5 sidings; overflow wraps into a second column. Fractions of the image.
const SLOT_ROWS = 5;
const SLOT0 = { x: 0.24, y: 0.15 } as const;
const SLOT_DX = 0.2; // column spacing
const SLOT_DY = 0.115; // row spacing
const CAR_W = 90;
const CAR_H = 30;

export class YardScene extends BackgroundScene {
  static readonly KEY = "YardScene";

  private cars: YardCar[] = [];
  private selectedId: string | null = null;
  private tokens = new Map<string, Phaser.GameObjects.Container>();

  constructor() {
    super(YardScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG.yard);
  }

  create(): void {
    this.addBackground("cover");
    this.rebuild();
    this.announceReady();
  }

  /** React -> scene: the cars to park. */
  setCars(cars: YardCar[]): void {
    this.cars = cars;
    if (this.scene.isActive()) this.rebuild();
  }

  /** React -> scene: which car shows the selection ring. */
  setSelected(id: string | null): void {
    this.selectedId = id;
    this.tokens.forEach((token, cid) => {
      (token.getData("ring") as Phaser.GameObjects.Graphics).setVisible(cid === id);
    });
  }

  protected onResize(): void {
    if (this.scene.isActive()) this.layout();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private slotFor(i: number): { x: number; y: number } {
    const row = i % SLOT_ROWS;
    const col = Math.floor(i / SLOT_ROWS);
    const r = this.backgroundRect;
    return {
      x: r.x + r.width * (SLOT0.x + col * SLOT_DX),
      y: r.y + r.height * (SLOT0.y + row * SLOT_DY),
    };
  }

  private rebuild(): void {
    this.tokens.forEach((t) => t.destroy());
    this.tokens.clear();
    this.cars.forEach((car) => this.tokens.set(car.id, this.makeCar(car)));
    this.layout();
    this.setSelected(this.selectedId);
  }

  private layout(): void {
    this.cars.forEach((car, i) => {
      const slot = this.slotFor(i);
      this.tokens.get(car.id)?.setPosition(slot.x, slot.y);
    });
  }

  private makeCar(car: YardCar): Phaser.GameObjects.Container {
    const color = Phaser.Display.Color.HexStringToColor(car.color).color;
    const body = this.add.graphics();
    body.fillStyle(0x1a1712, 1).fillRect(-CAR_W / 2 - 2, -CAR_H / 2 - 2, CAR_W + 4, CAR_H + 4);
    body.fillStyle(color, 1).fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H);
    body.fillStyle(0xffffff, 0.25).fillRect(-CAR_W / 2, -CAR_H / 2, CAR_W, 3);
    body.fillStyle(0x000000, 0.3).fillRect(-CAR_W / 2, CAR_H / 2 - 3, CAR_W, 3);
    body.fillStyle(0x222222, 1);
    body.fillCircle(-CAR_W / 4, CAR_H / 2 + 3, 5);
    body.fillCircle(CAR_W / 4, CAR_H / 2 + 3, 5);

    // selection ring (toggled by setSelected)
    const ring = this.add.graphics();
    ring.lineStyle(3, 0xd4a017, 1).strokeRect(-CAR_W / 2 - 5, -CAR_H / 2 - 5, CAR_W + 10, CAR_H + 14);
    ring.setVisible(false);

    const label = this.add
      .text(0, 0, car.name.toUpperCase(), {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "9px",
        color: "#1a1712",
      })
      .setOrigin(0.5);

    const c = this.add.container(0, 0, [ring, body, label]);
    c.setData("ring", ring);
    c.setSize(CAR_W + 10, CAR_H + 14);
    c.setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => EventBus.emit("car-selected", car.id));
    return c;
  }
}
