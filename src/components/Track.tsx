import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { STEP_COUNT } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { PixelButton } from "./PixelButton.tsx";
import { EventBus } from "../game/EventBus.ts";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";

const TRACK_SCENES = [TrackScene];

export const Track: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const sceneRef = useRef<TrackScene | null>(null);

  const cars = useMemo<TrackCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return { id: c.instanceId, color: part.color, carType: part.carType, muted: c.muted };
    });
  }, [project]);

  const carsRef = useRef(cars);
  carsRef.current = cars;

  // Latest project for the EventBus listeners (registered once, no stale closure).
  const projectRef = useRef(project);
  projectRef.current = project;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as TrackScene;
    sceneRef.current.setCars(carsRef.current);
  }, []);

  useEffect(() => { sceneRef.current?.setCars(cars); }, [cars]);

  // Phaser transport buttons → audio engine / state, across the EventBus.
  useEffect(() => {
    const setTempo = (b: number) => {
      const bpm = Math.max(40, Math.min(220, b));
      dispatch({ type: "setTempo", bpm });
      engine.setTempo(bpm);
    };
    const onPlay = () => engine.playRide(projectRef.current);
    const onStop = () => engine.stop();
    const onTempo = (delta: number) => setTempo(projectRef.current.tempoBpm + delta);
    EventBus.on("transport-play", onPlay);
    EventBus.on("transport-stop", onStop);
    EventBus.on("tempo-changed", onTempo);
    return () => {
      EventBus.off("transport-play", onPlay);
      EventBus.off("transport-stop", onStop);
      EventBus.off("tempo-changed", onTempo);
    };
  }, [dispatch, engine]);

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

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {/* Transport buttons live in TrackScene now, so the canvas must take
            pointer events (the global default is none for React-overlay views). */}
        <PhaserGame scenes={TRACK_SCENES} onSceneReady={handleSceneReady} style={{ pointerEvents: "auto" }} />
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

      {/* Transport controls (Ride / Stop / Speed) now live inside TrackScene,
          driven through the EventBus — no HTML overlays here. */}
    </div>
  );
};
