# Chesterton + Premortem — Pitch bend (multi-pin), Capability 3

Decision (from Eric): **multi-pin, BeepBox-style**, bend first, then a separate
drum-rework cycle. Magic Notes stays on (bends snap in-scale). Synth/melody
first; voice-sample bend is a second pass.

Reference: `~/600_apps/beepbox` (cloned, GPL — ideas/math only, re-expressed in
our TS/React + ports idiom, never copied across the boundary).

## What BeepBox does (the grounding)

`synth/synth.ts`: a `Note` has `pitches: number[]` (chord) and `pins:
NotePin[]`, each pin `{ interval, time, size }`. `interval` = semitone offset
from the note's base pitch at `time`; `size` = volume. During playback the synth
**linearly interpolates `interval` between consecutive pins** and converts to a
frequency ratio `2^(Δinterval/12)` (synth.ts:5756, :6023). A swoop is simply a
note whose pins move `interval 0 → +N`. Pin editing + drag ergonomics live in
`editor/PatternEditor.ts` and `editor/EasyPointers.ts`; undo in `changes.ts`.

## Chesterton — what exists here that bend must not break

- **`StepNote { row, length, roll?, slideTo? }`** is the unit for melody + drums.
  `slideTo?` was added last pass as a *reserved, inert* field — the scheduler
  ignores it and **no save ever sets it** (the UI never wrote it). So it is free
  to repurpose: there is no `slideTo` data in the wild to migrate.
- **Pitch is a scale-degree `row`**, mapped to a real note at schedule time by
  the pure `degreeToNote(scaleId, keyId, row)` (`scale.ts`). Magic Notes is
  inherent: any row is in-scale. A bend that targets another *row* is therefore
  automatically in-scale — a kid-friendly constraint BeepBox lacks (it bends
  chromatically). **Keep bend targets as rows, not raw semitones.**
- **`scheduleNote`** currently fires `synth.triggerAttackRelease(note, dur, time)`
  once per (step, row), repeating every "1m". A bend means ramping the synth's
  `frequency` Signal across the note instead of a single fixed pitch.
- **Reschedule-while-playing** + the `scheduleGen` stale-guard + one tracked
  voice per note must survive (same invariants as the last pass).
- **The grid is 7 separate `.melody-row` divs.** A cross-row bend can't live in
  one row; it needs an overlay in the `position:relative` `.melody-grid`.
- **Chords**: a step can hold multiple rows. A bend belongs to *one* note in the
  chord (keyed by its base `row`), exactly like resize/roll.

## The model (multi-pin, in-scale, step-quantized)

Replace the inert `slideTo?` with a pin list:

```ts
interface PitchPin { readonly t: number; readonly row: number } // t = 0..1 of length
interface StepNote {
  row: number;        // base pitch = the pin at t=0 (kept for grid placement)
  length: number;
  roll?: 2 | 4;
  pins?: PitchPin[];  // bend path AFTER the start; absent = flat note
}
```

- A flat note: `pins` absent (today's behavior — zero scheduler/UI change).
- A one-glide swoop (this increment's UI): `pins: [{ t: 1, row: target }]`.
- Multi-pin (next increment's UI): `pins: [{t:.5,row:+2},{t:1,row:0}]` etc.
- Pins are sorted by `t`, `t ∈ (0,1]`, rows clamped to `[0, MELODY_ROWS-1]`
  (in-scale by construction). New pure commands: `addPin / movePin / clearPins`
  (reducers pure; resize/roll preserve pins; **drums never get pins** — guard).

## Build order (two visible increments on ONE model)

1. **Increment A — one-glide bend (deployable, the plan's Capability 3 core).**
   Grab a note's END, drag up/down → sets a single end pin; the scheduler ramps
   to it. Smallest real bend; validates the freq-ramp + gesture + overlay render.
2. **Increment B — multi-pin.** Tap along the note to add interior pins, drag
   them. Same model + scheduler; only adds pin-editing UI.

(Voice-sample bend = `player.playbackRate` ramp, a later pass per the plan.)

## Premortem — assume bend shipped and broke. Why?

1. **Frequency ramp clicks / jumps / wrong pitch.** Tone's `frequency` is a
   Signal; mixing `triggerAttackRelease` (which sets frequency itself) with
   manual ramps fights for the Signal. → *Mitigation:* use `triggerAttack(start,
   time)` + `frequency.setValueAtTime(startFreq, time)` +
   `exponentialRampToValueAtTime(freq(pin), time + pin.t*dur)` per pin +
   `triggerRelease(time+dur)`. Exponential ramp (not linear) so equal pitch
   steps sound even. Pure-test the (row,t)→(freq,when) mapping.
2. **Bend smears the loop / leaks under reschedule.** Ramps scheduled on the
   transport must be torn down by `clearScheduled`. → *Mitigation:* still ONE
   tracked `Synth` per note; the ramp lives inside its single `scheduleRepeat`
   callback and is re-armed each loop; preserve `scheduleGen`. Cancel the
   frequency Signal at the start of each callback (`cancelScheduledValues`).
3. **Roll + bend collide.** A rolled note re-plucks; a bent note ramps. Combined
   they're ambiguous. → *Mitigation:* this pass, **roll and bend are mutually
   exclusive on a note** (setting one clears the other); document it.
4. **Cross-row overlay drifts from the cells.** An absolute SVG line over
   `.melody-grid` must track cell geometry as the grid resizes. → *Mitigation:*
   draw with percentage coords (step/16, row/7) inside the grid, not pixels;
   re-render from state, never cache positions.
5. **Bend on drums.** A drum hit has no pitch; a stray pin would crash
   `degreeToNote` or no-op confusingly. → *Mitigation:* `addPin` is a no-op on
   drum lanes; the UI exposes the bend gesture only on melody notes.
6. **`exactOptionalPropertyTypes`.** `pins`/`roll` set to `undefined`. →
   *Mitigation:* same conditional-spread pattern as `roll`/`swing`.
7. **Migration churn.** None expected (no `slideTo` in saves), but a defensive
   `coerceNote` should drop unknown `slideTo` and validate `pins`. → *Test:* an
   old save with no pins loads flat; a hand-authored pins save round-trips.
8. **Kid can't tell a bent note from a flat one.** → *Mitigation:* the bend
   renders a visible slope + a distinct end-cap; the note keeps its color.

## Regression signals

- A flat-note jam sounds identical to today (no pins → no ramp path taken).
- Editing during playback stays seamless; no Tone "ramp past previous value"
  warnings; no stuck/again-bending voices after several loops.
- Drums never accept a bend.
</content>
</invoke>
