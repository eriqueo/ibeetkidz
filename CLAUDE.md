# CLAUDE.md — ibeetkidz

Guidance for Claude when working in this repo.

## What this is

Kidpix-for-audio: a kid-friendly, touch-first, offline-capable browser sound
toy. Record your voice → make it crazy → layer loops → see the sound. Built as a
**fresh** project using kidpix's architecture as reference (NOT a fork of kidpix
code). Tone.js does the audio; the core stays vendor-free behind ports.

## Stack

TypeScript + Vite 6 + React 19 (presentation layer only — the core stays
framework-free). Tone.js ^15. Vitest + Playwright. Yarn or npm (lockfile
decides — scaffold assumes npm). Node 24. GitHub Pages auto-deploy.

## Architecture rules (hold these)

- **Hexagonal core.** `src/core/` and `src/ports/` never import from
  `src/adapters/`. Tone.js is imported ONLY in `src/adapters/tone-sound-port.ts`.
- **Presentation is React, core is not.** React lives only in `src/App.tsx`,
  `src/main.tsx`, `src/components/`, and `src/app/`. `src/core/` and `src/ports/`
  import no framework.
- **Everything is a `Clip`.** Don't add parallel sound representations.
- **Mutations only via `Command` + `reduce`.** Reducers are pure (no DOM, no
  audio, no Date.now inside) so undo/redo, save, and tests stay free. Randomness
  goes through `RngPort`, never `Math.random` in core.
- **Scenes are data-driven** (`src/assets/maps/*.json`). Static scene chrome —
  panels, nav/transport buttons, instrument sprites — is authored in Tiled and
  interpreted generically by `TiledParser` → `TiledSceneAdapter` / `ui-scene.ts`.
  Adding a button is a map edit plus an `EventBus` action, not a plumbing edit.
  (This rule used to name the v1 `TOOLS` registry in `src/machines/tools.tsx`.
  Ticket M1 deleted `src/machines/` outright; the data-driven principle now lives
  in the Tiled maps. See `PROJECT_CHARTER.md` §2.2.)
- **Audio is gesture-gated.** Nothing touches the AudioContext before the boot
  button. The visualizer reads only real analyser data.
- **Kid-safe + private.** No network, no accounts, no sharing by default.
- **Forgiving UX.** Undo everywhere; mic-denied must leave the app fully usable.

These are not just prose: `tests/unit/architecture.test.ts` (ticket S2) asserts
five of them as source-text guards over `src/**`, so breaking one fails the gate.
Prose does not fail a build; that file does.

## Commands

```bash
npm install
npm run dev        # localhost:5173
npm run typecheck  # gate
npm run test       # unit (Vitest)  — gate
npm run lint       # eslint . (ticket S2) — gate
npm run test:e2e   # Playwright, chromium, faked media
npm run build      # dist/ (/) + dist-gh/ (/ibeetkidz/)
```

**The gate is `npm run typecheck && npm run test && npm run lint`.**

### Gate numbers live in `BASELINE.md`, not here

`BASELINE.md` at the repo root is the **single producer** of the counts (unit
tests, test files, e2e specs, tracked files, and the commit they were measured
at). This file used to hardcode them; they went stale repeatedly and misled
several agents. Read `BASELINE.md`, or just run the gate — never quote a count
from prose.

### Two e2e traps that have bitten repeatedly

1. **The e2e count differs local vs CI, by design.** Two hardware-audio proofs
   `test.skip` when `process.env.CI` is set — `tests/e2e/audio-output.spec.ts`
   and the last block of `tests/e2e/v2-flow.spec.ts`. So a local run and a CI run
   legitimately report different totals. State *which* you mean whenever you cite
   an e2e number.
2. **Those same two specs are genuinely flaky locally under load** (real audio
   capture on a busy machine). A red run there is not a regression until you have
   re-run that spec **alone**. Do that before concluding anything.

Always pin the port: `PW_PORT=<free> npm run test:e2e`. `playwright.config.ts`
sets `reuseExistingServer: !process.env.CI && !process.env.PW_PORT` — unpinned, a
stray Vite on 5173 (e.g. the kidpix dev server) is silently reused and the whole
suite tests the wrong app.

## Commit workflow

Conventional commits, intermediate commits after each logical step (same
discipline as the kidpix repo). Feature branches off `main`; PR; green CI
(typecheck + lint + unit + e2e) before merge. Ticket S1 made the Pages **deploy**
job `needs:` the e2e job, so a red e2e now blocks the deploy instead of only
annotating it.

## Current state

### The sprite game (verified against the tree 2026-07-31)

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

- **Workshop** (`WorkshopScene`, base plate `bg-workshop-v2`): three zones — top
  nav bar / boxcar-interior field / transport bottom bar — with **all static
  chrome spawned data-driven from `src/assets/maps/workshop.json`**. The sequencer
  grid is drawn **in Phaser** (`WORKSHOP_GRID_V2` plus a `WorkshopLane[]` model
  React derives from the active car's layers). It is **not** a reused React
  `LoopTrack` grid — `LoopTrack` does not exist anywhere in the repo; earlier
  CLAUDE.md revisions claimed it did. Tapping an instrument sprite opens a
  satellite tool as a **Phaser container** from `src/game/tool-panels.ts`
  (`record-voicefx` → `VoiceToolPanel`, `voice-keys`, `sound-pads`, `beat-grid`,
  `theremin-xy`, plus `MelodyEditorPanel`); each dispatches into the ACTIVE car,
  so the lane lands in the grid on close. There is no "stations dock" and no
  in-scene 4-way car-type picker any more — their EventBus events and reducers
  survive for a later sprint (see `WorkshopScene.ts`'s header comment).
- **Yard** (`YardScene`): palette cars on the 4 sidings (tinted sprites) + the
  assembled train on the top line; `animatePickup` crane hook; **Add to Train**
  dispatches in the crane onComplete; per-slot Tarp/Remove; **Send to Track**.
- **Track** (`TrackScene`): sprite loco + cars ride the painted oval; car i sits
  at the crossing signal exactly when bar i sounds; signal flips up/down + flashes
  per pass; loco smoke particles; per-car bounce; speed (tempo) + Forward/Reverse
  (cosmetic, signal-consistent) + live tarp strip.
- **Layout coordinates for static chrome live in the Tiled maps, not in
  TypeScript.** `src/game/scene-layout.ts` keeps only the dynamic/gameplay
  fixtures (`WORKSHOP_GRID_V2`, `YARD_LAYOUT_V2`, `TRACK_LAYOUT_V2`);
  `WORKSHOP_LAYOUT_V2` was retired with the AR-016 layered scene.
- **Art inputs are out of git.** Ticket M3 moved `references/`, the `sprites-v2/`
  sources and `art_gen/` into a **gitignored `art/` at the repo root** and
  repointed `scripts/pack-sprites.py`; `slice_sprites.py` (hardcoded
  `/home/ubuntu/...`, unrunnable) was deleted. **There are no `*_original.png`
  files anywhere in the tree** — verified this session with `git ls-files` and
  `find`. Shipped sprites are `src/assets/sprites/` (~9 MB) and
  `public/assets/spritesheets/`. `src/assets/spritesheets/ar015/` is the in-flight
  loco reference batch and is **protected — do not delete it** until Eric releases
  it.
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
- **The visualizer is LIVE, in the Track view** (decision A1's re-home, done).
  `src/game/scene-visualizer.ts` is a jumbotron standing in the middle of the
  oval: a Graphics cabinet in the scene's chip language wrapping a 320×96
  `CanvasTexture` that the **unchanged** `VisualStyle`s draw into, so the three
  styles that shipped for the old DOM panel run verbatim. React pushes the
  analyser in via `TrackScene.attachVisualizer` (the scene never reaches for
  audio); placement is the `viz-screen` rect in `track.json`'s geometry-layer.
  Visibility follows a peak-hold envelope on the master output — **not raw RMS,
  which chases the rests between notes and strobes** — so it fades up on sound,
  rides through musical rests, and clears after STOP. Tap the screen to cycle
  styles. `src/visualizer/spectrum.ts` is the one producer of the FFT→bars
  reduction (log-spaced bands, peak per band; a linear sweep put a kid's whole
  melody in the first two bars). `VizPanel.tsx`, `src/visualizer/visualizer.ts`,
  the `RendererPort` interface and the `.viz-*` CSS are **deleted** — do not
  describe the visualizer as parked.

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

Notes carry length + roll (Capability 1 of `design/PLAN_notes-and-song.md`) —
**still live in core.** Melody and drum cells are
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

## Gates and follow-ups

`typecheck` clean, unit suite green, `eslint .` exit 0. **The counts are in
`BASELINE.md`** — see "Gate numbers live in `BASELINE.md`" above, including the
local-vs-CI e2e split and the flakiness warning. E2E coverage today is
`v2-flow.spec` (boot → Map → Workshop → Yard → Track, plus tool panels and the
Track guard) and `audio-output.spec` (hardware-audio proof, local only); ticket S8
is adding a built-artifact spec. The v1 machine-shell e2e specs were retired with
the looper-stage landing; **rebuilding deep per-tool e2e through the Workshop
tool-panel nav is a follow-up.**

`BUILD_RUNBOOK.md` retains the original build order. Note: looped clips schedule
through `resolveClip` (async, baked + cached), so effected voice lanes loop with
their effects — and a `scheduleGen` guard discards stale async (re)schedules.
Ticket S3 fixed `resolveClip`'s cache key: it now takes `bpm` as an explicit
argument, captured from the adapter's own `tempoBpm` (written only by `setTempo`)
at call time, instead of reading `Tone.getTransport().bpm` back after the bake
`await`. Reading it back could key a wrong-length baked buffer under a stale bpm.

Known follow-ups: `robot` is a comb-delay approximation (not vocoded);
`scheduleStep` only resolves un-effected source buffers synchronously (beat-grid
clips are effect-free, so this is fine in practice).
