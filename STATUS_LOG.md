# iBeetKidz Status Log

**Date:** July 2, 2026
**Current Phase:** Cross-Scene Consistency — art landed + wired in

> **Purpose:** This document tracks the current implementation state, what was just completed, what is currently blocking, and the immediate next steps for the engineering agents. It is highly volatile and should be updated after every major work session.

---

## 1. Current State

### Workshop Revamp — tasks 1–7 LANDED (2026-07-03, night)
*   **Layered field (tasks 1+2):** `workshop-interior-clean` is the bg; the
    active car is a sprite on a Tiled `car-anchor` rect (wheels bottom-aligned
    to the painted rails); the sequencer chalkboard mounts over the punched
    interior void (`CAR_SIDE_VOID` in assets.ts — identical across all four car
    sprites), so a car-type swap is a pure texture change (verified live,
    boxcar⇄tanker). The note grid draws on the chalkboard slate; rows size for
    ≥4 lanes so one lane doesn't balloon.
*   **Characters grounded (task 5):** feet on the interior's floor line
    (~1195); slimmed so board rows 1–3 stay clear. Rows 4+ can sit behind the
    cast — **composition needs Eric's eye** (5 characters × full board width
    can't fully avoid overlap).
*   **SEND TO YARD (part of task 4):** header plaque → the car+board+grid
    slide off right with a two-tone whistle (procedural) → travel to the Yard.
*   **Edit-vs-New modal (task 6):** offered once per Workshop visit when the
    active car has lanes — KEEP EDITING closes; NEW CAR emits
    `workshop-new-car` (fresh empty active car). Baked-plaque hits, armed-press.
*   **Instrument editor (task 7):** the melody 🎹 editor now renders on the
    AR-016 `panel-editor` art — note canvas on the slate; control deck = the
    wobble/crunch knobs (drag up/down, ±120° sweep), LEVEL fader (lane volume),
    and the ×2 toggle (arms double-beat mode: tapping an existing note toggles
    its roll; doubled notes wear a gold ring). New Layer fields
    `wobble`/`crunch` (+ `setLayerWobble/Crunch` commands, makeLayer
    passthrough so saves keep them) drive LIVE per-lane sends in the adapter
    (Chorus / BitCrusher in `scheduledDestination`) — audibility verified via
    the audio probe (masterPeak 0.28 with both knobs hot).
*   **Art pipeline:** whole AR-016 drop + the unquantized AR-014 track plate
    through downscale+PNG8 (34 MB → 3 MB); the knob/toggle/fader/modal/editor
    canvases shipped with a semi-opaque backdrop wash (AR-009 class) —
    flood-keyed to true alpha-0 in the pipeline (logged as AR-017); ui-atlas
    rebuilt (4 pages).
*   Remaining from the design doc: instrument character redraws (AR-016 item
    4, still with Manus); pitch-bend UI in the editor (playback via `pins`
    already works end-to-end); editor-modal polish per Eric's review.

### Desktop "no sound" report — empirically ruled OUT in the app (2026-07-03)
*   Instrumented the audio chain: `audioDiag()` on the adapter reads the
    Tone context state, transport state, destination mute/volume, and a
    master-output peak off the destination-tapped analyser (the visualizer's).
    Exposed via the dev test bridge AND — read-only — on the live site behind
    `?audiodiag` (`window.__ibeetkidz_audio__.diag()` in the console).
*   **Dev + PRODUCTION build both verified audible** headlessly: real canvas
    clicks (boot → Map → Workshop → guitar → PLAY) on the built app show
    masterPeak ≈ 0.28–0.43 at the destination. Context `running`, transport
    `started`, destination unmuted at 0 dB in every scenario.
*   **Silence-by-design confirmed:** the boot-seeded train car has ZERO lanes,
    so a fresh profile riding the Track animates the train in total silence —
    indistinguishable from broken audio. Same for PLAY in Workshop before any
    instrument is tapped. If Eric's desktop repro was a fresh browser profile,
    this is the whole bug (UX gap, not regression).
*   New e2e guard: `audio-output.spec.ts` asserts PLAY with a notes lane pushes
    real samples to the master output (peak > 0.02) — the transport clock
    running is NOT accepted as proof of audio anymore.
*   **If it recurs on Eric's desktop:** open the live site with `?audiodiag`,
    press play, run `__ibeetkidz_audio__.diag()`. `masterPeak > 0` = the app is
    producing sound and the silence is OS/output-device routing; `masterPeak
    === 0` with notes present = capture the full diag object + what the lanes
    contain.

All four views run on the data-driven pipeline. **Workshop, Yard, and Track are
now fully migrated to the generic Three-Zone engine** (`ui-scene.ts` +
`ui-sprites.ts` interpreting `src/assets/maps/*.json`); Map uses the plain
hit-area adapter (nav only, per the charter). No scene owns chrome coordinates.

### Recently Completed (2026-07-03, night — ride quality pass from Eric's review)
*   **Smoothness fixed:** the train position was read via `getTransportStep(16)`
    — the transport FLOORS to the requested subdivision count, so the ride was
    quantized to 16 visible hops per bar. Track.tsx now reads at 4096
    subdivisions: continuous motion.
*   **Coupling is dynamic (Eric's "buffer zones" idea, verbatim):** the fixed
    car-arc constant is gone; each vehicle now trails the previous one
    bumper-to-bumper — spaced by half of each of their LIVE on-screen lengths,
    so spacing adapts to car size and perspective with zero hardcoding. The
    frames' transparent padding is the coupler gap.
*   **Perspective wired:** vehicles depth-scale between `farScale`/`nearScale`
    (authored as properties on the track-path Tiled object; currently a subtle
    0.9→1.06) and y-sort so near cars draw over far ones.
*   **The ride path is now pure Tiled data:** `track.json` gained a
    geometry-layer with a `track-path` polygon (64 arc-uniform vertices traced
    over the painted centreline). `parseTiledPath` in TiledParser exposes it;
    TrackScene builds its Path from it. Swapping the background = repaint +
    retrace the polygon + tune two properties. No code.
*   **AR-014 queued (Eric-approved):** re-render the track plate in the train
    sprites' 3/4 perspective — the engineering contract makes it a data-only
    swap. **AR-015 queued:** 16-direction refs + 2-frame wheel cycle (halves
    the heading snap, wheels roll instead of slide).

### Previously Completed (2026-07-03, latest — ride freeze fixed + chrome fit pass)
*   **"Train never animates" root-caused and fixed (Eric report):**
    `sprite-assets.ts` used `Phaser.Animations.Events.ANIMATION_COMPLETE` as a
    runtime value without importing Phaser — the ambient namespace types make
    it typecheck, but the first smoke puff threw `ReferenceError: Phaser is
    not defined` inside the game step and KILLED the whole render loop, so
    the train (and everything else) froze ~1s into every ride. One-line
    import fix; audited the codebase for other value-position uses of the
    global (none). New e2e guard: ride past the smoke timer and assert the
    loco is still moving — that catches any future update-loop death.
*   **Nav plaques contained + uniform (Eric report):** the header art has
    brass gear medallions at each end that the oversized plaques were
    COVERING. All plaques across the three maps now share one height (150)
    with aspect-true widths, inset inside the measured parchment band
    (design 352–2200 × 87–310) — the gears are visible again. Fixture test
    now asserts plaque-inside-header containment instead of magic coords.
*   **Bottom bars centred (Eric report):** Workshop keycaps unified to
    160×160 and centred on the plate face (cy 1285, LCD too — the old
    baked-window constraint is gone with the dark plate); Track keycaps/LCD
    centred on the painted frame (cy 1257).
*   **AR-013 queued:** steampunk LCD display plate to replace the engine's
    flat cream chip (SONG/TEMPO + SPEED) — wiring it will be a Tiled-only
    panel object at the lcd anchor.

### Previously Completed (2026-07-03, later — bottom bars unified + new train atlas)
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

## 2. Workshop Revamp — Sprint intake (2026-07-03, Eric-approved)

`WORKSHOP_REVAMP_DESIGN_V2.md` is the brief. Engineering triage of Eric's
priority list:

*   **Tasks 1–4 + 6 are blocked on AR-016** (production exports of the
    approved concepts: clean interior plate, four car-side sprites with the
    standardized void rect, chalkboard surface). Concepts are approved; Manus
    should ship AR-016 first — it is the sprint's critical path.
*   **Task 5 (ground characters to floor Y)** is a Tiled-only edit but the
    floor line moves with the new interior plate — do it WITH task 1, not
    before, or it lands twice.
*   **Task 7 correction (good news):** the core already has most of the
    editor's data model — `StepNote { row, length, roll?, slideTo? }` with
    pure `addNote/removeNote/resizeNote/setRoll` commands and scheduler
    support for length + roll ("double beats" = roll). New work is: pitch
    bend using the reserved `slideTo`, per-lane knob values (2 new Layer
    fields + commands), and the modal UI itself. `types.ts` changes are
    additive and small.
*   **Task 8:** the adapter already sustains length and subdivides roll;
    it needs slideTo (pitch ramp) + two per-lane effect sends (wobble=LFO/
    chorus, crunch=bitcrush — both effects already exist in the offline FX
    code and can be adapted for live lanes).
*   Implementation order once AR-016 lands: layer split (Tiled) → car swap on
    `workshop-car-type-changed` → slide-in/out animations (+ choo-choo SFX
    via the existing procedural synthesis, no binary audio) → chalkboard grid
    mount → editor modal → adapter params.

## 2b. Other Next Steps

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
