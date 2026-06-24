// The five tools as React components over the unchanged hexagonal core. Each
// tool is a descriptor { id, label, icon, Canvas, Options? }; the Canvas renders
// the tool's main surface, Options (if any) renders its knobs in the top bar.
// All audio still routes through ctx.sound; all state via ctx.dispatch.

import * as React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type ReactNode,
} from "react";
import { useApp, useProject } from "../app/context.tsx";
import type { Clip, EffectId, LaneKind, Layer, Project, StepNote } from "../core/types.ts";
import { MAX_CARS, MAX_PATTERNS, STEP_COUNT } from "../core/types.ts";
import {
  activeLayers,
  activePart,
  carAtBar,
  loopRegion,
  makeLayer,
  songBars,
} from "../core/project-state.ts";
import { nearestBeatLoop } from "../core/timeline.ts";
import { BUILTIN_SOUNDS, DRUM_SOUNDS } from "../core/sound-catalog.ts";
import {
  SCALES,
  KEYS,
  KEY_IDS,
  MELODY_ROWS,
  degreeToNote,
  type KeyId,
} from "../core/scale.ts";
import type { ThereminWave } from "../ports/sound-port.ts";
import {
  INSTRUMENTS,
  isVoiceInstrument,
  resolveInstrument,
  voiceInstrumentId,
} from "../core/instruments.ts";

export interface ToolDescriptor {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly Canvas: FC;
  readonly Options?: FC;
  /** Optional right-side "studio" rail of higher-level, guided controls. */
  readonly Rail?: FC;
}

// ── Loop Stage lane selection (shared between the board and the rail) ─────────
// The board and the rail render as separate Shell regions, so the "which lane
// am I tweaking" selection lives in a tiny context both can read.
interface LoopSelection {
  readonly selected: string | null;
  select(id: string | null): void;
}
const LoopSelectionCtx = createContext<LoopSelection>({
  selected: null,
  select: () => {},
});
export const LoopSelectionProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <LoopSelectionCtx.Provider value={{ selected, select: setSelected }}>
      {children}
    </LoopSelectionCtx.Provider>
  );
};
const useLoopSelection = (): LoopSelection => useContext(LoopSelectionCtx);

// ── Song Train reveal (progressive disclosure) ───────────────────────────────
// Nothing about trains shows until the kid taps "Send to Tracks" (or already
// has ≥2 cars). The flag lives in a tiny context so the Home button that flips
// it and the Shell that renders the strip both read the same state.
interface TrainMode {
  readonly revealed: boolean;
  reveal(): void;
}
const TrainModeCtx = createContext<TrainMode>({ revealed: false, reveal() {} });
export const TrainModeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <TrainModeCtx.Provider
      value={{ revealed, reveal: () => setRevealed(true) }}
    >
      {children}
    </TrainModeCtx.Provider>
  );
};
const useTrainMode = (): TrainMode => useContext(TrainModeCtx);

/** Whether the Tracks strip should be on screen: once revealed, or as soon as a
 *  second car exists (so a reloaded multi-car song shows its train). */
const trainVisible = (project: Project, revealed: boolean): boolean =>
  revealed || project.parts.length >= 2;

/** Hook form for the Shell, which renders the strip region. */
export const useTrainVisible = (): boolean =>
  trainVisible(useProject(), useTrainMode().revealed);

// Unique car ids minted in the (impure) UI shell. Time-based so they never clash
// with ids from a previously-saved project after a reload (addCar no-ops on a
// clashing id, which would otherwise silently swallow the new car).
let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;

// Fresh lane ids for copies sent to another car (so the two cars diverge
// copy-on-write). Same time-based scheme as car ids — never clashes on reload.
let layerCopySeq = 0;
const newLayerId = (): string =>
  `lyr-${Date.now().toString(36)}-${layerCopySeq++}`;

// Friendly colors cycled onto new melody lanes.
const MELODY_COLORS = ["#8338ec", "#3a86ff", "#06d6a0", "#fb5607"];
let melodySeq = 0;

/** Instrument FAMILY a Home lane belongs to. Lane color is DERIVED from this —
 *  consistent per group (all drums share a hue, all melodies another, your voice
 *  another), so the mix reads by color = kind, never a random per-clip swatch. */
type LaneGroup = "drum" | "tone" | "melody" | "voice";
const GROUP_COLORS: Record<LaneGroup, string> = {
  drum: "#ef476f", // percussion — warm red/pink
  tone: "#3a86ff", // pitched pads (Do/Re/Mi…) — blue
  melody: "#06d6a0", // melody grid — green/teal
  voice: "#ffd166", // recordings (voice + Magic Pad) — gold
};
const laneGroup = (kind: LaneKind, clip?: Clip): LaneGroup => {
  if (kind === "melody") return "melody";
  const source = clip?.source;
  if (source?.kind === "recording") return "voice";
  if (source?.kind === "builtin") {
    const snd = BUILTIN_SOUNDS.find((s) => s.assetId === source.assetId);
    if (snd?.recipe.kind === "tone") return "tone";
  }
  return "drum";
};
const laneColor = (kind: LaneKind, clip?: Clip): string =>
  GROUP_COLORS[laneGroup(kind, clip)];

const cssVar = (name: string, value: string): CSSProperties =>
  ({ [name]: value }) as CSSProperties;

// ── Note-lane rendering (shared by drum + melody lanes) ──────────────────────
/** How long a double-tap window is before a tap on a placed drum cell counts as
 *  a removal (a second tap inside the window cycles its roll instead). */
const DOUBLE_TAP_MS = 260;
/** Roll cycle for the "tap-tap to roll" gesture: none → 2 → 4 → none. */
const nextRoll = (roll: StepNote["roll"]): 1 | 2 | 4 =>
  roll === undefined ? 2 : roll === 2 ? 4 : 1;

interface LaneSeg {
  readonly index: number;
  readonly span: number;
  readonly note: StepNote | null;
}

/** Collapse a 16-step lane (one row's worth) into render segments: each placed
 *  note becomes one span-N bar (absorbing the grid gaps), each gap an empty
 *  cell. A note's visible span is capped at the next placed note so a stretch
 *  never hides a later hit (the scheduler still honors the full length). */
function laneSegments(noteAt: (i: number) => StepNote | null): LaneSeg[] {
  const segs: LaneSeg[] = [];
  let i = 0;
  while (i < STEP_COUNT) {
    const note = noteAt(i);
    if (!note) {
      segs.push({ index: i, span: 1, note: null });
      i += 1;
      continue;
    }
    let next = i + 1;
    while (next < STEP_COUNT && !noteAt(next)) next += 1;
    const span = Math.max(1, Math.min(note.length, next - i));
    segs.push({ index: i, span, note });
    i += span;
  }
  return segs;
}

/** Polyline points (in a 0..100 × 0..100 box) tracing each bent note's pitch
 *  path across the melody grid — base row → each pin — so the swoop is visible.
 *  Flat notes (no pins) contribute nothing. Row 0 sits at the bottom. */
function bendPolylines(
  notes: readonly (readonly StepNote[])[],
): { key: string; points: string }[] {
  const xAt = (p: number): number => (p / STEP_COUNT) * 100;
  const yAt = (row: number): number =>
    ((MELODY_ROWS - 1 - row + 0.5) / MELODY_ROWS) * 100;
  const out: { key: string; points: string }[] = [];
  notes.forEach((chord, i) => {
    for (const n of chord) {
      if (!n.pins || n.pins.length === 0) continue;
      // Slope across the note's full cell width so even a 1-step note reads as a
      // diagonal swoop, not a vertical jump.
      const xStart = xAt(i);
      const span = xAt(i + n.length) - xStart;
      const pts = [`${xStart},${yAt(n.row)}`];
      for (const pin of n.pins) pts.push(`${xStart + pin.t * span},${yAt(pin.row)}`);
      out.push({ key: `${i}:${n.row}`, points: pts.join(" ") });
    }
  });
  return out;
}

// ── Editable label ───────────────────────────────────────────────────────────
// Tap the name to rename it (a recording's name, a lane's name). Kept tiny and
// reused so renaming feels the same everywhere. Stops pointer propagation so
// renaming a lane never also toggles a step or re-selects it.
const EditableLabel: FC<{
  value: string;
  onCommit: (next: string) => void;
}> = ({ value, onCommit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (editing) {
    const commit = (): void => {
      setEditing(false);
      onCommit(draft); // reducer trims + ignores blank/unchanged
    };
    return (
      <input
        className="name-edit"
        value={draft}
        autoFocus
        maxLength={24}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className="name-display"
      title="Tap to rename"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => setEditing(true)}
    >
      {value} <span className="name-pencil">✏️</span>
    </button>
  );
};

// ── Clip card ─────────────────────────────────────────────────────────────
// The "take you just made" before it goes Home: name it, preview it, snap it to
// the beat, re-record, undo/redo, or trash it. Reused by My Voice and Magic Pad
// so editing a take feels identical everywhere. Trash routes through removeClip,
// so the play-bar (and the card's own) undo/redo cover deleting a take.
const ClipCard: FC<{
  clip: Clip;
  /** Emoji that fronts the name (🎤 voice, ✨ Magic Pad). */
  icon: string;
  onPreview: () => void;
  onTrash: () => void;
  snapped: boolean;
  onToggleSnap: () => void;
  /** Hold-to-re-record handlers. Omitted when the tool owns its own recorder
   *  button (Magic Pad keeps its toggle in the options bar). */
  onReRecordDown?: () => void;
  onReRecordUp?: () => void;
  recording?: boolean;
}> = ({
  clip,
  icon,
  onPreview,
  onTrash,
  snapped,
  onToggleSnap,
  onReRecordDown,
  onReRecordUp,
  recording,
}) => {
  const { dispatch, undo, redo } = useApp();
  return (
    <div className="voice-clip-card" style={cssVar("--tile-color", clip.color)}>
      <span className="voice-clip-name">
        {icon}{" "}
        <EditableLabel
          value={clip.label}
          onCommit={(label) =>
            dispatch({ type: "renameClip", clipId: clip.id, label })
          }
        />
      </span>
      <div className="clip-card-controls">
        <button className="t-btn" data-act="clip-preview" title="Play it" onClick={onPreview}>
          ▶
        </button>
        {onReRecordDown && (
          <button
            className={"t-btn" + (recording ? " recording" : "")}
            data-act="clip-rerecord"
            title="Record again"
            onPointerDown={onReRecordDown}
            onPointerUp={onReRecordUp}
            onPointerLeave={onReRecordUp}
          >
            ⏺
          </button>
        )}
        <button className="t-btn" data-act="clip-undo" title="Undo" onClick={undo}>
          ↶
        </button>
        <button className="t-btn" data-act="clip-redo" title="Redo" onClick={redo}>
          ↷
        </button>
        <button
          className={"t-btn" + (snapped ? " active" : "")}
          data-act="clip-snap"
          title="Snap to the beat"
          aria-pressed={snapped}
          onClick={onToggleSnap}
        >
          🧲
        </button>
        <button className="t-btn" data-act="clip-trash" title="Delete this take" onClick={onTrash}>
          🗑️
        </button>
      </div>
    </div>
  );
};

// ── My Voice (hero) ─────────────────────────────────────────────────────────

const EFFECT_TILES: { id: EffectId; label: string; emoji: string; color: string }[] =
  [
    { id: "reverse", label: "Backwards", emoji: "⏪", color: "#ff5d8f" },
    { id: "pitchUp", label: "Chipmunk", emoji: "🐿️", color: "#ffd166" },
    { id: "pitchDown", label: "Monster", emoji: "👹", color: "#8338ec" },
    { id: "robot", label: "Robot", emoji: "🤖", color: "#3a86ff" },
    { id: "echo", label: "Echo", emoji: "🌀", color: "#06d6a0" },
    { id: "reverb", label: "Big Room", emoji: "🏛️", color: "#118ab2" },
    { id: "bitcrush", label: "Crunchy", emoji: "🎮", color: "#ef476f" },
    { id: "crazy", label: "CRAZY!", emoji: "🤪", color: "#fb5607" },
  ];

let clipSeq = 0;
let voiceCount = 0; // numbers the default recording names so they're tellable apart
let wildness = 0.6; // shared between the canvas tiles and the Options knob

// Handoff: a voice lane on Home asks My Voice to re-open ITS clip for more FX
// editing. Set right before switching to the record-voicefx machine; consumed
// once when MyVoiceCanvas mounts (so a fresh open still starts blank).
let voiceEditTarget: string | null = null;
export const requestVoiceEdit = (clipId: string): void => {
  voiceEditTarget = clipId;
};

const MyVoiceCanvas: FC = () => {
  const { sound, rng, dispatch, getProject } = useApp();
  const project = useProject();
  const { select } = useLoopSelection();
  const [status, setStatus] = useState(() =>
    voiceEditTarget
      ? "Add another effect, or tap one below to peel it off! 🎉"
      : "Hold the mic to record your voice! 🎤",
  );
  const [recording, setRecording] = useState(false);
  // The clip this page is currently shaping. Effects + Send-to-Home act on it.
  // If a Home voice lane asked to re-edit its clip, pick that up once on mount.
  const [clipId, setClipId] = useState<string | null>(() => {
    const t = voiceEditTarget;
    voiceEditTarget = null;
    return t;
  });
  const clip = clipId ? project.clips[clipId] : undefined;
  // Once a clip is on Home its lane id equals the clip id (see sendToHome).
  const onHome = clipId ? activeLayers(project).some((l) => l.id === clipId) : false;

  const startRec = async (): Promise<void> => {
    try {
      await sound.startRecording();
      setRecording(true);
      setStatus("Recording… let go to stop!");
    } catch {
      setRecording(false);
      setStatus("No mic? No problem — try the Sound Pads! 🥁");
    }
  };
  const stopRec = async (): Promise<void> => {
    if (!recording) return;
    setRecording(false);
    const prevId = clipId; // re-record replaces the take we were shaping
    try {
      const bufferId = await sound.stopRecording();
      const newClip: Clip = {
        id: `clip-${clipSeq++}`,
        source: { kind: "recording", bufferId },
        effects: [],
        color: "#ff5d8f",
        label: `My Voice ${++voiceCount}`,
      };
      dispatch({ type: "addClip", clip: newClip });
      // Re-record swaps the take: drop the old one unless it's already on Home.
      if (prevId && !activeLayers(getProject()).some((l) => l.id === prevId)) {
        dispatch({ type: "removeClip", clipId: prevId });
      }
      setClipId(newClip.id);
      sound.play(newClip);
      setStatus("Make it funny with an effect, then send it Home! 🎉");
    } catch {
      setStatus("Hmm, that didn't record. Try again!");
    }
  };

  // Trash the take — undoable, since removeClip is a Command in history.
  const trashTake = (): void => {
    if (!clipId) return;
    dispatch({ type: "removeClip", clipId });
    setStatus("Trashed it. Hold the mic to record again! 🎤");
  };

  // Snap-to-beat: loop/trim the take to a whole number of beats at the current
  // tempo so it sits in the groove. Toggle off to play it at natural length.
  const toggleSnap = (): void => {
    const c = clipId ? getProject().clips[clipId] : undefined;
    if (!c || c.source.kind !== "recording") return;
    if (c.loopBeats !== undefined) {
      dispatch({ type: "setClipLoop", clipId: c.id, loopBeats: null });
      return;
    }
    const dur = sound.getBufferDuration(c.source.bufferId);
    const beats = dur ? nearestBeatLoop(dur, getProject().tempoBpm).beats : 1;
    dispatch({ type: "setClipLoop", clipId: c.id, loopBeats: beats });
  };

  const applyFx = (tile: (typeof EFFECT_TILES)[number]): void => {
    if (!clipId) {
      setStatus("Record your voice first! 🎤");
      return;
    }
    const amount = tile.id === "crazy" ? rng.next() : wildness;
    dispatch({ type: "applyEffect", clipId, effect: { id: tile.id, amount } });
    const updated = getProject().clips[clipId];
    if (updated) sound.play(updated);
    setStatus(`${tile.emoji} ${tile.label}!`);
  };

  // Stack the (funny) recording onto Home as a 16-step drum lane, firing once
  // per loop to start. Then jump to Home with the new lane selected to tweak.
  const sendToHome = (): void => {
    if (!clipId) return;
    if (!onHome) {
      const steps = new Array<boolean>(STEP_COUNT).fill(false);
      steps[0] = true; // audible immediately; kid re-places it on the grid
      dispatch({
        type: "addLayer",
        layer: makeLayer({ id: clipId, clipId, kind: "drum", steps }),
      });
    }
    select(clipId);
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };

  // Send the recording as a MAGIC-NOTES melody lane instead: a Sampler plays the
  // take repitched across the song's scale + key (same path as Voice Keys), so
  // any voice becomes a chromatic instrument that's always in key. Seeded with a
  // tiny motif so it sings on Play. Same stable lane id = clip id.
  const sendAsNotes = (): void => {
    const c = clipId ? getProject().clips[clipId] : undefined;
    if (!clipId || !c || c.source.kind !== "recording") return;
    if (!onHome) {
      const notes: (number[] | null)[] = Array.from(
        { length: STEP_COUNT },
        () => null,
      );
      ([[0, 0], [4, 2], [8, 4], [12, 2]] as const).forEach(([i, row]) => {
        notes[i] = [row];
      });
      dispatch({
        type: "addLayer",
        layer: makeLayer({
          id: clipId,
          clipId,
          kind: "melody",
          instrument: voiceInstrumentId(c.source.bufferId),
          notes,
        }),
      });
    }
    select(clipId);
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };

  // Empty state = the big Record button only. Once a take exists it becomes the
  // clip card (preview/snap/re-record/undo/trash) → FX tiles → Send to Home.
  return (
    <section className="machine machine--voicefx" data-machine="record-voicefx">
      {!clip ? (
        <>
          <button
            className={recording ? "big-record recording" : "big-record"}
            onPointerDown={startRec}
            onPointerUp={stopRec}
            onPointerLeave={stopRec}
          >
            🎤 HOLD TO RECORD
          </button>
          <p className="voicefx-status">{status}</p>
        </>
      ) : (
        <>
          <ClipCard
            clip={clip}
            icon="🎤"
            onPreview={() => sound.play(clip)}
            onTrash={trashTake}
            snapped={clip.loopBeats !== undefined}
            onToggleSnap={toggleSnap}
            onReRecordDown={startRec}
            onReRecordUp={stopRec}
            recording={recording}
          />
          <p className="voicefx-status">{status}</p>

          {clip.effects.length > 0 && (
            <div className="fx-chips" data-fx-chips>
              {clip.effects.map((fx, i) => {
                const tile = EFFECT_TILES.find((t) => t.id === fx.id);
                return (
                  <button
                    key={`${fx.id}-${i}`}
                    className="fx-chip"
                    data-act="remove-fx"
                    style={cssVar("--tile-color", tile?.color ?? "#888")}
                    title={`Remove ${tile?.label ?? fx.id}`}
                    onClick={() => {
                      if (!clipId) return;
                      dispatch({ type: "removeEffect", clipId, index: i });
                      const updated = getProject().clips[clipId];
                      if (updated) sound.play(updated);
                      setStatus(`Removed ${tile?.label ?? fx.id}.`);
                    }}
                  >
                    <span className="fx-emoji">{tile?.emoji ?? "✨"}</span>
                    <span>{tile?.label ?? fx.id}</span>
                    <span className="fx-chip-x">✕</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="fx-tiles">
            {EFFECT_TILES.map((t) => (
              <button
                key={t.id}
                className="fx-tile"
                style={cssVar("--tile-color", t.color)}
                onClick={() => applyFx(t)}
              >
                <span className="fx-emoji">{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="send-home-row">
            <button
              className="t-btn send-home"
              data-act="send-home"
              disabled={onHome}
              onClick={sendToHome}
            >
              {onHome ? "✓ On Home" : "🥁 Send as Beat"}
            </button>
            <button
              className="t-btn send-home"
              data-act="send-notes"
              disabled={onHome}
              onClick={sendAsNotes}
              title="Play your voice as magic notes, always in key"
            >
              🎹 Send as Notes
            </button>
          </div>
        </>
      )}
    </section>
  );
};

const MyVoiceOptions: FC = () => {
  const [value, setValue] = useState(wildness);
  return (
    <label className="opt-knob">
      <span>🌶️ Wildness</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          wildness = v;
          setValue(v);
        }}
      />
    </label>
  );
};

// ── Voice Keys (record a voice → play it as a chromatic instrument) ───────────
// Records ONE short voice clip and turns it into a playable melody instrument:
// a Tone.Sampler maps the take to C4 and repitches it across the scale. The kid
// auditions on a little keyboard, names it, then sends it Home as a MELODY lane
// whose voice IS the recording (instrument = `voice:<bufferId>`). Same record/
// ClipCard dialect as My Voice; the difference is the keyboard + a melody lane.

let voiceKeysCount = 0;

/** Hold-to-sing phases (see `recState`). Named so reads survive the mic-open
 *  await without TS narrowing the ref to a single literal. */
type RecPhase = "idle" | "opening" | "recording" | "stopping";

const VoiceKeysCanvas: FC = () => {
  const { sound, dispatch, getProject } = useApp();
  const project = useProject();
  const { select } = useLoopSelection();
  const [status, setStatus] = useState(
    "Hold the mic and sing one sound — then play it like a piano! 🎤🎹",
  );
  const [recording, setRecording] = useState(false);
  // Hold-to-sing state machine. A ref (not the async `recording` state) so a
  // release that lands DURING the mic-open await still tears the recorder down
  // instead of leaving the mic stuck open with no take.
  const recState = useRef<RecPhase>("idle");
  const [clipId, setClipId] = useState<string | null>(null);
  const clip = clipId ? project.clips[clipId] : undefined;
  const bufferId =
    clip && clip.source.kind === "recording" ? clip.source.bufferId : null;
  const onHome = clipId
    ? activeLayers(project).some((l) => l.id === clipId)
    : false;

  // Finalize: pull the take, make a clip, drop the previous unsent take.
  const finishRec = async (): Promise<void> => {
    recState.current = "idle";
    setRecording(false);
    const prevId = clipId; // re-record replaces the take we were shaping
    try {
      const buf = await sound.stopRecording();
      const newClip: Clip = {
        id: `clip-${clipSeq++}`,
        source: { kind: "recording", bufferId: buf },
        effects: [],
        color: "#ffd166", // voice family (gold)
        label: `Voice Keys ${++voiceKeysCount}`,
      };
      dispatch({ type: "addClip", clip: newClip });
      if (prevId && !activeLayers(getProject()).some((l) => l.id === prevId)) {
        dispatch({ type: "removeClip", clipId: prevId });
      }
      setClipId(newClip.id);
      sound.previewNote("C4", voiceInstrumentId(buf));
      setStatus("Tap the keys to hear it as notes — then send it Home! 🎹");
    } catch {
      setStatus("Hmm, that didn't record. Try again!");
    }
  };

  const startRec = async (): Promise<void> => {
    if (recState.current !== "idle") return;
    recState.current = "opening";
    setRecording(true); // responsive UI before the mic finishes opening
    setStatus("Singing… let go to stop! (try one long 'aaah')");
    try {
      await sound.startRecording();
    } catch {
      recState.current = "idle";
      setRecording(false);
      setStatus("No mic? No problem — try the Magic Pad or Sound Pads! ✨");
      return;
    }
    // Released during the open gap → stop now so the mic never sticks open.
    // (Cast: stopRec may have mutated the ref during the await above.)
    if ((recState.current as RecPhase) === "stopping") void finishRec();
    else recState.current = "recording";
  };
  const stopRec = (): void => {
    if (recState.current === "recording") void finishRec();
    else if (recState.current === "opening") recState.current = "stopping";
    // idle / stopping → nothing to do
  };

  const trashTake = (): void => {
    if (!clipId) return;
    dispatch({ type: "removeClip", clipId });
    setStatus("Trashed it. Hold the mic to sing again! 🎤");
  };

  const toggleSnap = (): void => {
    const c = clipId ? getProject().clips[clipId] : undefined;
    if (!c || c.source.kind !== "recording") return;
    if (c.loopBeats !== undefined) {
      dispatch({ type: "setClipLoop", clipId: c.id, loopBeats: null });
      return;
    }
    const dur = sound.getBufferDuration(c.source.bufferId);
    const beats = dur ? nearestBeatLoop(dur, getProject().tempoBpm).beats : 1;
    dispatch({ type: "setClipLoop", clipId: c.id, loopBeats: beats });
  };

  // Audition: tap an in-scale key → preview the recording repitched to that note.
  const auditionKey = (row: number): void => {
    if (!bufferId) return;
    sound.previewNote(
      degreeToNote(project.scaleId, project.keyId, row),
      voiceInstrumentId(bufferId),
    );
  };

  // Add the voice as a MELODY lane on Home, seeded with a tiny up-and-down motif
  // so it sings the moment you press Play. The lane id = clip id (stable undo);
  // its instrument is the recording, so the Studio rail shows it as 🎤 Your Voice.
  const sendToHome = (): void => {
    if (!clipId || !bufferId) return;
    if (!onHome) {
      const notes: (number[] | null)[] = Array.from(
        { length: STEP_COUNT },
        () => null,
      );
      ([[0, 0], [4, 2], [8, 4], [12, 2]] as const).forEach(([i, row]) => {
        notes[i] = [row];
      });
      dispatch({
        type: "addLayer",
        layer: makeLayer({
          id: clipId,
          clipId,
          kind: "melody",
          instrument: voiceInstrumentId(bufferId),
          notes,
        }),
      });
    }
    select(clipId);
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };

  return (
    <section className="machine machine--voicekeys" data-machine="voice-keys">
      {!clip ? (
        <>
          <button
            className={recording ? "big-record recording" : "big-record"}
            data-act="vk-record"
            onPointerDown={startRec}
            onPointerUp={stopRec}
            onPointerLeave={stopRec}
          >
            🎙️ HOLD TO SING
          </button>
          <p className="voicefx-status">{status}</p>
        </>
      ) : (
        <>
          <ClipCard
            clip={clip}
            icon="🎙️"
            onPreview={() => bufferId && sound.previewNote("C4", voiceInstrumentId(bufferId))}
            onTrash={trashTake}
            snapped={clip.loopBeats !== undefined}
            onToggleSnap={toggleSnap}
            onReRecordDown={startRec}
            onReRecordUp={stopRec}
            recording={recording}
          />
          <p className="voicefx-status">{status}</p>

          <div className="audition-keyboard" data-act="vk-keys">
            {Array.from({ length: MELODY_ROWS }, (_, r) => r).map((row) => (
              <button
                key={row}
                className="audition-key"
                data-key={row}
                style={cssVar("--key-color", "#ffd166")}
                onPointerDown={() => auditionKey(row)}
              >
                {degreeToNote(project.scaleId, project.keyId, row).replace(
                  /\d/,
                  "",
                )}
              </button>
            ))}
          </div>

          <button
            className="t-btn send-home"
            data-act="vk-send-home"
            disabled={onHome}
            onClick={sendToHome}
          >
            {onHome ? "✓ On Home" : "➡️ 🏠 Add to Home"}
          </button>
        </>
      )}
    </section>
  );
};

// ── Sound Pads ──────────────────────────────────────────────────────────────

const SoundPadsCanvas: FC = () => {
  const { sound } = useApp();
  const project = useProject();
  useEffect(() => () => sound.stopAll(), [sound]);

  const recorded = Object.values(project.clips).filter(
    (c) => c.source.kind === "recording",
  );
  const hit = (e: React.PointerEvent<HTMLButtonElement>): void => {
    e.currentTarget.classList.add("hit");
  };
  const clearHit = (e: React.AnimationEvent<HTMLButtonElement>): void => {
    e.currentTarget.classList.remove("hit");
  };

  return (
    <section className="machine machine--pads" data-machine="sound-pads">
      <div className="pad-grid">
        {BUILTIN_SOUNDS.map((s) => (
          <button
            key={s.assetId}
            className="pad"
            style={cssVar("--pad-color", s.color)}
            onPointerDown={(e) => {
              hit(e);
              sound.play({
                id: `pad-${s.assetId}`,
                source: { kind: "builtin", assetId: s.assetId },
                effects: [],
                color: s.color,
                label: s.label,
              });
            }}
            onAnimationEnd={clearHit}
          >
            <span className="pad-emoji">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
        {recorded.map((clip) => (
          <button
            key={clip.id}
            className="pad"
            style={cssVar("--pad-color", clip.color)}
            onPointerDown={(e) => {
              hit(e);
              sound.play(clip);
            }}
            onAnimationEnd={clearHit}
          >
            <span className="pad-emoji">🎤</span>
            <span>{clip.label || "My Sound"}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

// ── Beat Maker ────────────────────────────────────────────────────────────

const BeatMakerCanvas: FC = () => {
  const { sound, dispatch, getProject } = useApp();
  const project = useProject();

  // Ensure each drum has a CLIP (cheap, uncapped) so its row previews and plays.
  // Layers are created lazily on first toggle (below) — with a palette larger
  // than MAX_LAYERS, reserving a layer per drum would blow the cap and steal the
  // earliest rows. A drum only joins the mix once the kid actually uses it.
  useEffect(() => {
    const p = getProject();
    for (const drum of DRUM_SOUNDS) {
      const id = `beat-${drum.assetId}`;
      if (!p.clips[id]) {
        dispatch({
          type: "addClip",
          clip: {
            id,
            source: { kind: "builtin", assetId: drum.assetId },
            effects: [],
            color: drum.color,
            label: drum.label,
          },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="machine machine--beat" data-machine="beat-grid">
      <div className="beat-rows">
        {DRUM_SOUNDS.map((drum) => {
          const id = `beat-${drum.assetId}`;
          const layer = activeLayers(project).find((l) => l.id === id);
          const steps =
            layer?.steps ?? new Array<StepNote | null>(STEP_COUNT).fill(null);
          const clip: Clip = {
            id,
            source: { kind: "builtin", assetId: drum.assetId },
            effects: [],
            color: drum.color,
            label: drum.label,
          };
          return (
            <div
              className="beat-row"
              key={id}
              style={cssVar("--row-color", drum.color)}
            >
              <button
                className="beat-label"
                title={drum.label}
                onPointerDown={() => sound.play(clip)}
              >
                <span>{drum.emoji}</span>
              </button>
              {steps.map((on, i) => (
                <button
                  key={i}
                  className={
                    "beat-cell" +
                    (on ? " on" : "") +
                    (i % 4 === 0 ? " downbeat" : "")
                  }
                  onPointerDown={() => {
                    // Lazily add this drum's layer the first time it's touched.
                    if (!activeLayers(getProject()).some((l) => l.id === id)) {
                      dispatch({
                        type: "addLayer",
                        layer: makeLayer({ id, clipId: id, kind: "drum" }),
                      });
                    }
                    dispatch({ type: "toggleStep", layerId: id, index: i });
                    if (!on) sound.play(clip);
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ── Loop Stage (mixer) ───────────────────────────────────────────────────────

/** The "you are editing THIS car" banner across the top of Home. Only shows once
 *  a train exists (≥2 cars or revealed) — until then there is just one loop and
 *  naming it would be noise. Big color swatch + car number + editable name, with
 *  ‹ › to flip to the neighbouring car without diving into the strip. This is the
 *  primary "which loop am I on" cue; the Tracks strip ring is the secondary one. */
const CarBanner: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const part = activePart(project);
  const [editing, setEditing] = useState(false);
  const idx = project.parts.findIndex((p) => p.id === part.id);
  const count = project.parts.length;
  const commit = (name: string): void => {
    setEditing(false);
    dispatch({ type: "renameCar", partId: part.id, name });
  };
  const step = (delta: number): void => {
    const next = project.parts[(idx + delta + count) % count];
    if (next) dispatch({ type: "selectCar", partId: next.id });
  };
  return (
    <div className="car-banner" style={cssVar("--car-color", part.color)}>
      <span className="car-banner-swatch" aria-hidden="true" />
      <span className="car-banner-num">Car {idx + 1}<span className="car-banner-of"> / {count}</span></span>
      {editing ? (
        <input
          className="car-banner-rename"
          defaultValue={part.name}
          autoFocus
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(e.currentTarget.value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="car-banner-name"
          title="Tap to rename this loop"
          onClick={() => setEditing(true)}
        >
          {part.name} <span className="car-banner-pencil" aria-hidden="true">✏️</span>
        </button>
      )}
      {count > 1 && (
        <span className="car-banner-nav">
          <button type="button" className="car-banner-step" data-act="prev-car" title="Previous car" onClick={() => step(-1)}>‹</button>
          <button type="button" className="car-banner-step" data-act="next-car" title="Next car" onClick={() => step(1)}>›</button>
        </span>
      )}
    </div>
  );
};

const LoopStageCanvas: FC = () => {
  const { sound, dispatch } = useApp();
  const project = useProject();
  const { revealed, reveal } = useTrainMode();
  const boardRef = useRef<HTMLDivElement>(null);

  // Sweep the playhead from the live transport position via a CSS var on the
  // board (no React state churn). Each lane's .loop-playhead reads --ph.
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const board = boardRef.current;
      if (board) {
        const step = sound.getTransportStep(STEP_COUNT);
        if (step < 0) {
          board.dataset.playing = "false";
        } else {
          board.dataset.playing = "true";
          board.style.setProperty(
            "--ph",
            `${((step + 0.5) / STEP_COUNT) * 100}%`,
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sound]);

  const { select } = useLoopSelection();
  const [picking, setPicking] = useState(false);

  // Add (or just re-select) a SPECIFIC built-in sound the kid chose — any pad
  // from the Sound Pads pack (drums + melodic blips) becomes a Home lane,
  // triggered once per step. Same rule as the sidebar: a Sound Pad on Home is
  // just that pad as a track.
  const addSound = (assetId: string): void => {
    const snd = BUILTIN_SOUNDS.find((s) => s.assetId === assetId);
    if (!snd) return;
    const id = `beat-${snd.assetId}`;
    setPicking(false);
    if (activeLayers(project).some((l) => l.id === id)) {
      select(id); // already on the stage → highlight it
      return;
    }
    const clip: Clip = {
      id,
      source: { kind: "builtin", assetId: snd.assetId },
      effects: [],
      color: snd.color,
      label: snd.label,
    };
    dispatch({ type: "addClip", clip });
    dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum" }) });
    select(id);
    sound.play(clip); // a quick taste of the sound you just picked
  };

  // Add an empty melody lane the kid fills in by tapping the note grid.
  const addMelody = (): void => {
    const id = `melody-${melodySeq++}`;
    const color = MELODY_COLORS[melodySeq % MELODY_COLORS.length] as string;
    dispatch({
      type: "addClip",
      clip: { id, source: { kind: "synth", note: "C4" }, effects: [], color, label: "Melody" },
    });
    dispatch({
      type: "addLayer",
      layer: makeLayer({ id, clipId: id, kind: "melody", wave: "triangle" }),
    });
    select(id);
  };

  return (
    <section className="machine machine--stage" data-machine="looper-stage">
      {trainVisible(project, revealed) && <CarBanner />}
      <div className="loop-add">
        <button
          className={"t-btn" + (picking ? " active" : "")}
          data-act="add-drum"
          onClick={() => setPicking((p) => !p)}
        >
          ➕ 🥁 Sound
        </button>
        <button className="t-btn" data-act="add-melody" onClick={addMelody}>
          ➕ 🎵 Melody
        </button>
        <button
          className="t-btn"
          data-act="go-voice"
          onClick={() =>
            dispatch({ type: "setActiveMachine", machineId: "record-voicefx" })
          }
        >
          ➕ 🎤 Voice
        </button>
        <button
          className="t-btn"
          data-act="go-magic"
          onClick={() =>
            dispatch({ type: "setActiveMachine", machineId: "theremin-xy" })
          }
        >
          ➕ ✨ Magic
        </button>
        {!trainVisible(project, revealed) && (
          <button
            className="t-btn loop-train"
            data-act="send-tracks"
            onClick={reveal}
            title="Turn this loop into the first car of a song train"
          >
            🚂 Send to Tracks
          </button>
        )}
        <span className="loop-hint">
          Stack sounds, melodies, your voice & Magic Pad — then shape it with
          Studio.
        </span>
      </div>

      {picking && (
        <div className="drum-picker" data-picker="drums">
          {BUILTIN_SOUNDS.map((d) => {
            const present = activeLayers(project).some((l) => l.id === `beat-${d.assetId}`);
            return (
              <button
                key={d.assetId}
                className={"drum-chip" + (present ? " present" : "")}
                data-drum={d.assetId}
                style={cssVar("--pad-color", d.color)}
                onClick={() => addSound(d.assetId)}
              >
                <span className="drum-emoji">{d.emoji}</span>
                <span>{d.label}</span>
                {present && <span className="drum-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {activeLayers(project).length === 0 ? (
        <p className="stub-note">
          🏠 This is <b>Home</b> — where your sounds stack up. Add a{" "}
          <b>➕ Drum</b>, a <b>➕ Melody</b>, or record your <b>➕ Voice</b>. Or
          hit 🎲 for a surprise.
        </p>
      ) : (
        <div className="loop-board" ref={boardRef} data-playing="false">
          {activeLayers(project).map((layer) => (
            <LoopTrack key={layer.id} layerId={layer.id} />
          ))}
        </div>
      )}
    </section>
  );
};

// A compact rotary knob with ‹ › step arrows — the per-track tweak control.
// Drag the dial up/down to sweep, or tap an arrow to nudge by one step. Kept
// tiny so a row of them fits inside a lane.
const Knob: FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  color?: string;
}> = ({ label, value, onChange, min = 0, max = 1, step = 0.05, format, color }) => {
  const range = max - min || 1;
  const frac = Math.max(0, Math.min(1, (value - min) / range));
  const angle = -135 + frac * 270; // dial sweeps 270°
  const clampV = (v: number): number => Math.max(min, Math.min(max, v));
  const snap = (v: number): number =>
    clampV(Number((Math.round((v - min) / step) * step + min).toFixed(4)));
  const bump = (dir: number) => (e: React.MouseEvent): void => {
    e.stopPropagation();
    onChange(snap(value + dir * step));
  };
  const drag = (e: React.PointerEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    const startY = e.clientY;
    const startV = value;
    const move = (ev: PointerEvent): void => {
      onChange(snap(startV + ((startY - ev.clientY) / 120) * range)); // up = louder
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const style: CSSProperties = {
    ...cssVar("--ang", `${angle}deg`),
    ...(color ? cssVar("--knob-color", color) : {}),
  };
  return (
    <div className="knob" onPointerDown={(e) => e.stopPropagation()}>
      <div className="knob-label">{label}</div>
      <div className="knob-controls">
        <button type="button" className="knob-step" data-act="knob-down" onClick={bump(-1)}>
          ‹
        </button>
        <div
          className="knob-dial"
          style={style}
          role="slider"
          aria-label={label}
          aria-valuenow={Math.round(frac * 100)}
          onPointerDown={drag}
        >
          <span className="knob-ind" />
        </div>
        <button type="button" className="knob-step" data-act="knob-up" onClick={bump(1)}>
          ›
        </button>
      </div>
      <div className="knob-val">{format ? format(value) : `${Math.round(frac * 100)}%`}</div>
    </div>
  );
};

// Per-track tweaks, shown INSIDE the selected lane (the right Studio rail keeps
// only song-wide controls). Instrument + silly-effects + knobs (volume/echo/
// tone/groove) + send-to-car all act on this one lane.
const LaneControls: FC<{ layer: Layer }> = ({ layer }) => {
  const { dispatch } = useApp();
  const project = useProject();
  const clip = project.clips[layer.clipId];
  const recBufferId = clip?.source.kind === "recording" ? clip.source.bufferId : null;
  const others = project.parts.filter((p) => p.id !== project.activePartId);
  return (
    <div className="lane-controls" data-lane-controls>
      {(layer.kind === "melody" || recBufferId) && (
        <div className="lane-ctl-group">
          {layer.kind === "melody" && (
            <div className="rail-pills lane-inst">
              {recBufferId && (
                <button
                  type="button"
                  data-inst="voice"
                  className={
                    "rail-pill" +
                    (isVoiceInstrument(resolveInstrument(layer.instrument, layer.wave))
                      ? " active"
                      : "")
                  }
                  title="Your Voice"
                  onClick={() =>
                    dispatch({
                      type: "setLayerInstrument",
                      layerId: layer.id,
                      instrument: voiceInstrumentId(recBufferId),
                    })
                  }
                >
                  🎤
                </button>
              )}
              {INSTRUMENTS.map((inst) => (
                <button
                  key={inst.id}
                  data-inst={inst.id}
                  className={
                    "rail-pill" +
                    (resolveInstrument(layer.instrument, layer.wave) === inst.id ? " active" : "")
                  }
                  title={inst.label}
                  onClick={() =>
                    dispatch({ type: "setLayerInstrument", layerId: layer.id, instrument: inst.id })
                  }
                >
                  {inst.emoji}
                </button>
              ))}
            </div>
          )}
          {recBufferId && (
            <button
              type="button"
              className="t-btn lane-fx-btn"
              data-act="edit-fx"
              title="Open this recording to add/remove silly effects"
              onClick={() => {
                requestVoiceEdit(layer.clipId);
                dispatch({ type: "setActiveMachine", machineId: "record-voicefx" });
              }}
            >
              ✨ Effects
            </button>
          )}
        </div>
      )}

      <div className="knob-row">
        <Knob
          label="📢 Vol"
          value={layer.volume}
          onChange={(v) => dispatch({ type: "setLayerVolume", layerId: layer.id, volume: v })}
        />
        <Knob
          label="🌀 Echo"
          value={layer.echo}
          onChange={(v) => dispatch({ type: "setLayerEcho", layerId: layer.id, echo: v })}
        />
        <Knob
          label="🎨 Tone"
          value={layer.tone}
          format={(v) => toneLabel(v)}
          onChange={(v) => dispatch({ type: "setLayerTone", layerId: layer.id, tone: v })}
        />
        <Knob
          label="🎢 Groove"
          value={layer.swing ?? project.swing}
          format={(v) => (v > 0.05 ? "Bouncy" : "Straight")}
          onChange={(v) => dispatch({ type: "setLayerSwing", layerId: layer.id, swing: v })}
        />
      </div>

      {others.length > 0 && (
        <div className="rail-pills lane-sendcar">
          <span className="lane-ctl-label">🚃 Send to car:</span>
          {others.map((p) => (
            <button
              key={p.id}
              type="button"
              data-act="send-car"
              className="rail-pill"
              style={cssVar("--car-color", p.color)}
              title={`Copy this lane to ${p.name}`}
              onClick={() =>
                dispatch({
                  type: "copyLayerToCar",
                  layerId: layer.id,
                  targetPartId: p.id,
                  newLayerId: newLayerId(),
                })
              }
            >
              ➡️ {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** One lane on the Loop Stage — a drum row or a melody mini-grid. */
// Numbered pattern slots for a lane (BeepBox 0-9). Tap a number to switch which
// pattern is live; ＋ saves a copy of the current one; 🗑 drops the live slot.
// Always shown (even at one slot) so the feature is discoverable.
const LanePatterns: FC<{ layer: Layer }> = ({ layer }) => {
  const { dispatch } = useApp();
  const count = (layer.variations?.length ?? 0) + 1;
  const active = Math.min(layer.patternIndex ?? 0, count - 1);
  const stop = (e: React.MouseEvent): void => e.stopPropagation();
  return (
    <div className="lane-patterns" data-patterns>
      <span className="lane-patterns-label">🎛️</span>
      {Array.from({ length: count }, (_, k) => (
        <button
          key={k}
          type="button"
          className={"pat-chip" + (k === active ? " active" : "")}
          data-act="select-pattern"
          data-pat={k}
          title={`Pattern ${k + 1}`}
          onClick={(e) => {
            stop(e);
            dispatch({ type: "selectPattern", layerId: layer.id, index: k });
          }}
        >
          {k + 1}
        </button>
      ))}
      {count < MAX_PATTERNS && (
        <button
          type="button"
          className="pat-chip pat-add"
          data-act="add-pattern"
          title="Add a pattern (a copy of this one to change)"
          onClick={(e) => {
            stop(e);
            dispatch({ type: "addPattern", layerId: layer.id });
          }}
        >
          ＋
        </button>
      )}
      {count > 1 && (
        <button
          type="button"
          className="pat-chip pat-del"
          data-act="del-pattern"
          title="Delete this pattern"
          onClick={(e) => {
            stop(e);
            dispatch({ type: "removePattern", layerId: layer.id, index: active });
          }}
        >
          🗑
        </button>
      )}
    </div>
  );
};

const LoopTrack: FC<{ layerId: string }> = ({ layerId }) => {
  const { sound, dispatch } = useApp();
  const project = useProject();
  const { selected, select } = useLoopSelection();
  // Pending drum-cell removal, held open for a double-tap → roll (see onDrumTap).
  const pendingRemove = useRef<{ index: number; timer: number } | null>(null);
  const layer = activeLayers(project).find((l) => l.id === layerId);
  if (!layer) return null;
  const clip = project.clips[layer.clipId];
  const isVoice = clip?.source.kind === "recording";
  const prefix = layer.kind === "melody" ? "🎵 " : isVoice ? "🎤 " : "";
  // A melody lane voiced by a recording plays through a Sampler, which can't
  // bend — so suppress the bend gesture + curve on it (keep stretch) to hold the
  // see==hear contract. Switching it to a synth in the rail re-enables bend.
  const isVoiceLane = isVoiceInstrument(
    resolveInstrument(layer.instrument, layer.wave),
  );

  // Drag a note's right-edge handle. Horizontal = STRETCH ("pull it like
  // taffy"); on a melody lane, a dominant VERTICAL drag instead BENDS — it sets
  // an end pin at the row under the pointer so the note swoops there (drag back
  // to its own row to flatten it). The first decisive move locks the axis so a
  // drag is one or the other, never both. `gridSel` (melody only) gives the
  // vertical extent for the bend; drums pass none and only stretch.
  const beginNoteDrag = (
    e: React.PointerEvent,
    laneSel: string,
    index: number,
    row: number,
    gridSel?: string,
    tuneFrom?: number,
  ): void => {
    e.stopPropagation();
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const laneEl = handle.closest(laneSel) as HTMLElement | null;
    const gridEl = gridSel
      ? (handle.closest(gridSel) as HTMLElement | null)
      : null;
    if (!laneEl) return;
    handle.setPointerCapture?.(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const canVert = gridEl !== null || tuneFrom !== undefined;
    let mode: "stretch" | "bend" | "tune" | null = null;

    const onMove = (ev: PointerEvent): void => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (mode === null) {
        if (Math.hypot(dx, dy) < 6) return; // wait for a decisive move
        mode =
          canVert && Math.abs(dy) > Math.abs(dx)
            ? gridEl
              ? "bend"
              : "tune"
            : "stretch";
      }
      if (mode === "stretch") {
        const rect = laneEl.getBoundingClientRect();
        const step = Math.max(
          index,
          Math.min(STEP_COUNT - 1, Math.floor(((ev.clientX - rect.left) / rect.width) * STEP_COUNT)),
        );
        dispatch({ type: "resizeNote", layerId: layer.id, index, row, length: step - index + 1 });
      } else if (mode === "bend" && gridEl) {
        const rect = gridEl.getBoundingClientRect();
        const fromTop = (ev.clientY - rect.top) / rect.height;
        const bucket = Math.max(0, Math.min(MELODY_ROWS - 1, Math.floor(fromTop * MELODY_ROWS)));
        const toRow = MELODY_ROWS - 1 - bucket; // row 0 sits at the bottom
        if (toRow === row) {
          dispatch({ type: "clearPins", layerId: layer.id, index, row });
        } else {
          dispatch({ type: "addPin", layerId: layer.id, index, row, t: 1, toRow });
        }
      } else if (mode === "tune") {
        // Drag up = higher; ~10px per semitone. Reducer clamps to ±1 octave.
        const pitch = (tuneFrom ?? 0) - Math.round(dy / 10);
        dispatch({ type: "tuneDrum", layerId: layer.id, index, pitch });
      }
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Tap a placed drum cell: remove it — UNLESS a second tap lands inside the
  // double-tap window, which cycles its roll instead ("tap-tap to roll!"). The
  // deferral only delays *removal* of an existing hit; placing is instant.
  const onDrumTap = (i: number): void => {
    const pending = pendingRemove.current;
    if (pending && pending.index === i) {
      clearTimeout(pending.timer);
      pendingRemove.current = null;
      dispatch({
        type: "setRoll",
        layerId: layer.id,
        index: i,
        row: 0,
        roll: nextRoll(layer.steps[i]?.roll),
      });
      return;
    }
    const timer = window.setTimeout(() => {
      pendingRemove.current = null;
      dispatch({ type: "toggleStep", layerId: layer.id, index: i });
    }, DOUBLE_TAP_MS);
    pendingRemove.current = { index: i, timer };
  };

  return (
    <div
      className={"loop-track" + (selected === layer.id ? " selected" : "")}
      data-lane-kind={laneGroup(layer.kind, clip)}
      style={cssVar("--row-color", laneColor(layer.kind, clip))}
      onPointerDown={() => select(layer.id)}
    >
      <div className="loop-track-head">
        <span className="layer-name">
          {prefix}
          {clip ? (
            <EditableLabel
              value={clip.label}
              onCommit={(label) =>
                dispatch({ type: "renameClip", clipId: clip.id, label })
              }
            />
          ) : (
            layer.clipId
          )}
        </span>
        <span className="layer-move">
          <button
            className="layer-move-btn t-btn"
            data-act="move-up"
            title="Move this lane up"
            onClick={() => dispatch({ type: "moveLayer", layerId: layer.id, dir: -1 })}
          >
            ▲
          </button>
          <button
            className="layer-move-btn t-btn"
            data-act="move-down"
            title="Move this lane down"
            onClick={() => dispatch({ type: "moveLayer", layerId: layer.id, dir: 1 })}
          >
            ▼
          </button>
        </span>
        <button
          className="layer-mute t-btn"
          onClick={() => dispatch({ type: "toggleLayerMuted", layerId: layer.id })}
        >
          {layer.muted ? "🔇" : "🔊"}
        </button>
        <button
          className="layer-remove t-btn"
          onClick={() => dispatch({ type: "removeLayer", layerId: layer.id })}
        >
          🗑️
        </button>
      </div>

      <div className="loop-track-body">
      <LanePatterns layer={layer} />

      {layer.kind === "melody" ? (
        <div
          className="melody-grid"
          style={cssVar("--rows", String(MELODY_ROWS))}
        >
          {/* High notes on top → iterate rows from the top down. */}
          {Array.from({ length: MELODY_ROWS }, (_, r) => MELODY_ROWS - 1 - r).map(
            (row) => (
              <div className="melody-row" key={row}>
                {laneSegments(
                  (i) => layer.notes[i]?.find((n) => n.row === row) ?? null,
                ).map((seg) =>
                  seg.note ? (
                    <button
                      key={seg.index}
                      className="note-cell on"
                      style={seg.span > 1 ? { gridColumn: `span ${seg.span}` } : undefined}
                      title="Tap to remove · drag the edge to stretch"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        select(layer.id);
                        dispatch({ type: "toggleNote", layerId: layer.id, index: seg.index, row });
                      }}
                    >
                      <span
                        className="note-handle"
                        title={
                          isVoiceLane
                            ? "Drag sideways to stretch"
                            : "Drag sideways to stretch · up/down to bend"
                        }
                        onPointerDown={(e) =>
                          beginNoteDrag(
                            e,
                            ".melody-row",
                            seg.index,
                            row,
                            // Voice lanes only stretch (no gridSel = no bend axis).
                            isVoiceLane ? undefined : ".melody-grid",
                          )
                        }
                      />
                    </button>
                  ) : (
                    <button
                      key={seg.index}
                      className={"note-cell" + (seg.index % 4 === 0 ? " downbeat" : "")}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        select(layer.id);
                        dispatch({ type: "toggleNote", layerId: layer.id, index: seg.index, row });
                        sound.previewNote(
                          degreeToNote(project.scaleId, project.keyId, row),
                          resolveInstrument(layer.instrument, layer.wave),
                        );
                      }}
                    />
                  ),
                )}
              </div>
            ),
          )}
          {!isVoiceLane && (
            <svg
              className="bend-layer"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {bendPolylines(layer.notes).map((b) => (
                <polyline
                  key={b.key}
                  className="bend-line"
                  points={b.points}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
          <div className="loop-playhead" />
        </div>
      ) : (
        <div className="loop-lane">
          {laneSegments((i) => layer.steps[i] ?? null).map((seg) =>
            seg.note ? (
              <button
                key={seg.index}
                className={"loop-cell on" + (seg.note.roll ? " has-roll" : "")}
                style={seg.span > 1 ? { gridColumn: `span ${seg.span}` } : undefined}
                title="Tap to remove · tap-tap to roll · drag the edge to stretch"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(layer.id);
                  onDrumTap(seg.index);
                }}
              >
                {seg.note.roll && (
                  <span className="roll-pips" aria-hidden>
                    {"•".repeat(seg.note.roll)}
                  </span>
                )}
                {seg.note.row !== 0 && (
                  <span className="tune-badge" aria-hidden>
                    {seg.note.row > 0 ? `+${seg.note.row}` : seg.note.row}
                  </span>
                )}
                <span
                  className="note-handle"
                  title="Drag sideways to stretch · up/down to tune"
                  onPointerDown={(e) =>
                    beginNoteDrag(e, ".loop-lane", seg.index, 0, undefined, seg.note?.row ?? 0)
                  }
                />
              </button>
            ) : (
              <button
                key={seg.index}
                className={"loop-cell" + (seg.index % 4 === 0 ? " downbeat" : "")}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  select(layer.id);
                  dispatch({ type: "toggleStep", layerId: layer.id, index: seg.index });
                  if (clip) sound.play(clip);
                }}
              />
            ),
          )}
          <div className="loop-playhead" />
        </div>
      )}
      {selected === layer.id && <LaneControls layer={layer} />}
      </div>
    </div>
  );
};

// ── Loop Stage Studio rail (guided high-level controls) ──────────────────────

/** A labeled rail control with a one-line "what + why" coach for kids. */
const RailControl: FC<{ title: string; coach: string; children: ReactNode }> = ({
  title,
  coach,
  children,
}) => (
  <div className="rail-control">
    <div className="rail-title">{title}</div>
    {children}
    <div className="coach">{coach}</div>
  </div>
);

const LoopStageRail: FC = () => {
  // The Studio rail now holds ONLY song-wide controls (tempo / scale / key /
  // groove). Per-track tweaks live inside each lane (LaneControls).
  const { dispatch, engine } = useApp();
  const project = useProject();
  const magicOn = project.scaleId === "magic";

  return (
    <div className="rail-inner">
      <div className="rail-heading">🎚️ Studio</div>

      <RailControl
        title={`⏩ Speed · ${project.tempoBpm}`}
        coach="How fast the loop runs. Slow = chill, fast = party."
      >
        <input
          type="range"
          min="40"
          max="220"
          value={project.tempoBpm}
          onChange={(e) => {
            const bpm = Number(e.target.value);
            dispatch({ type: "setTempo", bpm });
            engine.setTempo(bpm);
          }}
        />
      </RailControl>

      <RailControl
        title={`✨ ${SCALES[project.scaleId].label}`}
        coach={SCALES[project.scaleId].coach}
      >
        <button
          className={"rail-toggle t-btn" + (magicOn ? " active" : "")}
          onClick={() =>
            dispatch({ type: "setScale", scaleId: magicOn ? "rainbow" : "magic" })
          }
        >
          {magicOn ? "Magic Notes: ON" : "Rainbow Notes"}
        </button>
      </RailControl>

      <RailControl
        title={`🏠 Key · ${KEYS[project.keyId].label}`}
        coach="Home note the song leans on. Try a few — pick what feels happy."
      >
        <div className="rail-pills">
          {KEY_IDS.map((k) => (
            <button
              key={k}
              className={"rail-pill" + (project.keyId === k ? " active" : "")}
              onClick={() => dispatch({ type: "setKey", keyId: k as KeyId })}
            >
              {KEYS[k].label}
            </button>
          ))}
        </div>
      </RailControl>

      <RailControl
        title={`🎢 Groove · ${project.swing > 0.05 ? "Bouncy" : "Straight"}`}
        coach="Swing makes the beat bounce instead of marching in a line."
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={project.swing}
          onChange={(e) => dispatch({ type: "setSwing", swing: Number(e.target.value) })}
        />
      </RailControl>

      <p className="rail-foot coach">
        🎚️ Tap a track to tweak its own sound — instrument, volume, echo &
        groove live right on the track now.
      </p>
    </div>
  );
};


// ── Song Train: the Tracks strip ─────────────────────────────────────────────
// A new region below the play bar (shown only once there's a train). Cars sit
// left→right in song order as colored blocks; tap one to open it in Home, ▶ Ride
// plays the whole song through. The riding car lights up while it plays.

/** Where playback is along the song: which arrangement index is sounding and how
 *  far through that car (0..1, including the sub-bar fraction). index = -1 when
 *  stopped/empty. Drives BOTH the moving train sprite and the riding highlight. */
const ridingAt = (
  project: Project,
  bar: number,
  stepFrac: number,
): { index: number; frac: number } => {
  if (bar < 0) return { index: -1, frac: 0 };
  // Playback loops the loop region, so the absolute transport bar maps back into
  // [start, start+length) — the train rides only the looped cars.
  const { start, length } = loopRegion(project);
  const songBar = start + (((bar % length) + length) % length);
  const car = carAtBar(project, songBar);
  if (!car) return { index: -1, frac: 0 };
  return { index: car.index, frac: (songBar - car.startBar + stepFrac) / car.reps };
};

/** One car in the strip: colored block, tap to open in Home, double-tap the
 *  name to rename. The active (editing) car gets a ring; the riding car pulses. */
const CarBlock: FC<{
  partId: string;
  index: number;
  riding: boolean;
}> = ({ partId, index, riding }) => {
  const { dispatch } = useApp();
  const project = useProject();
  const part = project.parts.find((p) => p.id === partId);
  const [editing, setEditing] = useState(false);
  if (!part) return null;
  const active = project.activePartId === partId;
  const canDelete = project.parts.length > 1; // never offer to delete the last car
  const open = (): void => {
    dispatch({ type: "selectCar", partId });
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };
  const commit = (name: string): void => {
    setEditing(false);
    dispatch({ type: "renameCar", partId, name });
  };
  // Duplicate THIS car (copy + insert right after) and open the copy.
  const duplicate = (e: React.MouseEvent): void => {
    e.stopPropagation();
    dispatch({ type: "duplicateCar", partId, id: newCarId() });
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };
  // Delete THIS car — undoable (removeCar is a Command in history).
  const remove = (e: React.MouseEvent): void => {
    e.stopPropagation();
    dispatch({ type: "removeCar", partId });
  };
  // The front car (first in the arrangement) is the locomotive — engine cab +
  // smokestack + cowcatcher; the rest are boxcars. Couplers + rails (in CSS)
  // make them read as a train sitting on a track.
  const isEngine = index === 0;
  return (
    <div
      role="button"
      tabIndex={0}
      className={
        "car-block" +
        (isEngine ? " loco" : "") +
        (active ? " active" : "") +
        (riding ? " riding" : "")
      }
      data-car={partId}
      style={cssVar("--car-color", part.color)}
      onClick={open}
    >
      <span className="car-acts">
        <button
          type="button"
          className="car-act"
          data-act="dup-car"
          title="Make a copy of this car"
          onClick={duplicate}
        >
          ⧉
        </button>
        {canDelete && (
          <button
            type="button"
            className="car-act car-act--del"
            data-act="del-car"
            title="Delete this car"
            onClick={remove}
          >
            ✕
          </button>
        )}
      </span>
      {isEngine && <span className="car-stack" aria-hidden />}
      <div className="car-body">
        <span className="car-num">{isEngine ? "🚂" : index + 1}</span>
        {editing ? (
          <input
            className="car-rename"
            defaultValue={part.name}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(e.currentTarget.value);
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <span
            className="car-name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {part.name}
          </span>
        )}
      </div>
      <span className="car-wheels" aria-hidden>
        <i className="car-wheel" />
        <i className="car-wheel" />
      </span>
    </div>
  );
};

// The loop on its OWN track (separate from the cars): a rail divided into one
// segment per song bar, with two big draggable TUNNELS marking the loop's start
// and end. Drag a tunnel (or its ‹›grabber) to set the loop range; the playback
// engine rides between them and dips fully through each tunnel every lap. No
// car-DOM measuring — positions are pure fractions of the song length.
const LoopRail: FC = () => {
  const { dispatch, engine, sound, getProject } = useApp();
  const project = useProject();
  const trackRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLDivElement>(null);
  const total = songBars(project);
  const { start, length } = loopRegion(project);
  const leftFrac = start / total;
  const rightFrac = (start + length) / total;

  // Ride the engine along the loop track during Ride: 0→1 across the looped
  // span each lap, so it enters the end tunnel and re-emerges from the start one.
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const t = trainRef.current;
      if (t) {
        const isRide = engine.playMode === "ride";
        const bar = isRide ? engine.getTransportBar() : -1;
        if (bar < 0) {
          t.style.opacity = "0";
        } else {
          const p = getProject();
          const tot = songBars(p);
          const { start: s, length: len } = loopRegion(p);
          const stepFrac = Math.max(0, sound.getTransportStep(1000)) / 1000;
          const prog = ((((bar % len) + len) % len) + stepFrac) / len; // 0..1 lap
          t.style.left = `${((s + prog * len) / tot) * 100}%`;
          t.style.opacity = "1";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, sound, getProject]);

  // Pointer x → nearest bar boundary (0..total) on the loop track.
  const barAtX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const tot = songBars(getProject());
    return Math.max(0, Math.min(tot, Math.round(((clientX - r.left) / r.width) * tot)));
  };

  const dragTunnel =
    (which: "start" | "end") =>
    (e: React.PointerEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      const apply = (clientX: number): void => {
        const p = getProject();
        const { start: s, length: len } = loopRegion(p);
        const end = s + len;
        const b = barAtX(clientX);
        if (which === "start") {
          const ns = Math.min(b, end - 1);
          dispatch({ type: "setLoop", start: ns, length: end - ns });
        } else {
          const ne = Math.max(b, s + 1);
          dispatch({ type: "setLoop", start: s, length: ne - s });
        }
      };
      const move = (ev: PointerEvent): void => apply(ev.clientX);
      const up = (): void => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  return (
    <div className="song-loop-track" data-loop-track ref={trackRef}>
      <div className="loop-rail" aria-hidden />
      <div
        className="loop-band"
        aria-hidden
        style={{ left: `${leftFrac * 100}%`, width: `${(rightFrac - leftFrac) * 100}%` }}
      />
      <div className="train-sprite" ref={trainRef} aria-hidden>
        🚂
      </div>
      <button
        type="button"
        className="loop-tunnel loop-tunnel--start"
        data-act="loop-start"
        style={{ left: `${leftFrac * 100}%` }}
        title="Drag to set where the loop starts"
        onPointerDown={dragTunnel("start")}
      >
        <span className="loop-grab" aria-hidden>
          ‹ ›
        </span>
      </button>
      <button
        type="button"
        className="loop-tunnel loop-tunnel--end"
        data-act="loop-end"
        style={{ left: `${rightFrac * 100}%` }}
        title="Drag to set where the loop ends"
        onPointerDown={dragTunnel("end")}
      >
        <span className="loop-grab" aria-hidden>
          ‹ ›
        </span>
      </button>
    </div>
  );
};

export const TracksStrip: FC = () => {
  const { dispatch, engine, sound, getProject } = useApp();
  const project = useProject();
  const [riding, setRiding] = useState(-1);

  // Light up whichever car the loop is currently playing (the moving engine
  // lives on the separate loop track below). Only the riding index flips state.
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      const isRide = engine.playMode === "ride";
      const bar = isRide ? engine.getTransportBar() : -1;
      const stepFrac = bar < 0 ? 0 : Math.max(0, sound.getTransportStep(1000)) / 1000;
      const { index } = ridingAt(getProject(), bar, stepFrac);
      setRiding((prev) => (prev === index ? prev : index));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, sound, getProject]);

  const addCar = (): void => {
    dispatch({ type: "addCar", id: newCarId() });
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };

  return (
    <section className="tracks-strip" data-region="tracks">
      <div className="tracks-head">🚂 Song Train</div>
      {/* Cars + loop track share one scroll box so the track is exactly as wide
          as the cars and the two stay aligned + scroll together. */}
      <div className="song-train-body">
      <div className="tracks-cars">
        {project.arrangement.map((car, i) => (
          <CarBlock
            key={`${car.partId}-${i}`}
            partId={car.partId}
            index={i}
            riding={riding === i}
          />
        ))}
        {project.parts.length < MAX_CARS && (
          <button
            type="button"
            className="car-add"
            data-act="new-car"
            onClick={addCar}
            title="Add a new car (a copy of this one to change)"
          >
            ＋<span>New Car</span>
          </button>
        )}
      </div>
      {/* The loop on its OWN track: drag the tunnels to set the looping range;
          the engine rides between them and dips through each lap. */}
      <LoopRail />
      </div>
      <button
        type="button"
        className="tracks-ride"
        data-act="ride"
        onClick={() => engine.playRide(getProject())}
        title="Play the looped cars over and over"
      >
        ▶ Ride
      </button>
    </section>
  );
};

// ── Magic Pad (theremin) ─────────────────────────────────────────────────────

const WAVES: { wave: ThereminWave; label: string; emoji: string }[] = [
  { wave: "triangle", label: "Soft", emoji: "🔺" },
  { wave: "sine", label: "Smooth", emoji: "🌊" },
  { wave: "square", label: "Buzzy", emoji: "🟦" },
  { wave: "sawtooth", label: "Sharp", emoji: "🪚" },
];

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Kid-readable name for a tone (brightness) value. */
const toneLabel = (tone: number): string =>
  tone > 0.66 ? "Bright" : tone > 0.33 ? "Mellow" : "Dark";

let magicCount = 0; // numbers Magic Pad recordings so they're tellable apart

const MagicPadCanvas: FC = () => {
  const { sound, dispatch } = useApp();
  const project = useProject();
  const { select } = useLoopSelection();
  const padRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  const [recording, setRecording] = useState(false);
  const [clipId, setClipId] = useState<string | null>(null);
  const clip = clipId ? project.clips[clipId] : undefined;
  const onHome = clipId ? activeLayers(project).some((l) => l.id === clipId) : false;

  useEffect(() => () => sound.thereminOff(), [sound]);

  const toggleRecord = async (): Promise<void> => {
    if (!recording) {
      await sound.startPerformanceRecording();
      setRecording(true);
      return;
    }
    setRecording(false);
    sound.thereminOff(); // make sure the held voice (if any) is released
    try {
      const bufferId = await sound.stopPerformanceRecording();
      const newClip: Clip = {
        id: `clip-${clipSeq++}`,
        source: { kind: "recording", bufferId },
        effects: [],
        color: "#8338ec",
        label: `Magic Pad ${++magicCount}`,
      };
      dispatch({ type: "addClip", clip: newClip });
      setClipId(newClip.id);
      sound.play(newClip);
    } catch {
      // No-op: nothing was captured. The pad stays ready to try again.
    }
  };

  // Stack the captured performance onto Home as a once-per-loop lane, then jump
  // to Home with it selected — the same rule as a voice recording.
  const sendToHome = (): void => {
    if (!clipId || onHome) return;
    const steps = new Array<boolean>(STEP_COUNT).fill(false);
    steps[0] = true;
    dispatch({
      type: "addLayer",
      layer: makeLayer({ id: clipId, clipId, kind: "drum", steps }),
    });
    select(clipId);
    dispatch({ type: "setActiveMachine", machineId: "looper-stage" });
  };

  // Trash the captured performance — undoable via removeClip.
  const trashTake = (): void => {
    if (!clipId) return;
    dispatch({ type: "removeClip", clipId });
  };

  // Snap-to-beat: same loop-to-beat treatment as a voice take.
  const toggleSnap = (): void => {
    const c = clipId ? project.clips[clipId] : undefined;
    if (!c || c.source.kind !== "recording") return;
    if (c.loopBeats !== undefined) {
      dispatch({ type: "setClipLoop", clipId: c.id, loopBeats: null });
      return;
    }
    const dur = sound.getBufferDuration(c.source.bufferId);
    const beats = dur ? nearestBeatLoop(dur, project.tempoBpm).beats : 1;
    dispatch({ type: "setClipLoop", clipId: c.id, loopBeats: beats });
  };

  const norm = (e: React.PointerEvent): { x: number; y: number } => {
    const r = padRef.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  };
  const moveDot = (x: number, y: number): void => {
    if (!dotRef.current) return;
    dotRef.current.style.left = `${x * 100}%`;
    dotRef.current.style.top = `${y * 100}%`;
  };
  const down = (e: React.PointerEvent<HTMLDivElement>): void => {
    active.current = true;
    padRef.current?.setPointerCapture(e.pointerId);
    sound.thereminOn();
    if (dotRef.current) dotRef.current.hidden = false;
    const { x, y } = norm(e);
    sound.setThereminXY(x, 1 - y);
    moveDot(x, y);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!active.current) return;
    const { x, y } = norm(e);
    sound.setThereminXY(x, 1 - y);
    moveDot(x, y);
  };
  const up = (): void => {
    active.current = false;
    sound.thereminOff();
    if (dotRef.current) dotRef.current.hidden = true;
  };

  return (
    <section className="machine machine--theremin" data-machine="theremin-xy">
      <div className="magic-bar">
        <button
          className={"t-btn magic-record" + (recording ? " recording" : "")}
          data-act="magic-record"
          onClick={toggleRecord}
        >
          {recording ? "⏺️ Stop & keep it" : "🎙️ Record my song"}
        </button>
        {clip && (
          <>
            <ClipCard
              clip={clip}
              icon="✨"
              onPreview={() => sound.play(clip)}
              onTrash={trashTake}
              snapped={clip.loopBeats !== undefined}
              onToggleSnap={toggleSnap}
            />
            <button
              className="t-btn send-home"
              data-act="send-home"
              disabled={onHome}
              onClick={sendToHome}
            >
              {onHome ? "✓ On Home" : "➡️ 🏠 Send to Home"}
            </button>
          </>
        )}
      </div>
      <div
        className="xy-pad"
        ref={padRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="xy-dot" ref={dotRef} hidden />
        <p className="xy-hint">
          {recording
            ? "Recording… drag to play, then Stop! ✨"
            : "Drag your finger to play! ✨"}
        </p>
      </div>
    </section>
  );
};

const MagicPadOptions: FC = () => {
  const { sound } = useApp();
  const [wave, setWave] = useState<ThereminWave>("triangle");
  return (
    <div className="opt-choices">
      {WAVES.map((w) => (
        <button
          key={w.wave}
          className={w.wave === wave ? "opt-choice active" : "opt-choice"}
          onClick={() => {
            sound.setThereminWaveform(w.wave);
            setWave(w.wave);
          }}
        >
          <span>{w.emoji}</span>
          <span>{w.label}</span>
        </button>
      ))}
    </div>
  );
};

// ── Registry (order = palette order) ─────────────────────────────────────────

export const TOOLS: readonly ToolDescriptor[] = [
  { id: "looper-stage", label: "Home", icon: "🏠", Canvas: LoopStageCanvas, Rail: LoopStageRail },
  { id: "record-voicefx", label: "My Voice", icon: "🎤", Canvas: MyVoiceCanvas, Options: MyVoiceOptions },
  { id: "voice-keys", label: "Voice Keys", icon: "🎙️", Canvas: VoiceKeysCanvas },
  { id: "sound-pads", label: "Sound Pads", icon: "🥁", Canvas: SoundPadsCanvas },
  { id: "beat-grid", label: "Beat Maker", icon: "🎛️", Canvas: BeatMakerCanvas },
  { id: "theremin-xy", label: "Magic Pad", icon: "✨", Canvas: MagicPadCanvas, Options: MagicPadOptions },
];
