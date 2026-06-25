# iBeetKidz Architecture Refactor Plan

## The Core Problem

The current application suffers from a "lipstick on a pig" architecture. It uses Phaser to render static background images, but implements all interactivity (sequencer grids, transport controls, car palettes) using HTML `<div>` overlays positioned absolutely over the canvas via React.

This approach is fragile, scales poorly across device sizes, and critically, fails to deliver the cohesive "16-bit SNES game" feel. In a true pixel-art game, the UI *is* the game world. The sequencer grid should be the literal side of the boxcar sprite. The buttons should be interactive sprites that depress when clicked.

## The Solution: Phaser-Native Architecture

We must shift the boundary between React and Phaser.

**React (The Thin Shell):**
- Owns the global state (`project-state.ts`, `store.ts`)
- Owns the audio engine (`audio-engine.ts`, Tone.js)
- Owns the routing between views
- Hosts the Phaser canvas

**Phaser (The Game World):**
- Owns **100% of the visual rendering and interactivity**
- Sequencer cells are `Phaser.GameObjects.Sprite` instances with `setInteractive()`
- Transport controls are clickable sprites with down-states
- Instrument icons are draggable sprites
- Emits events via `EventBus` to tell React what changed

## Stepwise Refinement Strategy

This is a significant rewrite. To prevent regressions and ensure CCC can execute it reliably, we will break it down into three distinct, sequential phases. Each phase will have its own dedicated agent prompt.

### Phase 1: The Event Bridge & TrackScene
*Goal: Establish the communication pattern and migrate the simplest scene.*
1. Expand `EventMap` in `src/game/EventBus.ts` to include transport commands (`play-pressed`, `stop-pressed`, `speed-changed`).
2. Update `Track.tsx` to listen for these events and call `engine.playRide()`, etc.
3. Rewrite `TrackScene.ts` to render the transport controls (Play, Stop, Speed, Direction) as interactive Phaser sprites instead of relying on React overlays.
4. Remove the HTML overlays from `Track.tsx`.

### Phase 2: YardScene (The Assembly Line)
*Goal: Migrate drag-and-drop and complex state rendering.*
1. Expand `EventMap` for Yard actions (`car-added-to-train`, `train-sent-to-track`).
2. Update `YardScene.ts` to make the palette car sprites interactive (clickable/draggable).
3. Implement the "Add to Train" and "Send to Track" buttons as Phaser sprites.
4. Remove the HTML overlays from `Yard.tsx`.

### Phase 3: WorkshopScene (The Sequencer)
*Goal: The hardest piece — migrating the step sequencer grid into Phaser.*
1. Expand `EventMap` for sequencer actions (`cell-toggled`, `instrument-dropped`).
2. Rewrite `WorkshopScene.ts` from scratch (currently 23 lines).
3. Build the sequencer grid inside Phaser: a matrix of interactive sprites mapped to the boxcar's side.
4. Build the instrument shelf as draggable sprites.
5. Build the car-type picker as clickable sprites.
6. Gut `Workshop.tsx` (currently 164 lines) down to just the canvas host and event listeners.

## Next Steps
I will now generate three precise CCC agent prompts (`AGENT_PROMPT_REFACTOR_PHASE_1.md`, etc.) that execute this plan.
