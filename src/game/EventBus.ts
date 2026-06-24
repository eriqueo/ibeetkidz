// The single, strict boundary between React (UI) and Phaser (rendering).
//
// React never reaches into Phaser objects; Phaser never touches the DOM. They
// talk only through these typed events. Adding a new cross-boundary message
// means adding one entry to `EventMap` — the payloads stay type-checked on both
// sides.
import Phaser from "phaser";

export interface EventMap {
  // Phaser -> React: a scene finished `create()` and is ready to receive state.
  "current-scene-ready": [scene: Phaser.Scene];
  // Phaser -> React: the kid tapped a car sprite in the Yard.
  "car-selected": [partId: string];
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
