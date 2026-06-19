# iBeetKidz 🎤🥁✨

**Kidpix, but for sound.** A browser playground where kids record their voice,
make it crazy (backwards, robot, chipmunk, echo…), build looping beats, play a
magic XY pad, and watch the sound come alive in a retro screensaver visualizer.

No accounts, no backend, nothing leaves the device. Touch-first, built to run
offline on an iPad.

## Stack

- TypeScript + Vite 6, vanilla DOM (no framework)
- [Tone.js](https://tonejs.github.io/) for all audio (the one vendor behind `SoundPort`)
- Vitest (unit) + Playwright (E2E, Chromium with faked media)
- GitHub Pages auto-deploy (dual-base build: `/` local, `/ibeetkidz/` Pages)

## Architecture (hexagonal, kidpix lineage)

The core (`AudioEngine`, `ProjectState`, `Machine`) is pure and vendor-free.
Everything external is a **port** with a swappable **adapter**:

| Port | Adapter | Responsibility |
|---|---|---|
| `SoundPort` | `ToneSoundPort` | all DSP, recording, transport (Tone.js) |
| `RendererPort` | `Visualizer` | analyser-driven canvas visuals |
| `StoragePort` | `LocalStoragePort` | save/load projects + recorded blobs |
| `RngPort` | `createRng` | seeded randomness ("make it crazy") |

**"Everything is a clip"** — built-in sounds, recordings, drum hits, and synth
notes all reduce to one `Clip` type. Machines emit `Command`s; `ProjectState`
reduces them (pure) giving undo/redo + save for free; `AudioEngine` reconciles
the live audio graph to match.

**Machines** are the kidpix "tools": data-driven objects (`record-voicefx`,
`sound-pads`, `beat-grid`, `looper-stage`, `theremin-xy`). Adding one is a
one-line registry entry — no plumbing changes.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run test         # unit
npm run test:e2e     # Playwright (Chromium)
npm run build        # dist/ (base /) + dist-gh/ (base /ibeetkidz/)
```

## Status

Feature-complete v1. All five machines are built, the Tone.js DSP is
implemented (procedurally-synthesized built-in pack, offline effect baking,
transport-scheduled playback, live theremin voice), recordings persist to
IndexedDB and survive reload, and "Surprise me" generates a seeded beat. Gates
green: `typecheck` clean, 25 unit tests, 6 Playwright E2E (incl. the full hero
journey and save→reload). See `BUILD_RUNBOOK.md` for the build history.
