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
import { EventBus } from "../EventBus.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import { loadSpriteAssets, frameKey, type Direction } from "../sprite-assets.ts";
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
  private busy = false; // a crane/departure tween is in flight — ignore presses
  // The two Phaser control buttons + how to place/gate each against the bg rect.
  private buttons: {
    btn: Phaser.GameObjects.Container;
    region: (r: SlotRect) => { cx: number; cy: number; w: number; h: number };
    enabled?: () => boolean;
  }[] = [];

  constructor() {
    super(YardScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.yard);
    // train (car bodies, top-down) + tarp atlases.
    loadSpriteAssets(this);
  }

  create(): void {
    this.addBackground("contain");
    this.buildButtons();
    this.rebuild();
    this.announceReady();
  }

  /** React → scene: the palette (built cars) + the assembled train. This is the
   *  scene's only train state — it renders from it and reads `train.length` to
   *  gate Send to Track; it never mutates or keeps a separate copy. */
  setCars(palette: YardCar[], train: YardTrainCar[]): void {
    this.cars = palette;
    this.train = train;
    if (this.ready) this.rebuild();
  }

  setSelectedPalette(id: string | null): void {
    this.selectedId = id;
    this.paletteTokens.forEach((token, cid) => {
      (token.getData("ring") as Phaser.GameObjects.Graphics).setVisible(cid === id);
    });
  }

  /** Animate the crane lifting the chosen car from its siding up to the assembly
   *  line: a ghost car sprite (+ hook/cable above it) rises, travels across, and
   *  drops onto the line, THEN onComplete commits the real slot. Clearly visible
   *  (the hook alone was too subtle). */
  animatePickup(
    fromSlotIndex: number,
    toTrainIndex: number,
    onComplete: () => void,
  ): void {
    const r = this.backgroundRect;
    const car = this.cars[fromSlotIndex];
    if (!car || r.width === 0) {
      onComplete();
      return;
    }
    const from = paletteSlot(r, fromSlotIndex);
    const to = trainSlot(r, toTrainIndex, Math.max(1, this.train.length + 1));
    const liftY = r.y + r.height * (YARD_LAYOUT_V2.assemblyLine.y + 0.16); // crane beam height

    // Ghost = the car being carried + a cable/hook above it, grouped so they move
    // together. Hide the static palette token while it's "in the air". The car is
    // shown side-on ('E') as it lands on the assembly track.
    const body = this.add.image(0, 0, "train", frameKey(car.carType, "E")).setOrigin(0.5);
    const cable = this.add.graphics();
    cable.lineStyle(3, 0x2a2a2a, 1).lineBetween(0, -body.height / 2 - 60, 0, -body.height / 2);
    cable.fillStyle(0xf2b134, 1).fillRect(-8, -body.height / 2 - 8, 16, 12); // hook block
    const ghost = this.add.container(from.cx, from.cy, [cable, body]);
    ghost.setScale(from.w / body.width).setDepth(20);
    this.paletteTokens.get(car.id)?.setVisible(false);

    this.tweens.chain({
      targets: ghost,
      tweens: [
        { y: liftY, duration: 320, ease: "Back.easeOut" },          // hoist up
        { x: to.cx, duration: 420, ease: "Sine.easeInOut" },        // travel across
        { y: to.cy, duration: 320, ease: "Bounce.easeOut" },        // lower onto line
      ],
      onComplete: () => {
        ghost.destroy();
        this.paletteTokens.get(car.id)?.setVisible(true);
        onComplete();
      },
    });
  }

  /** Add to Train: run the crane lift for `partId`; the dispatch happens only in
   *  the tween's onComplete (state follows the animation — never on press). */
  private animateCranePickup(partId: string): void {
    if (this.busy) return;
    const fromSlotIndex = this.cars.findIndex((c) => c.id === partId);
    if (fromSlotIndex < 0) return;
    this.busy = true;
    this.animatePickup(fromSlotIndex, this.train.length, () => {
      this.busy = false;
      EventBus.emit("yard-add-to-train", partId);
    });
  }

  /** Send to Track: slide the assembled train off-screen, then navigate. */
  private sendToTrack(): void {
    if (this.busy || this.train.length === 0) return;
    this.busy = true;
    this.animateDeparture(() => {
      this.busy = false;
      EventBus.emit("yard-send-to-track");
    });
  }

  private animateDeparture(onComplete: () => void): void {
    if (this.trainTokens.length === 0) {
      onComplete();
      return;
    }
    const r = this.backgroundRect;
    // A quick bob (the "toot-toot") then the whole train rolls off to the right.
    this.tweens.chain({
      targets: this.trainTokens,
      tweens: [
        { y: "-=8", duration: 110, yoyo: true, ease: "Sine.easeOut" },
        { x: `+=${r.width * 1.2}`, duration: 650, ease: "Sine.easeIn" },
      ],
      onComplete,
    });
  }

  /** Visual no-op when Add is pressed with nothing selected: blink the palette. */
  private flashPalette(): void {
    this.paletteTokens.forEach((t) =>
      this.tweens.add({ targets: t, alpha: { from: 1, to: 0.3 }, yoyo: true, duration: 120, repeat: 1 }),
    );
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

    this.cars.forEach((car) => {
      const token = this.makeCar(car.carType, car.name, false, "S");
      this.makePaletteInteractive(token, car.id);
      this.paletteTokens.set(car.id, token);
    });
    this.train.forEach((slot) =>
      this.trainTokens.push(this.makeTrainCar(slot)),
    );
    // A selected car may have been removed; drop a stale highlight.
    if (this.selectedId && !this.paletteTokens.has(this.selectedId)) this.selectedId = null;
    this.layout();
    this.setSelectedPalette(this.selectedId);
    this.refreshButtons();
  }

  /** Make a palette car token tap-to-select. The hit area is the (unscaled) body
   *  centred on the container; the container's world scale applies on hit-test. */
  private makePaletteInteractive(token: Phaser.GameObjects.Container, partId: string): void {
    const body = token.getData("body") as Phaser.GameObjects.Image;
    const hit = new Phaser.Geom.Rectangle(-body.width / 2, -body.height / 2, body.width, body.height);
    token.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    if (token.input) token.input.cursor = "pointer";
    token.on("pointerdown", () => this.selectPaletteCar(partId));
  }

  /** Deselect the previous car, highlight + store the new one, tell React. */
  private selectPaletteCar(partId: string): void {
    this.setSelectedPalette(partId);
    EventBus.emit("yard-car-selected", partId);
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
    this.layoutButtons();
  }

  // ── transport / action buttons (same pattern as TrackScene) ─────────────────

  private buildButtons(): void {
    const P = YARD_LAYOUT_V2.panel;
    const S = YARD_LAYOUT_V2.sendToTrack;
    this.buttons = [
      {
        // Add to Train: crane-lift the selected car onto the line.
        btn: this.makeButton("🏗️", () => {
          if (this.selectedId) this.animateCranePickup(this.selectedId);
          else this.flashPalette();
        }),
        region: (r) => ({ cx: r.x + r.width * P.couple, cy: r.y + r.height * P.y, w: r.width * P.w, h: r.height * P.h }),
      },
      {
        // Send to Track: depart the assembled train, then navigate.
        btn: this.makeButton("🚂", () => this.sendToTrack()),
        region: (r) => ({
          cx: r.x + r.width * (S.x + S.w / 2),
          cy: r.y + r.height * (S.y + S.h / 2),
          w: r.width * S.w,
          h: r.height * S.h,
        }),
        enabled: () => this.train.length > 0,
      },
    ];
  }

  private makeButton(text: string, onPress: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 10, 10, 0x2a2118).setStrokeStyle(3, 0x000000);
    const label = this.add
      .text(0, 0, text, { fontFamily: "'Press Start 2P', monospace", fontSize: "18px", color: "#f4e8d0" })
      .setOrigin(0.5);
    const btn = this.add.container(0, 0, [bg, label]).setDepth(10);
    const hit = new Phaser.Geom.Rectangle(-5, -5, 10, 10);
    btn.setData("bg", bg);
    btn.setData("label", label);
    btn.setData("hit", hit);
    btn.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    if (btn.input) btn.input.cursor = "pointer";
    btn
      .on("pointerdown", () => {
        if (this.busy) return;
        btn.setAlpha(0.7); // visual down state
        onPress();
      })
      .on("pointerup", () => this.refreshButtons())
      .on("pointerout", () => this.refreshButtons());
    return btn;
  }

  /** Position + size the buttons against the painted panel; dim disabled ones. */
  private layoutButtons(): void {
    const r = this.backgroundRect;
    for (const { btn, region } of this.buttons) {
      const { cx, cy, w, h } = region(r);
      const bg = btn.getData("bg") as Phaser.GameObjects.Rectangle;
      const label = btn.getData("label") as Phaser.GameObjects.Text;
      const hit = btn.getData("hit") as Phaser.Geom.Rectangle;
      bg.setSize(w, h);
      hit.setTo(-w / 2, -h / 2, w, h);
      label.setFontSize(Math.round(h * 0.42));
      btn.setPosition(cx, cy);
    }
    this.refreshButtons();
  }

  /** Reflect each button's enabled state (and reset any press alpha). */
  private refreshButtons(): void {
    for (const { btn, enabled } of this.buttons) {
      btn.setAlpha(!enabled || enabled() ? 1 : 0.45);
    }
  }

  /** Scale a car container so its sprite body is ~`targetW` px wide. */
  private fitToken(token: Phaser.GameObjects.Container, targetW: number): void {
    const baseW = (token.getData("baseW") as number) || targetW;
    token.setScale(targetW / baseW);
  }

  /** Build a car token: directional atlas body + selection ring + name label. */
  private makeCar(
    carType: CarType,
    name: string,
    isTrain: boolean,
    dir: Direction,
  ): Phaser.GameObjects.Container {
    const body = this.add.image(0, 0, "train", frameKey(carType, dir)).setOrigin(0.5);

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
    c.setData("body", body);
    c.setData("baseW", bw);
    c.setDepth(isTrain ? 5 : 4);
    return c;
  }

  /** An assembly-line car: side-on body + a tarp overlay when muted. */
  private makeTrainCar(slot: YardTrainCar): Phaser.GameObjects.Container {
    const c = this.makeCar(slot.carType, "", true, "E");
    const body = c.list[1] as Phaser.GameObjects.Image;
    if (slot.muted) {
      const tarp = this.add.image(0, 0, "tarp", "tarp").setOrigin(0.5);
      tarp.setDisplaySize(body.width * 1.05, body.height * 1.05);
      c.add(tarp);
    }
    return c;
  }
}
