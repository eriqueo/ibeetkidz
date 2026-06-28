---
title: implementation-roadmap
type: Reference
timestamp: 2026-06-28T16:15:00-06:00
tags: [roadmap, phases, implementation, architecture]
status: stable
---

# Master Implementation Roadmap

> **This roadmap details the exact sequence of phases required to move iBeetKidz from its current hybrid HTML/Phaser state to a complete, data-driven, 100% Phaser pixel-art game.**

This document enforces structured oversight. It prevents "vibe coding" by ensuring that architectural prerequisites (like asset generation and Tiled mapping) are completed before the code that depends on them is written [1].

---

## Phase A: Asset Pipeline Overhaul (Current Phase)

Before writing any more layout code, the source of truth for UI positioning must move from hand-measured numbers to data-driven Tiled maps [2].

1.  **Art Generation:** The art director (user) executes the `ASSET_REQUIREMENTS.md` checklist to produce clean base plates and individual interactive sprites for all scenes and tools.
2.  **Tiled Authoring:** The art director uses Tiled to place the sprites onto the base plates, assigning custom properties (`id`, `action`, `type`), and exports a JSON map for each scene (Workshop, Yard, Track, Map).
3.  **Asset Loading:** The engineering agent updates `src/game/assets.ts` to load the new base plates, sprite atlases, and Tiled JSON maps.

---

## Phase B: Scene Data Migration

Once the assets and maps are loaded, the scenes must be rewritten to consume them. This replaces the fragile `scene-layout.ts` with robust data-driven construction.

1.  **Workshop Scene:** Replace `buildToolbar`, `buildShelf`, and `buildTransport` with a single Tiled parser that spawns sprites based on the JSON map. Wire the sprites to the `EventBus`.
2.  **Yard Scene:** Remove the remaining HTML/CSS nav buttons. Parse the Yard Tiled map to spawn the nav panel sprites and the exit button.
3.  **Track Scene:** Remove the HTML/CSS transport and nav buttons. Parse the Track Tiled map to spawn the transport panel and top-nav sprites.
4.  **Map Scene:** Parse the Map Tiled map to define the building hit-areas and spawn the handcar sprite.

---

## Phase C: Satellite Tool Migration

The five satellite tools (Beat Maker, Sound Pads, Voice Keys, My Voice, Magic Pad) are currently HTML `<dialog>` overlays. They must become Phaser Containers [3].

1.  **BaseToolPanel:** Create a robust Phaser Container class that handles the background panel sprite, the close button, and safe-zone anchoring.
2.  **Beat Maker:** Implement `BeatToolPanel` using the new `drum-icon` sprites and `grid-cell` sprites.
3.  **Sound Pads:** Implement `PadsToolPanel` using the chunky `pad-up`/`pad-down` sprites.
4.  **Voice Keys:** Implement `VoiceKeysToolPanel` using the piano key sprites.
5.  **My Voice:** Implement `VoiceToolPanel` using the record button and FX tile sprites.
6.  **Magic Pad:** Implement `MagicToolPanel` using the wave selector and wand cursor sprites.

---

## Phase D: Boxcar Infill and Visual Polish

With the UI fully migrated to Phaser, the final phase addresses the visual connection between the UI and the game world.

1.  **Boxcar Interior:** When in the Workshop, the boxcar sprite must swap to its "open doors" variant so the sequencer grid appears to be *inside* the car.
2.  **Car Type Picker:** Wire the new pixel-art arrow sprites to the `setCarType` reducer action, allowing the user to cycle through the boxcar, flatcar, hopper, and tanker visuals in the Workshop.
3.  **Grid Cell Sprites:** Replace the programmatic Phaser rectangles in the Workshop grid with the new `grid-cell-empty` and `grid-cell-filled` sprites.
4.  **Press Animations:** Ensure every interactive sprite in the game implements a consistent `:active` state (e.g., `setScale(0.94)`) on pointer down.

---

## Phase E: Yard and Track Feature Completion

With the Workshop and tools complete, the Yard and Track must be fully implemented to realize the core loop: Workshop → Yard → Track.

1.  **Yard Assembly Line:** Implement the visual holding area for `CarDefs` and the assembly line track for the `Train`.
2.  **Crane Animation:** Implement the gantry crane animation that picks up cars from the holding area and drops them onto the assembly line.
3.  **Track Playback Sync:** Rewrite the audio engine integration so the physical position of the train passing the crossing signal dictates which car's loop plays, rather than the audio engine driving the train.
4.  **Live Track Controls:** Implement the visual tarping (muting) of cars on the moving train, and wire the speed and direction controls to the audio engine and train animation.

---

## References

[1] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
[2] M. W. Hadley, "Modular Game Worlds in Phaser 3 (Tilemaps #1) — Static Maps," Medium, Jul. 4, 2018. [Online]. Available: https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6
[3] "Designing UI for Pixel Art Games," Reddit, Aug. 12, 2024. [Online]. Available: https://www.reddit.com/r/PixelArt/comments/1e0abcd/designing_ui_for_pixel_art_games/
