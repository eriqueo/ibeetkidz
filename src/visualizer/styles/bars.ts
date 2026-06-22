// Calm spectrum bars — a clean, trail-free equalizer. Each frame fully clears
// to the theme ground (no smear, no strobe) and draws rounded bars rising from
// the floor, warm→cool across the band. Gentle by design for the Watch panel.

import type { VisualFrame, VisualStyle } from "../../ports/renderer-port.ts";
import type { Project } from "../../core/types.ts";

const GROUND = "#29242e"; // theme ground (Gruvbox-dark × Dracula)
// Warm→cool ramp reused from the theme palette; soft, not neon.
const PALETTE = ["#fe8019", "#fabd2f", "#b8bb26", "#79c0e8", "#bd93f9"];

export const barsStyle: VisualStyle = {
  id: "spectrum-bars",
  label: "Bars",

  draw(ctx: CanvasRenderingContext2D, frame: VisualFrame, _project: Project): void {
    const { width: w, height: h } = ctx.canvas;

    // Hard clear each frame → no trails, no accumulation, no flashing.
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, w, h);

    const bars = 28;
    const step = Math.max(1, Math.floor(frame.spectrum.length / bars));
    const gap = 3;
    const barW = w / bars;
    const radius = Math.min(8, barW / 2 - gap);

    for (let i = 0; i < bars; i++) {
      // Average a small window so the bars move smoothly instead of jittering.
      let sum = 0;
      for (let k = 0; k < step; k++) sum += frame.spectrum[i * step + k] ?? 0;
      const v = sum / step / 255;
      const bh = Math.max(2, v * h * 0.78);
      const x = i * barW + gap / 2;
      const bw = barW - gap;
      const y = h - bh;

      ctx.fillStyle = PALETTE[i % PALETTE.length] ?? "#bd93f9";
      // Rounded-top bar (roundRect is widely supported; fall back to a rect).
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, bw, bh, [radius, radius, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, bw, bh);
      }
    }
  },
};
