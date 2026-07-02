# iBeetKidz Status Log

**Date:** July 2, 2026
**Current Phase:** Art Polish Sprint — Cross-Scene Visual Consistency

> **Purpose:** This document tracks the current implementation state, what was just completed, what is currently blocking, and the immediate next steps for the engineering agents. It is highly volatile and should be updated after every major work session.

---

## 1. Current State

All four views run on the data-driven pipeline. **Workshop, Yard, and Track are
now fully migrated to the generic Three-Zone engine** (`ui-scene.ts` +
`ui-sprites.ts` interpreting `src/assets/maps/*.json`); Map uses the plain
hit-area adapter (nav only, per the charter). No scene owns chrome coordinates.

### Recently Completed (2026-07-02 — Art Sprint: Cross-Scene Consistency)
*   **Yard/Track base plates updated:** both `yard-scene-clean-v2.png` and
    `track-scene-clean-v2.png` repainted to include a clear top band (~180px)
    so `panel-header-v2` can sit over all three scenes identically.
*   **Nav plaques redesigned:** new scene-specific nav plaque sprites generated
    — MAP (← + overworld scroll icon), WORKSHOP (← + gear/wrench), YARD
    (parallel sidings + →), TRACK (oval loop + →). Cream parchment face, dark
    plum text, silver riveted frame. Replaces the old generic arrow-only plaques.
*   **Yard action buttons (AR-001):** all 5 individual buttons generated with
    idle + pressed states: EDIT, HITCH, UNHITCH, TO TRACK, DELETE.
*   **Yard panel plate (AR-002):** `panel-yard-actions.png` generated — dark
    stone with silver riveted frame, empty, matching `panel-transport.png` family.
*   **RIDE button (AR-004):** `btn-track-ride-idle/pressed.png` — golden steam
    locomotive with steam puff, replaces the reused play-triangle on Track.
*   **Husky on keyboards (inst-piano):** `inst-piano-passive/hover/active.png`
    generated. Husky character at a keyboard, 3 states. Mapped to the piano/
    melody editor tool (the frog maps to beats only).
*   **ART_REQUESTS.md updated:** AR-001 through AR-005 marked done; AR-006
    (nav plaque pressed states for WORKSHOP/YARD/TRACK) and AR-008 (NEW CAR
    picker selected states) logged as remaining LOW items.

### Previously Completed (2026-07-02 — Phase 2: Yard + Track migration)
*   **Yard on the engine:** `yard.json` is a true three-zone map — nav plaques
    (`btn-nav-workshop`/`btn-nav-exit` sprites, engine-rendered cream captions)
    up top; the bottom bar is the interim baked action strip placed as a `panel`
    with five **labelled** transparent hits (EDIT / HITCH / UNHITCH / TO TRACK /
    DELETE) laid over its tiles via the same content-box math that places the
    strip — aligned by construction. `buildChrome`/`layoutChrome` hardcoding and
    `YARD_CHROME` are gone. Crane/departure animation flow is untouched.
*   **Track on the engine:** `track.json` gives Track a REAL sprite transport
    bar on the base plate's painted frame — `btn-tempo-down`(SLOW −10) /
    `btn-stop`(STOP) / `btn-play`(RIDE) / `btn-tempo-up`(FAST +10), all with
    idle⇄pressed art + captions — plus a Workshop-style cream **SPEED LCD**
    (`lcd-transport` display anchor; React pushes `tempoBpm` via `setTempo`).
    The redundant baked pause tile and `TRACK_CHROME` are gone.
*   **Engine growth (all data-driven):** Tiled `labelColor` property (captions
    on dark scenes author a cream); captions now render under art-less hit
    spawns too; `UiSpriteDef.crop` crops opaque-padded canvases (the RGB yard
    strip's black margins) to their content box; captions width-clamp so
    adjacent labels never collide; `loadUiSprites(scene, only)` lets a scene
    preload just the sprites its own map references.
*   **Input bug fixed (pre-existing, user-facing):** Phaser cached the canvas
    bounds mid view-swap, so the first taps on a freshly mounted scene mapped to
    world (0,0) — buttons felt dead. `PhaserGame.tsx` now re-measures
    (`scale.refresh()`) on `pointerenter`/`pointerdown` before Phaser handles
    the event. Verified by real headless canvas clicks on every migrated button.
*   **Cleanup:** dead `SPRITES` entries (nav/panel/lcd chrome) removed from
    `assets.ts`; chrome constants removed from `scene-layout.ts`.
*   **Click-through bug fixed (Eric report):** closing a Workshop tool modal
    teleported to the Yard — the ✕ fires on pointerdown, the panel hides, and
    Phaser delivered the pointerup to the Send to Yard plaque underneath. All
    chrome controls (ui-scene buttons/instruments/hits + the adapter hits) now
    arm on their own pointerdown and fire only an armed release; dragging off a
    button cancels it. Reproduced and re-verified with real headless clicks.
*   **Verification:** typecheck clean, **194 unit tests** (new `tiled-maps`
    fixture suite + labelColor/crop coverage), vite build clean, **5/5 e2e**,
    plus headless click-through of Yard EDIT→Workshop, Track nav→Yard, and
    RIDE/FAST/STOP, and fresh screenshots of all three scenes.

### What is Working
*   Workshop / Yard / Track chrome is 100% authored in Tiled JSON; the scenes are
    generic interpreters. Buttons have captions; sprite buttons have pressed
    states; instruments have passive/hover/active.
*   Yard: palette select → crane HITCH → assembled train → TO TRACK departure;
    EDIT/DELETE/UNHITCH act on the live selection. Track: ride/stop/tempo with
    LCD feedback; train + signal + smoke driven from the transport.
*   The chipmunk mic sprite carries its microphone in all three states
    (passive/hover/active verified from the PNGs) — the old "mic prop missing"
    bug is stale; art is fine.

---

## 2. Immediate Next Steps

1.  **Swap the Yard strip for individual buttons** — art is now ready (AR-001/
    AR-002 done). Replace the `panel-yard-actions` panel + hit objects in
    `yard.json` with five `ui-button` sprite objects pointing to
    `btn-yard-<name>-idle/pressed.png`. Pure Tiled edit + 5 manifest entries;
    zero scene-code changes. Track's transport bar is the template.
2.  **Swap Workshop nav plaques** — replace the old `btn-nav-workshop` /
    `btn-nav-yard` references in `workshop.json` with the new
    `btn-nav-map-idle/pressed` (left) and `btn-nav-yard-idle` (right).
    Same for `yard.json` (WORKSHOP left, TRACK right) and `track.json`
    (YARD left, MAP right). Pure Tiled + manifest edit.
3.  **Add inst-piano to Workshop field** — add a `ui-instrument` object in
    `workshop.json` pointing to `inst-piano` sprite, with `action:
    workshop-add-melody`. Position it between the cat/guitar and alien/violin.
2.  **Reorder UI:** the strip's arrows tile is intentionally unwired (no
    `reorderTrain` EventBus event yet). Needs a small design (tap-to-swap? drag
    on the assembly line?) then an `EventMap` entry + reducer wiring.
3.  **Track loop-count control:** design + art + `EventMap` event still missing
    (charter lists Mute/Loop as Track's bottom bar; mute is the HTML tarp strip
    today and could migrate into the canvas per-car).
4.  **Track playback position sync** (long-standing #4): drive playback FROM the
    physical crossing-signal pass rather than the transport driving the visual.

---

## 3. Known Bugs & Future Work (Post-Refactor)

1.  **Lane Delete UI (Workshop grid):** the per-lane ✕ exists in the grid rows —
    verify against the delegation ask and kid-size the hit target.
2.  **Workshop LCD/STOP overlap:** the SONG/TEMPO chip slightly overlaps the
    STOP button at some widths — nudge `lcd-transport` / `btn-stop` rects in
    `workshop.json` (Tiled-only fix).
3.  **Yard assembly-line visuals:** holding-area emphasis + richer crane motion
    remain future polish.
4.  **Sprite weight:** the button/instrument PNGs are still 2–4 MB each
    (oversized canvases); the downscale pass is still TODO.
