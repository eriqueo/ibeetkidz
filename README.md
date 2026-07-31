# iBeetKidz 🎤🚂✨

**Kidpix, but for sound.** A browser playground where kids record their voice,
make it crazy (backwards, robot, chipmunk, echo…), build looping beats — then
load every sound onto a train and watch the song ride past.

You land on a painted island **Map** with three places to go:

- 🛠 **Workshop** — the inside of a boxcar, where one train car gets its sound.
  A mixing board holds the car's layers; tap the **mic** on the wall to record
  your voice and run it through the funny-effect tiles, tap the **drums** for a
  16-step beat maker, or tap the **guitar / piano / violin** to add a melody
  lane and draw notes into it. Pick the car's shape, then send it to the yard.
- 🚉 **Yard** — the cars you've built wait on the sidings. A gantry crane
  hitches one onto the train, unhitches the last one, or takes a car back to
  the workshop for another go. When the train looks right, send it to the track.
- 🛤 **Track** — the loco pulls your train around the oval. Car #1 passes the
  crossing signal exactly when bar #1 sounds, so you can *see* where you are in
  the song. Tap a car to throw a tarp over it and hear the song without it.
  **SEND** renders the whole thing to a WAV you can save or share.

No accounts, no backend, nothing is uploaded. Touch-first, made for an iPad.

## Stack

- TypeScript + Vite 6
- [Phaser 4](https://phaser.io/) — the four views are Phaser scenes
  (`src/game/scenes/`); sprites, hit-areas, and the in-scene tool panels live
  there. Scene chrome is data-driven from Tiled maps (`src/assets/maps/*.json`)
- React 19 — a thin shell around the canvas, presentation only (the hexagonal
  core stays framework-free)
- [Tone.js](https://tonejs.github.io/) for all audio (the one vendor behind `SoundPort`)
- Zod — parses saved projects and Tiled maps at the boundary
- Vitest (unit) + Playwright (E2E, Chromium with faked media)
- GitHub Pages auto-deploy (dual-base build: `/` local, `/ibeetkidz/` Pages)

## Architecture (hexagonal, kidpix lineage)

The core — `AudioEngine` plus the pure `reduce` in `src/core/project-state.ts` —
is vendor-free. Everything external is a **port** with a swappable **adapter**:

| Port | Adapter | Responsibility |
|---|---|---|
| `SoundPort` | `ToneSoundPort` | all DSP, recording, transport, offline render (Tone.js) |
| `StoragePort` | `LocalStoragePort` | save/load projects + recorded blobs (IndexedDB) |
| `RngPort` | `createRng` | seeded randomness ("make it crazy", generative beats) |
| `RendererPort` | `Visualizer` | analyser-driven canvas visuals — **parked, see below** |

**"Everything is a clip"** — built-in sounds, recordings, drum hits, and synth
notes all reduce to one `Clip` type. The UI emits `Command`s; `reduce` applies
them (pure) giving undo/redo + save for free; `AudioEngine` reconciles the live
audio graph to match.

**Layering is enforced by tests, not just convention.**
`tests/unit/architecture.test.ts` reads the real source of `src/**` and fails the
build if `src/core`/`src/ports` import an adapter, if Tone.js is imported outside
`src/adapters/tone-sound-port.ts`, if React appears outside `App.tsx`/`main.tsx`/
`components/`/`app/`, if anything reaches for `Math.random`, or if any network
verb (`fetch`, `WebSocket`, `sendBeacon`, …) appears anywhere in `src`. Phaser
lives in `src/game/` and the React components that host a scene; scenes and React
talk over a typed `EventBus` rather than reaching into each other.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run test         # unit
npm run test:e2e     # Playwright (Chromium) — pin a port: PW_PORT=<free>
npm run build        # dist/ (base /) + dist-gh/ (base /ibeetkidz/)
```

## Status

Live on GitHub Pages (`https://eriqueo.github.io/ibeetkidz/`). The four Phaser
views are built and routed off `Project.activeView`, with **Map** as the landing.
The Tone.js DSP is implemented — procedurally-synthesized sound pack, offline
effect baking, transport-scheduled playback, pitched melody lanes, the live
theremin voice, and a full offline render for the Track's SEND flow. Recordings
persist to IndexedDB and survive a reload. The audio adapter plays through the
iOS silent switch and self-heals the AudioContext after interruptions (call /
lock / background). Audio is gesture-gated: nothing touches the AudioContext
before the boot button.

**Privacy.** There is no server and no telemetry, and the no-network-verbs test
above keeps it that way. The built-in pack is synthesized rather than downloaded,
so no sound files are fetched either. A song only leaves the device when a kid
taps **SEND** on the Track — and even then it goes to the OS share sheet or the
Downloads folder, never to us.

### Known gaps

**Not offline yet.** There's no service worker and no web app manifest, so a
cold load still needs the network and the app can't be installed to the home
screen. That work is planned, not built.

**Some finished pieces have no button yet.** Voice Keys, Sound Pads, and Magic
Pad exist as Phaser panels and are registered in `WorkshopScene`, but nothing in
the Workshop currently opens them — only the mic (My Voice) and drums (Beat
Maker) stations are wired up in `assets/maps/workshop.json`. The seeded
"Surprise me" generator (`src/core/generative.ts`) is likewise fully implemented
and listened for, with nothing emitting it. Giving all of these their stations
back is a to-do.

**The retro screensaver visualizer is parked, not shipped:** `src/visualizer/`
still implements `RendererPort`, but its only mount point (`VizPanel`) lost its
last importer when the v1 shell was deleted, so nothing in the running app
renders it. Re-homing it into the Phaser Track view via the existing analyser
tap is a backlog item.

**Gates:** `npm run typecheck` clean, the Vitest unit suite, and the Playwright
E2E suite. For the current counts see **`BASELINE.md`** — it is the single
producer of that fact, and the E2E number differs local vs CI (two hardware-audio
specs `test.skip` themselves when `CI` is set). See `BUILD_RUNBOOK.md` for the
build history.
