// The Map view background: the painted world map, contain-fit. The three
// destination buttons (Workshop / Yard / Track) are React overlays pinned over
// the painted spots via MAP_LAYOUT — see Map.tsx.
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG } from "../assets.ts";

export class MapScene extends BackgroundScene {
  static readonly KEY = "MapScene";

  constructor() {
    super(MapScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG.map);
  }

  create(): void {
    // Cover-fit so the island fills the viewport with no black bars (the painted
    // WORKSHOP/YARD/TRACK labels stay in the centre band). Map.tsx mirrors this
    // with a "cover" overlay rect so the hit-areas track the painted buildings.
    this.addBackground("cover");
    this.announceReady();
  }
}
