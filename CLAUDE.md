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
unchanged). All five machines real: `record-voicefx` (record → 8 effect tiles →
hear it), `sound-pads` (procedurally-synthesized pad pack + your recordings),
`beat-grid` (16-step drum machine, live transport reconcile), `looper-stage`
(BeepBox-style studio: editable drum + melody lanes with a sweeping playhead, a
guided Studio rail for key/groove/volume/echo, and seamless
reschedule-while-playing), `theremin-xy` (live oscillator+filter voice,
pentatonic).

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

Gates: `typecheck` clean, 52 unit tests, 13 Playwright E2E (incl. full hero
journey + save→reload). `BUILD_RUNBOOK.md` retains the original build order.

Known follow-ups: `robot` is a comb-delay approximation (not vocoded);
`scheduleStep` only resolves un-effected source buffers synchronously (beat-grid
clips are effect-free, so this is fine in practice).
