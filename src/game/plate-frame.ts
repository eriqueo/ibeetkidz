// A painted machine plate rebuilt as a FRAME of any size (card C8).
//
// The drum and melody machines are painted at a fixed shape, too small for a
// finger on an iPad once sixteen steps are laid across them. Stretching the
// art would smear its pixels and turn round rivets into ovals, so the plate is
// cut up instead, the way `TrackV3Scene.slicedPlate` cuts the header plate:
//
//   • the top-right corner (brass bracket, steel band and the field's own
//     border) is drawn at one uniform scale, and mirrored for the other three;
//   • one stretch of the top edge and one of the right edge, each cut midway
//     between two rivets so it holds exactly one, are repeated along the sides
//     (mirrored for the bottom and left), eased by a few percent so a whole
//     number of them fits;
//   • the field colour fills what the edges leave open.
//
// Only edges that border the plate's main field are used, so the repeats form
// one continuous border. Interim until AR-081's wide plates land.
import Phaser from "phaser";
import { UI_ATLAS_KEY, UI_SPRITES, hasUiFrame } from "./ui-sprites.ts";

export interface PlateFrameSpec {
  readonly sprite: string;
  /** The PNG's size: the space every number below was measured in. */
  readonly native: { readonly w: number; readonly h: number };
  /** How deep the frame is cut from the top-right corner, native px. */
  readonly depth: number;
  /** Native x-range of the top edge that repeats: one rivet, cut halfway to
   *  each neighbour, inside the field's span. */
  readonly top: readonly [number, number];
  /** Native y-range of the right edge that repeats, likewise. */
  readonly right: readonly [number, number];
  /** Native depth at which the field's interior starts (inside its border). */
  readonly fieldInset: number;
  /** Native depth of the clear margin outside the steel band. */
  readonly margin: number;
  /** The plate's own left side borders the field too, so the left edge and
   *  left corners are cut from it instead of mirrored from the right (a
   *  plate's shading is not symmetric). */
  readonly ownLeft: boolean;
  /** The field colour, for the interior the edges leave open. */
  readonly fill: number;
}

export interface FrameBox { x: number; y: number; w: number; h: number }

/** Behind the plate's see-through gaps: the near-black of its own shadows. */
const FRAME_BACKING = 0x141315;

export interface PlateFrame {
  readonly objects: Phaser.GameObjects.GameObject[];
  /** The field's interior, in the same space as `rect`. */
  readonly inner: FrameBox;
}

/**
 * Build `spec`'s frame filling `rect`, its pixels drawn `scale` scene px each.
 * Returns the objects (for the caller's container) and the field's interior.
 * Nothing but the fill when the atlas has not arrived.
 */
export function buildPlateFrame(
  scene: Phaser.Scene,
  spec: PlateFrameSpec,
  rect: FrameBox,
  scale: number,
): PlateFrame {
  const W = spec.native.w;
  const D = spec.depth;
  const d = D * scale;
  const inset = spec.fieldInset * scale;
  const objects: Phaser.GameObjects.GameObject[] = [];
  // The plates are painted with see-through gaps between the steel band and
  // the field; on the old half-screen machine the dimmed Workshop showed
  // through them as shadow. Over the whole screen it showed the Workshop's
  // own buttons, so the frame stands on a dark backing.
  const m = spec.margin * scale;
  objects.push(scene.add.rectangle(rect.x + m, rect.y + m, rect.w - m * 2, rect.h - m * 2, FRAME_BACKING, 1).setOrigin(0));
  objects.push(
    scene.add
      .rectangle(rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2, spec.fill, 1)
      .setOrigin(0),
  );
  const inner = { x: rect.x + inset, y: rect.y + inset, w: rect.w - inset * 2, h: rect.h - inset * 2 };
  const def = UI_SPRITES[spec.sprite];
  if (!def || !hasUiFrame(scene, def.base)) return { objects, inner };

  // One cut of the plate: native region (a, b, w, h), mirrored as asked, its
  // top-left landing on (atX, atY). Mirrored by a negative scale, not
  // `setFlip`: Phaser offsets a flipped crop of a TRIMMED atlas frame by the
  // difference between its trims (both plates are trimmed), which left a dark
  // strip along every mirrored edge. A plain crop under a negative scale
  // samples exactly the region asked for.
  const piece = (
    a: number, b: number, w: number, h: number,
    flipX: boolean, flipY: boolean,
    atX: number, atY: number, sx: number, sy: number,
  ): void => {
    const img = scene.add
      .image(0, 0, UI_ATLAS_KEY, def.base)
      .setOrigin(0, 0)
      .setScale(flipX ? -sx : sx, flipY ? -sy : sy)
      .setCrop(a, b, w, h);
    img.setPosition(flipX ? atX + (a + w) * sx : atX - a * sx, flipY ? atY + (b + h) * sy : atY - b * sy);
    objects.push(img);
  };

  const left = rect.x;
  const top = rect.y;
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  // The four sides, a whole number of one-rivet repeats each.
  const [ta, tb] = spec.top;
  const tSeg = tb - ta;
  const hSpan = rect.w - d * 2;
  const hN = Math.max(1, Math.round(hSpan / (tSeg * scale)));
  const hsx = hSpan / (hN * tSeg);
  for (let k = 0; k < hN; k++) {
    const x = left + d + k * tSeg * hsx;
    piece(ta, 0, tSeg, D, false, false, x, top, hsx, scale);
    piece(ta, 0, tSeg, D, false, true, x, bottom - d, hsx, scale);
  }
  const [ra, rb] = spec.right;
  const rSeg = rb - ra;
  const vSpan = rect.h - d * 2;
  const vN = Math.max(1, Math.round(vSpan / (rSeg * scale)));
  const vsy = vSpan / (vN * rSeg);
  for (let k = 0; k < vN; k++) {
    const y = top + d + k * rSeg * vsy;
    piece(W - D, ra, D, rSeg, false, false, right - d, y, scale, vsy);
    if (spec.ownLeft) piece(0, ra, D, rSeg, false, false, left, y, scale, vsy);
    else piece(W - D, ra, D, rSeg, true, false, left, y, scale, vsy);
  }

  // Corners last, over the ends of the sides.
  piece(W - D, 0, D, D, false, false, right - d, top, scale, scale);
  piece(W - D, 0, D, D, false, true, right - d, bottom - d, scale, scale);
  if (spec.ownLeft) {
    piece(0, 0, D, D, false, false, left, top, scale, scale);
    piece(0, 0, D, D, false, true, left, bottom - d, scale, scale);
  } else {
    piece(W - D, 0, D, D, true, false, left, top, scale, scale);
    piece(W - D, 0, D, D, true, true, left, bottom - d, scale, scale);
  }

  return { objects, inner };
}

/** The drum machine's plate (AR-058), measured off `panel-percussion.png`:
 *  top rivets at x 349 / 533 / 768, right-edge rivets at y 427 / 630 / 801,
 *  the field's border ending 116 px in. */
export const PERCUSSION_FRAME: PlateFrameSpec = {
  sprite: "panel-percussion",
  native: { w: 1536, h: 1152 },
  depth: 135,
  top: [441, 650],
  right: [528, 715],
  fieldInset: 118,
  margin: 34,
  ownLeft: false, // the plate's left side is the lane rail, not the field
  fill: 0x212121,
};

/** The melody machine's plate (AR-016), measured off `panel-editor.png`:
 *  top rivets at x 387 / 574 / 760, right-edge rivets at y 220 / 447 / 674,
 *  the chalk slate starting 136 px in, inside its wooden frame. */
export const MELODY_FRAME: PlateFrameSpec = {
  sprite: "panel-editor",
  native: { w: 1152, h: 1536 },
  depth: 150,
  top: [480, 667],
  right: [333, 560],
  fieldInset: 137,
  margin: 46,
  ownLeft: true,
  fill: 0x1d3920,
};
