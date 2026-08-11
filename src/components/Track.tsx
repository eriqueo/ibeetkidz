import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { AppView } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserScene, VIEW_OVERLAY } from "./PhaserScene.tsx";
import { EventBus } from "../game/EventBus.ts";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";
import { TrackV3Scene } from "../game/scenes/TrackV3Scene.ts";
import { carCargo, carIdentities, carLiveries } from "../core/car-identity.ts";
import { isTerrainKind } from "../core/terrain.ts";

const SONG_FILE_NAME = "my-train-song.wav";

/** `?v3` swaps the oval for the side-scroller greybox. A flag, not a
 *  replacement: the oval stays the default until v3 is demonstrably better,
 *  and both are driven by the same transport and the same EventBus actions. */
function wantsV3(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("v3");
}

export const Track: FC = () => {
  const { dispatch, engine, sound, getProject } = useApp();
  const project = useProject();
  const v3 = useMemo(wantsV3, []);
  const sceneRef = useRef<TrackScene | null>(null);
  const v3Ref = useRef<TrackV3Scene | null>(null);

  // Same derived identity the Yard shows, so a car a kid picked out in the
  // sidings is recognisably the same car riding the oval.
  const liveries = useMemo(() => carLiveries(project.parts), [project.parts]);

  const cars = useMemo<TrackCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return {
        id: c.instanceId,
        livery: liveries.get(part.id) ?? 0,
        cargo: carCargo(part, project.clips),
        carType: part.carType,
        muted: c.muted,
      };
    });
  }, [project, liveries]);

  const carsRef = useRef(cars);
  carsRef.current = cars;

  // The side-scroller takes the SAME identity the Workshop LCD and the Yard
  // sidings show — one producer, so "car 3" is car 3 everywhere.
  const v3Cars = useMemo(() => {
    const ids = carIdentities(project.parts, project.clips);
    return liveTrain(project).map((c) => {
      const id = ids.get(c.partId);
      return {
        id: c.instanceId,
        number: id?.number ?? 1,
        livery: id?.liveryIndex ?? 0,
        carType: id?.carType ?? "boxcar",
        muted: c.muted,
      };
    });
  }, [project]);
  const v3CarsRef = useRef(v3Cars);
  v3CarsRef.current = v3Cars;

  // Latest project for the EventBus listeners (registered once, no stale closure).
  const projectRef = useRef(project);
  projectRef.current = project;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    if (scene instanceof TrackV3Scene) {
      v3Ref.current = scene;
      scene.setCars(v3CarsRef.current);
      return;
    }
    sceneRef.current = scene as TrackScene;
    sceneRef.current.setCars(carsRef.current);
    sceneRef.current.setTempo(projectRef.current.tempoBpm);
    // "See the sound": hand the scene the master-output tap so the jumbotron in
    // the middle of the oval can draw what actually reached the speakers. React
    // owns the ports, so the analyser is PUSHED in — the scene never reaches
    // for audio itself. `engine.getAnalyser()` is the same node `getAudioDiag`
    // reads, which is what keeps "the visualizer never lies" literally true.
    sceneRef.current.attachVisualizer(engine.getAnalyser(), getProject);
  }, [engine, getProject]);

  useEffect(() => {
    sceneRef.current?.setCars(cars);
    v3Ref.current?.setCars(v3CarsRef.current);
  }, [cars, v3Cars]);
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
    // Terrain: a physical thing the train rides through, heard as a change to
    // the song. The bar it lands on is resolved from the TRANSPORT inside the
    // adapter — never from where the train happens to be drawn (charter A4).
    const onTerrain = (kind: string) => {
      if (!isTerrainKind(kind)) return;
      const ride = engine.applyTerrain(kind, projectRef.current);
      sceneRef.current?.showTerrain?.(kind);
      // The bar span comes back FROM the transport, so the side-scroller draws
      // the hill exactly where the audio will make it happen — it never works
      // the bar out from where the train is on screen (charter A4).
      if (ride) v3Ref.current?.setTerrainRide(ride);
    };
    EventBus.on("transport-play", onPlay);
    EventBus.on("transport-stop", onStop);
    EventBus.on("tempo-changed", onTempo);
    EventBus.on("track-nav", onNav);
    EventBus.on("track-car-mute-toggled", onMuteToggle);
    EventBus.on("terrain-picked", onTerrain);
    return () => {
      EventBus.off("transport-play", onPlay);
      EventBus.off("transport-stop", onStop);
      EventBus.off("tempo-changed", onTempo);
      EventBus.off("track-nav", onNav);
      EventBus.off("track-car-mute-toggled", onMuteToggle);
      EventBus.off("terrain-picked", onTerrain);
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
      const v3scene = v3Ref.current;
      if (v3scene) {
        const riding = engine.isPlaying && engine.playMode === "ride";
        v3scene.setMoving(riding);
        if (riding) {
          const RES = 4096;
          const sub = sound.getTransportStep(RES);
          const frac = sub >= 0 ? sub / RES : 0;
          // ABSOLUTE bars, not a normalized lap: the side-scroller lays the
          // world out in bar order and never wraps its own position, so a
          // terrain scheduled at bar 37 is drawn at bar 37.
          v3scene.setSongPosition((engine.getTransportBar?.() ?? 0) + frac);
        }
      }
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
    <div style={VIEW_OVERLAY}>
      <PhaserScene
        scene={v3 ? TrackV3Scene : TrackScene}
        onSceneReady={handleSceneReady}
      />

      {/* The whole view lives inside TrackScene now: nav + transport are Tiled
          chrome, muting is tap-the-car-to-tarp-it, and the SEND flow (plaque +
          result panel) is in-scene too — all over the EventBus. (The old HTML
          tarp strip drifted into the letterbox on non-16:9 screens — HTML
          overlays can't track the FIT-scaled canvas.) */}
    </div>
  );
};
