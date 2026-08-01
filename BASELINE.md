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

### Gate now has four steps
```
npm run typecheck && npm run test && npm run lint
bash scripts/check-sprite-alpha.sh      # sprite alpha export rule (CI: asset-size.yml)
```
`scripts/check_sprite_alpha.py` is a stricter pixel-level diagnostic (corners
truly transparent, no semi-opaque wash). **Not wired to CI** — it currently fails
on shipped button art, which is a pre-existing issue nobody has decided about.
