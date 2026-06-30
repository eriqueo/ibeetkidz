import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { liveTrain } from "../core/project-state.ts";
import { AppView } from "../core/types.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { MapScene } from "../game/scenes/MapScene.ts";
import { EventBus } from "../game/EventBus.ts";

const MAP_SCENES = [MapScene];

// The handcar marks where the kid currently "is". The Map itself has no landmark,
// so remember the last destination they travelled to (default: the Workshop, the
// natural starting point) and show the marker there.
let lastDestination: AppView = "workshop";

export const Map: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const sceneRef = useRef<MapScene | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const projectRef = useRef(project);
  projectRef.current = project;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as MapScene;
    sceneRef.current.setLocation(lastDestination);
  }, []);

  // Data-driven Tiled hits → navigation, across the EventBus. Track needs an
  // assembled train; nudge the kid to the Yard (toast) if it's empty.
  useEffect(() => {
    const onNav = (view: AppView): void => {
      if (view === "track" && liveTrain(projectRef.current).length === 0) {
        setToast("Build a train first! Add cars in the Yard.");
        window.setTimeout(() => setToast(null), 2200);
        return;
      }
      lastDestination = view;
      sceneRef.current?.setLocation(view);
      dispatch({ type: "setActiveView", view });
    };
    EventBus.on("map-nav", onNav);
    return () => {
      EventBus.off("map-nav", onNav);
    };
  }, [dispatch]);

  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      {/* Painted world map + the destination hit-areas + the handcar marker all
          live in MapScene now, so the canvas takes pointer events. */}
      <PhaserGame scenes={MAP_SCENES} onSceneReady={handleSceneReady} style={{ pointerEvents: "auto" }} />

      {/* "Build a train first" toast */}
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
