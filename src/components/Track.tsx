import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT, MIN_BPM, MAX_BPM } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";

// Stable scene reference — Phaser instantiates the class; we grab the live
// instance back via onSceneReady. Must not be rebuilt per render.
const TRACK_SCENES = [TrackScene];

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const sceneRef = useRef<TrackScene | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

  // One scene car per live train slot (sprite + colour + tarp from its part).
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
    sceneRef.current?.setDirection(dir);
  }, [dir]);

  // Drive the train: read the transport once per frame and feed progress 0..1.
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

  const changeTempo = (bpm: number): void => {
    dispatch({ type: "setTempo", bpm });
    engine.setTempo(bpm);
  };

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
          onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
        >
          ◀ Yard
        </button>
        <span className="brand-text" style={{ fontSize: "1rem" }}>Springvale Loop</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="t-btn"
            style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "map" })}
          >
            🗺️ Map
          </button>
        </div>
      </header>

      {/* Phaser playfield — oval + riding train. */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <PhaserGame scenes={TRACK_SCENES} onSceneReady={handleSceneReady} />
      </div>

      {/* Tarp strip — one chip per car; tap to cover/uncover (mute) live. */}
      {cars.length > 0 && (
        <div style={{
          flexShrink: 0,
          display: "flex",
          gap: 4,
          padding: "4px 8px",
          overflowX: "auto",
          background: "rgba(0,0,0,0.35)",
          zIndex: 10,
        }}>
          {liveTrain(project).map((c, i) => {
            const part = project.parts.find((p) => p.id === c.partId)!;
            return (
              <button
                key={c.instanceId}
                title={c.muted ? "Uncover (unmute)" : "Cover with a tarp (mute)"}
                onClick={() => dispatch({ type: "muteCar", instanceId: c.instanceId, muted: !c.muted })}
                style={{
                  flex: "0 0 auto",
                  minWidth: 34,
                  height: 30,
                  background: c.muted ? "rgba(40,40,40,0.9)" : part.color,
                  border: "2px solid rgba(0,0,0,0.5)",
                  borderRadius: 4,
                  color: "#fff",
                  font: "400 8px/1 var(--font-label, 'Press Start 2P')",
                  cursor: "pointer",
                  opacity: c.muted ? 0.6 : 1,
                }}
              >
                {c.muted ? "🛡️" : i + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Transport bar */}
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

        <label className="tempo">
          <span className="pb-label">🐢 Speed 🐇</span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={project.tempoBpm}
            onChange={(e) => changeTempo(Number(e.target.value))}
          />
        </label>

        <div className="pb-group">
          <button
            className="pb-btn"
            title="Reverse direction"
            aria-pressed={dir === -1}
            onClick={() => setDir((d) => (d === 1 ? -1 : 1))}
          >
            <span className="pb-icon">{dir === 1 ? "⟳" : "⟲"}</span>
            <span className="pb-label">{dir === 1 ? "Forward" : "Reverse"}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
