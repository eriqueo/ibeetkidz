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
  type ToolDescriptor,
} from "../machines/tools.tsx";
import { VizPanel } from "./VizPanel.tsx";

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
      <button
        className="t-btn"
        data-act="play"
        title="Play"
        onClick={() => {
          engine.reconcile(getProject());
          engine.play();
        }}
      >
        ▶
      </button>
      <button
        className="t-btn"
        data-act="stop"
        title="Stop"
        onClick={() => engine.stop()}
      >
        ■
      </button>
      <label className="tempo">
        Speed
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
      <button
        className={snap ? "t-btn active" : "t-btn"}
        data-act="snap"
        title="Snap to beat"
        onClick={() => {
          const next = !snap;
          setSnap(next);
          engine.setQuantize(next ? "beat" : "off");
        }}
      >
        🧲
      </button>
      <button className="t-btn" data-act="undo" title="Undo" onClick={undo}>
        ↶
      </button>
      <button className="t-btn" data-act="redo" title="Redo" onClick={redo}>
        ↷
      </button>
      <button
        className="t-btn"
        data-act="surprise"
        title="Surprise me"
        onClick={surprise}
      >
        🎲
      </button>
      <button
        className="t-btn"
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
        💾
      </button>
      <button
        className={watching ? "t-btn active" : "t-btn"}
        data-act="watch"
        title="Watch the sound"
        aria-pressed={watching}
        onClick={onToggleWatch}
      >
        👁
      </button>
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
  const isPhone = usePhoneLayout();
  const active = TOOLS.find((t) => t.id === project.activeMachineId) ?? TOOLS[0]!;
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
      </div>
    </div>
  );
};
