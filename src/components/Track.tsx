import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT } from "../core/types.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";

// Stable scene reference — Phaser instantiates the class; we grab the live
// instance back via onSceneReady. Must not be rebuilt per render.
const TRACK_SCENES = [TrackScene];

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const sceneRef = useRef<TrackScene | null>(null);

  // One scene car per live train slot (colour + name from its part).
  const cars = useMemo<TrackCar[]>(() => {
    const ids = new Set(project.parts.map((p) => p.id));
    return project.train
      .filter((c) => ids.has(c.partId))
      .map((c) => {
        const part = project.parts.find((p) => p.id === c.partId)!;
        return { id: c.instanceId, color: part.color, name: part.name };
      });
  }, [project.train, project.parts]);

  // Keep the latest cars reachable from the (stable) onSceneReady callback.
  const carsRef = useRef(cars);
  carsRef.current = cars;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as TrackScene;
    sceneRef.current.setCars(carsRef.current);
  }, []);

  // Push car changes to the scene whenever the arrangement changes.
  useEffect(() => {
    sceneRef.current?.setCars(cars);
  }, [cars]);

  // Drive the train: read the transport once per frame and feed progress 0..1.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const scene = sceneRef.current;
      if (scene && engine.isPlaying && engine.playMode === "ride") {
        const step = sound.getTransportStep(STEP_COUNT);
        const frac = step >= 0 ? step / STEP_COUNT : 0;
        const totalBars = cars.length;
        if (totalBars > 0) {
          const bar = (engine as { getTransportBar?: () => number }).getTransportBar?.() ?? 0;
          const songBar = ((bar % totalBars) + totalBars) % totalBars;
          scene.setProgress((songBar + frac) / totalBars);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, sound, cars]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "#201c26",
      overflow: "hidden",
    }}>
      {/* Brand header */}
      <header className="brand" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          className="t-btn"
          style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text" style={{ fontSize: "1rem" }}>Springvale Loop</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="t-btn"
            style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
          >
            📦 Yard
          </button>
        </div>
      </header>

      {/* Phaser playfield — track + riding train. The transport bar overlays it. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <PhaserGame scenes={TRACK_SCENES} onSceneReady={handleSceneReady} />
      </div>

      {/* Transport bar (React overlay) */}
      <footer className="playbar" style={{ flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div className="pb-group">
          <button className="pb-btn pb-play" onClick={() => engine.playRide(project)}>
            <span className="pb-icon">▶</span>
            <span className="pb-label">Ride Train</span>
          </button>
          <button className="pb-btn" onClick={() => engine.stop()}>
            <span className="pb-icon">■</span>
            <span className="pb-label">Stop</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
