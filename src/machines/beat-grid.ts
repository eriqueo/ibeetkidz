// Beat Grid: a simple 16-step drum machine that loops. STUB: UI shell only;
// step toggles dispatch toggleStep and the engine reconciles the transport.

import type { Machine, MachineContext } from "../core/machine.ts";

export const beatGridMachine: Machine = {
  id: "beat-grid",
  label: "Beat Maker",
  icon: "🎛️",
  mount(host: HTMLElement, _ctx: MachineContext): void {
    host.innerHTML = `<div class="machine machine--beat">
      <p class="stub-note">Beat Maker — coming next. Tap squares to build a
      looping beat across rows of sounds.</p>
      <div class="beat-rows"></div>
    </div>`;
    // TODO(build): render rows (one per drum sound) x 16 steps; tapping a cell
    // dispatches { type: "toggleStep" }; engine.reconcile schedules playback.
  },
  onEnter(): void {},
  onExit(): void {},
};
