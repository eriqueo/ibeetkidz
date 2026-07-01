# iBeetKidz Status Log

**Date:** July 1, 2026
**Current Phase:** Three-Zone UI Refactor (Data-Driven Migration)

> **Purpose:** This document tracks the current implementation state, what was just completed, what is currently blocking, and the immediate next steps for the engineering agents. It is highly volatile and should be updated after every major work session.

---

## 1. Current State

The project is transitioning from a hybrid HTML/Phaser state with hardcoded layouts to a fully data-driven, 100% Phaser pixel-art game based on Tiled maps and the "Three-Zone" UI rule (Top Bar, Field, Bottom Bar).

### Recently Completed
*   **Art Assets:** All required sprite assets for the Three-Zone refactor have been generated and committed to `src/assets/sprites/`. This includes:
    *   Nav buttons (left/right, idle/pressed)
    *   Car type switchers (boxcar/tanker/hopper/flatcar, idle/pressed)
    *   Transport controls (stop/play/loop/tempo up/down, idle/pressed)
    *   Instrument characters (frog/drums, chipmunk/mic, cat/guitar, alien/violin) with passive/hover/active states.
    *   Clean base plates (empty header and transport panels).
*   **Workshop Base Plate:** The Workshop base plate (`workshop-scene-base.png`) was inpainted to remove all baked-in text (SONG, TEMPO, SPEED, STOP/PLAY/LOOP), leaving only empty LCD frames.
*   **Delegation Plan:** Created `UI_REFACTOR_DELEGATION.md` outlining the exact steps for the code agents to implement the new Tiled maps and refactor the scene classes.

### What is Working
*   All four scenes render full-bleed.
*   The sequencer grid renders in the boxcar interior and updates from the project model.
*   The five satellite tool panels are Phaser-native and open/close correctly.
*   168 unit tests pass. Typecheck is clean.

---

## 2. Immediate Next Steps (The Engineering Handoff)

The immediate priority is to execute the instructions in `UI_REFACTOR_DELEGATION.md`. This work is currently **delegated to the Claude code agents**.

### Step 1: Update Tiled Maps
Update `workshop.json`, `yard.json`, and `track.json` to place the new sprites into the `InteractiveObjects` layer, defining the Top Bar, Field, and Bottom Bar zones. Assign `id`, `type`, and `action` properties to all interactive elements.

### Step 2: Refactor Scene Classes
Rewrite `WorkshopScene.ts`, `YardScene.ts`, and `TrackScene.ts` to be generic interpreters of the Tiled JSON data.
*   Remove all hardcoded layout logic (`buildChrome()`, `layoutChrome()`, manual coordinate math).
*   Spawn sprites based on the JSON and wire them to the `EventBus` based on their `action` property.
*   Implement universal press animations (scale down, shift y) and instrument hover/active state swaps.

### Step 3: Asset Pipeline Cleanup
Update `assets.ts` to register all new sprites. Ensure the preloader loads them. Remove references to obsolete baked UI base plates or manual hit-area rectangles.

---

## 3. Known Bugs & Future Work (Post-Refactor)

Once the Three-Zone data-driven architecture is in place, the following issues must be addressed:

1.  **LCD Text Rendering:** Ensure the live BPM and Car Number text objects in the Workshop render correctly inside the newly empty LCD frames on the transport panel, using the correct dark plum text color on the warm cream background.
2.  **Lane Delete UI:** Add a `✕` hit-area on the left edge of each lane row in the Workshop grid to emit `workshop-layer-delete`.
3.  **Yard Assembly Line:** Implement the visual holding area for cars and the crane animation for train assembly.
4.  **Track Playback Sync:** Rewrite the audio engine integration so the physical position of the train passing the crossing signal dictates playback.
5.  **Audio Verification:** Thoroughly test all satellite tool panels with real audio (mic recording, FX, pad playback, beat grid, theremin).
