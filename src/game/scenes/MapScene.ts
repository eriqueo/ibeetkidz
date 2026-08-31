// The Map view (v2): the painted island world, cover-fit, with the three
// landmarks (Workshop cabin / Yard shed / Track oval) painted in. The destination
// hit-areas are data-driven from `assets/maps/map.json` (TiledParser +
// TiledSceneAdapter) — each emits `map-nav` with its destination; React owns the
// guard (Track needs a train) + the dispatch.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG_V2 } from "../assets.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { spawnTiledScene, relayoutSpawns } from "../TiledSceneAdapter.ts";
import mapMap from "../../assets/maps/map.json";
import { attachUndoToast, type UndoToast } from "../undo-toast.ts";

export class MapScene extends BackgroundScene {
  static readonly KEY = "MapScene";

  private chromeSpawns: readonly TiledSpawn[] = [];
  private chromeHits: Phaser.GameObjects.Rectangle[] = [];
  private undoToast?: UndoToast;

  constructor() {
    super(MapScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG_V2.map);
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
    this.layoutChrome();
    // Dev-only seam for the scene editor (`?edit`). `editorHandle` is typed
    // `unknown` on BackgroundScene, so this scene still imports nothing from
    // `src/editor/` — the dependency arrow points one way only, and the whole
    // branch is compile-time dead in a production build.
    if (import.meta.env.DEV) {
      this.editorHandle = {
        mapName: "map",
        layerName: "ui-layer",
        spawns: this.chromeSpawns,
        relayout: () => this.layoutChrome(),
        backgroundRect: () => this.backgroundRect,
        cameraSize: () => this.scale.gameSize,
      };
    }
    this.undoToast = attachUndoToast(this);
    this.announceReady();
  }

  get undoOffer(): { offering: boolean; lost: string } {
    return {
      offering: this.undoToast?.offering ?? false,
      lost: this.undoToast?.lost ?? "",
    };
  }

  private layoutChrome(): void {
    const r = this.backgroundRect;
    if (r.width === 0) return;
    relayoutSpawns(this.chromeHits, this.chromeSpawns, r, this.scale.gameSize);
  }

  protected onResize(): void {
    if (this.scene.isActive()) this.layoutChrome();
  }
}
