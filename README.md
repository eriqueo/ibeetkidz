# iBeetKidz 🎤🥁✨

**Kidpix, but for sound.** A browser playground where kids record their voice,
make it crazy (backwards, robot, chipmunk, echo…), build looping beats, play a
magic XY pad, and watch the sound come alive in a retro screensaver visualizer.

No accounts, no backend, nothing leaves the device. Touch-first, built to run
offline on an iPad.

## Stack

- TypeScript + Vite 6, React 19 (presentation layer only — the hexagonal core is framework-free)
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
`sound-pads`, `beat-grid`, `looper-stage`, `theremin-xy`) in the `TOOLS`
registry. Adding one is a one-line registry entry — no plumbing changes. React
is confined to the presentation layer (`src/App.tsx`, `src/components/`,
`src/app/`); the core imports no framework.

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

Live on GitHub Pages. The presentation layer is React (the hexagonal core is
unchanged); the Tone.js DSP is implemented (procedurally-synthesized pack,
offline effect baking, transport-scheduled playback, pitched melody lanes, live
theremin voice), recordings persist to IndexedDB and survive reload, and
"Surprise me" generates a seeded beat. **Home** (the default landing) is a
BeepBox-style studio where drums, melodies, and your recordings stack as lanes;
the satellite tools (🎤 My Voice, 🥁 Sound Pads, 🎛️ Beat Maker, ✨ Magic Pad)
are pages you visit and send results back from — record a voice, make it funny,
and **Send to Home** to drop it in as a 16-step lane (rename clips inline to
tell them apart). On phones a `usePhoneLayout()` resolver turns the Studio rail
into a bottom sheet, and the audio adapter plays through the iOS silent switch
and self-heals after interruptions. Gates: `typecheck` clean, 53 unit tests, 14
Playwright E2E. See `BUILD_RUNBOOK.md` for the build history.
