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
// the scene. `tests/unit/game-config.test.ts` fails if any of the three is
// missing.

export type TunableKind = "number" | "boolean";

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
  readonly help?: string;
}

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
];

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
    const v = readPath(candidate, t.path);
    if (t.kind === "boolean") {
      if (typeof v !== "boolean") problems.push(`${t.path}: expected a boolean, got ${JSON.stringify(v)}`);
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      problems.push(`${t.path}: expected a number, got ${JSON.stringify(v)}`);
      continue;
    }
    if (t.min !== undefined && v < t.min) problems.push(`${t.path}: ${v} is below ${t.min}`);
    if (t.max !== undefined && v > t.max) problems.push(`${t.path}: ${v} is above ${t.max}`);
  }
  for (const p of leafPaths(candidate)) {
    if (!known.has(p)) problems.push(`${p}: not a known tunable`);
  }
  return problems;
}
