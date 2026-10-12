// The live game config: the numbers a scene reads instead of hardcoding.
//
// `gameConfig` is ONE object for the life of the page, held by reference by
// every read site (`TrackV3Scene`, `train-motion.ts`). `applyGameConfig` writes
// into it in place rather than replacing it, so a scene re-mounted after a
// `?tune` edit sees the new values with no re-import and no plumbing. In a
// production build nothing ever calls `applyGameConfig`; the object is simply
// the validated JSON.
//
// The JSON is validated at import. A bad committed file fails every unit test
// and every boot, loudly, which is the point: silent fallbacks are how a
// tunable drifts from the value a scene actually uses.
import raw from "./game-config.json";
import {
  TUNABLES,
  readPath,
  validateGameConfig,
  writePath,
  type GameConfig,
} from "./game-config-schema.ts";

const problems = validateGameConfig(raw);
if (problems.length > 0) {
  throw new Error(`game-config.json is invalid:\n  ${problems.join("\n  ")}`);
}

export const gameConfig: GameConfig = raw as GameConfig;

/** Replace every tunable in place from `next`. Validates first and applies
 *  nothing on failure, so a half-typed value in the tune panel can never leave
 *  the live config in a mixed state. Returns the problems (empty = applied). */
export function applyGameConfig(next: unknown): string[] {
  const bad = validateGameConfig(next);
  if (bad.length > 0) return bad;
  const target = gameConfig as unknown as Record<string, unknown>;
  for (const t of TUNABLES) writePath(target, t.path, readPath(next, t.path));
  return [];
}

/** A detached copy, for the tune panel to edit without touching the live one. */
export function snapshotGameConfig(): GameConfig {
  return JSON.parse(JSON.stringify(gameConfig)) as GameConfig;
}
