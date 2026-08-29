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
import { QuotaExceededError, StorageError } from "../ports/storage-port.ts";
import { AudioEngine } from "../core/audio-engine.ts";
import { createRng, type RngPort } from "../core/rng.ts";
import { generateBeat, type MelodyVoice } from "../core/generative.ts";
import {
  emptyProject,
  initHistory,
} from "../core/project-state.ts";
import type { Command, Project } from "../core/types.ts";
import { lostBy, offersUndo } from "../core/undoable.ts";
import type { KidMessage } from "../core/project-schema.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import { createStore, type Store } from "../state/store.ts";
import { EventBus } from "../game/EventBus.ts";
import type { EventMap } from "../game/EventBus.ts";
import { STATION_VOICE } from "../game/instrument-station.ts";
import type Phaser from "phaser";

// ── Singletons (one per page load) ──────────────────────────────────────────
const toneSound = new ToneSoundPort();
const sound: SoundPort = toneSound;
const storage = new LocalStoragePort();
const engine = new AudioEngine(sound);
const rng: RngPort = createRng(Date.now() & 0xffffffff);

/**
 * The characters a SURPRISE may hand its tune to, bound here at the composition
 * root because `STATION_VOICE` lives in `game/` and the core must not import
 * from it. Derived from that one table rather than restated, so a new melody
 * character joins the surprise the moment it joins the Workshop shelf.
 */
const MELODY_VOICES: MelodyVoice[] = Object.entries(STATION_VOICE)
  .filter(([, instrument]) => instrument !== undefined)
  .map(([station, instrument]) => ({ station, instrument: instrument! }));
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
  // Absolute transport bar (-1 stopped) — lets a test bucket what it hears by
  // the bar the transport says is sounding, not by wall-clock guesswork.
  transportBar: () => number;
  // Whether the boot gesture completed (engine.start resolved) — distinguishes
  // "play refused because unbooted" from "transport started then died".
  engineStarted: () => boolean;
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
  EventBus.on("current-scene-ready", (scene) => {
    lastScene = scene;
    // The dev-only scene editor (`?edit`). This is the SINGLE reference to
    // `src/editor/` from outside it, and it is dynamic on purpose: nothing in
    // the production module graph names that chunk, so it cannot be bundled.
    // `tests/unit/architecture.test.ts` rule 6 asserts this stays the only one,
    // and `scripts/check-no-editor-in-dist.sh` fails the build if it leaks.
    if (new URLSearchParams(window.location.search).has("edit")) {
      void import("../editor/boot.ts").then((m) => m.attachEditor(scene));
    }
  });
  window.__ibeetkidz_test__ = {
    emit: (event, ...args) => EventBus.emit(event, ...args),
    getProject,
    getScene: () => lastScene,
    dispatch: (cmd) => dispatch(cmd),
    audioDiag: () => toneSound.getAudioDiag(),
    transportBar: () => engine.getTransportBar(),
    engineStarted: () => engine.isStarted,
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
//
// It is also where "Undo everywhere" is honoured. EVERY command in the app
// passes through here, so classifying destruction at this one point (against
// `core/undoable.ts`) is what makes the promise hold for commands nobody has
// written yet — the alternative, remembering to offer undo at each of the ✕
// buttons, is a promise that decays with the next feature.
function dispatch(cmd: Command): void {
  const before = store.getSnapshot();
  store.dispatch(cmd);
  if (engine.isPlaying) engine.reconcile(getProject());
  // A no-op command changes nothing and pushes no history entry, so there would
  // be nothing for "put it back" to restore — checking the store rather than
  // the command keeps this honest about what actually happened.
  if (store.getSnapshot() === before) return;
  const lost = offersUndo(cmd) ? lostBy(cmd) : null;
  if (lost) EventBus.emit("undo-offered", lost);
  else EventBus.emit("undo-withdrawn");
}

/**
 * The BATCH arm of the same funnel: many commands, ONE history entry.
 *
 * Reach for this whenever a kid experiences something as a single action —
 * "Surprise me" is ~15 commands, and putting a sound in the car from the Sound
 * Pads is two (the clip, then the lane). Dispatched one at a time, undoing them
 * is one tap per command, which is not undo.
 *
 * `offer` is the words the "put it back" chip should show, for the rare
 * ADDITIVE batch that still deserves the offer because it rewrote the whole car
 * in one tap. Omit it and the batch behaves like every other non-destructive
 * command: it WITHDRAWS any standing offer, because a chip left up after an
 * unrelated edit would undo the wrong thing (`store.undo()` pops the last
 * entry, not the one the chip is talking about).
 */
function dispatchAll(cmds: readonly Command[], offer?: string): void {
  if (cmds.length === 0) return;
  const before = store.getSnapshot();
  store.dispatchAll(cmds);
  if (engine.isPlaying) engine.reconcile(getProject());
  // Same rule as the single-command arm: ask the STORE whether anything moved,
  // not the commands what they intended. A batch can be entirely refused.
  if (store.getSnapshot() === before) return;
  if (offer) EventBus.emit("undo-offered", offer);
  else EventBus.emit("undo-withdrawn");
}

// ── "I can't save your song" channel ────────────────────────────────────────
// `LocalStoragePort` throws `QuotaExceededError` from two places (saveProject,
// putBlob) and nothing anywhere caught it: both persist() call sites are
// `void persist()`, so a full device turned the rejection into an unhandled
// promise rejection and autosave silently stopped. Saving is also simply
// unavailable in Safari private mode. Neither is fatal — a kid should keep
// playing — so the failure is recorded here and surfaced once, in kid words.

export type StorageTrouble = "full" | "blocked";

/** What the notice is about, and the exact words to show.
 *
 *  The words travel WITH the reason rather than being looked up from the kind,
 *  because not every reason has copy this file can own: an unreadable or
 *  too-new save is described by the parse layer (`project-schema.ts`), which is
 *  the only place that knows *why* it could not be read. Carrying a
 *  `KidMessage` is what lets that copy reach a child instead of being flattened
 *  into a generic "I can't save here". */
interface Notice {
  readonly kind: StorageTrouble | "save";
  readonly copy: KidMessage;
}

let storageTrouble: Notice | null = null;
const troubleListeners = new Set<() => void>();

function getStorageTrouble(): Notice | null {
  return storageTrouble;
}

function emitStorageTrouble(next: Notice | null): void {
  if (storageTrouble?.kind === next?.kind) return;
  storageTrouble = next;
  for (const listener of troubleListeners) listener();
}

/** Flag that saving is broken. "full" wins over "blocked" — a full device is
 *  the more actionable message and must not be downgraded by a later probe. */
export function reportStorageTrouble(kind: StorageTrouble): void {
  if (storageTrouble?.kind === "full" && kind === "blocked") return;
  emitStorageTrouble({ kind, copy: TROUBLE_COPY[kind] });
}

/** Show the parse layer's own words for a save that could not be read — a
 *  corrupted one, or one written by a newer ibeetkidz. `StorageError` carries
 *  the `KidMessage`; this is the only thing that puts it on screen. */
export function reportSaveTrouble(copy: KidMessage): void {
  emitStorageTrouble({ kind: "save", copy });
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

export function useStorageTrouble(): Notice | null {
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
    for (const clip of Object.values(project.clips)) {
      if (clip.source.kind === "recording") {
        const blob = sound.getRecordingBlob(clip.source.bufferId);
        if (blob) await storage.putBlob(clip.source.bufferId, blob);
      }
    }
    // Blobs are the transaction's payload; the project index is its commit
    // point. Never publish an index that names audio we failed to persist.
    // Passing the whole history also lets the adapter collect recordings that
    // no reachable undo/redo state can restore.
    await storage.saveProject(project, store.getSnapshot());
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
  // Don't re-arm against a sink we already know is full. Without this the
  // debounce keeps firing every 800ms of editing, forever, retrying a write
  // that cannot succeed — an unbounded retry against a known-dead sink. The
  // notice is already on screen; dismissing it (clearStorageTrouble) is what
  // says "I made space", and that resumes autosave.
  //
  // Only "full" latches. "blocked" (private mode) is a property of the browser
  // session rather than something the kid can fix, and a cheap failed write
  // there costs nothing, so it keeps trying in case permission is granted.
  if (storageTrouble?.kind === "full") return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => void persist(), 800);
});

/** Re-load the most recent saved project and rehydrate its recorded audio. */
export async function loadLast(): Promise<void> {
  const metas = await storage.listProjects();
  if (metas.length === 0) return;
  const latest = [...metas].sort((a, b) => b.savedAt - a.savedAt)[0];
  if (!latest) return;
  // An unreadable or too-new save throws a StorageError carrying the parse
  // layer's own kid-legible words (S5/S6). Without this catch the child gets a
  // blank project and no explanation — the failure is typed and tested, but
  // never reaches a screen.
  let project: Project | null;
  try {
    project = await storage.loadProject(latest.id);
  } catch (err) {
    const copy = err instanceof StorageError ? err.kidMessage : undefined;
    if (copy) reportSaveTrouble(copy);
    else console.warn("could not load the last project", err);
    return;
  }
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
  /** Many commands as ONE undo step. `offer` = the "put it back" chip's words,
   *  for an additive batch that still earns the offer (see the funnel). */
  dispatchAll(cmds: readonly Command[], offer?: string): void;
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
  dispatchAll,
  // Moving through history retires any standing offer. The chip hides itself
  // when TAPPED, but that is not the only way here — and a chip left standing
  // after an undo is worse than no chip: the history has already moved, so the
  // next tap would undo whatever came before the thing it claims to restore.
  undo: () => {
    store.undo();
    EventBus.emit("undo-withdrawn");
    if (engine.isPlaying) engine.reconcile(getProject());
  },
  redo: () => {
    store.redo();
    EventBus.emit("undo-withdrawn");
    if (engine.isPlaying) engine.reconcile(getProject());
  },
  save: () => void persist(),
  // ONE undo step, not fifteen. A surprise is ~15 commands and used to dispatch
  // them one at a time, so a kid who wanted their car back had to tap undo
  // fifteen times — which is not undo. It is the kid's single action, so it is
  // one history entry, and it gets the same "put it back" offer a deletion does
  // (the rare additive batch that earns one: it rewrites the whole car).
  surprise: () => {
    dispatchAll(
      [...generateBeat(rng, MELODY_VOICES), { type: "setActiveMachine", machineId: "looper-stage" }],
      "Surprise",
    );
  },
  getProject,
};

// The scene-side "put it back" chip, answered here. Module scope rather than a
// component effect, matching the store subscription above: the offer can be
// tapped in any view, and this is the singleton that owns undo. It closes the
// last gap in "Forgiving UX. Undo everywhere" — the history stack, the store
// method and this API have all existed since v1 with no caller.
EventBus.on("undo-requested", () => api.undo());

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
  const copy = trouble.copy;
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
