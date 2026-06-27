// The single, strict boundary between React (UI) and Phaser (rendering).
//
// React never reaches into Phaser objects; Phaser never touches the DOM. They
// talk only through these typed events. Adding a new cross-boundary message
// means adding one entry to `EventMap` — the payloads stay type-checked on both
// sides.
import Phaser from "phaser";
import type { LaneKind, CarType } from "../core/types.ts";

export interface EventMap {
  // Phaser -> React: a scene finished `create()` and is ready to receive state.
  "current-scene-ready": [scene: Phaser.Scene];
  // Phaser -> React: the kid tapped a car sprite in the Yard.
  "car-selected": [partId: string];
  // Phaser -> React: a transport button was pressed in the scene.
  "transport-play": [mode: "loop" | "ride"];
  "transport-stop": [];
  "tempo-changed": [delta: number]; // e.g., +10 or -10
  // Phaser -> React (Yard): the kid picked a palette car (selection reflected).
  "yard-car-selected": [partId: string];
  // Phaser -> React (Yard): the crane finished dropping a car on the line.
  // Fires from inside the tween's onComplete so state follows the animation.
  "yard-add-to-train": [partId: string];
  // Phaser -> React (Yard): the assembled train has departed; navigate to Track.
  "yard-send-to-track": [];
  // Phaser -> React (Workshop): a sequencer cell was tapped; `on` is the desired
  // next state (the scene shows it optimistically; the store flip is the truth).
  "workshop-cell-toggled": [cell: { layerId: string; stepIndex: number; on: boolean }];
  // Phaser -> React (Workshop): an instrument icon was tapped to add a lane.
  "workshop-instrument-added": [kind: LaneKind, instrumentId: string];
  // Phaser -> React (Workshop): the kid picked a (cosmetic) car type.
  "workshop-car-type-changed": [carType: CarType];
  // Phaser -> React (Workshop): a lane row was tapped (selection highlight).
  "workshop-layer-selected": [layerId: string];
}

// Phaser's EventEmitter is untyped; we wrap it so call sites get autocomplete
// and payload checking without pulling in another dependency.
class TypedEventBus extends Phaser.Events.EventEmitter {
  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]): boolean {
    return super.emit(event as string, ...args);
  }
  on<K extends keyof EventMap>(
    event: K,
    fn: (...args: EventMap[K]) => void,
    context?: unknown,
  ): this {
    return super.on(event as string, fn as (...a: unknown[]) => void, context);
  }
  off<K extends keyof EventMap>(
    event: K,
    fn?: (...args: EventMap[K]) => void,
    context?: unknown,
    once?: boolean,
  ): this {
    return super.off(event as string, fn as (...a: unknown[]) => void, context, once);
  }
}

export const EventBus = new TypedEventBus();
