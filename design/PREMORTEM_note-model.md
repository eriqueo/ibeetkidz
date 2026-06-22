# Chesterton + Premortem — Note-model migration (Capability 1)

Scope of this pass: note model (length + roll) for melody **and** drums, Stretch
UX, drum fills (roll), scheduler sustain/subdivide, centering CSS. **Not** in this
pass: bend/slide (`slideTo` is defined but inert), instruments, the Song Train.

## Chesterton's Fence — what the current code already does (don't break it)

Observed facts (no judgment):

- **Melody is already note-like.** A melody lane stores
  `notes: number[][]` — a dense, per-step array where each entry is a *chord*
  (a set of grid-row indices sounding on that step). `[]` = a rest. Magic Notes
  scale-snapping is **inherent**: a row index is a scale degree; `degreeToNote`
  (pure, `scale.ts`) maps any row → an in-scale pitch at schedule time. There is
  no separate "snap" step to preserve.
- **Drums are boolean cells.** A drum lane stores `steps: boolean[]` (length 16).
  `toggleStep` flips a boolean.
- **The outer dense per-step array is load-bearing.** The playhead
  (`getTransportStep`/`stepIndexFromProgress`), `reconcile`, and the grid UI all
  index by step. `scheduleStep`/`scheduleNote` take `(stepIndex, totalSteps)` and
  register one `Tone.Transport.scheduleRepeat(..., "1m", offset)` per active
  cell. Swing leans odd steps late (`swingDelayFraction`).
- **Reschedule-while-playing** = `clearScheduled()` (bumps `scheduleGen`, cancels
  repeats, disposes tracked voices) then `reconcile` re-schedules on the next
  bar. `scheduleStep` is **async** (it `resolveClip().then(...)`) and bails if
  `gen !== this.scheduleGen` — this is the stale-guard; it must survive.
- **Migration seam already exists.** `normalizeProject` + `normalizeNotes`
  already tolerate older shapes (`number | null` legacy melody steps) and
  back-fill missing fields. `makeLayer` builds a complete Layer from partial
  input and is the single construction choke-point (used by reducers,
  `generative.ts`, and every UI call site).
- **`makeLayer({ kind:"drum", steps })`** is how drums are constructed
  (`generative.ts`, `sendToHome`, `addSound`). Keeping `makeLayer` able to accept
  the *old* `boolean[]` for `steps` keeps those call sites untouched.

**The fence:** the dense per-step model, the chord capability, the per-cell
`scheduleRepeat` timing, the async stale-guard, and the tolerant deserialize.
Confidence: **high** (traced end-to-end). Risk if mis-stepped: silent data loss
on load, timing drift, or voice leaks while editing during playback.

## Migration decision — minimal, not a rewrite

The plan sketches `Note = {start, pitch, length, slideTo?, roll?}` as a *sparse*
list. The codebase is *dense per-step*. Rebuilding to a sparse list would churn
the reducers, reconcile, the grid UI, the playhead, and the migration — high blast
radius for no kid-visible gain. Melody is already pitched-per-step; I am **not**
rebuilding what is already note-like.

**Chosen migration: enrich the cell element type in place; keep both fields and
both field names.** One shared note type:

```ts
interface StepNote {
  row: number;       // melody scale-degree (Magic Notes maps it); drums use 0
  length: number;    // steps spanned, >= 1  (Stretch)
  roll?: 2 | 4;      // sub-hits inside the start step; absent = single (fills)
  slideTo?: number;  // FUTURE bend target; defined, NOT honored this pass
}
```

- Melody lane: `notes: number[][]` → `notes: StepNote[][]` (chord per step).
- Drum lane:   `steps: boolean[]` → `steps: (StepNote | null)[]` (one hit/rest).

Why this is the minimal safe shape:

- **Truthiness is preserved.** `steps[i]` was a boolean; now it's `StepNote | null`.
  Every existing `if (on)` / `on ? "on" : ""` / `steps.forEach((on,i)=>…)` check
  keeps working — an object is truthy, `null` is falsy. The *only* boolean-flip
  logic is `toggleStep`'s reducer body, which we rewrite to `null ↔ note`.
- **Chords keep working** (melody stays an array per step).
- **Dense indexing, playhead, swing, and the async stale-guard are untouched.**
- **One note type** for both lanes honors "everything is a Clip / no parallel
  sound representations" without forcing drums to grow phantom chords/pitch.
- **`slideTo` defined now** → save format is forward-stable; the bend pass adds
  only scheduler behavior, no second migration.

New pure commands (reducers stay pure, undoable, RNG-free): `addNote`,
`removeNote`, `resizeNote`, `setRoll`. `toggleStep`/`toggleNote` are **kept** and
adapted (tap-to-place / tap-to-remove). `row` identifies which note in a step
(drums always pass `0`). `length` is clamped to `[1, STEP_COUNT - index]` (a note
can't spill past the bar). `roll` cycles 1→2→4→1 (1 = field removed).

## Premortem — assume it shipped and broke. Why?

1. **A saved jam loads empty / throws.** Old saves carry `steps: boolean[]` and
   `notes: number[][]` (and legacy `number | null`). If `normalizeSteps` /
   `normalizeNotes` miss a shape, a lane silently empties or `deserialize`
   throws on boot (`loadLast`). → *Mitigation:* tolerant coercion for every
   historical shape (boolean → `{row:0,length:1}`, number → `{row,length:1}`,
   object → clamped, null/`false` → empty); unit tests load the **current**
   shapes (`boolean[]`, `number[][]`) *and* the legacy ones and assert the lane
   still has its hits and plays. This is the #1 risk — real IndexedDB saves use
   the current shape.
2. **Playback drifts or a roll lands outside its step.** Sub-hit offset math
   could push hits past the step or accumulate float error. → *Mitigation:* keep
   the existing `stepOffset()` for the base; roll sub-offsets = `k*(stepDur/roll)`
   added to the *callback time* inside one `scheduleRepeat`, never via the repeat
   offset; pure-test the sub-offset helper; clamp note length to the bar.
3. **Voice leak / stale-guard regression while editing during playback.** A
   rolled note must not register N untracked voices. → *Mitigation:* one
   `Tone.Player`/`Synth` per note; roll = N `start`/`triggerAttackRelease` calls
   inside the single tracked `scheduleRepeat` callback (drum roll = fast retrigger
   on one mono Player = the desired machine-gun). Preserve the `gen !==
   this.scheduleGen` bail verbatim in the async `scheduleStep`.
4. **Drum truthiness bug.** A stray `=== true` or `!cell` boolean assumption on
   the new object cells. → *Mitigation:* grep confirmed the only boolean-flip is
   `toggleStep`; all other reads are truthiness. Rewrite `toggleStep` only.
5. **`exactOptionalPropertyTypes` build break.** `roll`/`slideTo`/`swing` set to
   `undefined` explicitly fails the build. → *Mitigation:* follow the existing
   `swing === undefined ? layer : {…layer, swing}` pattern; never write
   `roll: undefined`.
6. **Stretch UI desyncs from state / overlapping notes.** Absolute-positioned
   bars fighting the flex grid, or covered cells still placing notes under a
   note. → *Mitigation:* no overlay bars — a length-L note marks cells
   `i..i+L-1` (head cell carries the drag handle + roll markers; body cells are
   inert "held" cells). Resize computes the step under the pointer from the row's
   `getBoundingClientRect`. Place/remove only on the head/empty cells.
7. **Double-tap-roll vs tap-to-remove collide on drums.** → *Mitigation:* on a
   *placed* drum cell, defer removal ~260 ms; a second tap within the window
   cancels the remove and cycles roll instead. Isolated to drums; melody keeps
   instant tap-to-remove.
8. **E2E can't drive the new gestures headless.** Drag-to-stretch / double-tap. →
   *Mitigation:* generous handle hit-area; e2e drives `mouse.move` in steps and
   `dblclick`; assert on the resulting DOM state (cell count / data attrs).

## Regression signals to watch after merge

- A reloaded jam keeps every hit and still plays (save→reload e2e).
- Editing a lane while the loop plays never stutters or drops the groove
  (reschedule path).
- No `Tone` "start time must be greater than previous" warnings in console under
  rolls.
- `typecheck` clean under `exactOptionalPropertyTypes`.
</content>
</invoke>
