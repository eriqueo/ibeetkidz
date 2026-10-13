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
// what an id means. Three files share the job: `assets/maps/workshop.json` is
// where a character's position, sprite and tap action live; `station-ids.ts`
// is the closed list of ids and which of them are melody stations; and the
// per-station SHEET in `game-config.json` (`stations.<id>`) holds the facts a
// grown-up may change without code — the lane's name and, for a melody
// station, its voice. This module reads those sheets live, so the `?tune`
// panel's edits apply to the next lane made.
import { LANE_GROUP_SPRITE } from "./livery-style.ts";
import type { LaneGroup } from "../core/lane-color.ts";
import type { SynthInstrumentId } from "../core/instruments.ts";
import { gameConfig } from "./game-config.ts";
import {
  MELODY_STATIONS,
  STATIONS,
  isMelodyStation,
  type MelodyStationId,
  type StationId,
} from "./station-ids.ts";

export { MELODY_STATIONS, STATIONS, isMelodyStation };
export type { MelodyStationId, StationId };

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
 * The character who RIDES a car for a lane — the crew's collapse rule, ONE
 * producer for the Workshop car and the Track train.
 *
 * Drum-kind lanes ride their own character when the station has one (the
 * Magic Pad fox, the microphone chipmunk — their AR-046 poses exist and a
 * kid's creation deserves its face), and the frog otherwise (the drums
 * character, plus every legacy/pads/unknown drum lane — the retired raccoon
 * must not ride). Tapping ANY percussion character opens the one drum grid;
 * identity is who rides, not who edits — "I don't want to see five frogs"
 * was about duplicates, never about erasing the fox.
 */
export function riderSprite(
  station: string | undefined,
  kind: "drum" | "melody",
  group: LaneGroup,
): string {
  if (kind === "drum") {
    if (station === "mic") return "inst-mic";
    if (station === "magic") return "inst-magic";
    return "inst-drums";
  }
  return laneSprite(station, group);
}

/**
 * The synth a melody station voices its lane with, from its sheet.
 *
 * The CHARACTER is the identity and the SYNTH is the sound, and they are not
 * the same fact. The Tiled map used to hand the synth id straight through as
 * if they were, which is how an alien with a violin arrived in the car as a
 * bear with a toy keyboard. All three sheets happen to name their own id
 * today; the next character (a cello on the violin's voice) splits them again.
 *
 * Null for a tool station: its lane comes from a panel, not from naming a synth.
 */
export function stationVoice(station: string | undefined): SynthInstrumentId | null {
  return station !== undefined && isMelodyStation(station)
    ? gameConfig.stations[station].voice
    : null;
}

/**
 * What to CALL a station's lane, from its sheet.
 *
 * The name follows the character, not the synth, for the same reason the
 * picture does: the editor titled a violin lane "Pluck", which is the voice it
 * happens to use and not anything the kid chose or would recognise.
 */
export function stationLabel(station: string | undefined): string | null {
  return station !== undefined && KNOWN.has(station)
    ? gameConfig.stations[station as StationId].label
    : null;
}

/** Every melody station with its current voice — what a SURPRISE may hand a
 *  tune to. Read at call time, not at import, so a tuned voice joins the next
 *  surprise. */
export function melodyVoices(): { station: MelodyStationId; instrument: SynthInstrumentId }[] {
  return MELODY_STATIONS.map((station) => ({
    station,
    instrument: gameConfig.stations[station].voice,
  }));
}
