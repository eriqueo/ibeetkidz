// Visualizer: owns the canvas + RAF loop, pulls real analyser data each frame,
// and delegates drawing to the active VisualStyle. Pauses when the tab is hidden.

import type { RendererPort, VisualFrame, VisualStyle } from "../ports/renderer-port.ts";
import type { Project } from "../core/types.ts";
import { retroScopeStyle } from "./styles/retro-scope.ts";

export function createVisualizer(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  getProject: () => Project,
  styles: readonly VisualStyle[] = [retroScopeStyle],
): RendererPort {
  const ctx = canvas.getContext("2d")!;
  const byId = new Map(styles.map((s) => [s.id, s]));
  let active: VisualStyle = styles[0] ?? retroScopeStyle;
  let raf = 0;

  const waveform = new Float32Array(analyser.fftSize);
  const spectrum = new Uint8Array(analyser.frequencyBinCount);

  const loop = () => {
    analyser.getFloatTimeDomainData(waveform);
    analyser.getByteFrequencyData(spectrum);
    const frame: VisualFrame = { waveform, spectrum };
    active.draw(ctx, frame, getProject());
    raf = requestAnimationFrame(loop);
  };

  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  function start(): void {
    if (raf) return;
    raf = requestAnimationFrame(loop);
  }
  function stop(): void {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  document.addEventListener("visibilitychange", onVisibility);

  return {
    setStyle: (id) => {
      const s = byId.get(id);
      if (s) active = s;
    },
    listStyles: () => styles.map((s) => ({ id: s.id, label: s.label })),
    start,
    stop,
  };
}
