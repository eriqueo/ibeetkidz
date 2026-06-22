// Smooth "lava" blobs — soft radial glows that breathe with the overall volume
// and drift slowly across the panel. No sharp edges, no per-sample jitter: the
// motion comes from a slow internal phase, the SIZE from audio amplitude. The
// calmest of the three styles, made for the Watch panel / light-sensitivity.

import type { VisualFrame, VisualStyle } from "../../ports/renderer-port.ts";
import type { Project } from "../../core/types.ts";

// A slow, ever-advancing phase drives the lazy drift. Module-scoped mutable
// state is fine here — this is a rendering adapter, not core.
let phase = 0;
// Smoothed amplitude so the blobs swell and settle instead of twitching.
let level = 0;

// Soft theme hues for the three blobs (orange, grape, sky).
const BLOBS = [
  { hue: 28, dx: 0.0, dy: 0.0, speed: 1.0 },
  { hue: 270, dx: 2.1, dy: 1.3, speed: 0.7 },
  { hue: 200, dx: 4.2, dy: 3.7, speed: 1.3 },
];

export const blobStyle: VisualStyle = {
  id: "lava-blob",
  label: "Lava",

  draw(ctx: CanvasRenderingContext2D, frame: VisualFrame, _project: Project): void {
    const { width: w, height: h } = ctx.canvas;
    phase += 0.012; // slow, hypnotic drift

    // RMS of the waveform → a 0..1 loudness, smoothed toward the new value.
    let sum = 0;
    const wf = frame.waveform;
    for (let i = 0; i < wf.length; i++) sum += (wf[i] ?? 0) ** 2;
    const rms = Math.sqrt(sum / wf.length);
    level += (Math.min(1, rms * 3) - level) * 0.08;

    // Gentle wash to the theme ground for a soft melt (light trails, no strobe).
    ctx.fillStyle = "rgba(41, 36, 46, 0.18)";
    ctx.fillRect(0, 0, w, h);

    const minDim = Math.min(w, h);
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter"; // blobs blend like light, not paint

    for (const b of BLOBS) {
      const t = phase * b.speed;
      const cx = w * (0.5 + 0.28 * Math.sin(t + b.dx));
      const cy = h * (0.5 + 0.28 * Math.cos(t * 0.9 + b.dy));
      const r = minDim * (0.18 + 0.22 * level + 0.04 * Math.sin(t * 1.7));
      const lum = 24 + 26 * level; // dim base, brightening with the music
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `hsla(${b.hue}, 70%, ${lum}%, 0.9)`);
      grad.addColorStop(1, `hsla(${b.hue}, 70%, ${lum}%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = prev;
  },
};
