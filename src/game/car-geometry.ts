// Where a car's ART actually is inside its atlas cell — and the one anchor
// everything else is placed against.
//
// Split out of `sprite-assets.ts` so it stays PHASER-FREE (`import type` only,
// the same trick `ui-sprites.ts` uses). `sprite-assets.ts` has to import Phaser
// for real — it registers animations, which touches runtime Phaser values — and
// a real Phaser import cannot be loaded under jsdom at all, so anything that
// module owns is untestable by the unit suite. This geometry is pure arithmetic
// over measured constants, it is exactly the arithmetic the palette got wrong
// for its whole life, and it therefore belongs somewhere a test can reach it.
import type Phaser from "phaser";

/** Side of one square cell in the train atlas. Every frame is this size and
 *  UNTRIMMED, which is why the content boxes below are needed at all. */
export const FRAME_SIZE = 128;

/** All train sprite types. */
export const TRAIN_TYPES = ["loco", "boxcar", "tanker", "hopper", "flatcar"] as const;
export type TrainType = typeof TRAIN_TYPES[number];

/** Normalized opaque-content box within a `FRAME_SIZE` frame, `[x0,y0,x1,y1]`.
 *  Same shape and meaning as `UiSpriteDef.content` in ui-sprites.ts. */
export type CarContentBox = readonly [number, number, number, number];

/**
 * Opaque content box of each type's **E** (side-on) frame.
 *
 * Every train frame is an UNTRIMMED 128×128 cell, and the art inside sits at a
 * different offset per type — a flatcar's deck is 71 px tall and starts 28 px
 * down; a boxcar's body is 97 px and starts at 15. Scaling or aligning against
 * the 128 px CELL therefore lies about where the car actually is: it is why the
 * palette's name label used to land under the NEXT car, and why a load riding
 * "on the roof" would float above a flatcar and sink into a boxcar.
 *
 * Measured from `public/assets/spritesheets/train.png` with an alpha threshold
 * (`magick -crop <cell> -trim`), the same method `ui-sprites.ts` documents for
 * its own boxes. Re-measure if the atlas is re-exported.
 *
 *   boxcar  117×97 +5+15    tanker  116×95 +6+16
 *   hopper  102×83 +13+22   flatcar 118×71 +5+28
 *   loco    113×101 +7+13
 */
export const CAR_CONTENT_E: Readonly<Record<TrainType, CarContentBox>> = {
  loco: [7 / 128, 13 / 128, 120 / 128, 114 / 128],
  boxcar: [5 / 128, 15 / 128, 122 / 128, 112 / 128],
  tanker: [6 / 128, 16 / 128, 122 / 128, 111 / 128],
  hopper: [13 / 128, 22 / 128, 115 / 128, 105 / 128],
  flatcar: [5 / 128, 28 / 128, 123 / 128, 99 / 128],
} as const;

/** Opaque width/height of `type`'s side-on body, in unscaled cell px. */
export const carBodySize = (
  type: TrainType,
  cellSize: number = FRAME_SIZE,
): { w: number; h: number } => {
  const [x0, y0, x1, y1] = CAR_CONTENT_E[type];
  return { w: (x1 - x0) * cellSize, h: (y1 - y0) * cellSize };
};

/**
 * Position a car body image (origin 0.5, an untrimmed `FRAME_SIZE` cell) inside
 * its container so its opaque content is CENTRED horizontally on the container
 * origin and its BOTTOM edge — the wheels — sits at y = 0.
 *
 * That makes the container origin mean "where this car touches the rail",
 * which is the one anchor every other decoration can be placed against without
 * knowing the car's type: a load rides at -contentHeight, a name chip hangs
 * below 0, and a flatcar and a boxcar both sit ON the siding instead of one of
 * them floating over it.
 */
export function alignCarBody(
  img: Phaser.GameObjects.Image,
  content: CarContentBox,
  cellSize: number = FRAME_SIZE,
): void {
  const [x0, , x1, y1] = content;
  img.setPosition(-((x0 + x1) / 2 - 0.5) * cellSize, -(y1 - 0.5) * cellSize);
}
