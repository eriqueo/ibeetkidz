# The lag: one Phaser game instead of one per view

**Status:** attempted 2026-08-01, **reverted**. Not blocked on effort — blocked on a
design decision that is Eric's, not an agent's. The findings below are the expensive
part and are why this note exists.

## The problem, measured

`PhaserGame.tsx` boots a game per mounted view and `destroy(true)`s it on unmount;
`Shell.tsx` swaps the whole component when `project.activeView` changes. So **every
navigation destroys the WebGL context and re-decodes and re-uploads every texture.**

A `Phaser.Game` owns one `TextureManager`, so one game per view means nothing is
shared. Current per-scene load:

| scene | textures | GPU |
|---|---|---|
| Workshop | interior plate + 4 car sprites + ui-atlas | ~230 MB |
| Yard / Track | plate + train atlases + ui-atlas | ~190 MB each |
| Map | plate + handcar | ~18 MB |

The ui-atlas alone (176 MB after the dead-frame purge) is loaded by **three** of the
four spaces, so it is paid again on every move between them.

## Why the obvious fix is not a small change

The shape is easy: boot one game, `scene.add()` each view's scene the first time it
mounts, `scene.start()` thereafter, and never destroy. `scene.start()` re-runs
init/preload/create, so views keep fresh state and only the GPU cache is shared.
Every scene already has a `static readonly KEY`, and `startGame` has exactly one
caller, so the seam is clean.

Two failures killed it, both real and both reproduced:

**1. Phaser boots asynchronously.** Before boot the `SceneManager` queues rather than
applies, so on the first mount `getScene(key)` answers null and `start()` silently does
nothing — blank canvas, no `current-scene-ready`, every e2e that waits for a scene times
out. Fix: defer the add/start to `Phaser.Core.Events.READY` when `!game.isBooted`. This
one is solved; it is written up here because it is non-obvious and cost a full cycle.

**2. The host element must be in the document before `startGame`.** The ScaleManager
measures its parent at boot; a detached node measures 0×0, after which `Scale.FIT` never
settles and **the whole page oscillates every frame**. The symptom is remote from the
cause: Playwright reports `element is not stable` and can never click the *boot button* —
a React element that has nothing to do with Phaser. Attaching before boot fixes that
specific oscillation.

**With both fixed, e2e still failed** (7 failures → 5). The remaining failure was not
diagnosed. It was reverted at that point rather than continuing to guess, because `main`
is green and a half-landed perf refactor that breaks navigation is worse than the lag.

## The decision this actually needs

Moving one host div between view containers keeps the ScaleManager's parent identity
stable, which is why that approach was chosen — but it fights the app's **pointer
layering**. Today each view's container sets `pointerEvents: "auto"` on a canvas that is
otherwise a `pointerEvents: "none"` backdrop under React overlays. A shared canvas has to
satisfy all four views' layering at once.

The alternative is to stop moving it: park the shared canvas **once** at the page level
(`position: fixed; inset: 0`) behind everything, and let views render only their
overlays above it. That is very likely the more robust design — it removes re-parenting
entirely — but it changes z-order and hit-testing semantics for every view, and that is
a product-visible call about how taps reach the canvas.

**Recommendation:** do the page-level canvas, as its own focused piece of work with the
e2e suite as the gate, and budget for the pointer-layering pass rather than treating it
as an afterthought. Do not attempt it opportunistically alongside other changes.

## Cheaper wins already taken

- 24 dead atlas frames deleted: **4 pages → 3, 225 → 176 MB** VRAM (`ca3596f`).
- AR-023 plate re-quantized to palette: **3287 KB → 422 KB**.
- Six unused scene backgrounds no longer bundled, three unseen car textures no longer
  preloaded (~44 MB), both from the remote play-test pass.

## Still available without the refactor

- ~~Lazy-load the three non-active car sprites.~~ **Already done** — `WorkshopScene.preload`
  loads only `DEFAULT_CAR_TYPE` and `showCar()` fetches a type on first use, with a
  `carType` re-check in the load callback so two quick swaps cannot race. Verified in
  the code, not assumed; this note previously listed it as available and was wrong.
- **Split the ui-atlas per scene.** Workshop chrome and Yard/Track chrome overlap far
  less than one shared atlas implies.
- **`transparent: true`** in the game config forces per-frame alpha compositing with the
  page for a canvas that is fully covered by its own background plate.
