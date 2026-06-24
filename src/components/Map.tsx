import { FC, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { liveTrain } from "../core/project-state.ts";
import { AppView } from "../core/types.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { MapScene } from "../game/scenes/MapScene.ts";
import { MAP_LAYOUT, SCENE_ASPECT } from "../game/scene-layout.ts";
import { useContainedRect, regionStyle, type NormRegion } from "../app/use-overlay-rect.ts";

const MAP_SCENES = [MapScene];

const DESTINATIONS: { key: Extract<AppView, "workshop" | "yard" | "track">; label: string; region: NormRegion }[] = [
  { key: "workshop", label: "Workshop", region: MAP_LAYOUT.workshop },
  { key: "yard", label: "Yard", region: MAP_LAYOUT.yard },
  { key: "track", label: "Track", region: MAP_LAYOUT.track },
];

export const Map: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(wrapRef, SCENE_ASPECT);
  const [toast, setToast] = useState<string | null>(null);

  // Track needs an assembled train; nudge the kid to the Yard if it's empty.
  const go = (key: AppView): void => {
    if (key === "track" && liveTrain(project).length === 0) {
      setToast("Build a train first! Add cars in the Yard.");
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    dispatch({ type: "setActiveView", view: key });
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}
    >
      {/* Painted world map */}
      <PhaserGame scenes={MAP_SCENES} />

      {/* Brand + hint (overlay) */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 0,
        right: 0,
        zIndex: 20,
        textAlign: "center",
        pointerEvents: "none",
        font: "400 11px/1 var(--font-label, 'Press Start 2P')",
        color: "#e8dcc8",
        letterSpacing: "2px",
        textShadow: "2px 2px 0 #000",
      }}>
        iBeetKidz — pick a place to play!
      </div>

      {/* Destination buttons pinned over the painted spots */}
      {DESTINATIONS.map((d) => (
        <button
          key={d.key}
          aria-label={d.label}
          title={d.label}
          onClick={() => go(d.key)}
          style={{
            ...regionStyle(rect, d.region),
            zIndex: 10,
            background: "transparent",
            border: "3px solid transparent",
            borderRadius: 6,
            cursor: "pointer",
            transition: "border-color 0.1s, background 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(212,160,23,0.9)";
            e.currentTarget.style.background = "rgba(212,160,23,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.background = "transparent";
          }}
        />
      ))}

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
