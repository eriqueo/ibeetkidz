# ibeetkidz — state and history

Moved out of `CLAUDE.md` on 2026-08-01. It is narrative, not rules: ~250 of
that file's 373 lines described what the app currently *is* and what the v1
app *was*. Both are useful — the history in particular records WHY the core is
shaped the way it is, which the next Chesterton's-Fence pass needs — but
neither is an instruction, and always-loaded instruction volume measurably
degrades compliance on the rules that ARE instructions (see the plan at
`~/.claude/plans/`). Read this when you need the map; do not inline it back.

## Current state

### The sprite game (verified against the tree 2026-08-31)

The app is a **Phaser sprite game** with four views (`Project.activeView`):
**Map** (the boot default — `activeView: "map"` in `project-state.ts`) →
**Workshop** → **Yard** → **Track**. **There is exactly ONE `Phaser.Game` for the
life of the page**, created by `src/game/game-host.ts` into a persistent host div
(`GameCanvas`) that `Shell.tsx` renders *outside* the view swap. A view is a React
component that renders `<PhaserScene scene={XScene} …/>` — which draws nothing and
just claims the shared canvas — plus whatever HTML floats above it, wrapped in the
shared `VIEW_OVERLAY` style (transparent + `pointer-events: none`, because the
canvas is now a sibling BEHIND the view, not a child). **None of the four views has
any HTML chrome left** beyond two toasts. `Shell.tsx` is a four-way
`Record<AppView, FC>` switch, so adding a view is a compile error until it has a
component.

`src/game/scene-switch.ts` owns the swap policy and four ordering rules that are
each a real, reproduced failure — **read it before touching scene lifecycle**
(`design/PERF_SINGLE_PHASER_GAME.md` has the full write-up and the measurements:
a lap of the four spaces went 7.8 s → 1.23 s, peak VRAM 222 → 253 MB). Shortest
form: nothing before Phaser's READY; `stop()` before `remove()` (remove does NOT
fire SHUTDOWN, which is where scenes drop their EventBus subs); remove-and-re-add
rather than `start()`, so every visit gets a fresh scene instance; and every
`load.*` call must be guarded by `textures.exists` now that one TextureManager
serves all four scenes. `PhaserGame.tsx` is deleted — it does not exist. The data model dropped
`arrangement: ArrangeCar[]` (+ the BeepBox loop-bar) for a **flat `train:
TrainCar[]`** — each slot is one bar; a car appears in N slots for N repeats;
muted slots (`muted`) are the "tarp". `Part` gained `carType` (boxcar/tanker/
hopper/flatcar, cosmetic). New commands: `addToTrain`/`removeFromTrain`/
`reorderTrain`/`muteCar`/`setCarType`; `addCar`/`duplicateCar` now manage the car
LIBRARY only (`parts`), `removeCar` cascades to the train. `normalizeProject`
migrates pre-v2 saves (expands `arrangement` repeats → flat slots) and derives
`carType`. Engine `scheduleArrangement` walks the train and skips muted cars; new
`playCarLoop(partId)`. Audio stays **gapless/transport-driven**; the Phaser train
+ crossing signal are driven visually from the transport (no frame-trigger
inversion). **This is a decided architecture, not an accident — see
`PROJECT_CHARTER.md` §2.5 "The Transport Is The Clock" before touching
`TrackScene` or `AudioEngine`.** Selectors:
`liveTrain`/`songBars`/`carAtBar`/`partForCar`.

- **Workshop** (`WorkshopScene`, base plate `bg-workshop-interior`): three zones — top
  nav bar / native open-car field / transport bottom bar — with **all static
  chrome spawned data-driven from `src/assets/maps/workshop.json`**. The sequencer
  grid is drawn **in Phaser** (`WORKSHOP_GRID_V2` plus a `WorkshopLane[]` model
  React derives from the active car's layers). It is **not** a reused React
  `LoopTrack` grid — `LoopTrack` does not exist anywhere in the repo; earlier
  CLAUDE.md revisions claimed it did. Tapping an instrument sprite opens a
  satellite tool as a **Phaser container** from `src/game/tool-panels.ts`
  (`record-voicefx` → `VoiceToolPanel`, `voice-keys`, `sound-pads`, `beat-grid`,
  `theremin-xy`, plus `MelodyEditorPanel`); each dispatches into the ACTIVE car,
  so the lane lands in the grid on close. There is no "stations dock". The
  four-way picker is now a **START A NEW CAR** control: on an already-empty car
  it uses `setCarType`; otherwise it creates a fresh empty car. AR-060's four
  native open-car bodies are exhaustive over `CarType`; the older shared and
  per-type layered cabin fallbacks were removed on 2026-08-31.
- **Yard** (`YardScene`): palette cars on the 4 sidings + the assembled train on
  the top line; `animatePickup` crane hook; **Add to Train** dispatches in the
  crane onComplete; per-slot Tarp/Remove; **Send to Track**. Cars face **`E`**
  (the sidings run east–west) and their 128 px atlas cell is contain-fitted on
  **both** axes — it was width-only, which drew a 238 px body on a 132.5 px
  siding pitch and buried every car under the next. The pure slot arithmetic
  lives in `src/game/yard-geometry.ts`, Phaser-free so `tests/unit/yard-layout.
  test.ts` can hold it to the pitch; the scene re-exports it.
- **Car identity is "livery + load"** (`src/core/car-identity.ts`, drawn by
  `src/game/car-livery.ts`), rendered on the palette, the assembly line and the
  Track. **LOAD** is derived — the dominant instrument family of the car's own
  lanes, shown as the `inst-*` sprite already in the packed atlas, riding on the
  roof; an empty car carries nothing. **LIVERY** is assigned — a unique colour +
  shape glyph painted as a flat panel on the car's flank, resolved over the whole
  library so it is collision-free at `MAX_CARS`. Neither needs a persisted field.
  **Never use `setTint` for this**: it is a multiply and the train atlas is dark
  brown, so every car colour lands at a peak channel of ≤61/255 and four of five
  read as the same dark thing. Colour goes BESIDE the sprite, never into it.
  The name chip is a SIBLING of the car container, not a child — inside it, it
  inherits the fit scale, which is what hid every label but the last.
  (`setTintMode` in Phaser 4 does offer FILL/ADD/SCREEN and would sidestep the
  multiply — but the painted-beside approach already shipped and reads well, so
  the rule above stands until something forces a revisit.)
- **Track** — **the side-scroller (`TrackV3Scene`) is the Track as of
  2026-08-16.** `?oval` opts back into the ring described immediately below,
  which is still a working scene with tests of its own (`track-timing.spec.ts`,
  `terrain.spec.ts`, `chrome-reachable.spec.ts` and `built-artifact.spec.ts` all
  pin `?oval`, each for a reason stated in the spec). The side-scroller's own
  story — why a ring cannot show a SEQUENCE, and what terrain does to the sound
  — is in `BASELINE.md`'s 2026-08-07 entries onward; the flip itself is in the
  2026-08-16 re-baseline. What follows is the OVAL.
  - **2026-08-31 Track cleanup:** the header and job deck now have independent,
    persisted HIDE/SHOW keys; neither key can strand the other deck. The Track
    visualizer and its analyser-facing public port were removed as product
    noise, while the analyser remains private to audio diagnostics. Tunnel
    entry/exit remains distance-driven but the mouth now travels at world speed
    and the cave/daylight seams sit under opaque portal masonry instead of
    cutting a full-height wipe through the scene.
- **Track, the oval** (`TrackScene`): sprite loco + cars ride the painted oval **coupled** —
  every vehicle sits half of each neighbour's on-screen length behind the one in
  front (`src/game/train-chain.ts`, arc length over path length), so the consist
  reads as one train at any car count. Which bar is sounding is shown by the
  **highlight** — a lamp under that car plus a bounce on the bar change — derived
  from the same `progress` the transport feeds in. Signal flips up/down + flashes
  per bar; loco smoke particles; per-car bounce; speed (tempo) + Forward/Reverse
  (cosmetic, signal-consistent) + live tarp strip.
  - **Two earlier models, both wrong, and why.** v1 coupled the cars and had NO
    bar readout at all. That was replaced by spacing car i at `i / carCount` of
    the whole lap, which made position the readout — and made spacing a function
    of song length, so a four-bar train sat a quarter-lap apart and looked like
    four wagons that had lost each other (the #1 play-test complaint). Position
    cannot be both the coupling and the clock readout; the readout moved off it.
    Do not put it back. `tests/e2e/track-timing.spec.ts` pins all of this, and
    each of its three tests is seed-proven against the model it replaced.
- **Layout coordinates for Tiled-backed static chrome live in the maps, not in
  TypeScript.** `src/game/scene-layout.ts` keeps only the dynamic/gameplay
  fixtures (`WORKSHOP_GRID_V2`, `YARD_LAYOUT_V2`, `TRACK_LAYOUT_V2`);
  `WORKSHOP_LAYOUT_V2` was retired with the AR-016 layered scene. The default
  `TrackV3Scene` is the deliberate exception: its moving side-scroller and
  screen chrome are programmatic presentation details.
- **Retired raw production references are out of git.** Ticket M3 moved the
  AR-015 references, `sprites-v2/` sources, and `art_gen/` into a **gitignored
  `art/` at the repo root**. The eight initial visual explorations remain tracked
  under `design/references/` as explicitly superseded historical provenance; they
  are neither current style authority nor build inputs. The old
  loose-sprite packer and `slice_sprites.py` were later retired after the
  runtime moved to the public atlases. **There are no tracked or build-input
  `*_original.png` files.** Ignored historical originals may remain under
  `art/`; shipped sprites are `src/assets/sprites/` and
  `public/assets/spritesheets/`. The retired 16-direction train reference batch
  moved to the gitignored `art/` tree on 2026-08-16. On 2026-08-31 the accepted
  40 train cells became the canonical tracked inputs under
  `src/assets/sprites/train-atlas/`; `scripts/build_train_atlas.py` rebuilds the
  public atlas from only those inputs, and `npm run check:train-atlas` verifies
  deterministic JSON plus decoded pixels.
- **The v1 DOM shell is gone** (ticket M1): `src/machines/**` (including
  `tools.tsx` and `TOOLS`), `PixelButton.tsx`, `src/app/use-viewport.ts` /
  `usePhoneLayout`, and `Shell.tsx`'s kidpix 4-region body. The only survivor is
  `laneColor`, now at `src/core/lane-color.ts`. The old CSS Song-Train UI
  (`TracksStrip` / `LoopRail` / `LoopStageRail` / `LaneControls` / `Knob` /
  `LoopTrack` / loop-bar) went with it — **none of those components exist.**
- **Saves are parsed once, at the boundary** (ticket S5): `src/core/project-schema.ts`
  owns a versioned format (`schemaVersion`, zod). `normalizeProject` is the frozen
  version-0 branch — no new sniffs, ever. A save written by a *newer* version is
  refused with a kid-legible message rather than best-effort parsed.
  `StoragePort` / `LocalStoragePort` (S6) return typed failures instead of
  swallowing, gained `deleteBlob`, and hold a retention rule that keeps blobs undo
  history can still reach; one contract suite runs against the real adapter and a
  fake. Boot (S4) has a kid-legible failure state with retry plus a storage-trouble
  channel; recording is capped at `MAX_RECORD_SEC` (S7).
- **`public/` asset URLs must go through `import.meta.env.BASE_URL`** (ticket B1).
  Pages serves from `/ibeetkidz/`, so a bare `/assets/...` 404s there and only
  there — invisible in `npm run dev`. `tests/unit/public-asset-url.test.ts` guards
  it.
- **"Surprise me" is reachable now** (it was not). `generateBeat`
  (`src/core/generative.ts`) has been pure, seeded and unit-tested since v1;
  `workshop-surprise` is in the EventBus vocabulary and `Workshop.tsx`
  subscribes — and **no Tiled object ever emitted it**. The affordance is a
  `SURPRISE ME!` chip inside `WorkshopScene`'s **empty-car prompt**, so it
  offers itself exactly while the car is empty and vanishes once it isn't.
  Tapping again RE-ROLLS (`generateBeat` clears the layers it made first), and
  **one undo puts the whole thing back** — it goes through `store.dispatchAll`,
  which applies many commands as ONE history entry. Reach for `dispatchAll` for
  anything a kid experiences as a single action; a compound action dispatched
  command-by-command makes undo a chore (this was ~15 taps). The Workshop LCD
  reads **SPEED**, matching the Track; it read `TEMP`, a truncation of TEMPO.
- **Undo is reachable now** (it was not). The `UndoStack`, `store.undo()` and
  `AppApi.undo()` have existed since v1 with **zero callers**, so "Forgiving UX.
  Undo everywhere" was prose only and ✕ on a lane was final. The affordance is a
  transient **"PUT IT BACK" chip** (`src/game/undo-toast.ts`, Graphics in the
  scenes' chip language — the chrome bars are authored art with no free slot),
  attached to all five scene implementations via `attachUndoToast`. The
  composition root owns the current offer and its single seven-second lifetime;
  a ready scene receives that authoritative value, so travel neither loses nor
  extends it. `src/core/undoable.ts` is
  the **single producer** of "destructive", read by the ONE dispatch funnel in
  `app/context.tsx`, so a `remove*` command added later is covered the moment it
  gets a table entry — and `tests/unit/undoable.test.ts` fails if it doesn't.
  Navigation is history-neutral by the single policy in
  `src/core/command-policy.ts`: it updates every reachable snapshot, so undoing
  content never changes rooms and travel cannot cover the entry the chip names.
  Two rules that look like polish and are not: the offer **withdraws on any
  later content command and on undo/redo** (undo pops the LAST content entry, so
  a stale chip would undo the wrong thing), and a **refused** command offers nothing (the
  funnel checks whether the STORE moved, not what the command intended —
  `removeCar` declines to delete the last car).
- **The Track visualizer was retired on 2026-08-31.** It had been implemented
  in both Track scenes through `scene-visualizer.ts`, `attachVisualizer`, and a
  framework-free renderer contract, with a peak-hold envelope rather than raw
  RMS. Eric classified the cabinet as product noise during the Track cleanup,
  so the implementation, public port, styles, map object, tests, and production
  references were removed together. The audio adapter's private analyser remains
  for diagnostics. This paragraph retains the intent of the removed path so it
  is not mistaken for accidental dead code in older commits.

---

### History — the pre-v2 "looper-stage" studio

**Read this as history, not as a map of the tree.** Every piece of *UI* below was
deleted (the routed `looper-stage` view, the Studio rail, the Tracks strip, the
song loop track with its tunnels, the phone bottom-sheet). It is kept on purpose
because it records **why the core is shaped the way it is** — the note model, the
pattern slots, the instrument recipes and the audio adapter behaviours it
describes are all still live and still accurate, and the next Chesterton's-Fence
pass needs the reasons, not just the code.

Shipped on GitHub Pages; the presentation layer migrated to React (hexagonal core
unchanged). `looper-stage` (UI label **Home**) *was* the hub and the default
landing — Map is the landing now, and `activeMachineId: "looper-stage"` survives
only as a vestigial field in `Project` — a BeepBox-style studio where every sound
stacked as a lane: editable drum + melody lanes with a sweeping playhead, a guided
Studio rail for key/groove/volume/echo, and seamless reschedule-while-playing. The
satellite tools fed Home (**their ids survive as the Phaser tool-panel keys in
`WorkshopScene`**): `record-voicefx` (record → 8 effect tiles → **Send to Home**,
where the funny clip becomes a 16-step voice lane), `beat-grid` (16-step drum
machine over the same drum lanes), `sound-pads` (soundboard of the built-in pack
+ your recordings), `theremin-xy` (Magic Pad, live oscillator+filter voice),
`voice-keys` (record one voice clip → play it as a CHROMATIC melody instrument
via `Tone.Sampler`; audition keyboard → **Add to Home** as a melody lane voiced
by the recording, `instrument: voice:<bufferId>`). Melody lanes also pick a
real instrument (`src/core/instruments.ts` data + adapter `makeMelodyVoice`
recipe): synths (soft/smooth/buzzy/sharp/piano/bells/organ/pluck/brass) or a
`voice:<bufferId>` sampler. Samplers can't pitch-bend (no `.frequency` signal),
so the note-grid bend gesture + curve are suppressed on voice lanes (stretch +
roll still work). Clip names are editable inline (`renameClip`) so voice lanes
are tellable apart on Home.

Audio adapter (`tone-sound-port.ts`) implements: procedural built-in synthesis
(no binary assets — stays offline), offline effect baking via `Tone.Offline`
(reverse/pitch/robot/echo/reverb/bitcrush + seeded "crazy" stack),
transport-scheduled step + pitched-note playback with per-lane volume/echo and
swing, and the live theremin. iOS hardening: requests the "playback" audio
session so sound plays through the silent switch, and self-heals the
AudioContext after interruptions (call / lock / background). Built-in pack is
data (`src/core/sound-catalog.ts`); "Surprise me" is a pure seeded generator
(`src/core/generative.ts`). Recordings persist to IndexedDB
(`local-storage-port.ts`) and rehydrate on reload (BootGate → `loadLast` in
`app/context.tsx`).

Layout was the kidpix 4-region grid (palette / options / canvas / play bar) with
a `usePhoneLayout()` resolver (`src/app/use-viewport.ts`): on phones the Studio
rail became a slide-up bottom sheet so the canvas stayed full-width; iPad/desktop
kept the side-by-side rail. **Both the grid and `use-viewport.ts` were deleted by
M1** — the Phaser views size themselves off the camera instead.

Notes carry length + roll — **still live in core.** Melody and drum cells are
`StepNote { row, length, roll?, pins? }`; `pins` is the pitch-bend path that the
later bend pass shipped (an earlier revision of this file called that field
`slideTo`, which never existed). Drag a note's right-edge handle to
**stretch** it; tap-tap a drum cell to cycle a **roll** fill (none→2→4). Pure
commands `addNote/removeNote/resizeNote/setRoll` (plus the kept toggles); the
scheduler sustains melody for `length` and subdivides the start step for `roll`.
Tolerant deserialize upgrades old boolean/number cells to length-1 notes.

Song Train moves + per-lane variations (the "between trains" pass): a lane can
be **copied to another car** (`copyLayerToCar`, fresh layer id → cars diverge
copy-on-write) from the Studio rail's **🚃 Send to car** picker; cars can be
**duplicated** (`duplicateCar`, inserted right after the source) and **deleted**
(`removeCar`) via ⧉/✕ on each car block. Each lane carries BeepBox-style
**numbered pattern slots** (`Layer.variations[]` + `patternIndex`, cap
`MAX_PATTERNS`=9): the LIVE slot stays in `steps`/`notes` (scheduler + every note
reducer untouched), `variations` only stashes the inactive ones. Commands
`addPattern` (copies the live slot), `selectPattern`, `removePattern`; UI is the
🎛️ chip row above each lane grid. The lane grid is wrapped in `.loop-track-body`
so the chip row doesn't steal the grid's `1fr` column. Voice recordings are
fully re-editable: effects are removable (`removeEffect` + FX chips in My Voice),
and any voice lane re-opens its clip for more FX via **✨ Edit effects** in the
rail (`requestVoiceEdit` handoff). My Voice can **Send as Notes** → a magic-notes
melody lane voiced by the recording (`voice:<bufferId>`, in the song key/scale),
alongside **Send as Beat**. A big **ibeetkidz** brand header sits atop the shell.

Song Train visuals + per-track controls (2026-06-23): the Tracks-strip cars now
render as **train cars on rails** — boxcars with roof/wheels, a **locomotive**
(front car: smokestack, rounded nose), couplers, and a CSS rail + ties under the
row (`.train-sprite`, `.track-bridge`, `.car-wheels`, `.car-block.loco`). During
**Ride**, a **moving locomotive** (`.train-sprite`, positioned via rAF in
`TracksStrip` using `ridingAt(project, bar, stepFrac)` + `sound.getTransportStep(1000)`
for sub-bar smoothness) drives along the rail to the car currently sounding and
loops past a bridge — so you physically see song position. Only in `ride` mode
(`engine.playMode`); parks off-screen in `loop`. **Per-track controls moved off
the right rail INTO each lane**: a new `LaneControls` (instrument pills, ✨
Effects, and a row of rotary **`Knob`s** — Vol/Echo/Tone/Groove, drag the dial or
tap ‹ › arrows — plus Send-to-car) renders inside the SELECTED lane; the Studio
rail (`LoopStageRail`) is now **song-wide only** (tempo/scale/key/groove).
Instrument pills keep `rail-pill`/`data-inst` so existing selectors hold.

Song Train loop track (2026-06-23): the strip is a centered column (title /
cars / loop track / Ride); cars are bigger boxcars. The **loop lives on its own
track BELOW the cars** (`LoopRail` → `.song-loop-track`, `data-loop-track`) —
separate from the cars so the loop visual is clear. Two big **draggable tunnels**
(`.loop-tunnel`, `data-act="loop-start"`/`"loop-end"`, each with a ‹›`.loop-grab`)
mark the loop start/end; a green `.loop-band` highlights the looped span; the
playback engine (`.train-sprite`) rides between them and dips fully through each
tunnel every lap. Loop state = `Project.loopStart`/`loopLength` (bars; both absent
= whole song, auto-grows), clamped on read by `loopRegion`; `setLoop` clears to
absent on a whole-song region. The loop track is divided into `songBars` equal
segments — positions are pure `%` of the song length (no car-DOM measuring);
dragging snaps to bar boundaries. Engine `scheduleArrangement` lays out ONLY
`[start, start+length)` and repeats every `length` bars; `ridingAt` maps the
transport bar into the region. NOTE class collision: the per-lane Home component
is also `.loop-track` — the song loop rail MUST stay `.song-loop-track`.

Scaling (2026-06-23): cars are smaller; the Song Train caps at **`MAX_CARS`=12**
(addCar/duplicateCar no-op at the cap; "New Car" hidden). Cars + loop track share
one centered scroll box (`.song-train-body`, padded sides so the end tunnels
aren't clipped) so the **loop track is exactly as wide as the cars** and the two
scroll together. (Still TODO per Eric — brainstorm: the train/tunnel metaphor
"train under cars" doesn't read; a one-tap "play all loops" / free-the-loop mode;
tighter car↔segment alignment.)

---
