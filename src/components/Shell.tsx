// The kidpix 4-region layout in React: palette (left), per-tool options bar
// (top), canvas (center), play bar (bottom), with the full-screen visualizer
// behind. Only the active tool renders, so panels can't stack.

import { useEffect, useRef, useState, type FC } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { TOOLS, type ToolDescriptor } from "../machines/tools.tsx";
import { createVisualizer } from "../visualizer/visualizer.ts";

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

const PlayBar: FC = () => {
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
    </footer>
  );
};

const Visualizer: FC = () => {
  const { engine, getProject } = useApp();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const fit = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    fit();
    const viz = createVisualizer(canvas, engine.getAnalyser(), getProject);
    viz.start();
    window.addEventListener("resize", fit);
    return () => {
      viz.stop();
      window.removeEventListener("resize", fit);
    };
  }, [engine, getProject]);
  return <canvas className="viz-canvas" ref={ref} />;
};

export const Shell: FC = () => {
  const project = useProject();
  const active = TOOLS.find((t) => t.id === project.activeMachineId) ?? TOOLS[0]!;
  const Canvas = active.Canvas;
  return (
    <div id="app">
      <Visualizer />
      <div className="shell-root">
        <div className="shell-grid">
          <Palette activeId={active.id} />
          <header className="options-bar">
            <OptionsBar tool={active} />
          </header>
          <main className="canvas">
            <Canvas />
          </main>
          <PlayBar />
        </div>
      </div>
    </div>
  );
};
