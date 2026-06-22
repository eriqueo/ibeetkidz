// Visualizer: owns the canvas + RAF loop, pulls real analyser data each frame,
// and delegates drawing to the active VisualStyle. Pauses when the tab is hidden.

import type { RendererPort, VisualFrame, VisualStyle } from "../ports/renderer-port.ts";
import type { Project } from "../core/types.ts";
import { retroScopeStyle } from "./styles/retro-scope.ts";
import { barsStyle } from "./styles/bars.ts";
import { blobStyle } from "./styles/blob.ts";

// Calm styles lead; the (toned-down) retro scope is last. The Watch panel is
// opt-in, but defaulting to a gentle style respects light-sensitivity.
const DEFAULT_STYLES: readonly VisualStyle[] = [barsStyle, blobStyle, retroScopeStyle];

export function createVisualizer(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  getProject: () => Project,
  styles: readonly VisualStyle[] = DEFAULT_STYLES,
): RendererPort {
  const ctx = canvas.getContext("2d")!;
  const byId = new Map(styles.map((s) => [s.id, s]));
  let active: VisualStyle = styles[0] ?? retroScopeStyle;
  let raf = 0;

  const waveform = new Float32Array(analyser.fftSize);
  const spectrum = new Uint8Array(analyser.frequencyBinCount);

  // Respect prefers-reduced-motion: throttle to a slow cadence (low motion) and
  // cap brightness via a reduced global alpha, so the visualizer never strobes.
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let skip = 0;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (reduced && (skip = (skip + 1) % 6) !== 0) return; // ~10fps, gentle
    analyser.getFloatTimeDomainData(waveform);
    analyser.getByteFrequencyData(spectrum);
    const frame: VisualFrame = { waveform, spectrum };
    ctx.globalAlpha = reduced ? 0.5 : 1; // capped brightness under reduced-motion
    active.draw(ctx, frame, getProject());
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
