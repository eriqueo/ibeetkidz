# Refactor Phase 6: Full Phaser Immersion & UI/UX Fixes

## Context
Phase 5 migrated the satellite tools (Voice, Keys, Pads, Beat, Magic) from HTML modals to Phaser-native panels. However, the user has flagged several major UI/UX issues in the current state of the Workshop scene that break immersion and usability.

**Goal:** Completely remove all CSS/HTML overlay UI from the Workshop scene. Every button, text display, and interaction must happen inside the Phaser canvas, styled consistently with the pixel art, with proper press animations and full functionality.

## The Issues & Required Fixes

### 1. The HTML Overlay Must Die
**Issue:** The top nav (Map, New Car, To Yard) and left dock (Voice, Keys, Pads, Beat, Magic) are still HTML `<button>` elements floating over the canvas. This breaks immersion and creates two different interaction layers.
**Fix:**
- Move ALL of these buttons into `WorkshopScene.ts` as Phaser `Text` or `Image` sprites.
- They must use the pixel font (`Press Start 2P`) and match the game's aesthetic.
- The `WORKSHOP_TOOLBAR` in `scene-layout.ts` defines the coordinate layout for the top painted toolbar. Wire up these painted toolbar regions as hit areas to replace the top nav buttons.
- The left dock buttons should either be integrated into the scene visually or rendered as Phaser panels.

### 2. Press Animations Everywhere
**Issue:** The transport buttons (Play, Stop, Loop, Speed Up/Down) and other interactive elements in the scene lack a "pressed" state animation.
**Fix:**
- Every interactive element in the Phaser scene MUST have a visible pointer-down state.
- For text/sprite buttons, use a scale pop (e.g., `setScale(0.92)` on down, `setScale(1)` on up/out) or a tint change.
- Ensure the transparent hit areas over the painted transport buttons have a clear, visible flash or press state that feels responsive.

### 3. Speed Display is Broken
**Issue:** The Speed Up/Down buttons work (they emit `tempo-changed` and update the engine), but the visual number between the arrows on the painted panel never changes.
**Fix:**
- Add a Phaser `Text` object in `WorkshopScene.ts` positioned exactly over the painted speed display area.
- Pass the current `tempoBpm` from React to the scene (via `WorkshopModel`) and update this text object so it reflects the actual tempo.

### 4. No Way to Delete Instruments
**Issue:** Once an instrument lane is added to the boxcar grid, there is no UI to remove it.
**Fix:**
- Add a delete mechanism to the grid rows in `WorkshopScene.ts`.
- This could be a small "X" or trash can icon next to the lane label, or a long-press/double-tap interaction.
- When triggered, it must emit a new EventBus event (e.g., `workshop-layer-delete`) which React handles by dispatching `removeLayer`.

### 5. Missing Piano-Roll Melody Editor
**Issue:** The old `tools.tsx` had a BeepBox-style piano roll (a 7-row `MELODY_ROWS` grid) for editing melodies, but it was lost in the Phaser migration. The current Workshop grid only supports binary on/off steps (drum style).
**Fix:**
- Reintroduce the piano-roll editing interface.
- When a melody lane is selected, the user needs a way to edit pitches, not just toggle steps.
- This could be a new Phaser tool panel (e.g., `MelodyEditorPanel`) or an expansion of the main grid when a melody lane is active.
- It must allow placing notes across `STEP_COUNT` columns and `MELODY_ROWS` rows, emitting an event to update the `notes` array in the layer state.

## Definition of Done
- `src/components/Workshop.tsx` contains NO HTML `<button>` elements for navigation or tools.
- Every interactive Phaser object provides visual feedback on pointer down.
- The tempo display in the transport panel accurately shows the current BPM.
- Users can delete instrument lanes from the car.
- Users can edit melody pitches using a piano-roll interface.
- `npm run typecheck` passes cleanly.
