# Refactor Phase 4: Foundation Fixes (Viewport, Coordinates, and Navigation)

## Context
Phase 3 (Workshop) is complete, but a live visual audit revealed several foundational UI issues across the main views. Before we rebuild the satellite tools (Voice/Keys/Pads/Beat/Magic) as Phaser-native panels in Phase 5, we must fix the main page layout, align coordinates to the painted art, and replace the remaining HTML nav buttons with pixel art.

**Crucial Architecture Note:** The `src/core/` directory is strictly off-limits. All changes must happen in the React components, Phaser scenes, and CSS. The EventBus remains the only bridge between Phaser and React.

## The Bugs to Fix

1. **Viewport Letterboxing (CRITICAL):**
   - **Bug:** Workshop, Track, and Yard scenes have black bars on all sides (letterboxing). The game world does not fill the screen.
   - **Cause:** `PhaserGame.tsx` uses `mode: Phaser.Scale.RESIZE` with a `transparent: true` background, but the scenes are using `addBackground("contain")` (in Workshop) or `addBackground("cover")` (in Track/Yard/Map). The `useContainedRect` hook in React is trying to match this, but the math or the CSS wrapper (`height: "100dvh"`) is leaving gaps.
   - **Fix:** We want a full-bleed experience where the pixel art fills the screen and crops the edges, but keeps the interactive areas visible. Update `BackgroundScene.ts`, `useContainedRect`, and the scene `create()` methods to ensure a consistent `cover` fit that fills the viewport without black bars. Ensure `Map.tsx` and `Workshop.tsx` overlays still align correctly with the scaled background.

2. **Duplicate/Misplaced Transport Buttons in Workshop:**
   - **Bug:** The Phaser transport buttons (Stop/Play) in `WorkshopScene.ts` are floating in the middle of the instrument shelf area, overlapping the drum kit sprite. Meanwhile, the painted STOP/PLAY/LOOP/SPEED panel at the bottom is empty.
   - **Cause:** `WORKSHOP_LAYOUT_V2.transport.y` in `scene-layout.ts` is `0.70`, which places it too high. The painted transport panel is lower down.
   - **Fix:** Adjust the `transport` coordinates in `WORKSHOP_LAYOUT_V2` (in `scene-layout.ts`) so the Phaser buttons land perfectly over the painted STOP and PLAY areas. Add the missing LOOP and SPEED buttons to `WorkshopScene.ts` if they are meant to be interactive.

3. **Workshop Grid Bounds:**
   - **Bug:** The sequencer grid cells extend past the right edge of the boxcar interior window into the wooden side panel.
   - **Cause:** `WORKSHOP_LAYOUT_V2.carInterior` width (`w: 0.73`) is slightly too wide, or the `labelFrac` computation is pushing the cells too far right.
   - **Fix:** Tune `WORKSHOP_LAYOUT_V2.carInterior` in `scene-layout.ts` so the grid is strictly bounded within the dark interior of the boxcar.

4. **Nav Buttons are Tiny HTML Text:**
   - **Bug:** The top navigation buttons (◀ MAP, ➕ NEW CAR, 📦 TO YARD, etc.) in `Workshop.tsx`, `Yard.tsx`, and `Track.tsx` are small HTML buttons with CSS borders (`variant="nav"` in `PixelButton.tsx`). They look out of place against the pixel art.
   - **Fix:** Update `PixelButton.tsx` and `theme.css` to make the `nav` variant larger and more consistent with the chunky 16-bit aesthetic of the game. They should look like they belong in the game world, even if they are still HTML overlays for now.

## Tasks

### 1. Fix Viewport Scaling (Full Bleed)
- Review `BackgroundScene.ts` and the `fitBackground` math.
- Ensure all scenes (`WorkshopScene`, `YardScene`, `TrackScene`, `MapScene`) use `addBackground("cover")` or a scaling mode that eliminates black bars.
- Update `useContainedRect` in `src/app/use-overlay-rect.ts` to perfectly match the Phaser background scaling so React overlays (like the Map destinations) don't drift.

### 2. Tune `scene-layout.ts` Coordinates
- Adjust `WORKSHOP_LAYOUT_V2.transport` `y` and `h` values so buttons sit over the painted bottom panel.
- Adjust `WORKSHOP_LAYOUT_V2.carInterior` `w` and `x` values to fit the grid inside the boxcar window.
- Verify `YARD_LAYOUT_V2` and `TRACK_LAYOUT_V2` coordinates still align after the viewport scaling fix.

### 3. Update `WorkshopScene.ts`
- Ensure the `transportBtns` array maps correctly to the tuned coordinates.
- Ensure grid cell sizing (`cellW`, `cellH`) respects the new interior bounds.

### 4. Upgrade `PixelButton.tsx` Styling
- Modify `theme.css` (specifically `.pixel-btn--nav`) to increase font size, padding, and border thickness. Make it look like a proper retro game UI element rather than a tiny web badge.

## Definition of Done
- `npm run typecheck` passes.
- All four main views (Workshop, Yard, Track, Map) fill the browser viewport completely (no black letterbox bars).
- React overlays (Map destinations, Workshop nav) align perfectly with the scaled background art.
- Workshop transport buttons sit exactly over the painted STOP/PLAY areas.
- Workshop sequencer grid is contained entirely within the boxcar interior window.
- Navigation buttons are chunky and readable, fitting the 16-bit aesthetic.

## Pattern Documentation (For Phase 5)
While fixing these, note that any remaining React HTML modals (Voice, Keys, Pads, Beat, Magic) in `Workshop.tsx` are tech debt. They currently use `div role="dialog"` and sit on top of the canvas. In Phase 5, these will be rebuilt as Phaser-native panels or dedicated Phaser scenes. The coordinate tuning in this phase proves that `scene-layout.ts` is the correct source of truth for all spatial alignment.
