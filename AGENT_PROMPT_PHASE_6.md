# Refactor Phase 6: Dead Code Removal & UI Verification

## Context
Phase 5 successfully rebuilt the five satellite tools (My Voice, Voice Keys, Sound Pads, Beat Maker, Magic Pad) as Phaser-native panels in `src/game/tool-panels.ts`. They render inside `WorkshopScene` and emit events over the `EventBus` to React (`Workshop.tsx`), completely replacing the old HTML `<div role="dialog">` modals.

However, two gaps remain from Phase 5 that must be addressed in this phase:
1. **Dead Code:** The old React Canvas components for the satellite tools were left in `src/machines/tools.tsx` because they were entangled with shared helpers and `Shell.tsx`'s legacy routing.
2. **Audio/UX Verification:** The agent executing Phase 5 could not verify the audio logic (mic recording, theremin, playback) in their headless environment, nor could they interact with the panels to verify hit areas and UX flow.

**Goal:** Cleanly excise the dead HTML tool code, relocate shared helpers, and perform a live, interactive pass on the Phaser tool panels to fix any UX or audio bugs introduced during the migration.

## Tasks

### 1. Dead Code Excising (`src/machines/tools.tsx`)
The `tools.tsx` file is currently a dumping ground for the old tool modals, shared helpers, and the `LoopStage` (Home) mixing components.
- **Remove:** Delete `MyVoiceCanvas`, `VoiceKeysCanvas`, `SoundPadsCanvas`, `BeatMakerCanvas`, `MagicPadCanvas`, and their associated `Options` components.
- **Keep:** Do NOT delete `LoopStageCanvas`, `LoopStageRail`, `LoopTrack`, `LaneControls`, or `LoopSelectionProvider`. These are still used by the Home view.
- **Relocate:** The `laneColor` helper (and its dependencies `GROUP_COLORS`, `laneGroup`, etc.) is still imported by `Workshop.tsx`. Move this logic to a more appropriate core file (e.g., `src/core/instruments.ts` or `src/core/project-state.ts`) and update the imports.
- **Clean up `TOOLS` registry:** The `TOOLS` array at the bottom of `tools.tsx` still references the deleted components. Refactor this registry so `Shell.tsx` and `Workshop.tsx` don't depend on dead Canvas references.

### 2. `Shell.tsx` Cleanup
`Shell.tsx` still contains a legacy `switch` block that attempts to render the `Canvas` and `Rail` from the `TOOLS` registry if `activeView` isn't one of the four main views.
- Since all views are now explicitly routed (Map, Yard, Track, Workshop), this fallthrough is unreachable.
- Remove the legacy `Canvas` / `Rail` rendering logic and the `RailSheet` / `OptionsBar` components that are no longer used by the main shell.

### 3. Interactive UX & Audio Verification
Run `npm run dev` and manually interact with every tool panel in the browser. You must verify and fix:
- **My Voice:** Does holding the record button actually capture mic input? Do the FX tiles apply the effect and update the audio buffer? Do the "Send as Beat" and "Send as Notes" buttons successfully add a lane to the car?
- **Voice Keys:** Does the piano keyboard accurately repitch the recorded voice?
- **Sound Pads:** Do the pads play their assigned sounds? Are the hit areas sized correctly?
- **Beat Maker:** Does tapping a cell toggle the step? Does the drum sound preview play when toggled?
- **Magic Pad:** Does dragging on the XY zone play the theremin? Does the tracking dot follow the pointer? Does the performance recorder capture the drawing and send it to the car?

Fix any bugs you find directly in `Workshop.tsx` (the EventBus listeners) or `tool-panels.ts` (the UI layer).

## Definition of Done
- `npm run typecheck` passes.
- `src/machines/tools.tsx` no longer contains the old HTML Canvas components for the five satellite tools.
- `Shell.tsx` is simplified and no longer imports or attempts to render the legacy `Canvas`/`Rail` properties from the `TOOLS` registry.
- All five Phaser tool panels are fully functional in the browser, with audio recording, playback, and lane-sending working exactly as they did in Phase 4.
