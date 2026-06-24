import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT, MIN_BPM, MAX_BPM } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";
import { SCENE_ASPECT, TRACK_LAYOUT_V2 } from "../game/scene-layout.ts";
import { useContainedRect, regionStyle, type NormRegion } from "../app/use-overlay-rect.ts";

const TRACK_SCENES = [TrackScene];

// A transparent hit-area placed over a painted control.
const hit = (rect: { x: number; y: number; width: number; height: number }, region: NormRegion) => ({
  ...regionStyle(rect, region),
  zIndex: 12,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
});

const C = TRACK_LAYOUT_V2.controls;
const btn = (cx: number): NormRegion => ({ x: cx - C.w / 2, y: C.y, w: C.w, h: C.h });

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const sceneRef = useRef<TrackScene | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(wrapRef, SCENE_ASPECT);

  const cars = useMemo<TrackCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return { id: c.instanceId, color: part.color, carType: part.carType, muted: c.muted };
    });
  }, [project]);

  const carsRef = useRef(cars);
  carsRef.current = cars;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as TrackScene;
    sceneRef.current.setCars(carsRef.current);
  }, []);

  useEffect(() => {
    sceneRef.current?.setCars(cars);
  }, [cars]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const scene = sceneRef.current;
      if (scene) {
        const riding = engine.isPlaying && engine.playMode === "ride";
        scene.setMoving(riding);
        if (riding) {
          const step = sound.getTransportStep(STEP_COUNT);
          const frac = step >= 0 ? step / STEP_COUNT : 0;
          const totalBars = carsRef.current.length;
          if (totalBars > 0) {
            const bar = engine.getTransportBar?.() ?? 0;
            const songBar = ((bar % totalBars) + totalBars) % totalBars;
            scene.setProgress((songBar + frac) / totalBars);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, sound]);

  const nudgeTempo = (delta: number): void => {
    const bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, project.tempoBpm + delta));
    dispatch({ type: "setTempo", bpm });
    engine.setTempo(bpm);
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}
    >
      <PhaserGame scenes={TRACK_SCENES} onSceneReady={handleSceneReady} />

      {/* Painted transport panel → transparent hit-areas */}
      <button title="Slower" style={hit(rect, btn(C.rewind))} onClick={() => nudgeTempo(-15)} />
      <button title="Pause" style={hit(rect, btn(C.pause))} onClick={() => engine.stop()} />
      <button title="Stop" style={hit(rect, btn(C.stop))} onClick={() => engine.stop()} />
      <button title="Ride" style={hit(rect, btn(C.play))} onClick={() => engine.playRide(project)} />
      <button title="Faster" style={hit(rect, btn(C.ff))} onClick={() => nudgeTempo(15)} />

      {/* In-canvas pixel nav (the track art has no painted exit) */}
      <PixelNav onClick={() => dispatch({ type: "setActiveView", view: "yard" })} label="◀ Yard" left />
      <PixelNav onClick={() => dispatch({ type: "setActiveView", view: "map" })} label="Map" />
    </div>
  );
};

// A tiny retro-styled nav chip for scenes whose art lacks a painted exit. Sits
// INSIDE the canvas, dark inset + pixel font — not a modern HTML button.
const PixelNav: FC<{ onClick: () => void; label: string; left?: boolean }> = ({ onClick, label, left }) => (
  <button
    onClick={onClick}
    style={{
      position: "absolute",
      top: 8,
      ...(left ? { left: 8 } : { right: 8 }),
      zIndex: 20,
      background: "#2a2118",
      border: "2px solid #6b5836",
      boxShadow: "inset -2px -2px 0 #1a140d, inset 2px 2px 0 #8a7048",
      color: "#e8dcc8",
      font: "400 8px/1 var(--font-label, 'Press Start 2P')",
      letterSpacing: "1px",
      padding: "6px 8px",
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);
