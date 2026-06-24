import { FC, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";

export const Yard: FC = () => {
  const { dispatch } = useApp();
  const project = useProject();
  const [sel, setSel] = useState<string>(project.activePartId);

  const selectedPart = project.parts.find(p => p.id === sel);

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

      {/* Yard floor — dark inset panel with sidings */}
      <div style={{
        flex: 1,
        background: "var(--well, #1a1712)",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "auto",
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        alignItems: "stretch",
      }}>
        {project.parts.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.3)",
            font: "400 9px/2 var(--font-label, 'Press Start 2P')",
            padding: "40px 16px",
            letterSpacing: "1px",
          }}>
            No cars yet.<br />Build one in the Workshop!
          </div>
        )}

        {project.parts.map((p) => {
          const isSel = sel === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSel(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: isSel ? "rgba(255,255,255,0.06)" : "transparent",
                border: isSel ? "2px solid var(--sun, #d4a017)" : "2px solid transparent",
                boxShadow: isSel ? "0 0 0 1px rgba(212,160,23,0.3)" : "none",
                borderRadius: 2,
                padding: "12px 16px",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              {/* Siding with car on rails */}
              <div style={{ position: "relative", width: 160, height: 64, flexShrink: 0 }}>
                {/* Two steel rails */}
                <div style={{
                  position: "absolute",
                  left: 0, right: 0,
                  bottom: 10,
                  height: 4,
                  background: "#8a7a5a",
                  borderTop: "1px solid #c0a060",
                  borderBottom: "1px solid #3a2e1a",
                }} />
                <div style={{
                  position: "absolute",
                  left: 0, right: 0,
                  bottom: 18,
                  height: 4,
                  background: "#8a7a5a",
                  borderTop: "1px solid #c0a060",
                  borderBottom: "1px solid #3a2e1a",
                }} />
                {/* Wooden ties */}
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: `${i * 14 + 4}px`,
                    bottom: 8,
                    width: 10,
                    height: 16,
                    background: "#7c5c2a",
                    border: "1px solid #3a2e1a",
                    borderRadius: 1,
                  }} />
                ))}
                {/* Car block on the siding */}
                <div style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 22,
                  transform: "translateX(-50%)",
                  width: 120,
                  height: 44,
                  background: p.color,
                  border: "3px solid #1a1712",
                  boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.25), inset -3px -3px 0 rgba(0,0,0,0.35), 0 4px 0 rgba(0,0,0,0.5)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: "400 8px/1 var(--font-label, 'Press Start 2P')",
                  color: "rgba(0,0,0,0.55)",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}>
                  {p.name}
                  {/* Wheels */}
                  <span style={{
                    position: "absolute",
                    bottom: -7,
                    left: 8,
                    width: 12, height: 12,
                    borderRadius: "50%",
                    background: "#222",
                    border: "2px solid #888",
                  }} />
                  <span style={{
                    position: "absolute",
                    bottom: -7,
                    right: 8,
                    width: 12, height: 12,
                    borderRadius: "50%",
                    background: "#222",
                    border: "2px solid #888",
                  }} />
                </div>
              </div>

              {/* Car info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <span style={{
                  font: "400 10px/1 var(--font-label, 'Press Start 2P')",
                  color: "var(--linen, #e8dcc8)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}>
                  {p.name}
                </span>
                <span style={{
                  font: "400 12px/1 var(--font-body, 'Pixelify Sans')",
                  color: "rgba(255,255,255,0.45)",
                }}>
                  {p.layers.length} instrument{p.layers.length !== 1 ? "s" : ""}
                </span>
                {/* Color swatch */}
                <div style={{
                  display: "flex",
                  gap: 4,
                  marginTop: 2,
                }}>
                  <span style={{
                    width: 12, height: 12,
                    background: p.color,
                    border: "2px solid #1a1712",
                    borderRadius: 1,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    font: "400 9px/1.3 var(--font-body, 'Pixelify Sans')",
                    color: "rgba(255,255,255,0.3)",
                  }}>
                    {p.layers.filter(l => l.kind === "drum").length > 0 && "drums "}
                    {p.layers.filter(l => l.kind === "melody").length > 0 && "melody"}
                  </span>
                </div>
              </div>

              {/* Selection indicator */}
              {isSel && (
                <div style={{
                  font: "400 8px/1 var(--font-label, 'Press Start 2P')",
                  color: "var(--sun, #d4a017)",
                  letterSpacing: "1px",
                  flexShrink: 0,
                }}>
                  ◀ SEL
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions bar */}
      <footer className="playbar" style={{ flexShrink: 0 }}>
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
