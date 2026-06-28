---
title: scene-authoring-guide
type: Reference
timestamp: 2026-06-28T15:25:00-06:00
tags: [method, engineering, principles, phaser, pixel-art, workflow, tiled, aseprite]
status: stable
---

# Scene Authoring Guide: The Data-Driven Pixel Art Pipeline

> **Supersedes all previous ad-hoc coordinate measuring and sprite slicing scripts.**
> This is the definitive guide on how to author scenes for iBeetKidz the correct way, aligned with our engineering principles.

The core problem we faced was violating **Principle 4 (Data-Driven & Declarative)** and **Principle 3 (Make Illegal States Unrepresentable)**. We were treating a flat PNG as the source of truth, and writing code that guessed where the interactive parts were. This led to fragile, viewport-dependent layouts where the hit-areas drifted from the painted art.

The solution used by professional pixel art studios (like those behind *Stardew Valley* or *Celeste*) is to separate the **static environment** from the **interactive objects**, and use a map editor to define the layout as data [1] [2]. The engine then loads the data and reconstructs the scene. The hit-area is the sprite, and its position is defined by the map data, not hardcoded in TypeScript.

This guide details the end-to-end workflow for creating robust, moveable, and data-driven scenes.

---

## 1. The Asset Pipeline: Separation of Concerns

A scene is not a single flat image. It is composed of three distinct asset types:

1.  **The Base Plate (Environment):** A flat PNG containing only the non-interactive scenery (dirt, walls, rails, empty panels). It contains *no buttons* and *no instruments*.
2.  **The Sprites (Interactive Objects):** Individual PNG files for every interactive element (buttons, instruments, vehicles). These are the visual representation *and* the hit-area.
3.  **The Map Data (JSON):** A data file that defines exactly where each sprite is placed on the base plate.

### Why this matters

By separating the assets, you gain the freedom to move any button or instrument anywhere in the scene simply by dragging it in a map editor, without touching the code or the background art [3]. The position becomes pure data. Furthermore, because the sprite *is* the button, the hit-area is perfectly aligned by construction.

---

## 2. Authoring the Assets

### The Base Plate

When generating or drawing the scene background, instruct the artist or the AI model to create a "clean" environment.

*   **Do:** Draw the empty metal panel where transport buttons will go.
*   **Do Not:** Draw the transport buttons themselves.
*   **Do:** Draw the empty dirt where instruments will sit.
*   **Do Not:** Draw the instruments.

If you are starting with an existing flat scene (like our original Workshop), you must perform an **inpainting pass** to erase the painted buttons and fill the gaps with matching scenery.

### The Sprites

Interactive elements must be authored as individual transparent PNGs.

*   **Size:** Keep the canvas size tight to the object's boundaries, but leave a 1-2 pixel transparent margin to avoid edge artifacts when scaling.
*   **Anchoring:** Phaser defaults to center anchoring (0.5, 0.5). Keep this in mind when drawing sprites that sit on the ground (like instruments) versus UI buttons.

---

## 3. Building the Layout with Tiled

Instead of guessing normalized coordinates in `scene-layout.ts`, we use **Tiled** (a free, open-source 2D level editor) to visually build the scene layout and export it as JSON data [1] [4].

### Step-by-Step Tiled Workflow

1.  **Create a New Map:** Open Tiled and create a new map. Set the orientation to Orthogonal. The tile size doesn't matter much for object placement, but setting it to a logical grid size (e.g., 16x16 or 32x32) can help with snapping. Set the map size to match your base plate dimensions (e.g., 2560x1440).
2.  **Add the Base Plate:** Create an Image Layer and assign your clean base plate PNG to it. This provides the visual context.
3.  **Create an Object Layer:** This is the crucial step. Create an Object Layer named `InteractiveObjects` [5].
4.  **Insert Sprites as Tile Objects:**
    *   Load your individual sprite PNGs into Tiled as an "Image Collection" tileset.
    *   Use the **Insert Tile** tool (Shortcut: `T`) to place the sprites onto the Object Layer [4].
    *   Visually drag them exactly where you want them to sit on the base plate.
5.  **Assign Custom Properties:** This is how Phaser knows what each object does. Select an object in Tiled and add Custom Properties [4]:
    *   `id` (string): e.g., `btn-play`, `inst-drum`.
    *   `action` (string): e.g., `transport-play`, `open-beat-grid`.
    *   `type` (string): e.g., `transport-button`, `instrument`.
6.  **Export to JSON:** Save the map and export it as a JSON file (e.g., `workshop-map.json`).

### The Resulting Data

The exported JSON will contain an array of objects, looking something like this:

```json
{
  "id": 12,
  "name": "DrumKit",
  "type": "instrument",
  "x": 670,
  "y": 993,
  "width": 128,
  "height": 128,
  "properties": [
    { "name": "id", "type": "string", "value": "drumKit" },
    { "name": "tool", "type": "string", "value": "beat-grid" }
  ]
}
```

This is pure, declarative data (Principle 4). The coordinates are absolute pixel values relative to the original art size.

---

## 4. Phaser Integration: Data-Driven Spawning

In Phaser, we load the JSON map data and use it to spawn the interactive sprites. We no longer need `scene-layout.ts` for these objects.

### Loading the Data

In your scene's `preload` method, load the map JSON and the sprite images:

```typescript
preload() {
  this.load.image('bg-workshop', 'assets/scenes/workshop-clean.png');
  this.load.image('inst-drum', 'assets/sprites/inst-drum.png');
  // Load the Tiled JSON data
  this.load.json('workshop-map', 'assets/maps/workshop-map.json');
}
```

### Spawning the Objects

In the `create` method, parse the JSON and spawn the sprites based on the object layer data [2].

```typescript
create() {
  // 1. Add the base plate (cover-fit logic remains the same)
  this.addBackground('cover');

  // 2. Parse the map data
  const mapData = this.cache.json.get('workshop-map');
  const objectLayer = mapData.layers.find((l: any) => l.name === 'InteractiveObjects');

  // 3. Spawn sprites
  objectLayer.objects.forEach((objData: any) => {
    // Extract custom properties
    const props = objData.properties.reduce((acc: any, p: any) => {
      acc[p.name] = p.value;
      return acc;
    }, {});

    // Convert absolute pixel coordinates to normalized coordinates (0..1)
    // based on the original map size (e.g., 2560x1440)
    const normX = objData.x / mapData.width;
    const normY = objData.y / mapData.height;

    // Spawn the sprite using our layout helpers
    const sprite = this.add.sprite(0, 0, props.id);
    
    // Apply standard interactive behavior
    sprite.setInteractive({ useHandCursor: true });
    
    // Add the universal press animation (Principle: Uniform Integration Surface)
    sprite.on('pointerdown', () => {
      this.tweens.add({ targets: sprite, scale: 0.94, duration: 50 });
    });
    sprite.on('pointerup', () => {
      this.tweens.add({ targets: sprite, scale: 1.0, duration: 50 });
      // Emit the action defined in Tiled
      EventBus.emit(props.action, props.id);
    });

    // Register with the layout system to handle viewport resizing
    this.layoutSprite(sprite, normX, normY);
  });
}
```

### Viewport Anchoring (The Safe Zone Fix)

For UI elements that must remain visible regardless of the aspect ratio (like the EXIT button), we apply specific layout rules based on their `type` property defined in Tiled.

```typescript
// Inside the spawn loop:
if (props.type === 'ui-top-right') {
  // Anchor to the camera viewport, not the background image
  sprite.setScrollFactor(0); 
  // Position relative to top-right corner
  sprite.setPosition(this.cameras.main.width - 50, 50);
} else {
  // Anchor to the background image
  this.layoutSprite(sprite, normX, normY);
}
```

---

## 5. Summary of the Correct Architecture

1.  **Art is modular:** Base plate + individual sprites.
2.  **Layout is data:** Authored visually in Tiled, exported as JSON.
3.  **Code is an interpreter:** Phaser reads the JSON, spawns the sprites, and wires the events based on the custom properties.

This architecture satisfies all our engineering principles. It eliminates coordinate guessing, ensures the hit-area perfectly matches the visual representation, and allows for rapid iteration by simply dragging objects in Tiled and saving the JSON file.

## References

[1] M. W. Hadley, "Modular Game Worlds in Phaser 3 (Tilemaps #1) — Static Maps," Medium, Jul. 4, 2018. [Online]. Available: https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6
[2] "How to Make Pixel Art for Games (Sprite-Ready)," Sorceress Blog, May 30, 2026. [Online]. Available: https://sorceress.games/blog/how-to-make-pixel-art-for-games-sprite-ready
[3] "What is the workflow of the artwork of levels in detailed pixel art," Reddit, May 18, 2025. [Online]. Available: https://www.reddit.com/r/gamedev/comments/1kpi275/what_is_the_workflow_of_the_artwork_of_levels_in/
[4] "Working with Objects," Tiled Documentation. [Online]. Available: https://doc.mapeditor.org/en/stable/manual/objects/
[5] "ObjectLayer," Phaser Documentation. [Online]. Available: https://docs.phaser.io/api-documentation/class/tilemaps-objectlayer
