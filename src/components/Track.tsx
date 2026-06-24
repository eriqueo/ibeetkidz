import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { PixelButton } from "./PixelButton.tsx";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";

const TRACK_SCENES = [TrackScene];

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const sceneRef = useRef<TrackScene | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

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

  useEffect(() => { sceneRef.current?.setCars(cars); }, [cars]);
  useEffect(() => { sceneRef.current?.setDirection(dir); }, [dir]);

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

  const setTempo = (b: number) => { const bpm = Math.max(40, Math.min(220, b)); dispatch({ type: "setTempo", bpm }); engine.setTempo(bpm); };

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <PhaserGame scenes={TRACK_SCENES} onSceneReady={handleSceneReady} />
      </div>

      {/* Top nav */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="◀" label="Yard" onClick={() => dispatch({ type: "setActiveView", view: "yard" })} />
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="🗺️" label="Map" onClick={() => dispatch({ type: "setActiveView", view: "map" })} />
      </div>

      {/* Tarp strip — one chip per car; tap to cover/uncover (mute) live */}
      {cars.length > 0 && (
        <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", zIndex: 19, display: "flex", gap: 4, maxWidth: "90%", flexWrap: "wrap", justifyContent: "center" }}>
          {liveTrain(project).map((c, i) => {
            const part = project.parts.find((p) => p.id === c.partId)!;
            return (
              <button
                key={c.instanceId}
                className="pixel-tap"
                title={c.muted ? "Uncover (unmute)" : "Cover with a tarp (mute)"}
                onClick={() => dispatch({ type: "muteCar", instanceId: c.instanceId, muted: !c.muted })}
                style={{ minWidth: 30, height: 28, background: c.muted ? "rgba(40,40,40,0.9)" : part.color, border: "2px solid rgba(0,0,0,0.55)", borderRadius: 3, color: "#fff", font: "400 8px/1 var(--font-label, 'Press Start 2P')", cursor: "pointer", opacity: c.muted ? 0.6 : 1, textShadow: "1px 1px 0 #000" }}
              >
                {c.muted ? "🛡️" : i + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom transport bar */}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 6, alignItems: "center" }}>
        <PixelButton variant="primary" emoji="▶" label="Ride" onClick={() => engine.playRide(project)} />
        <PixelButton emoji="■" label="Stop" onClick={() => engine.stop()} />
        <PixelButton emoji="🐢" label="Slow" onClick={() => setTempo(project.tempoBpm - 10)} />
        <span style={{ font: "400 9px/1 var(--font-label, 'Press Start 2P')", color: "#e8dcc8", textShadow: "1px 1px 0 #000", minWidth: 34, textAlign: "center" }}>{project.tempoBpm}</span>
        <PixelButton emoji="🐇" label="Fast" onClick={() => setTempo(project.tempoBpm + 10)} />
        <PixelButton emoji={dir === 1 ? "⟳" : "⟲"} label={dir === 1 ? "Fwd" : "Rev"} onClick={() => setDir((d) => (d === 1 ? -1 : 1))} />
      </div>
    </div>
  );
};
