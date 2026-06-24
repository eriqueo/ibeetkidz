import { FC, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer } from "../core/project-state.ts";
import { CAR_TYPES, type CarType } from "../core/types.ts";
import { LoopTrack, TOOLS, LoopSelectionProvider } from "../machines/tools.tsx";
import { BUILTIN_SOUNDS } from "../core/sound-catalog.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { WorkshopScene } from "../game/scenes/WorkshopScene.ts";
import {
  WORKSHOP_LAYOUT_V2,
  WORKSHOP_TOOLBAR,
  SCENE_ASPECT,
  rowCell,
} from "../game/scene-layout.ts";
import { carSpriteUrl } from "../game/assets.ts";
import { useContainedRect, regionStyle, type NormRegion } from "../app/use-overlay-rect.ts";

const WORKSHOP_SCENES = [WorkshopScene];

// Painted ground instruments, left→right (kick … voice), matched to catalog ids.
const INSTRUMENTS = [
  "kick", "snare", "hihat", "tom", "cowbell", "shaker", "note-do", "note-mi",
];

// Toolbar icon action → station tool id (the rest are nav/commands).
const STATION_FOR: Record<string, string> = {
  magicpad: "theremin-xy",
  soundpads: "sound-pads",
  myvoice: "record-voicefx",
  beatgrid: "beat-grid",
  voicekeys: "voice-keys",
};
const STATIONS = TOOLS.filter((t) => t.id !== "looper-stage");

const CAR_TYPE_LABELS: Record<CarType, string> = {
  boxcar: "Boxcar", tanker: "Tanker", hopper: "Hopper", flatcar: "Flatcar",
};

let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;

// Transparent hit-area over a painted control.
const hit = (rect: { x: number; y: number; width: number; height: number }, region: NormRegion) => ({
  ...regionStyle(rect, region),
  zIndex: 11,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
});

export const Workshop: FC = () => {
  const { dispatch, engine, sound, surprise } = useApp();
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
      dispatch({
        type: "addClip",
        clip: { id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label },
      });
    }
    dispatch({
      type: "addLayer",
      layer: makeLayer({ id: layerId, clipId, kind, ...(kind === "melody" ? { wave: "triangle" } : {}) }),
    });
    sound.play({ id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label });
  }

  function onToolbar(action: string) {
    switch (action) {
      case "newcar": dispatch({ type: "addCar", id: newCarId() }); break;
      case "yard": dispatch({ type: "setActiveView", view: "yard" }); break;
      case "map": dispatch({ type: "setActiveView", view: "map" }); break;
      case "surprise": surprise(); break;
      default: { const t = STATION_FOR[action]; if (t) setOpenTool(t); }
    }
  }

  const tb = WORKSHOP_LAYOUT_V2.toolbar;
  const ins = WORKSHOP_LAYOUT_V2.instruments;
  const tr = WORKSHOP_LAYOUT_V2.transport;
  const trBtn = (cx: number): NormRegion => ({ x: cx - tr.w / 2, y: tr.y, w: tr.w, h: tr.h });

  return (
    <div ref={wrapRef} style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <PhaserGame scenes={WORKSHOP_SCENES} />

      {/* Painted top toolbar → transparent hit-areas (nav + stations) */}
      {WORKSHOP_TOOLBAR.map((action, i) => (
        <button
          key={i}
          title={action}
          style={hit(rect, rowCell(i, tb.count, tb.c0, tb.c1, tb.y, tb.w, tb.h))}
          onClick={() => onToolbar(action)}
        />
      ))}

      {/* Mixing board over the boxcar interior */}
      <div style={{ ...regionStyle(rect, WORKSHOP_LAYOUT_V2.carInterior), zIndex: 10, overflow: "hidden" }}>
        {layers.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
            textAlign: "center", color: "#e8dcc8",
            font: "400 9px/1.8 var(--font-label, 'Press Start 2P')", letterSpacing: "1px", textShadow: "1px 1px 0 #000",
          }}>
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
        {CAR_TYPES.map((ct) => {
          const active = part.carType === ct;
          return (
            <button
              key={ct}
              title={CAR_TYPE_LABELS[ct]}
              aria-pressed={active}
              onClick={() => dispatch({ type: "setCarType", partId: part.id, carType: ct })}
              style={{
                flex: "0 1 auto", height: "100%",
                background: active ? "rgba(255,209,102,0.3)" : "rgba(0,0,0,0.2)",
                border: active ? "2px solid #ffd166" : "2px solid transparent",
                borderRadius: 4, cursor: "pointer", padding: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <img src={carSpriteUrl[ct]} alt={CAR_TYPE_LABELS[ct]} style={{ maxHeight: "100%", maxWidth: "100%", imageRendering: "pixelated" }} />
            </button>
          );
        })}
      </div>

      {/* Painted ground instruments → add lane */}
      {INSTRUMENTS.map((assetId, i) => (
        <button
          key={assetId}
          title={`Add ${assetId}`}
          style={hit(rect, rowCell(i, ins.count, ins.c0, ins.c1, ins.y, ins.w, ins.h))}
          onClick={() => addInstrument(assetId)}
        />
      ))}

      {/* Painted transport panel → STOP / PLAY / LOOP / SPEED */}
      <button title="Stop" style={hit(rect, trBtn(tr.stop))} onClick={() => engine.stop()} />
      <button title="Play" style={hit(rect, trBtn(tr.play))} onClick={() => engine.playLoop(project)} />
      <button title="Loop" style={hit(rect, trBtn(tr.loop))} onClick={() => engine.playLoop(project)} />
      <button title="Slower" style={hit(rect, trBtn(tr.speedDown))} onClick={() => { const b = Math.max(40, project.tempoBpm - 10); dispatch({ type: "setTempo", bpm: b }); engine.setTempo(b); }} />
      <button title="Faster" style={hit(rect, trBtn(tr.speedUp))} onClick={() => { const b = Math.min(220, project.tempoBpm + 10); dispatch({ type: "setTempo", bpm: b }); engine.setTempo(b); }} />

      {/* Station panel (a tool's machine UI over the scene) */}
      {station && (
        <div role="dialog" aria-label={station.label} style={{
          position: "absolute", inset: "8% 5%", zIndex: 30, display: "flex", flexDirection: "column",
          background: "rgba(18,14,22,0.97)", border: "3px solid #ffd166", borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)", overflow: "hidden",
        }}>
          <header style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "2px solid rgba(255,255,255,0.15)" }}>
            <span style={{ fontSize: 20 }}>{station.icon}</span>
            <span style={{ font: "400 12px/1 var(--font-label, 'Press Start 2P')", color: "#e8dcc8", letterSpacing: "1px" }}>{station.label}</span>
            <button onClick={() => setOpenTool(null)} style={{
              marginLeft: "auto", background: "#2a2118", border: "2px solid #6b5836",
              boxShadow: "inset -2px -2px 0 #1a140d, inset 2px 2px 0 #8a7048", color: "#e8dcc8",
              font: "400 9px/1 var(--font-label, 'Press Start 2P')", padding: "6px 10px", cursor: "pointer",
            }}>✓ Done</button>
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
