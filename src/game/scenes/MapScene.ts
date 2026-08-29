// The Map view (v2): the painted island world, cover-fit, with the three
// landmarks (Workshop cabin / Yard shed / Track oval) painted in. The destination
// hit-areas are data-driven from `assets/maps/map.json` (TiledParser +
// TiledSceneAdapter) — each emits `map-nav` with its destination; React owns the
// guard (Track needs a train) + the dispatch. A handcar sprite marks the kid's
// current location over the matching landmark.
import Phaser from "phaser";
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG_V2, SPRITES } from "../assets.ts";
import { parseTiledLayer, type TiledSpawn } from "../TiledParser.ts";
import { spawnTiledScene, relayoutSpawns } from "../TiledSceneAdapter.ts";
import mapMap from "../../assets/maps/map.json";
import { placeSpawn } from "../TiledSceneAdapter.ts";
import type { AppView } from "../../core/types.ts";
import { attachUndoToast, type UndoToast } from "../undo-toast.ts";

/** The three destinations the handcar marker can sit at. Derived from `AppView`
 *  rather than from a coordinate table, so adding a view is a compile error in
 *  one place instead of a silently-missing marker. */
type LandmarkView = Exclude<AppView, "map">;
const LANDMARKS: readonly LandmarkView[] = ["workshop", "yard", "track"];

export class MapScene extends BackgroundScene {
  static readonly KEY = "MapScene";

  private chromeSpawns: readonly TiledSpawn[] = [];
  private chromeHits: Phaser.GameObjects.Rectangle[] = [];
  /** Where the handcar sits for each destination, authored in `map.json`'s
   *  `fixtures-layer` and DRAGGED into place with the scene editor — not
   *  hand-guessed in TypeScript, which is how the old `MAP_HANDCAR` constant
   *  ended up putting the marker on the cabin roof. */
  private handcarSpawns: readonly TiledSpawn[] = [];
  private handcar?: Phaser.GameObjects.Image;
  private location: LandmarkView = "workshop";
  private undoToast?: UndoToast;

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
    this.handcarSpawns = parseTiledLayer(mapMap, "fixtures-layer");
    const { hits } = spawnTiledScene(this, this.chromeSpawns, {
      bgRect: this.backgroundRect,
      hitDepth: 10,
    });
    this.chromeHits = hits;
    this.handcar = this.add.image(0, 0, SPRITES.handcar.key).setOrigin(0.5).setDepth(5);
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

  /** React → scene: position the handcar marker over the kid's current location. */
  setLocation(view: AppView): void {
    if ((LANDMARKS as readonly string[]).includes(view)) this.location = view as LandmarkView;
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
    const spawn = this.handcarSpawns.find((s) => s.id === `handcar-${this.location}`);
    if (!spawn) return;
    const p = placeSpawn(spawn, r, this.scale.gameSize);
    this.handcar.setPosition(p.x, p.y);
    if (this.handcar.width > 0) this.handcar.setScale(p.width / this.handcar.width);
  }

  protected onResize(): void {
    if (this.scene.isActive()) this.layoutChrome();
  }
}
