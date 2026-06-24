# iBeetKidz Asset Audit & Animation Remediation Plan

This document provides a comprehensive audit of the visual assets currently in the iBeetKidz repository, evaluating their readiness for true game-like animation and interaction. It outlines the specific gaps in the current "baked" pixel art approach and provides a concrete remediation plan to unblock the animation phase.

## 1. Current Asset Inventory

The repository currently contains 54 image assets, which fall into two distinct categories:

### 1.1 Scene Backgrounds (The "Bakes")
Located in `src/assets/references/`, these are high-resolution (2560x1440) PNG files that serve as the full-bleed backdrops for the four main views:
- `map-scene.png` (3.1 MB)
- `workshop-scene.png` (4.0 MB)
- `yard-scene.png` (4.7 MB)
- `track-scene.png` (3.3 MB)

**Critical Finding:** There are no source files (Aseprite, PSD, or layered files) for these scenes in the repository. They are entirely flat, baked images.

### 1.2 UI Icons & Sprites
Located in `src/assets/theme/icons/`, these are small (64x64 or 96x96) RGBA PNG files used for the React UI overlays:
- Instrument icons (e.g., `bass-drum.png`, `snare.png`, `keyboard.png`)
- Transport controls (e.g., `icon-play.png`, `icon-stop.png`)
- Effects and modifiers (e.g., `icon-fx-reverb.png`, `icon-wave-smooth.png`)

**Critical Finding:** While the UI icons are properly isolated with transparency, there are **no isolated sprites for the trains, cars, or environmental elements** that need to be animated. The current Phaser implementation programmatically draws basic coloured rectangles (using `Phaser.GameObjects.Graphics`) to represent the moving cars because the actual pixel art cars are trapped inside the baked scene backgrounds.

---

## 2. Animation Readiness & Gaps by Scene

The core problem blocking true animation is that the current architecture relies on layering programmatic shapes or static overlays on top of fully painted scenes. To achieve real movement, the static elements must be removed from the backgrounds and provided as independent sprites.

### 2.1 Track Scene
- **Current State:** `track-scene.png` contains a fully painted, static train (a locomotive and 8 numbered cars) permanently affixed to the track.
- **The Gap:** When the Phaser engine animates the live train around the `OVAL` path, it rides *on top* of the baked-in static train, resulting in two visible trains.
- **Animation Goal:** The live train should be the only train visible, moving smoothly around the loop to indicate song playback progress.

### 2.2 Yard Scene
- **Current State:** `yard-scene.png` contains static, painted train cars parked on the sidings, along with a static gantry crane.
- **The Gap:** Car selection currently works by overlaying invisible React hit-areas (`YARD_SLOTS`) over the painted cars. There is no way to animate a car rolling in or out of the yard because the cars are part of the background image.
- **Animation Goal:** Cars should roll into empty slots when created, and roll out when dispatched to the Track.

### 2.3 Workshop Scene
- **Current State:** `workshop-scene.png` contains the sequencer grid, instrument shelf, and transport bar painted as a static background.
- **The Gap:** The current implementation overlays React DOM elements (`WORKSHOP_LAYOUT`) precisely over the painted regions. This works perfectly for UI interaction and doesn't inherently block the sweeping playhead animation (which can be a CSS/React overlay).
- **Animation Goal:** A glowing playhead sweeps across the grid in time with the audio loop.

### 2.4 Map Scene
- **Current State:** `map-scene.png` contains the three locations with a small, static handcar on the track between the Workshop and Yard.
- **The Gap:** The handcar is baked in and cannot move.
- **Animation Goal:** (Optional) A small train or handcar animates between locations when the user navigates.

---

## 3. Remediation Plan

Because the original layered source files (Aseprite/PSD) are missing, we cannot simply export the layers independently. We must choose between two paths to unblock animation:

### Path A: Asset Regeneration & Splitting (Recommended)
This is the correct architectural approach for a game. We must recreate or edit the scene backgrounds to remove the static elements, and extract those elements into standalone sprites.

**Step 1: Clean the Backgrounds**
- **Track:** Edit `track-scene.png` to clone/paint over the static train, leaving only the empty tracks and scenery.
- **Yard:** Edit `yard-scene.png` to remove all parked cars from the sidings, leaving empty tracks.
- **Map:** Edit `map-scene.png` to remove the static handcar.

**Step 2: Create the Sprite Atlas**
- Extract the locomotive, the various car types (coal, boxcar, tanker), and the handcar from the original images.
- Clean up their edges to ensure clean transparency.
- Pack them into a single `spritesheet.png` or texture atlas with a corresponding JSON mapping.

**Step 3: Update Phaser Logic**
- Replace the programmatic `Graphics` rectangles in `TrackScene.ts` and `YardScene.ts` with the new, high-quality pixel art sprites.
- Implement tweening logic in `YardScene.ts` to animate sprites moving into their `YARD_SLOTS`.

### Path B: Programmatic Masking (The Fallback Hack)
If editing the 2560x1440 pixel art is not feasible, we can use Phaser to dynamically cover the baked-in elements.

- **Track:** Create a series of opaque "grass/track" patch sprites that perfectly match the background underneath the static train. Render these patches over the static train to hide it, then render the live train on top.
- **Yard:** Similar to the Track, create "empty siding" patches to cover the baked-in cars until a live car is placed there.
- **Verdict:** This is highly fragile, breaks easily if the layout constants (`OVAL`, `YARD_SLOTS`) change, and requires meticulous alignment. It is not recommended.

## 4. Next Steps for the Engineering Team

1. **Decision Required:** Confirm whether we proceed with **Path A (Asset Regeneration)**. If yes, we need to assign an artist (or use AI generation/inpainting tools) to produce the "clean" backgrounds and the isolated sprite atlas.
2. **Implement Playhead:** The Workshop playhead animation does not require asset changes. We can implement the sweeping playhead overlay immediately using React state driven by the audio engine's `progress` tick.
3. **Refactor Scenes:** Once the clean backgrounds and sprites are available, update `assets.ts` to load the new atlas, and refactor `TrackScene.ts` and `YardScene.ts` to instantiate real sprites instead of programmatic shapes.
