# iBeetKidz Status Log

**Date:** July 1, 2026
**Current Phase:** Three-Zone UI Refactor (Data-Driven Migration)

> **Purpose:** This document tracks the current implementation state, what was just completed, what is currently blocking, and the immediate next steps for the engineering agents. It is highly volatile and should be updated after every major work session.

---

## 1. Current State

The project is transitioning from a hybrid HTML/Phaser state with hardcoded layouts to a fully data-driven, 100% Phaser pixel-art game based on Tiled maps and the "Three-Zone" UI rule (Top Bar, Field, Bottom Bar).

### Recently Completed
*   **Engine Refactor:** The data-driven UI-sprite engine (`ui-scene.ts`, `ui-sprites.ts`) is built and deployed. It successfully reads Tiled maps and spawns the new interactive sprites.
*   **Workshop Phase 1:** The Workshop scene has been refactored to use the new engine. The field contains 4 instrument characters, and the bottom transport bar is active.
*   **Art Assets (Phase 2):** A new batch of high-quality, steampunk-styled pixel art sprites has been generated and committed to `src/assets/sprites/` to fix the visual regression of the initial refactor. This includes:
    *   `inst-piano` (husky dog on keyboards) in passive/hover/active states.
    *   `panel-header-v2` (an ornate wood/brass steampunk header panel to replace the plain cream bar).
    *   `btn-map`, `btn-newcar`, `btn-sendtoyard` (steampunk-framed buttons for the top bar).
    *   `btn-picker-*` (Boxcar, Tanker, Hopper, Flatcar tiles for the car-type dropdown).

### What is Working
*   The data-driven engine correctly interprets `type` and `action` from Tiled JSON and wires events to the EventBus.
*   The instrument hover/active state swaps work.
*   The deploy pipeline is healthy.

---

## 2. Immediate Next Steps (The Engineering Handoff)

The immediate priority is to integrate the new "Phase 2" art assets into the Workshop scene to complete the UI polish, and then migrate Yard and Track to the new engine.

### Step 1: Workshop UI Polish (Code Agent Task)
1.  **Header Panel:** Update `assets.ts` and `workshop.json` to use `panel-header-v2.png` instead of the plain `panel-header.png`.
2.  **Top Bar Buttons:** Add the `btn-map`, `btn-newcar`, and `btn-sendtoyard` sprites to `workshop.json` and place them over the new header panel.
3.  **Car Type Picker:** Implement the dropdown picker logic. When `NEW CAR` is clicked, spawn a Phaser Container holding the 4 car-type tiles (`btn-picker-*`). Clicking a tile should swap the boxcar art and close the picker.
4.  **Husky Piano:** Add the `inst-piano` sprite to the field in `workshop.json` and wire it to open the melody editor.
5.  **Text Labels:** Add text labels under all nav and transport buttons. The Tiled map should define a `label` property for each button, and `ui-scene.ts` should spawn a Phaser Text object below the sprite using the dark plum (`#2b2440`) font.
6.  **LCD Styling:** Fix the transport LCD text color. It should be dark plum (`#2b2440`) on the cream panel background, not green-on-dark.
7.  **Mobile Viewport:** Fix the Phaser `scale` config to use `Phaser.Scale.FIT` and `autoCenter: Phaser.Scale.CENTER_BOTH` so the canvas fills the mobile screen vertically.

### Step 2: Migrate Yard and Track
Once Workshop is polished, create `yard.json` and `track.json` using the same three-zone structure and migrate `YardScene.ts` and `TrackScene.ts` to use the generic `ui-scene.ts` engine.

---

## 3. Known Bugs & Future Work (Post-Refactor)

1.  **Mic Sprite Missing:** The chipmunk mic character is currently rendering without its instrument prop. Need to verify the sprite loading.
2.  **Lane Delete UI:** Add a `✕` hit-area on the left edge of each lane row in the Workshop grid to emit `workshop-layer-delete`.
3.  **Yard Assembly Line:** Implement the visual holding area for cars and the crane animation for train assembly.
4.  **Track Playback Sync:** Rewrite the audio engine integration so the physical position of the train passing the crossing signal dictates playback.
