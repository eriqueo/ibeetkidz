# The lag: one Phaser game instead of one per view

**Status: shipped.** Attempted and reverted 2026-08-01; landed the same day on the
second attempt. Measured on this machine, dev server, chromium: a full lap of the
four spaces went from **~7.8 s to ~1.23 s**, and revisiting a space went from
~1.7 s to ~0.2 s. Numbers and method below.

## The problem, measured

`PhaserGame.tsx` booted a game per mounted view and `destroy(true)`d it on
unmount; `Shell.tsx` swaps the whole component when `project.activeView` changes.
A `Phaser.Game` owns exactly one `TextureManager`, so **every navigation threw
away the WebGL context and re-decoded and re-uploaded every texture.** The packed
chrome atlas alone is ~176 MB of VRAM and three of the four spaces load it, so it
was paid again on every move between them.

## What shipped

- `src/game/game-host.ts` — owns the one `Phaser.Game`, created once into a host
  element and never destroyed.
- `src/game/scene-switch.ts` — the swap *policy* (`SceneSwitch`), driven through a
  four-method `SceneSwapper` port. Split out because the ordering rules are the
  whole refactor and none of them is reachable from a test that needs WebGL;
  `tests/unit/scene-switch.test.ts` asserts all of them against a fake.
- `src/components/GameCanvas.tsx` — the persistent host div, rendered by `Shell`
  **outside** the view swap.
- `src/components/PhaserScene.tsx` — renders nothing; claims the shared canvas for
  one scene while its view is mounted. Replaces `PhaserGame.tsx`, now deleted.

Views render only the HTML that floats above the canvas, wrapped in the shared
`VIEW_OVERLAY` style.

## The four things that break, and why they are not obvious

Three of these killed the first attempt. Each is now a named test in
`tests/unit/scene-switch.test.ts` or a guard in the code.

**1. Phaser boots asynchronously.** Before READY the `SceneManager` queues rather
than applies, so `start()` silently does nothing — blank canvas, no
`current-scene-ready`, every e2e that waits for a scene times out. `SceneSwitch`
holds intent until `markReady()`.

**2. The host element must be in the document before the game is constructed.**
The ScaleManager measures its parent at boot; a detached node measures 0×0, after
which `Scale.FIT` never settles and **the whole page oscillates every frame**. The
symptom is remote from the cause: Playwright reports `element is not stable` and
can never click the *boot button*, a React element with nothing to do with Phaser.
`GameCanvas` boots in a `useLayoutEffect`, so the div is laid out first.

**3. `remove()` does not fire SHUTDOWN — this was the undiagnosed third failure.**
`SceneManager.remove` calls `Systems.destroy`, which emits DESTROY and nulls its
plugin references, but never SHUTDOWN. SHUTDOWN is where every scene here drops
its EventBus subscriptions (`YardScene`, `WorkshopScene`, `BackgroundScene`'s
resize hook), so a bare `remove` leaves a dead instance answering the bus over a
torn-down display list. Always `stop()` then `remove()`.

**4. `load.atlas` is not idempotent, and fails *silently* on the second call.**
`loadUiAtlas` and `BackgroundScene.loadBackground` already guarded on
`textures.exists`; `loadSpriteAssets` (the four train atlases) did not. That was
harmless when each scene had its own TextureManager. Sharing one, re-entering the
Yard re-queues four atlases whose PNGs the loader skips as cache conflicts while
their JSONs are still fetched — so each Phaser `MultiFile` sits at 1-of-2 and
never reaches `addToCache`. It is now guarded, matching the existing dialect — and `architecture.test.ts`
rule 7 fails the build on any future unguarded loader call. That check was seeded
with this exact violation and confirmed to fail on it.

## Why remove-and-re-add rather than `scene.start()`

`SceneManager.start` on a live scene reuses the **same instance**, so every field
a scene set in `create` survives into the next visit — including
`BackgroundScene.ready`, which gates React's state pushes. Booting a game per view
used to guarantee a fresh instance on every mount; `stop → remove → add` keeps
that guarantee exactly, while the TextureManager — the thing actually worth
sharing — lives on. The cost is one object allocation per navigation.

## Pointer layering: the decision, resolved

The reverted attempt flagged this as a product call Eric had to make. Re-reading
the tree closed it without one: **all four views already set
`pointerEvents: "auto"` on the canvas, and the only surviving React overlays are
two `pointerEvents: "none"` toasts.** There was no conflict to arbitrate. The
shared canvas is the one interactive surface; `VIEW_OVERLAY` makes each view's
wrapper transparent and inert so taps fall through to it. Interactive HTML
children, should any come back, opt back in with `pointerEvents: "auto"`.

## Measurements

Method: a scratch Playwright spec drives `setActiveView` through the dev test
bridge and waits for the destination scene's `current-scene-ready`, timing each
hop. Same file run against `main` and against this branch, same machine, same
session. Steady-state laps only (lap 0 includes the genuine cold load).

| hop (revisit) | per-view games | one shared game |
|---|---|---|
| → Workshop | 1757 / 2221 ms | 276 / 273 ms |
| → Yard | 1639 / 1884 ms | 202 / 200 ms |
| → Track | 1741 / 2417 ms | 184 / 194 ms |
| **full lap** | **7817 / 9786 ms** | **1237 / 1234 ms** |

Resident texture memory, summed as `width × height × 4` over the game's
`textures.list`:

| after | MB |
|---|---|
| Map only | 18 |
| + Workshop | 222 |
| + Yard | 239 |
| + all four | **253** |

So peak VRAM rises from the largest single scene (~222 MB) to the union
(253 MB) — **+31 MB**, far less than the union of the per-scene figures, because
the shared chrome atlas dominates and is now paid once. That is the trade this
makes, and it is the good side of it.

**No leak.** Six full laps: textures flat at 15, 253 MB, `scenes.length === 1`
(so `remove` really is unregistering), JS heap flat at 30 MB.

## Gate at the time of landing

`npm run typecheck` clean, `npm run lint` exit 0, **359 unit tests / 23 files**,
**10 e2e passed locally** (`PW_PORT=5199 npm run test:e2e`, includes the
built-artifact specs). The v2 flow passed on the first run of the new code.

## Cheaper wins already taken (kept for the record)

- 24 dead atlas frames deleted: **4 pages → 3, 225 → 176 MB** VRAM (`ca3596f`).
- AR-023 plate re-quantized to palette: **3287 KB → 422 KB**.
- Six unused scene backgrounds no longer bundled, three unseen car textures no
  longer preloaded (~44 MB), both from the remote play-test pass.
- Lazy-loading the three non-active car sprites — already done in
  `WorkshopScene.preload` / `showCar()`.

## Still available

- **Split the ui-atlas per scene.** Workshop chrome and Yard/Track chrome overlap
  far less than one shared atlas implies. Now a smaller win than it was: the atlas
  is loaded once per page rather than once per navigation.
- **`transparent: false`.** The game config forces per-frame alpha compositing
  with the page for a canvas that is fully covered by its own background plate.
  Untested; `GameCanvas` supplies the letterbox black, so the dependency is a
  single style.
