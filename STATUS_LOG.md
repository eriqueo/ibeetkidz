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
*   **Workshop UI Polish (delegation Phase 1 — DONE):** Integrated the Phase 2 steampunk assets. The Workshop now renders the ornate `panel-header-v2` with the `btn-map` / `btn-newcar` / `btn-sendtoyard` plaques; the New Car button toggles a car-type picker dropdown (`btn-picker-*` tiles, boxcar shows its `-selected` art) that swaps the car type and closes; the husky `inst-piano` was added to the field (opens the melody editor); transport buttons carry dark-plum captions (STOP/PLAY/LOOP/SLOW/FAST) via a Tiled `label` property + `ui-scene.ts`; the SONG/TEMPO LCD is dark plum on a cream chip; and the Phaser scale config is `FIT` + `CENTER_BOTH` (2560×1440). Gates green (tsc, 175 unit tests, vite build), verified via headless screenshots.
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

Workshop UI Polish (delegation Phase 1) is **complete** (see Recently Completed).
The immediate priority is now migrating Yard and Track to the new engine.

### Step 1: Workshop UI Polish (Code Agent Task) — ✅ DONE
1.  ✅ **Header Panel:** `workshop.json` uses `panel-header-v2` (registered in `ui-sprites.ts`).
2.  ✅ **Top Bar Buttons:** `btn-map` (`nav-map`), `btn-newcar` (`toggle-car-picker`), `btn-sendtoyard` (`nav-yard`).
3.  ✅ **Car Type Picker:** `toggle-car-picker` opens a Phaser container of the 4 `btn-picker-*` tiles; a tile emits `workshop-car-type-changed` and closes. (Note: no per-type open-boxcar base plate exists, so the field art itself is unchanged; the choice persists to the model and is reflected in Yard/Track.)
4.  ✅ **Husky Piano:** `inst-piano` field instrument → `workshop-add-melody piano` (opens the melody editor).
5.  ✅ **Text Labels:** Tiled `label` property + `ui-scene.ts` render a dark-plum caption under each icon button. (The nav plaques carry baked-in labels, so no caption is added to them.)
6.  ✅ **LCD Styling:** SONG/TEMPO now dark plum (`#2b2440`) on a cream chip.
7.  ✅ **Mobile Viewport:** `main.ts` scale is `Phaser.Scale.FIT` + `autoCenter: CENTER_BOTH` (2560×1440).

### Step 2: Migrate Yard and Track (NEXT)
Create `yard.json` and `track.json` using the same three-zone structure and migrate `YardScene.ts` and `TrackScene.ts` to use the generic `ui-scene.ts` engine, preserving all EventBus actions.

---

## 3. Known Bugs & Future Work (Post-Refactor)

1.  **Mic Sprite Missing:** The chipmunk mic character is currently rendering without its instrument prop. Need to verify the sprite loading.
2.  **Lane Delete UI:** Add a `✕` hit-area on the left edge of each lane row in the Workshop grid to emit `workshop-layer-delete`.
3.  **Yard Assembly Line:** Implement the visual holding area for cars and the crane animation for train assembly.
4.  **Track Playback Sync:** Rewrite the audio engine integration so the physical position of the train passing the crossing signal dictates playback.
