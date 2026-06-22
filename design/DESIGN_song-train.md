# Design — the Song Train (Capability 4)

**Status: design only (Eric's call — react before building).** Decisions locked:
a car = **a full independent loop** (BeepBox-style, repeatable). This is the
biggest/riskiest capability; this doc is the Chesterton + premortem + plan to
react to, not a build.

## BeepBox grounding (what "like beepbox" means)

`synth/synth.ts`: a `Song` is **channels × bars**. `Channel` has reusable
`patterns: Pattern[]` and `bars: number[]` (each bar references a pattern index;
0 = empty). `Pattern` is just `notes: Note[]`. The timeline plays bar 0..barCount;
at each bar every channel plays its referenced pattern. `loopStart/loopLength`
mark a loop region. **Repeating = several bars pointing at the same pattern.**

That channel×bar×pattern matrix is powerful but complex. For the toy we collapse
it: **a "car" = a whole loop (all lanes at once)**, not a per-channel pattern.
Reuse "like beepbox" = the same car appears more than once in the arrangement
(each instance in its own color). Simpler, fewer concepts, same feel.

## Chesterton — the fence the Song Train moves

- **`Project` IS a single loop today.** `Project.layers` lives at the top level;
  **every layer-mutating reducer** (`addLayer`, `toggleStep`, `toggleNote`,
  `resizeNote`, `setRoll`, `addPin`, `tuneDrum`, `setLayer*`, `removeLayer`…) maps
  over `state.layers`. `clips` is a top-level shared map. `scale/key/swing/tempo`
  are song-wide.
- **The scheduler loops ONE bar forever.** `reconcile` schedules each active layer
  with `Tone.Transport.scheduleRepeat(…, "1m")`; `getTransportStep` reads the bar
  position for the playhead. There is no concept of "next section."
- **Edit-while-playing** = `clearScheduled` (bumps `scheduleGen`) + `reconcile` on
  the next bar. This machinery is exactly what car-to-car switching needs.
- **Save/load** round-trips the flat `Project`; `normalizeProject` back-fills.
- **Undo** snapshots the whole `Project` (history is Project-level).

Confidence: high (built all of it this week). Risk if mishandled: every reducer +
test touches `layers`, so a careless refactor breaks the whole app at once.

## Data model — Project gains parts + arrangement

```ts
interface Part {                       // one "car" = a full independent loop
  readonly id: string;
  readonly name: string;               // "Verse" / "Chorus" — editable, tellable
  readonly color: string;              // the car's color in the Tracks strip
  readonly layers: readonly Layer[];   // the loop's lanes (today's Project.layers)
}
interface ArrangeCar {
  readonly partId: string;
  readonly repeats: number;            // 1 | 2 | 4 — how many times before advancing
}
interface Project {
  readonly id; name; tempoBpm; scaleId; keyId; swing;  // SONG-WIDE (unchanged)
  readonly clips: Record<string, Clip>;                // SHARED across all cars
  readonly parts: readonly Part[];                      // NEW (was: layers)
  readonly arrangement: readonly ArrangeCar[];          // NEW — the song order
  readonly activePartId: string;                        // which car Home edits
  readonly activeMachineId: string;
}
```

- **Clips stay shared at the Project level** — a recording or drum clip can appear
  in many cars; we don't duplicate audio per car.
- **`scale/key/swing/tempo` stay song-wide** — the whole train shares a groove
  (kid-simple; no per-car key changes in v1).
- **Today's single loop migrates to ONE car:** `parts:[{id,name:"Loop 1",color,
  layers: <old layers>}]`, `arrangement:[{partId, repeats:1}]`, `activePartId` =
  that part. A pre-train save (flat `layers`) deserializes into exactly this. So
  **a one-car song behaves identically to today.**

### Reducers retarget to the active car
Add one helper `editActivePart(state, fn)` that maps `fn` over the active part's
`layers` and writes it back. Every existing layer command becomes a one-line
change (operate on the active part instead of `state.layers`). New commands:
`addCar / removeCar / selectCar / renameCar / setCarRepeats / reorderCars`.
History stays Project-level, so undo already covers both loop edits and
arrangement edits.

## Transport — riding the arrangement (the hard part)

**Chosen approach: cursor + per-bar reschedule (reuse what we have).** Keep the
1-bar loop engine; add an *arrangement cursor* the transport drives:

- Track `(carIndex, repeatsDone)`. At each **bar boundary**, if the current car's
  `repeats` are exhausted, advance the cursor (wrapping at song end); then
  `clearScheduled()` + `reconcile(currentCar)` — the SAME seamless swap we already
  do on edits, now triggered by the cursor instead of a keystroke.
- The bar boundary is detected from the transport position (we already compute it
  for the playhead). Single-car song → cursor never advances → byte-identical to
  today.

Rejected: laying the whole song on one Tone timeline (Tone.Part). Cleaner gapless
playback, but abandons our live-reschedule model and "edit the current car while
it plays," and is a bigger leap. Revisit only if per-bar swaps prove audibly seamy.

## UX — Home edits a car; Tracks arranges them

- **Home is unchanged** — it always edits the **active car**. With one car, the app
  looks exactly like today (Tracks never appears).
- **"🚂 Send to Tracks"** on Home: promotes the current loop into the arrangement.
  First use creates Car 1 (today's loop); **"+ New Car"** appends a fresh empty car
  and opens it in Home to build.
- **Tracks strip** (new region, shown only when ≥2 cars): cars left→right as
  colored blocks showing their name + repeat count. Tap a car = **open it in Home**;
  a small ×1→×2→×4 control = repeats (repeats share the car's color); drag to
  reorder; **▶ Ride** plays the whole song through the arrangement.
- Progressive disclosure: nothing about trains shows until the kid sends a 2nd car.
- Copy stays on-theme: cars, repeats, "ride the song," "All aboard!"

## Premortem — assume it shipped and broke. Why?

1. **The parts refactor breaks everything at once** (every reducer/test touches
   `layers`). → *Mitigation:* **Increment 0 is an invisible refactor** — wrap the
   single loop in one car, retarget reducers via `editActivePart`, keep ALL
   existing tests green with zero behavior change. Land that alone before any UX.
2. **Audible seam at car boundaries.** clearScheduled+reconcile on the bar line
   could click or drop a beat. → *Mitigation:* reuse the proven seamless swap;
   schedule the next car slightly ahead of the boundary; test bar-accurate timing;
   keep `scheduleGen` discipline.
3. **Save/load of the new shape.** parts + arrangement + shared clips; old flat
   saves must become one car. → *Mitigation:* tolerant `normalizeProject` wraps
   legacy `layers`→one part; round-trip tests for both shapes.
4. **Dangling `activePartId` / empty song.** Deleting the active car. →
   *Mitigation:* deleting selects a neighbor; enforce ≥1 car always.
5. **Clip lifecycle across cars.** A clip used by several cars must not vanish when
   one car is deleted. → *Mitigation:* `removeCar` drops the car only; a clip is
   removed only when NO car references it (or kept harmlessly). Test it.
6. **CPU.** Songs could mean more lanes total — but only ONE car plays at a time,
   so simultaneous voices stay bounded by per-car `MAX_LAYERS`. Good.
7. **Scope creep / half-built giant.** This is the biggest capability. →
   *Mitigation:* three increments, each deployable: **Inc 0** invisible refactor →
   **Inc 1** Send to Tracks + New Car + sequential ride (no repeats) → **Inc 2**
   repeats + drag-reorder + colors + polish.
8. **Undo confusion across loop vs arrangement edits.** → Project-level history
   already unifies them; one Undo stack covers both. Verify in an e2e.

## Open questions for Eric (before Inc 0)

- **Empty-car default:** when "+ New Car" makes a car, start it blank, or
  pre-seed a copy of the current car so the kid tweaks a variation? (BeepBox starts
  blank; "duplicate then change" is often friendlier.)
- **Tempo/key per car:** confirm song-wide is fine for v1 (recommended), or do you
  want a car to be able to change speed/key?
- **Tracks placement:** a new bottom strip (above the play bar) on Home, or a
  separate "Tracks" tool in the left palette?
- **Repeat caps:** ×1/×2/×4 enough, or want ×8?
</content>
