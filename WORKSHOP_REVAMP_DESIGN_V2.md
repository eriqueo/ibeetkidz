# Workshop Scene Revamp: V2 Art & Architecture Design Document

**Date:** July 3, 2026
**Author:** Manus AI (Art Director)
**Target:** Fable (Code Agent) & iBeetKidz Team

This document outlines the complete architectural and visual overhaul of the iBeetKidz Workshop scene. It addresses fundamental layout flaws, missing art, missing user flows (Send to Yard, Edit vs. New Car), and introduces a robust new Instrument Editor for fine-grained musical control.

---

## 1. Architectural Overhaul: Decoupling the Background

The primary structural flaw in the current Workshop scene is the monolithic background. `workshop-boxcar-open.png` bakes the workshop interior, the ground, the rails, and the boxcar itself into a single image. This prevents any dynamic car movement, makes swapping car types impossible without full-screen redraws, and forces characters to float awkwardly in space.

### The New Layered Architecture
The scene must be split into three distinct visual layers, managed by Phaser and authored in Tiled:

1.  **Layer 1: The Static Workshop Interior.** A clean background plate (`workshop-interior-clean.png`) depicting an industrial-bright train depot. It features brick arches, overhead lamps, and a wooden floor with rails running horizontally across the bottom third. This layer contains no cars and no characters.
2.  **Layer 2: The Car Sprite.** A large, side-on sprite representing the active car (e.g., `car-side-boxcar.png`, `car-side-tanker.png`). This sprite sits precisely on the rails of the background plate.
3.  **Layer 3: The Grounded Characters.** The instrument characters (Frog, Chipmunk, Cat, Alien, Husky) are positioned on the workshop floor, with their feet planted solidly on the ground plane between the rails and the bottom UI bar.

### Standardized Car Openings
To ensure consistency and ease of building/editing across all car types, **the "open interior" space where the sequencer lives must be exactly the same size and position relative to the car sprite's bounding box.**

*   **Boxcar:** Sliding doors wide open.
*   **Tanker:** A large side hatch or cutaway section exposing the interior.
*   **Hopper:** The side wall is cut away or lowered, exposing the bin area.
*   **Flatcar:** A low wooden stage or framing structure built onto the deck.

Regardless of the car's exterior shape, the dark rectangular void in the center where the sequencer mounts must be identical in dimensions (e.g., `800x400` pixels at a fixed offset from the sprite's center).

---

## 2. The Sequencer: Chalkboard & Sheet Music

The current sequencer is a floating grid of colored rectangles. To integrate it into the world, the sequencer will render as a physical object mounted inside the car's open interior.

*   **Visual Metaphor:** A large, dark green or slate-black **chalkboard** mounted inside the car.
*   **Notes:** The active steps in the sequencer are drawn as chunky chalk marks or stylized musical notes on the board.
*   **Playhead:** A wooden ruler or a vertical chalk line that sweeps across the board as the song plays.

This grounds the UI in the physical space of the toy train world.

---

## 3. The Instrument Editor: Deep Tweaking

The current Workshop allows turning steps on and off, but lacks deep control. We are introducing a new **Instrument Editor Modal** that opens when a user clicks the "Edit" button (the 🎹 icon) on a sequencer lane.

### Editor Modal Layout
The modal is a large parchment/wood panel with a steampunk frame, featuring:

1.  **The Note Canvas (Top Half):** A zoomed-in view of the 16 steps for that specific instrument.
2.  **The Control Deck (Bottom Half):** A set of physical-looking knobs, faders, and toggle switches.

### Editor Capabilities
The editor provides the following controls per instrument lane:

*   **Note Length:** A slider or drag-handle on individual notes in the canvas to make them hold/sustain across multiple steps.
*   **Pitch Bend:** A dedicated "Pitch" knob or a line-drawing tool in the canvas to bend the pitch of a note up or down over its duration.
*   **Double Beats (Ratcheting):** A toggle switch on a step to divide it into two fast hits (1/32nd notes) instead of one standard hit (1/16th note).
*   **Silliness Knobs:** Two assignable knobs per instrument for effects.
    *   *Knob 1 (e.g., "Wobble"):* Controls an LFO or chorus effect.
    *   *Knob 2 (e.g., "Crunch"):* Controls distortion or bitcrushing.

---

## 4. The Instrument Art Redraw

The current instrument sprites are painted in a smooth, high-resolution illustrated style that violates the project's strict chunky pixel-art mandate. They must be completely redrawn.

### Redraw Specifications
*   **Style:** Strict 16-color warm Nintendo palette, chunky pixels (3-4px per game pixel), 1px dark plum outline, hard 2-3px drop shadows.
*   **States:** Each character must have three states: `passive` (idle), `hover` (pointer over), and `active` (playing/selected).
*   **Grounding:** The art must depict the character standing on a flat ground plane.

### Character Assignments
The `inst-keys` instrument will be retained as an independent slot, but without a character assigned for now (it will just be the instrument on a stand). The Alien is reassigned to the Theremin.

| Instrument Slot | Character | Action |
| :--- | :--- | :--- |
| **Drums** | Frog (red headband) | `workshop-open-tool` (Beat Maker) |
| **Microphone** | Chipmunk (star shades) | `workshop-open-tool` (My Voice) |
| **Guitar** | Cat (blue guitar) | `workshop-add-melody` (Guitar) |
| **Theremin** | Alien (green, 3 eyes) | `workshop-open-tool` (Magic Pad) |
| **Piano** | Husky (steampunk hat) | `workshop-add-melody` (Piano) |
| **Keys** | *(None yet)* | `workshop-add-melody` (Synth) |

---

## 5. User Flow Additions: Send to Yard & Modal

### The "Send to Yard" Flow
*   **Visual:** A new `btn-send-to-yard` keycap in the top bar.
*   **Animation:** When clicked, the active car sprite slides smoothly off the screen to the right, accompanied by a "choo choo" sound effect. The sequencer chalkboard fades out.
*   **State:** The Workshop resets to an empty state, prompting the user to select a new car type.

### The "Edit vs. New" Modal
*   **Trigger:** Navigating to Workshop when `activePart.layers.length > 0`.
*   **Visual:** A parchment modal panel (`panel-workshop-modal.png`).
*   **Options:** Two keycap buttons:
    *   `btn-modal-edit`: "KEEP EDITING". Closes modal, loads the existing car.
    *   `btn-modal-newcar`: "NEW CAR". Clears the active part, loads an empty car.

---

## 6. Fable Sprint Brief: Implementation Steps

Fable, execute the following steps to implement the Workshop revamp.

1.  **Tiled Map Updates (`workshop.json`):**
    *   Replace the monolithic background with `workshop-interior-clean.png`.
    *   Add a spawn point for the car sprite, centered horizontally on the rails.
    *   Add the `btn-send-to-yard` object to the top bar.
    *   Adjust Y-coordinates of all instrument spawns to sit on the floor line.
2.  **Phaser Scene Updates (`WorkshopScene.ts`):**
    *   Implement layered rendering (Background -> Car Sprite -> Chalkboard Grid -> Characters -> UI).
    *   Wire the car sprite to update texture based on `carType`, ensuring the chalkboard grid mounts at the exact same relative offset for every car.
    *   Implement the "Send to Yard" slide-out animation and emit the state change.
3.  **Instrument Editor Implementation (`InstrumentEditor.tsx` / `WorkshopScene.ts`):**
    *   Build the new Editor Modal UI.
    *   Update `types.ts` and the reducers to support note length, pitch bend values, double-beat flags, and effect knob values per lane/step.
    *   Wire the Tone.js adapter to respect these new parameters during playback.
4.  **React State Updates (`Workshop.tsx` & `project-state.ts`):**
    *   Wire the `btn-send-to-yard` action to clear the active part.
    *   Implement the "Edit vs. New" modal logic on scene mount.
