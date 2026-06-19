// Shell: the chunky toolbar (machine switcher), the transport bar (play/stop,
// tempo, undo, save, surprise), and the host element each machine mounts into.
// Thin — it wires events to dispatch/engine and delegates everything else.

import type { MachineContext, MachineRegistry } from "../core/machine.ts";
import type { AudioEngine } from "../core/audio-engine.ts";
import type { Command, Project } from "../core/types.ts";

export interface ShellCallbacks {
  dispatch(cmd: Command): void;
  undo(): void;
  redo(): void;
  save(): void;
  surprise(): void;
  getProject(): Project;
}

export function buildShell(
  root: HTMLElement,
  registry: MachineRegistry,
  engine: AudioEngine,
  ctx: MachineContext,
  cb: ShellCallbacks,
): { showMachine(id: string): void } {
  root.innerHTML = `
    <header class="transport">
      <button data-act="play" class="t-btn">▶</button>
      <button data-act="stop" class="t-btn">■</button>
      <label class="tempo">Speed
        <input data-act="tempo" type="range" min="40" max="220" value="100" />
      </label>
      <button data-act="undo" class="t-btn">↶</button>
      <button data-act="redo" class="t-btn">↷</button>
      <button data-act="surprise" class="t-btn">🎲</button>
      <button data-act="save" class="t-btn">💾</button>
    </header>
    <nav class="machine-bar"></nav>
    <main class="machine-host"></main>
  `;

  const bar = root.querySelector<HTMLElement>(".machine-bar")!;
  const host = root.querySelector<HTMLElement>(".machine-host")!;
  const mounted = new Set<string>();
  let current = "";

  function showMachine(id: string): void {
    const machine = registry.get(id);
    if (!machine) return;
    if (current) registry.get(current)?.onExit(ctx);
    if (!mounted.has(id)) {
      const sub = document.createElement("section");
      sub.dataset.machine = id;
      host.appendChild(sub);
      machine.mount(sub, ctx);
      mounted.add(id);
    }
    host.querySelectorAll<HTMLElement>("section[data-machine]").forEach((s) => {
      s.hidden = s.dataset.machine !== id;
    });
    bar.querySelectorAll<HTMLElement>("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.machine === id);
    });
    current = id;
    cb.dispatch({ type: "setActiveMachine", machineId: id });
    machine.onEnter(ctx);
  }

  for (const m of registry.machines) {
    const b = document.createElement("button");
    b.dataset.machine = m.id;
    b.innerHTML = `<span class="m-icon">${m.icon}</span><span>${m.label}</span>`;
    b.addEventListener("click", () => showMachine(m.id));
    bar.appendChild(b);
  }

  root.querySelector('[data-act="play"]')!.addEventListener("click", () => {
    engine.reconcile(cb.getProject());
    engine.play();
  });
  root.querySelector('[data-act="stop"]')!.addEventListener("click", () => engine.stop());
  root.querySelector('[data-act="undo"]')!.addEventListener("click", () => cb.undo());
  root.querySelector('[data-act="redo"]')!.addEventListener("click", () => cb.redo());
  root.querySelector('[data-act="save"]')!.addEventListener("click", (e) => {
    cb.save();
    const btn = e.currentTarget as HTMLElement;
    btn.classList.remove("flash");
    void btn.offsetWidth; // restart the animation
    btn.classList.add("flash");
  });
  root.querySelector('[data-act="surprise"]')!.addEventListener("click", () => cb.surprise());
  root.querySelector('[data-act="tempo"]')!.addEventListener("input", (e) => {
    const bpm = Number((e.target as HTMLInputElement).value);
    cb.dispatch({ type: "setTempo", bpm });
    engine.setTempo(bpm);
  });

  return { showMachine };
}
