// AppContext: the React-native equivalent of the old MachineContext. Owns the
// app singletons (sound/storage/engine/rng/store) — created once at module load
// so React StrictMode's double-mount can't spin up two AudioContexts — and
// exposes a stable API plus hooks for reading project state.

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ToneSoundPort } from "../adapters/tone-sound-port.ts";
import { LocalStoragePort } from "../adapters/local-storage-port.ts";
import { AudioEngine } from "../core/audio-engine.ts";
import { createRng, type RngPort } from "../core/rng.ts";
import { generateBeat } from "../core/generative.ts";
import {
  emptyProject,
  initHistory,
} from "../core/project-state.ts";
import type { Command, Project } from "../core/types.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import { createStore, type Store } from "../state/store.ts";
import { EventBus } from "../game/EventBus.ts";
import type { EventMap } from "../game/EventBus.ts";
import type Phaser from "phaser";

// ── Singletons (one per page load) ──────────────────────────────────────────
const toneSound = new ToneSoundPort();
const sound: SoundPort = toneSound;
const storage = new LocalStoragePort();
const engine = new AudioEngine(sound);
const rng: RngPort = createRng(Date.now() & 0xffffffff);
const store: Store = createStore(initHistory(emptyProject(`proj-${Date.now()}`)));

const getProject = (): Project => store.getSnapshot().present;

// ── Test bridge (dev-server only) ───────────────────────────────────────────
// The v2 Workshop view is a pure Phaser canvas, so e2e can't click its controls
// through the DOM. We expose the shared EventBus + a live Project getter + the
// last-ready scene so Playwright can drive the app the same way React does — but
// ONLY under the Vite dev server (`import.meta.env.DEV`), never in a build.
interface TestBridge {
  emit: <K extends keyof EventMap>(event: K, ...args: EventMap[K]) => boolean;
  getProject: () => Project;
  getScene: () => Phaser.Scene | null;
  // Test-only command dispatch — used to stage preconditions the v2 UI has no
  // EventBus path for (e.g. emptying the default-seeded train so the Map→Track
  // guard can fire). Goes through the same `dispatch` React uses; no new behavior.
  dispatch: (cmd: Command) => void;
  // Audio health probe: Tone context/transport state + master-output peak
  // (read off the visualizer analyser). Lets e2e assert "samples actually
  // reached the destination", not just "the transport clock ran".
  audioDiag: () => ReturnType<ToneSoundPort["getAudioDiag"]>;
  // Recording probes: decoded length + peak |sample| of a held buffer. The
  // peak is how e2e proves a mic take is REAL AUDIO, not silently-empty (the
  // iOS session-flip bug's failure mode).
  bufferDuration: (bufferId: string) => number | null;
  bufferPeak: (bufferId: string) => number | null;
}
declare global {
  interface Window {
    __ibeetkidz_test__?: TestBridge;
    /** Production audio-health probe (see below) — read-only, opt-in. */
    __ibeetkidz_audio__?: { diag: () => ReturnType<ToneSoundPort["getAudioDiag"]> };
  }
}
if (import.meta.env.DEV && typeof window !== "undefined") {
  let lastScene: Phaser.Scene | null = null;
  EventBus.on("current-scene-ready", (scene) => { lastScene = scene; });
  window.__ibeetkidz_test__ = {
    emit: (event, ...args) => EventBus.emit(event, ...args),
    getProject,
    getScene: () => lastScene,
    dispatch: (cmd) => dispatch(cmd),
    audioDiag: () => toneSound.getAudioDiag(),
    bufferDuration: (bufferId) => toneSound.getBufferDuration(bufferId),
    bufferPeak: (bufferId) => toneSound.getBufferPeak(bufferId),
  };
}

// Production audio-health probe: a desktop "no sound" report can't be debugged
// through the dev-only bridge on the live site, so `?audiodiag` in the URL
// exposes JUST the read-only diagnostics (context/transport state + master
// output peak). Open the live app with ?audiodiag, press play, then run
// `__ibeetkidz_audio__.diag()` in the console: masterPeak > 0 means samples
// are reaching the browser's output — silence beyond that point is the OS /
// output device, not the app.
if (
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("audiodiag")
) {
  window.__ibeetkidz_audio__ = { diag: () => toneSound.getAudioDiag() };
}

// Dispatch wrapper: mutate state, then reconcile the transport if a beat is
// playing so edits are heard immediately (mirrors the old main.ts behavior).
function dispatch(cmd: Command): void {
  store.dispatch(cmd);
  if (engine.isPlaying) engine.reconcile(getProject());
}

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

// Autosave: the Loop Stage is a thing you iterate on, so the jam should always
// be there next visit without the kid remembering to hit save. Debounce so a
// flurry of edits collapses into one write.
let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
store.subscribe(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => void persist(), 800);
});

/** Re-load the most recent saved project and rehydrate its recorded audio. */
export async function loadLast(): Promise<void> {
  const metas = await storage.listProjects();
  if (metas.length === 0) return;
  const latest = [...metas].sort((a, b) => b.savedAt - a.savedAt)[0];
  if (!latest) return;
  const project = await storage.loadProject(latest.id);
  if (!project) return;
  for (const clip of Object.values(project.clips)) {
    if (clip.source.kind === "recording") {
      const blob = await storage.getBlob(clip.source.bufferId);
      if (blob) await sound.rehydrate(clip.source.bufferId, blob);
    }
  }
  store.replace(initHistory(project));
}

export interface AppApi {
  readonly sound: SoundPort;
  readonly rng: RngPort;
  readonly engine: AudioEngine;
  readonly store: Store;
  dispatch(cmd: Command): void;
  undo(): void;
  redo(): void;
  save(): void;
  surprise(): void;
  getProject(): Project;
}

const api: AppApi = {
  sound,
  rng,
  engine,
  store,
  dispatch,
  undo: () => {
    store.undo();
    if (engine.isPlaying) engine.reconcile(getProject());
  },
  redo: () => {
    store.redo();
    if (engine.isPlaying) engine.reconcile(getProject());
  },
  save: () => void persist(),
  surprise: () => {
    for (const cmd of generateBeat(rng)) dispatch(cmd);
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  },
  getProject,
};

const AppContext = createContext<AppApi>(api);

export function AppProvider({ children }: { children: ReactNode }): ReactNode {
  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  return useContext(AppContext);
}

/** Subscribe to the current project (re-renders on any state change). */
export function useProject(): Project {
  return useSyncExternalStore(store.subscribe, getProject, getProject);
}
