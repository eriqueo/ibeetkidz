---
title: ibeetkidz-work-orders-v2
type: Reference
timestamp: 2026-07-31T00:00:00-06:00
tags: [work-orders, agents, roadmap, execution]
status: active — no blocking decisions; defaults auto-adopt
supersedes: WORK_ORDERS.md
---

# iBeetKidz — Work Orders v2

Rewrite of `WORK_ORDERS.md` after an adversarial review. The v1 spec's research was sound — its
findings and fence table carry over intact. What changed is the shape:

1. **Value-ordered, not purity-ordered.** The child's saved work and the audible bugs come first.
   Internal refactors (dedup, port splits, discriminated unions) move to a do-when-touched backlog.
2. **Defaults with deadlines, not open questions.** Every decision has a recommended default that
   auto-adopts when its ticket starts. Eric can override any of them before then; nothing waits.
3. **A ticket DAG, not serial waves.** Dependencies are per-ticket and file-level. Independent
   tickets never wait on an unrelated wave to close.
4. **Environment-honest acceptance.** Every criterion is labeled AGENT (mechanically checkable in
   the execution environment) or ERIC (manual, on a real device/browser). A ticket closes on its
   AGENT criteria; its ERIC items go to the verification queue in Section E.
5. **The contract is committed.** T0 commits this file. Baselines are recorded in PR bodies, never
   by editing this document. Coordinates below are symbol/grep anchors, not line numbers — the v1
   line numbers were measured 8 commits behind a branch that rewrote a referenced file.
6. **Small tickets.** v1's W3-03 and W6-03 bundled five changes each, violating its own scope rule.
   Split here.
7. **Review budget is a constraint.** Max **2 open PRs** at any time. Eric is one reviewer on a
   side project; a wave of four evidence-laden PRs gets rubber-stamped, which defeats the contract.

---

## Section 0 — Agent contract (carried from v1, amended)

Unchanged and non-negotiable: never assert a check you didn't run this session; completion claims
name the terminal step reached; blast-radius claims state their method; minimum viable fix; second
bugs get written down, not fixed in-branch; one branch per ticket; conventional commits; PR body =
ticket ID + gate output actually run + blast radius with method + fence findings.

**The gate:** `npm run typecheck && npm run test`. E2E where the ticket says so, always with
`PW_PORT=<free>` (unset, a stray Vite on 5173 hijacks the run).

**Baseline:** measured by T0 *after* syncing, recorded in T0's PR body and in a one-line
`BASELINE.md` (count, file count, commit hash). Tickets compare against `BASELINE.md`, which only
T0 and subsequent re-baselines may touch. This spec is never edited to carry state.

**Anchors, not line numbers.** Tickets locate code by symbol name and a grep pattern. If an anchor
doesn't match, that is stop-condition (d) — the base moved; report, don't hunt.

**Amended stop conditions.** Stop and report if: (a) an acceptance criterion is ambiguous, (b) your
change needs a file another *open* ticket owns, (c) an anchor doesn't resolve, or (d) the gate goes
red for a reason your diff doesn't explain. Ownership is per-ticket (each ticket lists its files);
there is no wave-level map to go stale.

**Live-repo protocol (new).** Eric develops on this repo concurrently. Before starting any ticket:
`git fetch && git rebase origin/main`, re-run the gate, and re-verify your anchors. If `origin/main`
moved under an open PR, rebase before requesting review. A ticket open longer than a week is
presumed stale — re-anchor or close it.

**Chesterton's Fence.** Section B carries the completed fence findings. Touching uncovered code
means running the pass yourself (`git log -S`, file header) and stating findings in the PR.

---

## Section A — Decisions: defaults that auto-adopt

Each decision has a default. The default **becomes the decision when the first ticket citing it
starts**, unless Eric has overridden it here first. Nothing in this plan is blocked on a human
answer. (v1 had 5 decisions + 9 Phase-4 questions gating the pipeline; that is how specs die in
draft.)

| ID | Question | Default (auto-adopts) | Cited by |
|---|---|---|---|
| A1 | Visualizer | **Park untouched.** It's a README-stated pillar and a port's only implementation. Deleting it is product surgery, not cleanup. Re-home into Phaser as a backlog item; README gets one honest sentence ("visualizer is being re-homed into the Track"). | M2, D1 |
| A2 | ESLint | **Install** (`typescript-eslint` + `react-hooks`, `npm run lint` in CI). The hooks rule catches the exact bug class live in `Shell.tsx`. | S2 |
| A3 | Art pipeline | **Re-home, don't police.** The size-guard framing was wrong: `ar015/` is the *tip commit* — reference batches are Eric's active workflow, and the slicing scripts read repo paths. Default: move art inputs to `art/` (repo root, gitignored), repoint the scripts, and add a CI *warning* (not a block) on binaries >2 MB under `src/`. History rewrite: **no** — accept the 987 MB, stop adding to it. | M3 |
| A4 | E.3 architecture | **Transport drives train.** It's built, gapless, and jitter-free; frame-driven audio triggering is a known timing hazard. D2 writes it into the charter and deletes E.3 from the roadmap. | D2 |
| A5 | Palette | **Decide by looking, not by refactor.** No generator work until Eric does a side-by-side of nintendo-palette vs. current gruvbox (B1, a 30-minute ERIC task). The v1 recommendation shipped a whole-app visual change as a refactor side effect. `design-tokens.json` (synthwave, unused, contradicts charter) is deletable now. | backlog |

Answers to v1's nine Phase-4 open questions, folded into defaults so they gate nothing:
F1-1 newer-save-in-older-code → **refuse with a kid-legible message** (best-effort parsing of a
future format is how saves corrupt). F1-2 Result type → **hand-rolled discriminated union** (no new
dependency for one boundary). F1-3 history snapshots → **inherit the project's version** (they
serialize the same shape). F2 and F3's questions die with their tickets moving to backlog; F4's die
with A5.

---

## Section B — Fence findings (carried verbatim from v1; done, do not redo)

| Target | Intent | Verdict |
|---|---|---|
| `src/game/press.ts` | Deliberate shared abstraction, written, never adopted. Header defines scope: objects that draw their own pixels; transparent hit-areas use fill-flash by design. | **Adopt, don't delete.** Two idioms, not one. |
| `src/visualizer/**` + `VizPanel.tsx` + `renderer-port.ts` | Only `RendererPort` impl; README-headline pillar. | **Park** (A1 default). |
| `src/app/use-viewport.ts` | `usePhoneLayout` still *called* in `Shell.tsx` above the returns; result consumed only in dead code. | Reachable-but-useless. Delete call + file in the same commit. |
| `src/components/PixelButton.tsx` | DOM-era button superseded by sprites. | Safe to delete. |
| `src/machines/tools.tsx` | v1 registry; `laneColor` is the only live export. | Delete after `laneColor` moves to core. |
| `slice_sprites.py` | Hardcodes `/home/ubuntu/...`; cannot run here. Outputs unreferenced. | Safe to delete. |
| `pnpm-lock.yaml` / `pnpm-workspace.yaml` | Workspace file is an unfilled prompt; never real. CI uses `npm ci`. | Safe to delete. |
| `src/assets/{sprites-v2,references}/**`, `art_gen/**` | Zero *code* references, but they are pipeline **inputs** (see A3) — `pack-sprites.py` / `gen_workshop_sprites.py` read some. | Relocate per A3, then delete from tree. Not before. |

**New fence finding (this review):** `src/assets/spritesheets/ar015/` — 32 loco reference PNGs,
~120 MB, tip of `origin/main`, one day old. This is the input batch for the in-flight loco sprite
pass. It is *evidence for* A3's re-home default and **must not** be deleted by M3 until the loco
pass consumes it or Eric releases it.

---

## Section C — The plan

Three tracks plus a backlog. Tracks are labels, not barriers — the only ordering law is each
ticket's listed `needs:`. Max 2 open PRs across all tracks.

```
T0 ──┬── S1 CI gate          ──┐
     ├── S2 arch test + lint   ├── S5 save format ── S6 storage suite
     ├── S3 bpm cache bug      │
     ├── S4 boot surfacing  ───┘
     ├── M1 v1 shell delete ── M2 README truth (D1)
     ├── M3 art re-home
     └── D2 charter/CLAUDE.md sync   (docs follow code, never run ahead of it)
```

### T0 — Ground truth *(one agent, first, alone)*

Files: repo root, `BASELINE.md` (new).

1. `git pull` (local `main` is 8 behind; the delta rewrote `tone-sound-port.ts` +330 for raw-mic
   capture, added `wav.ts`, `send-panel.ts`, hardened `playwright.config.ts`, +3 tests).
2. `git rm pnpm-lock.yaml pnpm-workspace.yaml` (fence: safe).
3. Run the gate; write `BASELINE.md` (unit count, file count, commit).
4. **Commit `WORK_ORDERS_v2.md`** and delete `WORK_ORDERS.md`; `AUDIT_AND_ROADMAP.md` survives
   until D3 folds it into the vault. (Both are currently *untracked* — the v1 contract did not
   exist in any branch, clone, or worktree.)
5. **Probe the environment and record it in `BASELINE.md`:** can this environment run
   `npm run test:e2e` (is a browser present)? Can it reach GitHub Actions (`gh` auth)? Every
   downstream ticket's AGENT/ERIC split assumes this record.

Accept (AGENT): `git rev-list --left-right --count origin/main...main` → `0 0`; gate green;
`ls pnpm-*` → nothing; `BASELINE.md` exists with all five facts; this file in `git log`.

---

### Track S — Safety: the child's work and the audible truth

**S1 · Gate the deploy on e2e** · needs T0
Files: `.github/workflows/**`.
`build-and-deploy.yml` deploys without e2e; `test.yml` has no dependency edge — broken code has
shipped twice (runs `28759519651`, `28759353276`). Make deploy `needs:` the e2e job.
Accept (AGENT): workflow file shows the dependency edge; if `gh` is available per T0's probe, push
a deliberately failing branch and cite the run ID. (ERIC, if not): confirm one red-e2e branch fails
to deploy.

**S2 · Architecture test + ESLint** · needs T0 · adopts A2
Files: `tests/unit/architecture.test.ts` (new), `eslint.config.js` (new), `package.json`.
The five source-text assertions from v1 (core/ports never import adapters; `from "tone"` only in
`tone-sound-port.ts`; no `Math.random` in src; no network verbs in src; React only under
`App.tsx`/`main.tsx`/`components/`/`app/`) — assertion 5 ships `.skip`ped, `// UNSKIP IN M1`.
ESLint per A2. **Red-then-green proof required:** seed each violation, watch it fail, revert;
evidence in the PR body. A check that has never failed has never been tested.
Accept (AGENT): 4 pass 1 skip; `npm run lint` exit 0; lint added to both workflows; PR shows five
seed runs.

**S3 · Fix the resolveClip bpm cache key** · needs T0 · *promoted from v1's W6-03 grab-bag*
Files: `src/adapters/tone-sound-port.ts`.
Anchor: the cache-key derivation in `resolveClip` that reads `Tone.getTransport().bpm`. A stale bpm
caches a wrong-length baked buffer under a wrong key — this is a live, audible playback bug, and v1
had it scheduled last, behind two refactor waves. Take tempo as an explicit argument from the
engine (the single writer) instead of reading transport state.
Fence note: run the pass on why the read was written this way before changing it.
Accept (AGENT): gate green; a unit test that bakes at bpm A, changes tempo to B, and asserts the
re-bake keys differ. **Scope: this one bug.** The other four W6-03 items go to backlog as four
separate entries.

**S4 · Boot honestly** · needs T0 · *v1's W3-03 split: this is the boot half only*
Files: `src/components/BootGate.tsx`, `src/app/context.tsx`.
(1) Wrap `BootGate.start` in try/catch with a kid-legible failure state + retry — today a rejection
leaves `busy === true` and a dead "TAP TO START" forever. (2) Validate at boot: `AudioContext`
constructible, `localStorage`/`indexedDB` reachable (Safari private mode throws). (3) Surface
`QuotaExceededError` — it's thrown twice and caught nowhere; a full device silently stops saving.
Accept (AGENT): gate green; jsdom tests for the three failure paths. (ERIC): block
`AudioContext.resume` in devtools → visible error + working retry.
Deferred to backlog from v1's bundle: the `?diag` ring buffer, the persist blob-skip optimization.

**S5 · Version and parse the save format** · needs S2 (the arch test guards the boundary)
Files: `src/core/project-schema.ts` (new), `src/core/project-state.ts`, `src/core/types.ts`,
`tests/unit/project-state.test.ts`, `tests/fixtures/**` (new).
v1's F1, Phases 0–3 stand as written and are **approved with the Section A answers** (refuse newer
versions with a message; hand-rolled Result; history inherits version). Invariant: everything
crossing the persistence boundary is parsed exactly once, at the boundary; `normalizeProject`
becomes the frozen version-0 branch, no new sniffs ever. zod (already a dependency, proven in
`TiledParser`) — no second validator. Capture a **real** pre-v2 save from a browser as a fixture;
every existing migration fixture is hand-typed from memory.
Accept (AGENT): gate green; corrupt-save fixture yields a typed failure S4's UI can render;
round-trip property test — adding a `Project` field without updating the parser fails (demonstrate,
revert). (ERIC): load an actual old save on a real device.

**S6 · StoragePort: delete, don't swallow** · needs S5
Files: `src/ports/storage-port.ts`, `src/adapters/local-storage-port.ts`, contract tests (new).
(1) Add `deleteBlob(id)` — there is currently no way to delete a blob, and `deleteProject` is
called from nowhere. (2) Retention rule in the port doc: blobs unreferenced by project *and*
history are collected on save (undo history means "deleted" recordings must outlive the delete —
that's why both clauses). (3) Stop `readIndex()` swallowing: a parse failure currently returns `{}`
and silently discards every saved project — return a typed failure. (4) Contract suite runs against
`LocalStoragePort` and a fake (jsdom + `fake-indexeddb`).
Accept (AGENT): both implementations pass the same suite; the corrupt-index path surfaces; every
surviving bare `catch` in the adapter has a why-comment.

**S7 · Cap the recording** · needs T0
Files: `src/adapters/tone-sound-port.ts` (post-rebase — origin rewrote this function).
`MAX_RECORD_SEC` auto-stop in `startRecording`; a resting finger currently records until release,
then decodes and normalizes the whole thing in memory.
Accept (AGENT): gate green; e2e mic specs green if the environment has a browser, else (ERIC).

**S8 · Verify the thing kids actually touch** · needs S1 · *new; v1's biggest omission*
Files: `tests/e2e/` (one new spec), none in `src/`.
The audit's appendix admits the deployed Pages build has never been verified on a real iPad — then
v1 scheduled twenty tickets without a device check. (1) Add one Playwright spec that runs against a
**built** `dist-gh/` served without a trailing slash (catches the `BASE_URL` bug class); (2) an
ERIC checklist: on a real iPad — boot, record, hear it back through the silent switch, save,
reload, still there.
Accept (AGENT): the built-artifact spec green in CI. (ERIC): the iPad list, once, results noted in
the PR.

---

### Track M — Migration debt (the deletions)

**M1 · Delete the v1 shell** · needs S2
Files: `src/machines/**`, `src/components/Shell.tsx`, `src/components/PixelButton.tsx`,
`src/app/use-viewport.ts`, `src/core/lane-color.ts` (new), `src/components/Workshop.tsx` (import
line only).
Move `laneColor` to core; repoint Workshop. Delete `tools.tsx`, `PixelButton.tsx`,
`use-viewport.ts`; collapse `Shell.tsx` to the four-way switch, removing the `usePhoneLayout()`
call **in the same commit** (fence: reachable-but-useless). The hooks-after-return violation dies
with it. **Un-skip S2's React assertion — that is the proof.**
Accept (AGENT): gate + e2e green (`PW_PORT` pinned); the un-skipped assertion passes;
`grep -rn "TOOLS\b" src` → 0.

**M2 · Visualizer disposition** · needs M1 · adopts A1
Files: `README.md` (one sentence), backlog entry.
Per A1 default: park the code untouched; README's visualizer sentence becomes honest ("being
re-homed into the Track view"); backlog gains "re-home visualizer into Phaser via the existing
analyser tap." Fix `visualizer.ts`'s unbalanced `visibilitychange` listener since the code lives.
Accept (AGENT): gate green; README contains no claim contradicted by the tree.

**M3 · Re-home the art pipeline, then evict** · needs T0 · adopts A3
Files: `src/assets/{sprites-v2,references,scenes-v2-sliced}/**`, `art_gen/**`, `slice_sprites.py`,
`scripts/pack-sprites.py`, `scripts/gen_workshop_sprites.py`, `.gitignore`, CI warning step.
Order matters: (1) create gitignored `art/`; (2) move `references/`, `sprites-v2/` sources,
`art_gen/` into it; (3) repoint the two scripts that read them as inputs; (4) run the scripts once
to prove the pipeline still produces identical outputs (hash the atlases); (5) delete
`slice_sprites.py` (fence: cannot run); (6) add the CI size *warning* per A3.
**Do not touch `src/assets/spritesheets/ar015/`** — Section B: it is the in-flight loco input
batch. Leave a `TODO(eric)` to release it after the loco pass.
Accept (AGENT): atlas hashes identical pre/post move; gate + e2e green; `du -sh src/assets` down
≥340 MB excluding `ar015`; warning fires on a seeded 5 MB PNG.

---

### Track D — Docs (follow the code; never run ahead of it)

v1 let W7 run "concurrently with any wave," which guarantees docs describing code mid-deletion —
and had two tickets editing README simultaneously. Docs land *after* the code they describe.

**D1 · README truth** · needs M1, M2 — rewrite Status: Map is the landing (not Home), Phaser
exists (the largest dependency is currently unmentioned), visualizer sentence per M2.

**D2 · CLAUDE.md + charter sync** · needs M1 — fix the three verified-false claims (`_original`
dupes, `LoopTrack` reuse, stale test counts — cite `BASELINE.md`); write A4's answer (transport
drives train) into the charter; delete E.3 from `IMPLEMENTATION_ROADMAP.md`.

**D3 · Fold and delete the scratch** · needs D1, D2 — v1's R8 deleted the audit outright; the
fence table and A-decision rationale are exactly what the next Chesterton pass needs. Fold Section
A decisions + Section B table into the brain vault and `PROJECT_CHARTER.md`'s decision log, promote
STATUS_LOG's open items to GitHub Issues, collapse the 27 docs per the audit's Block 7, **then**
delete `AUDIT_AND_ROADMAP.md` and this file.

---

## Section D — Backlog (deliberately unscheduled)

Do these when their files are already open for another reason, or when Eric promotes one. Each
carries its v1 refinement work so nothing is lost — but none of them blocks anything, and most of
v1's Waves 4–6 lives here on purpose: they are investments in a long future this project has to
earn first.

- **Scene dedup** (v1 W4-02): promote chrome preload/spawn/layout into `BackgroundScene`; extract
  the LCD chip; **adopt `press.ts`** per its own header's two-idiom boundary.
- **React shell dedup** (W4-03): `SceneView`/`Toast`; `canEnter(view, project)` selector in core;
  tempo ranges from `MIN_BPM`/`MAX_BPM`.
- **Car-type manifest derivation** (W4-04) **including the `BASE_URL` fix** — if S8's
  built-artifact spec catches the atlas 404 first, promote this immediately.
- **Palette unification** (F4): blocked on the A5 side-by-side. Generator design as v1 wrote it.
- **`Layer` discriminated union** (F2) and **`SoundPort` split** (F3): Phases 0–3 as v1 wrote
  them; do F2 only after the S5 round-trip property test exists (it's the safety net), F3 only
  when the port next needs a new method anyway.
- **W6-03 remainder, unbundled:** tempo single-writer; derive `isPlaying` from transport (iOS
  interruption leaves the train riding silently — promote if a kid-visible report ever comes in);
  `activePartId` push into `YardScene`; per-lane FX-chain hoist.
- **`?diag` ring buffer + persist blob-skip** (from v1 W3-03).
- ~~**Re-home the visualizer into Phaser via the existing analyser tap** (from M2).~~ **DONE
  2026-08-01.** It is a jumbotron in the middle of the Track's oval
  (`src/game/scene-visualizer.ts`), fed by `engine.getAnalyser()` pushed in from React. The three
  `VisualStyle`s are unchanged — only the host moved, which is what A1's "park it, don't delete
  it" was protecting. `VizPanel.tsx`, `src/visualizer/visualizer.ts`, the `RendererPort`
  interface and the `.viz-*` CSS are deleted; README and CLAUDE.md updated in the same change.
  Two defects were found and fixed on the way, both invisible in code review and both now pinned
  by tests: gating on raw RMS made the screen strobe once per note (rests are not silence — it
  uses a peak-hold envelope), and a linear FFT sweep put a kid's whole melody in the first two
  bars (`src/visualizer/spectrum.ts` does log-spaced bands, peak per band).
- ~~**Deep per-tool e2e through the Workshop stations nav** (W5-04).~~ **DONE 2026-08-01** —
  `tests/e2e/tool-panels.spec.ts`. Until then the only assertion on any panel was that it OPENS,
  which is how eight instrument characters shipped two sessions ago with their actual work
  unexercised. Beat Maker, the Melody Editor (notes, ×2 roll, deck knobs) and the open/close walk
  run on CI; pads + Magic Pad are a hardware-audio skip, because a pad tap has no state outcome —
  its whole job is to make a noise.
- **SoundPort transport contract tests** (W5-02).

---

## Section E — Eric's verification queue

Accumulated ERIC items, batchable into one session each:
1. (S4) Devtools: block `AudioContext.resume` → visible error, working retry.
2. (S5) Load a real pre-v2 save on a real device.
3. (S8) iPad pass: boot → record → silent-switch playback → save → reload → still there.
4. (A5/B1) 30-minute side-by-side: nintendo palette vs current gruvbox. Pick one. Unblocks F4.
5. (S1, only if the agent environment lacks `gh`): confirm a red-e2e branch doesn't deploy.

## Section F — Merge protocol

1. One branch per ticket; PR into `main`; `main` stays deployable (S1 makes that mechanical).
2. **Max 2 open PRs.** Order within the DAG is by readiness, not ticket ID.
3. Rebase over `origin/main` before requesting review — Eric ships features on this repo weekly;
   the plan assumes a live base, not a frozen one.
4. PR body: ticket ID, gate output actually run, blast radius with method, fence findings, and any
   criterion labeled unverified with what would verify it.

## Appendix — What changed and why (objection → mitigation)

| Objection to v1 | Mitigation here |
|---|---|
| Purity-ordered; live audio bug scheduled last; no device check anywhere | S3 promoted; S8 added; W4/W6 → backlog |
| 14 decisions gate the pipeline; spec born "blocked" | Defaults auto-adopt (Section A); zero blocking questions |
| Accept criteria unclaimable in the execution environment | T0 environment probe; AGENT/ERIC split; Section E queue |
| Contract untracked, self-mutating, line-number anchors 8 commits stale | T0 commits it; `BASELINE.md`; symbol anchors; stop-condition (c) |
| Serial waves batch-block a loose DAG; idle agents | Per-ticket `needs:`; tracks are labels |
| Size guard fights the active art pipeline (`ar015` is tip-of-main) | A3 reframed re-home; warning not block; ar015 protected in Section B |
| W3-03/W6-03 violate the spec's own scope rule | Split into S3, S4, S6, S7 + four backlog entries |
| One reviewer, four parallel evidence-heavy PRs | Max 2 open PRs; docs trail code (Track D) |
| R8 deletes the rationale with the scratch | D3 folds decisions into charter + vault first |
