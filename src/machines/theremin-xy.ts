// Theremin / XY pitch pad: drag your finger across the pad — X = pitch,
// Y = timbre/filter. Resolved live (the one non-baked machine). The pad itself
// is real and wired to SoundPort's real-time XY hooks; the synth voice behind
// setThereminXY is the build-out work.

import type { Machine, MachineContext } from "../core/machine.ts";
import type { ThereminWave } from "../ports/sound-port.ts";
import { attachPointer } from "../core/input-router.ts";

const WAVES: { wave: ThereminWave; label: string; emoji: string }[] = [
  { wave: "triangle", label: "Soft", emoji: "🔺" },
  { wave: "sine", label: "Smooth", emoji: "🌊" },
  { wave: "square", label: "Buzzy", emoji: "🟦" },
  { wave: "sawtooth", label: "Sharp", emoji: "🪚" },
];

export const thereminXyMachine: Machine = {
  id: "theremin-xy",
  label: "Magic Pad",
  icon: "✨",

  mount(host: HTMLElement, ctx: MachineContext): void {
    host.innerHTML = "";
    host.classList.add("machine", "machine--theremin");

    const pad = document.createElement("div");
    pad.className = "xy-pad";
    pad.innerHTML = `<div class="xy-dot" hidden></div>
      <p class="xy-hint">Drag your finger to play! ✨</p>`;
    const dot = pad.querySelector<HTMLDivElement>(".xy-dot")!;

    attachPointer(pad, (s) => {
      if (s.phase === "down") {
        ctx.sound.thereminOn();
        dot.hidden = false;
      }
      if (s.phase === "up") {
        ctx.sound.thereminOff();
        dot.hidden = true;
        return;
      }
      // X = pitch (left→right low→high), Y inverted so up = brighter.
      ctx.sound.setThereminXY(s.x, 1 - s.y);
      dot.style.left = `${s.x * 100}%`;
      dot.style.top = `${s.y * 100}%`;
    });

    host.appendChild(pad);
  },

  mountOptions(host: HTMLElement, ctx: MachineContext): void {
    host.innerHTML = "";
    const group = document.createElement("div");
    group.className = "opt-choices";
    WAVES.forEach((w, i) => {
      const b = document.createElement("button");
      b.className = "opt-choice";
      if (i === 0) b.classList.add("active"); // matches the adapter default
      b.innerHTML = `<span>${w.emoji}</span><span>${w.label}</span>`;
      b.addEventListener("click", () => {
        ctx.sound.setThereminWaveform(w.wave);
        group
          .querySelectorAll("button")
          .forEach((other) => other.classList.toggle("active", other === b));
      });
      group.appendChild(b);
    });
    host.appendChild(group);
  },

  onEnter(): void {},
  onExit(ctx: MachineContext): void {
    ctx.sound.thereminOff();
  },
};
