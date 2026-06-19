// The five tools as React components over the unchanged hexagonal core. Each
// tool is a descriptor { id, label, icon, Canvas, Options? }; the Canvas renders
// the tool's main surface, Options (if any) renders its knobs in the top bar.
// All audio still routes through ctx.sound; all state via ctx.dispatch.

import * as React from "react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FC,
} from "react";
import { useApp, useProject } from "../app/context.tsx";
import type { Clip, EffectId } from "../core/types.ts";
import { STEP_COUNT } from "../core/types.ts";
import { BUILTIN_SOUNDS, DRUM_SOUNDS } from "../core/sound-catalog.ts";
import type { ThereminWave } from "../ports/sound-port.ts";

export interface ToolDescriptor {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly Canvas: FC;
  readonly Options?: FC;
}

const cssVar = (name: string, value: string): CSSProperties =>
  ({ [name]: value }) as CSSProperties;

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
let wildness = 0.6; // shared between the canvas tiles and the Options knob

function mostRecentRecordedClipId(
  clips: Readonly<Record<string, Clip>>,
): string | null {
  const recorded = Object.values(clips).filter(
    (c) => c.source.kind === "recording",
  );
  const last = recorded[recorded.length - 1];
  return last ? last.id : null;
}

const MyVoiceCanvas: FC = () => {
  const { sound, rng, dispatch, getProject } = useApp();
  const [status, setStatus] = useState("Tap the effects to change your voice!");
  const [recording, setRecording] = useState(false);

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
      const clip: Clip = {
        id: `clip-${clipSeq++}`,
        source: { kind: "recording", bufferId },
        effects: [],
        color: "#ff5d8f",
        label: "My Voice",
      };
      dispatch({ type: "addClip", clip });
      sound.play(clip);
      setStatus("Now tap an effect to make it crazy! 🎉");
    } catch {
      setStatus("Hmm, that didn't record. Try again!");
    }
  };

  const applyFx = (tile: (typeof EFFECT_TILES)[number]): void => {
    const clipId = mostRecentRecordedClipId(getProject().clips);
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
          layer: {
            id,
            clipId: id,
            volume: 0.9,
            muted: false,
            steps: new Array<boolean>(STEP_COUNT).fill(false),
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
  const { dispatch } = useApp();
  const project = useProject();

  if (project.layers.length === 0) {
    return (
      <section className="machine machine--stage" data-machine="looper-stage">
        <p className="stub-note">
          No loops yet! Make a beat in the Beat Maker 🎛️, then mix it here.
        </p>
      </section>
    );
  }

  return (
    <section className="machine machine--stage" data-machine="looper-stage">
      <div className="layer-list">
        {project.layers.map((layer) => {
          const clip = project.clips[layer.clipId];
          return (
            <div
              className="layer-row"
              key={layer.id}
              style={cssVar("--row-color", clip?.color ?? "#888")}
            >
              <span className="layer-name">{clip?.label ?? layer.clipId}</span>
              <button
                className="layer-mute t-btn"
                onClick={() =>
                  dispatch({ type: "toggleLayerMuted", layerId: layer.id })
                }
              >
                {layer.muted ? "🔇" : "🔊"}
              </button>
              <input
                className="layer-vol"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={layer.volume}
                onChange={(e) =>
                  dispatch({
                    type: "setLayerVolume",
                    layerId: layer.id,
                    volume: Number(e.target.value),
                  })
                }
              />
              <button
                className="layer-remove t-btn"
                onClick={() =>
                  dispatch({ type: "removeLayer", layerId: layer.id })
                }
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>
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
  { id: "record-voicefx", label: "My Voice", icon: "🎤", Canvas: MyVoiceCanvas, Options: MyVoiceOptions },
  { id: "sound-pads", label: "Sound Pads", icon: "🥁", Canvas: SoundPadsCanvas },
  { id: "beat-grid", label: "Beat Maker", icon: "🎛️", Canvas: BeatMakerCanvas },
  { id: "looper-stage", label: "Loop Stage", icon: "🔁", Canvas: LoopStageCanvas },
  { id: "theremin-xy", label: "Magic Pad", icon: "✨", Canvas: MagicPadCanvas, Options: MagicPadOptions },
];
