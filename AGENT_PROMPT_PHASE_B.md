---
title: agent-prompt-phase-b
type: Reference
timestamp: 2026-06-28T16:30:00-06:00
tags: [prompt, engineering, phaser, tiled]
status: stable
---

# AGENT_PROMPT_PHASE_B.md

> **For Claude Code (CCC) or any engineering agent.** This prompt specifies the implementation of Phase B: replacing the hardcoded `scene-layout.ts` with a data-driven Tiled map parser.

## Context

Phase A delivers clean base plate backgrounds (no buttons painted in), sprite atlases for all interactive elements, and Tiled JSON map files (`workshop.json`, `yard.json`, `track.json`, `map.json`) in `src/assets/maps/`. These JSON files are the new source of truth for all layout coordinates.

> **Already landed (groundwork):** `src/game/TiledParser.ts` (pure, Zod-validated parse of a Tiled object layer → normalized `TiledSpawn[]`) and `src/game/TiledSceneAdapter.ts` (the Phaser adapter: cover-fit base plate + a transparent hit-area per spawn + press tween + EventBus emit, with camera-anchoring for safe-zone elements). Both are unit-tested against `src/assets/maps/workshop.json`. Phase B is the **scene wiring**: load the real assets/maps and call the adapter from each scene.

Your goal in Phase B is to rewrite the four Phaser scenes to consume these JSON maps via the parser + adapter, completely eliminating `scene-layout.ts` for static UI elements.

### The Tiled object property contract (IMPORTANT — read before authoring maps)

Each interactive element is one Tiled object. Its meaning comes from:

- **`name`** → the sprite/texture key (e.g. `icon-notepad`, `btn-play`).
- **`type`** (the object's Tiled *Class*) → the **semantic class** only: `toolbar`, `instrument`, `transport`, `display`. It does **not** control anchoring.
- **Custom properties:**
  - `action` (string) → the EventBus event to emit on tap. Omit/empty ⇒ non-interactive (e.g. the TEMPO LCD, which is just a positioned anchor for the live BPM text).
  - `arg` (string | int) → the single payload for that event (toolId, nav view, tempo delta, play mode).
  - `anchor` (string) → the **safe-zone behaviour**: `bg` (default — track the painted background, may crop) | `ui-top-right` | `ui-bottom-center` (pinned to the camera so it never crops).

> Note: an earlier draft of this prompt overloaded `type` for both semantic class **and** anchoring. That was split: `type` is the class, `anchor` is the safe-zone property. The parser/adapter implement the split; author your Tiled maps accordingly.

## Implementation Specification

### 1. Asset Loading (`src/game/assets.ts`)

Update the asset manifest to load the Tiled maps. Use the standard Phaser tilemap loader:

```ts
this.load.tilemapTiledJSON('workshop-map', 'assets/maps/workshop.json');
```

Ensure all new sprite atlases generated in Phase A are also loaded.

### 2. The Universal Tiled Parser + Adapter (already built)

`src/game/TiledParser.ts` and `src/game/TiledSceneAdapter.ts` already provide the shared logic, so no scene duplicates it [1]. For reference, the split is:

`TiledParser.parseTiledLayer(mapJson, layerName)` (pure, Zod-validated):
1.  Validates the Tiled map shape at the trust boundary, then iterates the named object layer (`ui-layer`).
2.  Reads the custom properties (`action`, `arg`, `anchor`) and the object's `name`/`type`/rect.
3.  Returns normalized `TiledSpawn[]` — `{ id, klass, cx, cy, w, h, action?, arg?, anchor }`, coordinates as 0..1 fractions of the source image (resolution-independent), handling both rectangle (top-left) and tile-object (gid → bottom-left) conventions.

`TiledSceneAdapter.spawnTiledScene(scene, spawns, { baseKey })` (Phaser):
4.  Adds a cover-fit base-plate background Image.
5.  Spawns one transparent (alpha 0) Rectangle hit-area per spawn.
6.  If the spawn has an `action`, makes it interactive, plays a press tween (scale 0.94 → 1.0, 80ms) on `pointerdown`, and emits `action(arg?)` via `EventBus` on `pointerup`.

In Phase B you mostly LOAD the assets/maps and call `spawnTiledScene` from each scene; extend the adapter only if a scene needs a behaviour it does not yet cover.

### 3. Viewport Anchoring (The Safe-Zone Fix)

Anchoring is driven by each object's **`anchor` custom property** (NOT its `type`, which is the semantic class). The adapter's `placeSpawn` already implements:

*   `anchor === 'ui-top-right'` → positioned relative to the top-right corner of the camera viewport, not the background image.
*   `anchor === 'ui-bottom-center'` → anchored to the bottom-center of the camera.
*   `anchor === 'bg'` (or absent) → anchored to the cover-fit background image as usual.

This ensures the EXIT button and transport controls remain visible on all screen sizes.

### 4. Scene Rewrites

**WorkshopScene.ts:**
*   Remove `buildToolbar`, `buildShelf`, and `buildTransport`.
*   In `create()`, call `TiledParser.spawnObjects(this, 'workshop-map', 'ui-layer')`.
*   The sequencer grid and live BPM display remain programmatic, as they depend on runtime state.

**YardScene.ts & TrackScene.ts:**
*   Remove all programmatic hit-areas and HTML overlay references.
*   Call `TiledParser.spawnObjects` to spawn the nav and transport panels.

**MapScene.ts:**
*   Call `TiledParser.spawnObjects` to spawn the building hit-areas and the handcar sprite.

## Pass/Fail Gates

Before committing, you must verify:
1.  **No Hardcoded Coordinates:** `scene-layout.ts` must no longer contain coordinates for the toolbar, shelf, transport panels, or map buildings.
2.  **Event Wiring:** Tapping a spawned sprite must emit the correct `EventBus` event (e.g., tapping the drum kit sprite emits `workshop-open-beat`).
3.  **Typecheck:** `npm run typecheck` must pass.
4.  **Unit Tests:** All 126 unit tests must pass.

Do not guess coordinates. Do not write fallback coordinates. The JSON map is the sole source of truth.

## References

[1] M. W. Hadley, "Modular Game Worlds in Phaser 3 (Tilemaps #1) — Static Maps," Medium, Jul. 4, 2018. [Online]. Available: https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6
