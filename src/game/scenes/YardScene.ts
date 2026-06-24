// The Yard view: parked train cars on the painted sidings. Phaser draws one car
// sprite per `project.parts` entry at a slot; selection is handled by React
// hit-areas shadowing those same slots (the canvas takes no pointer events).
// React tells the scene which car is highlighted via setSelected.
//
// Slot geometry is exported so Yard.tsx can place its hit-areas at the exact
// same spots — single source of truth. Fractions are of the (contain-fit)
// background image and meant to be nudged in-app.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG } from "../assets.ts";

export interface YardCar {
  readonly id: string;
  readonly color: string;
  readonly name: string;
}

// 5 sidings; overflow wraps into a second column.
export const YARD_SLOTS = {
  rows: 5,
  x0: 0.24,
  y0: 0.15,
  dx: 0.2, // column spacing
  dy: 0.115, // row spacing
  hitW: 0.16, // hit-area / sprite width as fraction of image
  hitH: 0.09,
} as const;

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Centre + size of slot `i`, in px, within a contained-image rect. Shared by
 *  the Phaser sprite and the React hit-area so they always coincide. */
export function yardSlot(rect: SlotRect, i: number): { cx: number; cy: number; w: number; h: number } {
  const row = i % YARD_SLOTS.rows;
  const col = Math.floor(i / YARD_SLOTS.rows);
  return {
    cx: rect.x + rect.width * (YARD_SLOTS.x0 + col * YARD_SLOTS.dx),
    cy: rect.y + rect.height * (YARD_SLOTS.y0 + row * YARD_SLOTS.dy),
    w: rect.width * YARD_SLOTS.hitW,
    h: rect.height * YARD_SLOTS.hitH,
  };
}

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
    this.addBackground("contain");
    this.rebuild();
    this.announceReady();
  }

  setCars(cars: YardCar[]): void {
    this.cars = cars;
    if (this.scene.isActive()) this.rebuild();
  }

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

  private rebuild(): void {
    this.tokens.forEach((t) => t.destroy());
    this.tokens.clear();
    this.cars.forEach((car) => this.tokens.set(car.id, this.makeCar(car)));
    this.layout();
    this.setSelected(this.selectedId);
  }

  private layout(): void {
    const r = this.backgroundRect;
    this.cars.forEach((car, i) => {
      const slot = yardSlot(r, i);
      this.tokens.get(car.id)?.setPosition(slot.cx, slot.cy);
    });
  }

  private makeCar(car: YardCar): Phaser.GameObjects.Container {
    const r = this.backgroundRect;
    const w = Math.max(40, r.width * YARD_SLOTS.hitW);
    const h = Math.max(16, r.height * YARD_SLOTS.hitH * 0.7);
    const color = Phaser.Display.Color.HexStringToColor(car.color).color;
    const body = this.add.graphics();
    body.fillStyle(0x1a1712, 1).fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    body.fillStyle(color, 1).fillRect(-w / 2, -h / 2, w, h);
    body.fillStyle(0xffffff, 0.25).fillRect(-w / 2, -h / 2, w, 3);
    body.fillStyle(0x000000, 0.3).fillRect(-w / 2, h / 2 - 3, w, 3);
    body.fillStyle(0x222222, 1);
    body.fillCircle(-w / 4, h / 2 + 3, 5);
    body.fillCircle(w / 4, h / 2 + 3, 5);

    const ring = this.add.graphics();
    ring.lineStyle(3, 0xffd166, 1).strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 14);
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
    return c;
  }
}
