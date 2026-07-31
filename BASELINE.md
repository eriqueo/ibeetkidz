# BASELINE

Ground truth for this repo. Tickets compare against this file; only an explicit **re-baseline**
may edit it. Never edit a work-order or `CLAUDE.md` to carry these numbers — this file is the
**single producer** of that fact, and `CLAUDE.md` + `PROJECT_CHARTER.md` now point here.

**Re-baselined 2026-07-31** at the end of the work-order swarm round (originally measured by
ticket T0 at commit `3b7732b`, 209 unit / 15 files).

## Commit

| Fact | Value |
|---|---|
| Baseline commit | `29c3e41f54e55886fc88a458ede8da224d4d2ecd` (`29c3e41`) |
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
| Unit tests passing | **296** |
| Unit test files | **20** (`tests/unit/*.test.ts`) |
| Unit tests skipped | **0** |

## E2E — measured, not inferred

`playwright test --list` reports 9 either way, because **runtime `test.skip` is not visible to
`--list`**. These numbers come from actual runs at this commit:

| Run | Result |
|---|---|
| Local (`PW_PORT=<free> npx playwright test`) | **9 passed** |
| CI (`CI=1`) | **7 passed, 2 skipped** |
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
| Tracked files, whole repo (`git ls-files`) | **430** | 550 |
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
