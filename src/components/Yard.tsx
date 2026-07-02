import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { PhaserGame } from "./PhaserGame.tsx";
import { YardScene, type YardCar, type YardTrainCar } from "../game/scenes/YardScene.ts";
import { liveTrain } from "../core/project-state.ts";
import { AppView } from "../core/types.ts";
import { EventBus } from "../game/EventBus.ts";

const YARD_SCENES = [YardScene];

let instSeq = 0;
const newInstanceId = (): string => `inst-${Date.now().toString(36)}-${instSeq++}`;

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const sceneRef = useRef<YardScene | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const cars = useMemo<YardCar[]>(
    () => project.parts.map((p) => ({ id: p.id, color: p.color, name: p.name, carType: p.carType })),
    [project.parts],
  );

  const train = useMemo<YardTrainCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return { instanceId: c.instanceId, partId: c.partId, color: part.color, carType: part.carType, muted: c.muted };
    });
  }, [project]);

  const carsRef = useRef(cars); carsRef.current = cars;
  const trainRef = useRef(train); trainRef.current = train;
  const projectRef = useRef(project); projectRef.current = project;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as YardScene;
    sceneRef.current.setCars(carsRef.current, trainRef.current);
  }, []);

  useEffect(() => { sceneRef.current?.setCars(cars, train); }, [cars, train]);

  // Phaser (YardScene) + the data-driven Tiled hits → state, across the EventBus.
  // The crane/departure ANIMATIONS live in YardScene: the panel "couple"/"send"
  // hits emit `yard-add`/`yard-depart` intents (handled in the scene), whose tween
  // onComplete emits `yard-add-to-train`/`yard-send-to-track` — so the dispatch
  // here follows the animation. Selection-aware actions (edit/delete) target the
  // ACTIVE car, which a palette tap (`yard-car-selected`) makes current.
  useEffect(() => {
    const onSelect = (partId: string) => dispatch({ type: "setActivePart", partId });
    const onAdd = (partId: string) =>
      dispatch({ type: "addToTrain", instanceId: newInstanceId(), partId });
    const onSend = () => dispatch({ type: "setActiveView", view: "track" });
    const onRemoveFromTrain = () => {
      const last = liveTrain(projectRef.current).at(-1);
      if (last) dispatch({ type: "removeFromTrain", instanceId: last.instanceId });
    };
    const onEditCar = () => dispatch({ type: "setActiveView", view: "workshop" });
    const onRemoveCar = () =>
      dispatch({ type: "removeCar", partId: projectRef.current.activePartId });
    // The TRACK plaque needs an assembled train (same guard as the Map's hit).
    const onNav = (view: AppView) => {
      if (view === "track" && liveTrain(projectRef.current).length === 0) {
        setToast("Build a train first! HITCH some cars.");
        window.setTimeout(() => setToast(null), 2200);
        return;
      }
      dispatch({ type: "setActiveView", view });
    };
    EventBus.on("yard-car-selected", onSelect);
    EventBus.on("yard-add-to-train", onAdd);
    EventBus.on("yard-send-to-track", onSend);
    EventBus.on("yard-remove-from-train", onRemoveFromTrain);
    EventBus.on("yard-edit-car", onEditCar);
    EventBus.on("yard-remove-car", onRemoveCar);
    EventBus.on("yard-nav", onNav);
    return () => {
      EventBus.off("yard-car-selected", onSelect);
      EventBus.off("yard-add-to-train", onAdd);
      EventBus.off("yard-send-to-track", onSend);
      EventBus.off("yard-remove-from-train", onRemoveFromTrain);
      EventBus.off("yard-edit-car", onEditCar);
      EventBus.off("yard-remove-car", onRemoveCar);
      EventBus.off("yard-nav", onNav);
    };
  }, [dispatch]);

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {/* Phaser owns selection, the crane/Send buttons, AND the nav chrome now,
            so the canvas takes pointer events (global default is none for overlays). */}
        <PhaserGame scenes={YARD_SCENES} onSceneReady={handleSceneReady} style={{ pointerEvents: "auto" }} />
      </div>

      {/* "Build a train first" toast (same treatment as the Map's Track guard) */}
      {toast && (
        <div style={{
          position: "absolute",
          left: "50%",
          bottom: "8%",
          transform: "translateX(-50%)",
          zIndex: 30,
          padding: "10px 16px",
          background: "rgba(0,0,0,0.82)",
          border: "2px solid #ffd166",
          borderRadius: 8,
          color: "#ffd166",
          font: "400 10px/1.6 var(--font-label, 'Press Start 2P')",
          letterSpacing: "1px",
          textAlign: "center",
          pointerEvents: "none",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};
