# iBeetKidz Phaser 3 Migration — Agent Prompts

This document contains a set of self-contained prompts designed to be fed into Claude Code (or similar agentic execution tools) to execute the migration of iBeetKidz's visual layer from CSS/DOM to a Phaser 3 canvas.

The migration strategy follows the official Phaser 3 + React + Vite integration pattern: Phaser handles the game canvas (pixel art backgrounds, sprites, animation) while React handles the UI overlay (sequencer grid, buttons, transport bar).

Run these prompts sequentially or in parallel workstreams as indicated.

---

## Prerequisites & Context (Provide this to all agents)

**Project Context:**
iBeetKidz is a browser-based, offline-first kids' audio toy built with React, Vite, and Tone.js. The app recently shifted from a single-space UI to a three-space architecture (Workshop, Yard, Track, plus a Map). The current implementation attempts to render the 16-bit SNES pixel art aesthetic using CSS borders and divs, which fails to capture the texture, depth, and sprite rendering required.

**The Goal:**
Migrate the visual rendering of the four views to Phaser 3. The React components will become transparent UI overlays sitting on top of a Phaser `<canvas>`. Phaser will render the reference images as backgrounds and animate sprites on top of them.

**Engineering Principles to Follow:**
1. **Hexagonal Architecture / Boundary Discipline:** The React UI and Phaser Game must communicate strictly via an `EventBus`. React components should not directly mutate Phaser objects, and Phaser should not manipulate the DOM.
2. **Environment Agnosticism:** Ensure Vite asset imports (`new URL(..., import.meta.url).href`) are used for all Phaser asset loading so that GitHub Pages deployment (which uses a `/ibeetkidz/` base path) continues to work perfectly.
3. **Parse, Don't Validate / Data-Driven:** The `Project` state in React is the source of truth. Phaser scenes should render based on the state passed to them, acting as a declarative view layer.

---

## Workstream 1: Foundation & Bridge Setup

**Prompt:**
```markdown
You are tasked with setting up the foundational Phaser 3 integration for the iBeetKidz project. The goal is to implement the official Phaser 3 + React + Vite template pattern without breaking the existing React application or its Tone.js audio engine.

**Tasks:**
1. **Install Dependencies:** Add `phaser` to the project dependencies via `npm install phaser`.
2. **Create the EventBus:** Create `src/game/EventBus.ts` (a simple EventEmitter) to handle communication between React and Phaser.
3. **Create the Phaser Bridge Component:** Create `src/components/PhaserGame.tsx`. This component should initialize the Phaser game instance in a `useEffect`, manage the canvas container, and expose the game instance and active scene via a `forwardRef`. Ensure it cleans up the game instance on unmount.
4. **Configure the Game:** Create `src/game/main.ts` with the base Phaser configuration. Crucially, set `pixelArt: true` (or `render: { pixelArt: true }`) to ensure nearest-neighbor scaling for the 16-bit aesthetic. Set the scale mode to `RESIZE` or `FIT` so the canvas fills its container.
5. **Setup Asset Loading:** Create a base `Preloader` scene (`src/game/scenes/Preloader.ts`) that loads the core assets. You must use Vite's URL resolution for assets to ensure they work on GitHub Pages. Example: `this.load.image('workshop-bg', new URL('../../assets/references/workshop-scene.png', import.meta.url).href);`
6. **Update Build Config:** Check `vite.config.ts`. Ensure that `phaser` is added to the `manualChunks` configuration alongside `tone` and `react` to prevent bundle size warnings.

**Verification:**
Run `npm run typecheck` and `npm run build` to ensure the project still compiles cleanly and the Vite build succeeds without errors.
```

---

## Workstream 2: The Track Scene

**Prompt:**
```markdown
You are tasked with migrating the `Track` view in iBeetKidz to use Phaser 3. Currently, `src/components/Track.tsx` uses CSS divs to draw an oval and animate cars using `requestAnimationFrame`. We need to move the visual rendering to a Phaser scene while keeping the React UI (the transport bar) overlaid on top.

**Tasks:**
1. **Create the Phaser Scene:** Create `src/game/scenes/TrackScene.ts`.
2. **Background:** Load and render `src/assets/references/track-scene.png` as the scene background. Scale it to fit or cover the canvas appropriately.
3. **The Path:** Define a Phaser `Phaser.Curves.Ellipse` or `Phaser.Curves.Path` that perfectly matches the physical track drawn in the background image.
4. **Sprite Rendering:** Instead of DOM elements, render the locomotive and train cars as Phaser sprites. They should follow the defined path.
5. **React Integration:** Update `src/components/Track.tsx` to render the `<PhaserGame />` component in the background. The existing React transport bar (`Ride Train` / `Stop` buttons) must sit on top of the canvas as a transparent overlay (`position: absolute`, `z-index: 10`).
6. **State Sync:** Use the `EventBus` or a React `useEffect` to pass the `project.arrangement` data to the `TrackScene` so it knows how many cars to render and what colors they should be.
7. **Animation Sync:** The `TrackScene`'s `update` loop should handle moving the sprites along the path. It needs to know the current transport step from the audio engine. Listen for an event from React containing the current playback progress, or poll the engine state if passed via ref.

**Constraints:**
- Do not break the audio playback logic (`engine.playRide()`).
- Ensure `pixelArt: true` rendering is maintained so the sprites look crisp.
```

---

## Workstream 3: The Workshop Scene

**Prompt:**
```markdown
You are tasked with migrating the visual background of the `Workshop` view in iBeetKidz to Phaser 3. The Workshop is where users edit a specific train car's music loop.

**Tasks:**
1. **Create the Phaser Scene:** Create `src/game/scenes/WorkshopScene.ts`.
2. **Background:** Load and render `src/assets/references/workshop-scene.png` as the scene background.
3. **React Integration:** Update `src/components/Workshop.tsx`. Render the `<PhaserGame />` component to display the `WorkshopScene`.
4. **Overlay the UI:** The actual music sequencer (`LoopTrack`) and the instrument shelf must remain as React/DOM components. Position the React container (`position: absolute`, `z-index: 10`) so that the sequencer grid aligns visually with the "boxcar body" area depicted in the background image.
5. **Refine the CSS:** Remove the old CSS rules in `style.css` or `theme.css` that attempted to draw the car block border and background, as the Phaser scene now provides the visual context. Keep the CSS for the sequencer cells (`.loop-track`, `.lane-row`, etc.) intact.

**Goal:**
The end result should look like the React sequencer grid is physically embedded inside the train car shown in the high-quality pixel art background.
```

---

## Workstream 4: The Yard Scene

**Prompt:**
```markdown
You are tasked with migrating the `Yard` view in iBeetKidz to Phaser 3. The Yard is an isometric view where users manage their created train cars.

**Tasks:**
1. **Create the Phaser Scene:** Create `src/game/scenes/YardScene.ts`.
2. **Background:** Load and render `src/assets/references/yard-scene.png` as the scene background.
3. **Sprite Rendering:** The scene must render car sprites parked on the sidings shown in the background image.
4. **React Integration:** Update `src/components/Yard.tsx` to render the `<PhaserGame />` component.
5. **State Sync & Interaction:** Pass the `project.parts` array to the `YardScene` via the `EventBus` or a ref so it knows what cars exist. When a user clicks/taps a car sprite in the Phaser scene, the scene must emit a `car-selected` event via the `EventBus`.
6. **UI Overlay:** The React component should listen for the `car-selected` event to update its local selection state. The Action Bar (Edit, Duplicate, Send to Track) remains a React component overlaid on top of the canvas.

**Constraints:**
- Ensure the isometric positioning of the sprites matches the perspective of the background image.
```

---

## Workstream 5: The Map Scene

**Prompt:**
```markdown
You are tasked with migrating the `Map` view in iBeetKidz to Phaser 3.

**Tasks:**
1. **Create the Phaser Scene:** Create `src/game/scenes/MapScene.ts`.
2. **Background:** Load and render `src/assets/references/map-scene.png` as the scene background.
3. **Interactive Elements:** You can either implement the clickable destination nodes (Workshop, Yard, Track) as interactive Phaser sprites within the scene, OR keep them as React buttons overlaid on top of the canvas. Given the engineering principle of keeping UI in React, the preferred approach is to render the map background in Phaser and position transparent or styled React `<button>` elements over the corresponding areas of the map image.
4. **React Integration:** Update `src/components/Map.tsx` to render `<PhaserGame />` and overlay the navigation UI.
5. **Cleanup:** Remove the old card-based layout CSS from `style.css` that was previously used for the Map view.

**Verification:**
Ensure clicking the overlaid buttons correctly dispatches the `setActiveView` command to navigate the app.
```
