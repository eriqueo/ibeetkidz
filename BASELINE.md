# BASELINE

Ground truth for this repo. Tickets compare against this file; only an explicit **re-baseline**
may edit it. Never edit a work-order or `CLAUDE.md` to carry these numbers — this file is the
**single producer** of that fact, and `CLAUDE.md` + `PROJECT_CHARTER.md` now point here.

**Re-baselined 2026-08-01** (previously 2026-07-31) at the end of the work-order swarm round (originally measured by
ticket T0 at commit `3b7732b`, 209 unit / 15 files).

## Commit

| Fact | Value |
|---|---|
| Baseline commit | see `git log` — re-baselined at the end of the 2026-08-01 session |
| Commit subject | `Merge pull request #18 from eriqueo/d2-charter-sync` |

## Gate — all four run at this commit

```
npm run typecheck   → tsc --noEmit, clean, exit 0
npm run lint        → eslint ., no output, exit 0
npm run test        → Test Files 20 passed (20) / Tests 296 passed (296), 0 skipped
npm run build       → dist/ + dist-gh/ emitted
```

| Fact | Value |
|---|---|
| Unit tests passing | **352** |
| Unit test files | **22** (`tests/unit/*.test.ts`) |
| Unit tests skipped | **0** |

## E2E — measured, not inferred

`playwright test --list` reports 9 either way, because **runtime `test.skip` is not visible to
`--list`**. These numbers come from actual runs at this commit:

| Run | Result |
|---|---|
| Local (`PW_PORT=<free> npx playwright test`) | **10 passed** |
| CI (`CI=1`) | **8 passed, 2 skipped** |
| E2E spec files | **3** (`tests/e2e/*.spec.ts`) |

The two runtime skips are **deliberate hardware-audio proofs**, unreliable on shared runners:
`tests/e2e/audio-output.spec.ts` and the last block of `tests/e2e/v2-flow.spec.ts`. Cited by
**file, not line number** — line anchors in docs are exactly what goes stale.

**Always say which number you mean.** A bare e2e count is wrong by construction.

### Two traps that cost real time this round

1. **`npm run build:gh` before running e2e directly.** `tests/e2e/built-artifact.spec.ts` asserts
   against the built `dist-gh/`. `npm run test:e2e` builds first; `npx playwright test` does
   **not**. Running Playwright directly against a stale artifact produces a confident, wrong red —
   it happened twice while measuring this baseline.
2. **Those two audio specs are genuinely flaky locally under load.** Five separate agents saw one
   fail in a full run and pass when re-run alone. A red there is not a regression until it has been
   re-run in isolation.

**Always pin the port:** `PW_PORT=<free>`. `playwright.config.ts` sets
`reuseExistingServer: !process.env.CI && !process.env.PW_PORT` — unpinned, a stray Vite on 5173
(e.g. the kidpix dev server) is silently reused and the whole suite tests the wrong app.

## File counts

Recorded under both readings so no ticket has to guess:

| Fact | Value | vs T0 |
|---|---|---|
| Tracked files, whole repo (`git ls-files`) | **489** | 550 |
| Tracked files under `src/` + `tests/` | **356** | 459 |
| `src/assets` size | **263 MB** | 549 MB |
| `.git` size | 988 MB | 987 MB |
| `art/` (gitignored, repo root) | 345 MB | — (did not exist) |

`art/` holds the art *inputs* (`references/`, `sprites-v2/`, `art_gen/`) that ticket M3 moved out
of git. It is **gitignored and not backed up by git** — 345 MB of working material that exists
only on disk. Every file in it was verified byte-identical to the git blobs it replaced before
those were removed, and no history rewrite was done, so the removed copies remain recoverable
from history.

`src/assets/spritesheets/ar015/` (32 loco reference PNGs) is **deliberately still tracked** — the
in-flight loco batch. Release it after the loco pass.

## Environment probe

| Capability | Result | Evidence |
|---|---|---|
| Run e2e (browser present) | **YES** | 9 passed locally at this commit; Playwright 1.61.0 |
| Reach GitHub Actions (`gh`) | **YES** | `gh auth status` → `eriqueo`, scopes incl. `repo`, `workflow` |
| Cross-engine projects (webkit/firefox) | **NO** | Host is missing `libgdk_pixbuf-2.0.so.0`, `libgio-2.0.so.0` — a NixOS limitation `playwright.config.ts` already anticipates. CI installs `--with-deps`, so it does not apply there. |

Because the first two are YES, the ERIC fallbacks in S1/S7/S8 did not apply and **Section E item 5
is void**. Genuinely-manual items (real iPad, real-device saves, devtools, palette) remain ERIC.

## esbuild postinstall — resolved

`npm ci` warns that esbuild's `postinstall` is not covered by `allowScripts`, locally and in CI.
**S1 verified with a real deploy log** (`gh run view 30658528214 --log`): the same warning appears
*and* `npm run build` succeeds — esbuild resolves its binary from per-platform
`optionalDependencies`, not the postinstall. **Nothing to fix.** Latent risk only if npm's default
hardens or esbuild changes resolution; the durable fix would be an explicit `allowScripts` entry
in `package.json`.

---

## Re-baseline — 2026-08-01, end of session

Measured after the play-test fix round, the art delivery, and the asset-weight work.

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **352** / 22 files, 0 skipped | 296 / 20 |
| E2E | **10 local, 8 + 2 skipped under CI** | 9 local / 7 CI |
| Tracked files | **489** | 430 |
| `dist-gh` | **13 MB** | 16.8 MB |
| ui-atlas | **3 pages, 71 frames, 46.1 Mpx (176 MB VRAM)** | 4 pages, 95 frames, 59.0 Mpx (225 MB) |

`src/assets` is 518 MB, still dominated by `spritesheets/ar015/` (the protected
loco batch) plus ~134 MB of loose `*-ref-*.png` that no code references — the
largest remaining art-in-git mass and a candidate for the same treatment `art/`
got.

**The mic e2e flake is fixed at the source.** `v2-flow.spec.ts`'s
`duration > 0.5` assertion sat mid-distribution for a value the recorder does not
guarantee (measured 0.12 / 0.24 / 0.3 / 0.48 / pass from a fixed 1500 ms hold) and
flaked for five sessions. It now asserts non-degenerate + non-silent, which is what
the test is actually for. **The "re-run it alone before concluding" guidance above
still applies to `audio-output.spec.ts`**, which remains load-sensitive.

---

## Re-baseline — 2026-08-01, single-Phaser-game landing

Only the unit counts moved; e2e, file counts and the environment probe above still hold.

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **359** / 23 files, 0 skipped | 352 / 22 |
| E2E | 10 local, 8 + 2 skipped under CI | unchanged |
| Peak resident texture memory | **253 MB** (union of all four scenes) | ~222 MB (largest single scene) |
| Full lap of the four spaces | **~1.23 s** | ~7.8 s |

The new file is `tests/unit/scene-switch.test.ts` (5 tests); `architecture.test.ts`
gained two guards (rule 7: every Phaser loader call needs a cache check) and is now 9. The lap timing and the
VRAM figures were measured with a scratch Playwright spec run against `main` and the
branch on the same machine — method and full tables in
`design/PERF_SINGLE_PHASER_GAME.md`.

---

## Re-baseline — 2026-08-01, visualizer re-homed into the Track

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **382** / 25 files, 0 skipped | 359 / 23 |
| E2E local | **11 passed** | 10 |
| E2E under `CI=1` | **8 passed, 3 skipped** | 8 + 2 |

Both numbers measured, not inferred. The **third** runtime skip is new:
`v2-flow.spec.ts`'s jumbotron test needs a real audio pipeline for the same
reason `audio-output.spec.ts` does, so it is gated to local runs. Cited by file,
not line.

New unit files: `tests/unit/spectrum.test.ts` (7) and
`tests/unit/scene-visualizer.test.ts` (12); `tiled-maps.test.ts` gained 4 guards
on the `viz-screen` placement.

---

## Re-baseline — 2026-08-01, undo made reachable

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **386** / 26 files, 0 skipped | 382 / 25 |
| E2E local | **13 passed** | 11 |
| E2E under `CI=1` | 10 passed, 3 skipped | 8 + 3 |

New: `tests/unit/undoable.test.ts` (4) plus two e2e specs covering the "put it
back" offer and its withdrawal. No new runtime skips.

---

## Re-baseline — 2026-08-01, "Surprise me" made reachable

| Fact | Value | Previous |
|---|---|---|
| Unit tests | 386 / 26 files, 0 skipped | unchanged |
| E2E local | **14 passed** | 13 |
| E2E under `CI=1` | **11 passed, 3 skipped** | 10 + 3 |

Third of the same kind this session (after the visualizer and undo): a feature
built, pure and unit-tested since v1, with nothing in the shipped UI able to
reach it. `generateBeat` now has its affordance in the Workshop's empty-car
prompt. The Workshop LCD also reads **SPEED**, matching the Track — it read
`TEMP`, a truncation of TEMPO that fit the chip but is not a word.

---

## Re-baseline — 2026-08-01, mic-denied covered

| Fact | Value | Previous |
|---|---|---|
| Unit tests | 386 / 26 files, 0 skipped | unchanged |
| E2E local | **15 passed** | 14 |
| E2E under `CI=1` | **12 passed, 3 skipped** | 11 + 3 |
| E2E spec files | **4** | 3 |

`tests/e2e/mic-denied.spec.ts` covers "mic-denied must leave the app fully
usable", a stated rule that had no test. **It does NOT skip on CI** — it needs
`getUserMedia` to FAIL, which is what a runner without a capture device does
anyway. It is the mirror of the two hardware-audio specs, not a fourth one.

It passed on its first run: the app already handled a denied mic correctly. The
value is that it cannot silently stop doing so.

---

## Re-baseline — 2026-08-01, deep tool-panel e2e (W5-04 closed)

| Fact | Value | Previous |
|---|---|---|
| Unit tests | 386 / 26 files, 0 skipped | unchanged |
| E2E local | **19 passed** | 15 |
| E2E under `CI=1` | **15 passed, 4 skipped** | 12 + 3 |
| E2E spec files | **5** | 4 |

`tests/e2e/tool-panels.spec.ts` closes the "rebuild deep per-tool e2e through
the Workshop tool-panel nav" follow-up. Until now the only assertion on any
panel was that it OPENS. Three of its four tests run on CI (Beat Maker, Melody
Editor, the open/close walk); the fourth is the **fourth** runtime skip — a pad
tap has no state outcome, so proving it works means proving samples reached the
master output, which needs real capture.

**Four runtime skips now**, all hardware-audio, all cited by file:
`audio-output.spec.ts`, the mic-record and jumbotron blocks of `v2-flow.spec.ts`,
and the pads/Magic-Pad block of `tool-panels.spec.ts`. `mic-denied.spec.ts` is
NOT one — it needs capture to fail, not to work.

---

## Re-baseline — 2026-08-01, compound actions are one undo step

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **392** / 26 files, 0 skipped | 386 / 26 |
| E2E local | **19 passed** | 19 |
| E2E under `CI=1` | 15 passed, 4 skipped | unchanged |

`dispatchAll` (core) + `store.dispatchAll` apply many commands as ONE history
entry. "Surprise me" used it first: undoing a surprise was ~15 taps and is now
one, and it earns the same "put it back" chip a deletion does.

**A note on the run:** in the full local suite `audio-output.spec.ts` went red
and passed on a re-run alone — exactly the load-sensitivity this file has warned
about since the first re-baseline. Recorded rather than quietly re-run, because
"19 passed" without that sentence would be a nicer number than the truth.

---

## Re-baseline — 2026-08-01, revisit-handshake bug found and fixed

| Fact | Value | Previous |
|---|---|---|
| Unit tests | 392 / 26 files, 0 skipped | unchanged |
| E2E local | **20 passed** | 19 |
| E2E under `CI=1` | **16 passed, 4 skipped** | 15 + 4 |
| E2E spec files | **6** | 5 |

`tests/e2e/revisit.spec.ts` — a view's `onSceneReady` must fire on EVERY visit.
The single-Phaser-game change shipped a bug where it fired only on the first:
a revisited scene finds every texture cached, so `preload` queues nothing and
`create()`/`announceReady()` run SYNCHRONOUSLY inside `showScene`, before the
subscription in `PhaserScene`'s separate `useEffect` existed.

**Why no existing test saw it:** the dev bridge's `getScene()` has its own
module-level subscription that never unsubscribes, so `waitForScene` kept passing
while the VIEW never got its callback. Anything asserting through the bridge was
blind to it by construction. The new spec asserts on per-view state that only
`onSceneReady` can establish.

Found by adversarially testing my own work rather than by the suite. Seeded:
reversing the two lines in `PhaserScene`'s layout effect fails it.

### Gate now has four steps
```
npm run typecheck && npm run test && npm run lint
bash scripts/check-sprite-alpha.sh      # sprite alpha export rule (CI: asset-size.yml)
```
`scripts/check_sprite_alpha.py` is a stricter pixel-level diagnostic (corners
truly transparent, no semi-opaque wash). **Not wired to CI** — it currently fails
on shipped button art, which is a pre-existing issue nobody has decided about.

---

## Re-baseline — 2026-08-01, Sound Pads given a state outcome

**Measured mid-swarm.** Other agents were editing this tree at the same time
(`tests/e2e/track-timing.spec.ts` and a throwaway `tests/e2e/_melody-probe.spec.ts`
were both present and passing during this run), so the TOTALS below are the
tree's, not one ticket's. The attributable delta is called out separately.

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **398** / 26 files, 0 skipped | 392 / 26 |
| E2E local, whole tree as found | **27 passed** | 20 |
| E2E spec files present | 7 + 1 throwaway probe | 6 |

**This ticket's delta:** +6 unit tests (`nextRecordingLabel` in
`project-state.test.ts`) and +2 e2e in `tool-panels.spec.ts`. **Both new e2e run
on CI** — verified directly (`CI=1 npx playwright test tests/e2e/tool-panels.spec.ts`
→ 8 passed, 1 skipped).

**The count of runtime skips is still FOUR.** The pads block of
`tool-panels.spec.ts` was skipped because "a pad tap has no state outcome"; a pad
tap now lands a lane, so the state half was extracted into two CI-safe tests and
the block kept its skip for the half that is still only audible (the sample and
the theremin reaching the master output). Un-skipping it wholesale would have
gone red on CI, since its own assertions are all `masterPeak > 0`.

`audio-output.spec.ts` passed in the full local run this time. The standing
"re-run it alone before calling a red a regression" guidance is unchanged.

---

## Re-baseline — 2026-08-01, one lane cap + a harness that can see a dead button

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **399** / 26 files, 0 skipped | 398 / 26 |
| E2E local | **29 passed** | 27 |
| E2E under `CI=1` | 25 passed, 4 skipped | 23 + 4 |
| E2E spec files | **8** | 7 |

Two fixes, both measured.

**`MAX_LAYERS` is 6, not 8, and `addLayer` refuses instead of evicting.** There
were TWO producers of "how many lanes a car holds" — `MAX_LAYERS` (8) in core and
`WORKSHOP_GRID_V2.maxLanes` (6) in the scene — and the gap between them was a
reachable illegal state: lanes 7 and 8 existed, were scheduled and AUDIBLE
(`scheduleLayers` walks `part.layers`, not the grid's sliced view), but had no row
and therefore no ✕. Past 8 the reducer stole the oldest lane outright, with no
warning and no undo offer (`addLayer` is not classified destructive). `maxLanes`
now derives from `MAX_LAYERS`; the reducer refuses at the cap and returns the SAME
state object, which the dispatch funnel already reads as "nothing happened". The
unit test that asserted eviction is replaced — it had encoded the data loss as
expected behaviour.

**`tests/e2e/chrome-reachable.spec.ts` (2 tests, both CI-safe)** closes the
harness gap this session measured: neutering `fire()` in `ui-scene.ts` — which
kills every Tiled-authored button and instrument in the Workshop, Yard and Track —
scored **20/20 passed** on the suite as it stood. Every other spec drives the app
by `emit()`ing on the EventBus rather than tapping, so it proves handlers work and
says nothing about whether any button reaches them. The new spec taps real screen
pixels via `page.mouse.click` and asserts real outcomes.

It also found that there are **TWO chrome pipelines**, not one:
`ui-scene.spawnUiLayer` (Workshop/Yard/Track, all through `fire()`) and
`TiledSceneAdapter.spawnTiledScene` (Map only), which carries its OWN duplicated
arm/press/emit block. That is why the original mutation left the Map working, and
why the earlier "all four scenes dead" claim was wrong — it was three of four, 31
of the 34 action-bearing spawns. The duplication is **not fixed** (it is a
refactor, not this fix) but the spec now walks both pipelines.

**Both seeded, each failing on its own assertion:** killing `ui-scene.fire()` →
"tapping the Workshop's YARD plaque did nothing"; killing
`TiledSceneAdapter`'s emit → "tapping the Map's WORKSHOP sign did nothing".

---

## Re-baseline — 2026-08-06, the train is a train

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **413** / 27 files, 0 skipped | 399 / 26 |
| E2E local | **30 passed** | 29 |
| E2E under `CI=1` | **26 passed, 4 skipped** | 25 + 4 |
| E2E spec files | 8 | 8 |

New unit file: `tests/unit/train-chain.test.ts` (14). `track-timing.spec.ts`
went from 2 tests to 3.

**Car spacing was a fraction of the lap.** `TrackScene.placeTrain` put car `i`
at `progress - i / carCount`, so the gap between cars changed when the song
gained a bar, and at four bars the cars sat a quarter-lap apart — four wagons
that had lost each other, and the top complaint on the play-test screenshot.
The loco, fourteen lines below, was already coupled with the correct model:
arc length over path length. `src/game/train-chain.ts` generalises that model
to the whole consist as pure arithmetic (`couplingOffsets`), with
`chainSqueeze` compressing proportionally rather than letting a consist longer
than the lap wrap onto its own loco.

**The bar readout moved off position and onto a highlight** — a lamp under the
sounding car plus a bounce on the bar change — because coupled position can no
longer encode which bar is sounding. Both are derived from the same `progress`
React feeds in, so PROJECT_CHARTER §2.5 is untouched; the charter now says
explicitly that WHICH visual carries the readout was never part of that
decision, since it has now been changed twice.

**Not `setTint`.** Tint is a multiply blend and the train atlas is dark brown;
a previous round measured every tint as indistinguishable. The lamp is a
separate `Ellipse` drawn at depth 3.5, under the train band. Its first pass was
also too faint — 0.19 effective alpha, measured on a real screenshot as barely
distinguishable from the painted grass — and was turned up to 0.55–0.90 with a
bright rim, re-checked on screenshots at two points on the oval.

**All three `track-timing` tests are seed-proven**, each against the model it
replaced: restoring `i / carCount` spacing reds the coupling test ("cars 0→1 at
t=0 are uncoupled"); pinning the sounding bar to 0 reds both the highlight test
and the never-lead test.

**The polyline-vs-spline question is CLOSED, measured.** The 64-vertex Tiled
polyline was suspected of making the 8-way sprite frame flip-flop at vertices.
Measured over the real `track-path` data: 8 direction-bucket transitions per
lap (one per compass direction, monotone), **zero** A→B→A flip-flops, max turn
between consecutive segments 15.6° against a 45° bucket. A `Curves.Spline`
would fix nothing and would re-open the `parkAngle = 0.25` calibration against
the painted plate. Not done, deliberately.

**One flaky CI run recorded rather than hidden:** the first `CI=1` full run had
`v2-flow.spec.ts`'s "surprise" and "Map guards Track" tests red; both passed
when that spec was re-run alone, and the next full `CI=1` run was clean at
26/4/0. Same load-sensitivity this file has warned about since the first
re-baseline, now seen on `v2-flow` rather than `audio-output`.
---

## Re-baseline — 2026-08-06, the Yard palette stopped hiding its own cars

Measured on its own branch, off `399 / 26` — so the "previous" column below is that
branch point, not the coupling entry above it. The merged total is re-measured in the
entry that follows.

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **430** / 28 files, 0 skipped | 399 / 26 |
| E2E local | **29 passed** | 29 |
| E2E spec files | 8 | unchanged |
| Tracked files | **512** | 489 |

E2E is unchanged on purpose: the layout retune moves every palette hit area, and
the suite did not notice — because every spec drives the Yard through the
EventBus and the Tiled chrome, and **nothing has ever asserted on a palette
car's position**. That is worth writing down rather than reporting as "no
regressions": the reason the palette could ship overlapping itself from day one
is the same reason the fix is invisible to the suite.

The two new unit files are where the guard actually lives:
`tests/unit/yard-layout.test.ts` (12) and `tests/unit/car-identity.test.ts` (19).

**Both seeded.** Reverting `carFitScale` to the width-only fit reds 4 of the 12;
restoring the old `carW`/`carH` reds 1; an oversized `carH` reds 3. The identity
guards are properties (12 cars ⇒ 12 liveries; no pair repeats both shape and
colour; every livery colour's glyph ink clears a luma gap against its own panel),
so they fail on a table edit rather than on a rendering change.

**Two seams moved to make this testable at all.** `src/game/car-geometry.ts` and
`src/game/yard-geometry.ts` are Phaser-free (`import type` only). A REAL
`import Phaser` cannot load under jsdom — it dies in `checkInverseAlpha` on a
null 2D context — so anything living inside a scene file is unreachable by the
unit suite by construction. The palette's slot arithmetic had been in
`YardScene.ts` for its whole life, which is a large part of why the bug survived
it.

---

## Re-baseline — 2026-08-06, Phase 0 merged: Yard identity + Track grounding

Both branches landed together. Numbers measured on the merged tree, not summed.

| Fact | Value | Previous (main) |
|---|---|---|
| Unit tests | **486** / 31 files, 0 skipped | 413 / 27 |
| E2E local | **32 passed**, 0 failed | 30 |
| E2E spec files | 8 | 8 |

**No flake this round.** `audio-output.spec.ts` passed inside the full run on the first
attempt, so the standing "re-run it alone before calling a red a regression" procedure was
not needed. Recorded because a clean run is worth as much evidence as a dirty one.

**The Track's real bug was not the one that was reported.** The ride path had been traced
onto the *inner edge* of the painted oval, not the centreline — 70 px above the rails at
the bottom of the loop, 40 px below them at the top. Centre-anchoring hid that at the
bottom and exposed it at the top, which is exactly why it read as "not on the tracks on
the back side." Ground-contact anchoring **alone would have made the near side worse**.
`scripts/trace-track-path.py` re-traces from the plate and is re-runnable.

Perspective constants were separately wrong by ~4×: the plate measures **3.7 : 1** by tie
pitch (24.3 px far, 90.0 px near) against an authored `farScale 0.9 / nearScale 1.06` =
1.18 : 1. Now 0.25 → 1.10, calibrated by compositing a car at both extremes until its
wheels sat on the rails. **Measure this with tie pitch, never rail gauge** — gauge is
foreshortened by camera tilt as well as depth and reads a misleading ~7 : 1.
`depthScaleAt` early-returns a constant when the two props are equal, so it collapses to
nothing when the plate is redrawn; the calibration is **interim by design**.

**`spawnSmoke` is now dead.** `rg` over `src/` and `tests/` finds only its definition at
`src/game/sprite-assets.ts:143`. Kept deliberately — the Yard and Workshop register zero
animations today and that pass will want it.

### Known-open, found by audit during this merge

- **Yard tarp is now anisotropic** (`YardScene` tarp sizing): a square 128 px texture sized
  `117×97` gives scaleX 0.96 / scaleY 0.796. New on the Yard branch, not pre-existing.
- **Yard car scale went from a 2.2× upscale to a 0.956× minification.** The overlap bug is
  genuinely fixed, but downscaling 128 px art is destructive; neither value is an integer.
- **Yard cars sit on the rail midpoint, not the near railhead** — ~16 px high. The painted
  near railheads are at 0.5278 / 0.6208 / 0.7111 / 0.7986; config uses the midpoints.
- **The crane animation happens ~1000 px from the painted crane.** The gantry occupies
  x ≈ 1250–1930; the pickup tween runs x ≈ 294 → 576.
- **Workshop `car-anchor` puts wheels on neither rail** (plate y 1080 vs near railhead 1152,
  far railhead 1044), and its "all four car sprites share one wheel baseline" claim is false
  — measured opaque bottoms differ by up to 70 px.
- **`car-side-flatcar.png` is 60.5% semi-transparent** (alpha ≈38/255), so selecting a
  flatcar hazes the whole scene.
- **No `roundPixels`** in the Phaser config; **only two registered animations game-wide**
  (`smoke`, `signal-flash`), both consumed by the Track alone.

Full audit with `file:line` for every item is in the Phase 3 scope of
`~/.claude/plans/hidden-riding-truffle.md`.

---

## Re-baseline — 2026-08-07, terrain: Phase 1 audio spike landed

| Fact | Value | Previous |
|---|---|---|
| Unit tests | **507** / 32 files, 0 skipped | 486 / 31 |
| E2E local | **36 passed**, 0 failed | 32 |
| E2E under `CI=1` | 32 passed, 4 skipped (unchanged skips) | 28 + 4 |
| E2E spec files | **9** | 8 |
| Tracked files | **521** | 512 |

New: `tests/unit/terrain.test.ts` (14), `tests/e2e/terrain.spec.ts` (4, **none
skipped** — they assert on the live transport, not on audible output, so they run
on CI), plus 2 new guards in `architecture.test.ts` (now 11) and 5 in
`audio-engine.test.ts`.

**Test 0 passed, and it changed the design.** The plan's gating question was
whether a mid-song tempo change keeps the song in phase. Measured under Tone's
offline renderer in real Chromium (`spike/tempo-phase.ts`, re-runnable):

| Path | Result |
|---|---|
| Change bpm alone | **Phase-exact.** 0.5 s spacing → 1.0 s spacing, no beat dropped or doubled. Tone's timeline is in tempo-independent ticks. |
| `clearScheduled()` + reschedule, on a bar line | **Drops that bar's downbeat.** Gap 1.504 s where 1.0 s was due. |
| `clearScheduled()` + reschedule, just before a bar line | Clean, and the ~0.1 s wall-clock shift is musically correct — that is what slowing down means. |
| Baked 1-bar loop, tempo halved, untouched | Does not stretch: 5 s hole, then wrong internal spacing. |
| Same loop + `player.playbackRate = 0.5` | **Re-locks exactly**: internal clicks 1.0 s → 2.0 s, filling the new 4 s bar. |

So terrain deliberately does **not** go through `reconcile()`. That single finding
removes two risks the plan had budgeted for: no re-bake means **no reschedule cost
to measure** and **no new bake-cache entries**, so cache eviction is no longer a
prerequisite for this mechanic. `tempoScale` is kept separate from `tempoBpm` for
exactly that reason — the cache stays keyed on the base tempo and cannot grow.

Two guards encode the finding: `architecture.test.ts` rule 8 forbids the render
layer from scheduling terrain at all (PROJECT_CHARTER A4 — the train must never
drive the audio), and asserts terrain is scheduled in exactly three files.

**A regression this round, caught by the suite, worth recording.** The first
implementation put a `Tone.BitCrusher` on the master bus at boot. BitCrusher is an
**AudioWorklet** node, and `new AudioWorkletNode` throws outside a secure context —
so the page crashed on any plain-http origin. `built-artifact.spec.ts` serves the
build over `http://ibeetkidz.test/` and caught it; the deployed https sites would
not have. Rain now uses `Tone.Distortion` (a plain WaveShaper, no worklet), which
also settles the plan's open "crunch or a real distortion node?" question with
evidence rather than taste. The core field is named `grit`, not `crush`, so the
name stops implying bitcrush.

**Terrain is ephemeral by construction**: no `Command`, no reducer entry, no undo
history, no schema bump. Editing while riding ends the terrain, deliberately —
`clearScheduled()` calls `Tone.Transport.cancel()`, which would otherwise strand
the revert event and leave the song slowed forever.

`spike/` is a throwaway harness at the repo root, outside the `src/**` glob the
architecture guards scan — which is why it may import Tone directly.
