// "Surprise me" — a seeded generative drum beat. Pure: given an RngPort it
// returns a list of Commands the app reduces. Same seed → same beat (testable,
// and the kidpix "randomness is reproducible" rule). No Math.random here.

import type { Clip, Command } from "./types.ts";
import { STEP_COUNT } from "./types.ts";
import { makeLayer } from "./project-state.ts";
import type { RngPort } from "./rng.ts";
import { DRUM_SOUNDS } from "./sound-catalog.ts";

// Same id scheme as the Beat Maker (`beat-<assetId>`) so a generated beat and a
// hand-made one share ONE layer per drum — no duplicate rows in the Loop Stage.
const LAYER_ID = (assetId: string): string => `beat-${assetId}`;

/** Build a fresh beat: clears prior generated layers, then lays down a kick +
 *  snare + hat groove with seeded variation, optionally adding clap/tom. */
export function generateBeat(rng: RngPort): Command[] {
  const cmds: Command[] = [];

  // Start clean so re-rolling replaces rather than stacks.
  for (const drum of DRUM_SOUNDS) {
    cmds.push({ type: "removeLayer", layerId: LAYER_ID(drum.assetId) });
  }

  cmds.push({ type: "setTempo", bpm: rng.int(95, 140) });

  // Core groove is always kick + snare + hihat; clap/tom are seeded extras.
  // Surprise stays musical by drawing only from the original groove kit — the
  // wider rework palette (openhat/rim/shaker/conga) is for hands-on use.
  const always = new Set(["kick", "snare", "hihat"]);
  const grooveKit = new Set(["kick", "snare", "hihat", "clap", "tom"]);
  for (const drum of DRUM_SOUNDS) {
    if (!grooveKit.has(drum.assetId)) continue;
    const include = always.has(drum.assetId) || rng.next() < 0.4;
    if (!include) continue;

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

  return cmds;
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
