// Where the side-scroller's chrome stands, from `assets/maps/track-v3.json`.
//
// The other three view scenes spawn their chrome generically from their maps
// (`ui-scene.ts`). The side-scroller cannot: a RIDE key with a STOP face in the
// same slot, a speed slider with a drawn rail, eight latching picture switches
// and two deck-hiding edge keys have no generic form, and inventing one for a
// single scene would be a second vocabulary. So its map carries POSITIONS ONLY
// — every object is looked up here by NAME and the scene wires it — which is
// exactly what `?edit` needs to drag them. Add a control: an object here, a
// name below, a builder in `TrackV3Scene`.
//
// Pure: no Phaser. `scene-layout.ts` reads the FILE's layout through this for
// the tests, the e2e taps and React; `TrackV3Scene` reads its LIVE spawns (the
// same objects the editor mutates) so a drag re-places the real controls.
import { parseTiledLayer, type TiledSpawn } from "./TiledParser.ts";
import { placeSpawn } from "./spawn-placement.ts";
import { GAME_DESIGN_SIZE } from "./game-dimensions.ts";
import trackV3Map from "../assets/maps/track-v3.json";

export interface PlacedRect { x: number; y: number; width: number; height: number }

export const TRACK_V3_MAP = "track-v3";
export const TRACK_V3_LAYER = "ui-layer";

/** The side-scroller lays out in a fixed design space; the camera projects it
 *  (`installSceneProjection`). So its "background rect" IS the design space,
 *  and a spawn's normalized centre maps straight to design px. */
export const DESIGN_RECT: PlacedRect = { x: 0, y: 0, width: GAME_DESIGN_SIZE.width, height: GAME_DESIGN_SIZE.height };

export const TRACK_JOB_IDS = ["hill", "bridge", "rain", "night", "tunnel", "tiny", "giant", "backwards"] as const;
export type TrackJobId = (typeof TRACK_JOB_IDS)[number];

export const TRACK_TOOLBAR_IDS = ["header", "jobs"] as const;
export type TrackToolbarId = (typeof TRACK_TOOLBAR_IDS)[number];

export const TRACK_HEADER_SLOT_IDS = ["map", "speed", "ride", "send"] as const;
export type TrackHeaderSlotId = (typeof TRACK_HEADER_SLOT_IDS)[number];

/** Object names in the map, by role. The closed vocabulary the scene wires. */
export const TRACK_CHROME_NAMES = {
  headerPlate: "panel-header",
  map: "btn-nav-map",
  speed: "speed",
  ride: "btn-ride-stop",
  send: "btn-send-song",
  jobsPlate: "panel-jobs",
  job: (id: TrackJobId): string => `job-${id}`,
  toggle: (id: TrackToolbarId): string => `toggle-${id}`,
} as const;

export interface TrackChromeRects {
  readonly plate: PlacedRect;
  readonly slots: Readonly<Record<TrackHeaderSlotId, PlacedRect>>;
  readonly jobsPlate: PlacedRect;
  readonly jobs: Readonly<Record<TrackJobId, PlacedRect>>;
  readonly toggles: Readonly<Record<TrackToolbarId, PlacedRect>>;
}

/** The map's spawns, parsed. Each call parses afresh: a caller that holds the
 *  array (the scene) must own its own copy, because the editor writes into
 *  the spawn objects it is handed. */
export function parseTrackChrome(): TiledSpawn[] {
  return parseTiledLayer(trackV3Map, TRACK_V3_LAYER);
}

/** One named control's rect in design px. Throws when the map lacks it: a
 *  control that silently vanished is a kid who cannot find STOP. */
export function chromeRect(spawns: readonly TiledSpawn[], name: string): PlacedRect {
  const spawn = spawns.find((s) => s.id === name);
  if (!spawn) throw new Error(`TRACK_CHROME_MISSING: track-v3.json has no object named "${name}"`);
  return placeSpawn(spawn, DESIGN_RECT, GAME_DESIGN_SIZE);
}

/** Every control the scene wires, placed. */
export function trackChromeRects(spawns: readonly TiledSpawn[]): TrackChromeRects {
  const n = TRACK_CHROME_NAMES;
  return {
    plate: chromeRect(spawns, n.headerPlate),
    slots: {
      map: chromeRect(spawns, n.map),
      speed: chromeRect(spawns, n.speed),
      ride: chromeRect(spawns, n.ride),
      send: chromeRect(spawns, n.send),
    },
    jobsPlate: chromeRect(spawns, n.jobsPlate),
    jobs: Object.fromEntries(TRACK_JOB_IDS.map((id) => [id, chromeRect(spawns, n.job(id))])) as Record<TrackJobId, PlacedRect>,
    toggles: Object.fromEntries(TRACK_TOOLBAR_IDS.map((id) => [id, chromeRect(spawns, n.toggle(id))])) as Record<TrackToolbarId, PlacedRect>,
  };
}
