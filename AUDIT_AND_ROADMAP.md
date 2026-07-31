---
title: ibeetkidz-audit-and-roadmap
type: Reference
timestamp: 2026-07-31T00:00:00-06:00
tags: [audit, roadmap, engineering-principles, ibeetkidz]
status: draft
---

# iBeetKidz — Principles Audit & Roadmap

Audited against `engineering-principles.md` rev 3 (2026-07-29).

> **R8 note on this document.** This is session output. Under *Ephemeral Until Promoted*, it is
> scratch until its parts are merged into their living docs — the roadmap half into
> `IMPLEMENTATION_ROADMAP.md` (or its replacement), the state corrections into `CLAUDE.md`,
> `README.md`, and `PROJECT_CHARTER.md`. **Step 0 of the roadmap is to fold this file and
> `git rm` it.** It is deliberately a 28th markdown file in a repo whose headline finding is
> that it has 27 too many.

---

## 0. What was actually verified

Per the claim discipline, everything below is labeled by the check that produced it.

| Check | Result | Method |
|---|---|---|
| `npx tsc --noEmit` | exit 0 | executed this session |
| `npx vitest run` | **204 passed / 14 files** | executed this session |
| Playwright e2e | **not run** — no browser in the audit environment | source-counted: 6 local, 7 on `origin/main` |
| `npm run build` | **not run** | — |
| Source read | `src/` 11.3k LOC + `tests/` 2.7k LOC read across three parallel audits | file:line evidence throughout |

**The checkout is stale.** `git rev-list --left-right --count origin/main...main` → `8 0`. Local `main`
(`3e0abfa`, Jul 4) is **8 commits behind** `origin/main` (`3b7732b`, Jul 10) and 0 ahead. The delta is
substantive: WAV song export (`src/adapters/wav.ts`, `src/game/send-panel.ts`), an iPhone raw-mic
recording fix (`tone-sound-port.ts` +330 lines), a hardened Playwright config, a file-backed fake mic
fixture, and 3 new tests. **No `.md` changed in the delta except `ART_REQUESTS.md`**, so every
documentation finding holds against `origin` too. That an audit could be pointed at a stale tree
without anything noticing is itself the R7 symptom this document is about.

---

## Part I — The audit

### Scoreboard

| # | Principle | Verdict | Cost curve |
|---|---|---|---|
| 1 | Hexagonal (Ports & Adapters) | **strong**, two leaks | rising |
| 2 | Parse, Don't Validate | **partial — inverted** | rising |
| 3 | Illegal States Unrepresentable | **partial** | rising |
| 4 | No Ambient Inputs | **strong** — textbook | flat |
| 5 | Capabilities / Ambient Authority | **strong** | flat |
| 6 | Lifecycle Sets Boundaries | **partial** | flat |
| 7 | Data-Driven / One Producer | **violated** | **steep** |
| 8 | Single Writer per Fact | **partial** — core strong, edges leak | rising |
| 9 | Derived State Is Disposable | **partial** | **steep** (repo weight) |
| 10 | Layers with a Promotion Rule | **partial** | **steep** |
| 11 | Message-Passing | **strong** | flat |
| 12 | Closed Interaction Vocabulary | **partial** — open at Tiled | rising |
| 13 | Bounded Capacity | **violated** | rising |
| 14 | Effects Idempotent/Keyed/Marked | **partial-strong** | flat |
| 15 | Plan/Apply Split | n/a by design | — |
| 16 | Late Binding / Env Agnosticism | **partial** | flat |
| 17 | Uniform Integration Surface | **strong**, one hole | flat |
| 18 | Extension Gradient | **claim is false** | rising |
| 19 | Errors as Values | **mixed — inverted** | rising |
| 20 | Contract Tests with the Port | **fail** | rising |
| R1 | Expand/Contract, Migrations Finish | **fail on both halves** | **steep** |
| R2 | Lifecycle Is Part of the Contract | boot bad, teardown good | flat |
| R3 | Observability | **fail** | rising |
| R4 | Enforced or Guideline | **fail** — zero checks wired | **steep** |
| R5 | Temporary Means Tracked | low count, untracked | flat |
| R6/R7 | Done Means Deployed / Declared ≠ Actual | **severe** | **steep** |
| R8 | Ephemeral Until Promoted | **fail** | rising |

### What is genuinely strong — protect this

Three things in this codebase are better than most production code and should be treated as assets
to defend, not areas to revisit.

**Principle 4 is textbook.** Grepping `src/core/` and `src/ports/` for `Date.now`, `new Date`,
`performance.now`, `Math.random`, `process.env`, `import.meta`, `window`, `document`, `localStorage`,
`globalThis`, and `crypto.` returns matches **only inside comments**. `Math.random` appears zero times
repo-wide. Randomness flows through `RngPort` (`src/core/rng.ts:15`), seeded once at the composition
root (`src/app/context.tsx:33`) and threaded as a parameter. Ids are minted at the edge and passed
*in* the command (`types.ts:259`, `:265`, `:285`). Even the migration path avoids ambient entropy —
`normalizeProject` mints deterministic slot ids (`project-state.ts:1055`) with the comment "no RNG in
the core." The litmus passes by construction.

**The `Command` union plus the exhaustive reducer is the structural crown jewel.** `types.ts:210-290`
is a proper 45-variant discriminated union; `reduce` (`project-state.ts:463-943`) has **no `default:`
case**, and under the repo's tsconfig (`strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`) a missing variant produces
`TS2366: Function lacks ending return statement`. Adding a command **breaks the build**. That is real,
compiler-enforced safety and it is why 75 tests on `project-state` are worth what they cost.

**`EventBus.ts` is a well-maintained closed vocabulary on the TypeScript side.** `EventMap`
(lines 11-122) is a typed record of 52 events with tuple payloads and a direction comment on each;
`TypedEventBus` (`:126-145`) key- and payload-checks `emit`/`on`/`off` on both sides. Cross-checking
every call site found **zero parallel string literals** — no event name typed in a scene and separately
in a component. React never touches Phaser objects except through documented push methods; Phaser
never dispatches commands. This is Principle 11 done right.

Also clean and needing nothing: **Principle 5**. There is no `fetch`, `XMLHttpRequest`, `WebSocket`,
or `sendBeacon` anywhere in `src/`; `index.html` has no external link, font CDN, or analytics tag;
fonts are self-hosted (`theme.css:18,23`); `dist/` is gitignored and confirmed untracked; the dev test
bridge is `import.meta.env.DEV`-gated (`context.tsx:63-73`). The kid-safe, offline, private claim
holds — the one caveat being that "offline-capable" currently means *no network dependency*, not
*installable*: there is no service worker and no PWA manifest, which is a charter gap, not a leak.

---

### The five findings that matter

Everything else is downstream of these.

#### F1 — The v2 migration never finished. 22% of `src/` is unreachable. `[R1, P18, R6]`

`AppView` is a closed four-member union (`types.ts:181`). `Shell.tsx:204-217` returns on every one of
them. Line 219 onward — `const Canvas = active.Canvas;` and the entire pre-v2 palette/options/playbar
shell — is **unreachable by type**, and through it:

| Module | LOC | Live importers |
|---|---|---|
| `src/machines/tools.tsx` | 2,035 | `laneColor` only (3 refs in `Workshop.tsx:21`) |
| `src/visualizer/**` (the whole `RendererPort` impl) | 242 | 0 |
| `src/components/VizPanel.tsx` | 134 | 0 |
| `src/components/PixelButton.tsx` | 38 | 0 |
| `src/game/press.ts` | 28 | 0 |
| `src/app/use-viewport.ts` | 25 | 0 |
| **Total** | **≈2,502 (22% of `src/`)** | |

CLAUDE.md says the pre-v2 code is *"still present and **reused** (LoopTrack et al.)"* and that
*"the per-lane editors (`LoopTrack`/`LaneControls`/patterns) **live on, reused above**."* Both are
false: `LoopTrack` has zero importers. The only surviving export is `laneColor`.

Two live consequences. First, `Shell.tsx:223-228` calls `useState` and `useEffect` **after four
conditional returns** — a rules-of-hooks violation that is dead today and becomes a crash the moment a
fifth view lands. Second, the dead file is where `FX_TILES` and `WAVES` are duplicated
(`tools.tsx:333-340`, `:1836` vs `tool-panels.ts:35-51`), so deleting it retires a P7 violation for free.

The rule is that *a migration ends with `git rm`*. This one stopped one commit short, and everything in
F2 flows from that.

#### F2 — Three governing documents describe three different applications, none of them this one. `[R6, R7]`

Measured test counts against the claims:

| Source | Claims | Actual |
|---|---|---|
| `README.md:64` | "53 unit tests, 14 Playwright E2E" | ✗ off by 4× and 2.3× |
| `CLAUDE.md` | "126 unit tests, 5 Playwright E2E" | ✗ |
| `PROJECT_CHARTER.md:80` | gate requires "168+ tests" | ✗ (satisfied by accident) |
| **`npx vitest run`, executed** | | **204 / 14 files** |
| e2e, source-counted | | **6 local, 7 on origin** |

`README.md` is dated Jun 21 and its entire Status section describes unreachable software: *"**Home**
(the default landing)"* — the landing is Map (`project-state.ts:146`); *"pages you visit"* — they are
Phaser modal Containers; *"**Send to Home**"* — no such affordance; *"a `usePhoneLayout()` resolver"* —
zero importers. **README does not mention Phaser at all**, though it is the largest dependency and
`src/game/` is the largest source directory.

`PROJECT_CHARTER.md` calls itself *"the absolute law"* and is violated in five places by the code it
governs: §2.2 *"we do not hardcode layout coordinates in TypeScript"* (six constant blocks survive in
`scene-layout.ts:25-88`); §2.4 *"fail loud at boundaries"* (inverted — see F5); §1 *"no generic emoji"*
(emoji are structural: `tool-panels.ts:35-51`, every panel title, the whole playbar); §1 *"Baloo 2…
pixel fonts for titles only"* (`tool-panels.ts:17` sets `Press Start 2P` for **every** label; Baloo 2
is not in `src/assets/theme/fonts/` at all); §4.4's test floor.

`IMPLEMENTATION_ROADMAP.md` still marks **Phase A as "Current Phase."** Reality: A is done and shipped;
C is done and its premise is stale (`grep -rn "<dialog\|showModal" src` → **zero**; all six panels are
Phaser Containers, and `BaseToolPanel` exists at `tool-panels.ts:134-180`); D is mostly done; B is
partial; E.3 is not done **and CLAUDE.md documents the opposite as the intended design** — the roadmap
wants the train's physical position to drive playback, CLAUDE.md says *"driven visually from the
transport (no frame-trigger inversion)."* Two governing docs disagree on the target architecture.

The pattern: docs are written as aspiration, never audited against disk, and each new one supersedes
the last in practice while none supersedes it on paper.

#### F3 — Nothing is enforced. Every architecture rule is prose. `[R4]`

| Rule | Source | Check | Holds? |
|---|---|---|---|
| `core`/`ports` never import `adapters` | CLAUDE.md, Charter §2.1 | none | ✓ verified by grep |
| Tone.js only in `tone-sound-port.ts` | CLAUDE.md | none | ✓ verified (1 file) |
| React only in `App.tsx`/`components/`/`app/` | CLAUDE.md, README | none | ✗ `machines/tools.tsx` imports React |
| No `Math.random` in core | CLAUDE.md | none | ✓ verified (0 repo-wide) |
| Reducers pure, no `Date.now` | CLAUDE.md | none | ✓ spot-verified |
| No network | CLAUDE.md, README | none | ✓ verified |
| No hardcoded layout coords in TS | Charter §2.2 | none | ✗ 6 blocks |
| Errors as values, loud at boundaries | Charter §2.4 | none | ✗ inverted |

Five of eight hold today. **None of them can regress loudly.** They hold because the author remembers
them, which is exactly the state R4 exists to name: these are guidelines wearing enforcement clothes.

Two aggravating details. First, `build-and-deploy.yml` (push to `main`) runs typecheck + unit + build +
deploy — **no e2e**. On `origin`, e2e lives in `test.yml`, a *separate workflow with no dependency
edge*. `gh run list` shows runs `28759519651` and `28759353276` with `test / failure` and
`build-and-deploy / success` **on the same commits**. Broken code has already shipped to Pages twice.
"Done means deployed" is satisfied; "deployed means green" is not.

Second — the lint-the-lints case. There are **four `eslint-disable` directives in `src/`**
(`Workshop.tsx:466,469`, `PhaserGame.tsx:72`, `tools.tsx:897`) and **no ESLint installed, no config,
and no `lint` script**. They are checks that can neither pass nor fail. Worse, the absent
`react-hooks` plugin is precisely what would have caught the `Shell.tsx:223` violation in F1.

**This is the highest value-per-line change available in the repo.** A single ~40-line
`tests/unit/architecture.test.ts` that reads source files and asserts on imports — no new dependency,
runs inside the existing `vitest` gate — converts six prose rules plus the Tiled-action hole (F4) into
CI-enforced invariants.

#### F4 — Save format has no version; Tiled actions are unvalidated. Both are silent-failure boundaries. `[R1, P2, P12, P17]`

**The child's saved work is the one thing that outlives the code, and it is the only untrusted input
that is not parsed.** `grep -n "version" src/core/types.ts` → nothing. `deserialize`
(`project-state.ts:993-996`) is explicit:

```ts
// Trusts our own serialized shape; a hardened validator is a Phase-3 TODO.
return normalizeProject(JSON.parse(json) as Partial<Project>);
```

`normalizeProject` detects vintage by **six-way structural sniffing** — `Array.isArray(raw.train)`,
then `Array.isArray(raw.arrangement)`, then `raw.parts`, plus `carTypeFromLayers()` inferring type from
lane composition and four more shape sniffs in `makeLayer`. It also normalizes inconsistently:
`scaleId`, `keyId`, `carType`, `tempoBpm`, `swing` are checked; **`clips` is passed through whole and
unvalidated** (`:1102`), as are `activeView` (`:1107`), `activeMachineId`, `Layer.kind`, and `wave`.
Every `Clip.source` discriminant enters the domain unproven, and `context.tsx:100,125` then switches on
`clip.source.kind` on data that was never shown to have a `source`.

The asymmetry is the finding: **zod is a declared dependency and is used — on the art director's
Tiled JSON**, which ships in the bundle and is the *least* untrusted input in the system.
`TiledParser.ts:21` is genuinely good work (schema at `:58-67`, throws at `:145`, 28 tests). It is
pointed at the wrong boundary.

Meanwhile `TiledSpawn.action` is typed `string` (`TiledParser.ts:97`) and both consumers cast it away
to emit (`TiledSceneAdapter.ts:107`, `ui-scene.ts:52` — the same cast, duplicated). A typo like
`workshop-open-toool` renders, presses, animates, and emits into the void. No throw, no log, no test.
All 17 current actions do resolve — verified — but `tiled-maps.test.ts` only covers `yard.json` and
`track.json`, and no test asserts `action ∈ keyof EventMap` for any map. Five events
(`car-selected`, `workshop-instrument-added`, `workshop-car-type-changed`, `workshop-nav`,
`workshop-surprise`) have live listeners and **no emitter anywhere**.

Both holes close with roughly 30 lines: add `schemaVersion` to `Project` and branch on
`raw.schemaVersion ?? 0`; export `EVENT_NAMES` from `EventBus.ts` and refine `action` against it in the
parser, so a bad action becomes a **unit-test failure at import** rather than a dead button in
production. Also note the existing 8 migration tests (`project-state.test.ts:462-635`) are thorough but
every fixture is hand-typed — there is **no captured real pre-v2 save**, so they prove the migration
handles the shape the author *remembered*.

#### F5 — Zero observability, and the boot path can hang with no message. `[R3, R19, R2]`

```
$ grep -rn "console\." src
(no matches)
```

Zero logging statements in 11,328 lines. No error boundary, no `window.onerror`, no
`unhandledrejection` handler. The consumer here is future-Eric debugging on an iPad with no devtools.

```ts
// src/components/BootGate.tsx:12-19
const start = async (): Promise<void> => {
  if (busy) return;
  setBusy(true);
  await engine.start();   // resume() + loadBuiltins() — NO try/catch
  engine.setQuantize("beat");
  await loadLast();       // → deserialize() → JSON.parse — NO try/catch
  onStarted();
};
```

Any rejection — a blocked `AudioContext.resume()`, a corrupt localStorage entry making `JSON.parse`
throw — leaves `busy === true`, `onStarted()` never fires, and the child stares at a permanently
disabled "▶ TAP TO START" with no message, no retry, no log. Boot validates nothing: not that
`AudioContext` is constructible, not that `localStorage`/`indexedDB` are reachable (both throw in
Safari private mode). It neither refuses to run half-alive nor limps up — it just stops.

The failure catalogue, all currently undiagnosable on the target device:

| Failure | Symptom on the iPad | Diagnosable? |
|---|---|---|
| Tiled `action` typo | button presses, animates, does nothing | no |
| Atlas 404 (bad base path) | scene renders with no chrome | no |
| `parseTiledLayer` ZodError | blank canvas | no |
| Autosave `QuotaExceededError` | work silently stops persisting | no |
| Corrupt `readIndex()` | **all saved projects vanish** | no |
| `getBlob()` returns null | voice lane plays silence | no |
| Boot rejection | disabled button forever | no |

The Charter's own §2.4 — *"fail loud at boundaries, recover silently in core"* — is **inverted**: the
ports define typed errors beautifully (`MicDeniedError`/`NoMicError` at `sound-port.ts:157-169`,
`QuotaExceededError` at `storage-port.ts:24-29`, with real translation from `DOMException` at
`tone-sound-port.ts:263-272`), and then everything one layer up throws them away.
`grep QuotaExceededError src` finds only the two throw sites — **zero handlers**; `context.tsx:113`
`void`s the autosave promise. `readIndex()` (`local-storage-port.ts:22-27`) catches and returns `{}`,
silently discarding every saved project. `grep -rn "catch" src/game` → **zero hits**, so a Phaser
texture 404 (which fires `LOADERROR`, unlistened) renders an empty scene.

One bright spot, and it is the right instinct: `?audiodiag` (`context.tsx:75-87`) exposes
`__ibeetkidz_audio__.diag()` in production returning `{contextState, transportState, masterPeak}` off
a destination tap, with a comment explaining the exact debugging procedure it was built for. That is
operator-facing observability designed around a real session. Nothing else in the app follows its
example.

**Mic-denied, by contrast, is done right and the CLAUDE.md claim is verified.** `Workshop.tsx:283-308`
is a proper four-state machine (`idle`/`opening`/`recording`/`stopping`) with the phase in a ref so a
fast release across the `await` can't stick the mic open; failure sets a kid-legible
`"No mic? No problem — try the Sound Pads! 🥁"`. Nothing unmounts, nothing throws.

---

### Secondary findings

**P7 — the palette has six-plus independent producers and the canonical one is used by nothing.**
`design/palette-nintendo.json` (the charter's declared 16 colors) is referenced by zero code; **12 of
its 16 colors appear nowhere in `src/`**, and the one that does (`#2b2440`) is hardcoded as a literal
in four Phaser files. `design/design-tokens.json` is a *synthwave/neon* set that directly contradicts
`PROJECT_CHARTER.md:16` and is also unused. `theme.css:29-62` is a third palette (gruvbox + Dracula
names). `style.css` has 49 raw hex literals, none via `var()`. `tool-panels.ts:22-51`,
`WorkshopScene.ts:66-106`, `TrackScene.ts:141-144`, `YardScene.ts:181-182`, and `ui-scene.ts:28` each
re-type their own. Phaser cannot read CSS variables, so every new scene re-types 5-15 hexes with
nothing to check them against — this cost is linear in scenes and permanent.

Same pattern, smaller: **car types have six producers** (`types.ts:147` correctly, plus
`sprite-assets.ts:38`, `assets.ts:36-41`, `ui-sprites.ts:85-89`, `train.json`'s 40 hand-written frames,
and `build_train_atlas.py:26` — whose docstring *admits* "must match train.json + sprite-assets.ts").
**Tempo range is re-typed four times** (`Track.tsx:43`, `Workshop.tsx:200`, `Shell.tsx:97-98`,
`tools.tsx:1768`) despite `MIN_BPM`/`MAX_BPM` existing in `types.ts:292`, and the **default disagrees**:
the project boots at 100 (`project-state.ts:136`) while the Workshop LCD initializes to `"TEMP 120"`
(`WorkshopScene.ts:123`). Magic numbers *inside core* are exemplary by contrast — `STEP_COUNT`,
`MAX_LAYERS`, `MAX_PATTERNS`, `MAX_CARS` all live once and are imported by 20+ sites.

**Charter §2.2 is half-true, and the code is more honest than the doc.** Static chrome — nav plaques,
transport keycaps, panels, and the Track ride-path polygon — genuinely *is* Tiled data, statically
imported and interpreted generically. That part is exemplary. But **all dynamic field geometry is
TypeScript literals**: `YARD_SIDINGS_V2`/`YARD_LAYOUT_V2` compute every palette and assembly-line car
position (`YardScene.ts:48-82`), `TRACK_LAYOUT_V2.signal` is a TS literal that the Tiled-driven ride
path must synchronize *against*, plus `WORKSHOP_GRID_V2`, `MODAL_HITS`, `MelodyEditorPanel.ART`'s five
hand-measured recesses, and `MAP_HANDCAR`. `scene-layout.ts` labels itself *"PLACEHOLDER coordinates…
need a visual tuning pass"*; the charter states an absolute.

**P13 — three things are unbounded, and one of them will bite a real child.** Undo history is capped
(`HISTORY_LIMIT = 50`), cars are capped (`MAX_CARS = 12`), patterns are capped, and smoke particles
are rate-limited — all good. But:

- **The train has no cap.** `addToTrain` (`project-state.ts:735-744`) checks for an unknown part and a
  duplicate `instanceId` and nothing else, unlike every sibling command. `songBars` grows without limit;
  `scheduleArrangement` lays out N bars and `TrackScene.update()` iterates N tokens every frame. The
  Yard's HITCH button can append the same car forever.
- **IndexedDB never shrinks.** `StoragePort` has `putBlob`/`getBlob` and **no `deleteBlob`**.
  `deleteProject` exists and is **called from nowhere**. `removeClip` drops the clip from the project
  and leaves the blob in IndexedDB, in `recordingBlobs`, and in `buffers` forever. A kid recording all
  afternoon fills the device, silently (see F5 — the quota error has no handler).
- **Recording duration is uncapped.** `startRecording` (`tone-sound-port.ts:253`) opens a
  `Tone.Recorder` with no timer, and the UI is hold-to-record — a resting finger records until release,
  then decodes and RMS-normalizes the whole thing in memory.
- Related: `scheduledDestination` (`tone-sound-port.ts:549-596`) builds a fresh
  FeedbackDelay/Filter/BitCrusher/Chorus chain **per scheduled hit**, not per lane, and
  `context.tsx:93` re-runs `engine.reconcile` on **every dispatch while playing** — i.e. per grid tap.
  Node construction is O(train × lanes × steps) with the train unbounded. Nothing leaks
  (`clearScheduled` disposes correctly) but there is no budget and no measurement.
- Also: `persist()` rewrites **every** recording blob on **every** debounced save. Correct (keyed,
  idempotent) but hundreds of full-blob rewrites per editing session.

**P8 — tempo has two writers, with a real consequence.** `Project.tempoBpm` is written by the reducer;
`Tone.getTransport().bpm` is written by `ToneSoundPort.setTempo`, called from `AudioEngine.reconcile`
**and independently** from `Track.tsx:44`, `Workshop.tsx:201`, `Shell.tsx:101`. The two can diverge —
and `resolveClip` keys its loop cache off the *adapter's* value (`tone-sound-port.ts:413`:
`Tone.getTransport().bpm.value || 120`), so a stale bpm produces a wrong-length beat-snapped buffer
**cached under a key derived from the wrong bpm**. Separately, `AudioEngine.playing` shadows
`Tone.getTransport().state`, so an iOS interruption stops the audio while `Track.tsx:76` keeps the
train riding silently. And Yard selection exists twice (`YardScene.selectedId` and
`Project.activePartId`) with one-way sync — `Yard.tsx` never pushes back, so the yellow ring doesn't
follow a reducer-driven selection change.

**P9 — ~350 MB of git-tracked, zero-referenced binary; `.git` is 987 MB.** Verified on disk:
`src/assets/sprites-v2/` is 238 MB / 94 files with **zero code references** (only `scripts/pack-sprites.py`
reads it), of which **47 are `*_original.png`** — and CLAUDE.md's claim that the `_original` dupes were
removed is **false**. They aren't even meaningfully "originals": `boxcar-E.png` and
`boxcar-E_original.png` are both 1920×1920, so the downscale pass never happened and the dupes are two
copies of the same oversized asset. Add `src/assets/references/` (50 MB, 0 refs), `art_gen/` (59 MB, 22
tracked files, commit message says *"session references and WIP generations"*), and
`scenes-v2-sliced/` (0 refs, produced by `slice_sprites.py` which hardcodes `/home/ubuntu/...` paths
that don't exist and **cannot run**). **The pattern is ongoing, not historical**: `origin/main` adds 32
more multi-MB loco reference PNGs in `src/assets/spritesheets/ar015/` (~120 MB) that no code loads.

Meanwhile the actual derived artifacts — `public/assets/spritesheets/{train,ui-atlas-*}` — *are*
tracked, rebuildable by two scripts, and verified by nothing; and `train.json` is hand-authored against
a script that merely asserts it should match. The rebuild path for the audio bake caches has **zero
tests** (`grep tests/ for resolveClip|bakedCache|loopCache` → nothing).

**P10 — the promotion rule is being ignored at the scene layer.** `BackgroundScene` and
`BaseToolPanel` both exist and are good; a second tranche of duplication has accumulated above them.
Verbatim across three scenes: the chrome preload triple (`YardScene.ts:104-110`,
`TrackScene.ts:78-84`, `WorkshopScene.ts:165-174`), the chrome spawn call including both depth
literals, the four-line `layoutChrome()` guard, the `onResize` body (all four scenes), and the
`chromeSpawns`/`chrome` field pair. The **LCD chip is a whole component duplicated** —
`TrackScene.ts:117-167` vs `WorkshopScene.ts:355-496`, same rounded-rect, same
`rad = Math.min(p.height * 0.28, 18)`, same line width formula, one naming the colors and the other
inlining them. The tarp overlay is three verbatim lines in two scenes. The armed-press idiom exists in
**six copies** — while `src/game/press.ts`, the shared helper written for exactly this, has **zero
importers**: the promotion was attempted, abandoned, and six ad-hoc copies grew instead. On the React
side, `Map.tsx:56-75` and `Yard.tsx:98-117` are a **20-line verbatim-identical toast block**, and all
four views share the same wrapper div and the same Track-guard predicate. Every new scene currently
costs ~30 lines of copied boilerplate before any scene-specific work.

**P1 — two leaks in an otherwise strong hexagon.** Dependency direction is genuinely inward (verified:
the complete import set of `src/core` + `src/ports` is core→core plus one port import), Tone appears
exactly once repo-wide, and swappability is *proven* by a working `FakeSoundPort`. But (a) the ports
leak browser types — `getAnalyser(): AnalyserNode`, `Blob` in two signatures, `CanvasRenderingContext2D`
in `RendererPort` — forcing the fake to lie (`return {} as AnalyserNode`); and (b) **`SoundPort` is a
27-method god interface** with `scheduleStep` taking 9 positional parameters and `scheduleNote` taking
10. The fake needs 25 inert stubs to exercise 2 methods. Every new audio capability widens the
interface *and* every implementer. `AudioEngine` calls only the transport subset. Also structurally:
the `RendererPort` implementation lives in `src/visualizer/`, not `src/adapters/`, and `TiledParser.ts`
is pure Phaser-free core code filed under `src/game/`.

**P3 — `Layer` uses tag-plus-optionals where it needs a union.** `types.ts:103-141` has `kind`,
`steps` ("empty for melody lanes"), and `notes` ("empty outer array for drum lanes") — the "exactly one
of" is enforced by **comment**, and `{kind:"drum", steps:[…], notes:[…]}` is a legal value. The cost is
manual guards spread across `project-state.ts:341,386,622,646` and `audio-engine.ts:110`, none of which
would fail to compile if a future contributor missed one. `LayerPattern` repeats the mistake;
`StepNote.roll` vs `pins` are documented mutually exclusive and modeled as two independent optionals,
arbitrated imperatively in `makeNote` ("pins win"). By contrast `ClipSource` and the
`instrument: \`voice:${string}\`` template-literal union with its `isVoiceInstrument` type predicate
are both correct — leave those alone.

**P20 — no contract suite exists for any port.**

| Port | Real adapter | Fake | Shared suite |
|---|---|---|---|
| `SoundPort` (27 methods) | `ToneSoundPort` 1,255 LOC | hand-rolled inside `audio-engine.test.ts:20-101` | none |
| `StoragePort` | `LocalStoragePort` 117 LOC | none | **zero tests of any kind** |
| `RendererPort` | `createVisualizer` 72 LOC | none | **zero tests** |
| `RngPort` | `createRng` | none | 4 tests of the impl |

`ToneSoundPort` — the single largest and riskiest module (offline `Tone.Offline` baking, iOS session
juggling, transport scheduling, the live theremin) — has **zero unit tests**; its only coverage is one
e2e asserting `masterPeak > 0.02`. `LocalStoragePort`, which owns everything a kid can lose, has
**zero**. Coverage is heavily concentrated: `src/core` (2,045 LOC) and the Tiled parser (~410 LOC) are
excellently pinned; `src/game/scenes` (1,675), `tool-panels.ts` (681), `src/adapters` (1,372), and
`src/components` (1,367) have **zero unit tests** between them. **~18% of the codebase carries ~100% of
the test weight.** The round-trip check exists as seven example-based assertions but not as a
structural property test, so a new `Project` field that `normalizeProject` forgets to copy passes all
204 tests.

The e2e are honest about what they do: all of them drive the app through the dev-only
`window.__ibeetkidz_test__` bridge and assert on the live `Project` object, never on rendered output.
That is defensible for a canvas app and the comment says so — but it means *"the reducer ran when I
emitted the event"*, not *"a kid tapping that pixel emits that event."* **Nothing verifies that any
Tiled hit-area is where the art is.** The two genuine runtime-health probes — `loco.x` changed after
1.2s, and `masterPeak > 0.02` — are the best tests in the repo precisely because they catch a dead
render loop and silent audio, the two failures that make the app worthless without throwing.

**P16 — `public/` assets bypass `BASE_URL`.** `grep -rn "BASE_URL" src` returns **zero hits**, and
there is no `load.setBaseURL`. `sprite-assets.ts:74-77` and `ui-sprites.ts:152` load atlases via
document-relative strings — in direct violation of the rule written at `assets.ts:3-4` ("Never hardcode
`/assets/...` strings — that breaks the Pages base path"). It survives only because Pages serves the app
with a trailing slash. Drop the slash and every atlas 404s, with no error surface. Five-line fix.

**R2 — teardown is better than typical; boot is the gap.** Systematic grep confirms EventBus
subscriptions balance in every component and scene, all four scenes use
`this.events.once(SHUTDOWN, …)`, every `requestAnimationFrame` has a matching cancel, and
`PhaserGame.tsx:67` destroys the game. Two unbalanced listeners are deliberate page-lifetime (the iOS
keep-alive, documented and guarded); one is a real bug (`visualizer.ts:61` adds `visibilitychange` with
no removal, leaking a closure per `createVisualizer` — currently unreachable). The one-sided part:
**view switches tear down React and Phaser but not the Tone transport** — nothing calls `engine.stop()`
on navigation, so leaving the Track while riding keeps it running under the Workshop.

**R5 — remarkably low debt count, zero tracking.** Two `TODO`s in 11,328 lines, zero
`FIXME`/`HACK`/`@ts-ignore`, zero `as any` in `src/`. That is genuinely disciplined. But **neither TODO
has a removal condition and one is a lie**: `local-storage-port.ts:3` says the IndexedDB store is a
build-out TODO — it is **fully built** (lines 31-116). `project-state.ts:994` cites a "Phase-3 TODO" in
a repo whose roadmap uses Phases A-E; the referent doesn't exist. Meanwhile CLAUDE.md names three TODOs
(sprite downscale, scene-layout tuning, e2e rebuild) of which only one appears in code, and STATUS_LOG
carries seven more. **Ten items tracked in prose, none linked to a line, none with a trigger.** Also:
two lockfiles (`package-lock.json` + `pnpm-lock.yaml`, five weeks apart) plus a `pnpm-workspace.yaml`
whose entire content is an unfilled prompt template (`allowBuilds: {esbuild: "set this to true or
false"}`). CLAUDE.md says "lockfile decides" — the lockfile cannot decide when there are two. Also
`vite.config.ts:41` sets `server.allowedHosts: true` with no removal condition.

**R8 — 27 markdown files, ~12 of them unmerged session scratch.** `WORKSHOP_REVAMP_DESIGN.md` and
`_V2.md` are same-day, ~75% identical, **neither pointing at the other**. Five art docs (693 lines)
cover the same ground, with `ART_REQUESTS.md` having superseded the rest in practice.
`UI_REFACTOR_DELEGATION.md` is a **verbatim agent prompt**, blockquotes and all, every task in it
verified complete. `CLAUDE_PROJECTS_GUIDE.md` instructs the reader to upload **three files that do not
exist** (`engineering-principles.md`, `DIRECTOR_HANDOFF.md`, `AGENT_PROMPT_PHASE_B.md`) — it cannot be
followed. `BUILD_RUNBOOK.md` opens *"nothing here has been installed, type-checked, or test-run yet"*
and instructs `git init` — following it today would be destructive; CLAUDE.md still cites it as
authoritative. `design/` holds three premortems for shipped features and a
`DESIGN_BRIEF.md` titled *"Synthwave Pixel Design Brief"* that the Charter explicitly repudiates, with
no redirect. Archive-means-move violations: `slice_sprites.py` at root while five siblings live in
`scripts/`; `art_gen/` duplicating `src/assets/`; two separate reference-image directories.

---

## Part II — Where development actually stands

The README's Status section is a month stale and describes unreachable software; here is the honest
version, verified against disk.

**The core loop exists end-to-end.** Map → Workshop → Yard → Track all route, all render from Tiled
data, and the Yard→Track flow is covered by a passing e2e. `origin/main` adds song export to WAV
(`src/adapters/wav.ts`, `src/game/send-panel.ts`) and an iPhone raw-mic capture fix, both with tests.
Audio is gapless and transport-driven; effects bake offline; recordings persist to IndexedDB and
rehydrate.

**Against `IMPLEMENTATION_ROADMAP.md`'s own phases:**

| Phase | Doc says | Actual |
|---|---|---|
| A — Asset pipeline → Tiled | "Current Phase" | **done, ~4 sprints ago** |
| B — Scene data migration | replaces `scene-layout.ts` | **partial** — chrome/nav/transport/ride-path are Tiled; six coordinate blocks survive in TS |
| C — Satellite tools → Phaser Containers | "currently HTML `<dialog>`" | **done**; premise stale (zero `<dialog>` in `src`); `BaseToolPanel` exists |
| D — Boxcar infill & polish | — | **mostly done**; grid cells still programmatic rectangles |
| E — Yard/Track completion | E.3 = invert playback so train position drives audio | **not done, and contradicted** by CLAUDE.md's stated design |

**What's left before a kid can use this unsupervised:** the visual tuning pass on `scene-layout.ts`
(the coordinates are self-labeled estimates), the sprite downscale (still 238 MB of 1920×1920 assets),
per-tool e2e through the new Workshop stations nav (retired with the v1 shell, never rebuilt), and the
three unbounded-growth fixes in P13 — the recording store in particular, since a child filling device
storage currently fails silently and loses work.

**The E.3 contradiction needs a decision, not a fix.** One document wants the train's physical
position to drive which car sounds; the other says the transport drives the train visually. These are
incompatible architectures. Pick one and delete the other from the doc that lost.

---

## Part III — Roadmap

Sequenced by risk: each block fixes violations that get more expensive as more scenes and tools land,
and ships something playable alongside. Nothing here is a rewrite — every item is a reorganization,
a deletion, or an added check.

### Block 0 — Ground truth (half a day)

Do this before anything else; every later estimate depends on it.

1. `git pull` — the working tree is 8 commits behind `origin/main`. Re-run `typecheck` and `test`
   against the real head before touching anything.
2. Delete `pnpm-lock.yaml` and `pnpm-workspace.yaml`. npm is the decided manager; two lockfiles is a
   reproducibility trap with no upside.
3. Fold this document: roadmap → `IMPLEMENTATION_ROADMAP.md`, state corrections → `CLAUDE.md` /
   `README.md` / `PROJECT_CHARTER.md`, then `git rm AUDIT_AND_ROADMAP.md`.

### Block 1 — Wire the checks (one day, highest value-per-line in the repo)

This block is first because every subsequent block risks regressing a rule that currently has no way
to fail loudly.

4. Write `tests/unit/architecture.test.ts` (~40 LOC, no new dependency, runs in the existing gate).
   Assert: `src/core` and `src/ports` import nothing from `src/adapters`; `from "tone"` appears in
   exactly one file; React is confined to `App.tsx`/`components/`/`app/`; `Math.random` appears zero
   times; no `fetch`/`XMLHttpRequest`/`WebSocket` in `src`.
5. Per R4's corollary, **seed each assertion with a deliberate violation once and watch it go red**
   before trusting it. A check that has never failed has never been tested.
6. Export `EVENT_NAMES` from `EventBus.ts`; refine `TiledSpawn.action` against it in
   `TiledParser.ts`; extend `tiled-maps.test.ts`'s `describe.each` to all four maps with
   `expect(EVENT_NAMES).toContain(s.action)`. This converts "silently dead button in production" into
   "unit test fails on `npm run test`" — the maps are already statically imported, so the check is free.
7. Delete the five dead events (`car-selected`, `workshop-instrument-added`,
   `workshop-car-type-changed`, `workshop-nav`, `workshop-surprise`).
8. Add ESLint with `react-hooks`, or delete the four `eslint-disable` directives that suppress a
   linter which has never run. Pick one — the current state is the "check that cannot fail by
   construction" pattern.
9. Give `build-and-deploy.yml` a dependency edge on the e2e job, or move e2e into it. Two commits
   have already deployed green while their tests went red.

### Block 2 — Finish the v2 migration (one to two days)

A migration ends with `git rm`. This one stopped a commit short and everything in F2 flows from it.

10. `git rm src/machines/tools.tsx`, `src/components/VizPanel.tsx`, `src/components/PixelButton.tsx`,
    `src/game/press.ts`, `src/app/use-viewport.ts`, and `src/visualizer/**`. Move `laneColor` into
    `src/core/` first (it's the only live export). ≈2,500 LOC.
11. Collapse `Shell.tsx` to the four-way switch; the hooks-after-return violation goes with it.
12. `git rm` the zero-referenced binaries: `src/assets/sprites-v2/**` (238 MB), `src/assets/references/**`
    (50 MB), `art_gen/**` (59 MB), `src/assets/scenes-v2-sliced/**`, `slice_sprites.py` (which hardcodes
    paths that don't exist and cannot run). Move any still-wanted source art into `scripts/` inputs
    with a documented rebuild. **Then stop the ongoing pattern** — `origin/main` just added 120 MB more
    unreferenced reference PNGs in `ar015/`; art references belong outside the app bundle's tree.
13. Note: `git rm` won't shrink the 987 MB `.git`. Decide deliberately — history rewrite, or accept it
    and stop adding.
14. Fix the three verified-false claims in CLAUDE.md (`_original` dupes removed; `LoopTrack` reused;
    126/5 test counts). Rewrite `README.md`'s Status from scratch — mention Phaser. Correct
    `PROJECT_CHARTER.md` §2.2 and §2.4 to what the code does, or fix the code; and reconcile §1's
    typography and no-emoji rules with `tool-panels.ts:17` (Baloo 2 isn't even in the fonts directory).

### Block 3 — Protect the child's work (two to three days)

These are the only findings that hurt a real user today.

15. Add `readonly schemaVersion: number` to `Project`; stamp it in `emptyProject`; branch
    `normalizeProject` on `raw.schemaVersion ?? 0` and **freeze the existing six-way structural sniffs
    as the `undefined` branch**. Every future migration becomes a switch case instead of another sniff.
16. Write `ProjectSchema` in zod (already a dependency, already proven in `TiledParser`) and make
    `deserialize` return a result rather than an unchecked cast. Parse `clips` per-entry with a
    discriminated `ClipSourceSchema`; union-check `activeView`, `activeMachineId`, `Layer.kind`, `wave`.
17. Capture a **real** pre-v2 save from a browser into `tests/fixtures/` — the eight existing migration
    tests are thorough but every fixture is hand-typed from memory.
18. Add `deleteBlob` to `StoragePort`; call `deleteProject` from somewhere; define the retention rule
    (blobs unreferenced by the project *and* by any history snapshot are collected on save). Add
    `MAX_RECORDINGS` with a kid-legible "your recording box is full" state.
19. Cap recording duration (`MAX_RECORD_SEC` auto-stop) — hold-to-record with a resting finger
    currently records until release.
20. Cap the train (`MAX_TRAIN_CARS`, enforced in `addToTrain` like every sibling command) with the
    existing `flashPalette` idiom as the at-limit feedback.
21. Wrap `BootGate.start` in try/catch with a visible retry and a message. The app can currently hang
    on a disabled button with no signal.
22. Add a `window.onerror` + `unhandledrejection` ring buffer surfaced at `?diag` alongside the
    existing `?audiodiag` probe (~30 LOC). This turns seven invisible failure modes into one readable
    list on the iPad — follow the pattern `?audiodiag` already established.
23. Handle `QuotaExceededError` somewhere. It is defined, thrown twice, and caught nowhere; the autosave
    promise is `void`ed. Stop `readIndex()` from silently discarding every saved project on a parse error.

### Block 4 — Stop the duplication before the next scene (three to four days)

Every item here is cheap now and multiplies with each new scene or tool.

24. **One palette producer.** Pick `design/palette-nintendo.json` (the charter's), generate the
    `:root` block in `theme.css` and a `src/game/palette.ts` of `0x` ints from it, and replace every
    hardcoded hex in the four scenes, `tool-panels.ts`, `ui-scene.ts`, and `style.css`. Delete
    `design-tokens.json` (unused, and it contradicts the charter). Add a check that no raw hex appears
    in `src/game/`.
25. Derive `TRAIN_TYPES`, the sprite manifests, the picker defs, and `train.json` from `CAR_TYPES` in
    `types.ts`; have `build_train_atlas.py` **emit** `train.json` instead of asserting it matches.
26. Delete the four re-typed tempo ranges; import `MIN_BPM`/`MAX_BPM`. Reconcile the 100-vs-120 default.
27. Promote into `BackgroundScene`: the chrome preload triple, the chrome spawn call, the
    `layoutChrome` guard, and `onResize`. Extract the LCD chip as a class. Extract the armed-press
    idiom once — six copies exist while `press.ts` sits unimported.
28. Promote a `<SceneView>` wrapper, a `<Toast>`, and a `canEnter(view, project)` guard for the four
    React views; `Map.tsx` and `Yard.tsx` currently share 20 verbatim identical lines.
29. Decide Charter §2.2 honestly: either author field geometry as Tiled objects (the pattern already
    works — `workshop.json` has `car-anchor`, `track.json` has the ride path) or amend the charter to
    "chrome is Tiled data, field geometry is `scene-layout.ts`" and add a check that no new coordinate
    constants appear elsewhere.

### Block 5 — Test what isn't tested (three to five days)

30. Write one contract suite per port, run against the real adapter and a fake. Start with
    `StoragePort` — it owns everything a kid can lose, has zero tests, and jsdom + `fake-indexeddb`
    makes it trivial. Then `SoundPort`'s transport subset.
31. Split `SoundPort` into `TransportPort` / `RecorderPort` / `EffectRenderPort` / `LiveVoicePort` /
    `AnalysisPort`, and replace the browser types in the signatures (`AnalyserNode`, `Blob`,
    `CanvasRenderingContext2D`) with domain shapes. `AudioEngine` needs only the transport subset; the
    fake stops needing 25 inert stubs. Do this **before** the next audio feature widens the interface
    further.
32. Test the bake-cache rebuild path and the `scheduleGen` guard. The guard is correct — verified by
    reading — but has zero tests, so the invariant is one refactor from silent breakage.
33. Add a structural `parse(serialize(x)) === x` property test. Seven example-based round-trips exist;
    none would catch a new `Project` field that `normalizeProject` forgets to copy.
34. Rebuild per-tool e2e through the Workshop stations nav. Add at least one test that a Tiled
    hit-area lands where the art is — nothing currently verifies that a kid tapping a pixel emits
    anything.

### Block 6 — Model correctness (two to three days, do after Block 5's tests exist)

35. Convert `Layer` to a discriminated union
    (`LayerBase & ({kind:"drum"; steps} | {kind:"melody"; notes})`). The guards at
    `project-state.ts:341,386,622,646` and `audio-engine.ts:110` become narrowing instead of defensive.
    Same for `LayerPattern` and for `StepNote`'s `roll`-vs-`pins` exclusivity.
36. Make tempo single-writer: delete the three direct `engine.setTempo` call sites, make
    `reconcile`/`start` the sole writer, and stop `resolveClip` from reading the adapter's own bpm as a
    cache-key input.
37. Derive `isPlaying` from the transport rather than shadowing it in `AudioEngine`, so an iOS
    interruption can't leave the train riding silently.
38. Push `activePartId` into `YardScene` from `Yard.tsx` so the selection ring follows reducer-driven
    changes.
39. Hoist `scheduledDestination`'s FX chain to one-per-lane rather than one-per-hit, and add a node-count
    assertion.

### Block 7 — Docs consolidation (one day)

40. Collapse 27 documents to six living docs, each with a single topic, editing in place thereafter:
    `README.md` (what this is), `CLAUDE.md` (agent rules + current state), `PROJECT_CHARTER.md`
    (product & architecture law), `ART_REQUESTS.md` (art direction + queue), `SCENE_AUTHORING_GUIDE.md`
    (how to author a scene), `STATUS_LOG.md` (current state, with its ten open items promoted to
    GitHub Issues — a log is not a tracker).
41. `git rm`: `BUILD_RUNBOOK.md` (destructive if followed), `CLAUDE_PROJECTS_GUIDE.md` (cites three
    nonexistent files), `UI_REFACTOR_DELEGATION.md` (a completed agent prompt), `IMPLEMENTATION_ROADMAP.md`
    (folded into the charter), `ART_BRIEF.md`, `ART_GENERATION_PROMPTS.md`, `ASSET_AUDIT.md`,
    `ASSET_REQUIREMENTS.md`, `STYLE_GUIDE.md`, `SPRITE_SLICING_GUIDE.md`,
    `WORKSHOP_REVAMP_DESIGN.md` (V1), and all of `design/PREMORTEM_*` / `design/PLAN_*` /
    `design/DESIGN_BRIEF*.md` / `design/DESIGN_song-train.md`. Historical rationale lives in `git log`.
42. **Decide E.3.** Train-position-drives-audio or transport-drives-train — write the winner into the
    charter and delete the loser from the other doc. Two governing documents currently specify
    incompatible architectures.

### Ordering rationale

Blocks 0-1 come first because they make every later change verifiable rather than remembered. Block 2
is second because roughly half the audit findings (dead duplication, false doc claims, the hooks bug,
repo weight) are resolved by finishing one deletion. Block 3 is third because it is the only block a
child user can feel today. Blocks 4-6 are ordered by cost curve: duplication multiplies per scene,
tests gate the model refactor, and the model refactor is safe only once the tests exist. Block 7 is
last because docs should describe the code that resulted, not the code that was planned.

---

## Appendix — Claim discipline

**Verified this session (checks executed):** typecheck exit 0; 204 unit tests passing across 14 files;
`git rev-list` behind-count of 8; 47 `_original.png` files present; 238 MB / 50 MB / 59 MB / 987 MB
directory sizes; zero `console.*` in `src`; zero ESLint config with 4 `eslint-disable` directives;
zero `<dialog>` in `src`; zero `version` in `types.ts`; zod imported by exactly one source file;
the `origin/main` delta contents.

**Verified by the audit agents through file reads (file:line cited throughout, not independently
re-executed by me):** import-graph claims, the zero-importer scan, the duplication blocks, the
`scheduleGen` guard's correctness, the EventBus call-site cross-check, the balanced-teardown grep,
the CI run history from `gh run list`.

**Not verified — do not treat as established:** Playwright e2e results (no browser available; counts
are source-derived). `npm run build` was not run. Charter §2.3's Three-Zone rule was not checked
against the maps. Whether the deployed Pages build behaves correctly on a real iPad. Coverage
percentages are LOC-of-tested-modules, not instrumented coverage.

**Terminal step reached:** *audit complete, findings unactioned.* No code in this repo was modified.
