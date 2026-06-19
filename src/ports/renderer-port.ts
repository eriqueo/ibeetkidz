// RendererPort: draws the visualizer. Decoupled from audio so visual styles
// are pluggable and the "visualizer never lies" invariant is enforced — it is
// driven only by real analyser data + project state.

import type { Project } from "../core/types.ts";

export interface VisualFrame {
  /** Time-domain waveform, -1..1. */
  readonly waveform: Float32Array;
  /** Frequency magnitudes, 0..255. */
  readonly spectrum: Uint8Array;
}

export interface VisualStyle {
  readonly id: string;
  readonly label: string;
  draw(ctx: CanvasRenderingContext2D, frame: VisualFrame, project: Project): void;
}

export interface RendererPort {
  setStyle(styleId: string): void;
  listStyles(): readonly { id: string; label: string }[];
  start(): void;
  stop(): void;
}
