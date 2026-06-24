// The Workshop view background: the painted train-car UI, contain-fit so its
// regions map to predictable coordinates. All interactivity (sequencer grid,
// instrument shelf, transport) is React, pinned over the painted regions via
// WORKSHOP_LAYOUT — see Workshop.tsx.
import { BackgroundScene } from "./BackgroundScene.ts";
import { SCENE_BG } from "../assets.ts";

export class WorkshopScene extends BackgroundScene {
  static readonly KEY = "WorkshopScene";

  constructor() {
    super(WorkshopScene.KEY);
  }

  preload(): void {
    this.loadBackground(SCENE_BG.workshop);
  }

  create(): void {
    this.addBackground("contain");
    this.announceReady();
  }
}
