# iBeetKidz Three-Zone UI Refactor Delegation

**Goal:** Refactor the UI architecture of all scenes (Workshop, Yard, Track) to follow the "Three-Zone" rule using a data-driven approach via Tiled map data, completely eliminating hardcoded UI layout logic in TypeScript.

All required sprite assets have been generated and committed to `src/assets/sprites/`.

## Architectural Principles
1. **Three-Zone Rule:** Every scene (except Map) has a Top Bar (navigation + mode switching), a Field (interactive manipulables), and a Bottom Bar (view-specific controls).
2. **Data-Driven Layout (Principle 4):** The layout of these three zones must be defined entirely in the Tiled map JSON (`src/assets/maps/*.json`). The TypeScript scene classes must act purely as interpreters of this data.
3. **No Baked UI:** Base plates (`bg-workshop`, etc.) must be clean environments. All panels, buttons, and instruments are standalone sprites placed by Tiled.

## Phase 1: Update the Tiled Maps
**Agent Prompt:**
> You need to update the Tiled map JSON files (`workshop.json`, `yard.json`, `track.json`) to implement the new Three-Zone UI architecture.
> 1. Add the new base plate panels to the maps: `panel-header` at the top, `panel-transport` at the bottom.
> 2. In the `InteractiveObjects` layer, define the UI buttons as objects with `type: "ui-button"`, `id` (e.g., `btn-nav-left`), and `action` (e.g., `nav-map`).
> 3. Define the field objects (e.g., instruments in the workshop) with `type: "instrument"`.
> 4. Do not hardcode any pixel coordinates in TypeScript; rely entirely on the Tiled JSON data for placement.

## Phase 2: Refactor Scene Classes
**Agent Prompt:**
> You need to rewrite the scene classes (`WorkshopScene.ts`, `YardScene.ts`, `TrackScene.ts`) to be generic interpreters of the Tiled map data.
> 1. Remove all hardcoded layout logic (e.g., `buildChrome()`, `layoutChrome()`, manual coordinate calculations).
> 2. In the `create()` method, parse the Tiled JSON and spawn sprites based on the `InteractiveObjects` layer.
> 3. Wire up interactivity based on the `action` property defined in the JSON.
> 4. Implement button state changes: when a pointer is down on a button, swap its texture to the `-pressed` version; swap back on pointer up.
> 5. Implement instrument state changes: passive (default), hover (pointer over), active (pointer down/playing).

## Phase 3: Asset Registration and Cleanup
**Agent Prompt:**
> You need to update the asset loading pipeline to include the new sprites.
> 1. Update `src/game/assets.ts` to register all new sprites in `src/assets/sprites/buttons/`, `src/assets/sprites/instruments/`, and `src/assets/sprites/panels/`.
> 2. Ensure the preloader correctly loads these assets before scene creation.
> 3. Remove any references to old baked UI base plates or obsolete hit-area rectangles.
> 4. Run the TypeScript compiler (`npx tsc --noEmit`) and unit tests (`npx vitest run`) to ensure a clean build.

## Expected Outcome
The scenes should visually render the new UI panels and buttons. Clicking buttons should trigger the appropriate actions (navigation, mode switching, transport controls) and show pressed states. Hovering over and clicking instruments should trigger their respective state animations. All layout must be derived from Tiled data, making future UI changes a matter of map editing rather than code refactoring.
