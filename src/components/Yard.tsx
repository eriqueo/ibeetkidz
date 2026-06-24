import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { PhaserGame } from "./PhaserGame.tsx";
import {
  YardScene,
  paletteSlot,
  trainSlot,
  type YardCar,
  type YardTrainCar,
} from "../game/scenes/YardScene.ts";
import { liveTrain } from "../core/project-state.ts";
import { SCENE_ASPECT, YARD_LAYOUT_V2 } from "../game/scene-layout.ts";
import { useContainedRect, regionStyle, type NormRegion } from "../app/use-overlay-rect.ts";

const YARD_SCENES = [YardScene];

let instSeq = 0;
const newInstanceId = (): string => `inst-${Date.now().toString(36)}-${instSeq++}`;

const hit = (rect: { x: number; y: number; width: number; height: number }, region: NormRegion) => ({
  ...regionStyle(rect, region),
  zIndex: 12,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
});

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const [selPart, setSelPart] = useState<string | null>(project.activePartId);
  const [selTrain, setSelTrain] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  // COUPLE: add the selected palette car to the train, animating the crane.
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

  const P = YARD_LAYOUT_V2.panel;
  const pBtn = (cx: number): NormRegion => ({ x: cx - P.w / 2, y: P.y, w: P.w, h: P.h });

  return (
    <div ref={fieldRef} style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <PhaserGame scenes={YARD_SCENES} onSceneReady={handleSceneReady} />

      {/* Palette selection hit-areas (over the siding sprites) */}
      {cars.map((car, i) => {
        const s = paletteSlot(rect, i);
        return (
          <button
            key={car.id}
            aria-label={`Select ${car.name}`}
            title={car.name}
            onClick={() => { setSelPart(car.id); setSelTrain(null); }}
            style={{
              position: "absolute", left: s.cx - s.w / 2, top: s.cy - s.h / 2, width: s.w, height: s.h,
              zIndex: 10, background: "transparent",
              border: selPart === car.id ? "3px solid #ffd166" : "3px solid transparent",
              borderRadius: 4, cursor: "pointer",
            }}
          />
        );
      })}

      {/* Assembly-line slot hit-areas */}
      {train.map((c, i) => {
        const s = trainSlot(rect, i, Math.max(1, train.length));
        return (
          <button
            key={c.instanceId}
            aria-label={`Train car ${i + 1}`}
            onClick={() => { setSelTrain(c.instanceId); setSelPart(null); }}
            style={{
              position: "absolute", left: s.cx - s.w / 2, top: s.cy - s.h / 2, width: s.w, height: s.h,
              zIndex: 11, background: c.muted ? "rgba(0,0,0,0.25)" : "transparent",
              border: selTrain === c.instanceId ? "3px solid #06d6a0" : "3px solid transparent",
              borderRadius: 4, cursor: "pointer",
            }}
          />
        );
      })}

      {/* Painted bottom-panel actions → transparent hit-areas */}
      <button title="Add to Train (couple)" style={hit(rect, pBtn(P.couple))} onClick={addToTrain} />
      <button title="Remove from Train (uncouple)" style={hit(rect, pBtn(P.uncouple))}
        onClick={() => { if (selTrain) { dispatch({ type: "removeFromTrain", instanceId: selTrain }); setSelTrain(null); } }} />
      <button title="Edit car" style={hit(rect, pBtn(P.build))}
        onClick={() => { if (selPart) { dispatch({ type: "setActivePart", partId: selPart }); dispatch({ type: "setActiveView", view: "workshop" }); } }} />
      <button title="Duplicate car" style={hit(rect, pBtn(P.move))}
        onClick={() => { if (selPart) dispatch({ type: "duplicateCar", partId: selPart, id: `car-${Date.now().toString(36)}` }); }} />
      <button title="Delete"
        style={hit(rect, pBtn(P.del))}
        onClick={() => {
          if (selTrain) { dispatch({ type: "removeFromTrain", instanceId: selTrain }); setSelTrain(null); }
          else if (selPart) dispatch({ type: "removeCar", partId: selPart });
        }} />
      <button title="Mute/Tarp" style={hit(rect, pBtn(P.info))}
        onClick={() => { if (selTrain) { const c = train.find((t) => t.instanceId === selTrain); if (c) dispatch({ type: "muteCar", instanceId: selTrain, muted: !c.muted }); } }} />
      <button title="Map" style={hit(rect, pBtn(P.exit))} onClick={() => dispatch({ type: "setActiveView", view: "map" })} />

      {/* Send to Track — the main line leading off to the right */}
      <button
        title="Send to Track"
        style={hit(rect, YARD_LAYOUT_V2.sendToTrack)}
        onClick={() => { if (train.length > 0) dispatch({ type: "setActiveView", view: "track" }); }}
      />
    </div>
  );
};
