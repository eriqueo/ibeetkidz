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
import { attachUndoToast, type UndoToast } from "../undo-toast.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import { loadSpriteAssets, frameKey } from "../sprite-assets.ts";
import { alignCarBody, CAR_CONTENT_E, FRAME_SIZE } from "../car-geometry.ts";
import { YARD_SIDINGS_V2, YARD_LAYOUT_V2 } from "../scene-layout.ts";
// The pure slot arithmetic lives outside the scene so the unit suite can reach
// it — a real `import Phaser` cannot load under jsdom, and this is the math the
// palette got wrong. Re-exported: it is still the Yard's geometry.
import {
  paletteSlot,
  trainSlot,
  trainStep,
  carFitScale,
  namePlateBox,
  PALETTE_DIR,
  type SlotRect,
} from "../yard-geometry.ts";
export {
  paletteSlot,
  trainSlot,
  trainStep,
  carFitScale,
  namePlateBox,
  TALLEST_CAR_BODY,
  PALETTE_DIR,
  type SlotRect,
} from "../yard-geometry.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { loadUiSprites } from "../ui-sprites.ts";
import { spawnUiLayer, relayoutUiLayer, type UiElement } from "../ui-scene.ts";
import { decorateCar, CarNamePlate } from "../car-livery.ts";
import yardMap from "../../assets/maps/yard.json";
import type { CarType } from "../../core/types.ts";
import type { LaneGroup } from "../../core/lane-color.ts";

/** A built car in the palette (left sidings).
 *
 *  `livery` (which colour + glyph this car wears) and `cargo` (which instrument
 *  family it carries) are the two identity channels — see `core/car-identity.ts`
 *  for what decides them and `game/car-livery.ts` for what they look like. Both
 *  are DERIVED in React from the project and passed in, so the scene renders
 *  identity without owning any of the rules. */
export interface YardCar {
  readonly id: string;
  readonly livery: number;
  readonly cargo: LaneGroup | null;
  readonly name: string;
  readonly carType: CarType;
}

/** A slot in the assembled train (top line). */
export interface YardTrainCar {
  readonly instanceId: string;
  readonly partId: string;
  readonly livery: number;
  readonly cargo: LaneGroup | null;
  readonly name: string;
  readonly carType: CarType;
  readonly muted: boolean;
}

/** A car on screen: the scaled sprite token, plus its name chip — which lives
 *  OUTSIDE the token, in screen space, because anything inside inherits the
 *  token's fit scale (that is the bug that hid every label but the last). */
interface CarToken {
  readonly car: Phaser.GameObjects.Container;
  readonly plate: CarNamePlate;
}

export class YardScene extends BackgroundScene {
  static readonly KEY = "YardScene";

  private cars: YardCar[] = [];
  private train: YardTrainCar[] = [];
  private selectedId: string | null = null;
  private paletteTokens = new Map<string, CarToken>();
  private trainTokens: CarToken[] = [];
  private busy = false; // a crane/departure tween is in flight — ignore presses
  // Data-driven static chrome (yard.json): nav plaques + the interim action
  // strip, spawned by the generic Three-Zone engine. The action buttons are
  // labelled transparent hits over the strip's baked tiles until the individual
  // idle/pressed sprites land (ART_REQUESTS.md).
  private chromeSpawns: readonly TiledSpawn[] = [];
  private chrome: UiElement[] = [];

  /** The "put it back" offer. Public getter below is the e2e seam — it is how
   *  a test proves a kid can actually reach undo, which is the whole point. */
  private undoToast?: UndoToast;

  constructor() {
    super(YardScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.yard);
    // train (car bodies, top-down) + tarp atlases.
    loadSpriteAssets(this);
    this.chromeSpawns = parseTiledLayer(yardMap, "ui-layer");
    loadUiSprites(this); // the one packed chrome multiatlas
  }

  create(): void {
    this.addBackground("contain");
    this.chrome = spawnUiLayer(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      panelDepth: 1,
      hitDepth: 10,
    });
    this.rebuild();
    this.bindIntents();
    // Dev-only seam for the scene editor (`?edit`). `editorHandle` is typed
    // `unknown` on BackgroundScene, so this scene still imports nothing from
    // `src/editor/` — the dependency arrow points one way only, and the whole
    // branch is compile-time dead in a production build.
    if (import.meta.env.DEV) {
      this.editorHandle = {
        mapName: "yard",
        layerName: "ui-layer",
        spawns: this.chromeSpawns,
        relayout: () => this.layoutChrome(),
        backgroundRect: () => this.backgroundRect,
        cameraSize: () => this.scale.gameSize,
      };
    }
    // "Undo everywhere": the offer chip. React classifies destruction in its
    // one dispatch funnel and emits over the bus, so this scene needs no
    // knowledge of WHICH commands destroy anything.
    this.undoToast = attachUndoToast(this);
    this.announceReady();
  }

  /** Exposed for the e2e bridge: is the undo offer on screen, and for what. */
  get undoOffer(): { offering: boolean; lost: string } {
    return { offering: this.undoToast?.offering ?? false, lost: this.undoToast?.lost ?? "" };
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
      (token.car.getData("ring") as Phaser.GameObjects.Graphics).setVisible(cid === id);
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
    // shown side-on ('E'), matching the palette, the assembly line and the Track.
    const content = CAR_CONTENT_E[car.carType];
    const bodyH = (content[3] - content[1]) * FRAME_SIZE;
    const body = this.add.image(0, 0, "train", frameKey(car.carType, "E")).setOrigin(0.5);
    alignCarBody(body, content);
    const cable = this.add.graphics();
    cable.lineStyle(3, 0x2a2a2a, 1).lineBetween(0, -bodyH - 60, 0, -bodyH);
    cable.fillStyle(0xf2b134, 1).fillRect(-8, -bodyH - 8, 16, 12); // hook block
    const ghost = this.add.container(from.cx, from.cy, [cable, body]);
    ghost.setScale(carFitScale(from)).setDepth(20);
    this.setTokenVisible(this.paletteTokens.get(car.id), false);

    this.tweens.chain({
      targets: ghost,
      tweens: [
        { y: liftY, duration: 320, ease: "Back.easeOut" },          // hoist up
        { x: to.cx, duration: 420, ease: "Sine.easeInOut" },        // travel across
        { y: to.cy, duration: 320, ease: "Bounce.easeOut" },        // lower onto line
      ],
      onComplete: () => {
        ghost.destroy();
        this.setTokenVisible(this.paletteTokens.get(car.id), true);
        onComplete();
      },
    });
  }

  /** A car and its (separately-parented) name chip show and hide together. */
  private setTokenVisible(token: CarToken | undefined, visible: boolean): void {
    token?.car.setVisible(visible);
    token?.plate.setVisible(visible);
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
    // Chips travel with their cars — they are siblings, not children.
    const targets = this.trainTokens.flatMap((t) => [t.car, t.plate.container]);
    this.tweens.chain({
      targets,
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
      this.tweens.add({
        targets: [t.car, t.plate.container],
        alpha: { from: 1, to: 0.3 },
        yoyo: true,
        duration: 120,
        repeat: 1,
      }),
    );
  }

  protected onResize(): void {
    if (this.scene.isActive()) this.layout();
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private rebuild(): void {
    this.paletteTokens.forEach((t) => this.destroyToken(t));
    this.paletteTokens.clear();
    this.trainTokens.forEach((t) => this.destroyToken(t));
    this.trainTokens = [];

    this.cars.forEach((car) => {
      const token = this.makeCar(car, false);
      this.makePaletteInteractive(token.car, car.id, car.carType);
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

  /** Make a palette car token tap-to-select. The hit area is the car's opaque
   *  body, padded for a five-year-old's finger, in UNSCALED container coords —
   *  Phaser applies the container's own transform on hit-test, so this needs no
   *  update on relayout. Padding is 20% rather than the whole 128 px cell so two
   *  cars on neighbouring sidings cannot steal each other's taps. */
  private makePaletteInteractive(
    token: Phaser.GameObjects.Container,
    partId: string,
    carType: CarType,
  ): void {
    const [x0, y0, x1, y1] = CAR_CONTENT_E[carType];
    const w = (x1 - x0) * FRAME_SIZE;
    const h = (y1 - y0) * FRAME_SIZE;
    const padX = w * 0.2;
    const padY = h * 0.2;
    const hit = new Phaser.Geom.Rectangle(-w / 2 - padX, -h - padY, w + padX * 2, h + padY * 2);
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
    const palettePitch = r.width * YARD_SIDINGS_V2.dx;
    this.cars.forEach((car, i) => {
      const token = this.paletteTokens.get(car.id);
      if (token) this.placeToken(token, r, paletteSlot(r, i), palettePitch);
    });
    const count = Math.max(1, this.train.length);
    const trainPitch = trainStep(r, count);
    this.train.forEach((_slot, i) => {
      const token = this.trainTokens[i];
      if (token) this.placeToken(token, r, trainSlot(r, i, count), trainPitch);
    });
    this.layoutChrome();
  }

  /** Put a car on its rail and hang its name chip below, inside `pitchX`. */
  private placeToken(
    token: CarToken,
    rect: SlotRect,
    slot: { cx: number; cy: number; w: number; h: number },
    pitchX: number,
  ): void {
    token.car.setPosition(slot.cx, slot.cy).setScale(carFitScale(slot));
    const box = namePlateBox(rect, slot, pitchX);
    token.plate.layout(box.cx, box.cy, box.w, box.h, box.maxW);
  }

  // Re-anchor the data-driven chrome to the painted art after the bg refits —
  // one call into the generic engine's pure placement math.
  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    relayoutUiLayer(this.chrome, r, this.scale.gameSize);
  }

  private destroyToken(token: CarToken): void {
    token.car.destroy();
    token.plate.destroy();
  }

  /**
   * Build a car token: side-on body, selection ring, livery panel, load, and a
   * screen-space name chip.
   *
   * The identity decorations go INSIDE the container (they ride with the car,
   * through the crane tween and every relayout); the name chip stays OUTSIDE
   * it. `dir` is always `"E"` now — both the palette and the assembly line show
   * the car the same way round.
   */
  private makeCar(
    car: { name: string; carType: CarType; livery: number; cargo: LaneGroup | null },
    isTrain: boolean,
  ): CarToken {
    const dir = PALETTE_DIR;
    const content = CAR_CONTENT_E[car.carType];
    const [x0, y0, x1, y1] = content;
    const bw = (x1 - x0) * FRAME_SIZE;
    const bh = (y1 - y0) * FRAME_SIZE;

    const body = this.add.image(0, 0, "train", frameKey(car.carType, dir)).setOrigin(0.5);
    alignCarBody(body, content);

    // Ring hugs the OPAQUE body, not the 128 px cell — a box drawn on the cell
    // stands ~30 px off a flatcar on every side and reads as its own object.
    const ring = this.add.graphics();
    const pad = 5;
    ring.lineStyle(4, 0xffd166, 1).strokeRect(-bw / 2 - pad, -bh - pad, bw + pad * 2, bh + pad * 2);
    ring.setVisible(false);

    const c = this.add.container(0, 0, [ring, body]);
    c.add(decorateCar(this, content, FRAME_SIZE, car.livery, car.cargo));
    c.setData("ring", ring);
    c.setData("body", body);
    c.setDepth(isTrain ? 5 : 4);

    const plate = new CarNamePlate(this, car.name);
    // Above both car depths: a chip hanging into the pitch below its car must
    // never be swallowed by the next siding's car.
    plate.setDepth(6);
    return { car: c, plate };
  }

  /** An assembly-line car: same body, livery, load and name chip as the palette
   *  — the assembled train previously had NO identity at all, not even a bad
   *  one — plus a tarp overlay when muted. */
  private makeTrainCar(slot: YardTrainCar): CarToken {
    const token = this.makeCar(slot, true);
    if (slot.muted) {
      const [x0, y0, x1, y1] = CAR_CONTENT_E[slot.carType];
      const bw = (x1 - x0) * FRAME_SIZE;
      const bh = (y1 - y0) * FRAME_SIZE;
      const tarp = this.add.image(0, -bh / 2, "tarp", "tarp").setOrigin(0.5);
      tarp.setDisplaySize(bw * 1.05, bh * 1.05);
      token.car.add(tarp);
    }
    return token;
  }
}
