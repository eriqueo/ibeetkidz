import { FC, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const [sel, setSel] = useState<string>(project.activePartId);

  return (
    <div className="view-container">
      {/* Toolbar */}
      <header className="options-bar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button 
          className="t-btn" 
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text">Springvale Yard</span>
      </header>

      {/* Yard playfield */}
      <div className="view-playfield scrollable pattern-grid" style={{ padding: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
          {project.parts.map((p) => (
            <button key={p.id} className="yard-siding-btn" onClick={() => setSel(p.id)}>
              {/* car parked on its siding rail */}
              <div className="yard-siding-rail">
                <div className="yard-siding-track" />
                <div className="car-block" style={{ 
                  "--car-color": p.color,
                  position: "absolute", left: "50%", bottom: 6, transform: "translateX(-50%)",
                  width: 100, height: 40,
                  outline: sel === p.id ? "3px solid var(--sun)" : "none", outlineOffset: 2,
                } as any}>
                  <span className="car-wheels" aria-hidden>
                    <i className="car-wheel" />
                    <i className="car-wheel" />
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "400 11px/1 var(--font-label)", color: "var(--bone)", textTransform: "uppercase", letterSpacing: "1px" }}>{p.name}</span>
                <span style={{ font: "400 12px/1 var(--font-body)", color: "var(--slate)" }}>{p.layers.length} instruments</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions bar */}
      <footer className="playbar" style={{ marginTop: "auto" }}>
        <div className="pb-group">
          <button className="pb-btn" onClick={() => {
            dispatch({ type: "setActivePart", partId: sel });
            dispatch({ type: "setActiveView", view: "workshop" });
          }}>
            <span className="pb-icon">🔧</span>
            <span className="pb-label">Edit</span>
          </button>
          <button className="pb-btn" onClick={() => {
            dispatch({ type: "duplicateCar", partId: sel, id: `part-${Date.now()}` });
          }}>
            <span className="pb-icon">▤</span>
            <span className="pb-label">Duplicate</span>
          </button>
        </div>
        <div className="pb-group" style={{ marginLeft: "auto" }}>
          <button className="pb-btn pb-play" onClick={() => {
            dispatch({ type: "setActivePart", partId: sel });
            dispatch({ type: "setActiveView", view: "track" });
          }}>
            <span className="pb-icon">🚂</span>
            <span className="pb-label">Send to Track</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
