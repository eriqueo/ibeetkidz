// The Yard view (v2): the kid assembles a train. The LEFT sidings hold the
// palette — one sprite per built car (project.parts). The TOP straight track is
// the assembly line — one sprite per train slot (project.train). A gantry crane
// in the centre animates picking a palette car up and dropping it on the line.
//
// Phaser owns the sprites; React owns selection + actions via hit-areas placed
// at the SAME slot geometry (exported below) so the two always coincide. The
// canvas takes no pointer events.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG_V2, SPRITES, CAR_SPRITES, carSpriteKey } from "../assets.ts";
import { YARD_SIDINGS_V2, YARD_LAYOUT_V2 } from "../scene-layout.ts";
import type { CarType } from "../../core/types.ts";

/** A built car in the palette (left sidings). */
export interface YardCar {
  readonly id: string;
  readonly color: string;
  readonly name: string;
  readonly carType: CarType;
}

/** A slot in the assembled train (top line). */
export interface YardTrainCar {
  readonly instanceId: string;
  readonly partId: string;
  readonly color: string;
  readonly carType: CarType;
  readonly muted: boolean;
}

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Centre + size of palette slot `i` within a contained-image rect. Cars fill
 *  the 4 sidings top→bottom, then wrap to the next column. Shared by the Phaser
 *  sprite and the React hit-area so they always coincide. */
export function paletteSlot(
  rect: SlotRect,
  i: number,
): { cx: number; cy: number; w: number; h: number } {
  const row = i % YARD_SIDINGS_V2.rows;
  const col = Math.floor(i / YARD_SIDINGS_V2.rows);
  return {
    cx: rect.x + rect.width * (YARD_SIDINGS_V2.x0 + YARD_SIDINGS_V2.carW / 2 + col * YARD_SIDINGS_V2.dx),
    cy: rect.y + rect.height * (YARD_SIDINGS_V2.y0 + row * YARD_SIDINGS_V2.dy),
    w: rect.width * YARD_SIDINGS_V2.carW,
    h: rect.height * YARD_SIDINGS_V2.carH,
  };
}

/** Centre + size of assembly-line slot `i` (left→right along the top track). */
export function trainSlot(
  rect: SlotRect,
  i: number,
  count: number,
): { cx: number; cy: number; w: number; h: number } {
  const a = YARD_LAYOUT_V2.assemblyLine;
  const w = rect.width * YARD_SIDINGS_V2.carW;
  const h = rect.height * YARD_SIDINGS_V2.carH;
  // Pack slots across the assembly line; spacing shrinks as the train grows so
  // they stay inside the painted track.
  const span = rect.width * a.w;
  const step = Math.min(w * 1.05, span / Math.max(1, count));
  const startX = rect.x + rect.width * a.x + w / 2;
  return {
    cx: startX + i * step,
    cy: rect.y + rect.height * (a.y + a.h / 2),
    w,
    h,
  };
}

export class YardScene extends BackgroundScene {
  static readonly KEY = "YardScene";

  private cars: YardCar[] = [];
  private train: YardTrainCar[] = [];
  private selectedId: string | null = null;
  private paletteTokens = new Map<string, Phaser.GameObjects.Container>();
  private trainTokens: Phaser.GameObjects.Container[] = [];
  private hook?: Phaser.GameObjects.Container;

  constructor() {
    super(YardScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.yard);
    // Car bodies + loco + tarp for the assembly line.
    for (const a of [...CAR_SPRITES, SPRITES.loco, SPRITES.tarp]) {
      if (!this.textures.exists(a.key)) this.load.image(a.key, a.url);
    }
  }

  create(): void {
    this.addBackground("contain");
    this.hook = this.makeHook();
    this.rebuild();
    this.announceReady();
  }

  /** React → scene: the palette (built cars) + the assembled train. */
  setCars(palette: YardCar[], train: YardTrainCar[]): void {
    this.cars = palette;
    this.train = train;
    if (this.scene.isActive()) this.rebuild();
  }

  setSelectedPalette(id: string | null): void {
    this.selectedId = id;
    this.paletteTokens.forEach((token, cid) => {
      (token.getData("ring") as Phaser.GameObjects.Graphics).setVisible(cid === id);
    });
  }

  /** Animate the crane hook: rest → palette slot → assembly-line slot → done.
   *  The crane body is painted into the bg; only the hook/cable moves. */
  animatePickup(
    fromSlotIndex: number,
    toTrainIndex: number,
    onComplete: () => void,
  ): void {
    const hook = this.hook;
    if (!hook) {
      onComplete();
      return;
    }
    const r = this.backgroundRect;
    const from = paletteSlot(r, fromSlotIndex);
    const to = trainSlot(r, toTrainIndex, Math.max(1, this.train.length + 1));
    const rest = this.hookRest(r);
    hook.setPosition(rest.x, rest.y).setVisible(true);
    this.tweens.chain({
      targets: hook,
      tweens: [
        { x: from.cx, y: from.cy, duration: 280, ease: "Quad.easeInOut" },
        { y: from.cy, duration: 120 }, // brief grab pause
        { x: to.cx, y: to.cy, duration: 320, ease: "Quad.easeInOut" },
        { y: rest.y, duration: 160, ease: "Quad.easeIn" },
      ],
      onComplete: () => {
        hook.setVisible(false);
        onComplete();
      },
    });
  }

  protected onResize(): void {
    if (this.scene.isActive()) this.layout();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.paletteTokens.forEach((t) => t.destroy());
    this.paletteTokens.clear();
    this.trainTokens.forEach((t) => t.destroy());
    this.trainTokens = [];

    this.cars.forEach((car) =>
      this.paletteTokens.set(car.id, this.makeCar(car.carType, car.color, car.name, false)),
    );
    this.train.forEach((slot) =>
      this.trainTokens.push(this.makeTrainCar(slot)),
    );
    this.layout();
    this.setSelectedPalette(this.selectedId);
  }

  private layout(): void {
    const r = this.backgroundRect;
    this.cars.forEach((car, i) => {
      const slot = paletteSlot(r, i);
      const token = this.paletteTokens.get(car.id);
      if (token) {
        token.setPosition(slot.cx, slot.cy);
        this.fitToken(token, slot.w);
      }
    });
    const count = Math.max(1, this.train.length);
    this.train.forEach((_slot, i) => {
      const pos = trainSlot(r, i, count);
      const token = this.trainTokens[i];
      if (token) {
        token.setPosition(pos.cx, pos.cy);
        this.fitToken(token, pos.w);
      }
    });
    if (this.hook && !this.tweens.isTweening(this.hook)) {
      const rest = this.hookRest(r);
      this.hook.setPosition(rest.x, rest.y);
    }
  }

  /** Scale a car container so its sprite body is ~`targetW` px wide. */
  private fitToken(token: Phaser.GameObjects.Container, targetW: number): void {
    const baseW = (token.getData("baseW") as number) || targetW;
    token.setScale(targetW / baseW);
  }

  private hookRest(r: Phaser.Geom.Rectangle): { x: number; y: number } {
    const c = YARD_LAYOUT_V2.crane;
    return {
      x: r.x + r.width * (c.x + c.w * 0.5),
      y: r.y + r.height * (c.y + c.h * 0.15),
    };
  }

  /** Build a car token: tinted sprite body + selection ring + name label. */
  private makeCar(
    carType: CarType,
    color: string,
    name: string,
    isTrain: boolean,
  ): Phaser.GameObjects.Container {
    const key = carSpriteKey[carType];
    const body = this.add.image(0, 0, key).setOrigin(0.5);
    body.setTint(Phaser.Display.Color.HexStringToColor(color).color);

    const ring = this.add.graphics();
    const bw = body.width;
    const bh = body.height;
    ring.lineStyle(4, 0xffd166, 1).strokeRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8);
    ring.setVisible(false);

    const children: Phaser.GameObjects.GameObject[] = [ring, body];
    if (!isTrain) {
      const label = this.add
        .text(0, bh / 2 + 6, name.toUpperCase(), {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#e8dcc8",
        })
        .setOrigin(0.5, 0);
      children.push(label);
    }
    const c = this.add.container(0, 0, children);
    c.setData("ring", ring);
    c.setData("baseW", bw);
    c.setDepth(isTrain ? 5 : 4);
    return c;
  }

  /** An assembly-line car: tinted body + a tarp overlay when muted. */
  private makeTrainCar(slot: YardTrainCar): Phaser.GameObjects.Container {
    const c = this.makeCar(slot.carType, slot.color, "", true);
    const body = c.list[1] as Phaser.GameObjects.Image;
    if (slot.muted && this.textures.exists(SPRITES.tarp.key)) {
      const tarp = this.add.image(0, 0, SPRITES.tarp.key).setOrigin(0.5);
      tarp.setDisplaySize(body.width * 1.05, body.height * 1.05);
      c.add(tarp);
    }
    return c;
  }

  /** A simple cable + hook the crane animation drives. */
  private makeHook(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.lineStyle(2, 0x2a2a2a, 1).lineBetween(0, -40, 0, 0); // cable
    g.fillStyle(0xf2b134, 1).fillRect(-6, -2, 12, 8); // hook block
    g.fillStyle(0x000000, 1).fillRect(-2, 6, 4, 6); // hook tip
    const c = this.add.container(0, 0, [g]);
    c.setDepth(8).setVisible(false);
    return c;
  }
}
