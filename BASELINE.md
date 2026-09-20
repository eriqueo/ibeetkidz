# iBeetKidz baseline

Measured 2026-09-19 for the playback and graphics resource repair. This file owns
current measurements; earlier release baselines remain in Git history. The
[improvement roadmap](design/IMPROVEMENT_ROADMAP.md) owns next steps.

## Environment and limits

- Local source: this release worktree, based on `0b747c82d81f64f34b29e5858b4033aff6985945`.
- Node: 22.22.2; npm with the committed lockfile.
- Browser: system Chromium on hwc-server, headless WebGL through SwiftShader.
- Image tools: `uv run --with-requirements scripts/requirements-ui-atlas.txt`.
- Local Playwright uses an external config selecting system Chromium. Its server
  working directories and artifact fixture path point to this repository.
- Physical iPad, Eric's exact affected song/browser, and ten-minute thermal
  behavior remain unverified. Software-renderer results are not iPad results.
- This file records local evidence. Deployment is subject to the exact commit's
  GitHub Actions release gate and a live browser check.

## Resource measurements

| Resource | Before repair | Current |
|---|---:|---:|
| WebGL backing buffer | 2560 × 1440 | 1280 × 720 |
| Layout coordinates | 2560 × 1440 | unchanged |
| UI atlas decoded RGBA | 243,236,864 bytes | 79,650,712 bytes |
| UI atlas PNG payload | 3,877,979 bytes | 2,194,239 bytes |
| UI frames / pages | 114 / 4 | 114 / 5 |

Decoded bytes are width × height × four, including atlas padding. They are not
measured total GPU allocation. Framebuffers, drivers and other textures add cost.
Buttons and icons remain at original resolution. Larger artwork is reduced;
transparent padding is trimmed without changing logical sprite bounds. The
budget is enforced by `scripts/ui-atlas-policy.json`, the generator, and a unit
check of the shipped PNG dimensions.

An isolated full/half/full buffer experiment on the same idle Track measured
mean frame intervals of **96.54 / 25.74 / 101.84 ms**. Canvas and renderer dimensions
both changed; logical dimensions remained fixed. This supports the pixel-budget
change but is not a device-wide frame-rate guarantee. The earlier viewport-only
experiment did not change the backing buffer and is not used as release proof.

Before repair, a visible Intel Arc preview of the earlier live build averaged
16.69 ms for one car and 16.70 ms for three repeated drum cars, with no observed
late audio events in eight-second samples. That fixture did not reproduce the
reported laptop symptom. Do not compare its hardware numbers directly to the
local software renderer.

With the final artwork loaded, three repeated drum cars on the same software
renderer averaged **27.50 and 27.57 ms** per frame, versus **113.2 and 121.4 ms**
before repair. Resident texture dimensions imply 112.48 MiB of decoded RGBA.
Both five-second samples had audible master output and no counted late audio
events. These short stress samples establish a graphics improvement, not proof
that every song or physical device is smooth.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 679 tests in 44 files passed; none skipped.
- `npm run lint`: passed.
- `npm run build`: both root and Pages artifacts passed, including notices,
  editor exclusion and PWA precache checks.
- UI/train atlas freshness, AR-069 alpha, Workshop car geometry: passed.
- New engine regressions first failed against the old behavior: redundant
  rescheduling, repeated preparation, and undo during preparation. They now pass.
- The new real-browser resource assertion first failed on the old actual canvas
  size, then passed across scene changes, revisits and tablet-size resizing.
- Full local browser run: 70 passed, one opt-in stress test skipped, and two
  artifact-path failures in the external test harness. After correcting that
  harness path, both artifact checks passed on rerun. All 72 enabled journeys
  passed, including production Track, recording, offline and staged updates.
- The hosted run exposed a timing assumption in the oval coupling test. It read
  positions two frames after changing bars, while a car could still be hopping.
  Local reproduction failed twice in three runs. The test now waits for the
  actual hop to end, with a deadline; all spacing thresholds remain unchanged.

| Built artifact | Files | Bytes |
|---|---:|---:|
| `dist/` | 112 | 20,469,303 |
| `dist-gh/` | 112 | 20,470,213 |

The image checker regenerates into a temporary directory and compares JSON and
decoded PNG pixels. Regeneration uses the pinned Python requirements:

```sh
uv run --with-requirements scripts/requirements-ui-atlas.txt python scripts/build_ui_atlas.py
uv run --with-requirements scripts/requirements-ui-atlas.txt bash scripts/check-ui-atlas-fresh.sh
```

Normal release checks remain `npm run typecheck`, `npm test`, `npm run lint`,
`npm run build`, and the affected browser journeys. Pin all three Playwright
ports when another project may already own the defaults:

```sh
PW_PORT=5198 PW_PWA_PORT=4197 PW_PWA_UPDATE_PORT=4198 npm run test:e2e
```

## Retained provenance constraints

- The accepted AR-060F/AR-060T runtime PNGs remain intact. The original flatcar
  helper input is still covered by the handoff in `ART_REQUESTS.md`.
- Signal, smoke and tarp atlas regeneration provenance is still incomplete.
  Preserve those load-bearing outputs until source ownership is resolved.
- The shared-game design remains intentional; see
  `design/PERF_SINGLE_PHASER_GAME.md`. Smaller runtime assets must not reintroduce
  a new game/context on each navigation.
