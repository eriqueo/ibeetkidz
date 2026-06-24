import { FC } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart } from "../core/project-state.ts";
import { LoopTrack } from "../machines/tools.tsx";

import bassDrumUrl from "../assets/theme/icons/bass-drum.png";
import snareUrl from "../assets/theme/icons/snare.png";
import cymbalUrl from "../assets/theme/icons/cymbal.png";
import tomUrl from "../assets/theme/icons/tom.png";
import keyboardUrl from "../assets/theme/icons/keyboard.png";
import micUrl from "../assets/theme/icons/mic.png";
import cowbellUrl from "../assets/theme/icons/cowbell.png";
import tambourineUrl from "../assets/theme/icons/tambourine.png";

const INSTRUMENTS = [
  { id: "bass-drum", label: "Kick", url: bassDrumUrl },
  { id: "snare", label: "Snare", url: snareUrl },
  { id: "cymbal", label: "Cymbal", url: cymbalUrl },
  { id: "tom", label: "Tom", url: tomUrl },
  { id: "keyboard", label: "Synth", url: keyboardUrl },
  { id: "mic", label: "Voice", url: micUrl },
  { id: "cowbell", label: "Cowbell", url: cowbellUrl },
  { id: "tambourine", label: "Tambourine", url: tambourineUrl },
];

export const Workshop: FC = () => {
  const { dispatch, engine } = useApp();
  const project = useProject();
  const part = activePart(project);
  const layers = activeLayers(project);

  return (
    <div className="view-container" style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "var(--ground, #201c26)" }}>
      {/* Brand header */}
      <header className="brand" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button
          className="t-btn"
          style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text" style={{ fontSize: "1rem" }}>Workshop</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="t-btn"
            style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
          >
            📦 Yard
          </button>
        </div>
      </header>

      {/* Workshop floor — dark inset panel, car sits here */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 12px 8px",
        background: "var(--well, #1a1712)",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "auto",
        gap: 12,
      }}>
        {/* The train car — sequencer IS the side of the car */}
        <div style={{
          width: "100%",
          maxWidth: 820,
          background: part.color,
          border: "3px solid #1a1712",
          boxShadow: "inset 3px 3px 0 rgba(255,255,255,0.25), inset -3px -3px 0 rgba(0,0,0,0.35), 0 6px 0 rgba(0,0,0,0.5)",
          borderRadius: 2,
          padding: "12px 12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: "relative",
        }}>
          {/* Car label strip */}
          <div style={{
            font: "400 9px/1 var(--font-label, 'Press Start 2P')",
            color: "rgba(0,0,0,0.6)",
            letterSpacing: "2px",
            textTransform: "uppercase",
            paddingBottom: 6,
            borderBottom: "2px solid rgba(0,0,0,0.2)",
          }}>
            Car {project.parts.findIndex(p => p.id === part.id) + 1} / {project.parts.length} — {part.name}
          </div>

          {/* Sequencer content */}
          {layers.length === 0 ? (
            <div style={{
              textAlign: "center",
              color: "rgba(0,0,0,0.45)",
              padding: "32px 16px",
              font: "400 9px/1.6 var(--font-label, 'Press Start 2P')",
              letterSpacing: "1px",
            }}>
              Empty car.<br />Tap an instrument below to start building.
            </div>
          ) : (
            <div className="loop-board" data-playing={engine.isPlaying}>
              {layers.map((layer) => (
                <LoopTrack key={layer.id} layerId={layer.id} />
              ))}
            </div>
          )}

          {/* Wheels */}
          <span className="car-wheels" aria-hidden style={{ marginTop: 4 }}>
            <i className="car-wheel" />
            <i className="car-wheel" />
          </span>
        </div>
      </div>

      {/* Instrument shelf — dark panel with sprites sitting on the floor */}
      <div style={{
        background: "var(--chrome, #3a3540)",
        borderTop: "3px solid #1a1712",
        boxShadow: "inset 0 3px 0 rgba(255,255,255,0.08)",
        padding: "10px 8px 6px",
        display: "flex",
        gap: 8,
        justifyContent: "center",
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            title={`Add ${inst.label}`}
            style={{
              background: "var(--well, #1a1712)",
              border: "2px solid #1a1712",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.08), inset -2px -2px 0 rgba(0,0,0,0.4)",
              padding: "6px 6px 4px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              borderRadius: 1,
            }}
          >
            <img
              src={inst.url}
              alt={inst.label}
              style={{
                height: 52,
                imageRendering: "pixelated",
                filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.7))",
              }}
            />
            <span style={{
              font: "400 7px/1 var(--font-label, 'Press Start 2P')",
              color: "var(--linen, #e8dcc8)",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}>
              {inst.label}
            </span>
          </button>
        ))}
      </div>

      {/* Transport bar */}
      <footer className="playbar" style={{ flexShrink: 0 }}>
        <div className="pb-group">
          <button className="pb-btn pb-play" onClick={() => engine.playLoop(project)}>
            <span className="pb-icon">▶</span>
            <span className="pb-label">Play Loop</span>
          </button>
          <button className="pb-btn" onClick={() => engine.stop()}>
            <span className="pb-icon">■</span>
            <span className="pb-label">Stop</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
