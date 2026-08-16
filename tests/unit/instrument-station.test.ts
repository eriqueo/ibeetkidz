import { describe, expect, it } from "vitest";
import {
  STATIONS,
  STATION_VOICE,
  isMelodyStation,
  laneSprite,
  stationSprite,
} from "../../src/game/instrument-station.ts";
import { UI_SPRITES } from "../../src/game/ui-sprites.ts";
import { LANE_GROUP_SPRITE } from "../../src/game/livery-style.ts";
import { parseTiledLayer } from "../../src/game/TiledParser.ts";
import WORKSHOP from "../../src/assets/maps/workshop.json";
import { INSTRUMENTS } from "../../src/core/instruments.ts";

// A lane's PICTURE used to be re-derived from its kind, clip and synth id at
// render time, through a five-branch ladder in Workshop.tsx. It got three cases
// wrong at once (the violin, Voice Keys, and the Sound Pads), and two of those
// are not fixable by a better guess — Voice Keys and My Voice make byte-identical
// lanes, as do the Sound Pads and the Beat Maker. So the station is recorded on
// the lane and this module is the only thing that says what one means.
//
// These tests exist because the failure mode is silent: a wrong station id
// renders SOME character, and the only way to notice is to be Eric, looking at
// the wrong animal in the car.

describe("instrument stations", () => {
  it("every station has art in the atlas manifest", () => {
    for (const id of STATIONS) {
      const key = stationSprite(id);
      expect(key, `station ${id}`).toBe(`inst-${id}`);
      expect(UI_SPRITES[key as string], `${key} missing from UI_SPRITES`).toBeDefined();
    }
  });

  it("covers every instrument character standing on the workshop floor", () => {
    // The shelf is authored in Tiled. A character the map spawns but this module
    // does not know is a lane whose picture falls back to its family — which is
    // the bug, one character at a time.
    const shelf = parseTiledLayer(WORKSHOP, "ui-layer")
      .map((s) => s.sprite)
      .filter((s): s is string => !!s && s.startsWith("inst-"))
      .map((s) => s.slice("inst-".length));
    expect(shelf.length).toBeGreaterThan(0);
    for (const id of new Set(shelf)) {
      expect(STATIONS as readonly string[], `shelf character "${id}"`).toContain(id);
    }
  });

  it("voices every melody station with a real synth, and only those", () => {
    const synths = new Set(INSTRUMENTS.map((i) => i.id as string));
    for (const [station, voice] of Object.entries(STATION_VOICE)) {
      expect(isMelodyStation(station)).toBe(true);
      expect(synths.has(String(voice)), `${station} → ${String(voice)}`).toBe(true);
    }
    // The tool stations add their lanes through a panel, not by naming a synth.
    for (const id of ["drums", "mic", "keys", "pads", "magic"]) {
      expect(isMelodyStation(id), `${id} is not a melody station`).toBe(false);
    }
  });

  it("keeps the violin's IDENTITY separate from its VOICE", () => {
    // The reported bug was that the character is a violin, the sound was a
    // pizzicato pluck, and conflating them lost the character. The character
    // still resolves through the SPRITE table, never through the voice — which
    // is the part that actually broke, and the part that must keep holding
    // whatever the violin ends up sounding like.
    expect(stationSprite("violin")).toBe("inst-violin");
  });

  it("gives the violin a bowed voice of its own, not the pluck placeholder", () => {
    // `pluck` was a stand-in: there was no bowed-string voice in INSTRUMENTS at
    // all, so the violin borrowed the nearest family member (pizzicato). A
    // borrowed voice is exactly the kind of thing that silently becomes
    // permanent, so this pins that the violin now voices ITSELF.
    expect(STATION_VOICE.violin).toBe("violin");
    expect(STATION_VOICE.violin).not.toBe("pluck");
    // …and that the id it names is a real registered instrument, not a string
    // that falls through to the default synth (the original failure mode: the
    // map emitted "violin", which was not a SynthInstrumentId at all).
    expect(INSTRUMENTS.map((i) => i.id)).toContain("violin");
  });

  it("falls back to the family picture for a lane with no station", () => {
    // Every save written before `Layer.station` existed. It must render SOMETHING
    // sensible, and the something is the table the Yard already uses to draw
    // what a car carries — not a second guess.
    expect(laneSprite(undefined, "drum")).toBe(LANE_GROUP_SPRITE.drum);
    expect(laneSprite(undefined, "voice")).toBe(LANE_GROUP_SPRITE.voice);
    // …and for an id from a character that has since left the shelf.
    expect(laneSprite("theremin-wolf", "tone")).toBe(LANE_GROUP_SPRITE.tone);
    // A known station always wins over the family.
    expect(laneSprite("violin", "drum")).toBe("inst-violin");
  });
});
