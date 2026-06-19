// Looper / Stage: layer recorded loops and mix them. This is the persistent
// "what's playing" surface. STUB: UI shell only; layer add/mute/volume dispatch
// the matching Commands and the engine reconciles.

import type { Machine, MachineContext } from "../core/machine.ts";

export const looperStageMachine: Machine = {
  id: "looper-stage",
  label: "Loop Stage",
  icon: "🔁",
  mount(host: HTMLElement, _ctx: MachineContext): void {
    host.innerHTML = `<div class="machine machine--stage">
      <p class="stub-note">Loop Stage — coming next. Stack loops, mute/solo,
      and slide volumes to mix your jam.</p>
      <div class="layer-list"></div>
    </div>`;
    // TODO(build): render one row per layer with mute + volume; record-to-layer
    // button dispatches addLayer.
  },
  onEnter(): void {},
  onExit(): void {},
};
