# Plan — stretch/bend notes, pick instruments, chain loops into a song

Goal: the BeepBox/UltraBox feel (hold a note, swoop it, choose instruments, build
a real song out of loops) — kid-simple, train-themed, Magic-Notes-forgiving.
No mascots.

## The foundational shift (unlocks stretch, bend, fills, instruments)

Melody (and now drums) move from on/off grid cells to **note objects**:

```
Note = { start: step, pitch: scaleDegree, length: steps,
         slideTo?: scaleDegree,   // bend / swoop
         roll?: 1 | 2 | 3 | 4 }   // sub-hits inside one step (drum fills)
```

- New pure commands: `addNote, removeNote, moveNote, resizeNote, slideNote,
  setRoll`. Reducers stay pure; drum lanes use the same notes (so fills + stretch
  work there too).
- Scheduler (adapter): play a note pitched for its length, with an optional pitch
  ramp (slide) and optional sub-step roll (fill).
- Migration: existing boolean cells → length-1 notes.
- **Magic Notes stays on**: pitches snap to scale on place / resize / slide.

## Capability 1 — Stretch (and drum fills) · do first

- **Kid UX (melody + sustained sounds):** tap to drop a note; grab its right edge
  and drag to **stretch** it ("pull it like taffy"); tap to remove. Fat handles,
  snaps to steps.
- **Kid UX (drums):** drag to stretch a sustained drum; **double-tap a drum cell
  to make it ROLL** — cycles 1 → 2 → 4 hits inside that step, so you get 1/16
  fills without any math. ("Tap-tap to roll!")
- **Tech:** `note.length` + `note.roll`; scheduler sustains / sub-divides.
- **Risk:** low–medium.

## Capability 2 — Choose instruments · do with/after stretch

- **Kid UX:** each melody lane gets an instrument picker — **"🚂 Choo-choo-CHOOSE
  your instrument!"** Pick from a few friendly voices (e.g. marimba, piano, bells,
  flute, the classic synth). Live preview on tap.
- **Tech:** add `instrument` to melody clips; the adapter has a small set of
  procedural synth recipes (offline, no samples) — like the theremin waveforms but
  fuller (waveform + envelope + a little tone shaping). Voice lanes keep their
  recorded sample.
- **Risk:** low (more synth recipes), medium if we want them to sound distinct.

## Capability 3 — Bend / swoop · medium

- **Kid UX:** grab the **end** of a note, drag up/down → it draws a slope and the
  sound **swoops** between pitches. Stays in-scale. One start→end glide.
- **Tech:** `note.slideTo`; scheduler ramps frequency over the note. **Synth/melody
  first, then voice** (voice = playbackRate ramp on the sample — second pass).
- **Risk:** medium (voice sample bend).

## Capability 4 — Chain loops into a song: the Song Train · biggest, last

Your confirmed flow:
> Tools → **Send to Home**. Home is **one train** (the working loop). **Send the
> train to the Tracks.** On the Tracks you add new cars or **repeat old cars
> (in their own colors)** to build the **song**.

- **Kid UX:** Home stays the single-loop studio. A **"🚂 Send to Tracks"** button
  drops the current loop onto the **Tracks** as a train car. There you line cars
  up left→right, **tap a car to repeat it** (×2, ×4 — repeats share the car's
  color so the song reads at a glance), drag to reorder, and **"+ New Car"** makes
  a fresh loop (opens Home to build it). Press play to **ride the whole song**.
  Default = one car (exactly today) until they add a second — the Tracks only
  appear when reached.
- **Tech:** `Project` gains `parts: Part[]` (each = a loop's clips/layers/notes) +
  `arrangement: { partId, repeats }[]`; transport rides the arrangement, looping
  each car `repeats` times then advancing. Today's single loop = one-car song.
- **Risk:** high — multi-part state + transport sequencing + Tracks UI. Last.

## Cross-cutting UI: center everything

The studio currently hugs the left. Center the canvas content (lanes, the
+Sound/+Melody/+Voice/+Magic row, tool screens) in a centered max-width column so
it sits in the middle of the stage on big screens, still full-width on phones.
Small CSS pass, do alongside Capability 1.

## Voice / copy: lean into the train

Trains are the through-line: "Send to Home," "Send to **Tracks**," cars, repeats,
"ride the song," "Choo-choo-CHOOSE your instrument," "All aboard!" Keep puns light
and the nouns consistent (Home loop → cars → Tracks → song).

## Recommended sequence

1. **Note model + Stretch + drum fills** (+ the centering pass).
2. **Instruments.**
3. **Bend/swoop** (synth, then voice).
4. **Song Train** (Tracks arrangement).

Each is its own stepwise-refinement + Chesterton + CCC-verify/deploy cycle; none
breaks the hexagonal boundary (notes in pure `ProjectState`, Tone in the adapter).

## Guardrails (all of it)

Magic Notes always on · big touch handles · tap-to-remove · undo everywhere ·
progressive disclosure (bend handles, Tracks, instrument picker appear only when
reached) · no jargon (stretch / roll / swoop / cars / Tracks — never
pins/channels/algorithm) · sensible caps (note length, roll count, number of cars).
