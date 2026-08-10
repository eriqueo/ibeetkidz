// Track v3 — the side-scroller.
//
// Not a redraw of the oval: a different premise. Eric's mechanic ("hills slow
// the tempo, a bridge adds reverb, rain adds distortion, picked live like a
// Lemmings job and applied to the next bar") is a SEQUENCE, and a ring cannot
// show sequence — on an oval half the cars always travel the opposite way
// across the screen, and "next" has no direction.
//
// So the loop is unrolled into a line: one world laid out in bar order,
// scrolling right-to-left past a fixed playhead. The ground under bar b, the car
// for bar b and the terrain applied to bar b all travel together and reach the
// playhead at the same instant, so the next bar's terrain is drawn ON the
// approaching ground, visibly coming.
//
// ── TERRAIN IS GEOMETRY ────────────────────────────────────────────────────
// A hill really lifts the rails and the train really climbs it, nose-up on the
// way and nose-down off the back. A bridge is a real deck over a real gap. Rain
// is real weather in a moving shaft. All three read `../terrain-profile.ts`,
// which is the SINGLE source of truth for a terrain's shape: the greybox texture
// is generated from it, the train's height is it, and the train's tilt is it
// differentiated. Nothing here draws a silhouette of its own.
//
// ── SWAPPING THE ART ───────────────────────────────────────────────────────
// Every texture is declared once in `ART_SLOTS` below with the key it will live
// under and the generator that stands in until real art exists. `preload` skips
// the generator for any key already in the TextureManager, so shipping art is:
//
//   1. add the file to `src/game/assets.ts`,
//   2. load it under the SAME key in `preload`,
//   3. delete nothing — the generator simply stops being called.
//
// The one contract art must honour is the profile: a hill sprite has to match
// `liftSamples`, or the train will float above it or sink into it exactly the
// way the oval did. That is why the greybox mound is drawn FROM that function
// rather than eyeballed — the brief for the artist is a curve, not a vibe.

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
import {
  BRIDGE_GAP,
  HILL_PEAK,
  carPose,
  groundDrop,
  liftSamples,
  type TerrainSpan,
} from "../terrain-profile.ts";
import { colorFor, hexToInt, inkOnCss } from "../livery-style.ts";
import type { TerrainKind } from "../../core/terrain.ts";

/** One car of the train, as the view needs it. Mirrors `core.CarIdentity` —
 *  the same numbers the Workshop LCD and the Yard sidings show. */
export interface V3Car {
  readonly id: string;
  /** The car's spoken name: "car 3". Stable across every view. */
  readonly number: number;
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

// Horizon bands, back to front.
const SKY_Y = 0;
const HILLS_Y = 470;
const TREES_Y = 690;
const GROUND_Y = 980; // top of the ground slab
const RAIL_Y = 1010; // where wheels touch on FLAT ground
const FORE_Y = 975;
const FORE_H = 130;
const TERRAIN_LABEL_Y = 330;

/** Reference width every terrain texture is drawn at before being stretched to
 *  its span. Height is NEVER scaled — the profile is normalized across the span
 *  in x but absolute in y, so stretching horizontally keeps picture and physics
 *  in agreement. */
const TERRAIN_REF_W = 1024;

const DEPTH = {
  sky: 0,
  hills: 1,
  trees: 2,
  ground: 3,
  mound: 3.5, // a hill: the train stands ON it
  shadow: 5,
  train: 6,
  foreground: 7,
  // A bridge means there is no ground and no grass here, so both its void and
  // its structure draw IN FRONT of the near fringe — otherwise the fringe (a
  // full-width strip that cannot have a hole punched in it) covers the whole
  // thing, which is exactly how the first pass shipped an invisible bridge.
  gap: 7.05,
  deck: 7.1,
  rain: 7.5,
  playhead: 8,
  hud: 10,
} as const;

const CAR_W = 300;
/** Distance between the axles, as a fraction of a bar. The car is 300 px wide
 *  with its wheels at ±28% of that, in a 640 px bar. */
const WHEELBASE_BARS = (CAR_W * 0.56) / 640;
const CAR_H = 190;
const WHEEL_R = 30;

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

  private slots: SlotView[] = [];
  private mound?: Phaser.GameObjects.Image;
  private deck?: Phaser.GameObjects.Image;
  private gap?: Phaser.GameObjects.Rectangle;
  /** Rain is a fast-scrolling streak sheet clipped to its bar span, not a
   *  particle emitter. Deterministic, no RNG (`Math.random` is banned in src/
   *  and view jitter does not earn an RngPort), and one object instead of
   *  hundreds — for a shaft of rain seen for two bars the read is identical. */
  private rainSheet?: Phaser.GameObjects.TileSprite;
  private gloom?: Phaser.GameObjects.Rectangle;
  private terrainLabel?: Phaser.GameObjects.Text;
  private marker?: Phaser.GameObjects.Rectangle;
  private nowBand?: Phaser.GameObjects.Rectangle;
  private lastPos = 0;
  private speedBars = 0; // bars per second, smoothed
  private lastAt = -1;

  preload(): void {
    makeGreyboxTextures(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#87ceeb");

    this.sky = this.add
      .tileSprite(0, SKY_Y, W, HILLS_Y, "trk-sky")
      .setOrigin(0, 0)
      .setDepth(DEPTH.sky);
    this.hills = this.add
      .tileSprite(0, HILLS_Y, W, TREES_Y - HILLS_Y + 40, "trk-hills")
      .setOrigin(0, 0)
      .setDepth(DEPTH.hills);
    this.trees = this.add
      .tileSprite(0, TREES_Y, W, GROUND_Y - TREES_Y + 40, "trk-trees")
      .setOrigin(0, 0)
      .setDepth(DEPTH.trees);
    this.ground = this.add
      .tileSprite(0, GROUND_Y, W, H - GROUND_Y, "trk-ground")
      .setOrigin(0, 0)
      .setDepth(DEPTH.ground);
    // Law 3: the actor must be able to pass BEHIND something, or the scene is a
    // decal on a photograph. A strip, not a slab — a slab hides the rails.
    this.fore = this.add
      .tileSprite(0, FORE_Y, W, FORE_H, "trk-foreground")
      .setOrigin(0, 0)
      .setDepth(DEPTH.foreground);

    // ── terrain bodies, all hidden until a ride commits one ─────────────────
    this.gap = this.add
      .rectangle(0, GROUND_Y, 0, BRIDGE_GAP, 0x1d2b3a, 1)
      .setOrigin(0, 0)
      .setDepth(DEPTH.gap)
      .setVisible(false);
    this.mound = this.add
      // Anchored to the RAILHEAD, not the ground line. The profile measures lift
      // from where the wheels touch, so a mound based 30 px lower puts its crest
      // 30 px above the car that is supposed to be standing on it.
      .image(0, RAIL_Y, "trk-mound")
      .setOrigin(0, 1)
      .setDepth(DEPTH.mound)
      .setVisible(false);
    this.deck = this.add
      .image(0, RAIL_Y, "trk-bridge")
      .setOrigin(0, 0)
      .setDepth(DEPTH.deck)
      .setVisible(false);
    this.gloom = this.add
      .rectangle(0, 0, 0, GROUND_Y, 0x24303f, 0.34)
      .setOrigin(0, 0)
      .setDepth(DEPTH.rain - 0.1)
      .setVisible(false);
    this.rainSheet = this.add
      .tileSprite(0, 0, 10, GROUND_Y, "trk-rain")
      .setOrigin(0, 0)
      .setDepth(DEPTH.rain)
      .setAlpha(0.75)
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
      .setDepth(DEPTH.playhead)
      .setVisible(false);

    // The playhead is a BAND one bar wide, not a hairline.
    //
    // A line marks a boundary, and cars are drawn in the MIDDLE of their bar —
    // so for most of every bar the line pointed at the gap between two cars
    // while a third was lit. The band is the bar itself: whatever is inside it
    // is what you are hearing, which is the "different from a loop" indicator
    // the mechanic was asked for.
    const px = playheadX(this.view);
    this.nowBand = this.add
      .rectangle(px, 0, this.view.barWidth, H, 0xffe9b0, 0.13)
      .setOrigin(0, 0)
      .setDepth(DEPTH.playhead - 0.1);
    this.marker = this.add
      .rectangle(px, 0, 5, H, 0xffe9b0, 0.55)
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

  /** Nav + transport. The oval gets these from Tiled chrome authored against its
   *  plate; the greybox has no plate, so it draws its own. */
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
        this.add.rectangle(cx, 90, 250, 110, 0x3a3350, 1).setDepth(DEPTH.hud + 1),
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

  /** The Lemmings job bar. */
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

  /** The transport committed a terrain to a bar span; build it there. */
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

    // Parallax. Every offset is floored to a whole pixel inside
    // `parallaxOffset` — a fractional tilePosition makes pixel art shimmer.
    if (this.sky) this.sky.tilePositionX = parallaxOffset(this.pos, this.view, 0.05);
    if (this.hills) this.hills.tilePositionX = parallaxOffset(this.pos, this.view, 0.18);
    if (this.trees) this.trees.tilePositionX = parallaxOffset(this.pos, this.view, 0.42);
    if (this.ground) this.ground.tilePositionX = parallaxOffset(this.pos, this.view, 1);
    if (this.fore) this.fore.tilePositionX = parallaxOffset(this.pos, this.view, 1.45);

    this.marker?.setFillStyle(0xffe9b0, this.moving ? 0.75 : 0.25);
    this.nowBand?.setFillStyle(0xffe9b0, this.moving ? 0.16 : 0.06);

    this.layoutTerrain();
    this.layoutTrain(travelPx(this.pos, this.view));
  }

  private get span(): TerrainSpan | null {
    return this.ride;
  }

  private layoutTrain(dist: number): void {
    const total = this.cars.length;
    if (total === 0) {
      for (const s of this.slots) s.hide();
      return;
    }
    const slots = visibleBars(this.pos, total, this.view);
    const sounding = barAtPlayhead(this.pos);
    const bob = bobOffset(dist, this.speedBars);
    const angle = wheelAngle(dist, WHEEL_R);
    const span = this.span;

    this.slots.forEach((s, i) => {
      const slot = slots[i];
      const car = slot ? this.cars[slot.songBar] : undefined;
      if (!slot || !car) {
        s.hide();
        return;
      }
      // Posed off BOTH wheels, not off the car's middle: a rigid body on a
      // curved surface cannot be placed from one sample without hovering over
      // crests and cutting into dips.
      const atBar = slot.absBar + 0.5;
      const { lift, angle: tilt } = carPose(
        atBar, WHEELBASE_BARS, span, this.view.barWidth,
      );
      const y = Math.round(RAIL_Y - lift + bob);

      s.show();
      s.root.setPosition(Math.round(slot.centreX), y);
      s.root.setRotation(tilt);
      s.body.setFillStyle(hexToInt(colorFor(car.livery)), car.muted ? 0.35 : 1);
      s.label.setText(String(car.number));
      s.label.setColor(inkOnCss(colorFor(car.livery)));
      // Law 4: the wheels turn because the world moved, not because time passed.
      s.wheelA.setRotation(angle);
      s.wheelB.setRotation(angle);
      // The sounding bar is a palette change, not new art (the era's technique).
      s.roof.setFillStyle(slot.absBar === sounding ? 0xffe9b0 : 0x2b2440, 1);
      // Law 2: the shadow says where the base meets the ground, so it has to
      // ride the LIFTED surface too, and tighten as the body bounces off it.
      s.shadow.setPosition(Math.round(slot.centreX), Math.round(RAIL_Y - lift + 34));
      s.shadow.setRotation(tilt);
      s.shadow.setScale(1 - Math.abs(bob) / 60, 1);
    });
  }

  private layoutTerrain(): void {
    const ride = this.ride;
    const span = ride
      ? terrainSpanX(ride.startBar, ride.endBar, this.pos, this.view)
      : null;

    if (!ride || !span || span.width <= 0) {
      this.mound?.setVisible(false);
      this.deck?.setVisible(false);
      this.gap?.setVisible(false);
      this.gloom?.setVisible(false);
      this.rainSheet?.setVisible(false);
      this.terrainLabel?.setVisible(false);
      return;
    }

    const x = Math.round(span.x);
    const w = Math.round(span.width);

    // Keep the caption over its own span but inside the screen, so a terrain
    // half off the edge still reads instead of leaving a stray letter behind.
    const label = this.terrainLabel;
    if (label) {
      label.setText(ride.kind.toUpperCase()).setVisible(true);
      const halfText = label.width / 2 + 20;
      const wanted = span.x + span.width / 2;
      const lo = Math.max(halfText, span.x + halfText);
      const hi = Math.min(W - halfText, span.x + span.width - halfText);
      label.setPosition(
        Math.round(hi >= lo ? Math.min(hi, Math.max(lo, wanted)) : wanted),
        TERRAIN_LABEL_Y,
      );
    }

    // A hill: a real mound the train stands on. Stretched in x only — the
    // profile is normalized across the span, so the silhouette still matches
    // `railLift` at every point.
    const isHill = ride.kind === "hill";
    this.mound?.setVisible(isHill);
    if (isHill && this.mound) {
      this.mound.setPosition(x, RAIL_Y);
      this.mound.setDisplaySize(w, HILL_PEAK);
    }

    // A bridge: the ground falls away and a deck carries the rails across it.
    const isBridge = ride.kind === "bridge";
    this.gap?.setVisible(isBridge);
    this.deck?.setVisible(isBridge);
    if (isBridge && this.gap && this.deck) {
      // Inset by the shoulder so the dark gap starts where the ground actually
      // drops, rather than squarely at the bar line.
      const drop = groundDrop((ride.startBar + ride.endBar) / 2, ride);
      this.gap.setPosition(x, RAIL_Y + 26);
      this.gap.setSize(w, Math.max(1, drop));
      // Girder immediately under the wheels, piers hanging into the void.
      this.deck.setPosition(x, RAIL_Y);
      this.deck.setDisplaySize(w, 170);
    }

    // Rain: weather in a moving shaft, plus the sky going over.
    const isRain = ride.kind === "rain";
    this.gloom?.setVisible(isRain);
    if (isRain && this.gloom) {
      this.gloom.setPosition(x, 0);
      this.gloom.setSize(w, GROUND_Y);
    }
    this.rainSheet?.setVisible(isRain);
    if (isRain && this.rainSheet) {
      this.rainSheet.setPosition(x, 0);
      this.rainSheet.setSize(w, GROUND_Y);
      // Falls fast and drifts with the world, so it belongs to the scene rather
      // than sitting on the glass in front of it.
      this.rainSheet.tilePositionY = Math.floor(this.time.now * 2.2);
      this.rainSheet.tilePositionX = parallaxOffset(this.pos, this.view, 1);
    }
  }

  /** Read-only geometry for tests. A screenshot cannot test speed-scaling, or
   *  whether the train is standing ON the hill it is drawn over. */
  debugState(): {
    pos: number;
    playheadX: number;
    wheelAngle: number;
    soundingCarX: number | null;
    soundingCarY: number | null;
    soundingCarAngle: number;
    terrain: { x: number; width: number; kind: string } | null;
  } {
    const dist = travelPx(this.pos, this.view);
    const sounding = barAtPlayhead(this.pos);
    const slots = visibleBars(this.pos, Math.max(1, this.cars.length), this.view);
    const now = slots.find((s) => s.absBar === sounding);
    const atBar = sounding + 0.5;
    const pose = carPose(atBar, WHEELBASE_BARS, this.span, this.view.barWidth);
    const span = this.ride
      ? terrainSpanX(this.ride.startBar, this.ride.endBar, this.pos, this.view)
      : null;
    return {
      pos: this.pos,
      playheadX: playheadX(this.view),
      wheelAngle: wheelAngle(dist, WHEEL_R),
      soundingCarX: now ? now.centreX : null,
      soundingCarY: now ? RAIL_Y - pose.lift : null,
      soundingCarAngle: pose.angle,
      terrain: span && this.ride ? { ...span, kind: this.ride.kind } : null,
    };
  }

  /** One pooled body per visible slot; the pool only grows. */
  private rebuildSlots(): void {
    const needed = visibleBars(0, Math.max(1, this.cars.length), this.view).length + 2;
    while (this.slots.length < needed) this.slots.push(this.makeSlot());
    for (let i = 0; i < this.slots.length; i++) {
      if (i >= needed) this.slots[i]!.hide();
    }
  }

  private makeSlot(): SlotView {
    const shadow = this.add
      .ellipse(0, 0, CAR_W * 0.92, 34, 0x000000, 0.32)
      .setDepth(DEPTH.shadow);
    const root = this.add.container(0, 0).setDepth(DEPTH.train);
    const body = this.add.rectangle(0, -CAR_H / 2, CAR_W, CAR_H, 0xc4453a, 1);
    const roof = this.add.rectangle(0, -CAR_H - 10, CAR_W * 0.86, 26, 0x2b2440, 1);
    const wheelA = this.add.image(-CAR_W * 0.28, -WHEEL_R, "trk-wheel");
    const wheelB = this.add.image(CAR_W * 0.28, -WHEEL_R, "trk-wheel");
    const label = this.add
      .text(0, -CAR_H / 2, "1", {
        fontFamily: "'Press Start 2P', monospace",
        color: "#1a1526",
      })
      .setOrigin(0.5)
      .setFontSize(64);
    root.add([body, roof, wheelA, wheelB, label]);
    const view: SlotView = {
      root, body, roof, wheelA, wheelB, label, shadow,
      show: () => {
        root.setVisible(true);
        shadow.setVisible(true);
      },
      hide: () => {
        root.setVisible(false);
        shadow.setVisible(false);
      },
    };
    view.hide();
    return view;
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
  readonly show: () => void;
  readonly hide: () => void;
}

/**
 * Every texture the scene needs, drawn at runtime.
 *
 * `tex` early-returns when the key already exists, which IS the art-swap seam:
 * load a real texture under the same key in `preload` and the generator below
 * never runs. Nothing else in the file refers to "greybox".
 */
function makeGreyboxTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key: string, w: number, h: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return; // real art wins
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  tex("trk-sky", 512, 512, () => {
    g.fillStyle(0x87ceeb, 1).fillRect(0, 0, 512, 512);
    g.fillStyle(0xffffff, 0.85);
    g.fillEllipse(120, 120, 220, 80);
    g.fillEllipse(360, 210, 170, 60);
  });

  // Receding planes desaturate and lose contrast — atmospheric perspective is
  // what makes a STATIC frame read as deep. Parallax amplifies depth; it cannot
  // create it.
  tex("trk-hills", 640, 300, () => {
    g.fillStyle(0x9db8a0, 1);
    for (let i = 0; i < 5; i++) g.fillEllipse(i * 160, 250, 360, 300);
  });

  tex("trk-trees", 480, 320, () => {
    g.fillStyle(0x4f7a4a, 1);
    for (let i = 0; i < 6; i++) {
      const x = i * 80 + 40;
      g.fillTriangle(x - 34, 250, x + 34, 250, x, 90);
    }
    g.fillStyle(0x3d6b3a, 1).fillRect(0, 245, 480, 75);
  });

  tex("trk-ground", 320, 460, () => {
    g.fillStyle(0x6f9440, 1).fillRect(0, 0, 320, 460);
    g.fillStyle(0x8a7355, 1).fillRect(0, 22, 320, 60);
    g.fillStyle(0x5d4a36, 1);
    for (let i = 0; i < 8; i++) g.fillRect(i * 40 + 6, 26, 22, 52);
    g.fillStyle(0xb9b9c4, 1).fillRect(0, 24, 320, 8);
    g.fillStyle(0x5f8438, 1).fillRect(0, 96, 320, 364);
  });

  tex("trk-foreground", 360, FORE_H, () => {
    g.fillStyle(0x24421f, 1).fillRect(0, 70, 360, FORE_H - 70);
    g.fillStyle(0x2f5230, 1);
    for (let i = 0; i < 18; i++) {
      const x = i * 20 + 8;
      g.fillTriangle(x - 11, 78, x + 11, 78, x, 2);
    }
  });

  // THE MOUND IS DRAWN FROM THE PROFILE. Not an approximation of it — the same
  // samples the train's height is read from. This is the contract real art has
  // to honour, and drawing it this way is how the greybox proves it is possible.
  tex("trk-mound", TERRAIN_REF_W, HILL_PEAK, () => {
    const samples = liftSamples(
      { kind: "hill", startBar: 0, endBar: 1 },
      TERRAIN_REF_W / 8,
    );
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, HILL_PEAK)];
    samples.forEach((lift, i) => {
      const x = (i / (samples.length - 1)) * TERRAIN_REF_W;
      pts.push(new Phaser.Math.Vector2(x, HILL_PEAK - lift));
    });
    pts.push(new Phaser.Math.Vector2(TERRAIN_REF_W, HILL_PEAK));
    g.fillStyle(0x5f8438, 1).fillPoints(pts, true);
    // A rail line following the crest, so the surface reads as track.
    g.lineStyle(7, 0x8a7355, 1).strokePoints(pts.slice(1, -1), false);
  });

  tex("trk-bridge", TERRAIN_REF_W, 150, () => {
    g.fillStyle(0x6b5334, 1).fillRect(0, 0, TERRAIN_REF_W, 26); // deck
    g.fillStyle(0x8a7a5c, 1);
    for (let i = 0; i < 26; i++) g.fillRect(i * 40 + 6, 26, 12, 124); // piers
    g.fillStyle(0x5b4529, 1).fillRect(0, 92, TERRAIN_REF_W, 14); // cross brace
  });

  // Diagonal streaks that tile seamlessly in both axes: each streak is drawn
  // twice, offset by the tile size, so the wrap has no seam.
  tex("trk-rain", 128, 128, () => {
    g.fillStyle(0xbcd8f0, 0.9);
    for (let i = 0; i < 7; i++) {
      const x = i * 18;
      for (const dy of [-128, 0]) {
        g.fillTriangle(x, dy, x + 4, dy, x - 14, dy + 128);
        g.fillTriangle(x + 4, dy, x - 10, dy + 128, x - 14, dy + 128);
      }
    }
  });

  tex("trk-wheel", WHEEL_R * 2, WHEEL_R * 2, () => {
    g.fillStyle(0x2b2440, 1).fillCircle(WHEEL_R, WHEEL_R, WHEEL_R);
    g.fillStyle(0xb9b9c4, 1).fillCircle(WHEEL_R, WHEEL_R, WHEEL_R * 0.36);
    // A spoke, so rotation is actually visible on a circle.
    g.fillStyle(0xb9b9c4, 1).fillRect(WHEEL_R - 3, 4, 6, WHEEL_R * 0.8);
  });

  g.destroy();
}
