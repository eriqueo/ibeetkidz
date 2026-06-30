// The Map view (v2): the painted island world, cover-fit, with the three
// landmarks (Workshop cabin / Yard shed / Track oval) painted in. The destination
// hit-areas are data-driven from `assets/maps/map.json` (TiledParser +
// TiledSceneAdapter) — each emits `map-nav` with its destination; React owns the
// guard (Track needs a train) + the dispatch. A handcar sprite marks the kid's
// current location over the matching landmark.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG_V2, SPRITES } from "../assets.ts";
import { MAP_HANDCAR } from "../scene-layout.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { spawnTiledScene, relayoutSpawns } from "../TiledSceneAdapter.ts";
import mapMap from "../../assets/maps/map.json";
import type { AppView } from "../../core/types.ts";

type LandmarkView = keyof typeof MAP_HANDCAR;

export class MapScene extends BackgroundScene {
  static readonly KEY = "MapScene";

  private chromeSpawns: readonly TiledSpawn[] = [];
  private chromeHits: Phaser.GameObjects.Rectangle[] = [];
  private handcar?: Phaser.GameObjects.Image;
  private location: LandmarkView = "workshop";

  constructor() {
    super(MapScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.map);
    if (!this.textures.exists(SPRITES.handcar.key)) {
      this.load.image(SPRITES.handcar.key, SPRITES.handcar.url);
    }
  }

  create(): void {
    // Cover-fit so the island fills the viewport; the Tiled hits anchor to the
    // painted landmarks (and crop with them) via the "bg" anchor.
    this.addBackground("cover");
    this.chromeSpawns = parseTiledLayer(mapMap, "ui-layer");
    const { hits } = spawnTiledScene(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      hitDepth: 10,
    });
    this.chromeHits = hits;
    this.handcar = this.add.image(0, 0, SPRITES.handcar.key).setOrigin(0.5).setDepth(5);
    this.layoutChrome();
    this.announceReady();
  }

  /** React → scene: position the handcar marker over the kid's current location. */
  setLocation(view: AppView): void {
    if (view in MAP_HANDCAR) this.location = view as LandmarkView;
    this.layoutHandcar();
  }

  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    relayoutSpawns(this.chromeHits, this.chromeSpawns, r, this.scale.gameSize);
    this.layoutHandcar();
  }

  private layoutHandcar(): void {
    const r = this.backgroundRect;
    if (r.width === 0 || !this.handcar) return;
    const h = MAP_HANDCAR[this.location];
    this.handcar.setPosition(r.x + r.width * h.cx, r.y + r.height * h.cy);
    if (this.handcar.width > 0) this.handcar.setScale((r.width * h.w) / this.handcar.width);
  }

  protected onResize(): void {
    if (this.scene.isActive()) this.layoutChrome();
  }
}
