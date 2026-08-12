// The eight instrument characters, and what each one means.
//
// A "station" is one of the characters standing on the Workshop floor. Tapping
// one is how every lane in the app comes into existence, so it is the kid's
// actual choice — and until now it was thrown away the moment the lane was
// made, then guessed back from the lane's kind, clip and synth id.
//
// That guess cannot work, and the failures are not edge cases:
//
//   • the VIOLIN character voices its lane with the `pluck` synth, and `pluck`
//     was not in the guess table at all, so an alien-with-a-violin came back as
//     the bear with the toy keyboard;
//   • VOICE KEYS and MY VOICE both produce a melody lane voiced by
//     `voice:<buffer>` — identical lanes, two different characters;
//   • SOUND PADS and the BEAT MAKER both produce a drum lane over a built-in
//     clip — identical again.
//
// So `Layer.station` records the id, and this module is the single producer of
// what an id means. The Tiled map (`assets/maps/workshop.json`) is where a
// character's position and action live; this is where its identity does.
import { LANE_GROUP_SPRITE } from "./livery-style.ts";
import type { LaneGroup } from "../core/lane-color.ts";
import type { SynthInstrumentId } from "../core/instruments.ts";

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
export type StationId = typeof STATIONS[number];

const KNOWN = new Set<string>(STATIONS);

/** The atlas sprite for a station id, or null when the id is unknown — an old
 *  save, or a character that has since been retired from the shelf. */
export function stationSprite(station: string | undefined): string | null {
  return station && KNOWN.has(station) ? `inst-${station}` : null;
}

/**
 * The picture for a lane: its own station when it has one, else the family's.
 *
 * The fallback is `LANE_GROUP_SPRITE` — the table `car-livery.ts` already uses
 * to draw what a car CARRIES — rather than a second guess table. It is coarser
 * than a station (one picture per family, not per character), which is exactly
 * right for a lane that never recorded which character made it.
 */
export function laneSprite(station: string | undefined, group: LaneGroup): string {
  return stationSprite(station) ?? LANE_GROUP_SPRITE[group];
}

/**
 * The synth a melody station voices its lane with.
 *
 * The violin's is `pluck`, and that is the whole reason this table exists
 * separately from the station id: the CHARACTER is the identity and the SYNTH
 * is the sound, and they are not the same fact. The Tiled map used to hand the
 * synth id straight through as if they were, which is how an alien with a
 * violin arrived in the car as a bear with a toy keyboard.
 *
 * Anything not listed is not a melody station (its lane comes from a tool).
 */
export const STATION_VOICE: Readonly<Partial<Record<StationId, SynthInstrumentId>>> = {
  guitar: "guitar",
  violin: "pluck",
  piano: "piano",
};

/** True when `id` names a melody station the shelf can add directly. */
export function isMelodyStation(id: string): id is StationId {
  return id in STATION_VOICE;
}

/**
 * What to CALL a station's lane.
 *
 * The name follows the character, not the synth, for the same reason the
 * picture does: the editor titled a violin lane "Pluck", which is the voice it
 * happens to use and not anything the kid chose or would recognise.
 */
export const STATION_LABEL: Readonly<Record<StationId, string>> = {
  drums: "Drums",
  mic: "My Voice",
  keys: "Voice Keys",
  pads: "Sound Pads",
  magic: "Magic Pad",
  guitar: "Guitar",
  violin: "Violin",
  piano: "Piano",
  conductor: "Conductor",
};
