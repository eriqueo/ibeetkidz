import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { AppView } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { EventBus } from "../game/EventBus.ts";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";

const SONG_FILE_NAME = "my-train-song.wav";

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

  // SEND flow: the scene owns the plaque + result panel (in-scene, charter-
  // styled); this side owns the audio render and the share/download side
  // effects, pushing each outcome back into the scene so the kid always gets
  // an explicit "Sent!"/"Saved!" — a bare download is invisible on iOS.
  useEffect(() => {
    let rendering = false;
    let file: File | null = null;
    const setUi = (s: Parameters<TrackScene["setSendState"]>[0]): void =>
      sceneRef.current?.setSendState(s);

    const onSend = async (): Promise<void> => {
      if (rendering) return;
      rendering = true;
      setUi({ kind: "recording" });
      try {
        const blob = await engine.renderSong(projectRef.current);
        file = new File([blob], SONG_FILE_NAME, { type: "audio/wav" });
        const canShare =
          typeof navigator.share === "function" &&
          navigator.canShare?.({ files: [file] }) === true;
        setUi({ kind: "ready", canShare });
      } catch (err) {
        console.error("send-song render failed", err);
        setUi({ kind: "error" });
      } finally {
        rendering = false;
      }
    };
    // Called synchronously from the canvas tap (EventBus emits are sync), so
    // the OS share sheet still sees the user gesture.
    const onShare = (): void => {
      if (!file) return;
      navigator
        .share({ files: [file], title: "My train song" })
        .then(() => setUi({ kind: "shared" }))
        .catch(() => {
          // The kid closed the share sheet — not an error, stay on the panel.
        });
    };
    const onSave = (): void => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = SONG_FILE_NAME;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setUi({ kind: "saved" });
    };
    const onClose = (): void => setUi({ kind: "idle" });

    const onSendVoid = (): void => void onSend();
    EventBus.on("track-send", onSendVoid);
    EventBus.on("track-send-share", onShare);
    EventBus.on("track-send-save", onSave);
    EventBus.on("track-send-close", onClose);
    return () => {
      EventBus.off("track-send", onSendVoid);
      EventBus.off("track-send-share", onShare);
      EventBus.off("track-send-save", onSave);
      EventBus.off("track-send-close", onClose);
    };
  }, [engine]);

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
          chrome, muting is tap-the-car-to-tarp-it, and the SEND flow (plaque +
          result panel) is in-scene too — all over the EventBus. (The old HTML
          tarp strip drifted into the letterbox on non-16:9 screens — HTML
          overlays can't track the FIT-scaled canvas.) */}
    </div>
  );
};
