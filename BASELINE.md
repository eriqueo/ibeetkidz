# iBeetKidz baseline

This is the current measured repository baseline. Historical re-baselines and
session narratives belong in Git history; durable architecture rationale belongs
in `design/HISTORY.md`. Do not copy these counts into another living document.

## Measurement

- Date: 2026-08-31
- Commit: the commit containing this file
- Node: 24.18.0
- Package manager: npm with the committed `package-lock.json`
- Browser: Playwright Chromium 1228
- Gate environment: clean archive of the measured commit; unrelated concurrent
  work in the primary checkout was excluded

All counts below come from commands run during this re-baseline. They are not
estimates derived from old documentation.

## Required gate

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0; no TypeScript diagnostics |
| `npm test` | 43 files passed; 660 tests passed; 0 skipped |
| `npm run lint` | exit 0; no ESLint diagnostics |
| `npm run build` | exit 0; both deploy artifacts generated and checked |
| `npm run check:no-editor` | exit 0; no editor code in either build |
| `npm run check:pwa` | exit 0; both artifacts installable and fully precached |
| `PW_PORT=5174 npm run test:e2e` | 70 passed; 1 opt-in stress test skipped; 0 failed |

The full local E2E run has 71 tests. `audio-stress.spec.ts` remains opt-in. Some
hardware-audio blocks also skip under CI, so do not infer a CI count from the
local result; inspect the actual workflow run.

### Playwright ports

`PW_PORT` controls the development server only. Playwright also starts PWA
servers on 4173 and 4183. If another run owns those ports, that is an environment
collision before application tests, not an application failure. Isolate all
three without changing product behavior:

```sh
PW_PORT=5174 PW_PWA_PORT=4273 PW_PWA_UPDATE_PORT=4283 npm run test:e2e
```

The audio-output decision point is load-sensitive on this machine. Reproduce an
isolated failure before attributing it to application code. Tunnel transition
assertions compare geometry captured in the same Phaser render frame and use the
15-second traversal bound established by the surrounding acceptance tests.

## Repository and build inventory

| Fact | Measured value |
|---|---:|
| Tracked files | 526 |
| Tracked snapshot bytes | 81,791,656 |
| Tracked files under `src/` + `tests/` | 408 |
| `src/assets/` tracked bytes | 39,045,309 |
| `dist/` | 112 files; 23,145,669 bytes |
| `dist-gh/` | 112 files; 23,146,589 bytes |
| UI atlas | 114 frames; 5,317,982 encoded bytes; 237,633,536 decoded RGBA bytes |
| E2E spec files | 19 |

Each service worker contains 114 manifest entries and 110 unique URLs. Four PWA
icons are emitted twice by the plugin's manifest/glob paths; this is known
optional configuration churn, not duplicated payload on disk. Unique precached
payload is 23,123,100 bytes for `dist/` and 23,124,020 bytes for `dist-gh/`.
`THIRD_PARTY_NOTICES.txt` is present and precached. No precache URL contains
`editor`.

The 96 retired AR-015 references remain available locally under ignored
`art/ar015/`, and 39 raw train references remain under ignored
`art/train-refs/`; neither directory is a build input. Git history was not
rewritten, so `.git` remains approximately 1.40 GiB.

## Generated and legal artifacts

- `THIRD_PARTY_NOTICES.txt` and `public/THIRD_PARTY_NOTICES.txt` are generated
  from the lockfile, installed package licenses, explicit generated-runtime
  packages, and `legal/third-party-assets.json`. `check:pwa` compares the
  declared Workbox package set with the modules in each emitted runtime:

  ```sh
  npm run generate:notices
  npm run check:notices
  ```

- `public/assets/spritesheets/ui-atlas*` is generated from
  `src/assets/sprites/{buttons,instruments,panels,icons}`. The checker compares
  deterministic JSON plus PNG dimensions, color model, and decoded pixels in a
  temporary directory:

  ```sh
  bash scripts/check-ui-atlas-fresh.sh
  ```

  If Pillow is unavailable in the host Python:

  ```sh
  nix-shell -p 'python3.withPackages (ps: [ ps.pillow ])' \
    --run 'bash scripts/check-ui-atlas-fresh.sh'
  ```

- `public/assets/spritesheets/train.{png,json}` is generated from the 40
  accepted RGBA cells and manifest under `src/assets/sprites/train-atlas/`.
  Ignored `art/train-refs/` files are historical references, not build inputs.
  The release workflow checks deterministic JSON plus PNG dimensions, color
  model, and decoded pixels:

  ```sh
  python3 scripts/build_train_atlas.py
  npm run check:train-atlas
  ```

  If Pillow is unavailable in the host Python, use the same pinned Nix shell as
  the UI-atlas check:

  ```sh
  nix-shell -p 'python3.withPackages (ps: [ ps.pillow ])' \
    --run 'npm run check:train-atlas'
  ```

## Known open findings

- `npm run check:workshop-car-art` is intentionally red: three shipped Workshop
  layers exactly match active rejected fingerprints in `ART_REQUESTS.md`.
  Replacement art and assembled-scene acceptance are required before wiring
  this checker into the release gate.
- Signal, smoke, and tarp atlases still lack complete tracked regeneration
  provenance. Preserve these load-bearing outputs until their source-of-truth
  decisions are made.
- Full `npm audit` reports three high-severity findings in development-only
  transitive tooling; `npm audit --omit=dev` reports zero production findings.
- No physical iPad/Android install, microphone, offline-update, or audio-device
  acceptance was performed during this baseline. No deployment was performed.
