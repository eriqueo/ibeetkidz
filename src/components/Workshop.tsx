import { FC } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer } from "../core/project-state.ts";
import { LoopTrack } from "../machines/tools.tsx";
import { BUILTIN_SOUNDS } from "../core/sound-catalog.ts";

import bassDrumUrl from "../assets/theme/icons/bass-drum.png";
import snareUrl from "../assets/theme/icons/snare.png";
import cymbalUrl from "../assets/theme/icons/cymbal.png";
import tomUrl from "../assets/theme/icons/tom.png";
import keyboardUrl from "../assets/theme/icons/keyboard.png";
import micUrl from "../assets/theme/icons/mic.png";
import cowbellUrl from "../assets/theme/icons/cowbell.png";
import tambourineUrl from "../assets/theme/icons/tambourine.png";

// Map our sprite images to the actual sound catalog assetIds
const SHELF_INSTRUMENTS = [
  { assetId: "kick",       label: "Kick",       url: bassDrumUrl   },
  { assetId: "snare",      label: "Snare",      url: snareUrl      },
  { assetId: "hihat",      label: "Cymbal",     url: cymbalUrl     },
  { assetId: "tom",        label: "Tom",        url: tomUrl        },
  { assetId: "cowbell",    label: "Cowbell",    url: cowbellUrl    },
  { assetId: "shaker",     label: "Tambourine", url: tambourineUrl },
  { assetId: "note-do",    label: "Synth",      url: keyboardUrl   },
  { assetId: "note-mi",    label: "Voice",      url: micUrl        },
];

export const Workshop: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const part = activePart(project);
  const layers = activeLayers(project);
  const carIndex = project.parts.findIndex(p => p.id === part.id);
  const carColor = part.color;

  function addInstrument(assetId: string) {
    const catalog = BUILTIN_SOUNDS.find(s => s.assetId === assetId);
    if (!catalog) return;
    const clipId = `workshop-${assetId}-${Date.now()}`;
    const layerId = `layer-${assetId}-${Date.now()}`;
    const kind = catalog.recipe.kind === "drum" ? "drum" : "melody";

    // Ensure the clip exists first
    if (!project.clips[clipId]) {
      dispatch({
        type: "addClip",
        clip: {
          id: clipId,
          source: { kind: "builtin", assetId },
          effects: [],
          color: catalog.color,
          label: catalog.label,
        },
      });
    }
    // Then add the layer
    dispatch({
      type: "addLayer",
      layer: makeLayer({
        id: layerId,
        clipId,
        kind,
        ...(kind === "melody" ? { wave: "triangle" } : {}),
      }),
    });
    // Preview the sound
    const clip = project.clips[clipId] ?? {
      id: clipId,
      source: { kind: "builtin" as const, assetId },
      effects: [],
      color: catalog.color,
      label: catalog.label,
    };
    sound.play(clip);
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "#201c26",
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

      {/* Workshop floor — dark inset panel */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 12px 12px",
        background: "#1a1712",
        boxShadow: "inset 0 4px 0 rgba(0,0,0,0.4)",
        overflow: "auto",
        gap: 0,
      }}>
        {/* ── TRAIN CAR FRAME ─────────────────────────────────── */}
        <div style={{
          width: "100%",
          maxWidth: 860,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}>
          {/* Roof strip with smokestack */}
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            paddingLeft: 20,
            gap: 8,
            marginBottom: 0,
          }}>
            {/* Smokestack */}
            <div style={{
              width: 18, height: 28,
              background: "#2a2520",
              border: "3px solid #1a1712",
              borderBottom: "none",
              boxShadow: "inset 2px 0 0 rgba(255,255,255,0.12), inset -2px 0 0 rgba(0,0,0,0.4)",
              borderRadius: "2px 2px 0 0",
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                top: -5, left: -4,
                width: 22, height: 6,
                background: "#3a3530",
                border: "2px solid #1a1712",
                borderRadius: 1,
              }} />
            </div>
            {/* Car number plate */}
            <div style={{
              background: "#2a2520",
              border: "2px solid #1a1712",
              boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.1)",
              padding: "3px 8px",
              font: "400 8px/1 var(--font-label, 'Press Start 2P')",
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "1px",
              borderRadius: "2px 2px 0 0",
            }}>
              CAR {carIndex + 1}
            </div>
          </div>

          {/* Main car body */}
          <div style={{
            background: carColor,
            border: "4px solid #1a1712",
            boxShadow: [
              "inset 4px 4px 0 rgba(255,255,255,0.28)",
              "inset -4px -4px 0 rgba(0,0,0,0.4)",
              "0 6px 0 rgba(0,0,0,0.6)",
            ].join(", "),
            borderRadius: 2,
            padding: "10px 10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "relative",
          }}>
            {/* Rivets — top row */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4, borderBottom: "2px solid rgba(0,0,0,0.2)" }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.2)",
                }} />
              ))}
            </div>

            {/* Car name */}
            <div style={{
              font: "400 8px/1 var(--font-label, 'Press Start 2P')",
              color: "rgba(0,0,0,0.55)",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}>
              {part.name}
            </div>

            {/* Sequencer content */}
            {layers.length === 0 ? (
              <div style={{
                textAlign: "center",
                color: "rgba(0,0,0,0.4)",
                padding: "28px 16px",
                font: "400 8px/1.8 var(--font-label, 'Press Start 2P')",
                letterSpacing: "1px",
                background: "rgba(0,0,0,0.1)",
                border: "2px dashed rgba(0,0,0,0.2)",
                borderRadius: 1,
              }}>
                Empty car.<br />Tap an instrument below<br />to start building.
              </div>
            ) : (
              <div className="loop-board" data-playing={engine.isPlaying}>
                {layers.map((layer) => (
                  <LoopTrack key={layer.id} layerId={layer.id} />
                ))}
              </div>
            )}

            {/* Rivets — bottom row */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "2px solid rgba(0,0,0,0.2)", marginTop: 4 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: "inset 1px 1px 0 rgba(255,255,255,0.2)",
                }} />
              ))}
            </div>
          </div>

          {/* Rail + wheels under the car */}
          <div style={{ position: "relative", height: 28, marginTop: 0 }}>
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 4,
              height: 20,
              background: "repeating-linear-gradient(90deg, #7c5c2a 0px, #7c5c2a 12px, transparent 12px, transparent 20px)",
              borderTop: "2px solid #3a2e1a",
              borderBottom: "2px solid #3a2e1a",
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 18,
              height: 4, background: "#a09060",
              borderTop: "1px solid #c8a870", borderBottom: "1px solid #3a2e1a",
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 6,
              height: 4, background: "#a09060",
              borderTop: "1px solid #c8a870", borderBottom: "1px solid #3a2e1a",
            }} />
            <div style={{
              position: "absolute", bottom: 2, left: 24,
              width: 20, height: 20, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #555, #222)",
              border: "3px solid #888",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.15), 0 2px 0 rgba(0,0,0,0.5)",
            }} />
            <div style={{
              position: "absolute", bottom: 2, right: 24,
              width: 20, height: 20, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #555, #222)",
              border: "3px solid #888",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.15), 0 2px 0 rgba(0,0,0,0.5)",
            }} />
          </div>
        </div>
      </div>

      {/* Instrument shelf */}
      <div style={{
        background: "#2a2520",
        borderTop: "3px solid #1a1712",
        boxShadow: "inset 0 3px 0 rgba(255,255,255,0.06)",
        padding: "10px 8px 6px",
        display: "flex",
        gap: 6,
        justifyContent: "center",
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {SHELF_INSTRUMENTS.map((inst) => (
          <button
            key={inst.assetId}
            title={`Add ${inst.label}`}
            onClick={() => addInstrument(inst.assetId)}
            style={{
              background: "#1a1712",
              border: "2px solid #0e0c0a",
              boxShadow: "inset 2px 2px 0 rgba(255,255,255,0.08), inset -2px -2px 0 rgba(0,0,0,0.4), 0 3px 0 rgba(0,0,0,0.5)",
              padding: "6px 6px 4px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              borderRadius: 1,
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "translateY(2px)")}
            onMouseUp={e => (e.currentTarget.style.transform = "")}
            onMouseLeave={e => (e.currentTarget.style.transform = "")}
          >
            <img
              src={inst.url}
              alt={inst.label}
              style={{
                height: 48,
                imageRendering: "pixelated",
                filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.7))",
              }}
            />
            <span style={{
              font: "400 6px/1 var(--font-label, 'Press Start 2P')",
              color: "rgba(255,255,255,0.55)",
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
        <div className="pb-group" style={{ marginLeft: "auto" }}>
          <button
            className="pb-btn"
            onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
          >
            <span className="pb-icon">📦</span>
            <span className="pb-label">Send to Yard</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
