# iBeetKidz v2: The Redesign Spec

This document outlines the ground-up redesign of the iBeetKidz UX, animation model, and data architecture. It supersedes the original implementation and serves as the blueprint for the v2 build.

## 1. The Core Loop

The app is broken into three distinct stages of play:

1. **Workshop (Make the Beats):** Choose a visual car type (purely cosmetic) and load it with instruments. The car acts as a live mixing board where you can see all loops at once and edit them in real time.
2. **Yard (Assemble the Train):** The cars you built sit in a holding area. A gantry crane picks them up and drops them onto an assembly line. You can duplicate cars to play the same loop multiple times. The order on the assembly line is the song structure.
3. **Track (Play the Song):** The assembled train rides continuously around an oval track. A crossing signal at the bottom center drops its arm as cars pass. The car passing the signal dictates which beat loop is currently playing. You can mute individual cars ("tarp" them) to drop out parts of the song live, and control the train's speed and direction.

---

## 2. The Data Model Shift

The current data model (`Project`) holds `parts` (cars) and an `arrangement` (the song). We need to clarify this structure to support the new UX.

### 2.1 The `CarDef` (Workshop Output)
A `CarDef` is a unique beat loop created in the Workshop.
- `id`: Unique identifier (e.g., `car_123`)
- `name`: User-given name
- `carType`: The visual sprite to use (e.g., `boxcar`, `tanker`, `flatcar`)
- `color`: The primary color tint
- `layers`: The sequencer data (instruments and patterns)

### 2.2 The `Train` (Yard Output)
The `Train` is the sequence of cars on the assembly line.
- `cars`: An array of `CarInstance` objects.
  - `instanceId`: Unique ID for this specific position in the train (e.g., `inst_456`)
  - `carDefId`: Reference back to the `CarDef` it plays
  - `muted`: Boolean (the "tarp" state)

This separation allows the Yard to have a palette of 5 `CarDefs`, but assemble a `Train` of 12 `CarInstances` (with duplicates), and allows the Track to mute specific *instances* rather than the global definition.

---

## 3. Scene-by-Scene Animation & UI Spec

### 3.1 The Workshop
- **Background:** Clean `workshop-scene.png` (no baked-in sequencer UI).
- **UI:** A car-type picker (visual only). The interior of the car acts as the mixing board.
- **Interaction:** All layers are visible simultaneously. No scrolling required. Live playback while editing.

### 3.2 The Yard
- **Background:** Clean `yard-scene.png` (empty tracks, no baked-in cars).
- **Holding Area:** A visual palette of the `CarDefs` built in the Workshop.
- **Assembly Line:** A single-file track where the `Train` is built.
- **Animation:** Clicking "Add" on a holding area car triggers the gantry crane to animate over, pick up the car sprite, and drop it onto the end of the assembly line.
- **Send to Track:** The assembled train toots, animates driving off the screen, and transitions the view to the Map/Track.

### 3.3 The Track
- **Background:** Clean `track-scene.png` (empty oval track, no baked-in train).
- **The Signal:** A crossing signal sprite at the bottom center.
- **Animation:** The train (Locomotive + `Train.cars`) animates around the ellipse. Engine puffs smoke. Cars have a slight vertical bounce ("dancing") as they move.
- **Playback Sync:** The audio engine no longer drives the train's position. Instead, the train's physical position drives the audio. When a car hits the crossing signal, its `carDefId` loop begins playing.
- **Live Controls:**
  - **Mute ("Tarp"):** Clicking a car on the moving train throws a tarp over it (visual state) and mutes its audio when it passes the signal.
  - **Direction:** Toggle clockwise / counter-clockwise.
  - **Speed:** Adjust the train's velocity (which scales the audio BPM).

---

## 4. Asset Regeneration Requirements

To achieve this, the static backgrounds must be replaced.

1. **`track-scene-clean.png`:** The oval track with the static train removed.
2. **`yard-scene-clean.png`:** The yard with all parked cars removed.
3. **`workshop-scene-clean.png`:** The workshop with the static UI removed (if necessary, though the current UI might be usable if we just overlay the new mixing board).
4. **`spritesheet.png`:** A texture atlas containing:
   - Locomotive
   - Boxcar, Tanker, Flatcar, Hopper (base greyscale sprites for tinting)
   - Crossing signal (up and down states)
   - Smoke puffs
   - Tarp overlay

## 5. Execution Order

1. **Asset Generation:** Create the clean backgrounds and the isolated sprite atlas.
2. **Core Refactor:** Update the TypeScript types (`Project`, `CarDef`, `CarInstance`) and audio engine to support the new playback model (train position dictates audio, not vice versa).
3. **Workshop Rebuild:** Implement the car picker and unified mixing board.
4. **Yard Rebuild:** Implement the crane animation and assembly line logic.
5. **Track Rebuild:** Implement the train loop animation, crossing signal collision detection, and live controls (mute/speed/direction).
