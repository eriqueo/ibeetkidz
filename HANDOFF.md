# iBeetKidz — Agent Handoff Document

## What This Project Is

iBeetKidz is a browser-based, offline-first kids' audio toy. Stack: **TypeScript + React 19 + Vite 6 + Tone.js** (audio DSP) + **Phaser 3** (game canvas). Deployed to GitHub Pages at https://eriqueo.github.io/ibeetkidz/. No backend, no accounts, no network calls at runtime — everything runs in the browser.

The architecture is hexagonal: a pure TypeScript core with ports for sound (ToneSoundPort), storage (LocalStoragePort), and rendering. All state mutations go through a Command + pure `reduce()` pattern with built-in undo/redo.

---

## The Three-Space Architecture

The app has four views navigated via a world map:

| View | Purpose |
|------|---------|
| **Map** | World map — tap Workshop, Yard, or Track to navigate |
| **Workshop** | Edit a single train car's music loop (sequencer grid + instrument shelf) |
| **Yard** | Manage all train cars — Edit, Duplicate, Send to Track |
| **Track** | Watch the train run the loop track — cars play their music in sequence |

Navigation state lives in `project.activeView: 'map' | 'workshop' | 'yard' | 'track'`. Dispatch `{ type: 'setActiveView', view: '...' }` to navigate. `Shell.tsx` is the router.

---

## Visual Direction

16-bit SNES pixel art aesthetic. All four views use **Phaser 3 canvas backgrounds** loaded from high-quality reference images in `src/assets/references/`:

| View | Asset |
|------|-------|
| Workshop | `workshop-scene.png` |
| Yard | `yard-scene.png` |
| Track | `track-scene.png` |
| Map | `map-scene.png` |

The reference images are full baked UI mockups (they paint their own chrome, buttons, grids). Live React controls sit on top as absolutely-positioned overlays aligned to the painted areas using normalized ratio constants in `src/game/scene-layout.ts`.

Fonts: **Press Start 2P** for labels/chrome, **Pixelify Sans** for body. Both self-hosted WOFF2.

---

## Current Status (as of this handoff)

### What is working
- All four Phaser scenes render correctly — the pixel art backgrounds display crisply
- Map navigation labels (Workshop / Yard / Track) are positioned over the correct landmarks
- Yard car sprites are positioned on sidings with correct semantic colors (red=drums, teal=melody, purple=mixed)
- Track scene shows locomotive + numbered cars distributed around the oval
- Workshop shows the boxcar frame with the sequencer overlay inside it
- `npm run typecheck` passes clean, `npm run build` succeeds, dual-base Vite build works for GitHub Pages

### What is broken — the wiring pass is needed
**Root cause of almost everything:** The Phaser canvas does not have `pointer-events: none`, so it sits on top of the React overlays and intercepts all taps. Nothing is clickable.

Specific broken items:
1. **All Map buttons** — Workshop/Yard/Track labels do not navigate (pointer-events blocked)
2. **Workshop transport bar** — PLAY/STOP/LOOP/SPEED buttons do not call `engine.playLoop()` / `engine.stop()`
3. **Workshop sequencer cells** — beat cells do not toggle (pointer-events blocked)
4. **Track animation** — train sprites do not move because `TrackScene` never receives playback position from the audio engine
5. **Track Ride Train / Stop buttons** — not wired to `engine.playRide()` / `engine.stop()`
6. **Yard car selection** — `YardScene` emits `car-selected` via EventBus but `Yard.tsx` has no listener
7. **Yard action buttons** — Edit/Duplicate/Send to Track are not dispatching commands

### Secondary issues (lower priority)
- Track canvas has a black bar on the right edge — canvas not filling full viewport width
- Workshop overlay has a visible scrollbar — needs `overflow: hidden`
- Map title bar uses system monospace font instead of Press Start 2P
- Yard status panel has a typo: "TRRCKS" should be "TRACKS"
- Pre-existing e2e test failures (not caused by Phaser work — tests were written against old single-space UI and break because `activeView` now defaults to `"map"`)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Shell.tsx` | Top-level router — reads `project.activeView`, renders the right view |
| `src/components/Map.tsx` | Map view — renders `PhaserGame` + navigation button overlay |
| `src/components/Workshop.tsx` | Workshop view — renders `PhaserGame` + sequencer overlay |
| `src/components/Yard.tsx` | Yard view — renders `PhaserGame` + action bar overlay |
| `src/components/Track.tsx` | Track view — renders `PhaserGame` + transport bar overlay |
| `src/components/PhaserGame.tsx` | Phaser bridge — mounts/destroys Phaser game, exposes ref |
| `src/game/EventBus.ts` | React ↔ Phaser communication — typed EventEmitter |
| `src/game/main.ts` | Phaser game config — `pixelArt: true`, RESIZE scale mode |
| `src/game/scene-layout.ts` | Normalized overlay rect constants for each view |
| `src/game/scenes/BackgroundScene.ts` | Reusable base scene — cover/contain fit + resize + ready handshake |
| `src/game/scenes/TrackScene.ts` | Oval path, locomotive + car followers, animation |
| `src/game/scenes/WorkshopScene.ts` | Workshop background |
| `src/game/scenes/YardScene.ts` | Yard background + tappable car sprites |
| `src/game/scenes/MapScene.ts` | Map background |
| `src/core/types.ts` | All TypeScript types — Project, Part, Layer, Clip, Command, AppView |
| `src/core/project-state.ts` | Pure reducer + emptyProject + normalizeProject + carColorFromLayers |
| `src/app/context.tsx` | App singletons — `useApp()` returns `{ dispatch, engine, sound, rng, undo, redo, save, surprise, getProject }` |
| `src/machines/tools.tsx` | All tool components — LoopTrack, TracksStrip, CarBlock, TOOLS registry |
| `src/theme.css` | SNES pixel art CSS tokens and retheme overrides |
| `src/assets/references/` | Scene background PNGs: workshop-scene, yard-scene, track-scene, map-scene |
| `src/assets/theme/icons/` | 8 instrument sprite PNGs at 64×64px |
| `design/references/` | Full-resolution originals (4–5MB each, numbered 01–08) |
| `phaser-migration-prompts.md` | The original 5-workstream migration prompts (already executed) |
| `vite.config.ts` | Dual-base build (dev + `/ibeetkidz/` for GitHub Pages), manualChunks for tone/react/phaser |

---

## Key APIs

```ts
// From useApp()
const { dispatch, engine, sound } = useApp();

// From useProject()
const project = useProject(); // live Project state via useSyncExternalStore

// Navigation
dispatch({ type: 'setActiveView', view: 'map' | 'workshop' | 'yard' | 'track' });
dispatch({ type: 'setActivePart', partId: string });

// Audio engine
engine.playLoop(project);   // play the active part's loop
engine.playRide(project);   // play the full song (all parts in arrangement)
engine.stop();
engine.isPlaying: boolean;
engine.playMode: 'loop' | 'ride' | null;
sound.getTransportStep(STEP_COUNT): number; // current playback step (0 to STEP_COUNT-1)

// EventBus (src/game/EventBus.ts)
EventBus.emit('transport-step', { step: number, total: number });
EventBus.emit('instrument-selected', { key: string });
EventBus.emit('car-selected', { partId: string });
EventBus.on('event-name', handler);
EventBus.off('event-name', handler);
```

---

## The Wiring Pass — What Needs to Be Done

### Step 1 — Fix pointer-events (unblocks everything)

In `PhaserGame.tsx`, add `style={{ pointerEvents: 'none' }}` to the canvas wrapper div. Every React overlay div must have `pointer-events: auto`. This is the root cause of all broken buttons.

For Phaser-owned interactions (yard car sprites, instrument shelf), keep `pointer-events: none` on the canvas and handle taps via invisible React hit-area divs positioned over the sprites using the same normalized-ratio system as `scene-layout.ts`.

### Step 2 — Wire Workshop transport

In `Workshop.tsx` using `useApp()` and `useProject()`:
- PLAY → `engine.playLoop(project)`
- STOP → `engine.stop()`
- LOOP / SPEED → dispatch appropriate commands (check `types.ts` for exact names)

### Step 3 — Wire Track animation

In `Track.tsx`, add a `useEffect` RAF loop that emits `EventBus.emit('transport-step', { step, total: STEP_COUNT })` each frame while `engine.isPlaying`. In `TrackScene.ts`, listen for `transport-step` and advance followers along the path using `path.getPoint(this.progress)`.

### Step 4 — Wire Track buttons

In `Track.tsx`: Ride Train → `engine.playRide(project)`, Stop → `engine.stop()`.

### Step 5 — Wire Yard selection

In `Yard.tsx`, listen for `EventBus.on('car-selected', ({ partId }) => setSelectedPartId(partId))`. Wire Edit → `dispatch setActivePart` + `dispatch setActiveView('workshop')`. Wire Duplicate and Send to Track to the correct command names from `types.ts`.

### Step 6 — Wire Map buttons

In `Map.tsx`, confirm each destination button dispatches `setActiveView`. Should work after Fix 1.

---

## Asset Loading Pattern (critical for GitHub Pages)

Always use Vite URL resolution for Phaser asset loading — never hardcode paths:

```ts
this.load.image('workshop-bg', new URL('../../assets/references/workshop-scene.png', import.meta.url).href);
```

The Vite base path is `/ibeetkidz/` for GitHub Pages builds. The `new URL(..., import.meta.url).href` pattern handles this automatically at build time.

---

## Build & Deploy

```bash
npm run dev          # local dev server
npm run build        # production build (dual-base)
npm run typecheck    # TypeScript check
npm run test         # unit tests (122 passing; e2e suite has pre-existing failures unrelated to Phaser work)
```

GitHub Actions `build-and-deploy` workflow auto-deploys `main` to GitHub Pages on every push.

---

## What NOT to Change

- The Phaser scene backgrounds and their loading logic
- `scene-layout.ts` overlay rect constants (they are tuned to the reference images)
- `EventBus.ts` implementation
- The audio engine (`ToneSoundPort`, `engine`) and all Tone.js DSP code
- The hexagonal architecture — no direct DOM manipulation from Phaser, no direct Phaser object access from React
- Instrument sprite sizes (64×64px — do not revert to 1920px originals)
