// Machine registry. Order here = order in the toolbar. Adding a machine is a
// one-line addition — no plumbing changes (the kidpix Tool-contract promise).

import { createRegistry } from "../core/machine.ts";
import { recordVoiceFxMachine } from "./record-voicefx.ts";
import { soundPadsMachine } from "./sound-pads.ts";
import { beatGridMachine } from "./beat-grid.ts";
import { looperStageMachine } from "./looper-stage.ts";
import { thereminXyMachine } from "./theremin-xy.ts";

export const registry = createRegistry([
  recordVoiceFxMachine, // hero
  soundPadsMachine,
  beatGridMachine,
  looperStageMachine,
  thereminXyMachine,
]);
