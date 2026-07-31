---
title: ibeetkidz-work-orders
type: Reference
timestamp: 2026-07-31T00:00:00-06:00
tags: [work-orders, agents, roadmap, execution]
status: draft — blocked on Section A decisions
---

# iBeetKidz — Agent Work Orders

Execution spec derived from `AUDIT_AND_ROADMAP.md`. That document is the *findings*; this one is the
*contract*. An agent should be able to claim a ticket here, do it, and prove it's done without asking
a question.

> **Blocked.** Waves 2 and later cannot start until the four decisions in Section A are made. Wave 1
> is unblocked and can start now.

> **R8:** both this file and `AUDIT_AND_ROADMAP.md` are scratch. They are deleted when the work lands,
> not archived.

---

## Section 0 — Agent contract

Every agent working a ticket in this document operates under these rules. They are not optional and
they are not summarizable.

**Claim discipline.** Never assert a check passed unless you ran it *in this session*. Completion
claims name the terminal step actually reached — "typecheck + unit green, e2e not run" is a complete
sentence; "done" is not. Blast-radius claims state their method ("callers via `rg` over `src/` and
`tests/`"). Citing a principle requires naming what in your diff embodies it.

**The gate.** Before opening a PR: `npm run typecheck && npm run test`. Both must be green.
`npm run test:e2e` where the ticket says so — pin the port (`PW_PORT=<free> npm run test:e2e`),
because with `PW_PORT` unset `reuseExistingServer` is `true` and a stray Vite on 5173 silently hijacks
the run.

**Baseline to beat:** 204 unit tests / 14 files passing, `tsc --noEmit` exit 0. If your branch has
fewer passing tests than it started with, you are not done. Say so rather than adjusting the baseline.

**Scope.** Minimum viable fix. Nothing unrelated bundled in. If you find a second bug, write it down
and do not fix it in this branch — an understated blast radius is a false claim that outlives the
review.

**Chesterton's Fence.** Section B carries the fence findings for every deletion in this spec so you
don't each redo the pass. If your ticket touches code Section B does not cover, run the pass yourself
before changing it: reconstruct the author's intent from `git log -S` and the file header, and say what
you found in the PR body.

**Stop conditions.** Stop and report rather than guessing if: (a) an acceptance criterion is ambiguous,
(b) your change requires touching a file you don't own in this wave, (c) a decision in Section A turns
out to gate your ticket, or (d) the gate goes red for a reason your diff doesn't explain.

**Branch + commit.** One branch per ticket, named for the ticket (`w1-01-architecture-test`).
Conventional commits, intermediate commits per logical step. PR body states: ticket ID, the gate
output you actually ran, the blast radius with method, and any fence finding.

---

## Section A — Decisions required (Eric)

Three of these gate whole waves. Each carries what I'd recommend and why, but the call is yours.

### A1 — The visualizer: re-home or cut? **Gates W2-02.**

`src/visualizer/**` (242 LOC) is `RendererPort`'s only implementation. It is reachable only through
`VizPanel` → the dead `Shell` tail, so mechanically it is deletable. But `README.md`'s first sentence
sells *"watch the sound come alive in a retro screensaver visualizer,"* and `RendererPort` is one of
four ports in the documented architecture. `git log` shows it arrived in the original scaffold, was
themed in `95cf987`, and became an opt-in "Watch panel" in `e3ed851`.

Deleting it is not cleanup — it silently cuts a stated product pillar and a port.

- **Option 1 (recommended): keep the port, re-home the renderer into Phaser.** The analyser tap
  already exists (`?audiodiag` reads it). A Phaser-side visualizer belongs in the Track or as a
  Workshop panel. Park `visualizer/**` untouched in W2, open a ticket for the re-home, and update the
  README to say where it lives.
- **Option 2: cut it.** Delete `visualizer/**`, `VizPanel.tsx`, and `ports/renderer-port.ts`; remove
  the visualizer sentence from README and the port from the architecture table. Honest, and the repo
  gets simpler.

The wrong answer is deleting the code and leaving the README sentence — that's how F2 happened.

### A2 — ESLint: install or strip? **Gates W1-04.**

There are four `eslint-disable` directives in `src/` and no ESLint, no config, no `lint` script.

- **Option 1 (recommended): install it** with `typescript-eslint` + `react-hooks`, add
  `npm run lint` to the gate. The `react-hooks` rule is what would have caught `Shell.tsx:223`'s
  conditional `useState`. Cost: one config, one CI line, and a first-run cleanup of whatever it finds.
- **Option 2: strip the four directives.** Zero cost, honest, but leaves the hooks class of bug
  uncaught forever — and that bug is live in the file W2-01 is about to edit.

### A3 — The 987 MB `.git`: rewrite or accept? **Does not gate anything; decide before W2-03.**

`git rm` shrinks the working tree, not history. `src/assets/sprites-v2/` (238 MB),
`src/assets/references/` (50 MB), `art_gen/` (59 MB), and `origin/main`'s new `ar015/` (~120 MB) are
already in history.

- **Option 1 (recommended): accept the history, stop the bleeding.** Add a `.gitattributes` /
  pre-commit size guard and move art references to a location outside the repo (or Git LFS going
  forward). A rewrite on a repo with feature branches and a worktree is a bad trade for a personal
  project.
- **Option 2: rewrite** with `git-filter-repo`. Every branch and both worktrees must be re-cut, and
  the GitHub remote force-pushed.

Either way the *pattern* must stop — `origin/main` added 120 MB of unreferenced reference PNGs six
days after the previous batch.

### A4 — E.3: which architecture wins? **Gates nothing in W1–W4; decide before any Track work.**

`IMPLEMENTATION_ROADMAP.md` Phase E.3 says the train's physical position should dictate which car's
loop plays. `CLAUDE.md` says the opposite is the deliberate design: *"driven visually from the
transport (no frame-trigger inversion)."* These are incompatible.

- **Option 1 (recommended): transport drives train.** It's what's built, it's what keeps audio
  gapless, and frame-driven audio triggering on a browser main thread is a timing-jitter source. Write
  it into the charter and delete E.3 from the roadmap.
- **Option 2: invert it.** Then E.3 is a real project, not a roadmap line, and needs its own Phase 0.

### A5 — Palette: which of the three wins? **Gates W4-01.** *(Low stakes, but pick one.)*

`design/palette-nintendo.json` (charter-declared, used by nothing, 12 of 16 colors appear nowhere in
`src/`), `theme.css:29-62` (gruvbox + Dracula, the actual runtime), or `design/design-tokens.json`
(synthwave, contradicts the charter, unused).

**Recommended:** `palette-nintendo.json` becomes the generator input; `theme.css` and a new
`src/game/palette.ts` are generated from it; `design-tokens.json` is deleted. This is the option that
makes the charter true rather than amending it. It will change how the app looks — that is the point,
and it should be a deliberate visual review, not a side effect of a refactor ticket.

---

## Section B — Chesterton's Fence findings (done; do not redo)

Every deletion candidate in this spec, with its reconstructed intent.

| Target | Origin | Intent | Verdict |
|---|---|---|---|
| `src/game/press.ts` | `c99be87` "…+ shared press" | **Deliberate shared abstraction, written and never adopted.** Its header defines a real scope boundary: it is for objects that *draw their own pixels*; transparent hit-areas over painted art have nothing to scale and use a fill-flash **by design**. | **DO NOT DELETE — adopt.** The six press copies are two idioms, not one. `press.ts` replaces the self-drawn subset only. My roadmap item 27 was wrong. |
| `src/visualizer/**` | scaffold → `95cf987` theme → `e3ed851` opt-in Watch panel | `RendererPort`'s only implementation; a README-headline product pillar. | **BLOCKED on A1.** Not a cleanup ticket. |
| `src/components/VizPanel.tsx` | `e3ed851` | The visualizer's only mount point. | Moves with A1. |
| `src/app/use-viewport.ts` | `4166a76` iOS silent-switch + phone bottom sheet | `usePhoneLayout` is **still called** at `Shell.tsx:200` — above the four returns. Its result `isPhone` is only consumed at 219+, which is dead. | **Reachable-but-useless, not dead.** Delete the `Shell.tsx:200` call in the same commit or typecheck breaks. |
| `src/components/PixelButton.tsx` | `7157244` "visible labelled pixel buttons + press animation" | A DOM-era button superseded wholesale by Phaser sprites + `ui-sprites.ts`. | **Safe to delete.** |
| `src/machines/tools.tsx` | the v1 machine registry | Superseded by the four-view sprite shell. `laneColor` is the only live export (3 refs). | **Safe to delete after `laneColor` moves to core.** |
| `slice_sprites.py` | root-level sprite slicer | Hardcodes `/home/ubuntu/ibeetkidz/...` paths that do not exist on this machine — **it cannot run.** Outputs (`scenes-v2-sliced/`) have zero code references. | **Safe to delete.** |
| `pnpm-lock.yaml`, `pnpm-workspace.yaml` | — | The workspace file's entire content is an unfilled pnpm prompt (`allowBuilds: {esbuild: "set this to true or false"}`). Never a real workspace. | **Safe to delete.** CI uses `npm ci`. |
| `src/assets/sprites-v2/**`, `references/**`, `art_gen/**` | art sessions | Zero code references (verified by grep). `art_gen`'s own commit message says "session references and WIP generations." | **Safe to delete from the tree.** History is A3. |

---

## Section C — Waves and dependencies

Sequential waves; agents inside a wave run concurrently. A wave does not start until the previous one
is merged to `main` and green.

```
W0  Ground truth ─────────────────┐  (single agent, ~2h)
                                  ▼
W1  Wire the checks ──────────────┤  (3 agents)   ── blocked: W1-04 on A2
                                  ▼
W2  Finish the migration ─────────┤  (3 agents)   ── blocked: W2-02 on A1
                                  ▼
        ┌─────────────────────────┴──────────────────────┐
        ▼                                                ▼
W3  Protect the child's work (4 agents)      W4  Kill the duplication (4 agents)
        │                                                │
        └─────────────────────────┬──────────────────────┘
                                  ▼
W5  Test what isn't tested ───────┤  (3 agents)
                                  ▼
W6  Model correctness ────────────┘  (3 agents)

W7  Docs ── runs concurrently with ANY wave. Touches only *.md. Zero code collisions.
```

**Why W1 before W2.** W1-01's React-confinement assertion **fails on arrival** — `machines/tools.tsx`
imports React. W1-01 therefore ships that one assertion `.skip`ped with a comment naming W2-01 as its
unblock, and W2-01's acceptance criteria include un-skipping it. This is deliberate: the check exists
before the deletion so the deletion is *proved*, not asserted.

**Why W3 and W4 are parallel.** Their file sets are disjoint. W3 owns `core/` + `adapters/` +
`ports/` + boot; W4 owns `game/` + CSS + the React view shells. The single shared file is
`types.ts` — resolved by giving it to W3 exclusively and having W4-02 depend on a constant W3 lands
first (see the ownership map).

**Why W5 before W6.** W6 is a structural refactor of `Layer` and `SoundPort`. Doing it before the
contract tests exist means the refactor's correctness rests on 204 tests that don't cover the adapters
at all.

---

## Section D — File ownership map

One owner per file per wave. If your ticket needs a file you don't own, **stop and report** — do not
coordinate around it in-branch.

### Wave 1

| Agent | Owns |
|---|---|
| W1-A | `tests/unit/architecture.test.ts` (new) |
| W1-B | `src/game/EventBus.ts`, `src/game/TiledParser.ts`, `tests/unit/tiled-maps.test.ts`, `tests/unit/tiled-parser.test.ts` |
| W1-C | `.github/workflows/**`, `package.json`, `eslint.config.js` (new, if A2=install) |

### Wave 2

| Agent | Owns |
|---|---|
| W2-A | `src/machines/**`, `src/components/Shell.tsx`, `src/components/PixelButton.tsx`, `src/app/use-viewport.ts`, `src/core/lane-color.ts` (new), `src/components/Workshop.tsx` (import line only) |
| W2-B | `src/visualizer/**`, `src/components/VizPanel.tsx`, `src/ports/renderer-port.ts` — **A1-dependent** |
| W2-C | `src/assets/sprites-v2/**`, `src/assets/references/**`, `src/assets/scenes-v2-sliced/**`, `art_gen/**`, `slice_sprites.py`, `.gitattributes` (new) |

### Wave 3 — owns `src/core/`, `src/ports/`, `src/adapters/`, `src/app/`, `src/components/BootGate.tsx`

| Agent | Owns |
|---|---|
| W3-A | `src/core/types.ts`, `src/core/project-state.ts`, `src/core/project-schema.ts` (new), `tests/unit/project-state.test.ts`, `tests/fixtures/**` (new) |
| W3-B | `src/ports/storage-port.ts`, `src/adapters/local-storage-port.ts` |
| W3-C | `src/components/BootGate.tsx`, `src/app/context.tsx`, `src/app/diag.ts` (new) |
| W3-D | `src/adapters/tone-sound-port.ts` (recording cap only) |

### Wave 4 — owns `src/game/`, CSS, the React view shells

| Agent | Owns |
|---|---|
| W4-A | `src/theme.css`, `src/style.css`, `src/game/palette.ts` (new), `scripts/gen_palette.py` (new), `design/**` |
| W4-B | `src/game/scenes/**`, `src/game/ui-scene.ts`, `src/game/tool-panels.ts` |
| W4-C | `src/components/{Map,Yard,Track,Workshop}.tsx`, `src/components/SceneView.tsx` (new), `src/components/Toast.tsx` (new) |
| W4-D | `src/game/sprite-assets.ts`, `src/game/assets.ts`, `src/game/ui-sprites.ts`, `scripts/build_train_atlas.py` |

---

## Section E — Tickets

Format: **owns** = files you may edit. **Accept** = mechanically checkable; if you can't run it, you
can't claim it.

### W0 — Ground truth (one agent, serial)

**W0-01 · Sync and clear the tooling trap**
Owns: repo root.
1. `git pull` — local `main` is 8 commits behind `origin/main` (`3e0abfa` → `3b7732b`). The delta adds
   `src/adapters/wav.ts`, `src/game/send-panel.ts`, an iPhone raw-mic fix (+330 in `tone-sound-port.ts`),
   a hardened `playwright.config.ts`, and 3 tests.
2. `git rm pnpm-lock.yaml pnpm-workspace.yaml`.
3. Re-run the gate and **record the new baseline in this file** — every ticket below compares against
   it, and the 204/14 figure was measured pre-pull.

**Accept:** `git rev-list --left-right --count origin/main...main` → `0 0`. `npx tsc --noEmit` exit 0.
`npx vitest run` green, count recorded here. `ls pnpm-*` → nothing.

---

### W1 — Wire the checks

**W1-01 · `tests/unit/architecture.test.ts`** · owner W1-A · depends W0-01
Owns: `tests/unit/architecture.test.ts` (new file only).

Assert, by reading source text and matching import statements — no new dependency, runs in the
existing vitest gate:

1. No file under `src/core/` or `src/ports/` imports from `src/adapters/`.
2. `from "tone"` appears in exactly one file: `src/adapters/tone-sound-port.ts`.
3. `Math.random` appears zero times in `src/`.
4. No `fetch(`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon` in `src/`.
5. React is imported only under `src/App.tsx`, `src/main.tsx`, `src/components/`, `src/app/`.
   **Ship this one `.skip`ped** with the comment `// UNSKIP IN W2-01 — machines/tools.tsx violates this`.

**R4 corollary — this is not optional:** for each of the five, seed a deliberate violation, watch it go
red, revert. A check that has never failed has never been tested. Put the evidence in the PR body.
Verify no assertion matches its own file.

**Accept:** `npx vitest run tests/unit/architecture.test.ts` → 4 pass, 1 skipped. Full suite green at
baseline + 5. PR body shows five red-then-green seed runs.
**Out of scope:** fixing any violation these find. Report only.

---

**W1-02 · Close the Tiled action vocabulary** · owner W1-B · depends W0-01
Owns: `src/game/EventBus.ts`, `src/game/TiledParser.ts`, `tests/unit/tiled-maps.test.ts`,
`tests/unit/tiled-parser.test.ts`.

1. Export `EVENT_NAMES` from `EventBus.ts`, derived from `EventMap` — not a hand-written parallel list
   (that would be the P7 violation this ticket exists to prevent).
2. In `TiledParser.ts`, refine `TiledSpawn.action` from `string` to that union via a zod refinement, so
   an unknown action is a **parse error at import**.
3. Delete the two now-unnecessary casts: `TiledSceneAdapter.ts:107` and `ui-scene.ts:52`. *(These two
   lines are the only edits permitted outside your owned files — note them in the PR.)*
4. Extend `tiled-maps.test.ts`'s `describe.each` from 2 maps to all 4 (`map.json` and `workshop.json`
   are currently untested) with `expect(EVENT_NAMES).toContain(s.action)`.
5. Delete the 5 events with listeners and no emitter: `car-selected`, `workshop-instrument-added`,
   `workshop-car-type-changed`, `workshop-nav`, `workshop-surprise`. Grep first and confirm zero
   emitters — if one exists, stop and report.

**Accept:** typecheck exit 0. Suite green. A deliberate typo in any map's `action` fails
`npm run test` — demonstrate in the PR body. `grep -c "as (event: string" src/` → 0.

---

**W1-03 · Gate the deploy on e2e** · owner W1-C · depends W0-01
Owns: `.github/workflows/**`.

`build-and-deploy.yml` currently runs typecheck + unit + build + deploy with **no e2e**, and `test.yml`
is a separate workflow with no dependency edge. Runs `28759519651` and `28759353276` show
`test / failure` and `build-and-deploy / success` on the same commits — broken code has shipped twice.

Add e2e to the build job before the artifact upload, or make deploy `needs:` the e2e job.

**Accept:** `gh workflow view build-and-deploy` shows e2e in the path to deploy. Push a branch with a
deliberately failing e2e and confirm deploy does not run — state the run ID in the PR.

---

**W1-04 · ESLint** · owner W1-C · **blocked on A2**
Owns: `package.json`, `eslint.config.js` (new).
If A2 = install: `typescript-eslint` + `eslint-plugin-react-hooks`, `npm run lint` script, added to
both workflows. If A2 = strip: delete the four `eslint-disable` directives (`Workshop.tsx:466,469`,
`PhaserGame.tsx:72`, `tools.tsx:897` — the last dies with W2-01 anyway).
**Accept (install):** `npm run lint` exits 0; confirm the `react-hooks` rule fires by temporarily
reintroducing the `Shell.tsx:223` pattern. **Accept (strip):** `grep -rc "eslint-disable" src` → 0.

---

### W2 — Finish the migration

**W2-01 · Delete the v1 shell** · owner W2-A · depends W1-01
Owns: `src/machines/**`, `src/components/Shell.tsx`, `src/components/PixelButton.tsx`,
`src/app/use-viewport.ts`, `src/core/lane-color.ts` (new); `src/components/Workshop.tsx` **import line
only**.

1. Move `laneColor` (`tools.tsx:132`) to `src/core/lane-color.ts`; repoint `Workshop.tsx:21`. It is the
   only live export — verified: 3 references.
2. `git rm src/machines/tools.tsx src/components/PixelButton.tsx src/app/use-viewport.ts`.
3. Collapse `Shell.tsx` to the four-way switch. Delete line 200's `usePhoneLayout()` call **in the same
   commit** (Section B: it is reachable-but-useless; leaving it breaks typecheck). Everything from
   `const Canvas = active.Canvas;` down is unreachable by type — `AppView` is a closed 4-member union
   and all four return above it. The hooks-after-conditional-return violation at 223/225 goes with it.
4. **Un-skip assertion 5 in `tests/unit/architecture.test.ts`.** This is the ticket's proof.

**Accept:** typecheck exit 0. Full suite green, **including the un-skipped React assertion**. e2e green
(`PW_PORT=<free>`). `git diff --stat` shows ≈2,100+ deletions. `grep -rn "TOOLS\|LoopTrack" src` → 0.
**Out of scope:** `visualizer/**` and `VizPanel.tsx` — W2-B owns those.

---

**W2-02 · Visualizer disposition** · owner W2-B · **blocked on A1**
Owns: `src/visualizer/**`, `src/components/VizPanel.tsx`, `src/ports/renderer-port.ts`.
A1=re-home → this wave is a no-op; open a follow-up ticket and update README to say where it will live.
A1=cut → delete all three, remove the visualizer sentence from README's first paragraph **and** the
`RendererPort` row from its architecture table. Also fix `visualizer.ts:61`'s unbalanced
`visibilitychange` listener if the code survives.
**Accept:** typecheck + suite green. README contains no claim contradicted by the tree.

---

**W2-03 · Evict the unreferenced binaries** · owner W2-C · depends W0-01 · see A3
Owns: `src/assets/sprites-v2/**`, `src/assets/references/**`, `src/assets/scenes-v2-sliced/**`,
`art_gen/**`, `slice_sprites.py`, `.gitattributes` (new).

Verified zero code references for all of these. `slice_sprites.py` hardcodes `/home/ubuntu/...` and
cannot run. Before deleting, confirm with `grep -rn "sprites-v2\|scenes-v2-sliced\|art_gen"
src tests scripts --include=*.ts --include=*.tsx --include=*.py` — `scripts/pack-sprites.py` and
`gen_workshop_sprites.py` read some of these as **inputs**; either relocate those inputs outside the
repo and repoint the scripts, or delete the scripts too. State which you did.

Then add the stop-the-bleeding guard per A3: a pre-commit or CI check rejecting new binaries over a
size threshold in `src/assets/`. `origin/main` added ~120 MB of unreferenced `ar015/` PNGs six days
after the previous batch — the guard is the point of this ticket, not the deletion.

**Accept:** `du -sh src/assets` down by ≥340 MB. Suite + e2e green (nothing loaded them, so nothing
should move). The size guard rejects a seeded 5 MB PNG — demonstrate.

---

### W3 — Protect the child's work

**W3-01 · Version and parse the save format** · owner W3-A · depends W2-01 · **≥50 LOC — see F1**
Owns: `src/core/types.ts`, `src/core/project-state.ts`, `src/core/project-schema.ts` (new),
`tests/unit/project-state.test.ts`, `tests/fixtures/**` (new).
**Do not start until F1's Phase 4 is approved.**

**W3-02 · Bound the recording store** · owner W3-B · depends W2-01
Owns: `src/ports/storage-port.ts`, `src/adapters/local-storage-port.ts`.
1. Add `deleteBlob(id)` to `StoragePort` and implement it. There is currently **no way to delete a
   blob**, and `deleteProject` exists in both port and adapter and is **called from nowhere**.
2. Declare the retention rule in the port's doc comment: blobs unreferenced by the project *and* by any
   history snapshot are collected on save. Note that undo history (`HISTORY_LIMIT = 50`) means a
   "deleted" recording must survive until it falls out of history — this is why the rule needs both
   clauses.
3. Stop `readIndex()` (`local-storage-port.ts:22-27`) from swallowing: a parse failure currently returns
   `{}` and **silently discards every saved project**. Return a typed failure the caller can surface.
4. Make `deleteProject:96` symmetric with `saveProject:73` (it writes outside the try).
**Accept:** new contract-style tests for `deleteBlob` and the corrupt-index path pass under jsdom +
`fake-indexeddb`. Suite green at baseline + new. `grep -c "catch {}" src/adapters/local-storage-port.ts`
reduced; each survivor has a comment saying why.
**Out of scope:** wiring collection into `context.tsx` — W3-C owns that file.

**W3-03 · Boot honestly, and surface errors** · owner W3-C · depends W2-01
Owns: `src/components/BootGate.tsx`, `src/app/context.tsx`, `src/app/diag.ts` (new).
1. Wrap `BootGate.start` in try/catch with a visible, kid-legible failure state and a retry. Today any
   rejection from `engine.start()` or `loadLast()` leaves `busy === true` and hangs the app on a
   disabled "TAP TO START" forever — no message, no log.
2. Validate at boot: `AudioContext` constructible, `localStorage` and `indexedDB` reachable (both throw
   in Safari private mode). Refuse to run half-alive rather than limping up — every engine method
   currently guards with a silent `if (!this.started) return`.
3. Add `src/app/diag.ts`: a `window.onerror` + `unhandledrejection` ring buffer surfaced at `?diag`,
   alongside the existing `?audiodiag` probe. **Follow that probe's pattern** (`context.tsx:75-87`) —
   it is the one piece of operator-facing observability in the repo and it is the right shape.
4. Handle `QuotaExceededError`. It is defined in the port, thrown twice, and **caught nowhere**;
   `context.tsx:113` `void`s the autosave promise, so a full device silently stops saving.
5. Make `persist()` skip blobs already written — it currently rewrites **every** blob on **every**
   debounced save.
**Accept:** typecheck + suite green. Manually: block `AudioContext.resume`, confirm a visible error and
working retry. Seed a corrupt localStorage entry, confirm the app boots and says so. `?diag` lists a
thrown error. State each manual check you ran.

**W3-04 · Cap the recording** · owner W3-D · depends W2-01
Owns: `src/adapters/tone-sound-port.ts`.
Add `MAX_RECORD_SEC` auto-stop to `startRecording` (`:253`). Hold-to-record with a resting finger
currently records until release, then decodes and RMS-normalizes the whole thing in memory.
**Accept:** typecheck + suite green. e2e mic specs still pass (`PW_PORT=<free>`). Note `origin/main`
rewrote this function for raw-stream capture — rebase before starting.
**Out of scope:** the port split (W6), the FX-chain hoist (W6), tempo ownership (W6).

---

### W4 — Kill the duplication

**W4-01 · One palette producer** · owner W4-A · **blocked on A5** · **≥50 LOC — see F4**

**W4-02 · Promote the scene boilerplate** · owner W4-B · depends W2-01
Owns: `src/game/scenes/**`, `src/game/ui-scene.ts`, `src/game/tool-panels.ts`.
Promote into `BackgroundScene` (which already exists and is a good abstraction): the chrome preload
triple (`YardScene:104-110`, `TrackScene:78-84`, `WorkshopScene:165-174`), the chrome spawn call
including both depth literals, the 4-line `layoutChrome` guard, and the `onResize` body (all four
scenes), plus the `chromeSpawns`/`chrome` field pair. Extract the LCD chip as a class —
`TrackScene:117-167` and `WorkshopScene:355-496` are the same widget twice, one naming its colors and
one inlining them. Extract the 3-line tarp overlay.

**Adopt `src/game/press.ts` rather than reinventing it.** Per Section B, it is a deliberate,
documented abstraction that was written and never wired up, and **its header defines the scope
boundary**: it covers objects that draw their own pixels; transparent hit-areas over painted art use a
fill-flash *by design*. Do not collapse those two idioms into one.

**Accept:** typecheck + suite + e2e green. Net LOC reduction across `src/game/scenes/`.
`grep -c "pressPop" src/game` > 0. A diff of any two scenes shows no identical multi-line block.

**W4-03 · One React scene shell** · owner W4-C · depends W2-01
Owns: `src/components/{Map,Yard,Track,Workshop}.tsx`, `SceneView.tsx` + `Toast.tsx` (new).
`Map.tsx:56-75` and `Yard.tsx:98-117` are a 20-line verbatim-identical toast block (same 11 style
props, same 2200 ms). All four views share the same wrapper div and the same Track-guard predicate
(`view === "track" && liveTrain(...).length === 0`, duplicated at `Map.tsx:34` and `Yard.tsx:64`) —
promote the guard to a `canEnter(view, project)` selector **in core**, where the other selectors live.
Also delete the four re-typed tempo ranges (`Track.tsx:43`, `Workshop.tsx:200`) and import
`MIN_BPM`/`MAX_BPM` from `types.ts:292`.
**Note:** `Shell.tsx:97-98`'s `min="40" max="220"` dies with W2-01; confirm before assuming.
**Accept:** typecheck + suite + e2e green. `grep -rn "220" src/components` → no bare tempo literals.
`canEnter` has a unit test.

**W4-04 · Derive the car-type manifests** · owner W4-D · depends W2-01
Owns: `src/game/sprite-assets.ts`, `src/game/assets.ts`, `src/game/ui-sprites.ts`,
`scripts/build_train_atlas.py`.
Six producers list the car types: `types.ts:147` (the legitimate one), `sprite-assets.ts:38`,
`assets.ts:36-41`, `ui-sprites.ts:85-89`, `train.json`'s 40 hand-written frames, and
`build_train_atlas.py:26` — whose docstring *admits* it "must match train.json + sprite-assets.ts."
Derive `TRAIN_TYPES` as `["loco", ...CAR_TYPES]`; map over it for the sprite manifests and picker defs;
have `build_train_atlas.py` **emit** `train.json` instead of asserting it matches.
Also fix P16: `sprite-assets.ts:74-77` and `ui-sprites.ts:152` load `public/` assets via
document-relative strings, ignoring `BASE_URL` — in direct violation of the rule written at
`assets.ts:3-4`. `grep -rn "BASE_URL" src` currently returns nothing. Add
`const pub = (p: string) => import.meta.env.BASE_URL + p;` and route both call sites through it.
**Accept:** typecheck + suite + e2e green. Adding a fictional 5th car type to `CAR_TYPES` requires
**zero** further TS edits — demonstrate, then revert. `npm run build` produces both `dist/` and
`dist-gh/`; serve `dist-gh` at a path **without** a trailing slash and confirm atlases still load.

---

### W5 — Test what isn't tested

**W5-01 · `StoragePort` contract suite** · depends W3-02. Start here: it owns everything a kid can
lose and has **zero tests of any kind**. jsdom + `fake-indexeddb` makes it cheap. One suite against
the interface, run against `LocalStoragePort` and a fake.
**Accept:** both implementations pass the same suite. Deleting a `LocalStoragePort` method fails it.

**W5-02 · `SoundPort` transport contract + adapter tests** · depends W3-04.
Cover `resolveClip`'s bake-cache rebuild path (currently **zero** references in `tests/`) and the
`scheduleGen` guard. The guard is correct — verified by reading `tone-sound-port.ts:647-649` — but
untested, so the invariant is one refactor from silent breakage.
**Accept:** cache miss→hit→different-chain-miss asserted; clearing the map reproduces identical output;
a seeded stale async reschedule is proven not to leak a voice.

**W5-03 · Round-trip property + a real fixture** · depends W3-01.
Add a structural `parse(serialize(x)) === x` check. Seven example-based round-trips exist; none would
catch a new `Project` field that `normalizeProject` forgets to copy.
**Accept:** adding a field to `Project` without updating `normalizeProject` fails the test —
demonstrate, then revert.

**W5-04 · e2e through the stations nav** · depends W4-02.
Rebuild per-tool e2e (retired with the v1 shell, never replaced). Add **at least one test that a Tiled
hit-area lands where the art is** — every current e2e drives the app through the dev bridge and asserts
on the `Project` object, so nothing verifies that a kid tapping a pixel emits anything.

---

### W6 — Model correctness (all depend on W5)

**W6-01 · `Layer` discriminated union** · **≥50 LOC — see F2**
**W6-02 · `SoundPort` split** · **≥50 LOC — see F3**
**W6-03 · Single-writer fixes** — delete the three direct `engine.setTempo` call sites so
`reconcile`/`start` is the sole writer; stop `resolveClip` reading `Tone.getTransport().bpm` as a
cache-key input (`:413` — a stale bpm currently caches a wrong-length buffer under a key derived from
the wrong bpm); derive `isPlaying` from the transport instead of shadowing it (an iOS interruption
currently leaves the train riding silently); push `activePartId` into `YardScene` from `Yard.tsx` so
the selection ring follows reducer-driven changes; hoist `scheduledDestination`'s FX chain to
per-lane rather than per-hit.

---

### W7 — Docs (concurrent with any wave; `.md` only)

**W7-01** Rewrite `README.md` Status from scratch. It is a month stale, describes `looper-stage`/Home
as the landing (it's Map), and **never mentions Phaser** — the largest dependency and largest source
directory. Depends on A1 for the visualizer sentence.
**W7-02** Fix CLAUDE.md's three verified-false claims: `_original` dupes removed (47 files still on
disk, both copies 1920×1920), `LoopTrack` reused (zero importers), 126/5 test counts.
**W7-03** Reconcile `PROJECT_CHARTER.md`: §2.2 (six coordinate blocks survive in `scene-layout.ts`),
§2.4 (errors are silent at boundaries, inverted), §1 typography (`tool-panels.ts:17` uses Press Start
2P for every label; Baloo 2 isn't in the fonts directory at all), §1 no-emoji (emoji are structural),
§4.4's stale test floor. Write A4's winner into it.
**W7-04** Collapse 27 docs to six living docs; `git rm` the twelve listed in
`AUDIT_AND_ROADMAP.md` Block 7. Promote STATUS_LOG's ten open items to GitHub Issues — a log is not a
tracker. Then delete `AUDIT_AND_ROADMAP.md` and this file.

---

## Section F — Phase 0–3 refinement for the structural items

Four tickets exceed ~50 LOC and change structure, so per the standing rule they get stepwise
refinement and **stop at Phase 4**. No agent generates code for F1–F4 until the checkpoint is approved.

---

### F1 — Version and parse the save format (W3-01)

**Phase 0 — Requirements, criteria, constraints, edge cases.**

*Requirements.* The persisted project format must (a) carry an explicit version, (b) be parsed into a
precise domain type once at the edge rather than cast, (c) continue to load every save shape that has
ever shipped, and (d) fail in a way a child can recover from.

*Success criteria.* `Project` has `schemaVersion`. `deserialize` returns a result type, not a cast. A
save written by any prior version loads with its content intact, proven against a **captured** fixture
rather than a hand-typed one. A corrupt save produces a typed failure the boot path can surface (W3-03
consumes it).

*Constraints.* The reducer's exhaustiveness must survive — it is the strongest structural asset in the
codebase and nothing here may weaken it. zod is already a dependency and already proven in
`TiledParser`; use it, don't add a second validator. No ambient inputs in the parse path: the current
migration deliberately mints deterministic slot ids with the comment "no RNG in the core" and that must
hold. Undo history serializes the same shape, so whatever parses a save must parse a history entry.

*Edge cases.* A save with `train: []` present-but-empty is currently ambiguous with "no train" — three
sniffs deep. `clips` currently enters wholly unvalidated (`:1102`) and `context.tsx:100,125` switches on
`clip.source.kind` on data never shown to have a `source`. `activeView` is unchecked (`:1107`) and an
out-of-union value would fall past all four `Shell` returns. `Layer.kind`, `wave`, and
`activeMachineId` are likewise unchecked. A future save from a *newer* version opened by older code —
decide: refuse, or best-effort?

*Non-goals.* Changing the shape of `Project` beyond adding the version field. Fixing `Layer`'s
tag-plus-optionals — that is F2 and must not be bundled.

**Phase 1 — Spec (what, not how).**
Invariant: **anything that crosses the persistence boundary is parsed exactly once, at that boundary,
and the core never re-checks.** Data flow: `string → parse → VersionedRaw → migrate(version) → Project`.
The migration step consumes an already-parsed value; it is not also the validator. Today those two
jobs are fused inside `normalizeProject`, which is why it validates five fields and passes four
through.

**Phase 2 — Module decomposition.**

| Module | Contract | Why separate |
|---|---|---|
| `core/project-schema.ts` (new) | `parseProject(u: unknown): Result<VersionedProject, ParseError>` | Parsing is a boundary concern; keeping it out of `project-state.ts` stops the 1,109-line file growing and makes the schema testable alone |
| `core/project-state.ts` — `migrate` | `(v: VersionedProject) => Project` | Migration is domain logic over trusted input; it should never see raw JSON again |
| `core/project-state.ts` — `deserialize` | `(json: string) => Result<Project, ParseError>` | Composition of the two; the only export the adapter calls |

`normalizeProject`'s existing six-way structural sniffing becomes the `version === undefined` branch and
is **frozen** — no new sniffs are ever added to it. Every future format change is a new numbered case.

**Phase 3 — Refinement.**
*Logic.* Stamp `schemaVersion: 1` in `emptyProject`. `parseProject` accepts either `{schemaVersion: n, ...}`
or a legacy object with no version. Branch on `raw.schemaVersion ?? 0`; case 0 delegates to the frozen
`normalizeProject`; case 1 is the identity parse.
*Data.* `ClipSourceSchema` as a discriminated union so `clips` is parsed per entry. `activeView`,
`activeMachineId`, `Layer.kind`, and `wave` become zod enums — note `activeMachineId` must tolerate the
now-deleted v1 tool ids and coerce to a valid default rather than reject.
*Errors.* `ParseError` carries a code and the zod issue path. It does not throw; W3-03 renders it.
*Verification.* Capture a real pre-v2 save from a browser into `tests/fixtures/`. The existing eight
migration tests (`project-state.test.ts:462-635`) are thorough but every fixture is hand-typed from
memory — they prove the migration handles the shape the author *remembered*.

**Phase 4 — Open questions for Eric.**
1. Newer-save-in-older-code: refuse with a message, or best-effort parse?
2. `Result` type — hand-rolled discriminated union, or add `neverthrow`? (Principle 19 names it; the
   repo has no error-value library today.)
3. Should undo-history snapshots carry the version too, or inherit the project's?

---

### F2 — `Layer` discriminated union (W6-01)

**Phase 0.** *Requirements.* `Layer` must make "drum lanes have steps, melody lanes have notes"
unrepresentable rather than commented. Today `types.ts:103-141` declares `kind`, `steps` ("empty for
melody lanes"), and `notes` ("empty outer array for drum lanes") — `{kind:"drum", steps:[…], notes:[…]}`
is a legal value. *Success.* A `Layer` carrying the wrong array for its kind fails to compile; the
manual guards at `project-state.ts:341,386,622,646` and `audio-engine.ts:110` become narrowing rather
than defensive. *Constraints.* Serialized shape must not change, or F1's migration is invalidated — this
is a type-level change only. Reducer exhaustiveness preserved. *Edge cases.* `LayerPattern`
(`types.ts:97-100`) repeats the identical mistake and `normalizePatterns` fills the irrelevant half with
`[]`. `StepNote.roll` vs `pins` are documented mutually exclusive, modeled as two independent optionals,
arbitrated imperatively in `makeNote` ("pins win"). A future third lane kind is the reason this matters.

**Phase 1.** Invariant: **every "exactly one of" in the data model is a tagged union; adding a variant
breaks every handler that forgot it.** No data flow change.

**Phase 2.** `type Layer = LayerBase & ({kind:"drum"; steps} | {kind:"melody"; notes})`. Same treatment
for `LayerPattern`. `type Articulation = {roll: Roll} | {pins: readonly PitchPin[]} | {}` folded into
`StepNote`. Deliberately **not** in scope: `wave` vs `instrument` as parallel timbre representations
(reconciled at read time by `resolveInstrument`) — real, but a separate ticket.

**Phase 3.** Convert the type; let the compiler enumerate the call sites; convert each guard from
defensive to narrowing. `addPin` (`:622`) currently no-ops on drums and `tuneDrum` (`:646`) no-ops on
melody — after the change these become unreachable branches the compiler can prove. Serialization is
unchanged; the round-trip property test from W5-03 is the safety net, which is why W6 follows W5.

**Phase 4 — Open questions.** (1) Does `{}` as the empty `Articulation` variant read acceptably, or
should it be an explicit `{kind:"plain"}`? (2) Should `wave`/`instrument` unification be folded in here
after all, given both refactors touch the same call sites?

---

### F3 — `SoundPort` split (W6-02)

**Phase 0.** *Requirements.* `SoundPort` is a 27-method interface bundling at least five unrelated
capabilities, with `scheduleStep` taking 9 positional parameters and `scheduleNote` taking 10. The fake
needs 25 inert stubs to exercise 2 methods. Every new audio capability widens the interface *and* every
implementer. *Success.* `AudioEngine` depends only on the transport subset; a fake for it is small
enough to be honest. *Constraints.* `ToneSoundPort` remains one file (Tone is imported exactly once,
repo-wide — do not break that). `origin/main` just added +330 lines to it for raw-stream mic capture;
rebase before starting. *Edge cases.* The ports leak browser types — `getAnalyser(): AnalyserNode`,
`Blob` in two signatures, `CanvasRenderingContext2D` in `RendererPort` — forcing the fake to return
`{} as AnalyserNode`. Any non-browser adapter must fabricate one.

**Phase 1.** Invariant: **smallest viable port — a consumer's declared dependency is the set of verbs
it actually calls.**

**Phase 2.** `TransportPort` (schedule/tempo/start/stop/clear/getTransportStep/getTransportBar) ·
`RecorderPort` (mic, performance capture, encoded audio, duration) · `EffectRenderPort`
(renderEffects/rehydrate) · `LiveVoicePort` (theremin) · `AnalysisPort` (`readVisualFrame(): VisualFrame`
— the type already exists at `renderer-port.ts:7`). One class may implement all five; the *interfaces*
are what split.

**Phase 3.** Replace `AnalyserNode` with `readVisualFrame()`; replace `Blob` with
`EncodedAudio = { bytes: Uint8Array; mime: string }`, converted in the adapter. Collapse the 9- and
10-arg signatures into option objects. Narrow `AudioEngine`'s constructor to `TransportPort`. Add the
composition-root seam: `AppProvider({ api = defaultApi, children })` — today it always renders the
module-scope singleton, so there is no way to inject a fake for a component test.

**Phase 4 — Open questions.** (1) Split the *file* too, or interfaces only? (2) Does `AnalysisPort`
survive A1's outcome, or die with the visualizer? (3) Do the option objects go in `ports/` or `core/`?

---

### F4 — One palette producer (W4-01)

**Phase 0.** *Requirements.* One producer for the color set, consumed by both CSS and Phaser. Today
there are six-plus: `palette-nintendo.json` (charter-canonical, used by nothing — 12 of its 16 colors
appear nowhere in `src/`), `design-tokens.json` (synthwave, contradicts the charter, unused),
`theme.css:29-62` (gruvbox + Dracula, the actual runtime), `style.css` (49 raw hexes, none via `var()`),
`tool-panels.ts:22-51`, and four scene files. *Success.* Changing one color changes the app everywhere;
a raw hex in `src/game/` fails a check. *Constraints.* **Phaser cannot read CSS variables** — that is
the root cause and it means one input must produce two outputs. *Edge cases.* This will change how the
app looks. That is the point, and it needs a deliberate visual review, not a silent side effect of a
refactor branch.

**Phase 1.** Invariant: **one producer per fact, consumers derive.** `palette.json → { theme.css :root
block, game/palette.ts }`, generated, never hand-synced (P9: derived artifacts are generated or
lint-checked, never synced by promise).

**Phase 2.** `design/palette.json` (source) · `scripts/gen_palette.py` (generator, joins the five
existing scripts) · `src/theme.css` (generated block, hand-authored remainder) ·
`src/game/palette.ts` (generated, `0x` ints).

**Phase 3.** Generator emits both with a "GENERATED — do not edit" banner. A unit test re-runs the
derivation and asserts the committed outputs match — the lint-checked half of P9. A second assertion
rejects raw hex literals in `src/game/`. Migration order: generate first, then replace literals
scene-by-scene so each commit is visually reviewable.

**Phase 4 — Open questions.** (1) A5 decides the winning palette. (2) Python generator (consistent
with `scripts/`) or a Node one (no second toolchain in CI)? (3) Does `style.css` get fully tokenized in
this ticket, or is that a follow-up?

---

## Section G — Merge protocol

1. One branch per ticket, off the wave's base. PR into `main`.
2. A wave's PRs merge in ticket-ID order. If two touch a file, the ownership map was wrong — stop and
   report rather than resolving in-branch.
3. No wave starts until the previous wave is merged **and** `main` is green.
4. Every PR body states: ticket ID, gate output actually run, blast radius with method, fence findings,
   and any acceptance criterion that could not be checked (labeled unverified, with what would verify it).
5. `main` stays deployable. W1-03 makes that mechanical rather than aspirational.

---

## Appendix — What this spec does not cover

`npm run build` was never run during the audit. Playwright was never run (no browser in the audit
environment) — all e2e counts are source-derived. Charter §2.3's Three-Zone rule was not checked against
the maps. No coverage instrumentation was run; the "18% of the codebase carries 100% of the test weight"
figure is LOC-of-tested-modules. Nobody has verified the deployed Pages build on a real iPad.

Baseline at spec time: **204 unit tests / 14 files, `tsc --noEmit` exit 0** — measured on `3e0abfa`,
which is **8 commits behind** `origin/main`. W0-01 re-measures. Every count in this document is
pre-pull and should be treated as approximate until it does.
