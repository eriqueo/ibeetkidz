# CLAUDE.md — ibeetkidz

Guidance for Claude when working in this repo.

## What this is

Kidpix-for-audio: a kid-friendly, touch-first, offline-capable browser sound
toy. Record your voice → make it crazy → layer loops → see the sound. Built as a
**fresh** project using kidpix's architecture as reference (NOT a fork of kidpix
code). Tone.js does the audio; the core stays vendor-free behind ports.

## Stack

TypeScript + Vite 6 + vanilla DOM. Tone.js ^15. Vitest + Playwright. Yarn or npm
(lockfile decides — scaffold assumes npm). Node 24. GitHub Pages auto-deploy.

## Architecture rules (hold these)

- **Hexagonal core.** `src/core/` and `src/ports/` never import from
  `src/adapters/`. Tone.js is imported ONLY in `src/adapters/tone-sound-port.ts`.
- **Everything is a `Clip`.** Don't add parallel sound representations.
- **Mutations only via `Command` + `reduce`.** Reducers are pure (no DOM, no
  audio, no Date.now inside) so undo/redo, save, and tests stay free. Randomness
  goes through `RngPort`, never `Math.random` in core.
- **Machines are data-driven** (`src/machines/`). A new machine is a `Machine`
  object + one line in `machines/index.ts`. No plumbing edits.
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

Feature-complete v1 (built out against Tone 15.1.22, verified). All machines
real: `record-voicefx` (record → 8 effect tiles → hear it), `sound-pads`
(12-pad procedurally-synthesized pack + your recordings), `beat-grid` (16-step
drum machine, live transport reconcile), `looper-stage` (layer mixer:
mute/volume/remove), `theremin-xy` (live oscillator+filter voice, pentatonic).

Audio adapter (`tone-sound-port.ts`) implements: procedural built-in synthesis
(no binary assets — stays offline), offline effect baking via `Tone.Offline`
(reverse/pitch/robot/echo/reverb/bitcrush + seeded "crazy" stack),
transport-scheduled step playback with per-layer volume, and the live theremin.
Built-in pack is data (`src/core/sound-catalog.ts`); "Surprise me" is a pure
seeded generator (`src/core/generative.ts`). Recordings persist to IndexedDB
(`local-storage-port.ts`) and rehydrate on reload (`main.ts` load-last flow).

Gates: `typecheck` clean, 25 unit tests, 6 Playwright E2E (incl. full hero
journey + save→reload). `BUILD_RUNBOOK.md` retains the original build order.

Known follow-ups: `robot` is a comb-delay approximation (not vocoded);
`scheduleStep` only resolves un-effected source buffers synchronously (beat-grid
clips are effect-free, so this is fine in practice).
