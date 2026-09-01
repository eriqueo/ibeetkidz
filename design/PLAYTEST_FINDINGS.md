# PLAYTEST_FINDINGS — 2026-08-01

> Historical incident report. Findings and measurements describe the tree on
> 2026-08-01 unless a later resolution is explicitly recorded. For current
> behavior use `PROJECT_CHARTER.md`, `design/HISTORY.md`, and the code.

Eric play-tested the deployed build and reported five problems, plus one
structural question: *why is a small kids' toy as heavy as an open-world game,
and is there a better way to fix layout than describing a position in prose and
waiting for an agent to translate it into coordinates?*

Both answers turned out to be the same answer, and it is the reason the scene
editor is in this branch. The game already knows every element's exact on-screen
rect — it is the Tiled object rect, and `placeSpawn` maps it to pixels. Nothing
had ever run that mapping **backwards**. That single gap is why nobody could tell
the art agent how big to draw a sprite, and why nobody could drag one.

Written for whoever picks this up cold. Every claim below was checked against the
tree or measured in a running build; where something is a guess, it says so.

---

## 1 · What shipped

| # | Symptom Eric reported | Root cause | Commit |
|---|---|---|---|
| A1 | Every recording is static | `normalizeBuffer` measured its level over ROOM TONE, hit its gain cap of 60, and `tanh`-shaped every sample | `fa98322` |
| A3 | Can't tap the lower sequencer lanes | Chrome sprites hit-tested their whole padded frame, not their art | `7fe1762` |
| A2 | NEW CAR "does nothing" | Not miswired — a labelling problem plus a silent 12-car cap | `c04ae74` |
| A4 | Handcar floats above the buildings | `MAP_HANDCAR` hardcoded ~0.12 of image height too high | `ef27655` |
| A5 | App feels heavy | A template literal glob-bundled 10 backgrounds; 4 car textures preloaded to show 1 | `a30e075` |

Plus the editor (`79f1f93`) and the map test coverage that should have caught
two of these (`f0027a8`).

Gate at the end of this branch: **350 unit tests / 22 files**, typecheck clean,
`eslint .` exit 0. `BASELINE.md` still records 296/20 at `29c3e41` and has NOT
been re-baselined here — that is a deliberate omission, not an oversight.

---

## 2 · A1 — the microphone static

`normalizeBuffer` is the only DSP between the mic and the speaker, and it had
three compounding faults.

The one that produced the static: the RMS was measured over every sample above a
fixed absolute floor of `0.003`. That excludes digital silence but **includes
room tone**. On a quiet take — a kid a foot from a laptop mic in a normal room —
almost all the energy IS room tone, so the level it read was the room's. Gain
went to its cap of 60 and the room came up with it. Then `Math.tanh(gain * x)`
ran over every sample, which at that drive is a square-wave shaper: measured
crest factor 1.005, where a literal square wave is 1.000.

Measured on a fixture of quiet speech over a 0.004 RMS room floor:

| | silent regions | voice regions |
|---|---|---|
| before | 0.023 RMS (audible hiss between every word) | 0.329 |
| after | **0.005 RMS** | 0.080 (the target) |

An empty-room take at 0.01 amplitude was amplified to **0.35 peak**. It is now
left exactly as recorded.

The fix has three parts, one per fault: `estimateSignalRms` reads 20 ms frames
and gates on `4 × median frame` so it measures the voice and not the room; the
target drops from 0.25 (~-12 dBFS, louder than a mastered pop record) to 0.08;
and a soft-knee limiter replaces the waveshaper, so everything below 0.7 passes
through untouched.

**Riders worth knowing:**

- **`trimSilence` was a no-op on every take until now.** It runs on the
  already-normalized buffer, and the old normalizer left peak ≈ 1.0 with room
  tone above its 5%-of-peak threshold — so the threshold was met from the first
  sample to the last. It starts doing real work now. Watch for over-trimming on
  very quiet takes.
- **Existing saved recordings will sound different after this.**
  `decodeRecording` normalizes rehydrated blobs too, so old takes get the new
  curve — quieter and cleaner, which is the point, but it is a perceptible change
  to projects that already exist.
- **`openStreamTap`'s monitoring path is silent, and that is correct.** Neither
  the worklet nor the ScriptProcessor handler writes output, because it is a
  capture tap on a graph that is already routed to the destination. It is the
  non-Chrome fallback, it does not run on desktop Chrome, and it is not the
  cause. A comment now says so.

---

## 3 · A3 — the blocked sequencer lanes

Not a visual overlap. `wireButton`/`wireInstrument` called
`setInteractive({ useHandCursor: true })` with no `hitArea`, so Phaser installed
its default input rect: the **whole frame, transparent padding included**. These
canvases carry a lot of padding — the instrument characters run to roughly 2× their
content box — while `placeUiSprite` contain-fits only the CONTENT. Chrome draws
at depth 10, grid cells at 3–7, and Phaser hit-tests top-down.

Measured intrusion into the grid slate (x 802–1763, y 481–958, design space):

| sprite | authored rect | actual input rect | overlap |
|---|---|---|---|
| `inst-mic` | y 915–1195 | x 746.6–1041.1, y 860.0–1252.7 | 239 × 98 px |
| `inst-guitar` | y 915–1195 | x 1170–1448, y 875–1245 | 278 × 83 px |
| `inst-violin` | y 915–1195 | x 1598–1867, y 879–1238 | 165 × 79 px |

`WORKSHOP_GRID_V2.minRows` pins the grid's bottom edge regardless of lane count,
so at `maxLanes` (6) the **entire bottom row** sat inside that dead band.

`contentHitRect` now derives the input rect from `UI_SPRITES[*].content`. One
property of the fix is worth carrying forward: **the texture size cancels out of
the math**, so the guarantee holds at any resolution — which is what will make a
future atlas downscale safe.

---

## 4 · A2 — NEW CAR is not miswired

This one was reported as a broken wire and is not. `chooseCarType` emits
`workshop-new-car` deliberately; the comment there records the decision (*"clear
all the tracks when you say new car"*). Everything that made it read as broken
was presentation:

- The picker highlighted the tile matching the ACTIVE car's type as "selected",
  so it read as *"what type is this car?"* rather than *"start a car"*. Tapping
  the highlighted tile then produced a new empty car that looks identical.
- No captions, no title — four unlabelled car pictures.
- `addCar` **silently no-ops at `MAX_CARS` (12)**. Past the cap the picker closed
  and genuinely nothing happened.

The retired `workshop-car-type-changed` event was removed during the 2026-08-28
cleanup. The `setCarType` reducer remains live: NEW CAR uses it when the active
car is already empty, changing that car's type without minting another empty
car.

---

## 5 · A4 and the scene editor

`MAP_HANDCAR` was hardcoded and wrong: every marker sat ~0.12 of image height
ABOVE its landmark (168 / 178 / 180 px), putting the Workshop handcar on the
cabin roof. It carried its own *"needs a live visual tuning pass"* note for as
long as it existed — because there was no way to do that pass.

That is the whole argument for the editor, so A4 was fixed BY the editor rather
than by another round of guessing. Open `/?edit` on a dev build, drag, Ctrl+S.

**Looking at the running scene immediately turned up something arithmetic would
have missed:** there is a painted rail line running the width of the island, and
the handcar is a rail vehicle. Each marker now parks ON the rail at its landmark
instead of floating over a roof.

### How the editor is built, and the three things not to break

1. **`inverse.ts` is the exact algebraic inverse of `placeSpawn`**, per anchor.
   If `placeSpawn` changes, this must change with it; `editor-inverse.test.ts`
   drives the REAL forward function and requires a round-trip.
2. **The preview IS the truth path.** A drag mutates the map JSON, re-parses,
   writes fresh values onto the live spawn objects, and calls the scene's own
   relayout. That is free only because `UiElement.spawn` is the **same object**
   as the parsed spawn (held by reference, not copied). Nothing announced that;
   `editor-live-preview.test.ts` now asserts identity with `toBe`, because a
   reasonable refactor to index-alignment would break the editor silently —
   outlines moving while sprites stopped.
3. **Never rebuild a map; write leaf values on a clone.** `TiledSpawn` is a lossy
   projection, and `TiledMapSchema.parse` is *also* lossy in a less obvious way:
   the map and layer schemas are `.passthrough()` but `TiledObject` is not, so
   parse output silently drops unnamed object keys.

**The four map files were normalized** to canonical `JSON.stringify(…, null, 2)`
form. Tiled omits the trailing newline on three of them and writes whole floats
as `1981.0`, which JS cannot emit — without this, editing `track.json` produced
30 lines of churn around every real change. Expect one noisy diff if a map is
ever re-saved from Tiled itself.

### Safety, and how each guard was actually checked

- **`IBK_EDIT=1` is required to write.** `vite.config.ts` sets
  `allowedHosts: true`, so without the gate any LAN peer could rewrite the repo's
  maps. **Do not soften this for convenience.** Verified load-bearing: with it
  unset the editor still draws and drags, and the file on disk does not change.
- **Three guards keep it out of production** — `import.meta.env.DEV`, a dynamic
  import so nothing in the production graph names the chunk, and
  `scripts/check-no-editor-in-dist.sh`, which exits **non-zero**. That script was
  checked in BOTH directions: it fails on a deliberately leaked build and passes
  on a clean one. A guard only ever verified against a clean tree proves nothing.
- **Architecture rule 6** asserts the source side: no static import of
  `src/editor/` from outside it, exactly one dynamic one.

### Editor phases NOT built

- **Phase 2 — React inspector + `src/game/action-registry.ts`.** Types `action`
  as `keyof EventMap` so a typo is a compile error, with an exhaustive
  `Record<keyof EventMap, "authorable" | "engine-only">` forcing every new event
  to be classified. Needed before the `action` field can be edited at all —
  today the editor can only MOVE things, which is 95% of the value and 5% of the
  risk. When it lands, move the shape assertions out of `tiled-maps.test.ts` into
  the registry test and leave that file holding only product requirements.
- **Phase 4** — Yard fixture migration (`YARD_SIDINGS_V2`,
  `YARD_LAYOUT_V2.assemblyLine`).
- **Phase 5** — the art manifest (see §7).
- **Phase 6** — atlas downscale (see §6).

### `scene-layout.ts` migration verdicts

| Export | Verdict |
|---|---|
| `MAP_HANDCAR` | **Migrated** (this branch) |
| `TRACK_LAYOUT_V2.signal` / `.parkAngle` | Migrate later; `parkAngle` as a property on the existing `track-path` |
| `YARD_SIDINGS_V2`, `YARD_LAYOUT_V2.assemblyLine` | Migrate later — each siding independently draggable |
| `YARD_LAYOUT_V2.palette`, `.crane` | **Delete — verified never read** |
| `WORKSHOP_GRID_V2` | **Stays** — parameters of a layout algorithm, not positions |
| `WORKSHOP_TOOL_MODAL`, `TRACK_SEND_MODAL` | **Stays** — explicitly *viewport*-relative; Tiled rects are image-relative |
| `CHALKBOARD_SLATE` (`ui-sprites.ts`), `CAR_SIDE_VOID` (`assets.ts`), `UI_SPRITES[*].content` | **Neither** — properties of a *texture*, not a scene. Should be **generated** from alpha bboxes |

---

## 6 · A5 — weight, ranked

Measured, not estimated.

1. **Every navigation destroys and rebuilds the whole Phaser game.**
   `Shell.tsx` swaps a different component type per view, so `PhaserGame`'s
   `destroy(true)` fires on every nav — the 1.7 MB engine re-initialises, every
   texture re-uploads. **This is the biggest single win and it is NOT done here**:
   converting to one game + `scene.start()` touches all four view components and
   their EventBus lifetimes. It is a ticket, not a rider on a bug-fix branch.
2. **The `ui-atlas` is 4 pages, 57.72 Mpx, 230.9 MB of RGBA** once decoded, and
   never downscales. 24 frames totalling 10.57 Mpx (about one full page) are
   referenced by nothing.
3. **Six unused backgrounds shipped** — fixed (`-2.6 MB`, dist 16,816,238 →
   14,179,628 bytes).
4. **Three unseen car textures preloaded** — fixed (~44 MB VRAM, ~690 KB
   transfer, on a scene that shows one car).

**Why the atlas was not repacked here:** `scripts/build_ui_atlas.py` is wired to
**no npm script and no CI job**. `public/assets/spritesheets/ui-atlas*` can
silently drift from `src/assets/sprites/`, and a repack in this branch would have
been unverifiable. Wiring it up (or adding a drift check) is the prerequisite.

**Two constraints for whoever does the downscale.** Resolution is purely a
divisor at runtime because `content` is normalized 0–1 — *provided every state
variant of a sprite is scaled by the same factor* (the shared-canvas invariant).
And **never trim**: `build_ui_atlas.py` declares `trimmed: false` precisely
because trimming would invalidate every hand-authored `content` box.

---

## 7 · Art

Two entries added to `ART_REQUESTS.md`:

- **AR-021** — `inst-pads` and `inst-magic` characters. Two fully-built tool
  panels (`PadsToolPanel`, `MagicToolPanel`) are reachable only by emitting
  `workshop-open-tool` by hand.
- **AR-022** — Map building labels. Note for the implementer: `MapScene` is the
  one scene still on `spawnTiledScene`, which has **no label or sprite support at
  all**, so plaque sprites need a `spawnUiLayer` migration first. Baked-in names
  need no code.

**`inst-keys` was NOT requested.** Its art already shipped — a `UI_SPRITES` entry
with all three frames in the packed atlas — and it was simply absent from
`workshop.json`. It is wired now by a map edit, no new art, no code.

**The canvas-size table is deliberately not written yet.** It is Phase 5 output,
and hand-guessing it is the exact failure this whole exercise exists to end. What
is already measured: buttons and instruments draw at **scale 0.42–0.65** of
source (≈2× linear oversample), panels at **0.89–0.98** (≈1.1×). `btn-nav-map`
draws at 429×150 from a 947×331 content box; `inst-piano` at 340×280 from
707×660. The rule that must accompany the table: *deliver at content-box size ×
oversample, then pad the canvas — and state the padding fraction, because
`UI_SPRITES[*].content` is normalized 0–1.*

---

## 8 · Later resolutions

1. The retired `workshop-car-type-changed` event was deleted on 2026-08-28;
   `setCarType` remains live through the NEW CAR empty-car path (§4).
2. The violin received its own bowed `MonoSynth` voice in commit `368b203`; the
   pizzicato fallback described by this report is no longer current.
3. Workshop LOOP plays the active car through `AudioEngine.playCarLoop`; PLAY
   lays out the train. That distinction remains the shipped behavior.
4. The UI atlas now has 114 frames across four pages (5,317,982 encoded bytes;
   237,633,536 decoded RGBA bytes at the 2026-08-31 baseline). Its deterministic
   producer is `scripts/build_ui_atlas.py`; `scripts/check-ui-atlas-fresh.sh`
   rebuilds into a temporary directory and compares JSON plus decoded PNG
   pixels. Release and asset-size workflows run the checker, so the missing
   producer/gate contract described in §6 was repaired.
5. The single shared Phaser game described as undone in §6 shipped later on
   2026-08-01. `design/PERF_SINGLE_PHASER_GAME.md` owns the measured result and
   failure analysis.

---

## 9 · Things a future agent will otherwise re-derive

- **`BackgroundScene`'s fit comment was backwards** for three of four scenes.
  Map is the only `"cover"` scene. Also: with today's art, cover and contain
  compute the *same* scale (every plate is 2560×1440 under a 2560×1440 `FIT`) —
  true today, not a licence to hardcode.
- **All four `base-plate` imagelayers named the wrong file**, and three named
  files that exist NOWHERE in the repo (`map-base.png`, `yard-base.png`,
  `track-base.png`). Inert at runtime; it meant opening any map in Tiled showed
  no backdrop, which breaks the authoring workflow the design depends on. Fixed.
- **`tsconfig.json` includes only `src` and `tests`.** `vite.config.ts` and
  `vite-plugins/**` are NOT type-checked; ESLint is the only checker that sees
  them, and it needed a new Node-globals entry for the nested directory.
- **The e2e "couple a car and ride it" spec fails in a plain headless container**
  at the WAV-render step, and it is NOT a regression — verified by running the
  same spec on the pre-change baseline commit. `playwright.config.ts:18-21`
  explains it: headless chromium never pumps the WebAudio graph without an audio
  device. CI wraps `PW_HEADED=1` in xvfb.
