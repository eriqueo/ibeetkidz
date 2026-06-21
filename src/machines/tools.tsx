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
import type { Clip, EffectId } from "../core/types.ts";
import { STEP_COUNT } from "../core/types.ts";
import { makeLayer } from "../core/project-state.ts";
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

// Friendly colors cycled onto new melody lanes.
const MELODY_COLORS = ["#8338ec", "#3a86ff", "#06d6a0", "#fb5607"];
let melodySeq = 0;

const cssVar = (name: string, value: string): CSSProperties =>
  ({ [name]: value }) as CSSProperties;

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

const MyVoiceCanvas: FC = () => {
  const { sound, rng, dispatch, getProject } = useApp();
  const project = useProject();
  const { select } = useLoopSelection();
  const [status, setStatus] = useState("Hold the mic to record your voice! 🎤");
  const [recording, setRecording] = useState(false);
  // The clip this page is currently shaping. Effects + Send-to-Home act on it.
  const [clipId, setClipId] = useState<string | null>(null);
  const clip = clipId ? project.clips[clipId] : undefined;
  // Once a clip is on Home its lane id equals the clip id (see sendToHome).
  const onHome = clipId ? project.layers.some((l) => l.id === clipId) : false;

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
      setClipId(newClip.id);
      sound.play(newClip);
      setStatus("Make it funny with an effect, then send it Home! 🎉");
    } catch {
      setStatus("Hmm, that didn't record. Try again!");
    }
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

  // Stack the (funny) recording onto Home as a 16-step lane, firing once per
  // loop to start. Then jump to Home with the new lane selected to tweak.
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

  return (
    <section className="machine machine--voicefx" data-machine="record-voicefx">
      <button
        className={recording ? "big-record recording" : "big-record"}
        onPointerDown={startRec}
        onPointerUp={stopRec}
        onPointerLeave={stopRec}
      >
        🎤 HOLD TO RECORD
      </button>
      <p className="voicefx-status">{status}</p>

      {clip && (
        <div className="voice-clip-card" style={cssVar("--tile-color", clip.color)}>
          <span className="voice-clip-name">
            🎤 <EditableLabel
              value={clip.label}
              onCommit={(label) =>
                dispatch({ type: "renameClip", clipId: clip.id, label })
              }
            />
          </span>
          <button
            className="t-btn send-home"
            data-act="send-home"
            disabled={onHome}
            onClick={sendToHome}
          >
            {onHome ? "✓ On Home" : "➡️ 🏠 Send to Home"}
          </button>
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

  // Ensure each drum has a clip + an empty layer to toggle (once, guarded).
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
      if (!getProject().layers.some((l) => l.id === id)) {
        dispatch({
          type: "addLayer",
          layer: makeLayer({ id, clipId: id, kind: "drum" }),
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
          const layer = project.layers.find((l) => l.id === id);
          const steps = layer?.steps ?? new Array<boolean>(STEP_COUNT).fill(false);
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

const LoopStageCanvas: FC = () => {
  const { sound, dispatch } = useApp();
  const project = useProject();
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

  // Add (or just re-select) a SPECIFIC drum the kid chose — no more random.
  const addDrum = (assetId: string): void => {
    const drum = DRUM_SOUNDS.find((d) => d.assetId === assetId);
    if (!drum) return;
    const id = `beat-${drum.assetId}`;
    setPicking(false);
    if (project.layers.some((l) => l.id === id)) {
      select(id); // already on the stage → highlight it
      return;
    }
    const clip: Clip = {
      id,
      source: { kind: "builtin", assetId: drum.assetId },
      effects: [],
      color: drum.color,
      label: drum.label,
    };
    dispatch({ type: "addClip", clip });
    dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum" }) });
    select(id);
    sound.play(clip); // a quick taste of the drum you just picked
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
      <div className="loop-add">
        <button
          className={"t-btn" + (picking ? " active" : "")}
          data-act="add-drum"
          onClick={() => setPicking((p) => !p)}
        >
          ➕ 🥁 Drum
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
        <span className="loop-hint">
          Stack drums, melodies & your voice — then shape it with Studio.
        </span>
      </div>

      {picking && (
        <div className="drum-picker" data-picker="drums">
          {DRUM_SOUNDS.map((d) => {
            const present = project.layers.some((l) => l.id === `beat-${d.assetId}`);
            return (
              <button
                key={d.assetId}
                className={"drum-chip" + (present ? " present" : "")}
                data-drum={d.assetId}
                style={cssVar("--pad-color", d.color)}
                onClick={() => addDrum(d.assetId)}
              >
                <span className="drum-emoji">{d.emoji}</span>
                <span>{d.label}</span>
                {present && <span className="drum-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {project.layers.length === 0 ? (
        <p className="stub-note">
          🏠 This is <b>Home</b> — where your sounds stack up. Add a{" "}
          <b>➕ Drum</b>, a <b>➕ Melody</b>, or record your <b>➕ Voice</b>. Or
          hit 🎲 for a surprise.
        </p>
      ) : (
        <div className="loop-board" ref={boardRef} data-playing="false">
          {project.layers.map((layer) => (
            <LoopTrack key={layer.id} layerId={layer.id} />
          ))}
        </div>
      )}
    </section>
  );
};

/** One lane on the Loop Stage — a drum row or a melody mini-grid. */
const LoopTrack: FC<{ layerId: string }> = ({ layerId }) => {
  const { sound, dispatch } = useApp();
  const project = useProject();
  const { selected, select } = useLoopSelection();
  const layer = project.layers.find((l) => l.id === layerId);
  if (!layer) return null;
  const clip = project.clips[layer.clipId];
  const isVoice = clip?.source.kind === "recording";
  const prefix = layer.kind === "melody" ? "🎵 " : isVoice ? "🎤 " : "";

  return (
    <div
      className={"loop-track" + (selected === layer.id ? " selected" : "")}
      style={cssVar("--row-color", clip?.color ?? "#888")}
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

      {layer.kind === "melody" ? (
        <div
          className="melody-grid"
          style={cssVar("--rows", String(MELODY_ROWS))}
        >
          {/* High notes on top → iterate rows from the top down. */}
          {Array.from({ length: MELODY_ROWS }, (_, r) => MELODY_ROWS - 1 - r).map(
            (row) => (
              <div className="melody-row" key={row}>
                {layer.notes.map((rows, i) => {
                  const on = rows.includes(row);
                  return (
                    <button
                      key={i}
                      className={
                        "note-cell" +
                        (on ? " on" : "") +
                        (i % 4 === 0 ? " downbeat" : "")
                      }
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        select(layer.id);
                        dispatch({
                          type: "toggleNote",
                          layerId: layer.id,
                          index: i,
                          row,
                        });
                        if (!on) {
                          sound.previewNote(
                            degreeToNote(project.scaleId, project.keyId, row),
                            layer.wave,
                          );
                        }
                      }}
                    />
                  );
                })}
              </div>
            ),
          )}
          <div className="loop-playhead" />
        </div>
      ) : (
        <div className="loop-lane">
          {layer.steps.map((on, i) => (
            <button
              key={i}
              className={
                "loop-cell" + (on ? " on" : "") + (i % 4 === 0 ? " downbeat" : "")
              }
              onPointerDown={(e) => {
                e.stopPropagation();
                select(layer.id);
                dispatch({ type: "toggleStep", layerId: layer.id, index: i });
                if (!on && clip) sound.play(clip);
              }}
            />
          ))}
          <div className="loop-playhead" />
        </div>
      )}
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
  const { dispatch, engine } = useApp();
  const project = useProject();
  const { selected } = useLoopSelection();
  const lane =
    project.layers.find((l) => l.id === selected) ?? project.layers[0] ?? null;
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

      <div className="rail-sep">
        🎚️ {lane ? `${project.clips[lane.clipId]?.label ?? "Lane"}` : "Lane"}
      </div>

      {lane ? (
        <>
          {lane.kind === "melody" && (
            <RailControl
              title="🔊 Sound"
              coach="The voice of this tune. Soft & Smooth are gentle; Buzzy & Sharp cut through."
            >
              <div className="rail-pills">
                {WAVES.map((w) => (
                  <button
                    key={w.wave}
                    className={"rail-pill" + (lane.wave === w.wave ? " active" : "")}
                    onClick={() =>
                      dispatch({ type: "setLayerWave", layerId: lane.id, wave: w.wave })
                    }
                    title={w.label}
                  >
                    {w.emoji}
                  </button>
                ))}
              </div>
            </RailControl>
          )}

          <RailControl
            title="📢 Volume"
            coach="How loud this lane sits in the mix. Turn down to tuck it behind."
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={lane.volume}
              onChange={(e) =>
                dispatch({
                  type: "setLayerVolume",
                  layerId: lane.id,
                  volume: Number(e.target.value),
                })
              }
            />
          </RailControl>

          <RailControl
            title={`🌀 Echo · ${Math.round(lane.echo * 100)}%`}
            coach="Adds a spacey echo tail. A little = roomy; a lot = dreamy."
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={lane.echo}
              onChange={(e) =>
                dispatch({
                  type: "setLayerEcho",
                  layerId: lane.id,
                  echo: Number(e.target.value),
                })
              }
            />
          </RailControl>
        </>
      ) : (
        <p className="coach">Add a lane, then tap it to tweak its sound here.</p>
      )}
    </div>
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

const MagicPadCanvas: FC = () => {
  const { sound } = useApp();
  const padRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  useEffect(() => () => sound.thereminOff(), [sound]);

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
      <div
        className="xy-pad"
        ref={padRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="xy-dot" ref={dotRef} hidden />
        <p className="xy-hint">Drag your finger to play! ✨</p>
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
  { id: "sound-pads", label: "Sound Pads", icon: "🥁", Canvas: SoundPadsCanvas },
  { id: "beat-grid", label: "Beat Maker", icon: "🎛️", Canvas: BeatMakerCanvas },
  { id: "theremin-xy", label: "Magic Pad", icon: "✨", Canvas: MagicPadCanvas, Options: MagicPadOptions },
];
