// Beat Grid: a 16-step drum machine. One row per built-in drum; tapping a cell
// toggles that step. The engine reconciles the transport (main re-reconciles on
// dispatch while playing), so edits are heard live.

import type { Machine, MachineContext } from "../core/machine.ts";
import type { Clip, Layer } from "../core/types.ts";
import { STEP_COUNT } from "../core/types.ts";
import { DRUM_SOUNDS } from "../core/sound-catalog.ts";

const ROW_ID = (assetId: string): string => `beat-${assetId}`;

let hostEl: HTMLElement | null = null;

/** Ensure every drum row has a clip + an (initially empty) layer to toggle. */
function ensureRows(ctx: MachineContext): void {
  const project = ctx.getProject();
  for (const drum of DRUM_SOUNDS) {
    const id = ROW_ID(drum.assetId);
    if (!project.clips[id]) {
      const clip: Clip = {
        id,
        source: { kind: "builtin", assetId: drum.assetId },
        effects: [],
        color: drum.color,
        label: drum.label,
      };
      ctx.dispatch({ type: "addClip", clip });
    }
    if (!project.layers.some((l) => l.id === id)) {
      const layer: Layer = {
        id,
        clipId: id,
        volume: 0.9,
        muted: false,
        steps: new Array<boolean>(STEP_COUNT).fill(false),
      };
      ctx.dispatch({ type: "addLayer", layer });
    }
  }
}

function render(host: HTMLElement, ctx: MachineContext): void {
  host.innerHTML = "";
  host.classList.add("machine", "machine--beat");

  const rows = document.createElement("div");
  rows.className = "beat-rows";

  for (const drum of DRUM_SOUNDS) {
    const id = ROW_ID(drum.assetId);
    const layer = ctx.getProject().layers.find((l) => l.id === id);
    const steps = layer?.steps ?? new Array<boolean>(STEP_COUNT).fill(false);

    const row = document.createElement("div");
    row.className = "beat-row";
    row.style.setProperty("--row-color", drum.color);

    const label = document.createElement("button");
    label.className = "beat-label";
    label.innerHTML = `<span>${drum.emoji}</span>`;
    label.title = drum.label;
    // Tapping the label previews the sound.
    label.addEventListener("pointerdown", () =>
      ctx.sound.play({
        id,
        source: { kind: "builtin", assetId: drum.assetId },
        effects: [],
        color: drum.color,
        label: drum.label,
      }),
    );
    row.appendChild(label);

    for (let i = 0; i < STEP_COUNT; i++) {
      const cell = document.createElement("button");
      cell.className = "beat-cell";
      if (steps[i]) cell.classList.add("on");
      if (i % 4 === 0) cell.classList.add("downbeat");
      cell.addEventListener("pointerdown", () => {
        ctx.dispatch({ type: "toggleStep", layerId: id, index: i });
        const nowOn = !cell.classList.contains("on");
        cell.classList.toggle("on", nowOn);
        if (nowOn) {
          ctx.sound.play({
            id,
            source: { kind: "builtin", assetId: drum.assetId },
            effects: [],
            color: drum.color,
            label: drum.label,
          });
        }
      });
      row.appendChild(cell);
    }
    rows.appendChild(row);
  }

  host.appendChild(rows);
}

export const beatGridMachine: Machine = {
  id: "beat-grid",
  label: "Beat Maker",
  icon: "🎛️",

  mount(host: HTMLElement, ctx: MachineContext): void {
    hostEl = host;
    ensureRows(ctx);
    render(host, ctx);
  },
  onEnter(ctx: MachineContext): void {
    ensureRows(ctx);
    if (hostEl) render(hostEl, ctx);
  },
  onExit(): void {},
};
