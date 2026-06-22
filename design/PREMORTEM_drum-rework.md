# Chesterton + Premortem — Drum rework

Eric wants all four: **sustained length**, **richer rolls**, **more drum
sounds**, **tune/pitch drums**, with **fuller / more realistic** synthesis. Stays
procedural (no binary assets — offline). Ships in two deployable increments.

Reference: BeepBox drumset = pitched noise + a short fade envelope ("loud but
brief", `SynthConfig.drumsetBaseExpression 0.45`, `drumsetFadeOutTicks 48`).

## Chesterton — what exists, what must not break

- **Drums are DATA** (`sound-catalog.ts`): `BuiltinSound { assetId, label, emoji,
  color, recipe }`; `DrumKind = kick|snare|hihat|clap|tom|cowbell`. The adapter's
  `synthesizeDrum(kind)` renders a **fixed-length** AudioBuffer per kind at boot
  (`loadBuiltins`), cached under `builtin:<assetId>`. Adding a sound = one catalog
  entry + one synth branch (the file says so).
- **Saved beats reference drum `assetId`s** (`beat-kick`, …) in clips + layers,
  and the generative beat + Beat Maker seed those ids. **Renaming/removing an
  existing DrumKind breaks saves and `generative.ts`.** → only ADD kinds.
- **Playback:** `scheduleStep(clip, i, total, opts, length, roll)` resolves the
  clip → buffer (`resolveClip`/`resolveSource`) and plays it via `Tone.Player`
  through the per-lane tone/echo chain; `length` is currently ignored (the wart);
  `roll` fires N equal sub-hits. The async `scheduleGen` stale-guard + one tracked
  voice per note must survive (same invariant as the last two passes).
- **A drum hit is `StepNote { row:0, length, roll? }`** — `row` is unused for
  drums. **Repurpose `row` as the drum's pitch/tune** (semitone offset): no model
  change, and `degreeToNote` is never called for drums so nothing else reads it.
- **Voice/Magic recordings also flow through `scheduleStep`** (a recording sent to
  Home is a drum-kind lane). Those are `source.kind:"recording"` — the parametric
  drum synth must NOT touch them; only `builtin` drum sources get re-synthesized.

## Architecture — a parametric drum voice (covers all four asks)

Rewrite `synthesizeDrum` as `synthDrum(kind, { durationSec?, pitch? })` returning
a buffer. Inc 1 calls it with per-kind defaults (today's behavior, fuller sound).
Inc 2 threads real `durationSec` (= length·stepDur) and `pitch` (= the hit's
`row`) and caches buffers by `(kind, durBucket, pitchBucket)` so `scheduleStep`
renders length/pitch-aware drums on demand (cheap — a Float32Array). Roll gets a
velocity ramp (crescendo) + may span the whole note.

- **Length** → longer envelope/decay (tonal drums ring; noise sustains).
- **Pitch** → scale the tonal component's base frequency by `2^(row/12)`.
- **Rolls** → `subHitOffsets` already spreads hits; add a rising gain per sub-hit
  and an option to spread across `length` steps, not just the first.
- **More sounds** → new `DrumKind`s (openhat, rim, shaker, conga…) = catalog +
  synth branches, APPENDED.

## Increments

1. **Fuller synthesis + palette** (this deploy): parametric `synthDrum` with
   richer recipes (layered tone+noise, better envelopes), new kinds appended.
   Fixed-length usage (defaults). No scheduler/model/UI change → lowest risk,
   immediately audible.
2. **Parametric depth**: thread length→duration + `row`→pitch through
   `scheduleStep`/reconcile; velocity-ramped rolls; a drum **tune** gesture
   (vertical drag on the drum handle sets `row`, shown as a pitch badge). On-demand
   buffer cache.

## Premortem — assume it shipped and broke. Why?

1. **A saved beat goes silent / wrong.** A changed/removed `assetId` or a synth
   branch that throws. → *Mitigation:* only ADD kinds; keep every existing id +
   label; a `default` synth branch returns silence, never throws; unit-test that
   every catalog `DrumKind` has a branch and renders a non-empty, finite buffer.
2. **Recordings get re-synthesized as drums.** → *Mitigation:* parametric path is
   keyed on `source.kind === "builtin"` only; recordings keep resolving to their
   decoded buffer. Test the guard.
3. **On-demand rendering (Inc 2) stutters / leaks.** Synthesizing inside
   `scheduleStep` on every reschedule. → *Mitigation:* cache by
   `(kind,durBucket,pitchBucket)`; bucket duration/pitch coarsely so the cache
   actually hits; render is pure + fast; still one tracked Player.
4. **Boot slower / louder.** More + richer drums at `loadBuiltins`. →
   *Mitigation:* keep per-buffer synthesis O(samples); peak-normalize so new
   drums sit at a sane level; spot-check boot time.
5. **Tune UX confuses (Inc 2).** A drum lane is ONE visual row, so "drag up/down
   to pitch" has no grid to map to. → *Mitigation:* vertical drag on the drum
   handle adjusts `row` by a clamped semitone range and shows a "+3"/"-2" badge +
   a small up/down nudge; document; revisit if it doesn't feel right.
6. **`clap`/`hihat` length is meaningless.** Sustaining a transient noise sounds
   odd. → *Mitigation:* length maps to decay only where musical (kick/tom/
   cowbell/conga/openhat); short transients cap their decay and mostly ignore
   length. Honest, documented.
7. **exactOptionalPropertyTypes** on the new params. → conditional spreads.

## Regression signals
- Every existing saved beat still plays, same ids, similar levels.
- Boot time unchanged within reason; no clipping on the new drums.
- Recordings sent to Home still play their take, not a synth drum.
</content>
</invoke>
