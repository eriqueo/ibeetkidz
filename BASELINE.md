# iBeetKidz baseline

Measured 2026-09-19 for the art-preserving playback and graphics repair. This file owns
current measurements; earlier release baselines remain in Git history. The
[improvement roadmap](design/IMPROVEMENT_ROADMAP.md) owns next steps.

## Environment and limits

- Local source: this release worktree, based on `e5fcd11`.
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
| WebGL backing buffer | fixed 2560 × 1440 | display CSS × pixel density, capped at 2560 × 1440 |
| Layout coordinates | 2560 × 1440 | unchanged |
| UI atlas decoded RGBA | 243,236,864 bytes | 142,139,276 bytes |
| UI atlas PNG payload | 3,877,979 bytes | 24,075,407 bytes |
| UI frames / pages | 114 / 4 | 114 / 3 |

Decoded bytes are width × height × four, including atlas padding. They are not
measured total GPU allocation. Framebuffers, drivers and other textures add cost.
All 114 frames retain source resolution and visible post-wash RGBA pixels.
Transparent padding is trimmed without changing logical sprite bounds. The
135.55 MiB decoded footprint is 41.6% below the original; its policy ceiling is
160 MiB. Rich controls and removing lossy palette quantization increase download
size. The largest page is 14.34 MiB; the offline per-file ceiling is 16 MiB and
the build checks that every runtime asset enters the precache.

The intermediate fixed-720p/half-size-art repair used 75.96 MiB, but Eric rejected
its visual quality. It is not the accepted baseline. The current source-hash gate
pins all 19 rich controls from `c39e14e`; the pixel gate rejects visible color or
resolution loss. Both gates were observed rejecting violations this session.

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

With the intermediate, reduced artwork loaded, three repeated drum cars on the same software
renderer averaged **27.50 and 27.57 ms** per frame, versus **113.2 and 121.4 ms**
before repair. Resident texture dimensions imply 112.48 MiB of decoded RGBA.
Both five-second samples had audible master output and no counted late audio
events. These short stress samples establish a graphics improvement, not proof
that every song or physical device is smooth.

After restoring rich controls and full-resolution, full-color atlas frames, the
same three-car fixture averaged **27.19 and 26.47 ms** per frame. This used the
same headless SwiftShader renderer, 1280×800 viewport and density 1 (1280×720
drawing buffer). Both five-second samples produced master output, with zero
counted late audio events and no browser errors. Resident texture dimensions
imply 172.07 MiB decoded RGBA. Thus this display retains the earlier speed gain
without the rejected art reduction. Larger/denser displays intentionally render
more pixels; these measurements do not establish their performance.

## Audio resource measurements

Measured 2026-09-19 on the audio resource slice. Fixture: one car of six lanes —
16th-note drums, an effected beat-snapped recording (fake mic), piano triads on
every 16th through an echo chain, bells, a lead with a bend, a roll and a long
note, and a Voice Keys sampler lane. 120 BPM, headless SwiftShader Chromium.
`getAudioDiag()` now reports these counts; read them with `?audiodiag`.

| Ride | Scheduled note events | Melody voices before | Melody voices now |
|---|---:|---:|---:|
| 1 car | 63 | 63 | 60 |
| 3 cars, same car repeated | 189 | 189 | 63 |
| 3 distinct (duplicated) cars | 189 | 189 | 63 |

"Before" is exact by construction: the old scheduler built one instrument per
note event. A voice is now reused only when it is silent for the next note's
whole span — held length plus release tail, doubled for the fastest terrain — so
chords, bends, rolls and tails keep their own voices and nothing is stolen. One
bar of dense piano barely shares (each tail outlasts the bar); the saving is
across bars, so the count follows the densest bar instead of the train length.
Counts held steady through 12 tempo edits, six stop/start cycles and a further
steady ride (they move with tempo, because spans are in seconds: 118 at 145 BPM
with one copy's echo changed). In the same four-second window after pressing
Ride, the three-car fixture fired 149 scheduled events against 60 before: the
old build spent that time constructing instruments.

Not improved: tempo edits while riding still rebuild the whole schedule, and
both builds counted late events there (worst 243 ms now, 101 ms before, on a
software renderer; samples too small to rank). Sample players are still one per
scheduled hit (60 for this fixture). Neither is measured on Eric's laptop or an
iPad.

Disposable derived audio — effect bakes, beat-snapped loops, prepared schedule
buffers, trimmed sampler copies and synthesized drums — now lives in
least-recently-used caches capped at 24 MiB each (`DERIVED_CACHE_BYTES`, a
guideline pending device evidence). Twelve tempos took the loop cache to 12
entries / 4.6 MiB, far under the cap; eviction itself is covered by unit tests,
not by this fixture. Recordings and built-ins are never in these caches.

The same run exposed a wrong-sound bug: `duplicateCar` copies lanes with their
ids, and the adapter shared one effect chain per lane id, so a copy with its
echo/tone/crunch/wobble changed played through the original's chain on a ride.
The chain key now includes those settings (observed: 1 → 2 effect nodes).

## Field evidence: the reported lag (2026-09-20)

`?perf` mounts a recorder (frame pacing, Phaser update/render split, long
tasks, audio scheduler counters; COPY/SAVE, no network). Eric's report from the
affected laptop — Chrome 150, Intel Arc (MTL), 2532×1425 canvas at density 1, a
three-car song with 27 layers and 27 recordings:

- Steady state was healthy: 165 fps, 6.1 ms frames, update 0.2 ms, render
  0.4 ms, zero late audio. **Rendering was not the lag.**
- Every spike was a main-thread long task of 156–238 ms landing on a schedule
  rebuild (Ride, mute/tarp, audible edit), with 4 late audio events behind them
  and the lookahead already ratcheted to 0.2 s. A CPU profile put the time in
  Tone node construction: each rebuild disposed and rebuilt ~90 instruments and
  players. They are now silenced, disconnected and banked (96 voices / 128
  players; past that a cleared one is disposed). Same dense three-car fixture,
  eight reschedules, SwiftShader: **one 58 ms long task, against nine of
  113–168 ms**. Not yet re-measured on Eric's laptop.
- Entering the Track cost one 1.84 s long task: `texImage2D` for the three
  lossless UI atlas pages, once per session at first use (1.07 s locally). It
  cannot be removed without shrinking the art. `MapScene.warmUiAtlas` moves it
  to the Map, in the background; locally the first Track entry dropped from
  1046+239 ms of long tasks to 248 ms. The upload still blocks ~1 s on the Map.
- The same session exposed a stale-install fault: fixed-name files under
  `assets/` were precached with no revision, so installed apps never received a
  repacked atlas and drew fallback rectangles. Fixed and enforced in `check:pwa`.

### Second report (2026-09-21): the lag that frame timing cannot see

Same laptop and song, on the recycling build. The rebuild freezes were gone: a
tarp and its removal cost 24 and 18 ms frames, no long task, zero late audio,
and every other second held 165 fps at 6.1 ms. Eric still saw "super laggy".

The train's position was read straight off `AudioContext.currentTime`, which
does not advance continuously: on Linux Chrome at 48 kHz it holds, then jumps
42.67 ms (2048 frames). Measured in system Chromium: 148 of 240 frames saw no
change at 60 Hz; at 165 Hz that is roughly six frames in seven. The world moved
about 23 times a second however fast it was drawn. `SmoothClock`
(`src/adapters/smooth-clock.ts`) rebuilds the clock as wall time plus a slowly
filtered offset, at the mean of the sawtooth so sync is unchanged, and the
Track draws from `getTransportBars()`. Drawn position per frame on one ride,
before → now: **104 of 299 frames still → 0**, smallest move 0 → 0.85× the
mean. Audio scheduling does not use it. The recorder now reports `stillFrames`
and `motionUneven`, because its first version could not see this at all.
Not yet confirmed on Eric's laptop. Still open from this report: one 1.76 s
long task on the Map (the atlas upload) and 232 ms on the first Ride.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 705 tests in 47 files passed; none skipped.
- `npm run lint`: passed.
- `npm run build`: both root and Pages artifacts passed, including notices,
  editor exclusion and PWA precache checks.
- UI atlas regeneration/pixel fidelity and AR-069 source identity/alpha: passed.
- New engine regressions first failed against the old behavior: redundant
  rescheduling, repeated preparation, and undo during preparation. They now pass.
- Display-density assertions first rejected the fixed 720p buffer. The resize
  journey also exposed stale parent bounds after returning from Track. Measuring
  the parent before FIT and observing the host resolved it. Both density 1 and 2
  journeys now pass through all scenes, real landmark clicks, resize and revisit.
- Actual Workshop and three-car Track screenshots inspected at 1920×1080 density
  1 and 1024×768 density 2 (2048×1152 drawing buffer). Rich controls and original
  character/panel detail are present.
- Full local browser suite: 73 passed, one opt-in audio stress check skipped.
  This includes production screenshots, real controls, recording, export,
  offline boot, staged updates and restored-art display-density checks.
- The hosted run exposed a timing assumption in the oval coupling test. It read
  positions two frames after changing bars, while a car could still be hopping.
  Local reproduction failed twice in three runs. The test now waits for the
  actual hop to end, with a deadline; all spacing thresholds remain unchanged.

| Built artifact | Files | Bytes |
|---|---:|---:|
| `dist/` | 110 | 42,353,955 |
| `dist-gh/` | 110 | 42,354,865 |

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
