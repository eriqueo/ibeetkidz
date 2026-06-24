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
    <div className="view-container">
      {/* Toolbar */}
      <header className="brand" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button 
          className="t-btn" 
          style={{ fontSize: "0.8rem", padding: "4px 8px", height: "auto" }}
          onClick={() => dispatch({ type: "setActiveView", view: "map" })}
        >
          ◀ Map
        </button>
        <span className="brand-text">Workshop</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button 
            className="t-btn" 
            style={{ fontSize: "0.8rem", padding: "4px 8px", height: "auto", width: "auto" }}
            onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
          >
            📦 Yard
          </button>
        </div>
      </header>

      {/* The train car — sequencer grid IS the side of the car */}
      <div className="view-playfield" style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", background: "transparent", border: "none", boxShadow: "none" }}>
        <div className="car-block active" style={{ 
          "--car-color": part.color, 
          width: "100%", 
          maxWidth: 800,
          padding: 20,
          minHeight: 300,
          display: "flex",
          flexDirection: "column",
          gap: 10
        } as any}>
          {layers.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: 40 }}>
              Empty car. Drag an instrument from the shelf below to start building.
            </div>
          ) : (
            <div className="loop-board" data-playing={engine.isPlaying}>
              {layers.map((layer) => (
                <LoopTrack key={layer.id} layerId={layer.id} />
              ))}
            </div>
          )}
          <span className="car-wheels" aria-hidden>
            <i className="car-wheel" />
            <i className="car-wheel" />
          </span>
        </div>
      </div>

      {/* Instrument shelf */}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "flex-end", padding: "0 8px 4px" }}>
        {INSTRUMENTS.map((inst) => (
          <button 
            key={inst.id}
            className="t-btn"
            style={{ 
              background: "transparent", 
              border: "none", 
              padding: 0, 
              cursor: "grab" 
            }}
            title={`Add ${inst.label}`}
          >
            <img 
              src={inst.url}
              alt={inst.label} 
              style={{ 
                height: 42, 
                imageRendering: "pixelated", 
                filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.5))" 
              }} 
            />
          </button>
        ))}
      </div>

      {/* Transport bar */}
      <footer className="playbar" style={{ marginTop: "auto" }}>
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
