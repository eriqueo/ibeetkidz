// Track v3 — the side-scroller, GREYBOX.
//
// Not a redraw of the oval: a different premise. Eric's mechanic ("hills slow
// the tempo, a bridge adds reverb, rain adds distortion, picked live like a
// Lemmings job and applied to the next bar") is a SEQUENCE, and a ring cannot
// show sequence — on an oval half the cars always travel the opposite way
// across the screen, and "next" has no direction.
//
// So the loop is unrolled into a line: one world laid out in bar order,
// scrolling right-to-left past a fixed playhead. The ground under bar b, the
// car for bar b and the terrain applied to bar b all travel together and reach
// the playhead at the same instant. The consequence Eric asked about —
// "does a four-year-old connect a tap to a change one bar later?" — mostly
// dissolves: the hill is drawn ON the approaching ground, visibly coming.
//
// EVERY pixel here is generated (`Graphics` → `generateTexture`). No art is
// commissioned until this greybox has been played and the premise is proven —
// four art requests were filed against the oval and superseded in a single day.
//
// The arithmetic lives in `../track-scroll.ts`, Phaser-free and unit-tested.
// This file only draws.

import Phaser from "phaser";
import { EventBus } from "../EventBus.ts";
import {
  barAtPlayhead,
  bobOffset,
  parallaxOffset,
  playheadX,
  terrainSpanX,
  travelPx,
  visibleBars,
  wheelAngle,
  type ScrollView,
} from "../track-scroll.ts";
import type { TerrainKind } from "../../core/terrain.ts";

/** One car of the train, as the view needs it. */
export interface V3Car {
  readonly id: string;
  readonly livery: number;
  readonly muted: boolean;
}

/** A terrain the transport has committed to, in absolute bars. */
export interface V3TerrainRide {
  readonly kind: TerrainKind;
  readonly startBar: number;
  readonly endBar: number;
}

const W = 2560;
const H = 1440;

// Horizon bands, back to front. `rate` is relative to the rails (1.0).
const SKY_Y = 0;
const HILLS_Y = 470;
const TREES_Y = 690;
const GROUND_Y = 980; // top of the ground slab
const RAIL_Y = 1010; // where wheels touch
// The occluder fringe starts ABOVE the railhead on purpose: it has to overlap
// the wheels or it proves nothing. Law 3 wants the actor to actually disappear
// behind something — but only its bottom third, so the turning wheel stays
// legible.
const FORE_Y = 975;
// Height of the near fringe. Deliberately a STRIP, not a slab: a slab hides
// the rails, the ballast and everything drawn on them.
const FORE_H = 130;
// Terrain is a translucent COLUMN standing on the ground, spanning the bars it
// covers — not a stripe on the ballast. Two earlier placements were invisible:
// at the ground line it hid behind the cars, and below the rails it hid behind
// the fringe. A column cannot be covered by either, and it reads from across
// the room as a zone of weather you are about to ride into.
const TERRAIN_TOP_Y = 250;
const TERRAIN_LABEL_Y = 300;

const DEPTH = {
  sky: 0,
  hills: 1,
  trees: 2,
  ground: 3,
  terrain: 2.5,
  shadow: 5,
  train: 6,
  foreground: 7,
  playhead: 8,
  hud: 10,
} as const;

const CAR_W = 300;
const CAR_H = 190;
const WHEEL_R = 30;

const LIVERY = [
  0xc4453a, 0x3f7fb5, 0x4f9d54, 0xd08b2c, 0x8a5cb0, 0x2f9c9c,
  0xb5476f, 0x7a6a55, 0x5566c4, 0xd0563a, 0x3f8f6b, 0x9a4bc4,
];

const TERRAIN_PAINT: Record<TerrainKind, number> = {
  hill: 0x4f8f38,
  bridge: 0x8a7a5c,
  rain: 0x3a6fa5,
};

export class TrackV3Scene extends Phaser.Scene {
  static readonly KEY = "TrackV3Scene";

  protected ready = false;

  private view: ScrollView = { width: W, playhead: 0.28, barWidth: 640 };
  private pos = 0; // song position in ABSOLUTE bars, fed from the transport
  private moving = false;
  private cars: V3Car[] = [];
  private ride: V3TerrainRide | null = null;

  private sky?: Phaser.GameObjects.TileSprite;
  private hills?: Phaser.GameObjects.TileSprite;
  private trees?: Phaser.GameObjects.TileSprite;
  private ground?: Phaser.GameObjects.TileSprite;
  private fore?: Phaser.GameObjects.TileSprite;

  /** Car sprites are pooled per visible bar slot, not per song bar: the world
   *  is longer than the song, so bar 1 and bar 5 of a 4-bar song can both be on
   *  screen at once and each needs its own body. */
  private slots: SlotView[] = [];
  private terrainBand?: Phaser.GameObjects.Rectangle;
  private terrainLabel?: Phaser.GameObjects.Text;
  private marker?: Phaser.GameObjects.Rectangle;
  private lastPos = 0;
  private speedBars = 0; // bars per second, smoothed
  private lastAt = -1;

  preload(): void {
    makeGreyboxTextures(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#87ceeb");

    this.sky = this.add
      .tileSprite(0, SKY_Y, W, HILLS_Y, "gb-sky")
      .setOrigin(0, 0)
      .setDepth(DEPTH.sky);
    this.hills = this.add
      .tileSprite(0, HILLS_Y, W, TREES_Y - HILLS_Y + 40, "gb-hills")
      .setOrigin(0, 0)
      .setDepth(DEPTH.hills);
    this.trees = this.add
      .tileSprite(0, TREES_Y, W, GROUND_Y - TREES_Y + 40, "gb-trees")
      .setOrigin(0, 0)
      .setDepth(DEPTH.trees);
    this.ground = this.add
      .tileSprite(0, GROUND_Y, W, H - GROUND_Y, "gb-ground")
      .setOrigin(0, 0)
      .setDepth(DEPTH.ground);
    // Law 3: the actor must be able to pass BEHIND something, or the scene is a
    // decal on a photograph. This strip is drawn over the train, and it rushes
    // past faster than the rails because it is nearer the camera.
    this.fore = this.add
      .tileSprite(0, FORE_Y, W, FORE_H, "gb-foreground")
      .setOrigin(0, 0)
      .setDepth(DEPTH.foreground);

    this.terrainBand = this.add
      .rectangle(0, TERRAIN_TOP_Y, 0, GROUND_Y - TERRAIN_TOP_Y, 0xffffff, 0.38)
      .setOrigin(0, 0)
      .setDepth(DEPTH.terrain)
      .setVisible(false);
    this.terrainLabel = this.add
      .text(0, TERRAIN_LABEL_Y, "", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
        stroke: "#1a1526",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setFontSize(34)
      .setDepth(DEPTH.terrain)
      .setVisible(false);

    // The playhead: a fixed trackside post. Whatever is under it is sounding.
    const px = playheadX(this.view);
    this.marker = this.add
      .rectangle(px, 0, 6, H, 0xffe9b0, 0.55)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.playhead);
    this.add
      .text(px, 210, "NOW", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#ffe9b0",
        stroke: "#1a1526",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0)
      .setFontSize(28)
      .setDepth(DEPTH.playhead);

    this.buildTopBar();
    this.buildLegend();
    this.rebuildSlots();
    this.ready = true;
    EventBus.emit("current-scene-ready", this);
  }

  /** Nav + transport. The oval gets these from Tiled chrome, which is authored
   *  against its plate; the greybox has no plate, so it draws its own. */
  private buildTopBar(): void {
    const items: { label: string; fire: () => void }[] = [
      { label: "MAP", fire: () => void EventBus.emit("track-nav", "map") },
      { label: "RIDE", fire: () => void EventBus.emit("transport-play", "ride") },
      { label: "STOP", fire: () => void EventBus.emit("transport-stop") },
    ];
    this.add.rectangle(W / 2, 90, W, 180, 0x1a1526, 0.72).setDepth(DEPTH.hud);
    items.forEach((item, i) => {
      const cx = 220 + i * 300;
      this.pressable(
        this.add
          .rectangle(cx, 90, 250, 110, 0x3a3350, 1)
          .setDepth(DEPTH.hud + 1),
        item.fire,
      );
      this.add
        .text(cx, 90, item.label, {
          fontFamily: "'Press Start 2P', monospace",
          color: "#ffe9b0",
        })
        .setOrigin(0.5)
        .setFontSize(28)
        .setDepth(DEPTH.hud + 2);
    });
  }

  /** Armed press: pointerdown arms, pointerout cancels, pointerup fires. The
   *  oval hand-copies this rule at eleven sites; here it exists once. */
  private pressable(target: Phaser.GameObjects.Rectangle, fire: () => void): void {
    let armed = false;
    target.setInteractive({ useHandCursor: true });
    target.on("pointerdown", () => {
      armed = true;
      target.setScale(0.94);
    });
    target.on("pointerout", () => {
      armed = false;
      target.setScale(1);
    });
    target.on("pointerup", () => {
      target.setScale(1);
      if (!armed) return;
      armed = false;
      fire();
    });
  }

  /** The Lemmings job bar. Greyboxed: flat swatches, real hit areas. */
  private buildLegend(): void {
    const kinds: TerrainKind[] = ["hill", "bridge", "rain"];
    const bw = 260;
    const gap = 40;
    const total = kinds.length * bw + (kinds.length - 1) * gap;
    const x0 = (W - total) / 2;
    const y = H - 210;

    this.add
      .rectangle(W / 2, y + 90, total + 80, 220, 0x1a1526, 0.78)
      .setDepth(DEPTH.hud);

    kinds.forEach((kind, i) => {
      const cx = x0 + i * (bw + gap) + bw / 2;
      const swatch = this.add
        .rectangle(cx, y + 60, bw, 120, TERRAIN_PAINT[kind], 1)
        .setDepth(DEPTH.hud + 1);
      this.add
        .text(cx, y + 130, kind.toUpperCase(), {
          fontFamily: "'Press Start 2P', monospace",
          color: "#ffe9b0",
        })
        .setOrigin(0.5, 0)
        .setFontSize(30)
        .setDepth(DEPTH.hud + 2);

      // Law 8: the response happens THIS frame, even though the sound lands on
      // the next bar.
      this.pressable(swatch, () => void EventBus.emit("terrain-picked", kind));
    });
  }

  // ── React → scene ────────────────────────────────────────────────────────

  setCars(cars: V3Car[]): void {
    this.cars = cars;
    if (this.ready) this.rebuildSlots();
  }

  /** Absolute song position in bars, straight off the transport. */
  setSongPosition(bars: number): void {
    if (Number.isFinite(bars)) this.pos = bars;
  }

  setMoving(moving: boolean): void {
    this.moving = moving;
    if (!moving) this.speedBars = 0;
  }

  /** The transport committed a terrain to a bar span; draw it there. */
  setTerrainRide(ride: V3TerrainRide | null): void {
    this.ride = ride;
  }

  // ── frame ────────────────────────────────────────────────────────────────

  update(time: number): void {
    if (!this.ready) return;
    const dt = this.lastAt < 0 ? 0 : Math.max(0, (time - this.lastAt) / 1000);
    this.lastAt = time;
    if (dt > 0) {
      const inst = Math.abs(this.pos - this.lastPos) / dt;
      // Smooth, so one long frame does not spike every speed-scaled animation.
      this.speedBars += (inst - this.speedBars) * Math.min(1, dt * 6);
    }
    this.lastPos = this.pos;

    const dist = travelPx(this.pos, this.view);
    // Parallax. Every offset is floored to a whole pixel inside
    // `parallaxOffset` — a fractional tilePosition makes pixel art shimmer.
    if (this.sky) this.sky.tilePositionX = parallaxOffset(this.pos, this.view, 0.05);
    if (this.hills) this.hills.tilePositionX = parallaxOffset(this.pos, this.view, 0.18);
    if (this.trees) this.trees.tilePositionX = parallaxOffset(this.pos, this.view, 0.42);
    if (this.ground) this.ground.tilePositionX = parallaxOffset(this.pos, this.view, 1);
    if (this.fore) this.fore.tilePositionX = parallaxOffset(this.pos, this.view, 1.45);

    // The playhead is bright while the song is running and dim when it is not,
    // so a stopped ride reads as stopped rather than as broken.
    this.marker?.setFillStyle(0xffe9b0, this.moving ? 0.75 : 0.25);

    this.layoutTrain(dist);
    this.layoutTerrain();
  }

  private layoutTrain(dist: number): void {
    const total = this.cars.length;
    if (total === 0) {
      for (const s of this.slots) s.root.setVisible(false);
      return;
    }
    const slots = visibleBars(this.pos, total, this.view);
    const sounding = barAtPlayhead(this.pos);
    const bob = bobOffset(dist, this.speedBars);
    const angle = wheelAngle(dist, WHEEL_R);

    this.slots.forEach((s, i) => {
      const slot = slots[i];
      if (!slot) {
        s.root.setVisible(false);
        return;
      }
      const car = this.cars[slot.songBar];
      if (!car) {
        s.root.setVisible(false);
        return;
      }
      s.root.setVisible(true);
      s.root.setPosition(Math.round(slot.centreX), Math.round(RAIL_Y + bob));
      s.body.setFillStyle(LIVERY[car.livery % LIVERY.length]!, car.muted ? 0.35 : 1);
      // Law 4: the wheels turn because the world moved, not because time passed.
      s.wheelA.setRotation(angle);
      s.wheelB.setRotation(angle);
      // The sounding bar is a palette change, not new art (the era's technique).
      const isNow = slot.absBar === sounding;
      s.roof.setFillStyle(isNow ? 0xffe9b0 : 0x2b2440, 1);
      s.label.setText(String(slot.songBar + 1));
      // Law 2: the shadow is the only thing that says where the base meets the
      // ground. It tightens as the body lifts.
      s.shadow.setPosition(Math.round(slot.centreX), RAIL_Y + 34);
      s.shadow.setScale(1 - Math.abs(bob) / 60, 1);
    });
  }

  private layoutTerrain(): void {
    const band = this.terrainBand;
    const label = this.terrainLabel;
    if (!band || !label) return;
    const ride = this.ride;
    if (!ride) {
      band.setVisible(false);
      label.setVisible(false);
      return;
    }
    const span = terrainSpanX(ride.startBar, ride.endBar, this.pos, this.view);
    if (!span || span.width <= 0) {
      band.setVisible(false);
      label.setVisible(false);
      return;
    }
    band.setVisible(true).setPosition(Math.round(span.x), TERRAIN_TOP_Y);
    band.setSize(Math.round(span.width), GROUND_Y - TERRAIN_TOP_Y);
    band.setFillStyle(TERRAIN_PAINT[ride.kind], 0.38);
    label
      .setVisible(true)
      .setPosition(Math.round(span.x + span.width / 2), TERRAIN_LABEL_Y)
      .setText(ride.kind.toUpperCase());
  }

  /** Read-only geometry for tests. A screenshot cannot test speed-scaling or
   *  whether the terrain is drawn AHEAD of the playhead; this can. */
  debugState(): {
    pos: number;
    playheadX: number;
    wheelAngle: number;
    soundingCarX: number | null;
    terrain: { x: number; width: number; kind: string } | null;
  } {
    const dist = travelPx(this.pos, this.view);
    const sounding = barAtPlayhead(this.pos);
    const slots = visibleBars(this.pos, Math.max(1, this.cars.length), this.view);
    const now = slots.find((s) => s.absBar === sounding);
    const span = this.ride
      ? terrainSpanX(this.ride.startBar, this.ride.endBar, this.pos, this.view)
      : null;
    return {
      pos: this.pos,
      playheadX: playheadX(this.view),
      wheelAngle: wheelAngle(dist, WHEEL_R),
      soundingCarX: now ? now.centreX : null,
      terrain: span && this.ride ? { ...span, kind: this.ride.kind } : null,
    };
  }

  /** One pooled body per visible slot; the pool only grows. */
  private rebuildSlots(): void {
    const needed = visibleBars(0, Math.max(1, this.cars.length), this.view).length + 2;
    while (this.slots.length < needed) this.slots.push(this.makeSlot());
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i]!.root.setVisible(i < needed);
    }
  }

  private makeSlot(): SlotView {
    const shadow = this.add
      .ellipse(0, 0, CAR_W * 0.92, 34, 0x000000, 0.32)
      .setDepth(DEPTH.shadow);
    const root = this.add.container(0, 0).setDepth(DEPTH.train);
    const body = this.add.rectangle(0, -CAR_H / 2, CAR_W, CAR_H, 0xc4453a, 1);
    const roof = this.add.rectangle(0, -CAR_H - 10, CAR_W * 0.86, 26, 0x2b2440, 1);
    const wheelA = this.add.image(-CAR_W * 0.28, -WHEEL_R, "gb-wheel");
    const wheelB = this.add.image(CAR_W * 0.28, -WHEEL_R, "gb-wheel");
    const label = this.add
      .text(0, -CAR_H / 2 - 18, "1", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#1a1526",
      })
      .setOrigin(0.5)
      .setFontSize(40);
    root.add([body, roof, wheelA, wheelB, label]);
    return { root, body, roof, wheelA, wheelB, label, shadow };
  }
}

interface SlotView {
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Rectangle;
  readonly roof: Phaser.GameObjects.Rectangle;
  readonly wheelA: Phaser.GameObjects.Image;
  readonly wheelB: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  readonly shadow: Phaser.GameObjects.Ellipse;
}

/**
 * Every texture the greybox needs, drawn at runtime. Nothing here is art — it
 * is the shape of the scene, so the premise can be judged before a single
 * sprite is commissioned.
 */
function makeGreyboxTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key: string, w: number, h: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  tex("gb-sky", 512, 512, () => {
    g.fillStyle(0x87ceeb, 1).fillRect(0, 0, 512, 512);
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(120, 120, 220, 80);
    g.fillEllipse(360, 210, 170, 60);
  });

  // Receding planes desaturate and lose contrast — atmospheric perspective is
  // what makes a STATIC frame read as deep. Parallax only amplifies depth; it
  // cannot create it.
  tex("gb-hills", 640, 300, () => {
    g.fillStyle(0x9db8a0, 1);
    for (let i = 0; i < 5; i++) {
      g.fillEllipse(i * 160, 250, 360, 300);
    }
  });

  tex("gb-trees", 480, 320, () => {
    g.fillStyle(0x4f7a4a, 1);
    for (let i = 0; i < 6; i++) {
      const x = i * 80 + 40;
      g.fillTriangle(x - 34, 250, x + 34, 250, x, 90);
    }
    g.fillStyle(0x3d6b3a, 1).fillRect(0, 245, 480, 75);
  });

  // Ground slab with sleepers and a rail line, so travel is legible.
  tex("gb-ground", 320, 460, () => {
    g.fillStyle(0x6f9440, 1).fillRect(0, 0, 320, 460);
    g.fillStyle(0x8a7355, 1).fillRect(0, 22, 320, 60);
    g.fillStyle(0x5d4a36, 1);
    for (let i = 0; i < 8; i++) g.fillRect(i * 40 + 6, 26, 22, 52);
    g.fillStyle(0xb9b9c4, 1).fillRect(0, 24, 320, 8);
    g.fillStyle(0x5f8438, 1).fillRect(0, 96, 320, 364);
  });

  // Foreground occluder: the train draws BEHIND this.
  tex("gb-foreground", 360, FORE_H, () => {
    g.fillStyle(0x24421f, 1).fillRect(0, 70, 360, FORE_H - 70);
    // Tips at the very top of the texture, so placing it at FORE_Y puts the
    // fringe IN FRONT of the wheels rather than safely below them.
    g.fillStyle(0x2f5230, 1);
    for (let i = 0; i < 18; i++) {
      const x = i * 20 + 8;
      g.fillTriangle(x - 11, 78, x + 11, 78, x, 2);
    }
  });

  tex("gb-wheel", WHEEL_R * 2, WHEEL_R * 2, () => {
    g.fillStyle(0x2b2440, 1).fillCircle(WHEEL_R, WHEEL_R, WHEEL_R);
    g.fillStyle(0xb9b9c4, 1).fillCircle(WHEEL_R, WHEEL_R, WHEEL_R * 0.36);
    // A spoke, so rotation is actually visible on a circle.
    g.fillStyle(0xb9b9c4, 1).fillRect(WHEEL_R - 3, 4, 6, WHEEL_R * 0.8);
  });

  g.destroy();
}
