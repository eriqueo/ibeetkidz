# Workshop Scene Revamp: Art & Architecture Design Document

**Date:** July 3, 2026
**Author:** Manus AI (Art Director)
**Target:** Fable (Code Agent) & iBeetKidz Team

This document outlines the complete architectural and visual overhaul of the iBeetKidz Workshop scene. It addresses fundamental layout flaws, missing art, and missing user flows (Send to Yard, Edit vs. New Car) to align the scene with the project charter's Nintendo toy-software aesthetic and the Three-Zone engine architecture.

---

## 1. Architectural Overhaul: Decoupling the Background

The primary structural flaw in the current Workshop scene is the monolithic background. `workshop-boxcar-open.png` bakes the workshop interior, the ground, the rails, and the boxcar itself into a single 2560×1440 image. This prevents any dynamic car movement, makes swapping car types impossible without full-screen redraws, and forces characters to float awkwardly in space.

### The New Layered Architecture
The scene must be split into three distinct visual layers, managed by Phaser and authored in Tiled:

1.  **Layer 1: The Static Workshop Interior.** A clean background plate (`workshop-interior-clean.png`) depicting an industrial-bright train depot. It features brick arches, overhead lamps, and a wooden floor with rails running horizontally across the bottom third. This layer contains no cars and no characters.
2.  **Layer 2: The Car Sprite.** A large, side-on sprite representing the active car (e.g., `car-side-boxcar.png`, `car-side-tanker.png`). This sprite sits precisely on the rails of the background plate. The center of the car is visually open or hollowed out, providing the dark backdrop for the music sequencer grid.
3.  **Layer 3: The Grounded Characters.** The instrument characters (Frog, Chipmunk, Cat, Alien, Husky) are positioned on the workshop floor, with their feet planted solidly on the ground plane between the rails and the bottom UI bar, eliminating the "floating" issue.

### The Car Sprite System
Instead of loading a static background, the Tiled map (`workshop.json`) will define a spawn point for the active car. The React layer will dispatch the current `carType` to Phaser, which will render the appropriate side-on car sprite.

| Car Type | Required Sprite | Visual Description |
| :--- | :--- | :--- |
| **Boxcar** | `car-side-boxcar.png` | Sliding doors wide open, dark interior. |
| **Tanker** | `car-side-tanker.png` | Large side hatch or cutaway section exposing the interior. |
| **Hopper** | `car-side-hopper.png` | Open top, deep dark bin area visible from the side. |
| **Flatcar** | `car-side-flatcar.png` | Flat deck with a dark, atmospheric backdrop structure built onto it. |

---

## 2. The Instrument Art Redraw

The current instrument sprites (`inst-drums`, `inst-mic`, `inst-guitar`, `inst-violin`, `inst-piano`, `inst-keys`) are painted in a smooth, high-resolution illustrated style that violates the project's strict chunky pixel-art mandate. They must be completely redrawn.

### Redraw Specifications
*   **Style:** Strict 16-color warm Nintendo palette, chunky pixels (3-4px per game pixel), 1px dark plum outline, hard 2-3px drop shadows. No gradients, no glow.
*   **States:** Each character must have three states on a single sprite sheet or as separate files: `passive` (idle), `hover` (pointer over), and `active` (playing/selected).
*   **Grounding:** The art must depict the character standing on a flat ground plane, not floating.

### Character Assignments
The "Alien" character (currently assigned to the violin) will be reassigned to the Theremin (Magic Pad) to better fit its sci-fi aesthetic. The `inst-keys` instrument will be merged with the Husky's piano, or assigned a new character if required by the design team.

| Instrument Slot | Character | Action |
| :--- | :--- | :--- |
| **Drums** | Frog (red headband) | `workshop-open-tool` (Beat Maker) |
| **Microphone** | Chipmunk (star shades) | `workshop-open-tool` (My Voice) |
| **Guitar** | Cat (blue guitar) | `workshop-add-melody` (Guitar) |
| **Theremin** | Alien (green, 3 eyes) | `workshop-open-tool` (Magic Pad) |
| **Piano/Keys** | Husky (steampunk hat) | `workshop-add-melody` (Piano) |

---

## 3. User Flow Additions: Send to Yard & Modal

The current UI lacks the ability to send a finished car to the Yard, and it forces users directly into editing the active car without offering the choice to start fresh.

### The "Send to Yard" Flow
The Workshop top bar will receive a new button: `btn-send-to-yard`.
*   **Visual:** A steampunk keycap with a train car icon pointing right, labeled "SEND TO YARD".
*   **Animation:** When clicked, the active car sprite (Layer 2) slides smoothly off the screen to the right, accompanied by a "choo choo" sound effect. The sequencer grid fades out.
*   **State:** After the animation completes, the Workshop resets to an empty state, prompting the user to select a new car type.

### The "Edit vs. New" Modal
When a user navigates to the Workshop from the Map, and the currently active car already contains music layers, the system must pause and ask for intent.
*   **Trigger:** Navigating to Workshop when `activePart.layers.length > 0`.
*   **Visual:** A new Phaser panel (`panel-workshop-modal.png`) appears center-screen. It is a parchment/wood landscape panel with a steampunk frame.
*   **Options:** Two keycap buttons on the panel:
    *   `btn-modal-edit`: Pencil/wrench icon, labeled "KEEP EDITING". Closes modal, loads the existing car.
    *   `btn-modal-newcar`: Plus/sparkle icon, labeled "NEW CAR". Clears the active part, loads an empty car of the default type.

---

## 4. Fable Sprint Brief: Implementation Steps

Fable, execute the following steps to implement the Workshop revamp. Do not use placeholder art; if an asset is missing, log it and use the closest existing asset.

1.  **Tiled Map Updates (`workshop.json`):**
    *   Remove the monolithic background image layer.
    *   Add a new static background layer using `workshop-interior-clean.png`.
    *   Define a new object spawn point for the car sprite, centered horizontally, sitting on the rails.
    *   Add the `btn-send-to-yard` object to the top bar.
    *   Adjust the Y-coordinates of all instrument spawns (`inst-drums`, etc.) to sit on the floor line, below the car.
2.  **Phaser Scene Updates (`WorkshopScene.ts`):**
    *   Implement the layered rendering logic (Background -> Car Sprite -> Grid -> Characters -> UI).
    *   Wire the car sprite to listen for `workshop-car-type-changed` and update its texture accordingly (`car-side-boxcar`, etc.).
    *   Implement the "Send to Yard" slide-out animation (tween the car sprite's X position off-screen right) and emit the state change when complete.
3.  **React State Updates (`Workshop.tsx` & `project-state.ts`):**
    *   Wire the `btn-send-to-yard` action to clear the active part and prepare for a new car.
    *   Implement the "Edit vs. New" modal logic on scene mount if the active part is populated.

This architectural shift moves the Workshop from a static painting to a dynamic, modular scene, fully aligning it with the Yard and Track implementations.
