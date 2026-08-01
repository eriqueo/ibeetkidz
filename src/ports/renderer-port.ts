// The visualizer's drawing contract. Decoupled from audio so visual styles are
// pluggable and the "visualizer never lies" invariant is enforceable — a style
// is handed real analyser data + project state and nothing else, so it has
// nothing to draw from except what was actually played.
//
// A `RendererPort` interface used to sit here too, describing the HOST's
// lifecycle (start/stop/setStyle/listStyles) for the DOM Watch panel. It went
// with that panel: the host is now `src/game/scene-visualizer.ts`, whose
// lifecycle is the Phaser scene's — it has no start/stop of its own to declare,
// and an interface with no implementations is a fence around an empty field.
// `VisualStyle` is the part that was ever really a port, and it is unchanged,
// which is why re-homing the visualizer was a hosting change and not a rewrite.

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
