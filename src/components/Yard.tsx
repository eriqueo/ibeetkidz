import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { PhaserGame } from "./PhaserGame.tsx";
import { PixelButton } from "./PixelButton.tsx";
import {
  YardScene,
  paletteSlot,
  trainSlot,
  type YardCar,
  type YardTrainCar,
} from "../game/scenes/YardScene.ts";
import { liveTrain } from "../core/project-state.ts";
import { SCENE_ASPECT } from "../game/scene-layout.ts";
import { useContainedRect } from "../app/use-overlay-rect.ts";

const YARD_SCENES = [YardScene];

let instSeq = 0;
const newInstanceId = (): string => `inst-${Date.now().toString(36)}-${instSeq++}`;

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const [selPart, setSelPart] = useState<string | null>(project.activePartId);
  const [selTrain, setSelTrain] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const sceneRef = useRef<YardScene | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(fieldRef, SCENE_ASPECT);

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
  const selRef = useRef(selPart); selRef.current = selPart;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as YardScene;
    sceneRef.current.setCars(carsRef.current, trainRef.current);
    sceneRef.current.setSelectedPalette(selRef.current);
  }, []);

  useEffect(() => { sceneRef.current?.setCars(cars, train); }, [cars, train]);
  useEffect(() => { sceneRef.current?.setSelectedPalette(selPart); }, [selPart]);

  const selectedTrain = train.find((c) => c.instanceId === selTrain);

  // Add the selected palette car to the train, animating the crane first.
  const addToTrain = (): void => {
    if (!selPart || busy) return;
    const slotIndex = project.parts.findIndex((p) => p.id === selPart);
    if (slotIndex < 0) return;
    const instanceId = newInstanceId();
    const partId = selPart;
    setBusy(true);
    const finish = (): void => { dispatch({ type: "addToTrain", instanceId, partId }); setBusy(false); };
    const scene = sceneRef.current;
    if (scene) scene.animatePickup(slotIndex, train.length, finish); else finish();
  };

  const sendToTrack = (): void => {
    if (train.length === 0) return;
    setLeaving(true);
    window.setTimeout(() => dispatch({ type: "setActiveView", view: "track" }), 600);
  };

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <div
        ref={fieldRef}
        style={{ position: "absolute", inset: 0, transform: leaving ? "translateX(110%)" : "none", transition: "transform 600ms ease-in" }}
      >
        <PhaserGame scenes={YARD_SCENES} onSceneReady={handleSceneReady} />

        {/* Palette selection hit-areas (over the siding sprites) */}
        {cars.map((car, i) => {
          const s = paletteSlot(rect, i);
          return (
            <button
              key={car.id}
              className="pixel-tap"
              aria-label={`Select ${car.name}`}
              title={car.name}
              onClick={() => { setSelPart(car.id); setSelTrain(null); }}
              style={{ position: "absolute", left: s.cx - s.w / 2, top: s.cy - s.h / 2, width: s.w, height: s.h, zIndex: 10, background: "transparent", border: selPart === car.id ? "3px solid #ffd166" : "3px solid transparent", borderRadius: 4, cursor: "pointer" }}
            />
          );
        })}

        {/* Assembly-line slot hit-areas */}
        {train.map((c, i) => {
          const s = trainSlot(rect, i, Math.max(1, train.length));
          return (
            <button
              key={c.instanceId}
              className="pixel-tap"
              aria-label={`Train car ${i + 1}`}
              onClick={() => { setSelTrain(c.instanceId); setSelPart(null); }}
              style={{ position: "absolute", left: s.cx - s.w / 2, top: s.cy - s.h / 2, width: s.w, height: s.h, zIndex: 11, background: c.muted ? "rgba(0,0,0,0.25)" : "transparent", border: selTrain === c.instanceId ? "3px solid #06d6a0" : "3px solid transparent", borderRadius: 4, cursor: "pointer" }}
            />
          );
        })}
      </div>

      {/* Top nav */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="◀" label="Workshop" onClick={() => dispatch({ type: "setActiveView", view: "workshop" })} />
      </div>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20 }}>
        <PixelButton variant="nav" emoji="🗺️" label="Map" onClick={() => dispatch({ type: "setActiveView", view: "map" })} />
      </div>

      {/* Selection hint */}
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 19, font: "400 8px/1.4 var(--font-label, 'Press Start 2P')", color: "#e8dcc8", textShadow: "1px 1px 0 #000", textAlign: "center", pointerEvents: "none" }}>
        {selectedTrain ? `Train car selected` : selPart ? `${cars.find((c) => c.id === selPart)?.name ?? "Car"} selected` : "Tap a car to select"}
      </div>

      {/* Bottom action bar */}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center", maxWidth: "95%" }}>
        <PixelButton variant="primary" emoji="🏗️" label="Add to Train" disabled={!selPart || busy} onClick={addToTrain} />
        <PixelButton emoji="🔧" label="Edit" disabled={!selPart} onClick={() => { if (selPart) { dispatch({ type: "setActivePart", partId: selPart }); dispatch({ type: "setActiveView", view: "workshop" }); } }} />
        <PixelButton emoji="▤" label="Copy" disabled={!selPart} onClick={() => { if (selPart) dispatch({ type: "duplicateCar", partId: selPart, id: `car-${Date.now().toString(36)}` }); }} />
        <PixelButton emoji={selectedTrain?.muted ? "🔇" : "🔈"} label={selectedTrain?.muted ? "Untarp" : "Tarp"} disabled={!selectedTrain} onClick={() => { if (selectedTrain) dispatch({ type: "muteCar", instanceId: selectedTrain.instanceId, muted: !selectedTrain.muted }); }} />
        <PixelButton emoji="✕" label="Remove" disabled={!selectedTrain} onClick={() => { if (selectedTrain) { dispatch({ type: "removeFromTrain", instanceId: selectedTrain.instanceId }); setSelTrain(null); } }} />
        <PixelButton variant="primary" emoji="🚂" label="Send to Track" disabled={train.length === 0 || leaving} onClick={sendToTrack} />
      </div>
    </div>
  );
};
