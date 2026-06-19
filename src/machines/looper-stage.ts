// Looper / Stage: the persistent mix surface. One row per layer with mute,
// volume, and remove. Layers come from the Beat Maker and Sound Pads; this is
// where a kid balances the jam. Edits dispatch Commands; main reconciles live.

import type { Machine, MachineContext } from "../core/machine.ts";

let hostEl: HTMLElement | null = null;

function render(host: HTMLElement, ctx: MachineContext): void {
  host.innerHTML = "";
  host.classList.add("machine", "machine--stage");

  const project = ctx.getProject();
  const list = document.createElement("div");
  list.className = "layer-list";

  if (project.layers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "stub-note";
    empty.textContent =
      "No loops yet! Make a beat in the Beat Maker 🎛️, then mix it here.";
    host.appendChild(empty);
    return;
  }

  for (const layer of project.layers) {
    const clip = project.clips[layer.clipId];
    const row = document.createElement("div");
    row.className = "layer-row";
    row.style.setProperty("--row-color", clip?.color ?? "#888");

    const name = document.createElement("span");
    name.className = "layer-name";
    name.textContent = clip?.label ?? layer.clipId;

    const mute = document.createElement("button");
    mute.className = "layer-mute t-btn";
    mute.textContent = layer.muted ? "🔇" : "🔊";
    mute.addEventListener("click", () => {
      ctx.dispatch({ type: "toggleLayerMuted", layerId: layer.id });
      if (hostEl) render(hostEl, ctx);
    });

    const vol = document.createElement("input");
    vol.type = "range";
    vol.min = "0";
    vol.max = "1";
    vol.step = "0.01";
    vol.value = String(layer.volume);
    vol.className = "layer-vol";
    vol.addEventListener("input", () => {
      ctx.dispatch({
        type: "setLayerVolume",
        layerId: layer.id,
        volume: Number(vol.value),
      });
    });

    const remove = document.createElement("button");
    remove.className = "layer-remove t-btn";
    remove.textContent = "🗑️";
    remove.addEventListener("click", () => {
      ctx.dispatch({ type: "removeLayer", layerId: layer.id });
      if (hostEl) render(hostEl, ctx);
    });

    row.append(name, mute, vol, remove);
    list.appendChild(row);
  }

  host.appendChild(list);
}

export const looperStageMachine: Machine = {
  id: "looper-stage",
  label: "Loop Stage",
  icon: "🔁",

  mount(host: HTMLElement, ctx: MachineContext): void {
    hostEl = host;
    render(host, ctx);
  },
  onEnter(ctx: MachineContext): void {
    if (hostEl) render(hostEl, ctx);
  },
  onExit(): void {},
};
