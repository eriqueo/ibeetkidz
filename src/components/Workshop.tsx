import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer } from "../core/project-state.ts";
import { STEP_COUNT, type CarType, type LaneKind } from "../core/types.ts";
import { TOOLS, LoopSelectionProvider, laneColor } from "../machines/tools.tsx";
import { BUILTIN_SOUNDS } from "../core/sound-catalog.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { PixelButton } from "./PixelButton.tsx";
import { EventBus } from "../game/EventBus.ts";
import {
  WorkshopScene,
  type WorkshopModel,
} from "../game/scenes/WorkshopScene.ts";

const WORKSHOP_SCENES = [WorkshopScene];

// Creative-tool stations (the satellite machines) — still React for now; they
// open as panels over the Phaser scene.
const STATION_LIST = [
  { id: "record-voicefx", label: "Voice", emoji: "🎤" },
  { id: "voice-keys", label: "Keys", emoji: "🎙️" },
  { id: "sound-pads", label: "Pads", emoji: "🥁" },
  { id: "beat-grid", label: "Beat", emoji: "🎛️" },
  { id: "theremin-xy", label: "Magic", emoji: "✨" },
];
const STATIONS = TOOLS.filter((t) => t.id !== "looper-stage");

let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;

export const Workshop: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const part = activePart(project);
  const layers = activeLayers(project);

  const sceneRef = useRef<WorkshopScene | null>(null);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const station = STATIONS.find((t) => t.id === openTool);

  const projectRef = useRef(project);
  projectRef.current = project;

  // The derived sequencer model the scene renders — one lane per active layer,
  // its cells from the step/note model, its colour from the shared laneColor().
  const model = useMemo<WorkshopModel>(() => ({
    lanes: layers.map((layer) => {
      const clip = project.clips[layer.clipId];
      const cells = Array.from({ length: STEP_COUNT }, (_, i) =>
        layer.kind === "drum" ? layer.steps[i] != null : (layer.notes[i]?.length ?? 0) > 0,
      );
      let label = "🎵";
      if (clip?.source.kind === "builtin") {
        const assetId = clip.source.assetId;
        label = BUILTIN_SOUNDS.find((s) => s.assetId === assetId)?.emoji ?? "🎵";
      } else if (clip?.source.kind === "recording") {
        label = "🎤";
      } else if (layer.kind === "drum") {
        label = "🥁";
      }
      return { id: layer.id, label, color: laneColor(layer.kind, clip), cells };
    }),
    carType: part.carType,
    selectedLayerId: selectedLayer,
  }), [layers, project.clips, part.carType, selectedLayer]);

  const modelRef = useRef(model);
  modelRef.current = model;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as WorkshopScene;
    sceneRef.current.setModel(modelRef.current);
  }, []);

  useEffect(() => { sceneRef.current?.setModel(model); }, [model]);

  // Sweep the playhead from the live transport — one getTransportStep read/frame.
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      sceneRef.current?.setPlayhead(sound.getTransportStep(STEP_COUNT));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sound]);

  // Phaser (WorkshopScene) → state/audio, across the EventBus.
  useEffect(() => {
    const onCell = ({ layerId, stepIndex }: { layerId: string; stepIndex: number; on: boolean }): void => {
      const layer = activeLayers(projectRef.current).find((l) => l.id === layerId);
      if (!layer) return;
      // toggleStep flips a drum hit; toggleNote flips a melody cell (row 0 here).
      if (layer.kind === "drum") dispatch({ type: "toggleStep", layerId, index: stepIndex });
      else dispatch({ type: "toggleNote", layerId, index: stepIndex, row: 0 });
    };
    const onInstrument = (kind: LaneKind, assetId: string): void => {
      const catalog = BUILTIN_SOUNDS.find((s) => s.assetId === assetId);
      if (!catalog) return;
      const clipId = `workshop-${assetId}-${Date.now()}`;
      const layerId = `layer-${assetId}-${Date.now()}`;
      if (!projectRef.current.clips[clipId]) {
        dispatch({ type: "addClip", clip: { id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label } });
      }
      dispatch({ type: "addLayer", layer: makeLayer({ id: layerId, clipId, kind, ...(kind === "melody" ? { wave: "triangle" } : {}) }) });
      sound.play({ id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label });
    };
    const onCarType = (carType: CarType): void =>
      dispatch({ type: "setCarType", partId: activePart(projectRef.current).id, carType });
    const onSelect = (layerId: string): void => setSelectedLayer(layerId);
    const onPlay = (): void => engine.playLoop(projectRef.current);
    const onStop = (): void => engine.stop();
    const onTempo = (delta: number): void => {
      const bpm = Math.max(40, Math.min(220, projectRef.current.tempoBpm + delta));
      dispatch({ type: "setTempo", bpm });
      engine.setTempo(bpm);
    };

    EventBus.on("workshop-cell-toggled", onCell);
    EventBus.on("workshop-instrument-added", onInstrument);
    EventBus.on("workshop-car-type-changed", onCarType);
    EventBus.on("workshop-layer-selected", onSelect);
    EventBus.on("transport-play", onPlay);
    EventBus.on("transport-stop", onStop);
    EventBus.on("tempo-changed", onTempo);
    return () => {
      EventBus.off("workshop-cell-toggled", onCell);
      EventBus.off("workshop-instrument-added", onInstrument);
      EventBus.off("workshop-car-type-changed", onCarType);
      EventBus.off("workshop-layer-selected", onSelect);
      EventBus.off("transport-play", onPlay);
      EventBus.off("transport-stop", onStop);
      EventBus.off("tempo-changed", onTempo);
    };
  }, [dispatch, engine, sound]);

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      {/* The sequencer (grid, shelf, car-type picker, transport) lives in Phaser,
          so the canvas takes pointer events; nav + stations dock sit on top. */}
      <PhaserGame scenes={WORKSHOP_SCENES} onSceneReady={handleSceneReady} style={{ pointerEvents: "auto" }} />

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
