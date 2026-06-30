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
import { SCENE_BG_V2, SPRITES } from "../assets.ts";
import { loadSpriteAssets, frameKey, type Direction } from "../sprite-assets.ts";
import { YARD_SIDINGS_V2, YARD_LAYOUT_V2, YARD_CHROME } from "../scene-layout.ts";
import {
  parseTiledLayer,
  type TiledSpawn,
} from "../TiledParser.ts";
import { spawnTiledScene, relayoutSpawns, placeSpawn } from "../TiledSceneAdapter.ts";
import yardMap from "../../assets/maps/yard.json";
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
  // Composited static chrome: the placed button-panel sprite + corner nav sprites,
  // plus the parsed Tiled spawns and their (index-aligned) hit-areas.
  private panelImg?: Phaser.GameObjects.Image;
  private navImgs = new Map<string, Phaser.GameObjects.Image>();
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chromeHits: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super(YardScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.yard);
    // train (car bodies, top-down) + tarp atlases.
    loadSpriteAssets(this);
    // Chrome sprites: panel strip + corner nav buttons.
    this.load.image(SPRITES.yardPanelButtons.key, SPRITES.yardPanelButtons.url);
    this.load.image(SPRITES.btnNavWorkshop.key, SPRITES.btnNavWorkshop.url);
    this.load.image(SPRITES.btnNavExit.key, SPRITES.btnNavExit.url);
  }

  create(): void {
    this.addBackground("contain");
    this.buildChrome();
    this.rebuild();
    this.bindIntents();
    this.announceReady();
  }

  // ── composited chrome (panel + nav sprites + Tiled hit-areas) ───────────────
  // The clean base plate paints NO buttons, so place the panel sprite over the
  // bottom band and the nav sprites in the top corners, then lay the data-driven
  // transparent hit-areas (parsed from yard.json) on top. The adapter auto-wires
  // each hit's authored EventBus action; `layoutChrome` re-anchors everything to
  // the painted art on resize.
  private buildChrome(): void {
    this.panelImg = this.add.image(0, 0, SPRITES.yardPanelButtons.key).setOrigin(0.5).setDepth(1);
    for (const id of ["btn-yard-workshop", "btn-yard-exit"] as const) {
      const key = id === "btn-yard-workshop" ? SPRITES.btnNavWorkshop.key : SPRITES.btnNavExit.key;
      this.navImgs.set(id, this.add.image(0, 0, key).setOrigin(0.5).setDepth(2));
    }
    this.chromeSpawns = parseTiledLayer(yardMap, "ui-layer");
    const { hits } = spawnTiledScene(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      hitDepth: 10,
    });
    this.chromeHits = hits;
    this.layoutChrome();
  }

  // YardScene owns the palette selection, so the animated/selection-aware action
  // intents are translated here: a Tiled "yard-add"/"yard-depart" tap runs the
  // crane / departure tween, whose onComplete emits the real React-facing event.
  private bindIntents(): void {
    const onAdd = (): void => {
      if (this.selectedId) this.animateCranePickup(this.selectedId);
      else this.flashPalette();
    };
    const onDepart = (): void => this.sendToTrack();
    EventBus.on("yard-add", onAdd);
    EventBus.on("yard-depart", onDepart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("yard-add", onAdd);
      EventBus.off("yard-depart", onDepart);
    });
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
    this.layoutChrome();
  }

  // Re-anchor the placed panel/nav sprites + their Tiled hit-areas to the painted
  // art after the background refits (the adapter places hits once at create).
  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    const { width, height } = this.scale.gameSize;

    const P = YARD_CHROME.panel;
    this.panelImg
      ?.setDisplaySize(r.width * P.w, r.height * P.h)
      .setPosition(r.x + r.width * P.cx, r.y + r.height * P.cy);

    // Nav sprites track their own Tiled spawn (same anchor math the hits use), so
    // sprite + transparent hit always coincide, including ui-top-right pinning.
    this.navImgs.forEach((img, id) => {
      const s = this.chromeSpawns.find((sp) => sp.id === id);
      if (!s) return;
      const p = placeSpawn(s, r, { width, height });
      img.setDisplaySize(p.width, p.height).setPosition(p.x, p.y);
    });

    relayoutSpawns(this.chromeHits, this.chromeSpawns, r, { width, height });
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
