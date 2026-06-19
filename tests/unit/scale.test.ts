import { describe, expect, it } from "vitest";
import {
  degreeToNote,
  midiToNoteName,
  SCALES,
  KEYS,
} from "../../src/core/scale.ts";

describe("midiToNoteName", () => {
  it("names common MIDI notes", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(69)).toBe("A4");
    expect(midiToNoteName(61)).toBe("C#4");
    expect(midiToNoteName(72)).toBe("C5");
  });
});

describe("degreeToNote", () => {
  it("row 0 is the key's root", () => {
    expect(degreeToNote("magic", "C", 0)).toBe("C4");
    expect(degreeToNote("magic", "G", 0)).toBe("G4");
  });

  it("climbs the pentatonic scale, wrapping octaves", () => {
    // magic = [0,2,4,7,9] from C4 → C4 D4 E4 G4 A4 then C5...
    expect(degreeToNote("magic", "C", 1)).toBe("D4");
    expect(degreeToNote("magic", "C", 4)).toBe("A4");
    expect(degreeToNote("magic", "C", 5)).toBe("C5"); // wraps up an octave
  });

  it("rainbow scale includes the 4th and 7th the pentatonic skips", () => {
    // rainbow = [0,2,4,5,7,9,11] from C4 → ... F4 at degree 3
    expect(degreeToNote("rainbow", "C", 3)).toBe("F4");
    expect(degreeToNote("rainbow", "C", 6)).toBe("B4");
  });

  it("only ever emits in-scale notes (no wrong notes in magic)", () => {
    const allowed = new Set(
      SCALES.magic.intervals.map((i) => (KEYS.C.rootMidi + i) % 12),
    );
    for (let row = 0; row < 20; row++) {
      const note = degreeToNote("magic", "C", row);
      const semitone = SEMITONE[note.replace(/\d+$/, "")] ?? -1;
      expect(allowed.has(semitone)).toBe(true);
    }
  });
});

const SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
  "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};
