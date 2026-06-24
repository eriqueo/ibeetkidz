// The kidpix 4-region layout in React: palette (left), per-tool options bar
// (top), canvas (center), play bar (bottom). The visualizer is opt-in (the
// "Watch" panel), never an always-on background. Only the active tool renders,
// so panels can't stack.

import {
  useEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useApp, useProject } from "../app/context.tsx";
import { usePhoneLayout } from "../app/use-viewport.ts";
import {
  TOOLS,
  LoopSelectionProvider,
  TracksStrip,
  TrainModeProvider,
  useTrainVisible,
  type ToolDescriptor,
} from "../machines/tools.tsx";
import { VizPanel } from "./VizPanel.tsx";
import { Workshop } from "./Workshop.tsx";
import { Yard } from "./Yard.tsx";
import { Track } from "./Track.tsx";
import { Map } from "./Map.tsx";

const Palette: FC<{ activeId: string }> = ({ activeId }) => {
  const { dispatch } = useApp();
  return (
    <nav className="palette">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          data-machine={t.id}
          className={t.id === activeId ? "active" : ""}
          onClick={() => dispatch({ type: "setActiveMachine", machineId: t.id })}
        >
          <span className="m-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

const OptionsBar: FC<{ tool: ToolDescriptor }> = ({ tool }) => {
  if (tool.Options) {
    const Options = tool.Options;
    return (
      <section data-options={tool.id}>
        <Options />
      </section>
    );
  }
  return (
    <section data-options={tool.id} className="options-title">
      <span className="options-icon">{tool.icon}</span>
      <span>{tool.label}</span>
    </section>
  );
};

const PlayBar: FC<{ watching: boolean; onToggleWatch: () => void }> = ({
  watching,
  onToggleWatch,
}) => {
  const { engine, dispatch, undo, redo, save, surprise, getProject } = useApp();
  const [snap, setSnap] = useState(true);
  return (
    <footer className="playbar">
      <div className="pb-group">
        <button
          className="pb-btn pb-play"
          data-act="play"
          title="Play"
          onClick={() => engine.playLoop(getProject())}
        >
          <span className="pb-icon">▶</span>
          <span className="pb-label">Play</span>
        </button>
        <button
          className="pb-btn"
          data-act="stop"
          title="Stop"
          onClick={() => engine.stop()}
        >
          <span className="pb-icon">■</span>
          <span className="pb-label">Stop</span>
        </button>
      </div>

      <label className="tempo">
        <span className="pb-label">🐢 Speed 🐇</span>
        <input
          data-act="tempo"
          type="range"
          min="40"
          max="220"
          defaultValue="100"
          onInput={(e) => {
            const bpm = Number((e.target as HTMLInputElement).value);
            dispatch({ type: "setTempo", bpm });
            engine.setTempo(bpm);
          }}
        />
      </label>

      <div className="pb-group">
        <button
          className={"pb-btn" + (snap ? " active" : "")}
          data-act="snap"
          title="Snap to beat"
          aria-pressed={snap}
          onClick={() => {
            const next = !snap;
            setSnap(next);
            engine.setQuantize(next ? "beat" : "off");
          }}
        >
          <span className="pb-icon">🧲</span>
          <span className="pb-label">Snap</span>
        </button>
        <button className="pb-btn" data-act="undo" title="Undo" onClick={undo}>
          <span className="pb-icon">↶</span>
          <span className="pb-label">Undo</span>
        </button>
        <button className="pb-btn" data-act="redo" title="Redo" onClick={redo}>
          <span className="pb-icon">↷</span>
          <span className="pb-label">Redo</span>
        </button>
        <button
          className="pb-btn"
          data-act="surprise"
          title="Surprise me"
          onClick={surprise}
        >
          <span className="pb-icon">🎲</span>
          <span className="pb-label">Surprise</span>
        </button>
        <button
          className="pb-btn"
          data-act="save"
          title="Save"
          onClick={(e) => {
            save();
            const b = e.currentTarget;
            b.classList.remove("flash");
            void b.offsetWidth; // restart the animation
            b.classList.add("flash");
          }}
        >
          <span className="pb-icon">💾</span>
          <span className="pb-label">Save</span>
        </button>
        <button
          className={"pb-btn" + (watching ? " active" : "")}
          data-act="watch"
          title="Watch the sound"
          aria-pressed={watching}
          onClick={onToggleWatch}
        >
          <span className="pb-icon">👁</span>
          <span className="pb-label">Watch</span>
        </button>
      </div>
    </footer>
  );
};

// On phones the Studio rail slides up from the bottom on demand, keeping the
// canvas full-width. It stays mounted (just translated off-screen) so its
// controls don't lose state between peeks.
const RailSheet: FC<{
  toolId: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}> = ({ toolId, open, onToggle, children }) => (
  <>
    <button
      type="button"
      className={"rail-sheet-toggle" + (open ? " active" : "")}
      aria-expanded={open}
      onClick={onToggle}
    >
      🎛️ {open ? "Close" : "Studio"}
    </button>
    <aside
      className={"rail rail-sheet" + (open ? " open" : "")}
      data-rail={toolId}
      aria-hidden={!open}
    >
      {children}
    </aside>
  </>
);

export const Shell: FC = () => {
  const project = useProject();
  const { dispatch } = useApp();
  const isPhone = usePhoneLayout();
  const active = TOOLS.find((t) => t.id === project.activeMachineId) ?? TOOLS[0]!;
  
  // Three-space routing:
  const view = project.activeView;
  
  // If we're on the map, render just the map.
  if (view === "map") {
    return (
      <div id="app">
        <div className="shell-root">
          <Map />
        </div>
      </div>
    );
  }
  
  if (view === "workshop") {
    return (
      <div id="app">
        <div className="shell-root">
          <Workshop />
        </div>
      </div>
    );
  }

  if (view === "yard") {
    return (
      <div id="app">
        <div className="shell-root">
          <Yard />
        </div>
      </div>
    );
  }
  if (view === "track") {
    return (
      <div id="app">
        <div className="shell-root">
          <Track />
        </div>
      </div>
    );
  }
  const Canvas = active.Canvas;
  const Rail = active.Rail;
  const sideRail = Rail && !isPhone;
  const sheetRail = Rail && isPhone;
  const [sheetOpen, setSheetOpen] = useState(false);
  // The visualizer is opt-in and off by default — no background motion.
  const [watching, setWatching] = useState(false);
  // A fresh tool starts with its rail tucked away — never surprise the kid with
  // a panel covering the canvas they just switched to.
  useEffect(() => setSheetOpen(false), [active.id]);
  return (
    <div id="app">
      <div className="shell-root">
        <header className="brand" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            className="t-btn" 
            style={{ fontSize: "0.8rem", padding: "4px 8px" }}
            onClick={() => dispatch({ type: "setActiveView", view: "map" })}
          >
            ◀ Map
          </button>
          <span className="brand-text">ibeetkidz Workshop</span>
        </header>
        <TrainModeProvider>
          <LoopSelectionProvider>
            <div className={"shell-grid" + (sideRail ? " shell-grid--rail" : "")}>
              <Palette activeId={active.id} />
              <header className="options-bar">
                <OptionsBar tool={active} />
              </header>
              <main className="canvas">
                <Canvas />
              </main>
              {sideRail && Rail && (
                <aside className="rail" data-rail={active.id}>
                  <Rail />
                </aside>
              )}
              <PlayBar
                watching={watching}
                onToggleWatch={() => setWatching((w) => !w)}
              />
            </div>
            <TracksRegion />
            {sheetRail && Rail && (
              <RailSheet
                toolId={active.id}
                open={sheetOpen}
                onToggle={() => setSheetOpen((o) => !o)}
              >
                <Rail />
              </RailSheet>
            )}
            {watching && <VizPanel onClose={() => setWatching(false)} />}
          </LoopSelectionProvider>
        </TrainModeProvider>
      </div>
    </div>
  );
};

// The Tracks strip lives below the play bar as its own flex row, mounted only
// once the kid has a train (≥2 cars or after "Send to Tracks").
const TracksRegion: FC = () => (useTrainVisible() ? <TracksStrip /> : null);
