# ART_REQUESTS — queue for the art agent (Manus)

> **Contract:** the engineering agent never paints around missing art (no
> rectangles, masks, or text stand-ins). When art is missing or deficient it is
> logged here and the code ships the best *honest* interim. Each entry says
> exactly what to generate, where the file goes, and what unblocks when it lands.
>
> **House style (from PROJECT_CHARTER / STYLE_GUIDE):** warm 16-color Nintendo
> palette, chunky pixels, 1px dark-plum outlines, hard 2–3px drop shadows, no
> gradients/glow. UI chrome = steampunk wood/brass/stone plaques matching the
> existing `src/assets/sprites/buttons/` set. All sprites are transparent PNGs
> with a small uniform margin; state variants share one canvas so a texture swap
> needs no reposition.
>
> **⚠ Export rule (three drops have now violated it):** backgrounds must be
> TRUE alpha 0 everywhere outside the art — no semi-opaque paper/grey wash on
> the canvas (AR-009, AR-012's grey key, AR-017). Engineering keys these out
> in the pipeline when they slip through, but every wash risks eating art.

---

## PRIORITY ORDER (2026-08-01, rev 2)

1. **AR-024 — RE-EXPORT the 24 instrument PNGs with an alpha channel. BLOCKING.**
   The AR-016/AR-021 art itself is good and is *not* being rejected — but all 24
   files shipped as PNG colour-type 2 (RGB, **no alpha channel at all**) on a
   solid near-white background. None of it can be wired until it is re-exported.
   See AR-024 below for exactly what to change. **Nothing else in this queue
   matters until this is fixed** — it is holding two finished tools hostage.
2. **AR-023 — Workshop interior plate, pushed BACK.** Eric's own words on the
   deployed build: *"little to no separation between the noisy background and the
   cars."* The Workshop is where a kid spends nearly all their time, and it is the
   one screen where background and foreground compete. Foreground is already
   correct; the fix is entirely in the plate.
3. **AR-026 — ×2 lever ON state + picture captions for the deck.** The only
   entry in this queue where the shipped art says something FALSE: the switch
   has one frame, so an armed ×2 still reads "OFF". Engineering can move the
   lever (it does now) but cannot repaint a plaque. Small job, wrong-information
   payoff.
4. **AR-013 — steampunk LCD plate** (the last "debug-looking" chrome; wiring is
   Tiled-only).
5. **AR-022 — Map building labels** (the boot screen names none of its three
   destinations). Prefer baking into the plate — see the entry for why the plaque
   route needs code first.
6. **AR-020 — SEND SONG plaque + result panel**, **AR-018 — satellite tool panel
   plate** (engine parchment interim shipped for both).
7. LOW: AR-006 (nav pressed states), AR-008 (picker selected states),
   AR-009 / AR-017 (semi-opaque wash cleanups), AR-019 (yard readability).

**Sizing note for every entry below.** Deliver at roughly **2× the drawn size**,
not at generation resolution. `placeUiSprite` contain-fits a sprite's *content
box* into a fixed slot, so native resolution changes nothing on screen — it only
costs GPU memory. Where an entry pins a canvas size, that number is derived from
the slot; do not round it up "for safety". (Measured: the live atlas is 61 frames
/ 34.1 Mpx, plus 28 dead frames / 13.8 Mpx that engineering is deleting
separately — the live art is correctly sized and does not need re-delivery.)

---

## AR-018 · Satellite tool panel plate (parchment modal) — MEDIUM

**Target file:** `src/assets/sprites/panels/panel-tool.png` (one shared
landscape plate; per-tool variants optional later).

**Why (2026-07-04 UI sweep):** the five satellite tools (Beat Maker, My Voice,
Voice Keys, Sound Pads, Magic Pad) render on an ENGINE-DRAWN parchment
rectangle (flat fill, plum edge, hard shadow) — correct language, but a
painted plate would match the instrument editor's framed art.

**Prompt:** "Landscape parchment tool panel for a kids' train game, matching
panel-editor.png's family: cream parchment face, dark wooden frame with brass
corner gears, a slim darker header band across the top (title text is
engine-rendered on it), body EMPTY — all content (buttons, grids, pads) is
engine-drawn on the face. ~16:10, 2048px wide, transparent outside the frame,
warm 16-color palette, 1px dark plum outline, hard drop shadow baked OFF (the
engine draws it)."

**Unblocks:** BaseToolPanel swaps its engine rectangle for the plate (one
manifest entry + a placeUiSprite call, no per-tool changes).

---

## AR-026 · ×2 lever ON state + deck labels a non-reader can read — HIGH

**Target files:** `src/assets/sprites/panels/toggle-double.png` (needs a SECOND
state) and `panel-editor.png` (four baked captions).

**Why (2026-08-01, Eric on the Melody Editor):** *"the x2 lever doesnt have any
animation, it just gets highlighted and the switch doesnt move. also dont know
what its supposed to do. also dont know what 'level' does either."*

Two separate gaps, both in the art:

**1. The switch ships as ONE frame.** `toggle-double` is a single 512² canvas
with the lever baked pointing DOWN and an **"OFF" plaque baked in**, so there
was no second state to swap to and the control could only tint. Engineering's
interim: the frame's own lever column (`x 216..296, y 175..437` of the canvas)
is drawn a second time over the base, mirrored about `y = 306`, which throws the
ball from below the housing to the top of it — a real, animated throw out of the
one frame we have. **What it CANNOT do is the plaque: an armed switch still
reads "OFF".** That is the part only art can fix.

**Prompt:** "Second state for the existing brass toggle switch
`toggle-double.png`, same 512x512 canvas, same plate, same position — the ONLY
differences: the lever thrown UP (ball at the top of the brass housing, stalk
running down into it) and the small brass plaque reading **ON** instead of OFF.
Deliver as `toggle-double-on.png` alongside the existing file renamed
`toggle-double-idle.png`. Warm 16-color palette, 1px dark-plum outline,
transparent outside the plate, RGBA with true alpha 0."

**2. WOBBLE / CRUNCH / LEVEL / ×2 are baked into `panel-editor.png`** — four
words and a maths symbol on a panel whose users are four to six and cannot read.
WOBBLE and CRUNCH survive because a knob is self-evidently a thing you turn;
LEVEL and ×2 do not, because neither a fader nor a switch says what quantity it
moves. Engineering has added what it can WITHOUT art — the fader now fills its
track gold as it rises, and the ×2 lever answers a throw with the sound it makes
(one hit vs two) plus a ghost "split" preview on every note it could divide —
but the captions themselves are pixels in the plate.

**Prompt:** "Re-render `panel-editor.png` with the four control captions
replaced by PICTURES, same slots, same size, same plate: (a) WOBBLE → a small
wavy line; (b) CRUNCH → a jagged/broken line; (c) LEVEL → a small speaker with
one arc on the left of the slot and three arcs on the right, i.e. quiet→loud
along the fader's travel; (d) ×2 → two identical small notes side by side
(NOT the characters '×2'). Keep the words underneath at half height if they
fit — a reading adult should still get the name. Re-RENDER in the 16-colour
palette, do not filter the existing plate (see the standing rule at the foot of
this file)."

**Unblocks:** (1) `UI_SPRITES["toggle-double"]` becomes an ordinary two-state
`buttonDef`-shaped entry and `MelodyEditorPanel.renderToggle`'s mirrored column
collapses to a one-line `setFrame` — the mirror trick exists only because the
second state does not. (2) The last two controls in the app whose meaning is
carried by a word.

---

## AR-025 · Sound Pads keycap — MEDIUM

**Target files:** `src/assets/sprites/buttons/pad-key-idle.png` and
`pad-key-seated.png` (ONE pair, shared by all ~34 pads — see "one shape, many
tints" below).

**Why (2026-08-01, Eric on the deployed build — "sound pad thing is old art"):**
the Sound Pads panel drew every pad as a flat `Phaser.Rectangle` with a 3px
stroke, and rendered the whole label — emoji included — in Press Start 2P at
~12px, which turns each sound's picture into an invisible speck. It read as CSS
buttons next to the Workshop's authored knobs, plaques and levers.

The pads are now engine-drawn keycaps in the established chip language (rounded,
cream/plum, hard offset shadow, gold rim + tick when the sound is in the car —
the same treatment `undo-toast.ts` and the LCD chips use), with the glyph in the
system font at pad scale. **That is the honest interim, not the target.** Painted
art would put them in the same family as the transport keycaps.

**Prompt:** "A blank square-ish pixel-art keycap for a kids' train-workshop
music game, in the family of the existing `btn-transport-*` keys: chunky bevel,
1px dark-plum outline, hard 3px drop shadow, flat fill, NO baked icon or text
(the engine draws the sound's picture and name on the face), warm 16-color
palette. Deliver TWO states on one shared canvas — `idle` (raised, shadow
visible) and `seated` (pressed down into its socket, shadow gone, thin gold rim
all round, small gold tick badge in the top-right corner). 512x512, transparent
outside the key, RGBA with true alpha 0."

**One shape, many tints — read this before drawing 34 keys.** Every pad carries
its OWN colour from `src/core/sound-catalog.ts`, so the art must be a NEUTRAL
light-grey key that the engine tints per sound (`setTint`). Do not deliver a
coloured key, and do not deliver one per sound.

**Unblocks:** `PadKey` in `src/game/tool-panels.ts` swaps its `Graphics` calls
for two `placeUiSprite` calls plus a tint; the layout, hit area and in-car state
machine are already built and need no change.

**Also wanted, LOW, separate:** the ten drums and six tones currently show system
emoji (🥁 🪘 🎩 …) as their pictures. Per-sound pixel icons in the house style
would finish the job, but they are 16 small drawings and the keycap is worth more
first.

---

## AR-019 · Yard readability polish — LOW

**Files:** `scenes-v2/yard-scene-clean-v2.png` (+ possibly small caption
plaques).

**Why (2026-07-04 UI sweep):** the yard plate is much darker than the other
three scenes, and the palette cars are labelled by tiny engine captions
("LOOP 1") that vanish against the dark ground. Options: lift the plate's
midtones slightly, or ship small parchment name-tag plaques the engine can
place under each palette car.

---

## ✅ DONE — AR-001 · Yard action buttons (individual, idle + pressed)

Files landed: `btn-yard-edit-idle/pressed`, `btn-yard-hitch-idle/pressed`,
`btn-yard-unhitch-idle/pressed`, `btn-yard-totrack-idle/pressed`,
`btn-yard-delete-idle/pressed`.

**Unblocks:** code agent should now replace the baked strip in `yard.json` with
five `ui-button` sprite objects pointing to these files.

---

## ✅ DONE — AR-002 · Empty Yard bottom-bar panel plate

File landed: `src/assets/sprites/panels/panel-yard-actions.png`.

---

## ✅ DONE — AR-003 · Nav plaques — clean re-exports with scene-specific icons

Files landed:
- `btn-nav-map-idle.png` / `btn-nav-map-pressed.png` — ← arrow + overworld map scroll + MAP
- `btn-nav-workshop-idle.png` — ← arrow + gear/wrench + WORKSHOP
- `btn-nav-yard-idle.png` — YARD + parallel sidings icon + → arrow
- `btn-nav-track-idle.png` — TRACK + oval loop icon + → arrow

**Still needed (LOW):** pressed variants for WORKSHOP, YARD, TRACK nav plaques.
Prompt: "Same plaque, PRESSED state — bevel inverted, content shifted 2px down,
face slightly darker. Transparent background."

---

## ✅ DONE — AR-004 · Dedicated RIDE button

Files landed: `btn-track-ride-idle.png` / `btn-track-ride-pressed.png`.
Golden steam locomotive with steam puff, "RIDE" label, steampunk keycap.

---

## ✅ DONE — AR-005 · Top-bar clearance for Yard/Track base plates

Files updated: `yard-scene-clean-v2.png` (dark industrial ceiling band at top),
`track-scene-clean-v2.png` (open blue sky band at top). Both now have ~180px
of clear space for `panel-header-v2` to sit over.

---

## AR-006 · Nav plaque pressed states — WORKSHOP, YARD, TRACK — LOW

**Target files:**
- `src/assets/sprites/buttons/btn-nav-workshop-pressed.png`
- `src/assets/sprites/buttons/btn-nav-yard-pressed.png`
- `src/assets/sprites/buttons/btn-nav-track-pressed.png`

**Why:** the MAP plaque has a pressed state; the other three do not. The engine
falls back to a scale-pop for these.

**Prompt:** "Same plaque as the idle version (cream parchment face, silver
riveted frame, same icon and text), PRESSED state: bevel inverted, all content
shifted 2px down, face slightly darker/warmer. Transparent background, clean
alpha edges."

---

## ✅ VERIFIED — AR-007 · Husky-on-keyboards instrument file name

`workshop.json` references `sprite: inst-piano` (action `workshop-add-melody`,
arg `piano`) and the manifest maps it to
`instruments/inst-piano-passive/hover/active.png`. Nothing to change.

---

## ✅ DONE — AR-010 · Unified transport keycaps (Workshop + Track) — HIGH

**Target files (idle + pressed each):**
- `buttons/btn-transport-stop-{idle,pressed}.png` — red square icon, baked "STOP"
- `buttons/btn-transport-play-{idle,pressed}.png` — green triangle, baked "PLAY"
- `buttons/btn-transport-loop-{idle,pressed}.png` — gold circular arrows, baked "LOOP"
- `buttons/btn-transport-slow-{idle,pressed}.png` — blue down-arrow, baked "SLOW"
- `buttons/btn-transport-fast-{idle,pressed}.png` — blue up-arrow, baked "FAST"

**Why (Eric's screenshots, 2026-07-03):** the three bottom bars are three
different design languages right now. Yard has the dark stone plate with
silver-framed steampunk keycaps and baked labels (the keeper). Workshop still
has flat cream keycaps with engine-drawn captions on a cream plate. Track mixes
both families in one bar — cream SLOW/STOP/FAST sitting next to the dark
framed RIDE keycap. One keycap family everywhere.

**Prompt:** "Square steampunk keycap buttons for a kids' train game, EXACTLY
matching the existing yard action set (btn-yard-hitch-idle.png): dark riveted
stone face, silver bevel frame, small brass corner gears, baked cream label
text at the bottom. Five buttons: STOP (chunky red square icon), PLAY (chunky
green right-facing triangle), LOOP (gold circular repeat arrows), SLOW (blue
double down-chevron), FAST (blue double up-chevron). Idle + pressed states
(pressed = bevel inverted, content 2px down, face slightly darker). Fully
transparent background (alpha 0 outside the plaque — see AR-009), 512×512
canvas, warm 16-color palette, 1px dark plum outline."

**Unblocks:** swapping the `btn-stop/play/loop/tempo-down/tempo-up` sprite
keys in `workshop.json` + `track.json` (Tiled + manifest edit, no scene code);
Track's bar becomes all one family alongside `btn-track-ride`; the engine
captions and their crowding issues disappear.

---

## ✅ DONE — AR-011 · Dark workshop bottom plate (transport bar) — MEDIUM

**Target file:** `panels/panel-transport-v2.png`

**Why:** the Workshop's cream/lavender `panel-transport` plate doesn't belong
to the same family as the Yard plate and the Track base plate's slate frame.
With AR-010's dark keycaps it would clash even harder.

**Prompt:** "Empty steampunk bottom-bar panel plate matching
panel-yard-actions.png: dark riveted slate/stone face with a silver bevel
frame, landscape ~8.5:1 (it spans the full scene width), NO baked LCD window
and NO buttons — completely empty face. Pre-trimmed to the frame, transparent
outside it. The engine draws a cream LCD chip on top, which reads great on the
dark stone."

**Note (no action needed):** Track's bottom panel is painted INTO its base
plate while Yard's is a separate sprite — visually the same family, so it's
fine, but if the track plate is ever regenerated, prefer leaving the bottom
band empty scenery and shipping the panel as a sprite like the Yard's.

---

## ✅ DONE (gaps superseded by AR-015) — AR-012 · Train ref frames: flatcar directions + loco rear view

> The two placeholder gaps below (flatcar's six missing directions, loco rear
> view) are covered by AR-015's full 16-direction set for loco/tanker/flatcar —
> deliver AR-015 and skip these.

**Assembled:** the new refs are live in `public/assets/spritesheets/train.png`
(rebuild any time with `python3 scripts/build_train_atlas.py`). Two gaps ship
as placeholders:

1. **Flatcar has only E + NE refs.** The other six directions are currently
   mirror/rotate derivations — the N/S cells are a side view rotated 90° (wrong
   perspective) and SE/SW show the deck flipped upside-down. Need real refs:
   `flatcar-ref-{N,NW,W,SW,S,SE}.png`, same canvas/backdrop conventions as the
   boxcar set.
2. **`loco-ref-N.png` is a FRONT-facing view (same as S).** North should be the
   REAR of the locomotive (tender/cab back, no cowcatcher visible). On the
   oval's left straight the train drives "up" and currently shows its face
   backwards.

**Prompt:** "Steampunk pixel-art train cars matching the existing ref set:
(a) flat deck car (flatcar-ref-E.png family) seen from N, NW, W, SW, S, SE in
the same 3/4 game perspective and scale as the boxcar refs; (b) the locomotive
seen from directly behind (rear of cab/tender, heading away from the viewer)
to replace loco-ref-N. 1920×1920 canvas, same backdrop treatment as the
existing refs."

---

## AR-013 · Steampunk LCD display plate (SONG/TEMPO + SPEED readouts) — HIGH

**Target file:** `panels/panel-lcd.png`

**Why (Eric, 2026-07-03):** the SONG/TEMPO chip in the Workshop (and the SPEED
chip on the Track) is an engine-drawn flat cream rounded rectangle — it isn't
in concert with the steampunk headers/footers around it.

**Prompt:** "Steampunk display housing for a kids' train game, matching the
dark keycap set (btn-transport-stop-idle.png): a silver riveted bevel frame
with small brass corner gears around a cream parchment display window (the
window must be plain and empty — dark plum text is rendered on it at runtime).
Landscape, window-to-frame ratio generous (~80% window). Transparent outside
the frame, pre-trimmed, warm 16-color palette, 1px dark plum outline. One
asset serves both the Workshop SONG/TEMPO readout (~590×160 on screen) and the
Track SPEED readout (~430×150)."

**Unblocks (zero scene code):** add a `panel` object with `sprite: panel-lcd`
at the `lcd-transport` rect in `workshop.json`/`track.json`; the engine's
graphics chip is then retired and only the text remains on top.

---

## ✅ DONE — AR-014 · Track base plate re-render: perspective matched to the train

**Target file:** `src/assets/scenes-v2/track-scene-clean-v2.png` (2560×1440)

**Why (Eric, 2026-07-03):** the vehicles are drawn in a 3/4 view (you see
their sides and roofs), but the track plate is near-top-down — the train reads
as standing on a flat map. Eric has signed off on re-rendering the background
to match the TRAIN's perspective (the vehicle sprites are the expensive,
beautiful assets; the plate serves them).

**Prompt:** "Re-render the track scene in the SAME 3/4 perspective as the
train sprites (use boxcar-ref-E.png / loco-ref-E.png as the perspective
reference): a closed loop of track on grass where the BOTTOM straight is
nearest the viewer (rails drawn large, ties clearly foreshortened at the
train-sprite angle) and the TOP straight is farthest (visibly smaller/
narrower, roughly 80–90% of the bottom straight's gauge). Keep the overall
composition: clear sky band across the top ~360px (for the header panel),
empty dark slate panel band across the bottom ~340px, crossing signal at the
bottom-centre straight, pine trees and rocks in the surround. The track's
CENTERLINE must be a clean, unambiguous single loop — the engineering side
retraces it as a Tiled polygon, so avoid overlapping decoration on the rails.
Warm 16-color palette, chunky pixels, same grass/tree family as the current
plate."

**Engineering contract (already in place — this swap is data-only):** the ride
path is the `track-path` polygon in `track.json`'s geometry-layer, and the
perspective is two properties on that object (`farScale`/`nearScale`, the
sprite scale at the top/bottom of the loop). When the new plate lands: retrace
the polygon over the new centreline, set the scales to match the painted
gauge ratio, done. No code changes. Car coupling is computed bumper-to-bumper
from live on-screen sizes, so it adapts to the new perspective automatically.

---

## ✅ DONE — AR-015 · Train animation upgrade: 16 directions + wheel motion

**Completed:** all 5 vehicle types × 32 files = 160 total refs in `src/assets/spritesheets/ar015/`.
- boxcar: 32/32 ✅
- hopper: 32/32 ✅
- loco: 32/32 ✅ (committed 2026-07-31)
- tanker: 32/32 ✅ (committed 2026-07-31)
- flatcar: 32/32 ✅ (committed 2026-07-31)

**Engineering next step:** extend `scripts/build_train_atlas.py` and `sprite-assets.ts` to the 16-direction × 2-frame atlas format. All ref files are in `src/assets/spritesheets/ar015/` and ready.

**Target files:** `src/assets/spritesheets/<type>-ref-<dir>-f1.png` +
`-f2.png` — 16 compass directions (E, ENE, NE, NNE, N, … all 16) × 2 wheel
frames, for loco, boxcar, tanker, hopper, flatcar.

**Why:** with 8 directions the train visibly SNAPS between headings on the
curves; 16 halves the snap angle. A 2-frame wheel cycle (rods pumping on the
loco, wheels rotated a half-spoke on the cars) makes the motion read as
rolling rather than sliding. Eric has approved the sprite investment.

**Prompt:** "For each existing train vehicle ref, produce 16 compass-direction
views (22.5° apart) in the same 3/4 perspective and scale as the current
8-direction set, each in TWO animation frames: frame 1 as-is, frame 2 with
drive rods/wheel spokes advanced half a cycle (loco rods visibly moved; car
wheel spokes rotated). Same canvas and backdrop conventions as the current
refs. Naming: loco-ref-ENE-f1.png, loco-ref-ENE-f2.png, etc."

**Engineering note:** the atlas builder (`scripts/build_train_atlas.py`) and
`sprite-assets.ts` will be extended to a 16-direction × 2-frame atlas when
this lands — deliver the full set in one drop if possible so the format
changes once.

---

## AR-017 · AR-016 control sprites: semi-opaque backdrop wash — LOW

**Files:** `panels/knob-wobble.png`, `knob-crunch.png`, `toggle-double.png`,
`fader-handle.png`, `modal-edit-or-new.png`, `panel-editor.png`.

**Why:** the drop shipped with an AR-009-class defect — a semi-opaque backdrop
wash across the full canvas (alpha ~20–170 outside the art) instead of alpha 0.
Engineering flood-keyed the border-connected wash to transparency in the
pipeline, so the committed files are CLEAN — no action needed unless these
assets are ever regenerated, in which case: "fully transparent background
(alpha 0 everywhere outside the art), same art, same canvas."

---

## ✅ DONE — AR-016 · Workshop Revamp production exports — ALL items complete

Items 1 (interior plate), 2 (four car-side sprites + standardized void),
3 (chalkboard), 5 (editor panel + knob/fader/toggle + edit-vs-new modal +
send-to-yard button) landed and are LIVE in the layered Workshop.
**Item 4 complete (2026-08-01):** all six instrument characters redrawn at 576×768 in the new chunky-pixel style. See commit `6bc1680`.

Original brief:

1. **`scenes-v2/workshop-interior-clean.png`** — 2560×1440 static interior
   (brick arches, lamps, wooden floor, rails across the bottom third). NO car,
   NO characters, NO chrome. This replaces the monolithic boxcar plate.
2. **`sprites/cars/car-side-{boxcar,tanker,hopper,flatcar}.png`** — the four
   side-on car sprites, transparent PNGs, all on the SAME canvas size with the
   wheels on the same baseline. **The dark interior void must be an identical
   pixel rect across all four** (the chalkboard mounts there). Ship the void
   rect measurements (x, y, w, h relative to the canvas) with the drop — or
   keep the void exactly centred so engineering can measure it once.
3. **`sprites/panels/sequencer-chalkboard.png`** — the empty chalkboard
   surface only (frame + board, no notes/no icons: notes and the playhead are
   engine-drawn on top).
4. **Instrument character redraws** (design doc §4) — passive/hover/active
   each, grounded on a flat floor plane, chunky-pixel style. Include the
   3-eyed alien fix. Same canvas conventions as the current instrument set.
5. **`sprites/panels/panel-editor.png`** — the Instrument Editor frame (note
   canvas top half EMPTY — engine-drawn; control deck bottom half with knob/
   fader/toggle ART POSITIONS but the knobs as separate sprites:
   `knob-wobble`, `knob-crunch`, `fader-handle`, `toggle-double` idle art).

Everything goes through the established pipeline (engineering downsizes/
quantizes and packs into the ui-atlas — no need to pre-optimize).

---

## AR-009 · Yard keycaps + RIDE: stray semi-opaque halo — LOW

**Files:** `buttons/btn-yard-edit/hitch/unhitch/totrack-*.png`,
`btn-track-ride-idle.png` (and a faint one on `btn-nav-track-idle.png`).

**Why:** the canvases carry a semi-transparent dark backdrop across the full
1920×1920 canvas (minimum alpha ≈ 19–47 measured, i.e. an 8–18% opaque wash)
instead of alpha 0 — it reads as a faint dark square behind each keycap.
Tolerable on the dark yard plate, but visible on lighter grounds.

**Prompt:** "Re-export with a fully transparent background (alpha 0 everywhere
outside the keycap plaque). Same size, position, art unchanged."

---

## AR-008 · NEW CAR button for Workshop top bar — MEDIUM

**Target files:**
- `src/assets/sprites/buttons/btn-newcar-idle.png` ✅ (already generated)
- `src/assets/sprites/buttons/btn-newcar-pressed.png` ✅ (already generated)

**Car type picker tiles** (for the dropdown):
- `btn-picker-boxcar-idle.png` / `btn-picker-boxcar-selected.png` ✅
- `btn-picker-tanker-idle.png` ✅ (needs selected variant)
- `btn-picker-hopper-idle.png` ✅ (needs selected variant)
- `btn-picker-flatcar-idle.png` ✅ (needs selected variant)

**Still needed:** selected state for Tanker, Hopper, Flatcar picker tiles.
Prompt: "Same tile as idle, SELECTED state: gold glow border, face slightly
brighter, label in bold gold instead of cream."

**Unblocks:** the NEW CAR dropdown picker in the Workshop top bar (Phase D).

---

## AR-020 · SEND SONG plaque + result panel for the Track header — MEDIUM

**Target files:**
- `src/assets/sprites/buttons/btn-send-song-idle.png`
- `src/assets/sprites/buttons/btn-send-song-pressed.png`

**Context:** the Track view's SEND flow (share/save the rendered song) ships
with an interim scene-drawn cream chip labeled "📮 SEND" in the header's empty
centre span (Tiled object `btn-send`, 410×150 map px), plus a scene-drawn
parchment result panel (`send-panel.ts`). Proper baked art should replace the
chip; the panel can stay scene-drawn (charter paper-panel language) unless a
painted frame is cheap to add.

**Prompt:** "A landscape parchment plaque button matching the YARD/MAP nav
plaques (same wood-and-brass frame family): a small red mail-flag post icon on
the left, bold 'SEND SONG' in the same baked lettering. Pressed variant: face
darkens slightly, bevel inverts. Transparent background (alpha 0), same canvas
padding conventions as btn-nav-map."

**Unblocks:** replacing the interim drawn chip in `TrackScene.layoutChrome`
with a `ui-button` spawn (one manifest entry + flip the Tiled object's type).

---

## ✅ DONE — AR-021 · `inst-pads` + `inst-magic` instrument characters

> Delivered together with AR-016 item 4 as one consistent 8-character pass (2026-08-01).

> **⚠ Do this together with AR-016 item 4, as one job.** Item 4 redraws the six
> existing instrument characters, because the smooth-illustrated originals clash
> with the pixel interior. This entry says "match the existing family" — but that
> family is being replaced. Drawing these two first means matching a retiring
> style and then redrawing them. **Deliver all eight characters in one consistent
> pass**, and treat the style notes in AR-016 item 4 / design doc §4 as
> authoritative where they differ from the prompt below.

**Target files** (one shared canvas per instrument, three states each, matching
the existing `inst-*` family):
- `src/assets/sprites/instruments/inst-pads-passive.png` / `-hover.png` / `-active.png`
- `src/assets/sprites/instruments/inst-magic-passive.png` / `-hover.png` / `-active.png`

**Context:** the Workshop field row is data-driven from `workshop.json`, and an
instrument only exists there if it has art. Two fully-built tool panels are
stranded behind that: `sound-pads` (`PadsToolPanel` — the soundboard of the
built-in pack plus your own recordings) and `theremin-xy` (`MagicToolPanel` —
the live oscillator+filter Magic Pad). Both are reachable today only by emitting
`workshop-open-tool` by hand; a kid has no way in.

**Note — `inst-keys` is NOT part of this request.** Its art already shipped (a
`UI_SPRITES` entry with all three frames in the packed atlas); it was simply
absent from the map. It is wired now, by a map edit, with no new art.

**Prompt:** "A friendly animal-character musician in the same family as the
existing Workshop instrument sprites (frog + drum kit, chipmunk + mic, bear +
xylophone, cat + guitar, alien + violin, husky + piano): chunky 16-color
Nintendo pixels, 1px dark-plum outline, hard drop shadow, standing on a floor
line with the instrument at their feet. For `inst-pads`, the instrument is a
chunky grid of coloured drum/sample pads on a small stand. For `inst-magic`, it
is a glowing theremin-style antenna box with two aerials and a soft aura.
Passive = at rest; hover = same pose slightly brighter; active = drawn LARGER
within the SAME canvas (the pop is a texture swap with no reposition).
Transparent background, true alpha 0."

**Canvas size: `576 × 768`.** Not `inst-piano`'s dimensions — measured, that is
the one outlier in the family (`768×768`) and copying it would ship art ~50 %
larger than it can ever be drawn. Five of the six shipped instruments are
`576×768`; that is the standard.

Why that number, so it can be re-derived rather than trusted:

| | source content | drawn on screen | oversample |
|---|---|---|---|
| `inst-drums` (576×768) | 524 × 373 | 340 × 242 | **1.54×** |
| `inst-piano` (768×768) | 707 × 660 | 300 × 280 | 2.36× |

The row slot is **340 × 280** design px. `placeUiSprite` contain-fits the
*content box* — not the canvas — into that slot, so what matters is how much of
the canvas the art actually occupies. `576×768` lands a little under the 2×
retina target, which is the right side to err on.

**Keep the art tight to the canvas** — a small uniform transparent margin, no
large empty bands. `inst-drums` currently wastes half its canvas height
(content box `[0.05, 0.285, 0.959, 0.77]`), which is why its effective
oversample is the lowest in the set despite a full-size canvas.

**Engineering follow-up when these land:** measure the alpha bounding box of each
new sprite and add an `instrumentDef(key, [x0, y0, x1, y1])` entry to
`src/game/ui-sprites.ts`. Without it the sprite renders at the wrong size, and
its tap target will be wrong too (see the hit-area fix in this same release).

**Unblocks:** two objects in `workshop.json` (no code) — the Sound Pads and
Magic Pad tools become reachable by tapping a character, like every other tool.

---

## AR-022 · Map building labels — MEDIUM

**Target:** either baked into `src/assets/scenes-v2/map-scene-clean.png`, or
three plaque sprites.

**Context:** the Map is the boot landing. It shows three painted landmarks — a
cabin (Workshop), a shed over sidings (Yard), and an oval of track (Track) — and
nothing names any of them. The handcar marker now parks on the rails at whichever
one you were last in, which tells you where you ARE but not where you are GOING.

**Strongly prefer baking the names into the plate.** The alternative needs code
first: `MapScene` is the one scene still on `spawnTiledScene`, which has no label
or sprite support at all (`makeLabel` is private to `ui-scene.ts`), so plaque
sprites would require migrating `MapScene` to `spawnUiLayer` before any art could
be used. Baked-in names need nothing.

**Prompt (baked):** "Same island map, unchanged, plus a small hand-painted
wooden signpost beside each of the three landmarks reading WORKSHOP, YARD and
TRACK in the same baked lettering as the existing nav plaques. Signs sit on the
grass at the near side of each building so they never cover the structure or the
rail line. Chunky pixels, 1px dark-plum outline, hard drop shadow."

**Unblocks:** nothing in code — it is a legibility fix for the first screen a
kid sees.

---

## ✅ DONE — AR-023 · Workshop interior: push the background BACK

**Delivered 2026-08-01.** Same layout, same geometry. Re-rendered at lower contrast and desaturated toward the darker half of the warm 16-color palette. Central wall area (behind sequencer board) is the calmest zone. Outlines on background objects thinned/removed. Floor and rail line readable. See commit `80dd61c`.

---

## AR-023 · Workshop interior: push the background BACK — HIGH (ORIGINAL SPEC)

**Target:** `src/assets/scenes-v2/workshop-interior-clean.png` (2560×1440), replacing
the current plate.

**Context — this is a direct play-test complaint, in Eric's words:**

> "there is little to no separation between the noisy background and the cars"

The Workshop is where a kid spends nearly all their time, and it is the one
screen where foreground and background compete. The plate is beautiful and
detailed — brick, tool boards, shelving, crates, gears, warning signs, a full
locomotive with red wheels — and it is rendered at the *same* contrast, saturation
and outline weight as the things a kid is meant to touch. So the six instrument
characters, the sequencer slate and the transport bar all have to fight it.

The characters and the chalkboard are already correct. **Do not restyle them.**
The fix is entirely in the plate.

**What to change:**
- **Drop contrast and saturation** across the whole plate — keep the same 16-colour
  palette, but bias to its darker/duller half. Background should read as *shadowed
  interior*, not as spotlit hero art.
- **Thin or drop the 1px dark-plum outline on background objects.** Outlines are the
  house style for interactive things; using them everywhere is what flattens the
  depth. Reserve full-weight outlines for the foreground.
- **Reduce fine detail** in the wall zone especially: fewer distinct small objects,
  larger flat areas. Detail directly behind the sequencer slate (roughly the middle
  60 % of the frame) should be quietest of all.
- **Keep the structure.** Same room, same layout, same boxcar interior and floor
  line the instrument row stands on — the map places sprites against this geometry,
  so the composition must not move.

**Prompt:** "The same 16-bit steampunk workshop interior, unchanged in layout and
composition, but re-rendered as a *background*: lower contrast and desaturated
toward the darker half of the warm 16-colour Nintendo palette, fine wall detail
simplified into larger flat shapes, and outlines on background objects thinned or
removed so nothing competes with the characters standing in front of it. The
central area behind the sequencer board should be the calmest part of the frame.
Chunky pixels, no gradients, no glow. 2560×1440."

**Also a perf win:** flatter, less detailed art at the same dimensions compresses
substantially better, and this plate is one of the four backgrounds that ship.

**Unblocks:** nothing in code — but it is the difference between the Workshop
reading as a toy and reading as noise, and it was the second thing Eric flagged
on the deployed build.

---

## ✅ DONE — AR-024 · RE-EXPORT the 24 instrument PNGs with an alpha channel

**Delivered 2026-08-01.** All 24 instrument sprites re-generated as RGBA (colour-type 6), true alpha 0 outside the art. `inst-keys` redrawn in chunky-pixel style (purple bear + rainbow toy keyboard, 3 states). `inst-xylophone` deleted (3 files). `check-sprite-alpha.sh` passes on all 24 files. Commit: see below.

---

## AR-024 · RE-EXPORT the 24 instrument PNGs with an alpha channel — BLOCKING (ORIGINAL SPEC)

**The art is good. Do not redraw it.** This is an export-settings fix only.

**What's wrong:** all 24 files from the AR-016 item 4 / AR-021 drop shipped as
**PNG colour-type 2 — RGB, with no alpha channel at all** — on a solid
near-white background (corner pixel `(242,243,243,255)`). Not the semi-opaque
wash the standing export rule anticipates: there is simply no transparency.

Verified across the whole tree: of 110 tracked sprite PNGs, the 82 palette and
4 RGBA files are clean, and **exactly these 24 fail**.

```
inst-{drums,guitar,magic,mic,pads,piano,violin,xylophone}-{passive,hover,active}.png
```

**Why it blocks everything.** `placeUiSprite` fits a sprite's *content box* —
its alpha bounding box — into a fixed slot. With no transparency the content box
is the entire canvas, so each character would (a) render at the wrong size, (b)
paint an opaque white rectangle over the Workshop, and (c) get a tap target
covering the whole frame — the exact hit-area bug that was just fixed.

**The fix:** re-export the same images with **RGBA (colour-type 6)** and true
alpha 0 outside the art. Nothing about the drawing changes. If the tool offers
"flatten", "matte", or "background colour" on export, turn it off.

**Not auto-keyed on our side, deliberately.** Edge flood-fill was tested on
`inst-pads-passive` and does extract most of the character — but it cannot reach
enclosed regions, leaving white pockets between the raccoon's legs and under the
pad stand. Shipping subtly-holed art is worse than refusing it. (`pack-sprites.py`
keys green/grey for the TRAIN sprites because those are authored against a known
backdrop; that does not apply here.)

**Now mechanically enforced:** `scripts/check-sprite-alpha.sh` reads each PNG's
IHDR colour type and fails on 0/2, and on palette PNGs with no `tRNS` chunk. It
goes into CI in the same PR that lands the corrected files — the rule has been
violated four times while it lived only in prose.

### Also needs deciding: `inst-keys` vs `inst-xylophone`

The drop treated "bear + xylophone" as one of the six *existing* characters. It
wasn't — the existing sprite is **`inst-keys`** (the same purple bear, at a toy
keyboard), and it was left untouched, so it is now the only character still in
the old style. `inst-xylophone` is effectively a redraw of it with the keyboard
swapped for a xylophone, and it is wired to nothing.

There are 27 sprites in the folder, not 24.

**Art director decision (2026-08-01): Keep `inst-keys`. Delete `inst-xylophone`.**

Rationale: `voice-keys` plays your recorded voice chromatically — it is a keyboard
tool, not a percussion tool. The keyboard instrument is the correct icon. The
xylophone is a mallet-percussion instrument and would mislead a kid about what
the tool does. The bear character is identical between the two sprites; only the
instrument changes. Keeping `inst-keys` means:

- `inst-xylophone-{passive,hover,active}.png` → **delete all three**.
- `inst-keys-{passive,hover,active}.png` → **include in the re-export batch**.
  The old `inst-keys` is palette/type-3 with a white background (not true alpha 0);
  it needs the same RGBA re-export as the other 24 files. The drawing is the old
  smooth-illustrated style and should be redrawn in the same chunky-pixel pass as
  the others — same purple bear + propeller beanie, same toy keyboard, new style.
  This makes the total re-export batch **27 files** (24 new + 3 inst-keys states).

**Unblocks:** two `workshop.json` objects (Sound Pads + Magic Pad), the content
boxes for all nine characters, and the atlas rebuild.

---

## Standing rule: a desaturation or tone pass must be RE-RENDERED, not filtered

Added 2026-08-01 after AR-023.

AR-023 asked for the Workshop plate to be pushed back, and the delivery **did
exactly that** — composition identical, properly desaturated. But the effect was
achieved by applying a global filter over the existing image rather than
re-rendering in the palette, and that shows up in the file:

| | colours | size |
|---|---|---|
| old plate | 223 | 605 KB |
| AR-023 delivery | **19,263** | **3287 KB** |
| after engineering re-quantized it | 256 | 422 KB |

A filter creates thousands of intermediate values between the palette entries,
so a PNG that should have got *smaller* shipped **5× larger**. Engineering
quantized it back (max channel delta 14/255, visually indistinguishable), but
that is a rescue, not a workflow.

**The rule:** any change to an existing plate — desaturate, darken, warm, cool,
flatten — is a re-render using the 16-colour palette, not a filter pass over the
previous export. If the palette does not contain the darker shade you need, the
palette entry is the thing to add.

**Self-check before delivering a plate:** it should have on the order of a few
hundred distinct colours, not tens of thousands, and it should be a palette PNG.
The other three scene plates are 223, and all are palette-encoded.

---

# GAME-FEEL BATCH (added 2026-08-06) — AR-030 … AR-032

These three exist for one reason, in Eric's words about the deployed Track:
*"it looks super amateur and not native... the train looks like it is imposed
onto the background and not an organic part of the scene."* That is correct and
it is an ART-SHAPED problem as much as a code one. `design/GAME_FEEL.md` is the
full doctrine; these entries are the art it needs. Track first, but the same
treatment is coming for the Map, Yard and Workshop.

> **⚠ These three OVERRIDE the "deliver at roughly 2× the drawn size" sizing note
> near the top of this file.** That rule is right for UI chrome, because
> `placeUiSprite` contain-fits into a fixed slot and native resolution only costs
> GPU memory. **These are world sprites, and for world sprites native resolution
> IS the drawn size.** A world sprite must share the background plate's pixel
> size; delivering these at 2× re-creates the exact bug they are fixing. Draw
> them at the pixel dimensions stated, no larger.

## AR-030 · Track foreground occluder overlay — HIGH

**The problem.** `src/assets/maps/track.json` has exactly ONE `base-plate` image
layer, so every pine, rock and bush is baked into the backdrop. The train draws
above all of it. The painted rails visibly pass *behind* the pines at the top of
the oval — and the train slides straight over them. Nothing in the scene can ever
occlude the train, which is most of why it reads as pasted on.

**Deliver:** the scenery that sits BETWEEN the viewer and the rails, cut out as
individual transparent PNGs — the pines, rocks and bushes that the painted
centreline passes behind (top of the oval especially, plus anything on the inner
and outer edge of the bottom straight).

For each prop, give its **placement x,y on the 2560×1440 plate** and its
**baseline Y** — the pixel row where it meets the ground. Engineering authors
those into a Tiled `props-layer` and depth-sorts each one independently, so the
train passes behind a far pine and in front of a near one.

**Do NOT redraw them and do NOT re-render the base plate.** Cut the existing
pixels. Because this is hard-edged 16-colour art, drawing the cut-out back at the
same position over the untouched plate composites to a pixel-identical image, so
there is no risk of a hole or a seam, and no second plate to keep in sync.

A single flat foreground PNG is an acceptable fallback if per-prop cutting is
painful, but it is strictly worse — one flat layer means the train is either
always in front or always behind, and the whole point is that it depends on where
it is.

**Unblocks:** Law 3 in `design/GAME_FEEL.md`, for the Track.

## AR-031 · Train vehicles redrawn at on-screen size (2 depth tiers) — HIGH

**The problem, measured.** Car art is 128×128 native (`train.png`, 1024×640,
40 frames = 5 types × 8 directions). It is drawn at `carW 0.11 × 2560` = **281.6 px**
wide, i.e. **2.2×**, and `TrackScene.depthScaleAt()` then multiplies that by a
continuously interpolated float (`farScale 0.9` → `nearScale 1.06`). Final scale
therefore wanders between **1.98× and 2.33×** and is almost never an integer.
Under nearest-neighbour filtering that maps each source pixel to 1 or 2 screen
pixels in a pattern that **reorganises every frame as the train moves** — the
train's pixels are both the wrong size relative to the background and unstable.
This is invisible in a screenshot and obvious in motion.

**Deliver:** all five vehicle types × 8 directions, drawn at final on-screen size,
in two depth tiers:

| Tier | Cell | Content width | Used where |
|---|---|---|---|
| NEAR | 288 × 288 | ~282 px | bottom / near half of the oval |
| FAR | 248 × 248 | ~240 px | top / far half of the oval |

Engineering then draws both at **scale 1** and switches tiers at the halfway
point, so the pixel grid is stable and matches the plate. Two tiers is enough —
the real perspective swing is only 17%.

**The FAR tier must be REDRAWN at the smaller size in the 16-colour palette, not
downscaled from the near art.** Same reasoning as the standing re-render rule
above: a resample invents intermediate colours and turns crisp pixels to mush.

## AR-032 · Train motion + ground kit: wheelsets and contact shadows — HIGH

**The problem.** Two of the eight laws fail here at once. (Law 2) **No world
object in this entire project has a contact shadow** — every `shadow` in the
codebase is UI chrome, so vehicles float above the rails. (Law 4) The train is a
static image being slid along a curve; there are exactly two registered
animations in the whole game, `smoke` and `signal-flash`, and no vehicle has a
cycle of any kind.

**Deliver two small sets:**

**(a) Animated wheelsets** — 8 directions × 4 frames of wheel rotation, drawn to
sit *under* a car body as an overlay, so one set serves every car type that
shares a truck. If the loco's drivers and side-rods differ from the wagons'
trucks (they should), deliver a separate loco set — the side-rod motion is the
single most train-like thing on screen. Small cells; these are wheels, not
vehicles. Engineering advances the cycle by **distance travelled**, not by a
timer, so the wheels turn in step with the train and stop when it stops.

**(b) Contact shadows** — one per vehicle type per direction, matching that
sprite's actual footprint, in the palette's darkest ground shade with the house
dither rather than a soft alpha blob. Delivered as separate sprites so
engineering can draw them one depth below the vehicle and squash them
independently.

**Unblocks:** Laws 2 and 4 for the Track, and the same kit is reusable for the
Yard's cars and for any future overworld character.
