// The single, strict boundary between React (UI) and Phaser (rendering).
//
// React never reaches into Phaser objects; Phaser never touches the DOM. They
// talk only through these typed events. Adding a new cross-boundary message
// means adding one entry to `EventMap` — the payloads stay type-checked on both
// sides.
import Phaser from "phaser";
import type { LaneKind, CarType, EffectId, ThereminWave, AppView } from "../core/types.ts";
import type { SynthInstrumentId } from "../core/instruments.ts";

export interface EventMap {
  // Phaser -> React: a scene finished `create()` and is ready to receive state.
  "current-scene-ready": [scene: Phaser.Scene];
  // Phaser -> React: the kid tapped a car sprite in the Yard.
  "car-selected": [partId: string];
  // Phaser -> React: a transport button was pressed in the scene.
  "transport-play": [mode: "loop" | "ride"];
  "transport-stop": [];
  "tempo-changed": [delta: number]; // e.g., +10 or -10
  // Phaser -> React (Yard): the kid picked a palette car (selection reflected;
  // React makes it the active car so edit/delete target it).
  "yard-car-selected": [partId: string];
  // Tiled hit -> YardScene: the kid tapped the "couple" (Add to Train) button.
  // YardScene runs the crane animation, then emits `yard-add-to-train` on its
  // onComplete (intent in, animated dispatch out). Handled in the scene.
  "yard-add": [];
  // Tiled hit -> YardScene: the kid tapped "Send to Track". YardScene runs the
  // departure animation, then emits `yard-send-to-track`. Handled in the scene.
  "yard-depart": [];
  // Phaser -> React (Yard): the crane finished dropping a car on the line.
  // Fires from inside the tween's onComplete so state follows the animation.
  "yard-add-to-train": [partId: string];
  // Phaser -> React (Yard): the assembled train has departed; navigate to Track.
  "yard-send-to-track": [];
  // Tiled hit -> React (Yard): pop the last car off the assembled train.
  "yard-remove-from-train": [];
  // Tiled hit -> React (Yard): open the Workshop on the active (selected) car.
  "yard-edit-car": [];
  // Tiled hit -> React (Yard): delete the active (selected) car from the library.
  "yard-remove-car": [];
  // Tiled hit -> React (Yard): travel to another view.
  "yard-nav": [view: AppView];
  // Tiled hit -> React (Track): travel to another view.
  "track-nav": [view: AppView];
  // Phaser -> React (Track): a car on the oval was tapped — toggle its tarp
  // (mute). The payload is the train slot's instanceId.
  "track-car-mute-toggled": [instanceId: string];
  // Tiled hit -> React (Map): travel to a destination (guarded for Track).
  "map-nav": [view: AppView];
  // Tiled button -> React (Workshop): top-bar nav plaques (Map / Send to Yard).
  "nav-map": [];
  "nav-yard": [];
  // Tiled button -> WorkshopScene: toggle the car-type picker dropdown (handled
  // inside the scene; choosing a tile emits `workshop-car-type-changed`).
  "toggle-car-picker": [];
  // Phaser -> React (Workshop): a sequencer cell was tapped; `on` is the desired
  // next state (the scene shows it optimistically; the store flip is the truth).
  "workshop-cell-toggled": [cell: { layerId: string; stepIndex: number; on: boolean }];
  // Phaser -> React (Workshop): an instrument icon was tapped to add a lane.
  "workshop-instrument-added": [kind: LaneKind, instrumentId: string];
  // Phaser -> React (Workshop): a melody instrument (guitar/piano) was tapped —
  // create a melody lane voiced by that synth and open the note editor on it.
  "workshop-add-melody": [instrument: SynthInstrumentId];
  // Phaser -> React (Workshop): the kid picked a (cosmetic) car type.
  "workshop-car-type-changed": [carType: CarType];
  // Tiled button -> WorkshopScene: SEND TO YARD — the scene plays the car
  // slide-out (+ whistle), THEN emits `workshop-car-departed` for React.
  "workshop-send-to-yard": [];
  // WorkshopScene -> React (Workshop): the slide-out finished; travel to the
  // Yard (the finished car is already in the library palette there).
  "workshop-car-departed": [];
  // Phaser -> React (Workshop): a lane row was tapped (selection highlight).
  "workshop-layer-selected": [layerId: string];
  // Phaser -> React (Workshop): painted toolbar actions (all in-canvas now).
  "workshop-open-tool": [toolId: string | null]; // open/close a satellite panel
  "workshop-nav": [view: AppView];               // travel to another view
  // Add a FRESH EMPTY car to the library (clears the board — design doc §5).
  // The optional carType comes from the NEW CAR dropdown picker tile.
  "workshop-new-car": [carType?: CarType];
  "workshop-surprise": [];                        // seeded "surprise me" generation
  // Phaser -> React (Workshop): delete a lane / open the piano-roll for a lane.
  "workshop-layer-delete": [layerId: string];
  "workshop-edit-melody": [layerId: string];
  // Phaser -> React (Workshop): toggle the mute state of a lane.
  "workshop-layer-muted": [layerId: string];
  // Phaser -> React (Workshop): toggle a note in the piano-roll editor.
  "tool-melody-toggle": [stepIndex: number, row: number];
  // Instrument editor (AR-016): toggle an existing note's ×2 double-beat roll.
  "tool-melody-double": [stepIndex: number, row: number];
  // Instrument editor control deck → the lane being edited (0..1 values).
  "tool-lane-wobble": [value: number];
  "tool-lane-crunch": [value: number];
  "tool-lane-volume": [value: number];

  // ── Satellite tool panels (Phaser) -> React (audio/state) ──────────────────
  // The kid closed the open tool panel.
  "tool-closed": [];
  // My Voice: hold-to-record (down = true, release = false).
  "tool-voice-record": [start: boolean];
  // My Voice: a funny-effect tile was tapped.
  "tool-voice-fx": [effectId: EffectId];
  // My Voice: send the take to the car as a beat lane or a melody (notes) lane.
  "tool-voice-send": [as: "beat" | "notes"];
  // Voice Keys: hold-to-sing (down = true, release = false).
  "tool-keys-record": [start: boolean];
  // Voice Keys: an in-scale key was tapped (scale degree / row).
  "tool-keys-audition": [row: number];
  // Voice Keys: send the take to the car as a melody lane.
  "tool-keys-send": [];
  // Sound Pads: a pad was hit (builtin assetId or recorded clip id).
  "tool-pads-play": [padId: string];
  // Beat Maker: a step cell was toggled for a drum row.
  "tool-beat-toggle": [drumId: string, stepIndex: number];
  // Magic Pad: pointer activity over the XY zone (x,y normalized 0..1, y from top).
  "tool-magic-pointer": [phase: "down" | "move" | "up", x: number, y: number];
  // Magic Pad: oscillator shape chosen.
  "tool-magic-wave": [wave: ThereminWave];
  // Magic Pad: toggle performance recording.
  "tool-magic-record": [];
  // Magic Pad: send the captured performance to the car.
  "tool-magic-send": [];
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
