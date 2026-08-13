// Car identity — "livery + load".
//
// The problem this exists to solve: with twelve cars in the Yard there was no
// way to tell which was which. Every car is the same dark-brown boxcar sprite,
// and the one label was occluded by the car below it.
//
// The scheme, in priority order (design brief 2026-08-01, §5 and §7):
//
//   DERIVED carries the identity, ASSIGNED carries the tiebreak.
//
//   - LOAD (derived, primary): what the car carries is folded out of its own
//     lanes, so a drum car visibly carries drums and an empty car visibly
//     carries nothing. This is the channel that also TEACHES the app's premise,
//     and it solves the common case — three cars holding three different kinds
//     of sound are already told apart by their contents.
//   - LIVERY (assigned, tiebreak): a colour + shape pair, unique per car. It
//     only has to work in the case the derived channel cannot reach — two cars
//     that genuinely hold the same kind of thing.
//
// Both are PURE FUNCTIONS over data the project already persists — there is no
// new field, no schema bump, no migration. `carCargo` folds `Part.layers`
// through the existing `laneGroup`; the livery is `Part.color`'s position in
// `CAR_COLORS`, which `project-schema.ts` has always required and round-tripped.
//
// Deliberately NOT a tint. Phaser's `setTint` is a multiply and the train atlas
// is dark brown — measured over the opaque pixels of `boxcar-S`, every one of
// the app's car colours multiplies down to a peak channel of ≤61/255, and four
// of five collapse into "dark thing". Colour identity has to be painted BESIDE
// the sprite (see `src/game/car-livery.ts`), never onto it.

import type { CarType, Clip, Part } from "./types.ts";
import { laneGroup, type LaneGroup } from "./lane-color.ts";

/**
 * Everything that makes a car recognisably ITSELF, in one object.
 *
 * The point is that there is exactly ONE producer. Before this, the Workshop,
 * the Yard and the Track each assembled their own shape out of `carLiveries` +
 * `carCargo` + fields off `Part` — four assemblies of the same idea, which is
 * how a car can look like one thing in the shed and another on the rails. A
 * view that consumes this cannot disagree with a view that also consumes it.
 */
export interface CarIdentity {
  readonly partId: string;
  /** The car's NUMBER, 1-based — the channel you can say out loud.
   *
   *  Derived from the livery index, so it is stable for the life of the car and
   *  unique across the yard, and it survives other cars being added or deleted:
   *  it is looked up by the car's own colour, never by its position in an array.
   *  Position-derived identity is precisely how things get lost. */
  readonly number: number;
  readonly name: string;
  readonly liveryIndex: number;
  readonly color: string;
  readonly carType: CarType;
  /** What the car carries, folded live out of its own lanes. */
  readonly cargo: LaneGroup | null;
}

/**
 * The identity of every car in the library, keyed by part id. Resolved over the
 * WHOLE library because livery uniqueness is a property of the set, not of any
 * one car (see `carLiveries`).
 */
export function carIdentities(
  parts: readonly Part[],
  clips: Readonly<Record<string, Clip>>,
): ReadonlyMap<string, CarIdentity> {
  const liveries = carLiveries(parts);
  const out = new Map<string, CarIdentity>();
  for (const part of parts) {
    const liveryIndex = liveries.get(part.id) ?? 0;
    out.set(part.id, {
      partId: part.id,
      number: liveryIndex + 1,
      name: part.name,
      liveryIndex,
      color: part.color,
      carType: part.carType,
      cargo: carCargo(part, clips),
    });
  }
  return out;
}

/**
 * Livery colours, one per car slot — `MAX_CARS` is 10, so this table is 10 long
 * and a full yard has no repeats.
 *
 * TEN DISTINCT HUES, and that count is the reason for the table's length rather
 * than the other way round. It used to hold twelve, and the last four were
 * darker steps of hues already spent: deep sky under sky, deep grape under
 * grape, deep grass under grass. On the rack that reads as Eric described it —
 * "light purple dark purple, light green dark green" — twelve chips of which
 * only eight are nameable. A four-year-old picks a car by saying its colour out
 * loud, and "the dark green one, not that dark green one" is not a name.
 *
 * So every entry below is a different crayon: red, orange, yellow, green, teal,
 * sky, purple, pink, brown, cream. No hue appears twice at two lightnesses, and
 * `MAX_CARS` came down to 10 to match — ten cars is already a long train.
 *
 * Colour is still the TIEBREAK, not the identity: cars 9 and 10 share a glyph
 * shape (`LIVERY_GLYPHS` is 8 long, indexed mod 8) but never a colour, and load
 * distinguishes most cars before either channel is needed.
 */
export const CAR_COLORS: readonly string[] = [
  "#e8503a", // 0  red
  "#f08a3c", // 1  orange
  "#ffcc3e", // 2  yellow
  "#5bbf52", // 3  green
  "#37b6a4", // 4  teal
  "#4aa3df", // 5  sky
  "#8a5cc4", // 6  purple
  "#d94f86", // 7  pink
  "#a9714b", // 8  brown
  "#f4e8c1", // 9  cream
];

/** Position of `color` in `CAR_COLORS`, or -1 — e.g. a pre-2026-08 save whose
 *  cars carry colours from the retired 5-entry table. */
export function liveryIndexOf(color: string): number {
  return CAR_COLORS.indexOf(color.toLowerCase());
}

/** The lowest-index livery colour no car is already wearing. Deterministic and
 *  pure — no RNG — so `addCar` stays a reducer. Wraps by count once every entry
 *  is taken, which `MAX_CARS` makes unreachable but which must still terminate. */
export function nextCarColor(parts: readonly Part[]): string {
  const taken = new Set(parts.map((p) => p.color.toLowerCase()));
  const free = CAR_COLORS.find((c) => !taken.has(c));
  return free ?? (CAR_COLORS[parts.length % CAR_COLORS.length] as string);
}

/**
 * Livery index per car, resolved over the WHOLE library rather than per car.
 *
 * Resolving one part at a time cannot guarantee uniqueness: an old save's cars
 * carry colours that are not in the table at all, and a hash of the id would
 * collide. Two passes fix that and stay pure:
 *
 *   1. every car whose colour IS in the table claims that index (first car
 *      wins a duplicate, so a save written before `duplicateCar` stopped
 *      copying colours still resolves);
 *   2. every remaining car takes the lowest index nobody has claimed.
 *
 * At `MAX_CARS` = 12 with a 12-entry table this is collision-free by
 * construction, and it is stable: a car keeps its livery as others come and go,
 * because its own colour is what it is looked up by.
 */
export function carLiveries(parts: readonly Part[]): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  const claimed = new Set<number>();
  const unresolved: string[] = [];

  for (const part of parts) {
    const i = liveryIndexOf(part.color);
    if (i >= 0 && !claimed.has(i)) {
      claimed.add(i);
      out.set(part.id, i);
    } else {
      unresolved.push(part.id);
    }
  }

  let next = 0;
  for (const id of unresolved) {
    while (next < CAR_COLORS.length && claimed.has(next)) next += 1;
    // Past the end of the table (only reachable above MAX_CARS) indices repeat
    // rather than going undefined — a duplicate livery beats a missing one.
    const i = next < CAR_COLORS.length ? next : out.size % CAR_COLORS.length;
    claimed.add(i);
    out.set(id, i);
  }
  return out;
}

/** Order used to break a tie between two equally-common families. Fixed rather
 *  than "whichever the fold saw first" so the load a car shows cannot depend on
 *  the order a kid happened to add lanes in. */
const CARGO_PRIORITY: readonly LaneGroup[] = ["voice", "melody", "tone", "drum"];

/**
 * What a car is CARRYING: the dominant instrument family across its lanes, or
 * `null` when it holds nothing yet.
 *
 * Per-family (not per-clip) on purpose — that is the granularity `laneGroup`
 * already draws the Workshop's lane colours at, so the load a car shows in the
 * Yard is the same vocabulary as the lanes the kid stacked in the Workshop.
 *
 * `null` for an empty car is the point, not an oversight: a car with nothing on
 * it *looks* empty, which is true and is a call to action. An assigned-only
 * scheme has to invent a "nothing yet" state and then explain it.
 */
export function carCargo(
  part: Part,
  clips: Readonly<Record<string, Clip>>,
): LaneGroup | null {
  if (part.layers.length === 0) return null;
  const counts = new Map<LaneGroup, number>();
  for (const layer of part.layers) {
    const group = laneGroup(layer.kind, clips[layer.clipId]);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  let best: LaneGroup | null = null;
  let bestCount = 0;
  for (const group of CARGO_PRIORITY) {
    const n = counts.get(group) ?? 0;
    if (n > bestCount) {
      best = group;
      bestCount = n;
    }
  }
  return best;
}
