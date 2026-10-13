// The ONE description of every tunable the game reads from `game-config.json`.
//
// This module is deliberately pure — no Phaser, no DOM, no EventBus — because
// three things consume it and only one of them runs in a browser:
//
//   1. `game-config.ts` validates the shipped JSON against it at import time.
//   2. `vite-plugins/ibk-map-writer.ts` (Node) validates a `?tune` save against
//      it before writing, because the server must not trust the client.
//   3. `src/editor/tune-panel.ts` (dev only) renders one control per entry.
//
// Adding a tunable is: one entry here, one value in the JSON, one read site in
// the scene (or in `scene-layout.ts` for the Workshop and Yard, which read
// their numbers through that module's exported objects).
// `tests/unit/game-config.test.ts` fails if any of the three is missing.
//
// The two imports below are the only ones, and both are pure: the station ids
// (so each station gets its sheet) and the synth list (so a sheet's voice is a
// closed choice, not a free string that falls through to the default synth).
import { INSTRUMENTS, type SynthInstrumentId } from "../core/instruments.ts";
import { MELODY_STATIONS, STATIONS, type StationId, isMelodyStation } from "./station-ids.ts";

export type TunableKind = "number" | "boolean" | "text" | "choice";

export interface Tunable {
  /** Dotted path into the config, e.g. `track.railY`. */
  readonly path: string;
  readonly label: string;
  /** Where the control sits in the `?tune` panel. */
  readonly group: string;
  readonly kind: TunableKind;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** The closed list a `choice` may take. */
  readonly choices?: readonly string[];
  readonly help?: string;
}

const SYNTH_IDS: readonly string[] = INSTRUMENTS.map((i) => i.id);

/** Title-case a station id for its sheet heading. */
function stationTitle(id: StationId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** One sheet per character on the Workshop floor: the facts code used to hold
 *  about a station (`STATION_LABEL`, `STATION_VOICE`). Position, sprite and
 *  tap action stay in `assets/maps/workshop.json`; the tune panel shows those
 *  beside the sheet, read-only, so the whole character is on one card. */
const STATION_SHEETS: readonly Tunable[] = STATIONS.flatMap((id): Tunable[] => {
  const group = `Station · ${stationTitle(id)}`;
  const sheet: Tunable[] = [
    { path: `stations.${id}.label`, label: "Lane name", group, kind: "text",
      help: "What a lane this character makes is called in the Workshop." },
  ];
  if (isMelodyStation(id)) {
    sheet.push({
      path: `stations.${id}.voice`, label: "Voice", group, kind: "choice", choices: SYNTH_IDS,
      help: "The synth this character's lanes are voiced with. The character is the identity; the synth is the sound.",
    });
  }
  return sheet;
});

/** Numbers are in the Track's design space (2560 x 1440) unless the help says
 *  otherwise. Ranges are the panel's slider ends AND the validator's limits:
 *  wide enough to explore, narrow enough to keep the scene on screen. */
export const TUNABLES: readonly Tunable[] = [
  // ── Horizon bands, back to front ──────────────────────────────────────────
  { path: "track.hillsY", label: "Hills top", group: "Track layout", kind: "number", min: 0, max: 1000, step: 10 },
  { path: "track.treesY", label: "Trees top", group: "Track layout", kind: "number", min: 0, max: 1200, step: 10 },
  { path: "track.groundY", label: "Ground top", group: "Track layout", kind: "number", min: 0, max: 1400, step: 10,
    help: "Top of the ground slab." },
  { path: "track.railY", label: "Rail", group: "Track layout", kind: "number", min: 0, max: 1400, step: 10,
    help: "Where wheels touch on flat ground. Tunnels and lamps hang off this." },
  { path: "track.foreY", label: "Fringe top", group: "Track layout", kind: "number", min: 0, max: 1400, step: 5 },
  { path: "track.foreH", label: "Fringe height", group: "Track layout", kind: "number", min: 71, max: 400, step: 5,
    help: "The greybox fringe draws from row 70 down, so this stays above 70." },
  { path: "track.terrainLabelY", label: "Terrain caption Y", group: "Track layout", kind: "number", min: 0, max: 1400, step: 10,
    help: "Keep it clear of the top plate, which hangs to about 370." },

  // ── The consist ───────────────────────────────────────────────────────────
  { path: "track.noseXFrac", label: "Nose anchor", group: "Train", kind: "number", min: 0.3, max: 0.98, step: 0.01,
    help: "Fraction of the screen width the locomotive's nose sits at." },
  { path: "track.coupling", label: "Coupling gap", group: "Train", kind: "number", min: 0, max: 80, step: 1 },
  { path: "track.lanternClearance", label: "Lantern clearance", group: "Train", kind: "number", min: 0, max: 120, step: 2 },
  { path: "track.contactShadows", label: "Contact shadows", group: "Train", kind: "boolean",
    help: "Off since 2026-10-05: in side view the shadow read as a smear." },

  // ── Feel ──────────────────────────────────────────────────────────────────
  { path: "track.trainSurge", label: "Downbeat surge (px)", group: "Feel", kind: "number", min: 0, max: 150, step: 1,
    help: "Peak forward surge within each bar. Net zero over the bar." },
  { path: "track.beatFlick", label: "Lantern flick", group: "Feel", kind: "number", min: 0.05, max: 0.95, step: 0.01,
    help: "Fraction of each beat the Beat Lantern spends raised." },
  { path: "track.soundingLift", label: "Sounding-car lift", group: "Feel", kind: "number", min: 0, max: 0.6, step: 0.01,
    help: "How far toward cream the car that is sounding is lifted." },
  { path: "track.rainTileScale", label: "Rain tile scale", group: "Feel", kind: "number", min: 1, max: 8, step: 0.1 },

  // ── Motion ────────────────────────────────────────────────────────────────
  { path: "track.bobAmplitudePx", label: "Bob amplitude (px)", group: "Motion", kind: "number", min: 0, max: 20, step: 0.5,
    help: "Peak car bob at full speed. Zero at rest by construction." },
  { path: "track.parallaxSky", label: "Sky parallax", group: "Motion", kind: "number", min: 0, max: 1, step: 0.01,
    help: "Scroll rate relative to the ground (1 = moves with the rail)." },
  { path: "track.parallaxHills", label: "Hills parallax", group: "Motion", kind: "number", min: 0, max: 1, step: 0.01 },
  { path: "track.parallaxTrees", label: "Trees parallax", group: "Motion", kind: "number", min: 0, max: 1, step: 0.01 },
  { path: "track.parallaxFore", label: "Fringe parallax", group: "Motion", kind: "number", min: 1, max: 3, step: 0.05,
    help: "Above 1: the near fringe outruns the rail." },

  // ── Workshop ──────────────────────────────────────────────────────────────
  // Fractions of the contain-fitted background, like the Tiled chrome, so
  // they track the letterbox. The painted chrome itself is in workshop.json
  // (`?edit`); these are the ENGINE-DRAWN fixtures.
  { path: "workshop.rackX0", label: "Rack left", group: "Workshop · paint rack", kind: "number", min: 0, max: 0.5, step: 0.001,
    help: "The colour chips hang on the left wall, the only permanently free space." },
  { path: "workshop.rackY0", label: "Rack top", group: "Workshop · paint rack", kind: "number", min: 0, max: 1, step: 0.001 },
  { path: "workshop.rackX1", label: "Rack right", group: "Workshop · paint rack", kind: "number", min: 0, max: 0.5, step: 0.001 },
  { path: "workshop.rackY1", label: "Rack bottom", group: "Workshop · paint rack", kind: "number", min: 0, max: 1, step: 0.001 },
  { path: "workshop.rackCols", label: "Rack columns", group: "Workshop · paint rack", kind: "number", min: 1, max: 4, step: 1 },
  { path: "workshop.gridMinRows", label: "Grid min rows", group: "Workshop · chalkboard grid", kind: "number", min: 1, max: 8, step: 1,
    help: "Rows are sized as if at least this many lanes exist, so one lane does not balloon." },
  { path: "workshop.gridLabelFrac", label: "Label column", group: "Workshop · chalkboard grid", kind: "number", min: 0.1, max: 0.5, step: 0.01,
    help: "Fraction of the grid width the lane-label column takes." },
  { path: "workshop.gridCellPad", label: "Cell gap", group: "Workshop · chalkboard grid", kind: "number", min: 0, max: 0.4, step: 0.01,
    help: "Gap between cells, as a fraction of the cell size." },
  { path: "workshop.toolModalX", label: "Tool modal left", group: "Workshop · tool modal", kind: "number", min: 0, max: 0.5, step: 0.01,
    help: "The tool panels' box, as fractions of the VIEWPORT." },
  { path: "workshop.toolModalY", label: "Tool modal top", group: "Workshop · tool modal", kind: "number", min: 0, max: 0.5, step: 0.01 },
  { path: "workshop.toolModalW", label: "Tool modal width", group: "Workshop · tool modal", kind: "number", min: 0.3, max: 1, step: 0.01 },
  { path: "workshop.toolModalH", label: "Tool modal height", group: "Workshop · tool modal", kind: "number", min: 0.3, max: 1, step: 0.01,
    help: "Ends well clear of the transport bar: every tool hangs DONE below its machine." },

  // ── Yard ──────────────────────────────────────────────────────────────────
  // The near railhead of each siding is MEASURED off the plate and stays in
  // scene-layout.ts; everything a car does on that rail is here.
  { path: "yard.sidingX0", label: "Siding start", group: "Yard · sidings", kind: "number", min: 0, max: 0.5, step: 0.005,
    help: "Left edge of a siding, as a fraction of the plate width." },
  { path: "yard.carW", label: "Car cell width", group: "Yard · sidings", kind: "number", min: 0.02, max: 0.15, step: 0.001,
    help: "A car's 128 px atlas cell is contain-fitted into this box; keep it a little wider than the height so HEIGHT binds." },
  { path: "yard.carH", label: "Car cell height", group: "Yard · sidings", kind: "number", min: 0.02, max: 0.15, step: 0.001,
    help: "The binding axis. Body + gap + chip must clear the tightest siding pitch (0.0875); the yard-layout test checks." },
  { path: "yard.carDx", label: "Car pitch", group: "Yard · sidings", kind: "number", min: 0.02, max: 0.15, step: 0.001,
    help: "Horizontal spacing between cars on a siding." },
  { path: "yard.plateW", label: "Name chip width", group: "Yard · sidings", kind: "number", min: 0.01, max: 0.12, step: 0.001 },
  { path: "yard.plateH", label: "Name chip height", group: "Yard · sidings", kind: "number", min: 0.004, max: 0.03, step: 0.0005 },
  { path: "yard.plateGap", label: "Name chip gap", group: "Yard · sidings", kind: "number", min: 0, max: 0.01, step: 0.0005,
    help: "Between the wheels and the chip, as a fraction of the plate width." },
  { path: "yard.assemblyX", label: "Assembly line left", group: "Yard · assembly line", kind: "number", min: 0, max: 0.5, step: 0.005,
    help: "The straight the crane drops cars onto, as fractions of the plate." },
  { path: "yard.assemblyY", label: "Assembly line top", group: "Yard · assembly line", kind: "number", min: 0, max: 1, step: 0.001 },
  { path: "yard.assemblyW", label: "Assembly line width", group: "Yard · assembly line", kind: "number", min: 0.2, max: 1, step: 0.005 },
  { path: "yard.assemblyH", label: "Assembly line height", group: "Yard · assembly line", kind: "number", min: 0.02, max: 0.3, step: 0.005 },

  // ── Stations ──────────────────────────────────────────────────────────────
  ...STATION_SHEETS,
];

/** The tunables under one top-level section, e.g. "stations". */
export function tunablesIn(section: string): readonly Tunable[] {
  return TUNABLES.filter((t) => t.path.startsWith(`${section}.`));
}

/** The sheet for one station: the facts the config holds about it. */
export interface StationSheet {
  label: string;
  /** Only melody stations carry one; a tool station's lane comes from its tool. */
  voice?: SynthInstrumentId;
}

/** The config's shape, as code reads it. The unit test walks TUNABLES against
 *  the JSON; this interface is what keeps the read sites typed. */
export interface GameConfig {
  readonly track: {
    hillsY: number;
    treesY: number;
    groundY: number;
    railY: number;
    foreY: number;
    foreH: number;
    terrainLabelY: number;
    noseXFrac: number;
    coupling: number;
    lanternClearance: number;
    contactShadows: boolean;
    trainSurge: number;
    beatFlick: number;
    soundingLift: number;
    rainTileScale: number;
    bobAmplitudePx: number;
    parallaxSky: number;
    parallaxHills: number;
    parallaxTrees: number;
    parallaxFore: number;
  };
  readonly workshop: {
    rackX0: number;
    rackY0: number;
    rackX1: number;
    rackY1: number;
    rackCols: number;
    gridMinRows: number;
    gridLabelFrac: number;
    gridCellPad: number;
    toolModalX: number;
    toolModalY: number;
    toolModalW: number;
    toolModalH: number;
  };
  readonly yard: {
    sidingX0: number;
    carW: number;
    carH: number;
    carDx: number;
    plateW: number;
    plateH: number;
    plateGap: number;
    assemblyX: number;
    assemblyY: number;
    assemblyW: number;
    assemblyH: number;
  };
  readonly stations: Record<StationId, StationSheet> &
    Record<(typeof MELODY_STATIONS)[number], Required<StationSheet>>;
}

export function readPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const key of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** Set a leaf IN PLACE. Mutating rather than rebuilding is the point: the
 *  scenes hold the config object by reference, so a write here is visible on
 *  their next read with no re-import. */
export function writePath(root: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = root;
  for (const key of keys.slice(0, -1)) {
    const next = cur[key];
    if (!next || typeof next !== "object") {
      const made: Record<string, unknown> = {};
      cur[key] = made;
      cur = made;
    } else {
      cur = next as Record<string, unknown>;
    }
  }
  cur[keys[keys.length - 1]!] = value;
}

function leafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leafPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

/** The problem with `v` as a value of `t`, or null when it is fine. */
function problemWith(t: Tunable, v: unknown): string | null {
  switch (t.kind) {
    case "boolean":
      return typeof v === "boolean" ? null : `expected a boolean, got ${JSON.stringify(v)}`;
    case "text":
      if (typeof v !== "string") return `expected text, got ${JSON.stringify(v)}`;
      return v.trim().length > 0 ? null : "must not be empty";
    case "choice":
      if (typeof v !== "string") return `expected one of ${(t.choices ?? []).join("|")}, got ${JSON.stringify(v)}`;
      return (t.choices ?? []).includes(v) ? null : `${JSON.stringify(v)} is not one of ${(t.choices ?? []).join("|")}`;
    case "number": {
      if (typeof v !== "number" || !Number.isFinite(v)) return `expected a number, got ${JSON.stringify(v)}`;
      if (t.min !== undefined && v < t.min) return `${v} is below ${t.min}`;
      if (t.max !== undefined && v > t.max) return `${v} is above ${t.max}`;
      return null;
    }
  }
}

/**
 * Every problem with a candidate config, as sentences. Empty means valid.
 * Checks both directions: every tunable is present with the right kind and
 * inside its range, and the file carries nothing TUNABLES does not know — a
 * stray key is almost always a renamed tunable whose read site went silent.
 */
export function validateGameConfig(candidate: unknown): string[] {
  const problems: string[] = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return ["config is not an object"];
  }
  const known = new Set<string>();
  for (const t of TUNABLES) {
    known.add(t.path);
    const bad = problemWith(t, readPath(candidate, t.path));
    if (bad) problems.push(`${t.path}: ${bad}`);
  }
  for (const p of leafPaths(candidate)) {
    if (!known.has(p)) problems.push(`${p}: not a known tunable`);
  }
  return problems;
}
