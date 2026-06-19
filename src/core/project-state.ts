// Pure reducer over the Project. This is the testable heart of the app:
// no DOM, no audio, no Tone.js — just (state, command) -> state.
//
// An UndoStack wraps the reducer to give multi-level undo/redo that can be
// serialized to storage (the kidpix "undo persists across reloads" pattern).

import {
  type Clip,
  type Command,
  type Layer,
  type LaneKind,
  type Project,
  MAX_BPM,
  MAX_LAYERS,
  MIN_BPM,
  STEP_COUNT,
} from "./types.ts";
import type { ScaleId, KeyId } from "./scale.ts";

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export function emptyProject(id: string, name = "My Beat"): Project {
  return {
    id,
    name,
    tempoBpm: 100,
    clips: {},
    layers: [],
    scaleId: "magic",
    keyId: "C",
    swing: 0,
    activeMachineId: "record-voicefx",
  };
}

/** Build a fully-formed Layer from the bits a caller cares about; the melody/
 *  drum-specific fields get sane defaults so every call site stays terse and
 *  every Layer in the Project is complete. */
export function makeLayer(
  partial: Pick<Layer, "id" | "clipId"> & Partial<Layer>,
): Layer {
  const kind: LaneKind = partial.kind ?? "drum";
  return {
    id: partial.id,
    clipId: partial.clipId,
    volume: partial.volume ?? 0.9,
    muted: partial.muted ?? false,
    kind,
    steps:
      kind === "drum"
        ? normalizeSteps(partial.steps)
        : [],
    notes:
      kind === "melody"
        ? normalizeNotes(partial.notes)
        : [],
    wave: partial.wave ?? "triangle",
    echo: clamp(partial.echo ?? 0, 0, 1),
  };
}

const normalizeSteps = (steps?: readonly boolean[]): boolean[] =>
  steps && steps.length === STEP_COUNT
    ? steps.slice()
    : new Array<boolean>(STEP_COUNT).fill(false);

const normalizeNotes = (notes?: readonly (number | null)[]): (number | null)[] =>
  notes && notes.length === STEP_COUNT
    ? notes.slice()
    : new Array<number | null>(STEP_COUNT).fill(null);

export function reduce(state: Project, cmd: Command): Project {
  switch (cmd.type) {
    case "addClip":
      return { ...state, clips: { ...state.clips, [cmd.clip.id]: cmd.clip } };

    case "applyEffect": {
      const clip = state.clips[cmd.clipId];
      if (!clip) return state;
      const updated: Clip = { ...clip, effects: [...clip.effects, cmd.effect] };
      return { ...state, clips: { ...state.clips, [clip.id]: updated } };
    }

    case "addLayer": {
      if (!state.clips[cmd.layer.clipId]) return state; // can't layer an unknown clip
      // Enforce the CPU ceiling: steal the oldest layer when at capacity.
      const base =
        state.layers.length >= MAX_LAYERS ? state.layers.slice(1) : state.layers;
      const layer = makeLayer({ ...cmd.layer, volume: clamp(cmd.layer.volume, 0, 1) });
      return { ...state, layers: [...base, layer] };
    }

    case "removeLayer":
      return {
        ...state,
        layers: state.layers.filter((l) => l.id !== cmd.layerId),
      };

    case "setLayerVolume":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === cmd.layerId ? { ...l, volume: clamp(cmd.volume, 0, 1) } : l,
        ),
      };

    case "toggleLayerMuted":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === cmd.layerId ? { ...l, muted: !l.muted } : l,
        ),
      };

    case "toggleStep":
      return {
        ...state,
        layers: state.layers.map((l) => {
          if (l.id !== cmd.layerId) return l;
          if (cmd.index < 0 || cmd.index >= l.steps.length) return l;
          const steps = l.steps.slice();
          steps[cmd.index] = !steps[cmd.index];
          return { ...l, steps };
        }),
      };

    case "setNote":
      return {
        ...state,
        layers: state.layers.map((l) => {
          if (l.id !== cmd.layerId) return l;
          if (cmd.index < 0 || cmd.index >= l.notes.length) return l;
          const notes = l.notes.slice();
          notes[cmd.index] = cmd.row;
          return { ...l, notes };
        }),
      };

    case "setLayerWave":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === cmd.layerId ? { ...l, wave: cmd.wave } : l,
        ),
      };

    case "setLayerEcho":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === cmd.layerId ? { ...l, echo: clamp(cmd.echo, 0, 1) } : l,
        ),
      };

    case "setTempo":
      return { ...state, tempoBpm: clamp(Math.round(cmd.bpm), MIN_BPM, MAX_BPM) };

    case "setScale":
      return { ...state, scaleId: cmd.scaleId };

    case "setKey":
      return { ...state, keyId: cmd.keyId };

    case "setSwing":
      return { ...state, swing: clamp(cmd.swing, 0, 1) };

    case "setActiveMachine":
      return { ...state, activeMachineId: cmd.machineId };
  }
}

// ── Undo/redo wrapper ──────────────────────────────────────────────────────

export interface HistoryState {
  readonly past: readonly Project[];
  readonly present: Project;
  readonly future: readonly Project[];
}

const HISTORY_LIMIT = 50;

export function initHistory(present: Project): HistoryState {
  return { past: [], present, future: [] };
}

export function dispatch(history: HistoryState, cmd: Command): HistoryState {
  const next = reduce(history.present, cmd);
  if (next === history.present) return history; // no-op commands don't pollute history
  const past = [...history.past, history.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [] };
}

export function undo(history: HistoryState): HistoryState {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1] as Project;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: HistoryState): HistoryState {
  if (history.future.length === 0) return history;
  const next = history.future[0] as Project;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

// ── Serialization (save/load) ───────────────────────────────────────────────

export function serialize(project: Project): string {
  return JSON.stringify(project);
}

export function deserialize(json: string): Project {
  // Trusts our own serialized shape; a hardened validator is a Phase-3 TODO.
  return normalizeProject(JSON.parse(json) as Partial<Project>);
}

const SCALE_SET = new Set<ScaleId>(["magic", "rainbow"]);
const KEY_SET = new Set<KeyId>(["C", "D", "F", "G", "A"]);

/** Back-fill fields that older saves predate (melody lanes, scale/key/swing)
 *  so a jam saved before this feature still loads and plays. */
export function normalizeProject(raw: Partial<Project>): Project {
  const base = emptyProject(raw.id ?? "proj", raw.name ?? "My Beat");
  const scaleId =
    raw.scaleId && SCALE_SET.has(raw.scaleId) ? raw.scaleId : base.scaleId;
  const keyId = raw.keyId && KEY_SET.has(raw.keyId) ? raw.keyId : base.keyId;
  return {
    ...base,
    ...raw,
    scaleId,
    keyId,
    swing: typeof raw.swing === "number" ? clamp(raw.swing, 0, 1) : base.swing,
    tempoBpm:
      typeof raw.tempoBpm === "number"
        ? clamp(Math.round(raw.tempoBpm), MIN_BPM, MAX_BPM)
        : base.tempoBpm,
    clips: raw.clips ?? {},
    layers: (raw.layers ?? []).map((l) => makeLayer(l as Layer)),
    activeMachineId: raw.activeMachineId ?? base.activeMachineId,
  };
}
