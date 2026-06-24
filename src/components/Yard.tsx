import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { PhaserGame } from "./PhaserGame.tsx";
import { YardScene, yardSlot, type YardCar } from "../game/scenes/YardScene.ts";
import { SCENE_ASPECT } from "../game/scene-layout.ts";
import { useContainedRect } from "../app/use-overlay-rect.ts";

const YARD_SCENES = [YardScene];

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const [sel, setSel] = useState<string>(project.activePartId);
  const sceneRef = useRef<YardScene | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(fieldRef, SCENE_ASPECT);

  const cars = useMemo<YardCar[]>(
    () => project.parts.map((p) => ({ id: p.id, color: p.color, name: p.name })),
    [project.parts],
  );
  const carsRef = useRef(cars);
  carsRef.current = cars;
  const selRef = useRef(sel);
  selRef.current = sel;

  const selectedPart = project.parts.find((p) => p.id === sel);

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as YardScene;
    sceneRef.current.setCars(carsRef.current);
    sceneRef.current.setSelected(selRef.current);
  }, []);

  useEffect(() => {
    sceneRef.current?.setCars(cars);
  }, [cars]);

  useEffect(() => {
    sceneRef.current?.setSelected(sel);
  }, [sel]);

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
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text" style={{ fontSize: "1rem" }}>Springvale Yard</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="t-btn"
            style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "track" })}
          >
            🚂 Track
          </button>
        </div>
      </header>

      {/* Phaser yard — parked cars on sidings. React hit-areas shadow each car
          sprite for selection (the canvas takes no pointer events). */}
      <div ref={fieldRef} style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <PhaserGame scenes={YARD_SCENES} onSceneReady={handleSceneReady} />
        {cars.map((car, i) => {
          const s = yardSlot(rect, i);
          return (
            <button
              key={car.id}
              aria-label={`Select ${car.name}`}
              title={car.name}
              onClick={() => setSel(car.id)}
              style={{
                position: "absolute",
                left: s.cx - s.w / 2,
                top: s.cy - s.h / 2,
                width: s.w,
                height: s.h,
                zIndex: 10,
                pointerEvents: "auto",
                background: "transparent",
                border: sel === car.id ? "3px solid #ffd166" : "3px solid transparent",
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

      {/* Actions bar (React overlay) */}
      <footer className="playbar" style={{ flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div className="pb-group">
          <button
            className="pb-btn"
            disabled={!selectedPart}
            onClick={() => {
              if (!sel) return;
              dispatch({ type: "setActivePart", partId: sel });
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
              if (!sel) return;
              dispatch({ type: "duplicateCar", partId: sel, id: `part-${Date.now()}` });
            }}
          >
            <span className="pb-icon">▤</span>
            <span className="pb-label">Duplicate</span>
          </button>
        </div>
        <div className="pb-group" style={{ marginLeft: "auto" }}>
          <button
            className="pb-btn pb-play"
            onClick={() => dispatch({ type: "setActiveView", view: "track" })}
          >
            <span className="pb-icon">🚂</span>
            <span className="pb-label">Send to Track</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
