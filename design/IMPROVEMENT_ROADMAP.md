# Smooth play and simpler controls

## Architecture decision

Keep the browser game, Phaser, one shared game instance, the command/reducer
core, and local saves. Musical time belongs to the audio transport. Animation
follows it. Offline play uses the same instruments and engine after the complete
app has been cached. Changing engines is not justified by the current evidence.

Eric reported animation and sound stuttering with three cars on his laptop.
The exact browser/song and oldest supported iPad remain unknown. Software
rendering exposed substantial graphics costs; a simple drum fixture on the
available Intel GPU did not reproduce sustained stutter. Neither result proves
performance on Eric's affected setup. Measurements live in [BASELINE.md](../BASELINE.md).

## Implemented resource repairs

1. **Separate design coordinates from drawing pixels.** Layout stays in the
   authored coordinate system. WebGL matches the displayed physical pixels up to
   the original 2560×1440 resolution, and each scene projects into that buffer
   through its camera. CSS fitting, hit areas and drag distances
   remain independent of the buffer. Manual Magic Pad and knob input now uses
   camera coordinates. The Canvas renderer retains its original buffer.
2. **Pack art without reducing its quality.** Restore all 19 rich control faces
   from `c39e14e`. Keep every source at full resolution and full color. Trim
   transparent margins using Phaser atlas metadata and crop unused page space.
   This uses 135.55 MiB of decoded UI pages versus the original 231.97 MiB.
   The generator rejects
   oversized output before replacing files. Policy lives in
   `scripts/ui-atlas-policy.json`; unit and release freshness checks enforce it.
   `src/assets/track-controls.json` owns accepted source hashes, registration
   boxes and the SPEED window. Release checks reject substituted controls and
   any loss of visible pixels after the existing background-wash removal.
3. **Keep unchanged music running.** Compile the existing notes, effects and bar
   order into one typed playback plan. Preparation, comparison and scheduling
   consume that plan. Cosmetic edits skip graph rebuilding; no-op commands skip
   planning too. A one-entry fingerprint is discarded on stop/export. Repeated
   cars prepare each required sample once. Preparation receives its tempo
   explicitly, so an upcoming edit cannot change the live tempo before commit.

4. **Own melody voices by overlap, not by note count.** A scheduled note takes
   a pooled voice only when that voice is silent for the note's whole span
   (length + release tail, doubled for the fastest terrain); otherwise a new
   one is built. No cap and no stealing: the pool is exactly as large as the
   densest overlap. Voices are shared across cars that feed the same effect
   chain, and a Voice Keys sampler — polyphonic by itself — serves its lane
   alone. Disposable derived audio sits in byte-budgeted LRU caches; an evicted
   entry is re-rendered on next use and a sounding voice keeps its own buffer.
   Effect chains are keyed by lane AND knob settings, which fixed duplicated
   cars playing through each other's chain. `src/adapters/voice-pool.ts` and
   `byte-lru.ts` hold the rules; measurements are in `BASELINE.md`.

These changes preserve saved-song formats, repeated/muted cars, reverse,
overlapping notes, pitch bends, rolls, recordings and export. They introduce no
voice stealing or song truncation. Undo to the sounding plan invalidates pending
preparation before taking the fast path. Starts deliberately rebuild.

Refinement used the production callers found with `rg`: application dispatch,
batch, undo/redo and playback/export; atlas consumers; all scenes; manual pointer
calculations; and artifact screenshot/click helpers. The principal risks were
stale audio after undo and incorrect input after scaling. Engine race tests and
real browser resize/revisit/drag journeys cover those boundaries. Revert each
repair with its generated assets if a regression appears; no data migration is
needed.

## Next implementation slices

The visual regression had two separate causes. `0b747c8` replaced rich controls
with an older, sparse family and incorrectly called that family approved.
`40f08c4` then reduced larger atlas frames and fixed every display at 720p.
Earlier page-wide palette quantization also changed colors when packing changed.
Passing behavior tests did not establish visual fidelity. The repair therefore
protects accepted source identity, generated pixel fidelity and display density
separately. Future performance work must preserve these checks. Guidelines:
change one cost at a time, compare the same song and display, and inspect actual
Workshop and Track screens before release. A lower measured memory count alone
does not justify worse art.

| Slice | Concrete improvement | Acceptance before release |
|---|---|---|
| Audio resources (remainder) | Done: melody voices by overlap, bounded derived caches, and voices/players recycled across rebuilds. Confirmed on Eric's laptop by the second `?perf` report: tarp on/off cost 24/18 ms frames. Left: the first Ride of a session still builds everything once (232 ms there); an audible edit still replaces every lane rather than only the changed one. | No long task over 100 ms on the first Ride either. |
| Ride motion | Done: the Track draws from a smoothed audio clock; the raw one jumps a hardware buffer at a time (43 ms on Linux Chrome), which stood the train still on most frames at full frame rate. Left: confirm with `stillFrames` in a third report; check the same clock on an iPad. | `stillFrames` 0 and `motionUneven` under 2 while riding, on the affected laptop. |
| Atlas upload | The ~1–2 s GPU upload of the UI atlas is moved to the Map, not removed. Splitting it across frames needs per-page loading instead of one multiatlas key. | No long task over 250 ms on any screen, art unchanged. |
| Graphics residency | Load tool/scene art when needed, using one generated registry for loading, budgets and offline files. | Keep a small warm set; never evict live textures; navigate all scenes offline after eviction. |
| Offline and interruptions | Truthful offline-ready status; explicit pause/resume when iPad suspends audio; protect recordings across interrupted capture and updates. | Physical Safari and Home Screen app: cache, disconnect, reopen, record, save, reopen, export, rotate, lock/unlock, update. |
| Full-car feedback | Use one explicit result for adding recorded sounds. Close a tool only after acceptance. | My Voice, Voice Keys and Magic Pad retain the take and explain “This car is full”; Sound Pads already provides the precedent. |
| Forgiving controls | Persistent Undo/Redo, reachable Stop, separate Clear, stable touch targets independent of world fitting. | Actual touch/keyboard actions, rotation, and compound undo after navigation. Guideline: primary targets at least 48 CSS pixels. |
| Long trains | Scroll the arrangement instead of overlapping shrinking slots; set any new limit from supported-device evidence. | Preserve longer existing songs and export; refuse only new unsupported additions with a useful next action. |

Do not substitute one synth per lane without accounting for overlapping notes.
Do not delete a child's recording when evicting decoded audio. Original songs and
recordings are critical data; generated graphics, effect renders and app caches
are replaceable. Offline storage is not a backup: a future editable-project
backup needs a versioned format and bounded import validation.

## Simpler first play

Keep the train metaphor and instrument characters. Trial these controls before
commissioning more art:

| Place | Primary actions | Secondary actions |
|---|---|---|
| Map | Make music; Continue my song | Explore Yard and Track |
| Workshop | Tap a character; Hear this car; Build my train | New car; More sounds |
| Recording tool | Record; Listen; Add to car | Funny voices; separate Close |
| Yard | Choose car; Add to train; Ride my song | Reorder; remove |
| Track | Ride/Stop; Edit song; Undo | Speed; save; Clear |

Use a picture and a short verb together. Share action definitions with accessible
names, keyboard activation and tests. Keep Stop reachable when toolbars hide.
Show pending feedback during deliberate crane/terrain animations. A fresh empty
car should lead to making sound, not an unexplained silent ride.

Start with an optional starter beat and a clear first-instrument hint. Later
ideas include Dance/Sleepy/Silly starters, “make a rainy song” prompts, free-form
call and response, train stickers, and reduced motion. Keep blank creation and
advanced tools available. Age 6–10 is only a design hypothesis until confirmed.

## Evidence still required

The automated checks cover behavior and the resource contracts, not physical
iPad acceptance or a guarantee that the reported stutter is gone. Exercise the
affected laptop song and oldest supported iPad for ten minutes, including dense
melodies, recordings, effects, editing and interruption. Record frame intervals
and audio scheduling misses together, in the foreground and on the same build.
WebKit automation is useful but is not an iPad.

Performance guidelines pending device validation: aim for 60 FPS, responsive
visual tap feedback within 100 ms, and no recurring audio scheduling misses over
20 ms after warmup. If the device floor needs a lower visual tier, define a stable
one explicitly while preserving musical timing. Child trials should establish
whether a child can make sound, ride, stop and undo without adult coaching.
