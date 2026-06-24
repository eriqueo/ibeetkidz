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
  `src/components/`, and `src/app/`. `src/core/` and `src/ports/` import no
  framework.
- **Everything is a `Clip`.** Don't add parallel sound representations.
- **Mutations only via `Command` + `reduce`.** Reducers are pure (no DOM, no
  audio, no Date.now inside) so undo/redo, save, and tests stay free. Randomness
  goes through `RngPort`, never `Math.random` in core.
- **Machines are data-driven** (`src/machines/`). A new machine is a tool object
  + one line in the `TOOLS` registry (`src/machines/tools.tsx`). No plumbing
  edits.
- **Audio is gesture-gated.** Nothing touches the AudioContext before the boot
  button. The visualizer reads only real analyser data.
- **Kid-safe + private.** No network, no accounts, no sharing by default.
- **Forgiving UX.** Undo everywhere; mic-denied must leave the app fully usable.

## Commands

```bash
npm install
npm run dev        # localhost:5173
npm run typecheck  # gate
npm run test       # unit (Vitest)
npm run test:e2e   # Playwright, chromium, faked media
npm run build      # dist/ (/) + dist-gh/ (/ibeetkidz/)
```

## Commit workflow

Conventional commits, intermediate commits after each logical step (same
discipline as the kidpix repo). Feature branches off `main`; PR; green CI
(typecheck + unit + e2e) before merge.

## Current state

Live on GitHub Pages; the presentation layer migrated to React (hexagonal core
unchanged). `looper-stage` (UI label **Home**, id unchanged) is the hub and the
default landing — a BeepBox-style studio where every sound stacks as a lane:
editable drum + melody lanes with a sweeping playhead, a guided Studio rail for
key/groove/volume/echo, and seamless reschedule-while-playing. The satellite
tools feed Home: `record-voicefx` (record → 8 effect tiles → **Send to Home**,
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

Layout is the kidpix 4-region grid (palette / options / canvas / play bar) with
a `usePhoneLayout()` resolver (`src/app/use-viewport.ts`): on phones the Studio
rail becomes a slide-up bottom sheet so the canvas stays full-width;
iPad/desktop keep the side-by-side rail.

Notes carry length + roll (Capability 1 of `design/PLAN_notes-and-song.md`):
melody and drum cells are `StepNote { row, length, roll?, slideTo? }` (slideTo
reserved for the future bend pass). On Home, drag a note's right-edge handle to
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

Gates: `typecheck` clean, 122 unit tests, 28 Playwright E2E (incl. full hero
journey, save→reload, voice→Home, and note place→stretch→remove + drum roll).
Note: Playwright reuses any Vite already on its port; a stray kidpix dev server
on 5173 will make the whole suite hit the wrong app — run with `PW_PORT=<free>`
to pin a dedicated port (`reuseExistingServer` is off once a port is pinned).
`BUILD_RUNBOOK.md` retains the original build order. Note: looped clips schedule
through `resolveClip` (async, baked + cached), so effected voice lanes loop with
their effects — and a `scheduleGen` guard discards stale async (re)schedules.

Known follow-ups: `robot` is a comb-delay approximation (not vocoded);
`scheduleStep` only resolves un-effected source buffers synchronously (beat-grid
clips are effect-free, so this is fine in practice).
