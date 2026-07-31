# BASELINE

Ground truth measured by ticket **T0**. Tickets compare against this file; only T0 and a
subsequent explicit re-baseline may edit it. Never edit `WORK_ORDERS_v2.md` to carry state.

Measured on branch `t0-ground-truth`, immediately after fast-forwarding `main` to `origin/main`
and removing `pnpm-lock.yaml` / `pnpm-workspace.yaml`.

## Commit

| Fact | Value |
|---|---|
| Baseline commit (`origin/main` tip at measurement) | `3b7732b73f3ca7bf0ce84c19cbfebc6d199e6e60` (`3b7732b`) |
| Commit subject | `art: AR-015 loco — 16-dir × 2-frame refs (32 files)` |
| Branch measured on | `t0-ground-truth` (branched from that commit) |

## Gate

`npm run typecheck && npm run test` — **green**, run in this session.

| Fact | Value |
|---|---|
| Unit tests passing | **209** |
| Unit test files | **15** (`tests/unit/*.test.ts`) |
| Typecheck (`tsc --noEmit`) | clean, no output |

## File counts

"File count" recorded under both readings so no downstream ticket has to guess:

| Fact | Value |
|---|---|
| Tracked files, whole repo (`git ls-files`) | **550** |
| Tracked files under `src/` + `tests/` | **459** |
| Unit test files | **15** |
| E2E spec files | **2** (`tests/e2e/*.spec.ts`) |
| `.git` size | 987 MB |
| `src/assets` size | 549 MB |

## Environment probe (T0 step 5)

Both capabilities were exercised, not assumed.

| Capability | Result | Evidence |
|---|---|---|
| Run `npm run test:e2e` (browser present) | **YES** | `PW_PORT=5399 npx playwright test` → **7 passed** in 53.7s. Playwright 1.61.0; `~/.cache/ms-playwright` has chromium, firefox, webkit. |
| Reach GitHub Actions (`gh` auth) | **YES** | `gh auth status` → logged in as `eriqueo`, active; token scopes include `repo` and `workflow` (enough to push a branch and read/dispatch workflow runs). |

**E2E count differs local vs CI — do not treat 7 as the CI number.** Two specs are
`test.skip`ped when `process.env.CI` is set, by design (hardware-audio proofs, unreliable on
shared runners):

- `tests/e2e/audio-output.spec.ts:33`
- `tests/e2e/v2-flow.spec.ts:117`

So: **7 specs locally, 5 in CI.** A ticket asserting an e2e count must say which.

**Always pin the port:** `PW_PORT=<free>`. `playwright.config.ts:27` sets
`reuseExistingServer: !process.env.CI && !process.env.PW_PORT` — unpinned, a stray Vite on 5173
(e.g. the kidpix dev server) is silently reused and the whole suite tests the wrong app.

## Consequences for the AGENT / ERIC split

Because both probes came back YES, these `WORK_ORDERS_v2.md` fallbacks are **not** needed:

- **S1** — the `gh` fallback ("ERIC, if not") does not apply; S1 must push a deliberately-failing
  branch and cite the run ID. Section E item 5 is void.
- **S7** — e2e mic specs are runnable here; that criterion is AGENT, not ERIC.
- **S8** — the built-artifact spec can be authored and run locally before it reaches CI.

Genuinely-manual items (real iPad, real device saves, devtools, palette judgement) stay ERIC:
Section E items 1–4 stand.

## Note for S1's owner — esbuild postinstall

`npm ci` in this environment emitted:

```
npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn allow-scripts   esbuild@0.25.12 (postinstall: node install.js)
```

Nothing failed locally — typecheck, unit, and e2e all ran green — because a usable esbuild binary
was already present. That is not proof CI is fine. esbuild's `postinstall` is what fetches its
platform binary; if the runner's npm blocks install scripts the same way, `vite build` fails at
*deploy* time, not test time — which is precisely the gap S1 exists to close.

**S1 must verify, not assume:** confirm the deploy job's `npm ci` either runs esbuild's postinstall
or that the build succeeds without it. Check the job log for the same `allow-scripts` warning. If
CI does block it, that is a second bug — write it down for Eric, do not bundle a fix into S1.
