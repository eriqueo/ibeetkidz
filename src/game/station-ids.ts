// The station ids, and nothing else.
//
// Split out of `instrument-station.ts` so that `game-config-schema.ts` can
// enumerate the station sheets WITHOUT importing the module that reads them
// back out of the config — that would be an import cycle
// (`game-config.ts` → schema → `instrument-station.ts` → `game-config.ts`),
// and a cycle at module-eval time is how a table turns up `undefined` in the
// one import order nobody tested. This file imports nothing.

/** Station ids, as authored. Same stems as the sprites, minus the `inst-` —
 *  the art is `inst-<id>-passive|hover|active`. */
export const STATIONS = [
  "drums",
  "mic",
  "keys",
  "pads",
  "magic",
  "guitar",
  "violin",
  "piano",
  // AR-045: the conductor holds the retired Sound Pads slot. Not an
  // instrument — tapping him opens the whole-train chalkboard, and no lane
  // ever records him — but he IS a character standing on the Workshop floor,
  // which is what this registry is.
  "conductor",
] as const;
export type StationId = (typeof STATIONS)[number];

/** The stations whose tap adds a melody lane directly, voiced by the synth
 *  their sheet names. Every other station opens a tool, and its lane comes
 *  from that tool. This is a property of the character, not a tunable: the
 *  Tiled map's `workshop-add-melody` arg is validated against this list. */
export const MELODY_STATIONS = ["guitar", "violin", "piano"] as const;
export type MelodyStationId = (typeof MELODY_STATIONS)[number];

export function isMelodyStation(id: string): id is MelodyStationId {
  return (MELODY_STATIONS as readonly string[]).includes(id);
}
