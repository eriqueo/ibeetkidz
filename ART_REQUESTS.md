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

## ✅ DONE — AR-012 · Train ref frames: flatcar directions + loco rear view

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

## AR-014 · Track base plate re-render: perspective matched to the train — HIGH

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

## AR-015 · Train animation upgrade: 16 directions + wheel motion — MEDIUM

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
