import { FC, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer } from "../core/project-state.ts";
import { CAR_TYPES, type CarType } from "../core/types.ts";
import { LoopTrack, TOOLS, LoopSelectionProvider } from "../machines/tools.tsx";
import { BUILTIN_SOUNDS } from "../core/sound-catalog.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { WorkshopScene } from "../game/scenes/WorkshopScene.ts";
import { WORKSHOP_LAYOUT_V2, SCENE_ASPECT } from "../game/scene-layout.ts";
import { carSpriteUrl } from "../game/assets.ts";
import { useContainedRect, regionStyle } from "../app/use-overlay-rect.ts";

import bassDrumUrl from "../assets/theme/icons/bass-drum.png";
import snareUrl from "../assets/theme/icons/snare.png";
import cymbalUrl from "../assets/theme/icons/cymbal.png";
import tomUrl from "../assets/theme/icons/tom.png";
import keyboardUrl from "../assets/theme/icons/keyboard.png";
import micUrl from "../assets/theme/icons/mic.png";
import cowbellUrl from "../assets/theme/icons/cowbell.png";
import tambourineUrl from "../assets/theme/icons/tambourine.png";

const WORKSHOP_SCENES = [WorkshopScene];

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

const CAR_TYPE_LABELS: Record<CarType, string> = {
  boxcar: "Boxcar",
  tanker: "Tanker",
  hopper: "Hopper",
  flatcar: "Flatcar",
};

let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;

// The creative "stations" that fill a car: every machine tool EXCEPT the Home
// board (that IS the Workshop's mixing board). Opened as a panel over the scene.
const STATIONS = TOOLS.filter((t) => t.id !== "looper-stage");

export const Workshop: FC = () => {
  const { dispatch, engine, sound } = useApp();
  const project = useProject();
  const part = activePart(project);
  const layers = activeLayers(project);

  const wrapRef = useRef<HTMLDivElement>(null);
  const rect = useContainedRect(wrapRef, SCENE_ASPECT);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const station = STATIONS.find((t) => t.id === openTool);

  function addInstrument(assetId: string) {
    const catalog = BUILTIN_SOUNDS.find(s => s.assetId === assetId);
    if (!catalog) return;
    const clipId = `workshop-${assetId}-${Date.now()}`;
    const layerId = `layer-${assetId}-${Date.now()}`;
    const kind = catalog.recipe.kind === "drum" ? "drum" : "melody";

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
    dispatch({
      type: "addLayer",
      layer: makeLayer({
        id: layerId,
        clipId,
        kind,
        ...(kind === "melody" ? { wave: "triangle" } : {}),
      }),
    });
    const clip = project.clips[clipId] ?? {
      id: clipId,
      source: { kind: "builtin" as const, assetId },
      effects: [],
      color: catalog.color,
      label: catalog.label,
    };
    sound.play(clip);
  }

  // New blank car in the library, opened for editing (it does not auto-join the
  // train — that's the Yard's job).
  function newCar() {
    dispatch({ type: "addCar", id: newCarId() });
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}
    >
      {/* Painted car scene */}
      <PhaserGame scenes={WORKSHOP_SCENES} />

      {/* Nav (overlay) */}
      <button
        className="t-btn"
        style={{ position: "absolute", top: 8, left: 8, zIndex: 20, fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
        onClick={() => dispatch({ type: "setActiveView", view: "map" })}
      >
        ◀ Map
      </button>
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20, display: "flex", gap: 6 }}>
        <button
          className="t-btn"
          style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
          onClick={newCar}
          title="Start a fresh empty car"
        >
          ＋ New Car
        </button>
        <button
          className="t-btn"
          style={{ fontSize: "0.65rem", padding: "4px 8px", height: "auto", width: "auto" }}
          onClick={() => dispatch({ type: "setActiveView", view: "yard" })}
        >
          📦 Yard
        </button>
      </div>

      {/* Live sequencer grid, pinned over the painted boxcar interior */}
      <div style={{ ...regionStyle(rect, WORKSHOP_LAYOUT_V2.carInterior), zIndex: 10, overflow: "hidden" }}>
        {layers.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
            color: "#e8dcc8",
            font: "400 9px/1.8 var(--font-label, 'Press Start 2P')",
            letterSpacing: "1px",
            textShadow: "1px 1px 0 #000",
          }}>
            Empty car.<br />Tap an instrument to start.
          </div>
        ) : (
          <div
            className="loop-board workshop-board"
            data-playing={engine.isPlaying}
            style={{ height: "100%", overflow: "hidden" }}
          >
            {layers.map((layer) => (
              <LoopTrack key={layer.id} layerId={layer.id} />
            ))}
          </div>
        )}
      </div>

      {/* Car-type picker — pick the sprite this car wears in the Yard + Track */}
      <div style={{
        ...regionStyle(rect, WORKSHOP_LAYOUT_V2.carTypePicker),
        zIndex: 12,
        display: "flex",
        gap: 6,
        alignItems: "center",
        justifyContent: "center",
      }}>
        {CAR_TYPES.map((ct) => {
          const active = part.carType === ct;
          return (
            <button
              key={ct}
              title={CAR_TYPE_LABELS[ct]}
              aria-pressed={active}
              onClick={() => dispatch({ type: "setCarType", partId: part.id, carType: ct })}
              style={{
                flex: "0 1 auto",
                height: "100%",
                background: active ? "rgba(255,209,102,0.25)" : "rgba(0,0,0,0.35)",
                border: active ? "2px solid #ffd166" : "2px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                cursor: "pointer",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={carSpriteUrl[ct]}
                alt={CAR_TYPE_LABELS[ct]}
                style={{ maxHeight: "100%", maxWidth: "100%", imageRendering: "pixelated" }}
              />
            </button>
          );
        })}
      </div>

      {/* Instrument shelf, pinned over the painted instruments on the ground */}
      <div style={{
        ...regionStyle(rect, WORKSHOP_LAYOUT_V2.shelf),
        zIndex: 10,
        display: "flex",
        gap: 4,
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "nowrap",
      }}>
        {SHELF_INSTRUMENTS.map((inst) => (
          <button
            key={inst.assetId}
            title={`Add ${inst.label}`}
            onClick={() => addInstrument(inst.assetId)}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              height: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "translateY(2px)")}
            onMouseUp={e => (e.currentTarget.style.transform = "")}
            onMouseLeave={e => (e.currentTarget.style.transform = "")}
          >
            <img
              src={inst.url}
              alt={inst.label}
              style={{
                maxHeight: "70%",
                maxWidth: "100%",
                imageRendering: "pixelated",
                filter: "drop-shadow(2px 2px 0 rgba(0,0,0,0.7))",
              }}
            />
            <span style={{
              font: "400 6px/1 var(--font-label, 'Press Start 2P')",
              color: "#e8dcc8",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              textShadow: "1px 1px 0 #000",
            }}>
              {inst.label}
            </span>
          </button>
        ))}
      </div>

      {/* Transport, pinned over the painted button band */}
      <div style={{
        ...regionStyle(rect, WORKSHOP_LAYOUT_V2.transport),
        zIndex: 10,
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <button className="pb-btn pb-play" onClick={() => engine.playLoop(project)}>
          <span className="pb-icon">▶</span>
          <span className="pb-label">Play</span>
        </button>
        <button className="pb-btn" onClick={() => engine.stop()}>
          <span className="pb-icon">■</span>
          <span className="pb-label">Stop</span>
        </button>
      </div>

      {/* Creative-tool stations: a left-edge dock that opens each tool over the
          car. Each tool dispatches its sound straight into the active car, so
          the new lane shows up in the mixing board when the panel closes. */}
      <div style={{
        position: "absolute",
        left: 6,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 14,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        {STATIONS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            aria-label={t.label}
            onClick={() => setOpenTool(t.id)}
            style={{
              width: 40,
              height: 40,
              fontSize: 20,
              lineHeight: 1,
              background: openTool === t.id ? "rgba(255,209,102,0.3)" : "rgba(0,0,0,0.55)",
              border: "2px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Open station panel (the tool's own machine UI, mounted over the scene) */}
      {station && (
        <div
          role="dialog"
          aria-label={station.label}
          style={{
            position: "absolute",
            inset: "6% 4%",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            background: "rgba(18,14,22,0.97)",
            border: "3px solid #ffd166",
            borderRadius: 12,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <header style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderBottom: "2px solid rgba(255,255,255,0.15)",
          }}>
            <span style={{ fontSize: 20 }}>{station.icon}</span>
            <span style={{
              font: "400 12px/1 var(--font-label, 'Press Start 2P')",
              color: "#e8dcc8",
              letterSpacing: "1px",
            }}>
              {station.label}
            </span>
            <button
              className="t-btn"
              style={{ marginLeft: "auto", fontSize: "0.7rem", padding: "4px 10px", height: "auto", width: "auto" }}
              onClick={() => setOpenTool(null)}
            >
              ✓ Done
            </button>
          </header>
          <div className="workshop-station-body" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <LoopSelectionProvider>
              {station.Options ? <station.Options /> : null}
              <station.Canvas />
            </LoopSelectionProvider>
          </div>
        </div>
      )}
    </div>
  );
};
