// The VIEW half of car identity — "livery + load" drawn onto a Phaser car token.
//
// `src/core/car-identity.ts` decides WHAT a car is (which livery index, which
// instrument family it carries). This module decides what that LOOKS like, and
// it is the only place that knows either an atlas frame name or a shape.
//
// Three redundant channels, in decreasing size and increasing precision:
//
//   1. SILHOUETTE — the `carType` the kid picked at NEW CAR. Free; already
//      drawn by the scene. Four genuinely different shapes and heights.
//   2. LOAD — an `inst-*` character riding on the car's roof, derived from the
//      car's own lanes. A drum car visibly carries drums; an empty car carries
//      nothing, which is true and is a call to action.
//   3. LIVERY — a flat colour panel with a shape glyph, painted on the car's
//      flank like a road number. Unique per car; the tiebreak for two cars
//      holding the same kind of sound.
//
// PAINTED, NEVER TINTED. `setTint` is a multiply and this atlas is dark brown:
// measured over the opaque pixels of `boxcar-S`, every car colour multiplies to
// a peak channel of ≤61/255 and four of five read as "dark thing". The panel is
// an opaque flat fill drawn OVER the body — the charter's own UI language (flat
// fill, 1 px dark-plum outline) — so the hue survives the plate underneath it.
//
// Shape and colour always move together: either channel alone names a car, so
// the scheme still works for the ~1-in-12 boys with a colour vision deficiency,
// and at sizes where hue washes out.
import Phaser from "phaser";
import type { LaneGroup } from "../core/lane-color.ts";
import { UI_ATLAS_KEY, UI_SPRITES, placeUiSprite } from "./ui-sprites.ts";
import type { CarContentBox } from "./car-geometry.ts";
import {
  CHIP_EDGE,
  CHIP_EDGE_CSS,
  CHIP_FACE,
  LANE_GROUP_SPRITE,
  colorFor,
  glyphFor,
  hexToInt,
  inkOn,
  type LiveryGlyph,
} from "./livery-style.ts";

/** Draw `glyph` centred on (cx, cy) at radius `r`, filled `fill`. */
export function drawGlyph(
  g: Phaser.GameObjects.Graphics,
  glyph: LiveryGlyph,
  cx: number,
  cy: number,
  r: number,
  fill: number,
): void {
  g.fillStyle(fill, 1);
  const poly = (points: readonly { x: number; y: number }[]): void => {
    g.fillPoints(points.map((p) => new Phaser.Math.Vector2(cx + p.x, cy + p.y)), true);
  };
  const ring = (n: number, rot: number, radius = r): { x: number; y: number }[] =>
    Array.from({ length: n }, (_, i) => {
      const a = rot + (i * Math.PI * 2) / n;
      return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
    });

  switch (glyph) {
    case "circle":
      g.fillCircle(cx, cy, r);
      return;
    case "square":
      g.fillRect(cx - r * 0.82, cy - r * 0.82, r * 1.64, r * 1.64);
      return;
    case "triangle":
      poly(ring(3, -Math.PI / 2));
      return;
    case "diamond":
      poly(ring(4, -Math.PI / 2));
      return;
    case "hexagon":
      poly(ring(6, -Math.PI / 2));
      return;
    case "star": {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.45;
        pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
      }
      poly(pts);
      return;
    }
    case "plus": {
      const t = r * 0.36;
      g.fillRect(cx - t, cy - r, t * 2, r * 2);
      g.fillRect(cx - r, cy - t, r * 2, t * 2);
      return;
    }
    case "ring":
      // Annulus: a thick stroked circle, so it cannot be confused with `circle`
      // even in a monochrome photocopy of the screen.
      g.lineStyle(r * 0.62, fill, 1).strokeCircle(cx, cy, r * 0.68);
      return;
  }
}

/**
 * Paint the livery panel on a car body's flank and put its load on the roof.
 *
 * `content` is the body's opaque box (`CAR_CONTENT_E`) in normalized frame
 * units, and everything is positioned against THAT rather than the 128 px atlas
 * cell — a flatcar's deck is 71 px tall and sits 28 px down the cell, so a load
 * placed against the cell would float above it and a panel would land on its
 * wheels.
 *
 * Both objects are added to the car's own container, so they ride with it: they
 * scale when the car scales, travel with the crane tween, and are destroyed
 * with it.
 *
 * Returns the objects it added, in draw order.
 */
export function decorateCar(
  scene: Phaser.Scene,
  content: CarContentBox,
  frameSize: number,
  liveryIndex: number,
  cargo: LaneGroup | null,
): Phaser.GameObjects.GameObject[] {
  const [x0, y0, x1, y1] = content;
  // Body box in container coords. `alignCarBody` puts the content's horizontal
  // centre at x = 0 and its BOTTOM edge — the wheels — at y = 0, so the body
  // occupies (-w/2 … w/2) × (-h … 0) whatever the car type is.
  const w = (x1 - x0) * frameSize;
  const h = (y1 - y0) * frameSize;
  const out: Phaser.GameObjects.GameObject[] = [];

  // ── the load, riding on the roof ────────────────────────────────────────
  // Placed first so the livery panel wins any overlap: the panel is the channel
  // that must never be ambiguous.
  if (cargo) {
    const def = UI_SPRITES[LANE_GROUP_SPRITE[cargo]];
    if (def) {
      const size = h * 0.62;
      const img = scene.add.image(0, 0, UI_ATLAS_KEY, def.states[def.base] ?? def.base);
      // Sits ON the roof, sunk far enough into it to read as CARRIED rather
      // than as floating chrome — and far enough that its top stays inside the
      // siding pitch, clear of the name chip hanging off the car above.
      placeUiSprite(img, def, { x: 0, y: -h + size * 0.42, width: size, height: size });
      out.push(img);
    }
  }

  // ── the livery panel, painted on the flank ──────────────────────────────
  const color = colorFor(liveryIndex);
  const panelW = Math.max(6, w * 0.44);
  const panelH = Math.max(6, h * 0.36);
  const panelY = -h * 0.58; // upper-middle of the body, clear of the wheels
  const rad = Math.min(panelW, panelH) * 0.22;
  const edge = Math.max(1, panelH * 0.09);
  const g = scene.add.graphics();
  g.fillStyle(CHIP_EDGE, 1)
    .fillRoundedRect(-panelW / 2 - edge, panelY - panelH / 2 - edge, panelW + edge * 2, panelH + edge * 2, rad + edge)
    .fillStyle(hexToInt(color), 1)
    .fillRoundedRect(-panelW / 2, panelY - panelH / 2, panelW, panelH, rad);
  drawGlyph(g, glyphFor(liveryIndex), 0, panelY, panelH * 0.33, inkOn(color));
  out.push(g);

  return out;
}

/**
 * Identity for a car whose FRAME changes as it turns — the Track, where
 * `faceAlongPath` swaps in one of eight compass frames as the train rides the
 * oval.
 *
 * Anchored to the 128 px atlas CELL rather than to a content box, because a
 * content box is per-direction: honouring it here would mean measuring and
 * maintaining 40 boxes and re-placing two objects every frame. Every frame in
 * the train atlas is centred within its cell (checked: `boxcar-E` spans 5…122
 * and `boxcar-S` 39…88 — both centre on 63.5 of 128), so a cell-centred anchor
 * holds for all eight headings.
 *
 * No name chip: a text plate under every car on a moving oval is clutter.
 */
export function decorateMovingCar(
  scene: Phaser.Scene,
  cellSize: number,
  liveryIndex: number,
  cargo: LaneGroup | null,
): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];

  if (cargo) {
    const def = UI_SPRITES[LANE_GROUP_SPRITE[cargo]];
    if (def) {
      const size = cellSize * 0.42;
      const img = scene.add.image(0, 0, UI_ATLAS_KEY, def.states[def.base] ?? def.base);
      placeUiSprite(img, def, { x: 0, y: -cellSize * 0.36, width: size, height: size });
      out.push(img);
    }
  }

  const color = colorFor(liveryIndex);
  const w = cellSize * 0.3;
  const h = cellSize * 0.22;
  const edge = Math.max(1, h * 0.1);
  const g = scene.add.graphics();
  g.fillStyle(CHIP_EDGE, 1)
    .fillRoundedRect(-w / 2 - edge, -h / 2 - edge, w + edge * 2, h + edge * 2, h * 0.3 + edge)
    .fillStyle(hexToInt(color), 1)
    .fillRoundedRect(-w / 2, -h / 2, w, h, h * 0.3);
  drawGlyph(g, glyphFor(liveryIndex), 0, 0, h * 0.33, inkOn(color));
  out.push(g);

  return out;
}

/**
 * The name chip under a car.
 *
 * It lives OUTSIDE the car's container and is laid out in screen space. Anything
 * inside the container inherits the car's fit scale, which is what put the old
 * 8 px label 154 px below centre — under the middle of the NEXT car's body, so
 * only the last car in each column had a visible name. Sizing it off the camera
 * instead (the `undo-toast` rule) also means it stays legible on a letterboxed
 * phone, where the painted plate is small but the kid's eyes are not.
 *
 * Text is the ADULT channel — a pre-reader gets nothing from `LOOP 7`. It is
 * deliberately the smallest and least load-bearing element of the scheme.
 */
export class CarNamePlate {
  readonly container: Phaser.GameObjects.Container;
  private readonly chip: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, name: string) {
    this.chip = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, name.toUpperCase(), {
        fontFamily: "'Press Start 2P', monospace",
        color: CHIP_EDGE_CSS,
      })
      .setOrigin(0.5);
    this.container = scene.add.container(0, 0, [this.chip, this.label]);
  }

  /** Centre the chip on (cx, cy) and redraw it `w`×`h` px, never wider than
   *  `maxW` — the horizontal pitch to the next car. Two competing floors meet
   *  here: a chip must stay legible on a small canvas (so the font has a floor)
   *  and it must never reach into its neighbour's slot (so the chip has a
   *  ceiling). When they collide the FONT gives way, because a slightly small
   *  name still reads and two overlapping chips read as neither. */
  layout(cx: number, cy: number, w: number, h: number, maxW: number): void {
    this.container.setPosition(cx, cy);
    let fs = Math.max(8, Math.round(h * 0.46));
    this.label.setFontSize(fs);
    const budget = Math.max(1, maxW - fs * 1.4);
    if (this.label.width > budget) {
      fs = Math.max(6, Math.floor((fs * budget) / this.label.width));
      this.label.setFontSize(fs);
    }
    const width = Math.min(Math.max(w, this.label.width + fs * 1.4), maxW);
    const height = Math.max(h, fs * 2);
    const rad = Math.min(height * 0.34, 10);
    this.chip
      .clear()
      .fillStyle(CHIP_EDGE, 1)
      .fillRoundedRect(-width / 2 - 2, -height / 2 - 2, width + 4, height + 4, rad + 2)
      .fillStyle(CHIP_FACE, 1)
      .fillRoundedRect(-width / 2, -height / 2, width, height, rad);
    this.label.setPosition(0, 0);
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  setDepth(d: number): void {
    this.container.setDepth(d);
  }

  destroy(): void {
    this.container.destroy();
  }
}
