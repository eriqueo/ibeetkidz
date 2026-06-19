// Sound Pads: a grid of big colorful pads. Tap = trigger a built-in sound or
// one of your recorded clips, instantly. The expressive "just jam" surface.

import type { Machine, MachineContext } from "../core/machine.ts";
import type { Clip } from "../core/types.ts";
import { BUILTIN_SOUNDS } from "../core/sound-catalog.ts";

let hostEl: HTMLElement | null = null;

function render(host: HTMLElement, ctx: MachineContext): void {
  host.innerHTML = "";
  host.classList.add("machine", "machine--pads");

  const grid = document.createElement("div");
  grid.className = "pad-grid";

  const addPad = (label: string, emoji: string, color: string, clip: Clip) => {
    const b = document.createElement("button");
    b.className = "pad";
    b.style.setProperty("--pad-color", color);
    b.innerHTML = `<span class="pad-emoji">${emoji}</span><span>${label}</span>`;
    b.addEventListener("pointerdown", () => {
      b.classList.add("hit");
      ctx.sound.play(clip);
    });
    b.addEventListener("animationend", () => b.classList.remove("hit"));
    grid.appendChild(b);
  };

  for (const s of BUILTIN_SOUNDS) {
    addPad(s.label, s.emoji, s.color, {
      id: `pad-${s.assetId}`,
      source: { kind: "builtin", assetId: s.assetId },
      effects: [],
      color: s.color,
      label: s.label,
    });
  }

  // Your recorded clips become pads too.
  for (const clip of Object.values(ctx.getProject().clips)) {
    if (clip.source.kind === "recording") {
      addPad(clip.label || "My Sound", "🎤", clip.color, clip);
    }
  }

  host.appendChild(grid);
}

export const soundPadsMachine: Machine = {
  id: "sound-pads",
  label: "Sound Pads",
  icon: "🥁",

  mount(host: HTMLElement, ctx: MachineContext): void {
    hostEl = host;
    render(host, ctx);
  },

  // Rebuild on enter so freshly-recorded clips appear as pads.
  onEnter(ctx: MachineContext): void {
    if (hostEl) render(hostEl, ctx);
  },
  onExit(ctx: MachineContext): void {
    ctx.sound.stopAll();
  },
};
