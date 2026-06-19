// Sound Pads: a grid of big colorful pads. Tap = trigger a built-in sound or
// one of your recorded clips. STUB: UI shell only; pad triggering wired to
// SoundPort once the built-in pack loads.

import type { Machine, MachineContext } from "../core/machine.ts";

export const soundPadsMachine: Machine = {
  id: "sound-pads",
  label: "Sound Pads",
  icon: "🥁",
  mount(host: HTMLElement, _ctx: MachineContext): void {
    host.innerHTML = `<div class="machine machine--pads">
      <p class="stub-note">Sound Pads — coming next. 12 chunky pads of built-in
      sounds + your recordings.</p>
      <div class="pad-grid"></div>
    </div>`;
    // TODO(build): render pads from the loaded built-in pack + recorded clips;
    // on tap, dispatch addLayer / ctx.sound.play.
  },
  onEnter(): void {},
  onExit(ctx: MachineContext): void {
    ctx.sound.stopAll();
  },
};
