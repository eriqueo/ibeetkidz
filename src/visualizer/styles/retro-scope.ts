// Retro screensaver visualizer — Winamp/oscilloscope flavored. A glowing
// waveform line over a slowly shifting neon gradient, plus a mirrored spectrum
// of chunky bars along the bottom. Driven only by real analyser data.

import type { VisualFrame, VisualStyle } from "../../ports/renderer-port.ts";
import type { Project } from "../../core/types.ts";

// iBeetKidz dark theme (Gruvbox-dark × Dracula). The visualizer glows behind the
// cream-on-plum panels — the theme.css canvas runs it at mix-blend-mode: screen
// (~0.42 opacity), so these are picked to read as a calm, recessed glow on the
// #29242e ground rather than a neon rave.
const SPECTRUM = ["#fe8019", "#fabd2f", "#79c0e8", "#b8bb26", "#bd93f9"]; // orange → sun → sky (+ leaf, grape accents)
const WAVEFORM = "#ff79c6"; // brand pink

export const retroScopeStyle: VisualStyle = {
  id: "retro-scope",
  label: "Retro Scope",

  draw(ctx: CanvasRenderingContext2D, frame: VisualFrame, _project: Project): void {
    const { width: w, height: h } = ctx.canvas;

    // Fading trail instead of a hard clear → classic screensaver smear. A
    // heavier fade than before clears faster, so the scope reads as a calm glow
    // rather than a strobing neon rave.
    ctx.fillStyle = "rgba(41, 36, 46, 0.4)";
    ctx.fillRect(0, 0, w, h);

    // Chunky mirrored spectrum bars, cycling the warm→cool theme palette. Kept
    // shorter and semi-transparent so they sit back instead of flashing.
    const bars = 32;
    const step = Math.floor(frame.spectrum.length / bars);
    const barW = w / bars;
    ctx.globalAlpha *= 0.55;
    for (let i = 0; i < bars; i++) {
      const v = (frame.spectrum[i * step] ?? 0) / 255;
      const bh = v * h * 0.3;
      ctx.fillStyle = SPECTRUM[i % SPECTRUM.length] ?? WAVEFORM;
      ctx.fillRect(i * barW + 1, h - bh, barW - 2, bh);
    }
    ctx.globalAlpha /= 0.55;

    // Softly-glowing oscilloscope line — brand pink, gentler blur than before.
    ctx.lineWidth = 3;
    ctx.strokeStyle = WAVEFORM;
    ctx.shadowColor = WAVEFORM;
    ctx.shadowBlur = 8;
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
