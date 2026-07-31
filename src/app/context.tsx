// AppContext: the React-native equivalent of the old MachineContext. Owns the
// app singletons (sound/storage/engine/rng/store) — created once at module load
// so React StrictMode's double-mount can't spin up two AudioContexts — and
// exposes a stable API plus hooks for reading project state.

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type FC,
  type ReactNode,
} from "react";
import { ToneSoundPort } from "../adapters/tone-sound-port.ts";
import { LocalStoragePort } from "../adapters/local-storage-port.ts";
import { QuotaExceededError } from "../ports/storage-port.ts";
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

// ── "I can't save your song" channel ────────────────────────────────────────
// `LocalStoragePort` throws `QuotaExceededError` from two places (saveProject,
// putBlob) and nothing anywhere caught it: both persist() call sites are
// `void persist()`, so a full device turned the rejection into an unhandled
// promise rejection and autosave silently stopped. Saving is also simply
// unavailable in Safari private mode. Neither is fatal — a kid should keep
// playing — so the failure is recorded here and surfaced once, in kid words.

export type StorageTrouble = "full" | "blocked";

let storageTrouble: StorageTrouble | null = null;
const troubleListeners = new Set<() => void>();

function getStorageTrouble(): StorageTrouble | null {
  return storageTrouble;
}

function emitStorageTrouble(next: StorageTrouble | null): void {
  if (storageTrouble === next) return;
  storageTrouble = next;
  for (const listener of troubleListeners) listener();
}

/** Flag that saving is broken. "full" wins over "blocked" — a full device is
 *  the more actionable message and must not be downgraded by a later probe. */
export function reportStorageTrouble(kind: StorageTrouble): void {
  if (storageTrouble === "full" && kind === "blocked") return;
  emitStorageTrouble(kind);
}

/** Dismiss the notice (the kid tapped OK). */
export function clearStorageTrouble(): void {
  emitStorageTrouble(null);
}

function subscribeStorageTrouble(onChange: () => void): () => void {
  troubleListeners.add(onChange);
  return () => {
    troubleListeners.delete(onChange);
  };
}

export function useStorageTrouble(): StorageTrouble | null {
  return useSyncExternalStore(
    subscribeStorageTrouble,
    getStorageTrouble,
    getStorageTrouble,
  );
}

// ── Boot-time environment probe ─────────────────────────────────────────────

export interface BootProbe {
  /** This browser can do Web Audio at all. False here is fatal to boot. */
  readonly audio: boolean;
  /** Saving works. False here is survivable — play on, just don't save. */
  readonly storage: boolean;
}

const PROBE_KEY = "ibeetkidz:probe";

/** Only checks that an AudioContext constructor EXISTS. We deliberately do not
 *  construct a throwaway one: iOS caps live contexts and `ToneSoundPort` owns
 *  the app's only one. A context that exists but refuses to start (blocked
 *  `resume`) is caught by BootGate's try/catch around `engine.start()`. */
function hasAudioContext(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  return (
    typeof w.AudioContext === "function" ||
    typeof w.webkitAudioContext === "function"
  );
}

/** Safari private mode throws on `localStorage.setItem`, and a sandboxed frame
 *  throws on merely touching `indexedDB` — so both are probed inside try. */
function storageReachable(): boolean {
  try {
    localStorage.setItem(PROBE_KEY, "1");
    localStorage.removeItem(PROBE_KEY);
  } catch {
    return false;
  }
  try {
    if (!globalThis.indexedDB) return false;
  } catch {
    return false;
  }
  return true;
}

/** Called from inside the boot gesture handler ONLY — never at module load, so
 *  the "nothing touches audio before the boot button" rule still holds. */
export function probeEnvironment(): BootProbe {
  return { audio: hasAudioContext(), storage: storageReachable() };
}

async function persist(): Promise<void> {
  try {
    const project = getProject();
    await storage.saveProject(project);
    for (const clip of Object.values(project.clips)) {
      if (clip.source.kind === "recording") {
        const blob = sound.getRecordingBlob(clip.source.bufferId);
        if (blob) await storage.putBlob(clip.source.bufferId, blob);
      }
    }
  } catch (err) {
    // Autosave fires on a timer; it must never take the app down. Record the
    // failure instead so the kid finds out that saving stopped working.
    reportStorageTrouble(err instanceof QuotaExceededError ? "full" : "blocked");
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

// The notice rides on the provider, not on a view, because saving can break at
// any moment in any view — autosave runs on a timer the whole session.
const TROUBLE_COPY: Record<StorageTrouble, { title: string; body: string }> = {
  full: {
    title: "💾 No more room!",
    body: "This device is full, so I can't keep your song.\nAsk a grown-up to make some space.",
  },
  blocked: {
    title: "💾 I can't save here.",
    body: "Your song won't be waiting next time — but you\ncan still play as much as you want!",
  },
};

const StorageNotice: FC = () => {
  const trouble = useStorageTrouble();
  if (!trouble) return null;
  const copy = TROUBLE_COPY[trouble];
  return (
    <div id="storage-notice" role="alert">
      <p className="storage-notice-title">{copy.title}</p>
      <p className="storage-notice-body">{copy.body}</p>
      <button type="button" onClick={clearStorageTrouble}>
        OK!
      </button>
    </div>
  );
};

export function AppProvider({ children }: { children: ReactNode }): ReactNode {
  return (
    <AppContext.Provider value={api}>
      {children}
      <StorageNotice />
    </AppContext.Provider>
  );
}

export function useApp(): AppApi {
  return useContext(AppContext);
}

/** Subscribe to the current project (re-renders on any state change). */
export function useProject(): Project {
  return useSyncExternalStore(store.subscribe, getProject, getProject);
}
