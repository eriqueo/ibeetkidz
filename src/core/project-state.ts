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
  type Roll,
  type StepNote,
  MAX_BPM,
  MAX_LAYERS,
  MIN_BPM,
  STEP_COUNT,
} from "./types.ts";
import type { ScaleId, KeyId } from "./scale.ts";

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** Longest a note at `index` may span without spilling past the bar end. */
export const maxLengthAt = (index: number): number =>
  Math.max(1, STEP_COUNT - index);

/** Build a clean StepNote: clamp length to the bar, keep roll only when it's a
 *  real fill (2|4), keep slideTo only when it's a finite number. Honors
 *  exactOptionalPropertyTypes by adding optional fields conditionally. */
function makeNote(
  row: number,
  index: number,
  length = 1,
  roll?: number,
  slideTo?: number,
): StepNote {
  const note: StepNote = {
    row: Number.isFinite(row) ? Math.trunc(row) : 0,
    length: clamp(Math.round(length) || 1, 1, maxLengthAt(index)),
  };
  const r = roll === 2 || roll === 4 ? (roll as Roll) : undefined;
  const withRoll = r === undefined ? note : { ...note, roll: r };
  return typeof slideTo === "number" && Number.isFinite(slideTo)
    ? { ...withRoll, slideTo: Math.trunc(slideTo) }
    : withRoll;
}

/** Coerce one raw cell (StepNote | legacy number | boolean | null) at `index`
 *  into a StepNote, or null for an off/rest cell. */
function coerceNote(raw: unknown, index: number): StepNote | null {
  if (raw == null || raw === false) return null;
  if (raw === true) return makeNote(0, index); // legacy drum boolean
  if (typeof raw === "number") return makeNote(raw, index); // legacy melody row
  if (typeof raw === "object") {
    const o = raw as Partial<StepNote>;
    return makeNote(o.row ?? 0, index, o.length ?? 1, o.roll, o.slideTo);
  }
  return null;
}

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

/** Loose constructor input: callers may still hand `steps` as a `boolean[]`
 *  (generative beats, Send-to-Home) and `notes` as legacy `number`/`number[]`
 *  cells. `makeLayer` normalizes everything into the StepNote model, so those
 *  call sites stay untouched. */
export type LayerInit = Pick<Layer, "id" | "clipId"> &
  Partial<Omit<Layer, "steps" | "notes">> & {
    readonly steps?: readonly (StepNote | boolean | null)[];
    readonly notes?: readonly (readonly (StepNote | number)[] | number | null)[];
  };

/** Build a fully-formed Layer from the bits a caller cares about; the melody/
 *  drum-specific fields get sane defaults so every call site stays terse and
 *  every Layer in the Project is complete. */
export function makeLayer(partial: LayerInit): Layer {
  const kind: LaneKind = partial.kind ?? "drum";
  const layer: Layer = {
    id: partial.id,
    clipId: partial.clipId,
    volume: partial.volume ?? 0.9,
    muted: partial.muted ?? false,
    kind,
    steps: kind === "drum" ? normalizeSteps(partial.steps) : [],
    notes: kind === "melody" ? normalizeNotes(partial.notes) : [],
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

/** Coerce any saved drum `steps` shape (boolean[] legacy, or (StepNote|null)[])
 *  into the per-step hit model. One hit (or rest) per step. */
function normalizeSteps(
  steps?: readonly (StepNote | boolean | null)[],
): (StepNote | null)[] {
  if (!steps || steps.length !== STEP_COUNT)
    return new Array<StepNote | null>(STEP_COUNT).fill(null);
  return steps.map((cell, i) => coerceNote(cell, i));
}

/** Coerce any saved `notes` shape into the chord model (array of StepNote per
 *  step). Tolerates the pre-chord shapes where each step was a single row, a
 *  row-set, or null. De-dupes a chord by row so a note is unique per pitch. */
function normalizeNotes(
  notes?: readonly (readonly (StepNote | number)[] | number | null)[],
): StepNote[][] {
  const empty = (): StepNote[][] =>
    Array.from({ length: STEP_COUNT }, () => []);
  if (!notes || notes.length !== STEP_COUNT) return empty();
  return notes.map((step, i) => {
    const cells = Array.isArray(step) ? step : step == null ? [] : [step];
    const byRow = new Map<number, StepNote>();
    for (const cell of cells) {
      const note = coerceNote(cell, i);
      if (note) byRow.set(note.row, note); // last write wins per row
    }
    return [...byRow.values()];
  });
}

// ── Note edit helpers ────────────────────────────────────────────────────────
// Both lane kinds carry StepNotes; these isolate the drum (one cell per step)
// vs melody (a chord per step) shapes so each reducer reads as one intent.

/** Replace one lane (matched by id) via `fn`; identity-stable when `fn` returns
 *  the same Layer, so no-op edits never pollute undo history. Out-of-range step
 *  indices are a no-op. */
function editLane(
  state: Project,
  layerId: string,
  index: number,
  fn: (layer: Layer) => Layer,
): Project {
  let changed = false;
  const layers = state.layers.map((l) => {
    if (l.id !== layerId) return l;
    const span = l.kind === "melody" ? l.notes.length : l.steps.length;
    if (index < 0 || index >= span) return l;
    const next = fn(l);
    if (next !== l) changed = true;
    return next;
  });
  return changed ? { ...state, layers } : state;
}

/** Structural equality for cells, so a resize/roll that lands on the SAME value
 *  (common mid-drag) produces no state change and no undo entry. */
function sameNote(a: StepNote | null, b: StepNote | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.row === b.row &&
    a.length === b.length &&
    a.roll === b.roll &&
    a.slideTo === b.slideTo
  );
}

/** Apply `fn` to the note at (step `index`, pitch `row`) within a lane, writing
 *  back the result (null/absent = remove). Drums hold one cell per step (row
 *  ignored); melody holds a chord keyed by row. Returns the same Layer when the
 *  edit lands on the same value (no undo churn). */
function editNote(
  layer: Layer,
  index: number,
  row: number,
  fn: (note: StepNote | null) => StepNote | null,
): Layer {
  if (layer.kind === "melody") {
    const chord = layer.notes[index] ?? [];
    const at = chord.findIndex((n) => n.row === row);
    const prev = at >= 0 ? (chord[at] as StepNote) : null;
    const next = fn(prev);
    if (sameNote(prev, next)) return layer; // unchanged
    const nextChord =
      next === null
        ? chord.filter((_, i) => i !== at)
        : at >= 0
          ? chord.map((n, i) => (i === at ? next : n))
          : [...chord, next];
    const notes = layer.notes.map((c, i) => (i === index ? nextChord : c));
    return { ...layer, notes };
  }
  const cell = layer.steps[index] ?? null;
  const next = fn(cell);
  if (sameNote(cell, next)) return layer;
  const steps = layer.steps.map((c, i) => (i === index ? next : c));
  return { ...layer, steps };
}

export function reduce(state: Project, cmd: Command): Project {
  switch (cmd.type) {
    case "addClip":
      return { ...state, clips: { ...state.clips, [cmd.clip.id]: cmd.clip } };

    case "removeClip": {
      if (!state.clips[cmd.clipId]) return state;
      // Drop the clip AND any lane that referenced it — a layer can never point
      // at an unknown clip. One command, so undo restores clip + lanes together.
      const { [cmd.clipId]: _removed, ...rest } = state.clips;
      return {
        ...state,
        clips: rest,
        layers: state.layers.filter((l) => l.clipId !== cmd.clipId),
      };
    }

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

    case "setClipLoop": {
      const clip = state.clips[cmd.clipId];
      if (!clip) return state;
      if (cmd.loopBeats === null) {
        if (clip.loopBeats === undefined) return state; // already natural-length
        const { loopBeats: _drop, ...bare } = clip;
        return { ...state, clips: { ...state.clips, [clip.id]: bare } };
      }
      const beats = Math.max(1, Math.round(cmd.loopBeats)); // forgiving: min 1 beat
      if (clip.loopBeats === beats) return state;
      return { ...state, clips: { ...state.clips, [clip.id]: { ...clip, loopBeats: beats } } };
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

    // Tap a drum cell: place a single hit, or clear it if already on. Row 0 —
    // drums have no pitch. (Element type went boolean → StepNote|null, so this
    // toggles null ↔ a length-1 hit instead of flipping a boolean.)
    case "toggleStep":
      return editLane(state, cmd.layerId, cmd.index, (l) =>
        editNote(l, cmd.index, 0, (cell) =>
          cell ? null : makeNote(0, cmd.index),
        ),
      );

    // Tap a melody cell: stack a note at this row, or remove it if already on.
    case "toggleNote":
      return editLane(state, cmd.layerId, cmd.index, (l) =>
        editNote(l, cmd.index, cmd.row, (note) =>
          note ? null : makeNote(cmd.row, cmd.index),
        ),
      );

    // Explicit place (idempotent): set/add a note; leave an existing one as-is.
    case "addNote":
      return editLane(state, cmd.layerId, cmd.index, (l) =>
        editNote(l, cmd.index, cmd.row, (note) =>
          note ?? makeNote(cmd.row, cmd.index, cmd.length ?? 1),
        ),
      );

    case "removeNote":
      return editLane(state, cmd.layerId, cmd.index, (l) =>
        editNote(l, cmd.index, cmd.row, () => null),
      );

    // Stretch: set a placed note's length (clamped to the bar). No-op if absent.
    case "resizeNote":
      return editLane(state, cmd.layerId, cmd.index, (l) =>
        editNote(l, cmd.index, cmd.row, (note) =>
          note
            ? makeNote(note.row, cmd.index, cmd.length, note.roll, note.slideTo)
            : null,
        ),
      );

    // Roll: cycle a placed drum/melody note's fill (1 clears, 2|4 set). No-op
    // if absent. Length + slide are preserved.
    case "setRoll":
      return editLane(state, cmd.layerId, cmd.index, (l) =>
        editNote(l, cmd.index, cmd.row, (note) =>
          note
            ? makeNote(
                note.row,
                cmd.index,
                note.length,
                cmd.roll === 1 ? undefined : cmd.roll,
                note.slideTo,
              )
            : null,
        ),
      );

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
