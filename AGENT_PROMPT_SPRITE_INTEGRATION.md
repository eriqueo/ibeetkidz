# Agent Prompt: Wire New Spritesheets into Phaser Scenes

## Context

A complete animation-ready asset library has been generated and committed to the repo.
Read `src/game/sprite-assets.ts` — it is the single source of truth for all sprite loading,
frame key naming, direction logic, and animation registration. Do not deviate from it.

## What exists now

```
src/assets/spritesheets/
  train.png   + train.json    — 40 frames: loco + boxcar + tanker + hopper + flatcar, 8 dirs each
  smoke.png   + smoke.json    — 4 frames: smoke-1 → smoke-4
  signal.png  + signal.json   — 2 frames: signal-up, signal-down
  tarp.png    + tarp.json     — 1 frame: tarp

src/game/sprite-assets.ts     — loadSpriteAssets(), registerAnimations(), velocityToDirection(),
                                frameKey(), spawnSmoke()
```

The spritesheet frame size is **128×128px**. All frames have transparent backgrounds.
The train sheet is an 8-column atlas. Frame keys follow the pattern `{type}-{direction}`,
e.g. `loco-E`, `boxcar-NW`, `tanker-S`.

## What needs to change

### 1. TrackScene.ts — Replace programmatic rectangles with real sprites

**Current broken behaviour:** TrackScene draws coloured rectangles for the locomotive and cars,
and rotates a single sprite (or rectangle) as the train moves. This looks wrong.

**Required behaviour:**

a. In `preload()`, call `loadSpriteAssets(this)` from `sprite-assets.ts`.

b. In `create()`, call `registerAnimations(this)`. Create the signal sprite at the bottom-center
   of the oval using `this.add.sprite(signalX, signalY, 'signal', 'signal-up')`.
   Store it as `this.signalSprite`.

c. When the train arrangement changes (new `train` array from the store), destroy all existing
   car sprites and rebuild them. For each car in `train[]`:
   - Determine its `CarType` (default to `'boxcar'` if undefined)
   - Create `this.add.sprite(0, 0, 'train', frameKey(carType, 'E'))` — position will be set
     each frame in `update()`
   - Store in `this.carSprites: Phaser.GameObjects.Sprite[]`
   - Also create `this.locoSprite` for the locomotive

d. In `update(deltaMs)`:
   - Advance the train's position along the ellipse path (existing velocity logic is fine)
   - For each car sprite, compute its (x, y) on the ellipse and its tangent direction
   - Call `velocityToDirection(dx, dy)` to get the compass direction
   - Set `sprite.setFrame(frameKey(carType, direction))`
   - Apply a gentle vertical bounce tween: `sprite.y += Math.sin(time * bounceFreq) * 2`

e. When a car passes the signal point (bottom-center of oval, ~270° on the ellipse):
   - Swap `signalSprite.setFrame('signal-down')` for 500ms, then back to `'signal-up'`
   - Fire the existing `onCarPassSignal` event

f. Smoke: call `spawnSmoke(this, locoX - smokeOffsetX, locoY - smokeOffsetY, 0.3)` every
   ~800ms while the train is moving. Use `this.time.addEvent` for the interval.

g. Tarp: when a car is muted, overlay a tarp sprite on top of that car sprite.
   `this.add.image(car.x, car.y, 'tarp', 'tarp').setScale(carSprite.scaleX)`

### 2. YardScene.ts — Replace placeholder car sprites with real sprites

In `preload()`, call `loadSpriteAssets(this)`.

In `create()`, when rendering the palette cars in the sidings, use:
```ts
this.add.image(slotX, slotY, 'train', frameKey(car.carType ?? 'boxcar', 'S'))
```
(facing South = top-down view, cars are parked horizontally in the sidings)

When the crane picks up a car and drops it into the assembly line, use the same `frameKey`
to render the car in the assembly line at direction `'E'` (facing right, as if on a track).

### 3. WorkshopScene.ts — Car type picker uses real sprites

The car type picker buttons already load the individual PNG files from `src/assets/sprites/`.
Update them to use the spritesheet atlas frames instead:
- Replace `<img src={boxcarPng}>` etc. with Phaser `this.add.image(x, y, 'train', 'boxcar-S')`
  rendered into a small preview canvas, OR keep as React `<img>` tags but point them at the
  pre-processed individual sprite files in `src/assets/sprites-v2/` (the cleaned transparent ones).

The simplest correct approach: keep the React `<img>` buttons but update the `src` to point
at `src/assets/sprites-v2/boxcar-E.png` etc. (the processed transparent PNGs). Do NOT use
the old `src/assets/sprites/` path — those have grey backgrounds.

### 4. Do NOT touch

- `src/core/` — audio engine, types, project state
- `src/components/Map.tsx`
- Any test files
- `src/game/sprite-assets.ts` — read it, use it, do not modify it

## Definition of Done

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run test` — all tests pass (count must be ≥ current passing count)
- [ ] `npm run build` — succeeds, no warnings about missing assets
- [ ] TrackScene renders real train sprites (not rectangles) that change direction frames
      as they move around the oval
- [ ] Smoke puffs appear above the locomotive while moving
- [ ] Signal sprite swaps to arm-down when a car passes
- [ ] Tarp sprite overlays muted cars
- [ ] Yard palette shows real car sprites in their siding slots
- [ ] Workshop car picker buttons show transparent sprite images (no grey box backgrounds)

## How to run

```bash
git pull origin main
npm install
npm run typecheck
# implement changes
npm run typecheck && npm run test && npm run build
git add -A && git commit -m "feat: wire spritesheets into TrackScene, YardScene, Workshop"
git push origin main
```
