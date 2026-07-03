import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { AppView } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserGame } from "./PhaserGame.tsx";
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
    sceneRef.current.setTempo(projectRef.current.tempoBpm);
  }, []);

  useEffect(() => { sceneRef.current?.setCars(cars); }, [cars]);
  useEffect(() => { sceneRef.current?.setTempo(project.tempoBpm); }, [project.tempoBpm]);

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
    const onNav = (view: AppView) => dispatch({ type: "setActiveView", view });
    // Tap a car on the oval → toggle its tarp (mute). The tarp visual follows
    // from the state change (setCars rebuild).
    const onMuteToggle = (instanceId: string) => {
      const slot = liveTrain(projectRef.current).find((c) => c.instanceId === instanceId);
      if (slot) dispatch({ type: "muteCar", instanceId, muted: !slot.muted });
    };
    EventBus.on("transport-play", onPlay);
    EventBus.on("transport-stop", onStop);
    EventBus.on("tempo-changed", onTempo);
    EventBus.on("track-nav", onNav);
    EventBus.on("track-car-mute-toggled", onMuteToggle);
    return () => {
      EventBus.off("transport-play", onPlay);
      EventBus.off("transport-stop", onStop);
      EventBus.off("tempo-changed", onTempo);
      EventBus.off("track-nav", onNav);
      EventBus.off("track-car-mute-toggled", onMuteToggle);
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
          // Read the in-bar position at high resolution — getTransportStep(n)
          // FLOORS to n subdivisions, so reading at STEP_COUNT quantized the
          // ride to 16 visible hops per bar (the jerky train).
          const RES = 4096;
          const sub = sound.getTransportStep(RES);
          const frac = sub >= 0 ? sub / RES : 0;
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

      {/* The whole view lives inside TrackScene now: nav + transport are Tiled
          chrome, and muting is tap-the-car-to-tarp-it, all over the EventBus.
          (The old HTML tarp strip drifted into the letterbox on non-16:9
          screens — HTML overlays can't track the FIT-scaled canvas.) */}
    </div>
  );
};
