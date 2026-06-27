import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { PhaserGame } from "./PhaserGame.tsx";
import { PixelButton } from "./PixelButton.tsx";
import { YardScene, type YardCar, type YardTrainCar } from "../game/scenes/YardScene.ts";
import { liveTrain } from "../core/project-state.ts";
import { EventBus } from "../game/EventBus.ts";

const YARD_SCENES = [YardScene];

let instSeq = 0;
const newInstanceId = (): string => `inst-${Date.now().toString(36)}-${instSeq++}`;

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const sceneRef = useRef<YardScene | null>(null);

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

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as YardScene;
    sceneRef.current.setCars(carsRef.current, trainRef.current);
  }, []);

  useEffect(() => { sceneRef.current?.setCars(cars, train); }, [cars, train]);

  // Phaser (YardScene) → state, across the EventBus. The crane animation fires
  // `yard-add-to-train` from its onComplete, so the dispatch follows the tween.
  useEffect(() => {
    const onAdd = (partId: string) =>
      dispatch({ type: "addToTrain", instanceId: newInstanceId(), partId });
    const onSend = () => dispatch({ type: "setActiveView", view: "track" });
    EventBus.on("yard-add-to-train", onAdd);
    EventBus.on("yard-send-to-track", onSend);
    return () => {
      EventBus.off("yard-add-to-train", onAdd);
      EventBus.off("yard-send-to-track", onSend);
    };
  }, [dispatch]);

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        {/* Phaser owns selection + the crane/Send buttons, so the canvas takes
            pointer events here (the global default is none for React-overlay views). */}
        <PhaserGame scenes={YARD_SCENES} onSceneReady={handleSceneReady} style={{ pointerEvents: "auto" }} />
      </div>

      {/* Top nav (still React for now) */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="◀" label="Workshop" onClick={() => dispatch({ type: "setActiveView", view: "workshop" })} />
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="🗺️" label="Map" onClick={() => dispatch({ type: "setActiveView", view: "map" })} />
      </div>
    </div>
  );
};
