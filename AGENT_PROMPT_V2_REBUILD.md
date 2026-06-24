# iBeetKidz v2 — Agent Implementation Prompt

> **For:** Claude Code CLI (or any capable code agent with full repo access)
> **Repo:** `eriqueo/ibeetkidz`
> **Prereqs:** Read `REDESIGN_SPEC.md`, `ASSET_AUDIT.md`, and `STYLE_GUIDE.md` before starting. All new scene backgrounds and sprite assets are already committed under `src/assets/scenes-v2/` and `src/assets/sprites/`.

---

## Mission

Rebuild the three interactive scenes of iBeetKidz (Workshop, Yard, Track) to match the v2 design described in `REDESIGN_SPEC.md`. The core loop is:

1. **Workshop** — build a beat car (choose a car type, fill it with instrument loops, play live)
2. **Yard** — assemble cars into a train using the gantry crane animation
3. **Track** — the assembled train rides the oval; the crossing signal marks which car is playing; mute cars live with a tarp

The existing codebase is a Vite + React + TypeScript + Phaser 4 + Tone.js app. The architecture is hexagonal: a pure `core/` (types, project-state, audio-engine) with React components as the UI shell and Phaser scenes as the visual canvas. **Do not break this separation.** All commands flow through `dispatch(Command)`. All audio flows through `AudioEngine`. Phaser scenes are pure visual — they receive data and render it; they never own state.

---

## Engineering Principles (non-negotiable)

These come from the project owner's engineering philosophy:

- **Parse at the boundary, trust in the core.** All external data (localStorage saves, URL params) goes through `normalizeProject`. Core functions receive already-validated types.
- **Closed command vocabulary.** All mutations are `Command` union types in `src/core/types.ts`. Never mutate state directly. Never add ad-hoc event buses for state changes.
- **Hexagonal ports.** `AudioEngine` talks to `SoundPort`. Phaser scenes talk to React via `EventBus` or scene method calls only. React overlays sit above the canvas (`pointer-events: none` on the canvas wrapper is already in place).
- **Single source of truth for layout.** All normalized coordinates (fractions of the 16:9 reference image) live in `src/game/scene-layout.ts`. Never hardcode pixel values in components.
- **All 122 unit tests must pass** (`npm test`) and `npm run typecheck` must be clean before any commit.
- **No scrolling in Workshop.** All instrument loops must be visible simultaneously — the mixing board must fit without overflow.

---

## Phase 1 — Data Model Refactor

### 1a. Extend `src/core/types.ts`

The current `Part` type represents a beat car. We need to add:

```typescript
/** The visual sprite type for a car. Purely cosmetic — affects which sprite
 *  is rendered in Yard and Track, not the audio. */
export type CarType = "boxcar" | "tanker" | "hopper" | "flatcar";

export const CAR_TYPES: readonly CarType[] = ["boxcar", "tanker", "hopper", "flatcar"];
```

Add `carType: CarType` to the `Part` interface (default `"boxcar"`).

Add a new `TrainCar` interface to represent a single slot in the assembled train (a `CarInstance`):

```typescript
/** One slot in the assembled train. References a Part by id; can be duplicated. */
export interface TrainCar {
  readonly instanceId: string;   // unique per slot (e.g. "inst_abc123")
  readonly partId: string;       // references a Part.id
  readonly muted: boolean;       // tarp state — mutes audio when this car passes signal
}
```

Replace `ArrangeCar` (which has `repeats: 1|2|4`) with `TrainCar[]` as the new arrangement format. The `arrangement` field on `Project` becomes `readonly train: readonly TrainCar[]`.

> **Migration:** Update `normalizeProject` in `src/core/project-state.ts` to convert old `arrangement` (with `repeats`) into a flat `TrainCar[]` by expanding each `ArrangeCar` with `repeats: N` into N `TrainCar` entries. This preserves backward compatibility with saved projects.

Update all downstream consumers of `project.arrangement` (audio engine, Track component, Yard component) to use `project.train`.

Add new commands to the `Command` union:

```typescript
| { readonly type: "addToTrain"; readonly instanceId: string; readonly partId: string }
| { readonly type: "removeFromTrain"; readonly instanceId: string }
| { readonly type: "reorderTrain"; readonly instanceIds: readonly string[] }
| { readonly type: "muteCar"; readonly instanceId: string; readonly muted: boolean }
| { readonly type: "setCarType"; readonly partId: string; readonly carType: CarType }
```

### 1b. Update `src/core/project-state.ts`

Implement the new commands in the `reduce` function. Ensure `addToTrain` appends to the end of `project.train`. Ensure `removeFromTrain` removes by `instanceId`. Ensure `muteCar` toggles the `muted` flag on the matching `TrainCar`. Ensure `setCarType` updates `Part.carType`.

### 1c. Update `src/core/audio-engine.ts`

The audio engine currently uses `project.arrangement` (with `ArrangeCar.repeats`). Update `scheduleArrangement` and `carAtBar` to work with the new flat `project.train` array. Each `TrainCar` occupies exactly one bar. Muted cars (`muted: true`) should have their layers silenced — schedule them but at zero gain, or skip scheduling entirely. The simplest correct approach: skip scheduling layers for muted `TrainCar` entries.

---

## Phase 2 — Workshop Rebuild

### Goal

The Workshop is where a kid builds one beat car. They choose a car type (visual only), then fill the car's interior with instrument loops. All loops are visible at once — no scrolling.

### 2a. Update `src/game/assets.ts`

Add entries for the new v2 scene backgrounds and sprites:

```typescript
const sprite = (file: string): string =>
  new URL(`../assets/sprites/${file}`, import.meta.url).href;
const v2 = (file: string): string =>
  new URL(`../assets/scenes-v2/${file}`, import.meta.url).href;

export const SCENE_BG_V2 = {
  workshop: { key: "bg-workshop-v2", url: v2("workshop-scene-clean.png") },
  yard:     { key: "bg-yard-v2",     url: v2("yard-scene-clean.png") },
  track:    { key: "bg-track-v2",    url: v2("track-scene-clean.png") },
} as const;

export const SPRITES = {
  loco:           { key: "spr-loco",       url: sprite("loco.png") },
  boxcar:         { key: "spr-boxcar",     url: sprite("boxcar.png") },
  tanker:         { key: "spr-tanker",     url: sprite("tanker.png") },
  hopper:         { key: "spr-hopper",     url: sprite("hopper.png") },
  flatcar:        { key: "spr-flatcar",    url: sprite("flatcar.png") },
  signalUp:       { key: "spr-signal-up",  url: sprite("crossing-signal-up.png") },
  signalDown:     { key: "spr-signal-down",url: sprite("crossing-signal-down.png") },
  smokePuff:      { key: "spr-smoke",      url: sprite("smoke-puff.png") },
  tarp:           { key: "spr-tarp",       url: sprite("tarp.png") },
} as const;
```

### 2b. Update `src/game/scene-layout.ts`

Add a `WORKSHOP_LAYOUT_V2` object with normalized coordinates for the new empty-boxcar-interior mixing board region. The boxcar interior in `workshop-scene-clean.png` occupies approximately:

```typescript
export const WORKSHOP_LAYOUT_V2 = {
  // The empty boxcar interior — where the mixing board overlays go
  carInterior: { x: 0.13, y: 0.13, w: 0.74, h: 0.33 } satisfies NormRegion,
  // Car type picker row — below the car, above the instruments
  carTypePicker: { x: 0.13, y: 0.48, w: 0.74, h: 0.10 } satisfies NormRegion,
  // Instrument shelf (drum kit, mic, guitar, keyboard icons)
  shelf: { x: 0.12, y: 0.60, w: 0.76, h: 0.18 } satisfies NormRegion,
  // Transport bar
  transport: { x: 0.30, y: 0.84, w: 0.40, h: 0.12 } satisfies NormRegion,
} as const;
```

These are starting estimates — they will need a visual tuning pass against the running app. Keep them in `scene-layout.ts` as the single source of truth.

### 2c. Rebuild `src/components/Workshop.tsx`

The new Workshop component must:

1. **Use `bg-workshop-v2`** (the clean boxcar with empty interior) as the Phaser background.
2. **Render a car-type picker** as a React overlay over `WORKSHOP_LAYOUT_V2.carTypePicker`. Show 4 buttons (Boxcar, Tanker, Hopper, Flatcar) with the sprite image as the button icon. The active car type is highlighted. Clicking dispatches `{ type: "setCarType", partId: activePart.id, carType }`.
3. **Render the mixing board** as a React overlay inside `WORKSHOP_LAYOUT_V2.carInterior`. This is the existing sequencer grid, but it must:
   - Show ALL layers simultaneously (no scrolling, `overflow: hidden`)
   - Fit within the car interior without clipping
   - Scale the row height to fit `MAX_LAYERS` rows in the available height
   - Keep the existing beat-cell toggle interaction intact
4. **Render the instrument shelf** as a React overlay over `WORKSHOP_LAYOUT_V2.shelf` — this is the existing instrument picker (add lane buttons).
5. **Render the transport bar** over `WORKSHOP_LAYOUT_V2.transport` — Play/Stop/Loop, same as current.
6. **Add a "Done → Yard" button** in the header that dispatches `{ type: "setActiveView", view: "yard" }`.

The `WorkshopScene.ts` Phaser scene needs no changes — it just renders the background. All UI is React overlays.

---

## Phase 3 — Yard Rebuild

### Goal

The Yard is where the kid assembles the train. Left side: a palette of all built cars (the `project.parts`). Right side: the assembly line (the `project.train`). The gantry crane animates picking up a car from the palette and dropping it onto the assembly line.

### 3a. Update `src/game/scene-layout.ts`

Add `YARD_LAYOUT_V2`:

```typescript
export const YARD_LAYOUT_V2 = {
  // Palette area: the 4 parallel sidings on the left where built cars sit
  palette: { x: 0.03, y: 0.12, w: 0.55, h: 0.72 } satisfies NormRegion,
  // Assembly line: the single top track where the train is assembled
  assemblyLine: { x: 0.03, y: 0.04, w: 0.88, h: 0.10 } satisfies NormRegion,
  // Crane: the gantry crane occupies the right half of the yard
  crane: { x: 0.50, y: 0.10, w: 0.40, h: 0.70 } satisfies NormRegion,
} as const;
```

### 3b. Update `src/game/scenes/YardScene.ts`

The Yard scene now has two visual areas managed by Phaser:

**Palette area:** Render one sprite per `project.parts` entry. Use the car's `carType` to select the correct sprite key from `SPRITES`. Tint the sprite with the car's `color`. Position sprites on the siding slots using the existing `YARD_SLOTS` geometry (which already works well). Keep the existing selection ring.

**Assembly line:** Render one sprite per `project.train` entry in a horizontal row along the top track. Muted cars render with the `spr-tarp` sprite overlaid on top.

**Crane animation:** Expose a method `animatePickup(fromSlot: number, toTrainIndex: number, onComplete: () => void)`. When called, the crane's hook (a Phaser `Graphics` or `Image` object) tweens from its rest position to the palette slot, pauses briefly (simulating grab), then tweens to the assembly line position, then calls `onComplete`. The crane body itself does not move — only the hook/cable animates. Duration: ~800ms total.

The scene must export:
```typescript
interface YardSceneAPI {
  setCars(palette: YardCar[], train: TrainCar[]): void;
  setSelectedPalette(id: string | null): void;
  animatePickup(fromSlotIndex: number, toTrainIndex: number, onComplete: () => void): void;
}
```

### 3c. Rebuild `src/components/Yard.tsx`

The new Yard component must:

1. **Use `bg-yard-v2`** as the Phaser background.
2. **Palette selection:** React hit-area buttons over each palette slot (same approach as current `YARD_SLOTS` hit areas). Clicking a palette car sets local `selectedPartId` state and calls `scene.setSelectedPalette(id)`.
3. **"Add to Train" button:** Visible when a palette car is selected. Clicking it:
   - Mints a new `instanceId` (use `crypto.randomUUID()` or a simple counter)
   - Calls `scene.animatePickup(slotIndex, project.train.length, () => dispatch({ type: "addToTrain", instanceId, partId }))`
   - The dispatch happens in the `onComplete` callback so the assembly line updates only after the animation finishes
4. **Assembly line interaction:** React hit-area buttons over each train slot. Clicking a train car selects it and shows a "Remove" button and a "Mute/Unmute (Tarp)" toggle.
5. **"Send to Track" button:** Enabled when `project.train.length > 0`. Clicking it dispatches `{ type: "setActiveView", view: "track" }`. Add a brief CSS animation (the assembled train slides off to the right) before the view transition — use a 600ms CSS transition on the assembly line container, then dispatch after the timeout.
6. **"← Workshop" button** in the header.

---

## Phase 4 — Track Rebuild

### Goal

The assembled train (locomotive + `project.train` cars in order) rides the oval. The crossing signal at the bottom center fires when a car passes. That car's beat loop plays. Muted cars are skipped (tarp visible). Speed and direction are controllable.

### 4a. Invert the playback model

**Current model:** Audio engine drives progress → React feeds `scene.setProgress(0..1)` → Phaser moves the train.

**New model:** Phaser moves the train at its own velocity → when a car crosses the signal threshold → React dispatches audio changes.

Implement this in `src/game/scenes/TrackScene.ts`:

- Add `setVelocity(stepsPerSecond: number)`: sets how fast the train moves (maps to BPM)
- Add `setDirection(dir: 1 | -1)`: clockwise vs counter-clockwise
- Add `onCarPassSignal(cb: (instanceId: string) => void)`: callback fired each time a car crosses the signal point (normalized angle ≈ 0.5 on the bottom of the oval)
- The train position is now driven by Phaser's `update(time, delta)` loop, advancing `progress` by `velocity * delta / 1000` each frame
- The signal point is at the bottom center of the oval (normalized angle = 0.75 in the current OVAL parameterization, or wherever the bottom straight is)
- Fire `onCarPassSignal` when the leading edge of a car crosses the signal threshold (debounce: don't fire again until the car has moved at least one car-length past the signal)

### 4b. Update `src/core/audio-engine.ts`

Add a method `playCarLoop(partId: string, project: Project)`: stops any currently playing loop and starts playing only the layers of the `Part` with the given `partId`, in a 1-bar loop. This is called by the Track component each time a car passes the signal.

Add `stopAll()` as an alias for `stop()` if not already present.

### 4c. Rebuild `src/components/Track.tsx`

The new Track component must:

1. **Use `bg-track-v2`** as the Phaser background.
2. **Wire `onCarPassSignal`:** In `handleSceneReady`, register the callback. When fired:
   - Find the `TrainCar` with the given `instanceId`
   - If `muted`, call `engine.stop()`
   - Otherwise, find the `Part` and call `engine.playCarLoop(part.id, project)`
3. **Speed control:** A React overlay with a slider or `+`/`-` buttons. Maps to `scene.setVelocity(v)` and also calls `engine.setTempo(bpm)` to keep audio in sync.
4. **Direction control:** A `⟲` / `⟳` toggle button. Calls `scene.setDirection(1 | -1)`.
5. **Mute (tarp) per car:** React hit-area buttons over each car in the assembly line strip at the bottom of the screen (a horizontal list of car thumbnails). Clicking a car thumbnail dispatches `{ type: "muteCar", instanceId, muted: !car.muted }`. The scene re-renders the tarp overlay on that car.
6. **Crossing signal:** The signal sprite is rendered by Phaser at the bottom center of the oval. It switches between `spr-signal-up` and `spr-signal-down` when a car passes. Add a 300ms flash (the signal blinks red) using a Phaser tween on the signal sprite's alpha.
7. **Smoke:** When the train is moving, emit smoke puffs from the locomotive's smokestack. Use a Phaser `ParticleEmitter` with the `spr-smoke` texture. Emit one puff every ~500ms. Each puff rises upward and fades out over 1.5s.
8. **Car bounce:** Each car sprite gets a subtle vertical bounce animation using a Phaser tween: `y += 2` over 200ms, then back, looping. Offset the phase of each car by its index so they don't all bounce in sync.
9. **"← Yard" button** in the header.

### 4d. Update `src/game/scenes/TrackScene.ts`

Replace the programmatic `Graphics` rectangles with actual sprite images:
- Load `spr-loco`, `spr-boxcar`, `spr-tanker`, `spr-hopper`, `spr-flatcar`, `spr-signal-up`, `spr-signal-down`, `spr-smoke`, `spr-tarp` in `preload()`
- In `create()`, add the crossing signal sprite at the bottom center of the oval
- In `setCars(cars)`, create `Phaser.GameObjects.Image` objects using the correct sprite key for each car's `carType`, tinted with the car's color
- Scale sprites to fit the track proportionally (the locomotive should be ~1.5x the size of a car)
- Add the bounce tween to each car after placement
- Implement the smoke particle emitter

---

## Phase 5 — Integration & Polish

### 5a. Map scene

The Map scene (`src/components/Map.tsx`) needs no structural changes. It already navigates correctly to Workshop, Yard, and Track. However, update the navigation so:
- Clicking **Workshop** always goes to Workshop (create a new car or edit the active one)
- Clicking **Yard** goes to Yard (assemble the train)
- Clicking **Track** goes to Track only if `project.train.length > 0`; otherwise show a brief "Build a train first!" toast

### 5b. Layout coordinate tuning

After the rebuild, do a visual pass against the running app (`npm run dev`) and update the normalized coordinates in `scene-layout.ts` so all overlays align precisely with the painted scene art. This is a critical step — the coordinates in this prompt are estimates.

### 5c. Tests

Update the unit tests in `tests/unit/` to cover:
- `addToTrain` / `removeFromTrain` / `muteCar` / `setCarType` commands in `project-state.test.ts`
- `normalizeProject` migration from old `arrangement` format to new `train` format
- `scheduleArrangement` skips muted cars in `audio-engine.test.ts`

All 122 existing tests must still pass. Add new tests for the new commands.

---

## Execution Strategy

This is a large change. The recommended parallel execution order:

**Parallel track A (data layer — no UI dependencies):**
1. `types.ts` — add `CarType`, `TrainCar`, new commands
2. `project-state.ts` — implement new commands + migration
3. `audio-engine.ts` — update to use `project.train`, add `playCarLoop`
4. Unit tests for all of the above

**Parallel track B (asset wiring — no logic dependencies):**
1. `assets.ts` — add `SCENE_BG_V2` and `SPRITES`
2. `scene-layout.ts` — add `WORKSHOP_LAYOUT_V2` and `YARD_LAYOUT_V2`
3. `TrackScene.ts` — update to load sprites, add velocity/direction/signal/smoke/bounce

**Sequential (depends on A + B):**
1. `Workshop.tsx` — car type picker + mixing board overlay
2. `Yard.tsx` — palette + assembly line + crane animation
3. `Track.tsx` — signal callback + speed/direction controls + mute strip
4. Visual coordinate tuning pass
5. Final typecheck + full test run + build

---

## Definition of Done

- [ ] `npm run typecheck` — zero errors
- [ ] `npm test` — all tests pass (≥122, plus new ones)
- [ ] `npm run build` — clean build, no chunk size warnings above threshold
- [ ] Workshop: car type picker visible, mixing board fits in car interior without scrolling, all layers visible simultaneously, play/stop works
- [ ] Yard: palette shows built cars with correct sprites, Add to Train triggers crane animation, assembly line shows train in order, Send to Track navigates to Track
- [ ] Track: train rides the oval using sprite images (not programmatic rectangles), crossing signal fires and switches sprite, correct car's loop plays, mute/tarp works, speed and direction controls work, smoke particles emit from locomotive
- [ ] No regressions on Map navigation or boot flow

---

## Key Files Reference

```
src/
  core/
    types.ts              ← data model, Command union
    project-state.ts      ← pure reducer + normalizeProject
    audio-engine.ts       ← transport, scheduling, playCarLoop
  game/
    assets.ts             ← texture manifest (add SCENE_BG_V2, SPRITES)
    scene-layout.ts       ← normalized layout coords (add V2 layouts)
    scenes/
      TrackScene.ts       ← oval animation, signal, smoke, bounce
      YardScene.ts        ← palette sprites, assembly line, crane tween
      WorkshopScene.ts    ← background only, no changes needed
      BackgroundScene.ts  ← base class, contain/cover fit
  components/
    Workshop.tsx          ← car type picker + mixing board overlay
    Yard.tsx              ← palette hit areas + assembly line + crane trigger
    Track.tsx             ← signal callback + controls + mute strip
    Map.tsx               ← minor: guard Track nav on train.length > 0
  assets/
    scenes-v2/            ← clean backgrounds (already committed)
    sprites/              ← isolated sprites (already committed)
tests/
  unit/
    project-state.test.ts ← add new command tests
    audio-engine.test.ts  ← add muted car test
```
