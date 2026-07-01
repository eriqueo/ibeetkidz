# iBeetKidz Three-Zone UI Refactor Delegation

**Goal:** Complete the UI polish of the Workshop scene using the newly generated "Phase 2" steampunk sprite assets, and fix outstanding layout/rendering bugs. Then migrate Yard and Track to the same data-driven engine.

All required sprite assets have been generated and committed to `src/assets/sprites/`.

## Phase 1: Workshop UI Polish
**Agent Prompt:**
> The core data-driven engine (`ui-scene.ts`) is working, but the Workshop UI needs polish using the new "Phase 2" sprite assets.
> 1. **Header Panel:** Update `assets.ts` and `workshop.json` to use `panel-header-v2.png` (the ornate steampunk frame) instead of the plain `panel-header.png`.
> 2. **Top Bar Buttons:** Add the new top bar buttons to `workshop.json` and place them over the header panel:
>    - `btn-map` (Left side, action: `nav-map`)
>    - `btn-newcar` (Center, action: `toggle-car-picker`)
>    - `btn-sendtoyard` (Right side, action: `nav-yard`)
> 3. **Car Type Picker:** Implement the dropdown picker logic. When `toggle-car-picker` fires, spawn a Phaser Container holding the 4 car-type tiles (`btn-picker-boxcar`, `btn-picker-tanker`, `btn-picker-hopper`, `btn-picker-flatcar`). Clicking a tile should swap the boxcar art and close the picker.
> 4. **Husky Piano:** Add the `inst-piano` sprite to the field in `workshop.json` and wire it to open the melody editor.
> 5. **Text Labels:** Add text labels under all nav and transport buttons. The Tiled map should define a `label` property for each button object. In `ui-scene.ts`, after spawning each button sprite, add a Phaser Text object below it using the dark plum (`#2b2440`) font.
> 6. **LCD Styling:** Fix the transport LCD text color. It should be dark plum (`#2b2440`) on the cream panel background, not green-on-dark.
> 7. **Mobile Viewport:** Fix the Phaser `scale` config to use `Phaser.Scale.FIT` and `autoCenter: Phaser.Scale.CENTER_BOTH` so the canvas fills the mobile screen vertically.

## Phase 2: Migrate Yard and Track
**Agent Prompt:**
> You need to migrate `YardScene.ts` and `TrackScene.ts` to use the generic `ui-scene.ts` engine.
> 1. Create `yard.json` and `track.json` using the same three-zone structure (Top Bar, Field, Bottom Bar).
> 2. Rewrite `YardScene.ts` and `TrackScene.ts` to be generic interpreters of the Tiled map data, removing all hardcoded layout logic (`buildChrome()`, `layoutChrome()`).
> 3. Ensure all existing EventBus actions are preserved and wired correctly to the new Tiled objects.

## Expected Outcome
The Workshop scene should feature the new ornate steampunk header, complete with the Map, New Car, and Send to Yard buttons. The Husky piano instrument should be present. All buttons should have text labels underneath them. The car picker dropdown should function. The canvas should scale correctly on mobile devices. The Yard and Track scenes should be fully data-driven.
