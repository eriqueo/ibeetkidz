/**
 * sprite-assets.ts
 *
 * Central manifest for all animation-ready spritesheets.
 * Import this in any Phaser scene's preload() to load the full asset library.
 *
 * Spritesheet layout (all frames are 128×128px):
 *
 *   train.png  — 40 frames, 8 cols × 5 rows
 *     Row 0: loco-E, loco-NE, loco-N, loco-NW, loco-W, loco-SW, loco-S, loco-SE
 *     Row 1: boxcar-E … boxcar-SE
 *     Row 2: tanker-E … tanker-SE
 *     Row 3: hopper-E … hopper-SE
 *     Row 4: flatcar-E … flatcar-SE
 *
 *   smoke.png  — 4 frames, 4 cols × 1 row
 *     smoke-1 (tiny) → smoke-4 (dissipating)
 *
 *   signal.png — 2 frames, 2 cols × 1 row
 *     signal-up, signal-down
 *
 *   tarp.png   — 1 frame
 *     tarp
 */
// NB: Phaser must be a REAL import here. `Phaser.Animations.Events.…` below is
// a runtime value; with only the ambient namespace types it typechecks but
// throws `ReferenceError: Phaser is not defined` at runtime — inside the game
// step, which killed the whole render loop (the "train freezes on ride" bug).
import Phaser from "phaser";

export const FRAME_SIZE = 128;

/** Directions in clockwise order starting East, matching the oval path tangent. */
export const DIRECTIONS = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"] as const;
export type Direction = typeof DIRECTIONS[number];

/** All train sprite types. */
export const TRAIN_TYPES = ["loco", "boxcar", "tanker", "hopper", "flatcar"] as const;
export type TrainType = typeof TRAIN_TYPES[number];

/**
 * Given a velocity vector (dx, dy), returns the nearest 8-direction compass name.
 * Use this in TrackScene to pick the correct directional frame as the train moves.
 */
export function velocityToDirection(dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) return "E";
  const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180, 0 = East
  const normalized = ((angle + 360) % 360); // 0–360
  // Each direction covers 45°, offset by 22.5° so E is 337.5–22.5
  const index = Math.round(normalized / 45) % 8;
  // atan2 clockwise mapping: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE
  const CW_MAP: Direction[] = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  return CW_MAP[index]!; // index is 0–7 (mod 8), never out of range
}

/**
 * Returns the atlas frame key for a given train type and direction.
 * Use with scene.add.image(x, y, 'train', frameKey(type, dir))
 */
export function frameKey(type: TrainType, dir: Direction): string {
  return `${type}-${dir}`;
}

/**
 * Call this in your Phaser scene's preload() to load all spritesheets.
 *
 * @example
 * preload() {
 *   loadSpriteAssets(this);
 * }
 */
export function loadSpriteAssets(scene: Phaser.Scene): void {
  // Phaser atlas loader: loads PNG + JSON atlas together
  scene.load.atlas("train",  "assets/spritesheets/train.png",  "assets/spritesheets/train.json");
  scene.load.atlas("smoke",  "assets/spritesheets/smoke.png",  "assets/spritesheets/smoke.json");
  scene.load.atlas("signal", "assets/spritesheets/signal.png", "assets/spritesheets/signal.json");
  scene.load.atlas("tarp",   "assets/spritesheets/tarp.png",   "assets/spritesheets/tarp.json");
}

/**
 * Call this in your Phaser scene's create() to register all animations.
 * After calling this, you can play animations by key on any sprite.
 *
 * Animations registered:
 *   "smoke"         — 4-frame smoke puff, plays once, 8fps
 *   "signal-flash"  — 2-frame signal flash, loops, 4fps
 *
 * @example
 * create() {
 *   registerAnimations(this);
 *   const smoke = this.add.sprite(x, y, 'smoke', 'smoke-1');
 *   smoke.play('smoke');
 * }
 */
export function registerAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists("smoke")) {
    scene.anims.create({
      key: "smoke",
      frames: [
        { key: "smoke", frame: "smoke-1" },
        { key: "smoke", frame: "smoke-2" },
        { key: "smoke", frame: "smoke-3" },
        { key: "smoke", frame: "smoke-4" },
      ],
      frameRate: 8,
      repeat: 0, // play once, then destroy
    });
  }

  if (!scene.anims.exists("signal-flash")) {
    scene.anims.create({
      key: "signal-flash",
      frames: [
        { key: "signal", frame: "signal-up" },
        { key: "signal", frame: "signal-down" },
      ],
      frameRate: 4,
      repeat: -1, // loop
    });
  }
}

/**
 * Utility: spawn a one-shot smoke puff at (x, y) and auto-destroy when done.
 */
export function spawnSmoke(scene: Phaser.Scene, x: number, y: number, scale = 0.5): void {
  const puff = scene.add.sprite(x, y, "smoke", "smoke-1");
  puff.setScale(scale);
  puff.play("smoke");
  puff.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => puff.destroy());
}
