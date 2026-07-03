# iBeetKidz Status Log

**Date:** July 2, 2026
**Current Phase:** Cross-Scene Consistency — art landed + wired in

> **Purpose:** This document tracks the current implementation state, what was just completed, what is currently blocking, and the immediate next steps for the engineering agents. It is highly volatile and should be updated after every major work session.

---

## 1. Current State

All four views run on the data-driven pipeline. **Workshop, Yard, and Track are
now fully migrated to the generic Three-Zone engine** (`ui-scene.ts` +
`ui-sprites.ts` interpreting `src/assets/maps/*.json`); Map uses the plain
hit-area adapter (nav only, per the charter). No scene owns chrome coordinates.

### Recently Completed (2026-07-03, later — bottom bars unified + new train atlas)
*   **AR-010/AR-011 wired in:** Workshop + Track transport bars now use the
    unified dark keycap set (`btn-transport-stop/play/loop/slow/fast`, baked
    labels, idle⇄pressed) on the dark `panel-transport-v2` plate — all three
    bottom bars are ONE design language with the Yard. Engine captions on the
    transport buttons removed (labels are in the art); the old
    `btn-stop/play/loop/tempo-down/tempo-up` + `panel-transport` manifest
    entries retired. Pure Tiled + manifest edit, zero scene code — as designed.
*   **AR-012 train atlas assembled:** `scripts/build_train_atlas.py` keys the
    grey wash off the new per-direction ref frames, crops to content, applies
    one scale per car type, and writes the 5×8 128px atlas to
    `public/assets/spritesheets/train.png` (train.json unchanged). Verified
    riding the oval in the production build. Placeholders logged as AR-012:
    flatcar's six missing directions are mirror/rotate derivations, and
    `loco-ref-N` is a front view where a rear view belongs.
*   **New art run through the perf pipeline:** transport keycaps → 512px PNG8,
    panel quantized (32 MB → 1 MB); the ten committed `_original` duplicate
    PNGs removed (established precedent — they re-bloat the buttons/ glob).

### Previously Completed (2026-07-03 — consistency pass from Eric's device shots)
*   **Bottom-bar inconsistency logged for Manus (AR-010/AR-011):** the three
    bars are three design languages — Yard's dark steampunk keycaps with baked
    labels are the keeper; Workshop's cream keycaps + captions and Track's
    mixed cream/dark bar get replaced once the unified `btn-transport-*` set
    and the dark `panel-transport-v2` plate land. Swapping them in will be a
    pure Tiled + manifest edit.
*   **Muting moved into the canvas:** tap a car on the Track oval to cover /
    uncover it with the tarp (`track-car-mute-toggled` + kid-sized armed hit
    on each car token). The HTML tarp strip is gone — on non-16:9 screens
    (Eric's iPad) it floated in the letterbox above the canvas, because HTML
    overlays can't track the FIT-scaled canvas. Verified with real clicks on
    a 4:3 viewport; e2e updated to exercise the new event.
*   **Dead code pruned:** `assets.ts` is down to `SCENE_BG_V2` + the handcar
    (the v1 `SCENE_BG` glob was silently bundling the whole `references/`
    dir); `WORKSHOP_LAYOUT`/`SCENE_ASPECT` and the unused car-sprite maps are
    gone. dist: 39 MB → **14 MB**.

### Previously Completed (2026-07-02, later — deploy unblocked + asset perf pass)
*   **Live-site outage root-caused (Eric: "no headers"):** the Pages workflow
    gates on `npm run test`; a fixture test still asserting the LCD's pre-fit
    position shipped red, so the deploy FAILED and the site stayed on the
    pre-header build. Lesson encoded: re-run the FULL suite after the last
    edit, not the second-to-last. The test now asserts the real invariant
    (chip covers the baked sage window).
*   **Downscale pass DONE (was a long-standing TODO):** all runtime PNGs
    downscaled to sane resolutions (keycaps 512, plaques 1024, instruments
    768) and palette-quantized to PNG8 — 265 MB → 12 MB. Workshop now
    preloads only its own map's sprites + picker tiles like Yard/Track.
    Scenes previously queued ~130 MB and painted NOTHING until preload
    finished — minutes of black screen on a real connection. Verified against
    the production build: every scene complete in ~2 s, art visually unchanged.
*   Remaining perf follow-up: a loading indicator between view swaps would
    still be kind on slow connections (Phaser paints only after preload).

### Previously Completed (2026-07-02 — engineering pass wiring the art sprint in)
*   **Yard bottom bar is real buttons:** the interim baked strip + labelled hits
    are gone; `yard.json` now places `panel-yard-actions` (the empty plate) with
    five `ui-button` keycaps (`btn-yard-edit/hitch/unhitch/totrack/delete`,
    idle⇄pressed, baked labels — no captions needed). Zero scene-code changes,
    exactly as designed.
*   **Nav plaques unified across scenes:** all three maps mount `panel-header-v2`
    with the new landscape parchment plaques on it — Workshop: ←MAP · NEW CAR ·
    YARD→; Yard: ←WORKSHOP · TRACK→; Track: ←YARD (returns) · MAP→ (top-right).
    Old `btn-map`/`btn-sendtoyard`/root `btn-nav-*` manifest entries retired.
*   **Yard→Track guard:** the TRACK plaque navigates directly, so `Yard.tsx`
    now mirrors the Map's build-a-train-first guard (toast, stays in the Yard).
    Verified live with an emptied train.
*   **Track RIDE:** dedicated `btn-track-ride` keycap (baked label) replaces the
    reused play triangle.
*   **Field constants retuned to the repainted plates** (`scene-layout.ts`):
    Yard sidings now start at y 0.517 (rails measured), assembly line is the
    interior straight at 0.361; Track oval is `{cx .5, cy .47, rx .346, ry .163}`
    with the signal anchor at 0.683. Measured from the PNGs, not eyeballed.
*   **Workshop LCD fixed (old bug #2):** `lcd-transport` re-authored to exactly
    cover the panel's baked sage window (measured at design 266,1229→832,1347) —
    no more green sliver, clear of the STOP keycap. Tiled-only fix.
*   **Track tarp strip** moved below the new header band (top 27%).
*   **Verification:** typecheck clean, **198 unit tests**, build clean, **5/5
    e2e**, live click-through of every new button (EDIT→Workshop, plaques across
    all scenes, RIDE/STOP, guard toast), fresh screenshots of all three scenes.
*   AR-007 verified (`inst-piano` key matches); AR-009 logged (semi-opaque halo
    on the new keycap canvases).

### Previously Completed (2026-07-02 — Art Sprint: Cross-Scene Consistency)
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

(The art sprint's three engineering asks — yard button swap, nav plaque swap,
inst-piano — are all DONE; inst-piano had already been in `workshop.json` since
the Phase 2 migration.)

1.  **Reorder UI:** no reorder control exists (the old strip's arrows tile was
    never wired; `reorderTrain` has no EventBus event). Needs a small design
    (tap-to-swap? drag on the assembly line?) then an `EventMap` entry +
    reducer wiring — and a `btn-yard-reorder` keycap from the art queue.
2.  **Track loop-count control:** design + art + `EventMap` event still missing
    (charter lists Mute/Loop as Track's bottom bar; mute is now in-canvas —
    tap a car to tarp it — so loop-count is the remaining gap).
3.  **Swap in AR-012 art when it lands** (flatcar directions + loco rear
    view): drop the refs into `src/assets/spritesheets/` and re-run
    `python3 scripts/build_train_atlas.py` — nothing else changes.
3.  **Track playback position sync** (long-standing): drive playback FROM the
    physical crossing-signal pass rather than the transport driving the visual.

---

## 3. Known Bugs & Future Work (Post-Refactor)

1.  **Lane Delete UI (Workshop grid):** the per-lane ✕ exists in the grid rows —
    verify against the delegation ask and kid-size the hit target.
2.  **Yard assembly-line visuals:** holding-area emphasis + richer crane motion
    remain future polish (the crane lift height in `YardScene.animatePickup`
    deserves a look against the repainted plate).
3.  **Sprite weight:** the button/instrument PNGs are still 2–4 MB each
    (oversized canvases); the downscale pass is still TODO.
