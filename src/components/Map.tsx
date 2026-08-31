import { FC, useEffect, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { liveTrain } from "../core/project-state.ts";
import type { AppView } from "../core/types.ts";
import { PhaserScene, VIEW_OVERLAY } from "./PhaserScene.tsx";
import { MapScene } from "../game/scenes/MapScene.ts";
import { EventBus } from "../game/EventBus.ts";

export const Map: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const [toast, setToast] = useState<string | null>(null);

  const projectRef = useRef(project);
  projectRef.current = project;

  // Data-driven Tiled hits → navigation, across the EventBus. Track needs an
  // assembled train; nudge the kid to the Yard (toast) if it's empty.
  useEffect(() => {
    const onNav = (view: AppView): void => {
      if (view === "track" && liveTrain(projectRef.current).length === 0) {
        setToast("Build a train first! Add cars in the Yard.");
        window.setTimeout(() => setToast(null), 2200);
        return;
      }
      dispatch({ type: "setActiveView", view });
    };
    EventBus.on("map-nav", onNav);
    return () => {
      EventBus.off("map-nav", onNav);
    };
  }, [dispatch]);

  return (
    <div style={VIEW_OVERLAY}>
      {/* Painted world map and destination hit-areas live in MapScene, which
          claims the shared canvas while this view is up. */}
      <PhaserScene scene={MapScene} />

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
