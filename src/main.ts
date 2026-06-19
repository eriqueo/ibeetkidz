// Entry point. Wires the hexagonal core to the Tone adapter, builds the shell,
// and gates all audio behind the boot button (Web Audio requires a user gesture).

import "./style.css";
import { AudioEngine } from "./core/audio-engine.ts";
import { ToneSoundPort } from "./adapters/tone-sound-port.ts";
import { LocalStoragePort } from "./adapters/local-storage-port.ts";
import { createRng } from "./core/rng.ts";
import { generateBeat } from "./core/generative.ts";
import { registry } from "./machines/index.ts";
import { buildShell } from "./ui/shell.ts";
import { createVisualizer } from "./visualizer/visualizer.ts";
import { type Command, type Project } from "./core/types.ts";
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

// Dispatch wrapper: mutate history, then reconcile the live transport if a beat
// is playing so beat-grid / mixer edits are heard immediately.
const dispatch = (cmd: Command): void => {
  history = histDispatch(history, cmd);
  if (engine.isPlaying) engine.reconcile(getProject());
};

const ctx = { sound, rng, dispatch, getProject };

/** Persist every recording clip's audio bytes alongside the project JSON. */
async function persist(): Promise<void> {
  const project = getProject();
  await storage.saveProject(project);
  for (const clip of Object.values(project.clips)) {
    if (clip.source.kind === "recording") {
      const blob = sound.getRecordingBlob(clip.source.bufferId);
      if (blob) await storage.putBlob(clip.source.bufferId, blob);
    }
  }
}

/** Re-load the most recent saved project (if any) and rehydrate its audio. */
async function loadLast(): Promise<void> {
  const metas = await storage.listProjects();
  if (metas.length === 0) return;
  const latest = [...metas].sort((a, b) => b.savedAt - a.savedAt)[0]!;
  const project = await storage.loadProject(latest.id);
  if (!project) return;
  for (const clip of Object.values(project.clips)) {
    if (clip.source.kind === "recording") {
      const blob = await storage.getBlob(clip.source.bufferId);
      if (blob) await sound.rehydrate(clip.source.bufferId, blob);
    }
  }
  history = initHistory(project);
}

function boot(): void {
  const gate = document.getElementById("boot-gate")!;
  const app = document.getElementById("app")!;
  const button = document.getElementById("boot-button") as HTMLButtonElement;

  button.addEventListener(
    "click",
    async () => {
      button.disabled = true;
      await engine.start(); // resume context + load builtins (user gesture)
      await loadLast(); // bring back the last jam, if there is one
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
          if (engine.isPlaying) engine.reconcile(getProject());
        },
        redo: () => {
          history = histRedo(history);
          if (engine.isPlaying) engine.reconcile(getProject());
        },
        save: () => void persist(),
        surprise: () => {
          for (const cmd of generateBeat(rng)) dispatch(cmd);
          shell.showMachine("looper-stage");
        },
        getProject,
      });

      shell.showMachine(getProject().activeMachineId);
    },
    { once: true },
  );
}

boot();
