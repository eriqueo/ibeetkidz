# Phase 8 — The "Real Pixel Game" Way (Sliced Sprites)

> **Context:** In Phase 7 we fixed the coordinates by measuring the flat PNGs. However, because the backgrounds are cover-fit to the viewport, edge elements (like the EXIT icon and Speed Up button) still get cropped on narrow/wide screens. The project director has ruled that an in-app layout editor is a hack. We are moving to **Option 2: Sliced Sprites**. The flat background art is being replaced with a base scenery plate + individual transparent sprites for every interactive button.

## Gates
- `npm run typecheck` passes
- `npm run test` passes (126 tests)
- `npm run build` succeeds

## The Architectural Shift

We are abandoning `scene-layout.ts` normalized regions for interactive buttons. 
Instead of drawing invisible hit-areas over a flat painting, we will:
1. Load a base background image (the scenery without the buttons).
2. Load individual sprite images for each button.
3. Position the button sprites in the Phaser scene using layout logic (e.g., anchoring to corners, centering in panels) so they naturally flow with the viewport resize, just like a real game UI.

This solves the cropping bug natively: if a button is anchored to the top-right of the camera, it stays on screen regardless of the cover-fit crop. It also solves the press animation bug natively: you scale the actual sprite, not an invisible container.

## Tasks

### 1. Update Asset Loading
The art team has provided new sliced assets in `src/assets/scenes-v2-sliced/`. (Assume these exist for the purpose of this code change).
- In `WorkshopScene.ts`, change the background image load to use `workshop-base.png`.
- Load the 9 toolbar icon sprites (`icon-notepad.png`, `icon-musicnote.png`, etc.).
- Load the 4 instrument sprites (`inst-drum.png`, `inst-mic.png`, `inst-guitar.png`, `inst-keys.png`).
- Load the transport button sprites (`btn-stop.png`, `btn-play.png`, etc.).

### 2. Rebuild the Toolbar (Anchored UI)
In `WorkshopScene.ts`, rewrite `buildToolbar()` and `layoutToolbar()`.
- Instead of using `WORKSHOP_LAYOUT_V2.toolbar` coordinates, create the 9 sprite images.
- In `layoutToolbar()`, position the toolbar container relative to the **top-right of the camera viewport** (`this.cameras.main.width`), not the background rect. This guarantees the EXIT button is never cropped.
- Apply `pressPop()` to the actual sprite images.

### 3. Rebuild the Instrument Shelf
Rewrite `buildShelf()` and `layoutShelf()`.
- Create the 4 instrument sprites.
- Position them along the bottom edge of the boxcar interior.
- Apply `pressPop()` to the actual sprite images.

### 4. Rebuild the Transport Panel
Rewrite `buildTransport()` and `layoutTransport()`.
- Create the transport button sprites.
- Position them relative to the **bottom-center of the camera viewport**.
- Apply `pressPop()` to the actual sprite images.

## Do Not
- **DO NOT** use `scene-layout.ts` normalized coordinates for any of these buttons anymore.
- **DO NOT** draw transparent hit-areas (`setFillStyle(0xffffff, 0)`). The sprite itself is the interactive object.
- **DO NOT** use CSS/HTML overlays. Everything must be a Phaser Sprite or Image.

## Note on Execution
For this phase, write the code assuming the sliced assets exist in the `scenes-v2-sliced` directory. The project director will handle the actual image slicing and file placement before running the build.
