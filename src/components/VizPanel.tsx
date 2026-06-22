// The opt-in "Watch" visualizer. A CONTAINED panel (not a full-screen
// background): the RAF render loop runs only while this is mounted, so there's
// zero motion when the kid isn't watching. A style switcher cycles the calm
// styles; Expand promotes the same canvas to a full-screen overlay (Esc or tap
// to come back). All real-analyser-driven — the visualizer never lies.

import { useEffect, useRef, useState, type FC } from "react";
import { useApp } from "../app/context.tsx";
import { createVisualizer } from "../visualizer/visualizer.ts";
import type { RendererPort } from "../ports/renderer-port.ts";

export const VizPanel: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { engine, getProject } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizRef = useRef<RendererPort | null>(null);
  const [styles, setStyles] = useState<readonly { id: string; label: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [full, setFull] = useState(false);

  // Create the visualizer + start the loop on mount; stop + tear down on
  // unmount. Because the component is only mounted while watching, the loop is
  // never running when the panel is closed.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viz = createVisualizer(canvas, engine.getAnalyser(), getProject);
    vizRef.current = viz;
    setStyles(viz.listStyles());

    const fit = (): void => {
      const host = canvas.parentElement;
      if (!host) return;
      canvas.width = host.clientWidth;
      canvas.height = host.clientHeight;
    };
    fit();
    viz.start();

    const ro = new ResizeObserver(fit);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", fit);
    return () => {
      viz.stop();
      ro.disconnect();
      window.removeEventListener("resize", fit);
      vizRef.current = null;
    };
  }, [engine, getProject]);

  // Re-fit the backing store when the panel grows/shrinks (panel ⇄ fullscreen).
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    canvas.width = host.clientWidth;
    canvas.height = host.clientHeight;
  }, [full]);

  // Esc returns from fullscreen to the panel (never closes the panel outright).
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const cycle = (dir: number): void => {
    if (styles.length === 0) return;
    setIdx((i) => {
      const n = (i + dir + styles.length) % styles.length;
      const s = styles[n];
      if (s) vizRef.current?.setStyle(s.id);
      return n;
    });
  };

  return (
    <div className={"viz-panel" + (full ? " viz-fullscreen" : "")} data-viz-panel>
      <div className="viz-stage">
        <canvas className="viz-canvas" ref={canvasRef} />
        {full && (
          <button
            type="button"
            className="viz-tap-close"
            data-act="viz-collapse"
            aria-label="Back to panel"
            onClick={() => setFull(false)}
          />
        )}
      </div>
      <div className="viz-style-switch">
        <button
          type="button"
          className="t-btn"
          data-act="viz-prev"
          aria-label="Previous style"
          onClick={() => cycle(-1)}
        >
          ◀
        </button>
        <span className="viz-style-label">{styles[idx]?.label ?? "Watch"}</span>
        <button
          type="button"
          className="t-btn"
          data-act="viz-next"
          aria-label="Next style"
          onClick={() => cycle(1)}
        >
          ▶
        </button>
        <button
          type="button"
          className="t-btn viz-expand"
          data-act="viz-expand"
          aria-label={full ? "Shrink" : "Expand"}
          onClick={() => setFull((f) => !f)}
        >
          {full ? "🗗" : "⛶"}
        </button>
        <button
          type="button"
          className="t-btn viz-close"
          data-act="viz-close"
          aria-label="Close watch"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
