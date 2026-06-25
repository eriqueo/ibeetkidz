# Refactor Phase 3: WorkshopScene (The Sequencer)

## Context
Phase 3 of the Phaser-native architecture migration. This is the largest shift: moving the step sequencer grid and instrument shelf into Phaser.

## Tasks

### 1. Expand `src/game/EventBus.ts`
Add the following events to `EventMap`:
```typescript
  "workshop-cell-toggled": [layerId: string, stepIndex: number, row: number, length: number];
  "workshop-instrument-added": [instrumentId: string];
  "workshop-car-type-changed": [carType: string];
```

### 2. Update `src/components/Workshop.tsx`
- Remove the HTML step sequencer grid (`<div className="sequencer-grid">`).
- Remove the HTML instrument shelf.
- Remove the HTML car-type picker.
- Remove the HTML transport bar (handled via `transport-play`/`transport-stop` events from Phase 1).
- Keep only the `<PhaserGame>` and navigation buttons.
- Add `EventBus.on` listeners to dispatch the corresponding state updates to the store.

### 3. Rewrite `src/game/scenes/WorkshopScene.ts`
This scene must be expanded significantly.
- **The Grid:** Read the active car's layers from the store. For each step in each layer, render a Phaser sprite representing the cell. Map the grid coordinates to the painted boxcar interior.
  - Make cells interactive: `pointerdown` emits `"workshop-cell-toggled"`.
  - Update cell visuals (on/off frames) based on the store state.
- **The Playhead:** Render a vertical line or sprite that sweeps across the grid based on `engine.getTransportBar()`. Update its position in the scene's `update(delta)` loop.
- **The Instruments:** Render the available instruments as draggable sprites along the bottom shelf. Dropping an instrument on the grid emits `"workshop-instrument-added"`.
- **The Transport:** Render Play/Stop/Speed buttons in Phaser (reusing logic from Phase 1).
- **The Car Picker:** Render the 4 car type sprites (boxcar, tanker, hopper, flatcar) as clickable buttons. Emits `"workshop-car-type-changed"`.

## Definition of Done
- `npm run typecheck` passes.
- `Workshop.tsx` is stripped down to just the canvas and nav buttons.
- The sequencer grid is fully rendered and interactive within Phaser.
- Tapping a cell updates the data model and plays audio.
- The playhead visually sweeps across the Phaser grid during playback.
