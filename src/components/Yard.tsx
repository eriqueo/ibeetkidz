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
  const [busy, setBusy] = useState(false); // crane animating → block double-adds
  const [leaving, setLeaving] = useState(false); // "send to track" slide-off
  const sceneRef = useRef<YardScene | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(fieldRef, SCENE_ASPECT);

  const cars = useMemo<YardCar[]>(
    () =>
      project.parts.map((p) => ({
        id: p.id,
        color: p.color,
        name: p.name,
        carType: p.carType,
      })),
    [project.parts],
  );

  const train = useMemo<YardTrainCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return {
        instanceId: c.instanceId,
        partId: c.partId,
        color: part.color,
        carType: part.carType,
        muted: c.muted,
      };
    });
  }, [project]);

  const carsRef = useRef(cars);
  carsRef.current = cars;
  const trainRef = useRef(train);
  trainRef.current = train;
  const selRef = useRef(selPart);
  selRef.current = selPart;

  const selectedPart = project.parts.find((p) => p.id === selPart);
  const selectedTrain = train.find((c) => c.instanceId === selTrain);

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as YardScene;
    sceneRef.current.setCars(carsRef.current, trainRef.current);
    sceneRef.current.setSelectedPalette(selRef.current);
  }, []);

  useEffect(() => {
    sceneRef.current?.setCars(cars, train);
  }, [cars, train]);

  useEffect(() => {
    sceneRef.current?.setSelectedPalette(selPart);
  }, [selPart]);

  // Add the selected palette car to the train, animating the crane first; the
  // dispatch fires in the crane's onComplete so the line updates after the drop.
  const addToTrain = (): void => {
    if (!selPart || busy) return;
    const slotIndex = project.parts.findIndex((p) => p.id === selPart);
    if (slotIndex < 0) return;
    const instanceId = newInstanceId();
    const partId = selPart;
    setBusy(true);
    const scene = sceneRef.current;
    const finish = (): void => {
      dispatch({ type: "addToTrain", instanceId, partId });
      setBusy(false);
    };
    if (scene) scene.animatePickup(slotIndex, train.length, finish);
    else finish();
  };

  const sendToTrack = (): void => {
    setLeaving(true);
    window.setTimeout(() => dispatch({ type: "setActiveView", view: "track" }), 600);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "var(--ground, #201c26)",
      overflow: "hidden",
    }}>
      {/* Brand header */}
      <header className="brand" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          className="t-btn"
          style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
          onClick={() => dispatch({ type: "setActiveView", view: "workshop" })}
        >
          ◀ Workshop
        </button>
        <span className="brand-text" style={{ fontSize: "1rem" }}>Springvale Yard</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="t-btn"
            style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "map" })}
          >
            🗺️ Map
          </button>
        </div>
      </header>

      {/* Phaser yard: palette cars on the sidings + the assembled train on the
          top line. React hit-areas shadow each slot for selection. */}
      <div
        ref={fieldRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          transform: leaving ? "translateX(110%)" : "none",
          transition: "transform 600ms ease-in",
        }}
      >
        <PhaserGame scenes={YARD_SCENES} onSceneReady={handleSceneReady} />

        {/* Palette selection hit-areas */}
        {cars.map((car, i) => {
          const s = paletteSlot(rect, i);
          return (
            <button
              key={car.id}
              aria-label={`Select ${car.name}`}
              title={car.name}
              onClick={() => { setSelPart(car.id); setSelTrain(null); }}
              style={{
                position: "absolute",
                left: s.cx - s.w / 2,
                top: s.cy - s.h / 2,
                width: s.w,
                height: s.h,
                zIndex: 10,
                pointerEvents: "auto",
                background: "transparent",
                border: selPart === car.id ? "3px solid #ffd166" : "3px solid transparent",
                borderRadius: 4,
                cursor: "pointer",
              }}
            />
          );
        })}

        {/* Assembly-line selection hit-areas */}
        {train.map((c, i) => {
          const s = trainSlot(rect, i, Math.max(1, train.length));
          return (
            <button
              key={c.instanceId}
              aria-label={`Train car ${i + 1}`}
              onClick={() => { setSelTrain(c.instanceId); setSelPart(null); }}
              style={{
                position: "absolute",
                left: s.cx - s.w / 2,
                top: s.cy - s.h / 2,
                width: s.w,
                height: s.h,
                zIndex: 11,
                pointerEvents: "auto",
                background: c.muted ? "rgba(0,0,0,0.25)" : "transparent",
                border: selTrain === c.instanceId ? "3px solid #06d6a0" : "3px solid transparent",
                borderRadius: 4,
                cursor: "pointer",
              }}
            />
          );
        })}

        {project.parts.length === 0 && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            font: "400 10px/2 var(--font-label, 'Press Start 2P')",
            letterSpacing: "1px",
            pointerEvents: "none",
            zIndex: 5,
          }}>
            No cars yet.<br />Build one in the Workshop!
          </div>
        )}
      </div>

      {/* Actions bar */}
      <footer className="playbar" style={{ flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div className="pb-group">
          {/* Palette car actions */}
          <button
            className="pb-btn pb-play"
            disabled={!selectedPart || busy}
            onClick={addToTrain}
            title="Add this car to the train"
          >
            <span className="pb-icon">🏗️</span>
            <span className="pb-label">Add to Train</span>
          </button>
          <button
            className="pb-btn"
            disabled={!selectedPart}
            onClick={() => {
              if (!selPart) return;
              dispatch({ type: "setActivePart", partId: selPart });
              dispatch({ type: "setActiveView", view: "workshop" });
            }}
          >
            <span className="pb-icon">🔧</span>
            <span className="pb-label">Edit</span>
          </button>
          <button
            className="pb-btn"
            disabled={!selectedPart}
            onClick={() => {
              if (!selPart) return;
              dispatch({ type: "duplicateCar", partId: selPart, id: `car-${Date.now().toString(36)}` });
            }}
          >
            <span className="pb-icon">▤</span>
            <span className="pb-label">Duplicate</span>
          </button>
        </div>

        {/* Train slot actions (only when a slot is selected) */}
        {selectedTrain && (
          <div className="pb-group">
            <button
              className="pb-btn"
              onClick={() =>
                dispatch({ type: "muteCar", instanceId: selectedTrain.instanceId, muted: !selectedTrain.muted })
              }
              title={selectedTrain.muted ? "Take the tarp off (unmute)" : "Cover with a tarp (mute)"}
            >
              <span className="pb-icon">{selectedTrain.muted ? "🔇" : "🔈"}</span>
              <span className="pb-label">{selectedTrain.muted ? "Untarp" : "Tarp"}</span>
            </button>
            <button
              className="pb-btn"
              onClick={() => {
                dispatch({ type: "removeFromTrain", instanceId: selectedTrain.instanceId });
                setSelTrain(null);
              }}
              title="Take this car off the train"
            >
              <span className="pb-icon">✕</span>
              <span className="pb-label">Remove</span>
            </button>
          </div>
        )}

        <div className="pb-group" style={{ marginLeft: "auto" }}>
          <button
            className="pb-btn pb-play"
            disabled={train.length === 0 || leaving}
            onClick={sendToTrack}
          >
            <span className="pb-icon">🚂</span>
            <span className="pb-label">Send to Track</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
