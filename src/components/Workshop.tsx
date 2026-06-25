import { FC, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer } from "../core/project-state.ts";
import { CAR_TYPES, type CarType } from "../core/types.ts";
import { LoopTrack, TOOLS, LoopSelectionProvider } from "../machines/tools.tsx";
import { BUILTIN_SOUNDS } from "../core/sound-catalog.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { PixelButton } from "./PixelButton.tsx";
import { WorkshopScene } from "../game/scenes/WorkshopScene.ts";
import { WORKSHOP_LAYOUT_V2, SCENE_ASPECT, rowCell } from "../game/scene-layout.ts";
import { carSpriteUrlV2 } from "../game/assets.ts";
import { useContainedRect, regionStyle } from "../app/use-overlay-rect.ts";

const WORKSHOP_SCENES = [WorkshopScene];

const INSTRUMENTS = [
  { id: "kick", label: "Kick" }, { id: "snare", label: "Snare" },
  { id: "hihat", label: "Cymbal" }, { id: "tom", label: "Tom" },
  { id: "cowbell", label: "Cowbell" }, { id: "shaker", label: "Shaker" },
  { id: "note-do", label: "Synth" }, { id: "note-mi", label: "Voice" },
];

// Creative-tool stations (the satellite machines), with short labels.
const STATION_LIST = [
  { id: "record-voicefx", label: "Voice", emoji: "🎤" },
  { id: "voice-keys", label: "Keys", emoji: "🎙️" },
  { id: "sound-pads", label: "Pads", emoji: "🥁" },
  { id: "beat-grid", label: "Beat", emoji: "🎛️" },
  { id: "theremin-xy", label: "Magic", emoji: "✨" },
];
const STATIONS = TOOLS.filter((t) => t.id !== "looper-stage");

const CAR_TYPE_LABELS: Record<CarType, string> = {
  boxcar: "Box", tanker: "Tank", hopper: "Hop", flatcar: "Flat",
};

let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;

export const Workshop: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const part = activePart(project);
  const layers = activeLayers(project);

  const wrapRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(wrapRef, SCENE_ASPECT);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const station = STATIONS.find((t) => t.id === openTool);

  function addInstrument(assetId: string) {
    const catalog = BUILTIN_SOUNDS.find((s) => s.assetId === assetId);
    if (!catalog) return;
    const clipId = `workshop-${assetId}-${Date.now()}`;
    const layerId = `layer-${assetId}-${Date.now()}`;
    const kind = catalog.recipe.kind === "drum" ? "drum" : "melody";
    if (!project.clips[clipId]) {
      dispatch({ type: "addClip", clip: { id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label } });
    }
    dispatch({ type: "addLayer", layer: makeLayer({ id: layerId, clipId, kind, ...(kind === "melody" ? { wave: "triangle" } : {}) }) });
    sound.play({ id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label });
  }

  const setTempo = (b: number) => { const bpm = Math.max(40, Math.min(220, b)); dispatch({ type: "setTempo", bpm }); engine.setTempo(bpm); };
  const ins = WORKSHOP_LAYOUT_V2.instruments;

  return (
    <div ref={wrapRef} style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <PhaserGame scenes={WORKSHOP_SCENES} />

      {/* Top nav */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="◀" label="Map" onClick={() => dispatch({ type: "setActiveView", view: "map" })} />
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20, display: "flex", gap: 6 }}>
        <PixelButton emoji="➕" label="New Car" onClick={() => dispatch({ type: "addCar", id: newCarId() })} />
        <PixelButton variant="primary" emoji="📦" label="To Yard" onClick={() => dispatch({ type: "setActiveView", view: "yard" })} />
      </div>

      {/* Creative-tool stations (left dock) */}
      <div style={{ position: "absolute", left: 8, top: "26%", zIndex: 18, display: "flex", flexDirection: "column", gap: 6 }}>
        {STATION_LIST.map((s) => (
          <PixelButton key={s.id} emoji={s.emoji} label={s.label} onClick={() => setOpenTool(s.id)} style={{ width: 96, justifyContent: "flex-start" }} />
        ))}
      </div>

      {/* Mixing board over the boxcar interior */}
      <div style={{ ...regionStyle(rect, WORKSHOP_LAYOUT_V2.carInterior), zIndex: 10, overflow: "hidden" }}>
        {layers.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "#e8dcc8", font: "400 9px/1.8 var(--font-label, 'Press Start 2P')", letterSpacing: "1px", textShadow: "1px 1px 0 #000" }}>
            Empty car.<br />Tap an instrument below.
          </div>
        ) : (
          <div className="loop-board workshop-board" data-playing={engine.isPlaying} style={{ height: "100%", overflow: "hidden" }}>
            {layers.map((layer) => <LoopTrack key={layer.id} layerId={layer.id} />)}
          </div>
        )}
      </div>

      {/* Car-type picker on the flatcar bed */}
      <div style={{ ...regionStyle(rect, WORKSHOP_LAYOUT_V2.carTypePicker), zIndex: 12, display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
        {CAR_TYPES.map((ct) => (
          <button
            key={ct}
            className="pixel-tap"
            title={CAR_TYPE_LABELS[ct]}
            aria-pressed={part.carType === ct}
            onClick={() => dispatch({ type: "setCarType", partId: part.id, carType: ct })}
            style={{
              height: "100%", background: part.carType === ct ? "rgba(255,209,102,0.3)" : "rgba(0,0,0,0.2)",
              border: part.carType === ct ? "2px solid #ffd166" : "2px solid transparent", borderRadius: 4,
              cursor: "pointer", padding: 1, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <img src={carSpriteUrlV2[ct]} alt={CAR_TYPE_LABELS[ct]} style={{ maxHeight: "100%", maxWidth: "100%", imageRendering: "pixelated" }} />
          </button>
        ))}
      </div>

      {/* Painted ground instruments → add lane (press pop via .pixel-tap) */}
      {INSTRUMENTS.map((inst, i) => {
        const c = rowCell(i, ins.count, ins.c0, ins.c1, ins.y, ins.w, ins.h);
        return (
          <button
            key={inst.id}
            className="pixel-tap"
            title={`Add ${inst.label}`}
            onClick={() => addInstrument(inst.id)}
            style={{ ...regionStyle(rect, c), zIndex: 11, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          />
        );
      })}

      {/* Bottom transport bar */}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 6, alignItems: "center" }}>
        <PixelButton variant="primary" emoji="▶" label="Play" onClick={() => engine.playLoop(project)} />
        <PixelButton emoji="■" label="Stop" onClick={() => engine.stop()} />
        <PixelButton emoji="🔁" label="Loop" onClick={() => engine.playLoop(project)} />
        <PixelButton emoji="🐢" label="Slow" onClick={() => setTempo(project.tempoBpm - 10)} />
        <span style={{ font: "400 9px/1 var(--font-label, 'Press Start 2P')", color: "#e8dcc8", textShadow: "1px 1px 0 #000", minWidth: 34, textAlign: "center" }}>{project.tempoBpm}</span>
        <PixelButton emoji="🐇" label="Fast" onClick={() => setTempo(project.tempoBpm + 10)} />
      </div>

      {/* Station panel (a tool's machine UI over the scene) */}
      {station && (
        <div role="dialog" aria-label={station.label} style={{ position: "absolute", inset: "8% 5%", zIndex: 30, display: "flex", flexDirection: "column", background: "rgba(18,14,22,0.97)", border: "3px solid #ffd166", borderRadius: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <header style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "2px solid rgba(255,255,255,0.15)" }}>
            <span style={{ fontSize: 20 }}>{station.icon}</span>
            <span style={{ font: "400 12px/1 var(--font-label, 'Press Start 2P')", color: "#e8dcc8", letterSpacing: "1px" }}>{station.label}</span>
            <div style={{ marginLeft: "auto" }}>
              <PixelButton variant="primary" emoji="✓" label="Done" onClick={() => setOpenTool(null)} />
            </div>
          </header>
          <div className="workshop-station-body" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <LoopSelectionProvider>
              {station.Options ? <station.Options /> : null}
              <station.Canvas />
            </LoopSelectionProvider>
          </div>
        </div>
      )}
    </div>
  );
};
