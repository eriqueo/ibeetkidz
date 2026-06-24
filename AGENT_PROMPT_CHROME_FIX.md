# iBeetKidz — Chrome Fix Pass (Agent Prompt)

## Context

The v2 sprite rebuild is structurally complete: flat `train[]` data model, Phaser scenes with real sprite assets, crane animation in Yard, riding train + crossing signal in Track. The data layer is correct. **Do not touch the data model, audio engine, or test suite.**

The problem is purely visual/layout: every scene has a web-app chrome layer (header bar + footer playbar) sitting *outside* the Phaser canvas. This makes the app look like a website with a game embedded in it, not a game. The fix is to eliminate the external chrome and move all controls inside the canvas frame as React overlays positioned over the painted UI panels in the scene art.

You have screenshots of the current broken state in `src/assets/references/` and the clean v2 backgrounds in `src/assets/scenes-v2/`. Run `npm run dev` and open the browser to verify your changes visually as you go.

**Gates you must not break:**
- `npm run typecheck` — zero errors
- `npm run test` — 126 unit tests pass
- `npm run test:e2e` — 5 Playwright tests pass (boot→Map→Workshop→Yard→Track flow)

---

## Problem 1 — Map: letterboxed island floating on black

**Current state:** The map-scene.png (a wide landscape island) is `contain`-fit inside a full-viewport div with `background: #000`. On any non-16:9 screen (including most laptops and all phones) the image is surrounded by black bars. The "iBeetKidz — pick a place to play!" title floats above the canvas as a DOM text node.

**Fix:**
1. In `src/game/scenes/MapScene.ts`, change the background fit from `contain` to `cover` so the map fills the full viewport with no black bars. Use `BackgroundScene`'s cover mode (pass `'cover'` to the constructor or set `this.fitMode = 'cover'` — check how `BackgroundScene` handles this).
2. In `src/components/Map.tsx`, remove the floating title `<div>` (the "iBeetKidz — pick a place to play!" text overlay). The three destination labels (WORKSHOP / YARD / TRACK) are already painted into the scene art — no external title is needed.
3. The three invisible hit-area buttons are correct and should stay. They already use `regionStyle(rect, d.region)` with `MAP_LAYOUT` coordinates. Verify the hit areas actually land on the painted labels by checking `MAP_LAYOUT` in `scene-layout.ts` against the art — the current values are eyeballed estimates.

---

## Problem 2 — Workshop: header bar + footer playbar outside the canvas

**Current state:** The Workshop has:
- A `◀ Map` button (top-left DOM, outside canvas)
- A `+ New Car` + `📦 Yard` button group (top-right DOM, outside canvas)
- A left-edge station dock (5 emoji buttons, outside canvas but overlapping)
- A footer `.playbar` with `▶ Play` / `■ Stop` (DOM, below canvas)

The Phaser canvas is sandwiched between these DOM elements. The scene art has a painted transport panel at the bottom of the boxcar (with STOP / PLAY / LOOP / SPEED buttons already painted in), but the React transport buttons are in a DOM footer below the canvas, not overlaid on the painted panel.

**Fix:**
1. Remove the `<header>` / `<footer>` DOM bars entirely from `Workshop.tsx`.
2. Convert all nav and transport buttons to `position: absolute` overlays inside the canvas wrapper div, using `regionStyle(rect, ...)` coordinates from `WORKSHOP_LAYOUT_V2` in `scene-layout.ts`.
3. The `WORKSHOP_LAYOUT_V2.transport` region (`{ x: 0.21, y: 0.82, w: 0.50, h: 0.15 }`) should contain the Play + Stop buttons as overlays. These should be styled to match the pixel art aesthetic — see **Button Styling** section below.
4. The `◀ Map`, `+ New Car`, and `📦 Yard` nav buttons should be small overlays pinned to the top corners of the canvas wrapper (not outside it). Use `position: absolute, top: 8, left: 8` / `top: 8, right: 8` within the canvas wrapper div, NOT in a separate header element.
5. The left-edge station dock is already inside the canvas wrapper — keep it, just ensure it doesn't cause the canvas to shrink.
6. The canvas wrapper div must be `height: 100dvh` with `overflow: hidden` and no flex children that steal height from it.

---

## Problem 3 — Yard: header bar + action buttons outside/below the canvas

**Current state:**
- `◀ Workshop` + `Springvale Yard` title + `🗺️ Map` in a `<header className="brand">` DOM element above the canvas
- `🏗️ Add to Train` / `🔧 Edit` / `▤ Duplicate` / `🚂 Send to Track` in a `<footer className="playbar">` DOM element below the canvas
- The Phaser canvas is sandwiched between them

The scene art (`yard-scene-clean.png`) has a painted control panel at the bottom with INFO / MOVE / COUPLE / UNCOUPLE / BUILD / DELETE buttons and a YARD STATUS readout. The React action buttons should overlay this painted panel.

**Fix:**
1. Remove the `<header>` and `<footer>` DOM bars from `Yard.tsx`.
2. The outer layout div changes from `flexDirection: column` to `position: relative, height: 100dvh`.
3. The `fieldRef` div (which holds the Phaser canvas + hit areas) becomes `position: absolute, inset: 0`.
4. Add a `useContainedRect(fieldRef, SCENE_ASPECT)` rect and position action buttons as absolute overlays over the painted control panel region. Add a `YARD_LAYOUT_V2.actionPanel` region to `scene-layout.ts` (approximately `{ x: 0.0, y: 0.78, w: 1.0, h: 0.22 }`).
5. The `◀ Workshop` and `🗺️ Map` nav buttons become small absolute overlays at `top: 8, left: 8` and `top: 8, right: 8` within the canvas wrapper.
6. The `🚂 Send to Track` button should be a prominent overlay in the bottom-right of the action panel region.
7. The `leaving` slide-off animation (`transform: translateX(110%)`) should apply to the entire canvas wrapper div, not just the inner `fieldRef`.

---

## Problem 4 — Track: header bar + control bar outside the canvas

**Current state:**
- `◀ Yard` + `Springvale Loop` title + `🗺️ Map` in a `<header className="brand">` DOM element above the canvas
- `▶ Ride Train` / `■ Stop` / speed slider / direction button in a `<footer className="playbar">` below the canvas
- Tarp mute strip in a separate `<div>` between canvas and footer
- The Phaser canvas is sandwiched between all of these

The scene art (`track-scene-clean.png`) has a painted control panel at the bottom with STATION / SPEED / LAP TIME / ORDER readouts and transport buttons. The React controls should overlay this panel.

**Fix:**
1. Remove the `<header>` and `<footer>` DOM bars from `Track.tsx`.
2. The outer layout div becomes `position: relative, height: 100dvh`.
3. The Phaser canvas wrapper becomes `position: absolute, inset: 0`.
4. Add a `useContainedRect` rect and position controls as absolute overlays:
   - `▶ Ride Train` / `■ Stop` overlaid on the painted transport buttons (approx `{ x: 0.28, y: 0.82, w: 0.22, h: 0.12 }`)
   - Speed slider overlaid on the SPEED region (approx `{ x: 0.55, y: 0.82, w: 0.18, h: 0.12 }`)
   - Direction button overlaid on the right side (approx `{ x: 0.76, y: 0.82, w: 0.12, h: 0.12 }`)
   - Tarp mute strip overlaid at the bottom of the ORDER region (approx `{ x: 0.60, y: 0.70, w: 0.38, h: 0.10 }`)
5. Add these regions to `TRACK_LAYOUT_V2` in `scene-layout.ts`.
6. The `◀ Yard` and `🗺️ Map` nav buttons become small absolute overlays at `top: 8, left: 8` and `top: 8, right: 8` within the canvas wrapper.

---

## Button Styling

All overlay buttons that sit over the painted scene art should look like they belong in the pixel art world. Remove the generic `.t-btn` / `.pb-btn` / `.playbar` CSS classes from these overlays and instead apply inline styles:

```css
/* Pixel-art overlay button style */
background: rgba(30, 24, 18, 0.82);
border: 3px solid #8b7355;
border-bottom: 3px solid #4a3728;
border-right: 3px solid #4a3728;
color: #e8dcc8;
font: 400 9px/1 var(--font-label, 'Press Start 2P');
letter-spacing: 1px;
text-transform: uppercase;
cursor: pointer;
padding: 6px 10px;
border-radius: 2px;
image-rendering: pixelated;
```

Active/pressed state (`:active`):
```css
border-top: 3px solid #4a3728;
border-left: 3px solid #4a3728;
border-bottom: 3px solid #8b7355;
border-right: 3px solid #8b7355;
transform: translate(1px, 1px);
```

The primary action button (Play, Ride Train, Add to Train, Send to Track) gets a green tint:
```css
background: rgba(20, 60, 20, 0.85);
border-color: #4a8c4a;
border-bottom-color: #2a5c2a;
border-right-color: #2a5c2a;
color: #a8e6a8;
```

Nav buttons (◀ Map, ◀ Workshop, ◀ Yard) are smaller and more transparent:
```css
background: rgba(0, 0, 0, 0.55);
border: 2px solid rgba(255,255,255,0.25);
color: #e8dcc8;
font: 400 7px/1 var(--font-label, 'Press Start 2P');
padding: 4px 8px;
border-radius: 3px;
cursor: pointer;
```

---

## Coordinate Tuning

All layout coordinates in `scene-layout.ts` are marked as "eyeballed estimates." After removing the external chrome and making controls into overlays, run `npm run dev` and do a visual tuning pass:

1. Open each scene in the browser
2. The overlaid buttons should land on top of the painted UI panels in the scene art
3. Adjust the `NormRegion` values in `scene-layout.ts` until the overlays align with the painted panels
4. The `WORKSHOP_LAYOUT_V2.carInterior` region is the most important — the sequencer grid must fit inside the painted boxcar window without overflowing

The coordinate system: `x` and `y` are the **centre** of the region as a fraction of the image width/height. `w` and `h` are the region dimensions as fractions. The `regionStyle()` helper in `use-overlay-rect.ts` converts these to absolute pixel positions within the contained image rect.

---

## What NOT to change

- `src/core/` — data model, audio engine, types (all correct, all tested)
- `src/game/scenes/` — Phaser scenes are correct; only change if a coordinate needs updating
- `src/game/assets.ts` — asset manifest is correct
- `tests/` — do not touch test files
- The `LoopTrack` / `LoopSelectionProvider` components inside the Workshop mixing board — these are correct
- The crane animation in `YardScene.ts` — this is correct
- The train riding animation in `TrackScene.ts` — this is correct

---

## Definition of Done

- [ ] Map fills the full viewport with no black bars; no floating title text
- [ ] Workshop has no header bar or footer playbar; all controls are canvas overlays
- [ ] Yard has no header bar or footer playbar; all controls are canvas overlays
- [ ] Track has no header bar or footer playbar; all controls are canvas overlays
- [ ] All overlay buttons use the pixel-art button style, not `.t-btn` / `.pb-btn`
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run test` — 126 unit tests pass
- [ ] `npm run test:e2e` — 5 Playwright tests pass
- [ ] Visual check: no black bars, no DOM chrome outside the canvas frame on any scene
