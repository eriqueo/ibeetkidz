// Reusable base for every view scene.
//
// Each of the four spaces (Workshop / Yard / Track / Map) is one full-bleed
// pixel-art background with sprites on top. This base owns the two things they
// all need: loading that background through the Vite-resolved asset manifest,
// and keeping it "cover"-scaled and centred as the canvas resizes. View scenes
// extend it, call `loadBackground` in `preload`, `addBackground` in `create`,
// then layer their own sprites.
//
// It also fires the EventBus `current-scene-ready` handshake so React knows the
// scene exists and can start pushing state — the boundary stays one-directional
// (Phaser announces; React reacts).
import Phaser from "phaser";
import { EventBus } from "../EventBus.ts";
import type { ImageAsset } from "../assets.ts";

/**
 * "cover" fills the canvas and crops overflow (full-bleed scenery).
 * "contain" fits the whole image with letterbox bars, giving a predictable
 * coordinate space for anything that must register to a painted region.
 *
 * As shipped: Map is the only "cover" scene; Workshop, Yard and Track are all
 * "contain" — they carry Tiled-placed chrome that must never be cropped off the
 * edge. (This comment used to say the reverse for three of the four.)
 *
 * Note that with today's art the distinction has no visible effect: every base
 * plate is 2560x1440 and the game runs `Phaser.Scale.FIT` at 2560x1440, so both
 * branches of `fitBackground` compute the same scale. Do not take that as
 * licence to hardcode it — the moment one plate has a different aspect, or the
 * scale mode changes, they diverge.
 */
export type BackgroundFit = "cover" | "contain";

export abstract class BackgroundScene extends Phaser.Scene {
  private bg?: Phaser.GameObjects.Image;
  private bgKey?: string;
  private fit: BackgroundFit = "cover";
  /** True once the subclass `create()` has finished and called `announceReady`.
   *  Subclasses gate React→scene updates on this — NOT `scene.isActive()`, which
   *  is still false during the synchronous `announceReady` handshake (the scene
   *  status only flips to RUNNING after `create()` returns), so the first state
   *  push would otherwise be dropped. */
  protected ready = false;

  /** Queue the scene's background texture. Call from a subclass `preload`. */
  protected loadBackground(asset: ImageAsset): void {
    this.bgKey = asset.key;
    if (!this.textures.exists(asset.key)) {
      this.load.image(asset.key, asset.url);
    }
  }

  /**
   * Add the background as a centred, scaled image and keep it fitted as the
   * canvas resizes. Returns the image so subclasses can read its display bounds
   * (`getBounds()`) to anchor sprites relative to the scene art.
   */
  protected addBackground(fit: BackgroundFit = "cover"): Phaser.GameObjects.Image {
    if (!this.bgKey) {
      throw new Error("addBackground() called before loadBackground()");
    }
    this.fit = fit;
    this.bg = this.add.image(0, 0, this.bgKey).setOrigin(0.5);
    this.fitBackground();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitBackground, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitBackground, this);
    });
    return this.bg;
  }

  /** The on-screen rectangle the background image currently occupies.
   *
   *  PUBLIC because the dev-only scene editor (`src/editor/`, loaded behind
   *  `?edit` in a DEV build) has to invert `placeSpawn` to turn a drag back into
   *  Tiled coordinates, and every anchor's math is relative to this rect.
   *  Reading it from the live scene is deliberate: it keeps the editor from
   *  holding any opinion about cover-vs-contain, which is exactly the kind of
   *  duplicated assumption that would silently drift. */
  get backgroundRect(): Phaser.Geom.Rectangle {
    if (!this.bg) return new Phaser.Geom.Rectangle(0, 0, 0, 0);
    return this.bg.getBounds();
  }

  /** Dev-only editor attachment point. Typed `unknown` on purpose: the game must
   *  never import from `src/editor/`, so the dependency arrow stays
   *  one-directional and the editor is fully tree-shakeable out of a production
   *  build. The editor casts this to its own interface. */
  editorHandle?: unknown;

  private fitBackground(): void {
    if (!this.bg) return;
    const { width, height } = this.scale.gameSize;
    const fitScale =
      this.fit === "cover"
        ? Math.max(width / this.bg.width, height / this.bg.height)
        : Math.min(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(fitScale).setPosition(width / 2, height / 2);
    this.onResize();
  }

  /** Hook for subclasses to re-anchor sprites after the bg refits. */
  protected onResize(): void {}

  /** Subclasses call this at the end of their own `create`. Flips `ready` BEFORE
   *  emitting so the synchronous React state push triggered by the handshake is
   *  applied (not dropped by an `isActive()`-style guard). */
  protected announceReady(): void {
    this.ready = true;
    EventBus.emit("current-scene-ready", this);
  }
}
