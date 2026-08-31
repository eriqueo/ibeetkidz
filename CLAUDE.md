# CLAUDE.md — ibeetkidz

Guidance for Claude when working in this repo.

## What this is

Kidpix-for-audio: a kid-friendly, touch-first, offline-capable browser sound
toy. Record your voice → make it crazy → layer loops → see the sound. Built as a
**fresh** project using kidpix's architecture as reference (NOT a fork of kidpix
code). Tone.js does the audio; the core stays vendor-free behind ports.

## Stack

TypeScript + Vite 6 + React 19 (presentation layer only — the core stays
framework-free). Tone.js ^15. Vitest + Playwright. npm (the committed
`package-lock.json` is authoritative). Node 24. GitHub Pages auto-deploy.

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

These are not just prose: `tests/unit/architecture.test.ts` asserts the rules
above as source-text guards over `src/**`, plus load-bearing seams such as the
dev-only editor boundary, guarded Phaser loader calls, and generated legal
notices. Prose does not fail a build; that file does.

## Commands

```bash
npm install
npm run dev        # localhost:5173
npm run typecheck  # gate
npm run test       # unit (Vitest)  — gate
npm run lint       # eslint . (ticket S2) — gate
npm run test:e2e   # Playwright, chromium, faked media
npm run build      # dist/ (/) + dist-gh/ (/ibeetkidz/)
npm run deploy     # separately authorized manual Cloudflare deployment
```

**The gate is `npm run typecheck && npm run test && npm run lint`.**

### Deploying

GitHub Pages is the canonical release target. Cloudflare Pages is a separately
authorized manual fallback; do not run it merely because a build passed.

| Target | How | URL |
|---|---|---|
| **GitHub Pages** | `git push origin main` → Actions | <https://eriqueo.github.io/ibeetkidz/> |
| **Cloudflare Pages** | `npm run deploy` after explicit approval | <https://ibeetkidz.pages.dev> |

**Deploy `dist/`, never `dist-gh/`, to Cloudflare.** `dist-gh/` hardcodes
`/ibeetkidz/` into every asset URL for GitHub's sub-path; on a domain root that
404s every file. `npm run build` emits both — the `deploy:cf` script names the
right one, so use it rather than reconstructing the command.

**A push is not a deploy.** Confirm the live bundle hash matches the one you
built (`rg -o 'assets/index-[A-Za-z0-9_-]+\.js' dist/index.html`, then fetch the
live `/`) before reporting anything as shipped. The Cloudflare production alias
lags the deploy URL by roughly 30–60 s.

### Gate numbers live in `BASELINE.md`, not here

`BASELINE.md` at the repo root is the **single producer** of the counts (unit
tests, test files, e2e specs, tracked files, and the commit they were measured
at). This file used to hardcode them; they went stale repeatedly and misled
several agents. Read `BASELINE.md`, or just run the gate — never quote a count
from prose.

### Which Track a spec is testing — read this before retargeting one

The Track has two scenes. **`TrackV3Scene` (the side-scroller) is the default
since 2026-08-16; `?oval` opts back into `TrackScene` (the ring).** Four specs
pin `?oval` DELIBERATELY, and each says why in its own header — do not "fix"
them by pointing them at the default:

| Spec | Why it needs the ring |
|---|---|
| `track-timing.spec.ts` | Asserts lap geometry. The side-scroller has no lap. |
| `terrain.spec.ts` | Asserts the MOMENTARY terrain path; the side-scroller routes `terrain-picked` into the LATCHING mode system, a different engine call. |
| `chrome-reachable.spec.ts` | Walks the Tiled spawn pipeline. The side-scroller draws its chrome programmatically and has no map. |
| `built-artifact.spec.ts` | Needs the only scene that runs BOTH loader shapes; the side-scroller never calls `loadSpriteAssets`, so driving the default would quietly narrow the coverage while still passing. |

Everything else follows the default and expects `TrackV3Scene`.

### Two e2e traps that have bitten repeatedly

1. **The e2e count differs local vs CI, by design.** **Four** blocks `test.skip`
   when `process.env.CI` is set, all of them hardware-audio proofs, all cited by
   FILE (line anchors go stale): `tests/e2e/audio-output.spec.ts`; the mic-record
   and jumbotron blocks of `tests/e2e/v2-flow.spec.ts`; and the pads/Magic-Pad
   block of `tests/e2e/tool-panels.spec.ts`. So a local run and a CI run
   legitimately report different totals. State *which* you mean whenever you cite
   an e2e number. **`tests/e2e/mic-denied.spec.ts` is NOT one of them** — it
   needs `getUserMedia` to FAIL, which a runner with no capture device does
   anyway, so it runs everywhere.
2. **Those audio specs are genuinely flaky locally under load** (real capture on
   a busy machine). A red run there is not a regression until you have re-run
   that spec **alone**. Do that before concluding anything — it happened again
   this session, and re-running alone was green.

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

## Current state and history

Moved to **`design/HISTORY.md`** — the four Phaser views and their invariants,
the single-`Phaser.Game` architecture, the `train: TrainCar[]` data model, and
the pre-v2 "looper-stage" history that explains why the core is shaped as it is.
Read it before touching scene lifecycle, the Workshop tool panels, or the audio
engine. `design/PERF_SINGLE_PHASER_GAME.md` has the measurements.

## Gates and follow-ups

`typecheck` clean, unit suite green, `eslint .` exit 0. **The counts are in
`BASELINE.md`** — see "Gate numbers live in `BASELINE.md`" above, including the
local-vs-CI e2e split and the flakiness warning. E2E coverage today is
`v2-flow.spec` (boot → Map → Workshop → Yard → Track), dedicated tool-panel and
built-artifact specs, and hardware-audio proofs that deliberately differ between
local and CI runs. The v1 machine-shell specs were retired with that shell.

Looped clips schedule through `resolveClip` (async, baked + cached), so effected voice lanes loop with
their effects — and a `scheduleGen` guard discards stale async (re)schedules.
Ticket S3 fixed `resolveClip`'s cache key: it now takes `bpm` as an explicit
argument, captured from the adapter's own `tempoBpm` (written only by `setTempo`)
at call time, instead of reading `Tone.getTransport().bpm` back after the bake
`await`. Reading it back could key a wrong-length baked buffer under a stale bpm.
S3's bigger sibling (2026-08-12): `Tone.Offline` SWAPS the global context while a
bake renders, so any live-path `Tone.getTransport()`/bare constructor during that
window bound to a throwaway offline context (a silently dead car; two overlapping
bakes could strand the app deaf). The adapter now pins the booted context
(`liveTransport`/`liveDestination`/`liveCtx`, architecture guard rule 9) and
bakes run single-file, deduped by bake key (`bakeQueue`/`pendingBakes`).

Known follow-ups: `robot` is a comb-delay approximation (not vocoded);
`scheduleStep` only resolves un-effected source buffers synchronously (beat-grid
clips are effect-free, so this is fine in practice).
