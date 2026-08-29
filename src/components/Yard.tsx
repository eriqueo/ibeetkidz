import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { PhaserScene, VIEW_OVERLAY } from "./PhaserScene.tsx";
import { YardScene, type YardCar, type YardTrainCar } from "../game/scenes/YardScene.ts";
import { liveTrain } from "../core/project-state.ts";
import { carCargo, carLiveries } from "../core/car-identity.ts";
import { AppView } from "../core/types.ts";
import { EventBus } from "../game/EventBus.ts";

let instSeq = 0;
const newInstanceId = (): string => `inst-${Date.now().toString(36)}-${instSeq++}`;

export const Yard: FC = () => {
  const { dispatch, engine } = useApp();
  const project = useProject();
  const sceneRef = useRef<YardScene | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Identity is DERIVED, never stored: which livery a car wears comes from its
  // position in the colour table, and what it carries is folded out of its own
  // lanes on every render. Nothing to migrate, and a car that gains a drum lane
  // is visibly carrying drums the moment the kid comes back to the Yard.
  const liveries = useMemo(() => carLiveries(project.parts), [project.parts]);

  const cars = useMemo<YardCar[]>(
    () =>
      project.parts.map((p) => ({
        id: p.id,
        livery: liveries.get(p.id) ?? 0,
        cargo: carCargo(p, project.clips),
        name: p.name,
        carType: p.carType,
      })),
    [project.parts, project.clips, liveries],
  );

  const train = useMemo<YardTrainCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return {
        instanceId: c.instanceId,
        partId: c.partId,
        livery: liveries.get(part.id) ?? 0,
        cargo: carCargo(part, project.clips),
        name: part.name,
        carType: part.carType,
        muted: c.muted,
      };
    });
  }, [project, liveries]);

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
    // Tapping a car in the palette also PLAYS it. Identity by sight answers
    // "where is the one I want?"; hearing it answers "is this the one?" — the
    // confirmation gesture, and it is the same `playCarLoop` the Workshop's
    // LOOP button already uses. `playCarLoop` no-ops until the AudioContext has
    // been started by the boot gesture, so this touches nothing before then.
    const onSelect = (partId: string) => {
      dispatch({ type: "setActivePart", partId });
      void engine.playCarLoop(partId, projectRef.current).catch((err: unknown) => {
        console.warn("audio playback failed", err);
      });
    };
    const onAdd = (partId: string) =>
      dispatch({ type: "addToTrain", instanceId: newInstanceId(), partId });
    const onSend = () => dispatch({ type: "setActiveView", view: "track" });
    const onRemoveFromTrain = () => {
      const last = liveTrain(projectRef.current).at(-1);
      if (last) dispatch({ type: "removeFromTrain", instanceId: last.instanceId });
    };
    // A car was dragged to a new place on the assembly line. The scene sends
    // the whole new order and the reducer takes the whole new order, so there
    // is nothing here to translate — which is why `reorderTrain` needed no
    // change to gain its first caller.
    const onReorder = (instanceIds: readonly string[]) =>
      dispatch({ type: "reorderTrain", instanceIds });
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
    EventBus.on("yard-reorder-train", onReorder);
    EventBus.on("yard-edit-car", onEditCar);
    EventBus.on("yard-remove-car", onRemoveCar);
    EventBus.on("yard-nav", onNav);
    return () => {
      EventBus.off("yard-car-selected", onSelect);
      EventBus.off("yard-add-to-train", onAdd);
      EventBus.off("yard-send-to-track", onSend);
      EventBus.off("yard-remove-from-train", onRemoveFromTrain);
      EventBus.off("yard-reorder-train", onReorder);
      EventBus.off("yard-edit-car", onEditCar);
      EventBus.off("yard-remove-car", onRemoveCar);
      EventBus.off("yard-nav", onNav);
    };
  }, [dispatch, engine]);

  return (
    <div style={VIEW_OVERLAY}>
      {/* Phaser owns selection, the crane/Send buttons AND the nav chrome, so
          everything here is just the toast floating over the shared canvas. */}
      <PhaserScene scene={YardScene} onSceneReady={handleSceneReady} />

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
