# iBeetKidz 🎤🚂✨

**Kidpix, but for sound.** A browser playground where kids record their voice,
make it crazy (backwards, robot, chipmunk, echo…), build looping beats — then
load every sound onto a train and watch the song ride past.

You land on a painted island **Map** with three places to go:

- 🛠 **Workshop** — an open, car-type-specific music bench where one train car
  gets its sound. A mixing board holds the car's layers; tap the **mic** to record
  your voice and run it through the funny-effect tiles, tap the **drums** for a
  16-step beat maker, or tap the **guitar / piano / violin** to add a melody
  lane and draw notes into it. Pick the car's shape, then send it to the yard.
- 🚉 **Yard** — the cars you've built wait on the sidings. A gantry crane
  hitches one onto the train, unhitches the last one, or takes a car back to
  the workshop for another go. When the train looks right, send it to the track.
- 🛤 **Track** — the loco pulls your train through a side-scrolling world. The
  song is laid out along the ground in bar order, so the car for bar #4 and the
  ground under bar #4 reach the marker together and you can *see* where you are
  in the song — and see what is coming. Flip HILL, BRIDGE or RAIN and that
  terrain rolls up from the right and changes how the song sounds when it
  arrives; NIGHT, TUNNEL, TINY and GIANT stack on top of it, and BACKWARDS plays
  the whole thing in reverse. Tap a car to open it back up in the Workshop, or
  arm **TARP** and tap it to hear the song without it. **SEND** renders the
  whole thing to a WAV you can save or share.

No accounts, no backend, nothing is uploaded. Touch-first, made for an iPad.

## Stack

- TypeScript + Vite 6
- [Phaser 4](https://phaser.io/) — the four views are Phaser scenes
  (`src/game/scenes/`); sprites, hit-areas, and the in-scene tool panels live
  there. Map, Workshop, Yard, and the optional oval Track take authored layout
  from Tiled maps (`src/assets/maps/*.json`); the default scrolling Track builds
  its moving world and chrome programmatically in `TrackV3Scene`.
- React 19 — a thin shell around the canvas, presentation only (the hexagonal
  core stays framework-free)
- [Tone.js](https://tonejs.github.io/) for all audio (the one vendor behind `SoundPort`)
- Zod — parses saved projects and Tiled maps at the boundary
- Vitest (unit) + Playwright (Chromium locally; selected Chromium, WebKit, and
  Firefox journeys in CI)
- GitHub Pages auto-deploy (dual-base build: `/` local, `/ibeetkidz/` Pages)

## Architecture (hexagonal, kidpix lineage)

The core — `AudioEngine` plus the pure `reduce` in `src/core/project-state.ts` —
is vendor-free. Everything external is a **port** with a swappable **adapter**:

| Port | Adapter | Responsibility |
|---|---|---|
| `SoundPort` | `ToneSoundPort` | all DSP, recording, transport, offline render (Tone.js) |
| `StoragePort` | `LocalStoragePort` | save/load projects + recorded blobs (IndexedDB) |
| `RngPort` | `createRng` | seeded randomness ("make it crazy", generative beats) |

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
npm ci               # reproduce the committed lockfile
npm run dev          # http://localhost:5173
npm run typecheck
npm run test         # unit
PW_PORT=5174 npm run test:e2e
npm run build        # dist/ (base /) + dist-gh/ (base /ibeetkidz/)
npm run check:no-editor
npm run check:pwa
npm run check:train-atlas
bash scripts/check-ui-atlas-fresh.sh
```

## Documentation map

- `PROJECT_CHARTER.md`: binding product and architecture decisions.
- `CLAUDE.md` / `AGENTS.md`: engineering workflow and contributor rules.
- `design/HISTORY.md`: current architecture plus rationale retained from retired designs.
- `BASELINE.md`: dated, measured verification records; never infer current counts from prose.
- `SCENE_AUTHORING_GUIDE.md`: Tiled scene-authoring workflow.
- `ART_REQUESTS.md`: active art contract and delivery record.
- `design/GAME_FEEL.md`: animation and world-integration laws.
- `design/references/README.md`: provenance and status of the initial, now
  superseded visual explorations.

Completed plans and superseded briefs live in Git history rather than beside
current instructions.

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

The deployed cleanup release is `8fad32f` (GitHub Actions run `33466226635`).
Its legal notices, both build variants, PWA manifests, offline precache, and
generated UI/train atlases passed their release checks. `BASELINE.md` owns the
measured local gate and payload inventory; Git and the current workflow run
remain authoritative if this paragraph ages.

**Privacy.** There is no server and no telemetry, and the no-network-verbs test
above keeps it that way. The built-in pack is synthesized rather than downloaded,
so no sound files are fetched either. A song only leaves the device when a kid
taps **SEND** on the Track — and even then it goes to the OS share sheet or the
Downloads folder, never to us.

### Known gaps

**Installable and offline after the first load.** Open the live site once while
online and let it finish loading. On iPad, use Safari's Share menu → **Add to
Home Screen** → **Open as Web App**. On Samsung/Android, use the browser's
**Install app** or **Add to Home screen** action. The installed game can then
start without a connection. A first-ever visit still needs HTTPS and a network,
and the operating system can reclaim browser storage when space is low.

**Every finished piece has a way in now.** This paragraph used to list three
tool panels and the "Surprise me" generator as built-but-unreachable. All eight
instrument characters open their tool in `src/assets/maps/workshop.json`, and
**Surprise me** lives in the empty-car prompt — tap `SURPRISE ME!` inside the
empty car and it fills with a seeded groove (`src/core/generative.ts`,
same seed → same beat). It offers itself only while the car is empty, which is
when it is worth offering; tapping it again re-rolls rather than stacking.

**Gates:** `npm run typecheck` clean, the Vitest unit suite, and the Playwright
E2E suite. For the current counts see **`BASELINE.md`** — it is the single
producer of that fact. Hardware-audio blocks intentionally skip when CI lacks
the required device path; run the suite for the current result rather than
copying an old count. `design/HISTORY.md` carries the architectural history.

**Open art/provenance work.** `npm run check:workshop-car-art` remains red on
three rejected native Workshop layers: the flatcar body, flatcar foreground,
and tanker foreground. They need replacement art and assembled-scene review;
code must not conceal them. The signal, smoke, and tarp runtime atlases are
load-bearing but do not yet have a complete tracked rebuild provenance, so they
must be preserved until a source-of-truth decision is made. The cleanup release
was browser-exercised, but not accepted on a physical iPad or Android device.
