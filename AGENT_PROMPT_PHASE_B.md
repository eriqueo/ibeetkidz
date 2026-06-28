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

Phase A is complete. The repository now contains clean base plate backgrounds (no buttons painted in), sprite atlases for all interactive elements, and Tiled JSON map files (`workshop.json`, `yard.json`, `track.json`, `map.json`) in `src/assets/maps/`. These JSON files are the new source of truth for all layout coordinates.

Your goal in Phase B is to rewrite the four Phaser scenes to consume these JSON maps, completely eliminating `scene-layout.ts` for static UI elements.

## Implementation Specification

### 1. Asset Loading (`src/game/assets.ts`)

Update the asset manifest to load the Tiled maps. Use the standard Phaser tilemap loader:

```ts
this.load.tilemapTiledJSON('workshop-map', 'assets/maps/workshop.json');
```

Ensure all new sprite atlases generated in Phase A are also loaded.

### 2. The Universal Tiled Parser (`src/game/TiledParser.ts`)

Create a new utility class that parses an object layer from a Tiled map and spawns interactive sprites. This prevents duplicating the parsing logic across all four scenes [1].

The parser must:
1.  Iterate through all objects in a specified object layer (e.g., `ui-layer`).
2.  Read the custom properties defined in Tiled (`action`, `type`, `frame`).
3.  Spawn a Phaser Sprite at the object's `x`, `y` coordinates.
4.  Apply the correct texture and frame.
5.  If the object has an `action` property, make the sprite interactive and wire it to emit that action via the `EventBus` on `pointerdown`.
6.  Apply a consistent press animation (scale to 0.92 on down, restore on up/out) to all interactive sprites.

### 3. Viewport Anchoring (The Safe-Zone Fix)

The Tiled parser must handle the `type` custom property to solve the edge-cropping problem on non-16:9 viewports.

*   If `type === 'ui-top-right'`, the sprite's position must be calculated relative to the top-right corner of the camera viewport, not the background image.
*   If `type === 'ui-bottom-center'`, anchor it to the bottom-center of the camera.
*   If `type` is undefined, anchor it to the background image as usual.

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
