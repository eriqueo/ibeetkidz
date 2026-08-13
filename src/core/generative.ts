// "Surprise me" — a seeded generative SONG: a drum groove plus a tune over it.
// Pure: given an RngPort it returns a list of Commands the app reduces. Same
// seed → same song (testable, and the kidpix "randomness is reproducible"
// rule). No Math.random here.

import type { Clip, Command, StepNote } from "./types.ts";
import { MAX_LAYERS, STEP_COUNT } from "./types.ts";
import { makeLayer } from "./project-state.ts";
import { MELODY_ROWS } from "./scale.ts";
import type { InstrumentId } from "./instruments.ts";
import type { RngPort } from "./rng.ts";
import { DRUM_SOUNDS } from "./sound-catalog.ts";

// Same id scheme as the Beat Maker (`beat-<assetId>`) so a generated beat and a
// hand-made one share ONE layer per drum — no duplicate rows in the Loop Stage.
const LAYER_ID = (assetId: string): string => `beat-${assetId}`;
/** The generated tune and its bass line, one id each for the same reason. */
const TUNE_ID = "beat-tune";
const BASS_ID = "beat-bass";

/**
 * A character a surprise may hand the tune to.
 *
 * Injected rather than imported: which CHARACTER plays which synth lives in
 * `game/instrument-station.ts` (it is the same table the Workshop shelf reads),
 * and the core does not import from `game` — that would point the inner layer
 * at an outer one and close a cycle, since that module already reads core. The
 * composition root passes the list down, which is where a dependency like this
 * belongs.
 */
export interface MelodyVoice {
  readonly station: string;
  readonly instrument: InstrumentId;
}

/**
 * Build a fresh surprise: a kick/snare/hat groove, one seeded extra drum, a
 * TUNE over the top, and sometimes a bass line under it.
 *
 * It used to be drums only — "the SURPRISE ME is always just a drum beat?" —
 * which made the one button that is supposed to show a four-year-old what this
 * app DOES demonstrate only a third of it. A surprise is now a little song.
 *
 * The layer budget is real and is why the drums lost their second extra:
 * `MAX_LAYERS` is 6 and `addLayer` REFUSES past it, so a generator that always
 * laid five drums could only ever add a tune by silently having it dropped.
 * Worst case here is 4 drums + tune + bass = exactly 6.
 */
export function generateBeat(rng: RngPort, voices: readonly MelodyVoice[] = []): Command[] {
  const cmds: Command[] = [];

  // Start clean so re-rolling replaces rather than stacks.
  for (const drum of DRUM_SOUNDS) {
    cmds.push({ type: "removeLayer", layerId: LAYER_ID(drum.assetId) });
  }
  cmds.push({ type: "removeLayer", layerId: TUNE_ID });
  cmds.push({ type: "removeLayer", layerId: BASS_ID });

  cmds.push({ type: "setTempo", bpm: rng.int(95, 140) });

  // Core groove is always kick + snare + hihat, plus ONE seeded extra. Surprise
  // stays musical by drawing only from the original groove kit — the wider
  // rework palette (openhat/rim/shaker/conga) is for hands-on use.
  const always = ["kick", "snare", "hihat"];
  const extras = ["clap", "tom"];
  const extra = rng.next() < 0.7 ? extras[rng.int(0, extras.length - 1)] : undefined;
  const kit = new Set(extra ? [...always, extra] : always);
  for (const drum of DRUM_SOUNDS) {
    if (!kit.has(drum.assetId)) continue;

    const clip: Clip = {
      id: LAYER_ID(drum.assetId),
      source: { kind: "builtin", assetId: drum.assetId },
      effects: [],
      color: drum.color,
      label: drum.label,
    };
    cmds.push({ type: "addClip", clip });

    const layer = makeLayer({
      id: LAYER_ID(drum.assetId),
      clipId: clip.id,
      kind: "drum",
      steps: patternFor(drum.assetId, rng),
    });
    cmds.push({ type: "addLayer", layer });
  }

  // ── the tune ──────────────────────────────────────────────────────────────
  // A character plays it, not a bare synth id: `station` is what the Workshop
  // draws the rider and the lane picture from, so a surprise whose lane had no
  // station would put a generic instrument in the car instead of a musician.
  const voice = voices[rng.int(0, Math.max(0, voices.length - 1))];
  if (voice) {
    cmds.push({
      type: "addClip",
      clip: {
        id: TUNE_ID,
        source: { kind: "builtin", assetId: "note-do" },
        effects: [],
        color: "#06d6a0",
        label: "Tune",
      },
    });
    cmds.push({
      type: "addLayer",
      layer: makeLayer({
        id: TUNE_ID,
        clipId: TUNE_ID,
        kind: "melody",
        instrument: voice.instrument,
        station: voice.station,
        notes: tuneFor(rng),
      }),
    });
  }

  // ── and sometimes a bass under it ─────────────────────────────────────────
  if (cmds.filter((c) => c.type === "addLayer").length < MAX_LAYERS && rng.next() < 0.6) {
    cmds.push({
      type: "addClip",
      clip: {
        id: BASS_ID,
        source: { kind: "builtin", assetId: "note-do" },
        effects: [],
        color: "#3a86ff",
        label: "Bass",
      },
    });
    cmds.push({
      type: "addLayer",
      layer: makeLayer({
        id: BASS_ID,
        clipId: BASS_ID,
        kind: "melody",
        instrument: "soft",
        station: "keys",
        notes: bassFor(rng),
      }),
    });
  }

  return cmds;
}

/** An empty melody grid — one chord slot per step, all silent. */
const emptyNotes = (): StepNote[][] => Array.from({ length: STEP_COUNT }, () => []);

/**
 * A singable 16-step phrase.
 *
 * Built from scale DEGREES, never from note names: `degreeToNote` maps a row
 * through the project's own scale and key at schedule time, so whatever the kid
 * has picked, a surprise cannot land out of key. Degrees walk by step or by a
 * small leap and settle back on the tonic, which is what makes eight random
 * numbers sound like a tune rather than like eight random numbers.
 */
function tuneFor(rng: RngPort): StepNote[][] {
  const notes = emptyNotes();
  // Two bars' worth of phrasing inside one bar: a note every other step, with
  // the odd rest, so it breathes instead of running as constant eighths.
  let row = 0;
  for (let i = 0; i < STEP_COUNT; i += 2) {
    if (i > 0 && rng.next() < 0.25) continue; // a rest
    const move = rng.next();
    row += move < 0.45 ? 1 : move < 0.75 ? -1 : move < 0.9 ? 2 : -2;
    row = Math.max(0, Math.min(MELODY_ROWS - 1, row));
    // Land home at the end of the bar — the phrase has to arrive somewhere.
    if (i >= STEP_COUNT - 2) row = 0;
    notes[i] = [{ row, length: rng.next() < 0.3 ? 2 : 1 }];
  }
  return notes;
}

/** A root-and-fifth bass on the beat: the simplest thing that makes a groove
 *  feel like it has a floor under it. */
function bassFor(rng: RngPort): StepNote[][] {
  const notes = emptyNotes();
  for (let i = 0; i < STEP_COUNT; i += 4) {
    notes[i] = [{ row: rng.next() < 0.7 ? 0 : 4, length: 2 }];
  }
  return notes;
}

/** Role-aware 16-step pattern with a little seeded jitter. */
function patternFor(assetId: string, rng: RngPort): boolean[] {
  const steps = new Array<boolean>(STEP_COUNT).fill(false);
  const on = (i: number) => {
    if (i >= 0 && i < STEP_COUNT) steps[i] = true;
  };

  switch (assetId) {
    case "kick":
      [0, 4, 8, 12].forEach(on);
      if (rng.next() < 0.5) on(10); // syncopated extra
      break;
    case "snare":
    case "clap":
      [4, 12].forEach(on);
      break;
    case "hihat":
      for (let i = 0; i < STEP_COUNT; i += 2) on(i);
      if (rng.next() < 0.4) for (let i = 1; i < STEP_COUNT; i += 4) on(i);
      break;
    case "tom":
      [14, 15].forEach((i) => rng.next() < 0.6 && on(i)); // end-of-bar fill
      break;
    default:
      for (let i = 0; i < STEP_COUNT; i++) if (rng.next() < 0.2) on(i);
  }
  return steps;
}
