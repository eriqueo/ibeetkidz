// The data-driven "Machine" contract — iBeetKidz's analog of the kidpix Tool
// contract. Adding a new machine (synth, sampler, etc.) means supplying this
// object, not touching the plumbing. A machine turns raw input into Commands
// and renders its own UI surface into a host element.

import type { Command, Project } from "./types.ts";
import type { SoundPort } from "../ports/sound-port.ts";
import type { RngPort } from "./rng.ts";

/** Everything a machine is allowed to touch, injected so machines stay testable. */
export interface MachineContext {
  readonly sound: SoundPort;
  readonly rng: RngPort;
  /** Machines emit Commands; the app reduces + persists them. */
  dispatch(cmd: Command): void;
  /** Current project snapshot (read-only). */
  getProject(): Project;
}

export interface Machine {
  readonly id: string;
  readonly label: string;
  /** Emoji/icon for the chunky kid toolbar. */
  readonly icon: string;
  /** Build the machine's UI into `host`. Called once when first shown. */
  mount(host: HTMLElement, ctx: MachineContext): void;
  /** Machine gained focus (kid switched to it). */
  onEnter(ctx: MachineContext): void;
  /** Machine lost focus. Stop any machine-local audio/animation here. */
  onExit(ctx: MachineContext): void;
}

export interface MachineRegistry {
  readonly machines: readonly Machine[];
  get(id: string): Machine | undefined;
}

export function createRegistry(machines: readonly Machine[]): MachineRegistry {
  const byId = new Map(machines.map((m) => [m.id, m]));
  return { machines, get: (id) => byId.get(id) };
}
