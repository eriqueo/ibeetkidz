---
title: open-source-games-reference
type: Reference
timestamp: 2026-06-28T16:05:00-06:00
tags: [architecture, asset-pipeline, open-source, pixel-art]
status: stable
---

# Open-Source Pixel Art Games Reference

> **This document reviews open-source pixel art games with scopes and styles similar to iBeetKidz, extracting the exact architectural patterns they use to manage scenes, assets, and interactivity.**

This reference serves as a template to avoid reinventing the wheel. The patterns described here are the industry standard for 2D pixel art games and directly inform the `SCENE_AUTHORING_GUIDE.md` and `IMPLEMENTATION_ROADMAP.md` [1].

---

## 1. Shattered Pixel Dungeon
*Shattered Pixel Dungeon* is a traditional roguelike game with complex UI and deep pixel-art asset management. It is open source and serves as a prime example of UI and scene separation [2].

### Architectural Patterns
*   **Asset Separation:** The game strictly separates background tilesets from interactive UI elements and sprites. Backgrounds are composed of tiles, while interactive objects (items, characters, buttons) are standalone sprites rendered on a higher layer [2].
*   **Sprite Sheets:** It relies heavily on packed sprite sheets (texture atlases) to manage the massive number of items and UI elements efficiently. This minimizes draw calls and simplifies asset loading [2].
*   **UI as Sprites:** The user interface (inventory, buttons, health bars) is constructed entirely from pixel-art sprites, ensuring visual consistency with the game world. There are no native OS UI elements overlaid on the game canvas [2].

### Application to iBeetKidz
*   **UI Consistency:** iBeetKidz must adopt the "UI as Sprites" pattern. The remaining HTML/CSS overlays (nav buttons, satellite tools) must be replaced with Phaser sprites packed into a texture atlas, exactly as *Shattered Pixel Dungeon* handles its inventory and controls.
*   **Layering:** The separation of background tiles from interactive objects validates the decision to separate the `workshop-scene-clean.png` base plate from the interactive instrument and transport sprites.

---

## 2. Athena Crisis
*Athena Crisis* is a modern, open-source turn-based strategy game with a high-quality pixel art aesthetic, built using web technologies (React and a custom engine) [3].

### Architectural Patterns
*   **Data-Driven Maps:** The game uses JSON files to define map layouts, unit positions, and terrain types. The engine reads this data to construct the visual scene, rather than relying on hardcoded coordinates [3].
*   **React for State, Canvas for Rendering:** It successfully employs the "React for state/UI shell, Canvas for game world" architecture that iBeetKidz is migrating towards. React handles the menus and overarching state, while the actual gameplay and unit interactions occur on the canvas [3].
*   **Componentized Assets:** Sprites are organized logically by unit type and terrain, making it easy to swap palettes or introduce new units [3].

### Application to iBeetKidz
*   **Data-Driven Layouts:** The use of JSON maps in *Athena Crisis* is identical to the Tiled JSON workflow proposed for iBeetKidz. The `scene-layout.ts` file must be replaced by JSON data exported from Tiled, allowing the art director to place instruments and buttons visually without writing code.
*   **Hexagonal Boundary:** The successful use of React alongside a canvas engine in *Athena Crisis* proves that the `EventBus` architecture in iBeetKidz (where Phaser handles interaction and emits events to React) is a viable and scalable pattern.

---

## 3. Stardew Valley (Reference Architecture)
While *Stardew Valley* is not open source, its architecture is heavily documented by the modding community and serves as the gold standard for 2D pixel art farming/life-sim games [4].

### Architectural Patterns
*   **Tiled Map Editor:** The game uses the `tbin` format (derived from Tiled's `tmx`) to construct every scene in the game [5].
*   **Strict Layering:** Maps are composed of distinct layers: `Back` (ground, always behind player), `Buildings` (objects with collision), `Front` (objects that render in front of the player), and `AlwaysFront` (weather, canopy) [5].
*   **Tile Properties:** Interactive elements (like doors, signs, or warp points) are defined using custom properties on specific tiles within the Tiled editor (e.g., `Action: Warp 10 15 Town`) [5].

### Application to iBeetKidz
*   **Tiled as the Source of Truth:** iBeetKidz must fully embrace Tiled. The `SCENE_AUTHORING_GUIDE.md` specifies an Object Layer in Tiled where sprites are placed and assigned properties like `action: open-voice-tool`. This is a direct application of the *Stardew Valley* property pattern.
*   **Separation of Concerns:** Just as *Stardew Valley* separates the `Back` layer from interactive `Buildings`, iBeetKidz must separate the clean base plates from the interactive button sprites.

---

## 4. The Aseprite to Engine Workflow
A consistent pattern across professional pixel art games is the use of Aseprite for asset creation, combined with a strict export workflow [6].

### Architectural Patterns
*   **Layered Source Files:** Artists work in layered `.aseprite` files where the background, foreground, and UI elements are kept separate [7].
*   **CLI Export:** Assets are often exported using Aseprite's Command Line Interface (CLI) to automatically generate sprite sheets and JSON metadata, ensuring that the engine always has the latest, correctly formatted assets [6].
*   **Inpainting/Clean Plates:** When an interactive object needs to be removed from a background, artists use inpainting or draw the background cleanly behind the object on a separate layer, ensuring no "holes" are left when the object moves [8].

### Application to iBeetKidz
*   **Base Plate Generation:** The current iBeetKidz backgrounds have buttons baked in. Following the professional workflow, these must be inpainted to create clean base plates (as detailed in `SPRITE_SLICING_GUIDE.md`).
*   **Sprite Atlases:** The individual sprites generated for iBeetKidz must be packed into texture atlases (like the existing `train.json`) rather than loaded as dozens of individual PNGs, improving performance and matching industry standards.

---

## References

[1] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
[2] 00-Evan, "Shattered Pixel Dungeon," GitHub. [Online]. Available: https://github.com/00-Evan/shattered-pixel-dungeon
[3] nkzw-tech, "Athena Crisis," GitHub. [Online]. Available: https://github.com/nkzw-tech/athena-crisis
[4] "Background To Mapping for Stardew Valley," YouTube. [Online]. Available: https://www.youtube.com/watch?v=qAtQOoXWbkU
[5] "Add tile in Tiled and Content Patcher," Stardew Valley Forums. [Online]. Available: http://forums.stardewvalley.net/threads/add-tile-in-tiled-and-content-patcher.7119/
[6] Aseprite, "CLI Documentation," GitHub. [Online]. Available: https://github.com/aseprite/docs/blob/main/cli.md
[7] "Revisiting my tileset workflow for Aseprite's new 1.3 release," YouTube. [Online]. Available: https://www.youtube.com/watch?v=_onhfikMN8k
[8] "Questions about making 2D sprites and backgrounds," Unity Discussions. [Online]. Available: https://discussions.unity.com/t/questions-about-making-2d-sprites-and-backgrounds-noob/737874
