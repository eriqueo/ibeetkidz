// Retro screensaver visualizer — Winamp/oscilloscope flavored. A glowing
// waveform line over a slowly shifting neon gradient, plus a mirrored spectrum
// of chunky bars along the bottom. Driven only by real analyser data.

import type { VisualFrame, VisualStyle } from "../../ports/renderer-port.ts";
import type { Project } from "../../core/types.ts";

let hue = 200;

export const retroScopeStyle: VisualStyle = {
  id: "retro-scope",
  label: "Retro Scope",

  draw(ctx: CanvasRenderingContext2D, frame: VisualFrame, _project: Project): void {
    const { width: w, height: h } = ctx.canvas;
    hue = (hue + 0.6) % 360;

    // Fading trail instead of a hard clear → classic screensaver smear.
    ctx.fillStyle = "rgba(10, 6, 24, 0.25)";
    ctx.fillRect(0, 0, w, h);

    // Chunky mirrored spectrum bars.
    const bars = 32;
    const step = Math.floor(frame.spectrum.length / bars);
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = (frame.spectrum[i * step] ?? 0) / 255;
      const bh = v * h * 0.4;
      ctx.fillStyle = `hsl(${(hue + i * 6) % 360} 90% 55%)`;
      ctx.fillRect(i * barW + 1, h - bh, barW - 2, bh);
    }

    // Glowing oscilloscope line.
    ctx.lineWidth = 3;
    ctx.strokeStyle = `hsl(${(hue + 180) % 360} 100% 65%)`;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    const wf = frame.waveform;
    for (let i = 0; i < wf.length; i++) {
      const x = (i / (wf.length - 1)) * w;
      const y = h / 2 + (wf[i] ?? 0) * h * 0.3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  },
};
