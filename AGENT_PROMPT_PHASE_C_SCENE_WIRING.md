# Agent Prompt: Phase C — Wire Yard, Track & Map Scenes to New Art

**Repo:** `eriqueo/ibeetkidz`
**Branch:** work on `main` directly (or a `worktree-scenes` worktree — your call)
**Gates (must all pass before committing):** `npm run typecheck` clean · `npm run test` 167/167 · `npm run test:e2e` 5/5 · `npm run build` green

---

## Context

The Workshop is fully data-driven via `TiledSceneAdapter` and deployed. The three remaining scenes — Yard, Track, and Map — still have HTML `PixelButton` nav buttons floating over the canvas as React overlays. The new clean base-plate art and all interactive sprites are now in the repo and registered in `assets.ts`.

Your job is to finish Phase B by migrating the nav buttons (and any remaining HTML chrome) in Yard, Track, and Map into the Phaser canvas, exactly following the Workshop precedent.

---

## Reference Implementation

**Read `WorkshopScene.ts` in full before writing a single line.** The pattern is:

1. `preload()` — call `this.loadBackground(SCENE_BG_V2.workshop)`.
2. `create()` — call `this.addBackground("contain")`, then parse the Tiled map and call `spawnTiledScene(this, spawns, { bgRect: this.backgroundRect })`.
3. Store the returned `hits` array as `this.chromeHits` (index-aligned with `spawns`).
4. In `onResize()` — call `relayoutSpawns(this.chromeHits, this.chromeSpawns, this.backgroundRect, cam)`.
5. The `TiledSceneAdapter` wires each spawn's `action`/`arg` to an `EventBus.emit` automatically — no manual `on("pointerdown")` needed.

The Tiled maps (`yard.json`, `track.json`, `map.json`) are already authored and in `src/assets/maps/`. The new base plates are in `SCENE_BG_V2`. The new sprite keys are in `SPRITES`.

---

## Task 1: YardScene — Migrate nav buttons into Phaser

**Current state:** `Yard.tsx` renders two `PixelButton` nav overlays (Workshop ◀, Map 🗺️) in HTML divs above the canvas. `YardScene.ts` builds its own `makeButton()` / `layoutButtons()` system for the action buttons (add/remove/edit/delete/send-to-track) — this is the old bespoke approach.

**What to do:**

1. **Replace the bespoke button system in `YardScene.ts`** with the `TiledSceneAdapter` pattern:
   - Import `yardMap from "../../assets/maps/yard.json"`.
   - In `preload()`, add `this.loadBackground(SCENE_BG_V2.yard)` (already there — verify it points to `yard-scene-clean-v2.png`).
   - In `create()`, after `this.addBackground("contain")`, parse `yardMap`'s `ui-layer` with `parseTiledLayer` and call `spawnTiledScene`.
   - Remove the `makeButton`, `layoutButtons`, `refreshButtons`, `buttons` array, and all the `YARD_LAYOUT_V2` button-position math. The Tiled map already has the correct coordinates for all 8 spawns (2 nav + 6 action).
   - Keep the crane animation, car token rendering, and selection logic — those are not button chrome.

2. **Wire the `yard-nav` event in `Yard.tsx`:**
   - The Tiled map emits `"yard-nav"` with arg `"workshop"` or `"map"`. This event does not yet exist in `EventMap`.
   - Add `"yard-nav": [view: AppView]` to `EventMap` in `EventBus.ts`.
   - In `Yard.tsx`, subscribe to `EventBus.on("yard-nav", (view) => dispatch({ type: "setActiveView", view }))` (same pattern as `workshop-nav` in `Workshop.tsx`).
   - Remove the two HTML `PixelButton` nav divs from `Yard.tsx`.

3. **Wire `yard-remove-from-train`** — the Tiled map emits this but `EventMap` only has `yard-add-to-train`. Add `"yard-remove-from-train": [partId: string]` to `EventMap` and handle it in `Yard.tsx` (same handler as the existing remove button).

4. **Wire `yard-edit-car`** — add `"yard-edit-car": [partId: string]` to `EventMap` if not present. Handle in `Yard.tsx`.

5. **Wire `yard-remove-car`** — add `"yard-remove-car": [partId: string]` to `EventMap` if not present. Handle in `Yard.tsx`.

---

## Task 2: TrackScene — Migrate nav buttons into Phaser

**Current state:** `Track.tsx` renders two `PixelButton` nav overlays (Yard ◀, Map 🗺️) in HTML divs. `TrackScene.ts` already uses `SCENE_BG_V2.track` and has native Phaser transport buttons (the `CONTROL_SPECS` system). The transport buttons are already in Phaser — only the nav buttons need migrating.

**What to do:**

1. **Wire the `track.json` Tiled map in `TrackScene.ts`:**
   - Import `trackMap from "../../assets/maps/track.json"`.
   - In `create()`, after `this.addBackground("contain")`, parse `trackMap`'s `ui-layer` and call `spawnTiledScene`. The map has 2 nav spawns (`btn-track-workshop` → `track-nav:"workshop"`, `btn-track-exit` → `track-nav:"map"`) and 5 transport spawns + 1 LCD display anchor.
   - The transport spawns in `track.json` (`btn-speed-down`, `btn-stop`, `btn-ride`, `btn-speed-up`) overlap with the existing `CONTROL_SPECS` system. **Do not double-wire them.** Either: (a) remove `CONTROL_SPECS` and let the Tiled adapter handle all transport, or (b) filter out transport-type spawns from the Tiled parse and keep `CONTROL_SPECS` for transport only. Option (a) is cleaner.

2. **Add `"track-nav": [view: AppView]` to `EventMap`** and subscribe in `Track.tsx` (same pattern as `yard-nav` above).

3. **Remove the two HTML `PixelButton` nav divs from `Track.tsx`.**

---

## Task 3: MapScene — Migrate nav buttons into Phaser

**Current state:** `MapScene.ts` is a thin `BackgroundScene` using the old `SCENE_BG.map` (reference art with painted labels). `Map.tsx` renders three transparent HTML `<button>` overlays pinned over the painted building spots.

**What to do:**

1. **Upgrade `MapScene.ts` to use the new clean base plate:**
   - Change `preload()` to load `SCENE_BG_V2.map` (key `"bg-map-v2"`, file `map-scene-clean.png`).
   - In `create()`, after `this.addBackground("cover")`, parse `map.json`'s `ui-layer` and call `spawnTiledScene`. The map has 3 nav spawns (`hit-workshop`, `hit-yard`, `hit-track`) each emitting `"map-nav"` with the destination arg.

2. **Add `"map-nav": [view: AppView]` to `EventMap`** and subscribe in `Map.tsx` (same pattern).

3. **Remove the three HTML `<button>` destination overlays from `Map.tsx`.** Keep the toast logic — it should now be triggered by the `map-nav` handler (check `liveTrain` before dispatching, same as the current `go()` function).

4. **Place the handcar sprite** on the map to indicate the current location. In `MapScene.ts`, after spawning the chrome, add a `this.add.image(x, y, SPRITES.handcar.key)` positioned over the current scene's building. Listen for `"current-scene-ready"` or accept a `setLocation(view: AppView)` method called from `Map.tsx` to reposition it.

---

## Task 4: Update `assets.ts` SCENE_BG_V2 (already done — verify only)

`SCENE_BG_V2` already has entries for `yard`, `track`, and `map` pointing to the new v2 files. Verify the keys match what the scenes load. No changes needed unless a key is wrong.

---

## Do Not

- Do NOT change the crane animation, car token layout, or train assembly logic in `YardScene.ts` — only the button chrome changes.
- Do NOT remove the tarp-strip React overlay in `Track.tsx` — it stays as HTML for now.
- Do NOT hardcode pixel positions for hit-areas — all positions come from the Tiled JSON.
- Do NOT add new events to `EventMap` without a corresponding handler in the React component.
- Do NOT change `workshop.json` or `WorkshopScene.ts`.

---

## Verification Checklist

- [ ] `npm run typecheck` — clean
- [ ] `npm run test` — 167/167
- [ ] `npm run test:e2e` — 5/5 (the E2E bridge is already wired; nav events are tested)
- [ ] `npm run build` — green, no new bundle warnings
- [ ] Manual smoke: open the app, navigate Workshop → Map → Yard → Track → Map, confirm all nav buttons work from inside the canvas with no HTML overlays visible
- [ ] Yard action buttons (add/remove/edit/delete/send-to-track) all fire correctly
- [ ] Track transport buttons still work (play/stop/speed)
- [ ] Map handcar appears and repositions when navigating between scenes
