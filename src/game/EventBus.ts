// The single, strict boundary between React (UI) and Phaser (rendering).
//
// React never reaches into Phaser objects; Phaser never touches the DOM. They
// talk only through these typed events. Adding a new cross-boundary message
// means adding one entry to `EventMap` — the payloads stay type-checked on both
// sides.
import Phaser from "phaser";
import type { LaneKind, CarType, EffectId, ThereminWave, AppView } from "../core/types.ts";

export interface EventMap {
  // Phaser -> React: a scene finished `create()` and is ready to receive state.
  "current-scene-ready": [scene: Phaser.Scene];
  // Phaser -> React: a transport button was pressed in the scene.
  "transport-play": [mode: "loop" | "ride"];
  "transport-stop": [];
  "tempo-changed": [delta: number]; // e.g., +10 or -10
  // Tiled hit -> React (Track): ride through a terrain. Lands on the NEXT bar,
  // holds a couple of bars, then the world goes back to normal — the Lemmings
  // move, applied to the song. Ephemeral: it never enters project state.
  "terrain-picked": [kind: string];
  // Phaser -> React (Yard): the kid picked a palette car (selection reflected;
  // React makes it the active car so edit/delete target it).
  "yard-car-selected": [partId: string];
  // Phaser -> React (Yard): the kid picked one assembled train SLOT. This is
  // deliberately an instanceId, separate from the palette's partId selection.
  "yard-train-selected": [instanceId: string | null];
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
  // Tiled hit -> React (Yard): remove the selected assembled slot, falling
  // back to the tail when this visit has no train selection.
  "yard-remove-from-train": [];
  // Tiled hit -> React (Yard): open the Workshop on the active (selected) car.
  "yard-edit-car": [];
  // Tiled hit -> React (Yard): delete the active (selected) car from the library.
  "yard-remove-car": [];
  // Phaser -> React (Yard): a car was DRAGGED to a new place in the train.
  // Carries the whole new order rather than a (from, to) pair, so the reducer
  // stays the pure `reorderTrain` it already was and there is no second way to
  // express an ordering that could disagree with the first.
  "yard-reorder-train": [instanceIds: readonly string[]];
  // Tiled hit -> React (Yard): travel to another view.
  "yard-nav": [view: AppView];
  // Tiled hit -> React (Track): travel to another view.
  "track-nav": [view: AppView];
  // Phaser -> React (Track): a car on the oval was tapped — toggle its tarp
  // (mute). The payload is the train slot's instanceId.
  "track-car-mute-toggled": [instanceId: string];
  // Phaser -> React (Track v3): a car on the side-scroller was tapped — select
  // that car and open the Workshop on it (edit on the fly, mid-ride included).
  "track-car-edit": [instanceId: string];
  // Phaser -> React (Track v3): the CLEAR plaque — empty the whole train.
  // Destructive, so React answers with ONE undo step and a "put it back" chip.
  "track-clear-train": [];
  // Phaser -> React (Track v3): the BACKWARDS switch — everything sampled
  // plays tape-reversed until toggled again. A performance, never saved.
  "track-backwards-toggled": [];
  // Phaser -> React (Track v3): a ride-mode switch on the job bar — the
  // geometry trio plus night/tunnel/tiny/giant. Latching and STACKING; the
  // payload is a `ModeKind`. A performance, never saved.
  "track-mode-toggled": [kind: string];
  // Phaser -> React (Track v3): hide/show both control decks and the
  // visualizer. The always-visible scene key emits the intent; React persists
  // the preference and pushes the resulting boolean back into the scene.
  "track-focus-toggled": [];
  // ── Track SEND flow (share/save the rendered song) ─────────────────────────
  // The scene owns the UI (plaque + result panel); React owns the audio render
  // and the share/download side effects, and pushes state back into the scene.
  // Phaser -> React (Track): the TARP keycap was tapped — arm/disarm the
  // cover-a-car gesture. Armed, the next car tapped is tarped instead of opened
  // in the Workshop; tap-to-edit stays the default it was designed to be.
  "track-tarp-armed": [];
  "track-send": [];        // SEND plaque (or Try Again) tapped → render the song
  "track-send-share": [];  // result panel: open the OS share sheet
  "track-send-save": [];   // result panel: download the WAV
  "track-send-close": [];  // dismiss the result panel
  // Tiled hit -> React (Map): travel to a destination (guarded for Track).
  "map-nav": [view: AppView];
  // Tiled button -> React (Workshop): top-bar nav plaques (Map / Send to Yard).
  "nav-map": [];
  "nav-yard": [];
  // Tiled button -> WorkshopScene: toggle the NEW CAR type picker dropdown.
  "toggle-car-picker": [];
  // Phaser -> React (Workshop): a sequencer cell was tapped; `on` is the desired
  // next state (the scene shows it optimistically; the store flip is the truth).
  "workshop-cell-toggled": [cell: { layerId: string; stepIndex: number; on: boolean }];
  // Phaser -> React (Workshop): an instrument icon was tapped to add a lane.
  "workshop-instrument-added": [kind: LaneKind, instrumentId: string];
  // Phaser -> React (Workshop): a melody CHARACTER was tapped (guitar / violin /
  // piano) — create a melody lane voiced by that character's synth and open the
  // note editor on it. The payload is the STATION id, not the synth id: the
  // violin's voice is `pluck`, and passing the synth through lost which
  // character the kid actually chose. `game/instrument-station.ts` maps one to
  // the other.
  "workshop-add-melody": [station: string];
  // Phaser -> React (Workshop): the kid painted the car from the colour picker.
  // Payload is a `CAR_COLORS` entry; the reducer refuses anything else and
  // refuses a colour another car is already wearing (see `setCarColor`).
  "workshop-car-color-picked": [color: string];
  // Phaser -> React (Workshop): the kid tapped a paint chip another car already
  // wears. The colour IS that car everywhere else in the app, so the chip is a
  // door into it rather than a refusal — open that car on the bench.
  "workshop-open-car": [partId: string];
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
  // The conductor's Tiled object -> WorkshopScene: open the whole-train
  // chalkboard. Its SOUNDS chip then uses `workshop-open-tool` to enter the
  // recording library without overloading this no-argument board intent.
  "workshop-open-board": [];
  // Add a FRESH EMPTY car to the library (clears the board — design doc §5).
  // The optional carType comes from the NEW CAR dropdown picker tile.
  "workshop-new-car": [carType?: CarType];
  "workshop-surprise": [];                        // seeded "surprise me" generation
  // Loop the ACTIVE car on its own (one bar), as opposed to `transport-play`
  // which lays out the whole train. The Workshop is where you edit ONE car, so
  // its LOOP button wants to hear that car alone.
  "workshop-loop-car": [];
  // Phaser -> React (Workshop): delete a lane / open the piano-roll for a lane.
  "workshop-layer-delete": [layerId: string];
  "workshop-edit-melody": [layerId: string];
  // Phaser -> React (Workshop): toggle the mute state of a lane.
  "workshop-layer-muted": [layerId: string];
  // Phaser -> React (Workshop): toggle a note in the piano-roll editor.
  "tool-melody-toggle": [stepIndex: number, row: number];
  // Instrument editor (AR-016): toggle an existing note's ×2 double-beat roll.
  "tool-melody-double": [stepIndex: number, row: number];
  // Instrument editor: the ×2 lever was thrown. React answers with an AUDIBLE
  // demonstration — one hit when it goes off, two when it comes on. "×2" is a
  // maths symbol on a switch aimed at four-year-olds; the only label that
  // works is the sound the switch makes.
  "tool-melody-twice-mode": [armed: boolean];
  // Instrument editor control deck → the lane being edited (0..1 values).
  "tool-lane-wobble": [value: number];
  "tool-lane-crunch": [value: number];
  "tool-lane-volume": [value: number];
  // …and the fader RELEASED, which is when the lane plays one note at its new
  // loudness. Separate from the streaming `tool-lane-volume` on purpose: a note
  // per drag sample would be a machine-gun.
  "tool-lane-volume-done": [value: number];

  // ── Undo ("Forgiving UX. Undo everywhere") ─────────────────────────────────
  // React -> every scene: something was just taken away; offer to put it back.
  // Emitted from the ONE dispatch funnel in `app/context.tsx`, classified by
  // `core/undoable.ts`, so a destructive command added later is covered without
  // touching any scene. Payload is the kid words for what was lost.
  "undo-offered": [lost: string];
  // React -> every scene: withdraw the offer (the history moved on).
  "undo-withdrawn": [];
  // Scene -> React: the kid tapped "put it back".
  "undo-requested": [];

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
  // Sound Library: a pad was hit (builtin assetId or recorded clip id). The
  // conductor's board routes here through its SOUNDS chip; the handler adds the
  // sound to the current car as one undoable step.
  "tool-pads-play": [padId: string];
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

// Dev-only: expose on window so the browser console can trigger navigation
// (e.g. window.__eb.emit('map-nav', 'workshop'))
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__eb = EventBus;
}
