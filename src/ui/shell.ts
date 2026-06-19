// Shell: kidpix-style 4-region layout — tool palette (left column), per-tool
// options bar (top), canvas (center), and the play bar (bottom: transport +
// snap). Each machine is mounted into TWO hosts: its canvas surface (`mount`)
// and, optionally, its options surface (`mountOptions`). Inactive sections are
// hidden via the [hidden] attribute (see the global rule in style.css).

import type { MachineContext, MachineRegistry } from "../core/machine.ts";
import type { AudioEngine } from "../core/audio-engine.ts";
import type { Command, Project } from "../core/types.ts";
import type { QuantizeGrid } from "../core/quantize.ts";

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
    <div class="shell-grid">
      <nav class="palette"></nav>
      <header class="options-bar"></header>
      <main class="canvas"></main>
      <footer class="playbar">
        <button data-act="play" class="t-btn" title="Play">▶</button>
        <button data-act="stop" class="t-btn" title="Stop">■</button>
        <label class="tempo">Speed
          <input data-act="tempo" type="range" min="40" max="220" value="100" />
        </label>
        <button data-act="snap" class="t-btn active" title="Snap to beat">🧲</button>
        <button data-act="undo" class="t-btn" title="Undo">↶</button>
        <button data-act="redo" class="t-btn" title="Redo">↷</button>
        <button data-act="surprise" class="t-btn" title="Surprise me">🎲</button>
        <button data-act="save" class="t-btn" title="Save">💾</button>
      </footer>
    </div>
  `;

  const palette = root.querySelector<HTMLElement>(".palette")!;
  const optionsBar = root.querySelector<HTMLElement>(".options-bar")!;
  const canvas = root.querySelector<HTMLElement>(".canvas")!;
  const mounted = new Set<string>();
  let current = "";

  function showMachine(id: string): void {
    const machine = registry.get(id);
    if (!machine) return;
    if (current) registry.get(current)?.onExit(ctx);

    if (!mounted.has(id)) {
      const canvasSection = document.createElement("section");
      canvasSection.dataset.machine = id;
      canvas.appendChild(canvasSection);
      machine.mount(canvasSection, ctx);

      const optionsSection = document.createElement("section");
      optionsSection.dataset.options = id;
      if (machine.mountOptions) {
        machine.mountOptions(optionsSection, ctx);
      } else {
        // No knobs for this tool → label the bar so the region is never blank.
        optionsSection.className = "options-title";
        optionsSection.innerHTML =
          `<span class="options-icon">${machine.icon}</span>` +
          `<span>${machine.label}</span>`;
      }
      optionsBar.appendChild(optionsSection);
      mounted.add(id);
    }

    // Same [hidden] discipline for both hosts → exactly one of each is shown.
    canvas.querySelectorAll<HTMLElement>("section[data-machine]").forEach((s) => {
      s.hidden = s.dataset.machine !== id;
    });
    optionsBar
      .querySelectorAll<HTMLElement>("section[data-options]")
      .forEach((s) => {
        s.hidden = s.dataset.options !== id;
      });
    palette.querySelectorAll<HTMLElement>("button").forEach((b) => {
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
    palette.appendChild(b);
  }

  // ── Transport / play bar ──────────────────────────────────────────────────
  root.querySelector('[data-act="play"]')!.addEventListener("click", () => {
    engine.reconcile(cb.getProject());
    engine.play();
  });
  root
    .querySelector('[data-act="stop"]')!
    .addEventListener("click", () => engine.stop());
  root.querySelector('[data-act="undo"]')!.addEventListener("click", () => cb.undo());
  root.querySelector('[data-act="redo"]')!.addEventListener("click", () => cb.redo());
  root.querySelector('[data-act="save"]')!.addEventListener("click", (e) => {
    cb.save();
    const btn = e.currentTarget as HTMLElement;
    btn.classList.remove("flash");
    void btn.offsetWidth; // restart the animation
    btn.classList.add("flash");
  });
  root
    .querySelector('[data-act="surprise"]')!
    .addEventListener("click", () => cb.surprise());

  // Global "snap to beat" toggle — flips the on-beat quantizer on/off.
  let snapOn = true;
  root.querySelector('[data-act="snap"]')!.addEventListener("click", (e) => {
    snapOn = !snapOn;
    const grid: QuantizeGrid = snapOn ? "beat" : "off";
    engine.setQuantize(grid);
    (e.currentTarget as HTMLElement).classList.toggle("active", snapOn);
  });

  root.querySelector('[data-act="tempo"]')!.addEventListener("input", (e) => {
    const bpm = Number((e.target as HTMLInputElement).value);
    cb.dispatch({ type: "setTempo", bpm });
    engine.setTempo(bpm);
  });

  return { showMachine };
}
