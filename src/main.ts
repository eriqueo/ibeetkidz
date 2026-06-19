// Entry point. Wires the hexagonal core to the Tone adapter, builds the shell,
// and gates all audio behind the boot button (Web Audio requires a user gesture).

import "./style.css";
import { AudioEngine } from "./core/audio-engine.ts";
import { ToneSoundPort } from "./adapters/tone-sound-port.ts";
import { LocalStoragePort } from "./adapters/local-storage-port.ts";
import { createRng } from "./core/rng.ts";
import { registry } from "./machines/index.ts";
import { buildShell } from "./ui/shell.ts";
import { createVisualizer } from "./visualizer/visualizer.ts";
import {
  type Command,
  type Project,
} from "./core/types.ts";
import {
  dispatch as histDispatch,
  emptyProject,
  initHistory,
  redo as histRedo,
  undo as histUndo,
  type HistoryState,
} from "./core/project-state.ts";

const sound = new ToneSoundPort();
const storage = new LocalStoragePort();
const engine = new AudioEngine(sound);
const rng = createRng(Date.now() & 0xffffffff);

let history: HistoryState = initHistory(emptyProject(`proj-${Date.now()}`));

const getProject = (): Project => history.present;
const dispatch = (cmd: Command): void => {
  history = histDispatch(history, cmd);
};

const ctx = { sound, rng, dispatch, getProject };

function boot(): void {
  const gate = document.getElementById("boot-gate")!;
  const app = document.getElementById("app")!;
  const button = document.getElementById("boot-button") as HTMLButtonElement;

  button.addEventListener(
    "click",
    async () => {
      button.disabled = true;
      await engine.start(); // resume context + load builtins (user gesture)
      gate.hidden = true;
      app.hidden = false;

      // Floating visualizer canvas behind the machines.
      const canvas = document.createElement("canvas");
      canvas.className = "viz-canvas";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      app.appendChild(canvas);
      const viz = createVisualizer(canvas, engine.getAnalyser(), getProject);
      viz.start();

      const shellRoot = document.createElement("div");
      shellRoot.className = "shell-root";
      app.appendChild(shellRoot);

      const shell = buildShell(shellRoot, registry, engine, ctx, {
        dispatch,
        undo: () => {
          history = histUndo(history);
        },
        redo: () => {
          history = histRedo(history);
        },
        save: () => void storage.saveProject(getProject()),
        surprise: () => {
          // TODO(build): seeded generative beat. Placeholder: nudge tempo.
          dispatch({ type: "setTempo", bpm: rng.int(80, 160) });
        },
        getProject,
      });

      shell.showMachine(getProject().activeMachineId);
    },
    { once: true },
  );
}

boot();
