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
    activeMachineId: "looper-stage", // boot into Home, the stacked mix
  };
}

/** Build a fully-formed Layer from the bits a caller cares about; the melody/
 *  drum-specific fields get sane defaults so every call site stays terse and
 *  every Layer in the Project is complete. */
export function makeLayer(
  partial: Pick<Layer, "id" | "clipId"> & Partial<Layer>,
): Layer {
  const kind: LaneKind = partial.kind ?? "drum";
  const layer: Layer = {
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
    tone: clamp(partial.tone ?? 1, 0, 1),
  };
  // `swing` is genuinely optional (absent = inherit song groove); only set it
  // when provided so we don't pin every lane to a value under exactOptional.
  return partial.swing === undefined
    ? layer
    : { ...layer, swing: clamp(partial.swing, 0, 1) };
}

const normalizeSteps = (steps?: readonly boolean[]): boolean[] =>
  steps && steps.length === STEP_COUNT
    ? steps.slice()
    : new Array<boolean>(STEP_COUNT).fill(false);

/** Coerce any saved `notes` shape into the chord model (array of row-sets).
 *  Tolerates the pre-chord shape where each step was a single row or null. */
function normalizeNotes(
  notes?: readonly (readonly number[] | number | null)[],
): number[][] {
  const empty = (): number[][] =>
    Array.from({ length: STEP_COUNT }, () => []);
  if (!notes || notes.length !== STEP_COUNT) return empty();
  return notes.map((step) => {
    if (Array.isArray(step)) return [...new Set(step)];
    if (typeof step === "number") return [step]; // legacy single-note step
    return []; // null / rest
  });
}

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

    case "renameClip": {
      const clip = state.clips[cmd.clipId];
      if (!clip) return state;
      const label = cmd.label.trim();
      // No-op on blank/unchanged so renaming doesn't pollute undo history.
      if (!label || label === clip.label) return state;
      return { ...state, clips: { ...state.clips, [clip.id]: { ...clip, label } } };
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

    case "toggleNote":
      return {
        ...state,
        layers: state.layers.map((l) => {
          if (l.id !== cmd.layerId) return l;
          if (cmd.index < 0 || cmd.index >= l.notes.length) return l;
          const notes = l.notes.map((s) => s.slice());
          const col = notes[cmd.index] as number[];
          const at = col.indexOf(cmd.row);
          if (at >= 0) col.splice(at, 1); // tap again to remove
          else col.push(cmd.row); // stack another note → chord
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

    case "setLayerTone":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === cmd.layerId ? { ...l, tone: clamp(cmd.tone, 0, 1) } : l,
        ),
      };

    case "setLayerSwing":
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === cmd.layerId ? { ...l, swing: clamp(cmd.swing, 0, 1) } : l,
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
