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

## CURRENT VISUAL DIRECTION (2026-08-10) — read this before generating anything

**`STYLE_GUIDE.md`, `ART_BRIEF.md` and `ART_GENERATION_PROMPTS.md` are STALE and
carry deprecation headers. Do not generate from them.** They were written in late
June and describe a game that has changed materially since. In particular
`STYLE_GUIDE.md` still says the Track is a top-down oval; it is not.

### Projection is per scene. There is no global "isometric".

| Scene | Projection | Notes |
|---|---|---|
| **Map** | Top-down, floating island on black void | The one scene that still matches the old style guide. |
| **Yard** | Shallow 3/4, night lighting | Sidings recede; cars are drawn side-on within it. |
| **Workshop** | **Side-on** | A car on rails, seen from the side. Not isometric. |
| **Track** | **Side-on side-scroller** (since 2026-08-07) | Daylight sky, parallax bands, world scrolls right-to-left past a fixed marker. **The oval is retired.** This is what AR-034 … AR-039 are for. |

A vehicle drawn for one of these does not transfer to another — the Workshop's
side-on car set and the retired oval's 8-heading set were always different art.
The side-scroller uses **one heading only**, which is why AR-036 is ~8× less work
than the AR-031 it replaces.

### Where the truth actually lives

| For | Read |
|---|---|
| The palette | `design/palette-nintendo.json` — the single producer, mapped to the app's CSS vars. Not the hexes in `STYLE_GUIDE.md`. |
| What the style looks like NOW | The shipped sprites in `src/assets/sprites/` — `buttons/`, `instruments/`, `cars/`, `panels/`. **Trust these over any prose in this repo, including this file.** |
| What the game currently IS | `design/HISTORY.md` (why it is shaped this way) + `BASELINE.md` (what is measured and when). **Not `STATUS_LOG.md`,** which stopped being maintained on 2026-08-01. |
| The animation rules art has to support | `design/GAME_FEEL.md` — eight laws, each with the concrete way this project broke it. Laws 2 (contact shadows) and 3 (an actor must be able to pass behind something) are art dependencies, not code ones. |

### Bootstrapping a fresh art session

Minimum read set, in order: `PROJECT_CHARTER.md` → this file (contract block +
this section + the queue) → `design/GAME_FEEL.md` → **then open three shipped
sprites and look at them** (`instruments/inst-drums-passive.png`,
`buttons/btn-nav-yard.png`, `cars/boxcar.png`) before drawing a line.

### Two export lessons, learned the hard way — these are the contract now

1. **The transparency key colour must not appear anywhere in the subject.**
   `#00FF00` collides with teal characters; `#FF00FF` collides with red and
   purple ones. There is no safe default — pick the key per subject, against the
   colours actually in it.
2. **Verify the export, do not assume it.** Two checks, both cheap: (a) all four
   corner pixels must be *exactly* alpha 0, and (b) composite the file over a
   dark background and look at it. A bounding-box check outside the art is
   vacuous — it passes on a file with a full-canvas semi-opaque wash, which is
   precisely the failure that has now shipped three times (AR-009, AR-012,
   AR-017) and cost a full re-export of 24 files (AR-024).

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

## AR-027 · Car liveries as Beet-crew characters — LOW (nothing is blocked)

**Filed 2026-08-04 alongside the Yard car-identity work. This request blocks
NOTHING** — car identity shipped with no new art at all, using the `inst-*`
sprites already in the packed atlas plus flat colour panels drawn with Graphics.
It is logged now because it is the natural upgrade path and because it carries
one requirement that has to be stated *before* twelve sprites get drawn, not
after.

**Target files:** twelve new `livery-<n>-side.png`, 512² each, transparent.

**Why:** a car's assigned identity is currently a colour + a geometric glyph
(circle / square / triangle / diamond / star / plus / hexagon / ring). It works,
it is colour-blind-safe, and it is legible at the ~110×92 px the palette gives a
car — but it is the one piece of the scheme that is *abstract*, in an app whose
charter is "the Beet crew… friendly objects with faces". A frog car, a chipmunk
car and a rocket car would be strictly better at the same job.

**The requirement to fix now, while it is still cheap:** the twelve characters
must differ in **SILHOUETTE**, not only in paint. A frog and a chipmunk of the
same size in the same pose are the SAME CAR to a colour-blind kid, and at the
Track's ~160 px with perspective scaling they are the same car to everybody.
Vary the outline: tall/squat, round/angular, ears/horns/fins/antennae.

**Prompt:** "Twelve character emblems for train-car liveries, one 512×512
transparent PNG each, warm 16-colour palette, chunky pixels, 1px dark-plum
outline, drop shadow baked OFF. Each is a friendly creature or object head/bust
facing the viewer, filling most of the canvas. **The twelve must be
distinguishable from their OUTLINE ALONE** — vary height, width and profile, not
just colour. Deliver flat, no gradients."

**Unblocks:** nothing today. When it lands it is a **texture swap behind the
existing selector** — `livery-style.ts`'s `glyphFor(index)` returns a shape name
and `car-livery.ts` draws it; a sprite variant replaces that one call. No data
change, no schema change, no migration: livery is derived from `Part.color`'s
position in `CAR_COLORS`, which is already persisted.

---

## ✅ DONE — AR-026 · ×2 lever ON state + deck labels a non-reader can read — HIGH

**Delivered 2026-08-12.** `toggle-double-idle.png` preserves the existing down/OFF state and `toggle-double-on.png` supplies the up/ON state, both **512 × 512 RGBA** with true alpha-0 corners. `panel-editor.png` has been re-rendered at its unchanged **1152 × 1536** canvas with the four visual captions required for non-readers: wavy line, jagged line, quiet→loud speaker, and two equal notes. The green note board, control geometry, and outer hardware were preserved.

**Engineering handoff:** ✅ landed 2026-08-12 — `UI_SPRITES["toggle-double"]` exposes `idle`/`on`, `MelodyEditorPanel` does the ordinary frame swap (the mirrored-lever overlay, the gold arming tint AND the cream armed chip all retired — the ON plaque now states the truth the chip existed to patch over). The compatibility copy `toggle-double.png` is deleted and the UI atlas regenerated.

---

## AR-026 · ×2 lever ON state + deck labels a non-reader can read — HIGH (ORIGINAL SPEC)

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

> # ⛔ SUPERSEDED — AR-030 … AR-033 · DO NOT WORK ON THESE
>
> All four entries below were filed against the Track's **top-down oval**, which
> is no longer the premise. The Track is now a **side-scroller**: see the
> **SIDE-SCROLLER BATCH (AR-034 … AR-039)** at the end of this file, which
> replaces every one of them. AR-031's eight compass headings and two depth tiers
> do not exist any more; AR-033's redrawn oval plate is not needed at all.
>
> Kept only as a record of what was decided and why.

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

> **⚠ SUPERSEDED IN PART BY AR-033 (below). Read that first.** If AR-033 is
> approved, the Track plate is redrawn WITHOUT perspective and **the FAR tier in
> this entry is not needed at all** — deliver the NEAR size only, as the single
> size used everywhere. The two-tier table below applies only if the existing
> perspective plate is kept.

| Tier | Cell | Content width | Used where |
|---|---|---|---|
| NEAR | 288 × 288 | ~282 px | bottom / near half of the oval |
| FAR | 96 × 96 | ~76 px | top / far half of the oval |

**Corrected 2026-08-06 — the FAR tier is much smaller than first written.** The
first version of this entry said 248 px, on the assumption that the perspective
swing was the 17% implied by `farScale 0.9`/`nearScale 1.06` in `track.json`.
Those constants are wrong; they are the bug. The plate was then measured directly
— railway tie pitch along the direction of travel, **24.3 px far vs 90.0 px near**
— so the painted track's true perspective ratio is **3.7 : 1**, not 1.18 : 1. A
car on the far rails should be roughly **a quarter** the size of the same car on
the near rails. That is why the deployed train visibly is not on the track at the
top of the oval.

Engineering switches tiers with depth and scales smoothly *within* a tier, so
each tier is drawn near its authored size and resampling error stays small. Two
tiers rather than many: across a 3.7× range, quantizing into visible steps would
pop by ~55% and read worse than smooth scaling.

**Draw the far tier with fewer, larger pixels — do not just draw the near art
small.** At ~76 px wide a locomotive has room for a silhouette and little else;
detail that survives at 282 px turns to noise here. Read it as a distinct, simpler
drawing of the same vehicle.

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

## AR-033 · REDRAW the Track plate in the house projection — HIGH (supersedes half of AR-030/031)

**This is a premise fix, not a polish pass. Read it before starting AR-030 or AR-031.**

**The finding.** Three of the four scene plates are drawn in the classic 16-bit
oblique top-down projection — a fixed camera angle, no scale change with depth.
`map-scene-clean.png` and `yard-scene-clean-v2.png` both do this correctly:
constant tie pitch all the way along a track, buildings in 3/4 showing roof and
front face, depth read from overlap and stacking rather than from size. The Map
plate even contains a small oval of track whose far and near sides are **the same
size**, and the Yard has another at the top of the frame.

`track-scene-clean-v2.png` is the only outlier. It is drawn in strong one-point
perspective, measured at a **3.7 : 1** ratio (tie pitch 24.3 px far vs 90.0 px
near). That is not a SNES idiom — 16-bit hardware could not scale sprites, so the
era's games used fixed-angle projections precisely to avoid this.

**Why it has to go, beyond looking wrong.** It is not only an aesthetic mismatch:

1. **Sprites cannot be drawn correctly for it.** A vehicle must render legibly
   from 282 px down to 76 px, needing two entirely different drawings.
2. **The 8-direction sprite atlas is invalid under it.** Eight frames express
   *heading*. Under real perspective the camera's angle onto the object also
   changes as it travels around the loop — you would see the far side more from
   above and the near side more from the side. No heading-only atlas can express
   that, which is part of why the train reads as pasted on.
3. **It makes half the song unreadable.** On the Track, each car IS a bar of the
   kid's song. At a quarter size on the far rails, half the arrangement cannot be
   read or recognised. That is a product failure, not a style preference.
4. **It blocks the overworld.** A walkable character (planned) needs one
   consistent world grammar across Map, Yard and Track. The Track is the only
   scene it could not walk into unchanged.

**Deliver:** `track-scene-clean-v3.png`, 2560 × 1440, the same scene content —
oval of track, crossing signal, grass, pines, rocks — **redrawn in the Map's
projection**. Requirements:

- **No perspective.** Tie pitch, rail gauge and ballast width are constant all the
  way around the oval. Far and near sides are the same size.
- **Match `map-scene-clean.png`'s camera angle, palette and daylight**, so the
  three outdoor scenes read as one world. The Map's own small oval is the
  reference for exactly the shape wanted, scaled up to fill the scene.
- The oval still reads as an oval — a circle seen from the house angle is a
  vertically-compressed ellipse, which is correct and is what the Map already
  does. What must NOT vary is the *track's own width and tie spacing*.
- Keep the crossing signal at bottom-centre; it is the song's downbeat marker and
  code depends on its position.
- Same 16-colour palette discipline and palette-PNG encoding as the other plates
  (they are 223 colours; see the standing re-render rule at the end of this file).

**Deliver alongside it:** the foreground occluder cut-outs requested in **AR-030**,
taken from this new plate rather than the old one — the two jobs share all their
work, so do them together.

**What this unblocks in code.** `depthScaleAt()` collapses to a constant, world
sprites draw at ONE integer scale, Law 1 in `design/GAME_FEEL.md` is satisfied
with no exception needed, AR-031 loses its far tier entirely, and the same
vehicle art and contact-shadow kit becomes reusable across Track, Yard and the
future overworld.

---

# ✅ DONE — SIDE-SCROLLER BATCH (delivered 2026-08-10) — AR-034 … AR-039

**All six entries delivered in one session.** Files in `src/assets/sprites/track3/`.
Commits: AR-036 `37c02b2`, AR-034 `2961779`, AR-038 `c6114af`, AR-035 `a871eca`, AR-037 `c4eb8a0`, AR-039 `c2b3589`.

**Drop-in slots (live immediately):** `sky.png`, `hills.png`, `trees.png`,
`ground.png`, `fringe.png`, `mound.png`, `bridge.png`, `rain.png`, `wheel.png`.

**Needs engineering wiring:** `loco.png`, `car-*.png` (×4), `shadow.png`,
`btn-*.png` (×6), `legend-plate.png`, `now-post.png` — all loaded harmlessly,
wire per `src/assets/sprites/track3/README.md`.

**Hill profile:** mound.png verified against `terrain-profile.ts` table —
all 21 sample points within 1px tolerance. Bottom edge = railhead.

**Ground registration:** ground.png rail top confirmed at exactly y=30
(640/640 grey pixels at that row).

**Wheel symmetry:** wheel.png radially symmetric about (29.5, 29.5), 5 spokes.

**Alpha:** all 20 files pass four-corner alpha=0 check.

> **Read this header before starting any entry below.**
>
> **AR-030, AR-031, AR-032 and AR-033 are SUPERSEDED and must not be worked
> on.** All four were filed against the Track's top-down oval. The oval is no
> longer the premise: the Track is being rebuilt as a **side-scroller**, because
> the mechanic it has to carry — terrain picked live and applied to the *next*
> bar — is a SEQUENCE, and a ring cannot show sequence. On an oval half the cars
> always travel the opposite way across the screen and "next" has no direction.
> Anything drawn for the oval's projection, its 8 compass headings, or its depth
> tiers is wasted work. (Four art requests were filed and superseded in a single
> day once already. This header exists so it does not happen twice.)
>
> **The scene is already built and playable in greybox.** Open
> <https://ibeetkidz.pages.dev/?v3>, press RIDE, and tap HILL / BRIDGE / RAIN.
> Everything you see is a flat rectangle generated at runtime. Your art replaces
> those rectangles one at a time; the geometry, motion and gameplay do not
> change.
>
> ## How the swap works — drop the file in, that is all
>
> **Put the PNG in `src/assets/sprites/track3/` and it wins.** No manifest to
> edit, no code to change. The scene globs that folder, loads every file it finds
> under the key `trk-<filename>`, and only draws its greybox stand-in for the
> slots the folder does not provide. `sky.png` becomes `trk-sky`. A
> half-delivered batch runs fine — each slot falls back on its own.
>
> **Nine slots are live today and are pure drop-in:** `sky.png`, `hills.png`,
> `trees.png`, `ground.png`, `fringe.png`, `mound.png`, `bridge.png`,
> `rain.png`, `wheel.png`.
>
> **The rest need a small code change once they land, which engineering will
> do** — the scene has nowhere to put them yet: `loco.png`, the four
> `car-*.png` bodies, `shadow.png`, the six `btn-*.png` states,
> `legend-plate.png` and `now-post.png`. Deliver them anyway; they load
> harmlessly and get wired the day they arrive. See
> `src/assets/sprites/track3/README.md`.
>
> ## The one hard rule: the HILL must match the profile
>
> The train's height and tilt are computed from a mathematical curve
> (`src/game/terrain-profile.ts`). If the drawn hill does not match that curve,
> the train floats above it or sinks into it — which is exactly the bug the oval
> shipped with and the reason it is being replaced. AR-038 gives the curve as a
> table of numbers. **Trace it.** Every other entry is free-hand.
>
> ## Common facts for this batch
>
> - Design resolution is **2560 × 1440**. All pixel sizes below are in that
>   space, and they are the *drawn* size — deliver at 1× unless an entry says
>   otherwise. (This batch overrides the "2× everything" sizing note near the top
>   of this file: these are world/backdrop plates fitted to fixed bands, not
>   `placeUiSprite` chrome.)
> - The world scrolls **right-to-left**. Everything horizontal must **tile
>   seamlessly left-to-right** — the left and right edges of each strip have to
>   join with no visible seam, because they are repeated forever.
> - One bar of song = **640 px** of track. That is the rhythmic grid the whole
>   scene is laid out on; a strip whose repeat is a divisor of 640 (160, 320,
>   640) will feel deliberately in time with the music.
> - Horizon bands, top to bottom (y is measured from the top of the 2560×1440
>   frame): sky **0–470**, far hills **470–730**, treeline **690–1020**, ground
>   **980–1440**, near fringe **975–1105**. They overlap on purpose so nothing
>   shows a hard join.
> - **The railhead — where wheels touch — is y = 1010.** This single number is
>   what every vehicle and every terrain piece is registered to.
> - **True alpha 0** outside the art, as always. No paper wash, no grey key. See
>   the export warning at the top of this file; three drops have violated it.

---

## AR-034 · Parallax backdrop set: sky, far hills, treeline — HIGH

**Target files**
| File | Key it loads under | Size | Tiles |
|---|---|---|---|
| `src/assets/sprites/track3/sky.png` | `trk-sky` | 640 × 470 | horizontally |
| `src/assets/sprites/track3/hills.png` | `trk-hills` | 640 × 260 | horizontally |
| `src/assets/sprites/track3/trees.png` | `trk-trees` | 640 × 330 | horizontally |

**Why:** these three planes scroll at 5 %, 18 % and 42 % of the train's speed.
Parallax is what turns a flat backdrop into distance — but **parallax amplifies
depth, it does not create it.** The scene has to read as deep in a single frozen
frame first. That is done with *atmospheric perspective*: the further back a
plane is, the more it desaturates toward the sky colour, the lower its contrast,
and the less internal detail it carries.

- **Sky** — the flattest, palest plane. Warm-Nintendo daylight blue, a few soft
  cloud shapes. Almost no contrast. Clouds may be soft-edged; this is the ONE
  plane exempt from hard pixel edges.
- **Far hills** — a single rolling ridge line, heavily desaturated toward the
  sky (roughly 60–70 % of the way to the sky's hue), no trees, no texture, no
  outline. Silhouette only. It should look like it is kilometres away.
- **Treeline** — a band of conifers with a grass base, at maybe 75 % saturation
  of the near ground. This is the nearest of the three and carries the most
  contrast, but it must still sit clearly BEHIND the train.

**Prompt:** "Seamlessly tiling side-scrolling parallax backdrop for a kids'
16-bit train game. Three separate strips: a pale daylight sky with soft clouds; a
distant desaturated rolling hill ridge in silhouette; a band of pixel-art
conifers on a grass base. Warm Nintendo palette, chunky pixels, no gradients or
glow. Each strip must tile seamlessly left to right. Atmospheric perspective:
each plane further back is paler, lower contrast and less detailed."

**Unblocks:** replaces three generated colour bands. Highest visual payoff per
file in the batch — this is most of what the screen shows.

---

## AR-035 · Ground, rails, and the near grass fringe — HIGH

**Target files**
| File | Key | Size | Notes |
|---|---|---|---|
| `src/assets/sprites/track3/ground.png` | `trk-ground` | 640 × 460 | tiles horizontally |
| `src/assets/sprites/track3/fringe.png` | `trk-fringe` | 640 × 130 | tiles horizontally; **alpha above the grass tips** |

**The ground strip is registered to the railhead.** The strip is drawn with its
top edge at y = 980, and **the top of the rail — the line wheels sit on — must be
at exactly 30 px down from the top of this image.** Everything below that is
ballast, sleepers and grass receding toward the camera. Get this one number wrong
and every vehicle in the game floats or sinks.

- Sleepers should repeat on a spacing that divides 640 evenly (40 or 80 px), so
  the track visually ticks along with the beat.
- Below the ballast, ~360 px of near grass. This is the largest flat area on
  screen — give it enough texture to not read as a colour swatch, but keep it
  quiet; the train has to win.

**The fringe is the depth trick.** It is drawn **in front of the train** and
scrolls at 145 % of its speed. Its job is to let the train partially disappear
behind something, which is most of what makes a 2D scene feel three-dimensional
(GAME_FEEL Law 3). Grass tufts, weeds, the odd fence post.

- The top ~78 px must be **mostly transparent**, with only tufts and stalks
  poking up. Solid from about y = 78 down.
- The tips overlap the bottom third of the wheels on purpose. **Do not make it
  tall or opaque enough to hide the wheels** — a kid has to see them turning. A
  first pass at this was a full-height slab and it hid the entire railway.

**Prompt:** "Seamlessly tiling pixel-art railway ground strip for a 16-bit side
scroller: gravel ballast with wooden sleepers and a steel rail on top, then near
grass receding below. Plus a separate near-foreground grass fringe strip with
transparent background and only tufts and stalks reaching up from the bottom.
Warm Nintendo palette, chunky pixels, 1 px dark outlines, no gradients."

---

## AR-036 · Side-on rolling stock — the locomotive and four cars — HIGH

**This entry replaces AR-031 entirely, and it is roughly 8× less work than
AR-031 was.** The oval needed every vehicle in eight compass headings (40
frames). A side-scroller needs **one heading**. That budget should go into
drawing five vehicles *well*, big enough to have real detail.

**Target files** — all in `src/assets/sprites/track3/`
| File | Key | Size |
|---|---|---|
| `loco.png` | `trk-loco` | 380 × 220 |
| `car-boxcar.png` | `trk-car-boxcar` | 300 × 190 |
| `car-tanker.png` | `trk-car-tanker` | 300 × 170 |
| `car-hopper.png` | `trk-car-hopper` | 300 × 190 |
| `car-flatcar.png` | `trk-car-flatcar` | 300 × 110 |

**Registration — non-negotiable:**

- **Facing RIGHT** (the direction of travel).
- **Bodies only. Do NOT draw the wheels** — they are separate sprites so they can
  rotate (AR-037). Draw the chassis/underframe the wheels tuck under.
- The **bottom edge of the image is the railhead**: the point where the wheels
  would touch. Draw the body sitting above it with a small gap for the wheels
  (~55 px of clear space at the bottom, centred on the two axle positions).
- Axles are at **±84 px from the horizontal centre** of a 300-px car
  (±106 for the 380-px loco). Leave those two spots unobstructed.

**Each car needs a blank flank panel.** The game paints a coloured livery plate
with the car's NUMBER on the side of every car — that is how a kid knows the car
they built in the Workshop is the same car on the Track. Leave a clear,
low-detail rectangle roughly **170 × 68 px, centred horizontally, centred about
110 px above the railhead**. No rivets, no planking, no lettering there.

**Do not colour the cars.** Draw them in a neutral wood/steel base. Colour
identity is applied by the game and there are twelve of them; a car painted red
in the art would fight the blue it is assigned.

**Prompt:** "Side-on pixel-art rolling stock for a kids' 16-bit train game,
facing right, drawn without wheels so wheels can be attached separately. A
cheerful steam locomotive with a tall funnel and a cab, plus four wagons: a
boxcar, a tank wagon, a hopper and a flatcar. Neutral wood and steel colours, a
clear blank panel on each flank for a number plate, warm Nintendo palette, chunky
pixels, 1 px dark-plum outlines, hard drop shadows, no gradients."

**Unblocks:** the single largest legibility win. Right now every car is an
identical rectangle.

---

## AR-037 · Wheelsets and contact shadow — HIGH

**Target files**
| File | Key | Size |
|---|---|---|
| `src/assets/sprites/track3/wheel.png` | `trk-wheel` | 60 × 60 |
| `src/assets/sprites/track3/shadow.png` | `trk-shadow` | 280 × 40 |

**The wheel is ROTATED by the game**, at a rate driven by distance travelled —
halve the train's speed and the wheels visibly halve with it. So:

- It must be **radially symmetric about the exact centre of a 60 × 60 canvas**,
  or it will visibly wobble.
- It needs **spokes or a counterweight** — something asymmetric *within* the
  rim. A plain dark disc rotates invisibly and the train reads as sliding.
- Tyre, hub and 3–5 spokes is plenty at this size.

**The shadow is what puts the train on the ground** (GAME_FEEL Law 2 — no world
object in this project has ever had one). A soft dark ellipse, alpha around
0.3–0.4, no hard outline, transparent everywhere else. The game squashes and
stretches it as the car bounces, so draw it at rest.

**Prompt:** "A single pixel-art train wheel, perfectly centred on a square
transparent canvas, with a steel tyre, a hub and five spokes so its rotation is
visible. Plus a soft dark elliptical contact shadow on a transparent background.
Warm Nintendo palette, chunky pixels."

---

## AR-038 · Terrain pieces: hill, bridge, rain — HIGH

Three physical things a kid drops onto the track. Each one changes the music
(a hill slows the song, a bridge opens it up with reverb, rain roughs it up), so
each one has to look like the sound it makes.

### 038a · The hill — `src/assets/sprites/track3/mound.png` → key `trk-mound`, **1280 × 120**

**⚠ THIS IS THE ONE PIECE THAT MUST MATCH A SPECIFIED SHAPE.** The train's
height and tilt at every point are calculated from the curve below. Draw a
different hill and the train will float over it or cut through it.

The image is **1280 wide × 120 tall**. Its **bottom edge is the railhead**. The
ground surface — the line the wheels run on — must sit at exactly this height
above the bottom edge, at each fraction across the width:

| across the image | height above the bottom edge |
|---|---|
| 0 % | 0 px |
| 5 % | 3 px |
| 10 % | 11 px |
| 15 % | 25 px |
| 20 % | 42 px |
| 25 % | 60 px |
| 30 % | 78 px |
| 35 % | 95 px |
| 40 % | 109 px |
| 45 % | 117 px |
| **50 %** | **120 px (the summit)** |
| 55 % | 117 px |
| 60 % | 109 px |
| 65 % | 95 px |
| 70 % | 78 px |
| 75 % | 60 px |
| 80 % | 42 px |
| 85 % | 25 px |
| 90 % | 11 px |
| 95 % | 3 px |
| 100 % | 0 px |

It is a symmetrical raised cosine — it leaves the flat ground perfectly level,
swells to its summit in the middle, and settles back perfectly level. **It must
not meet the ground at an angle**; the join is the part the eye catches.

Fill below that line with earth/grass matching AR-035's ground, and run a rail
and sleepers along the crest so it reads as track climbing a bank. Everything
above the line is transparent.

### 038b · The bridge — `src/assets/sprites/track3/bridge.png` → key `trk-bridge`, **1280 × 170**

Its **top edge sits at the railhead**, so this is everything *below* the rails: a
girder or deck immediately under the track, then trestle piers descending into
the gap. The game paints a dark void behind it, so the piers should read against
darkness. Timber trestle or riveted steel — either fits the house style; timber
matches the existing yard furniture better. Tiles horizontally is a bonus, not
required.

### 038c · The rain — `src/assets/sprites/track3/rain.png` → key `trk-rain`, **128 × 128**

A **seamlessly tiling** sheet of diagonal rain streaks on transparent
background. The game scrolls it fast and downward inside the rainy stretch, so it
must tile in **both** axes. Pale blue-white, thin, mostly transparent — this is
drawn over the whole scene at ~75 % opacity and must not hide the train.

**Prompt:** "Pixel-art terrain pieces for a 16-bit side-scrolling train game: a
symmetrical grassy embankment with railway track running over its crest,
transparent above the ground line; a timber trestle bridge structure seen from
the side, deck at the top and piers descending; and a seamlessly tiling sheet of
thin diagonal rain streaks on transparent background. Warm Nintendo palette,
chunky pixels, 1 px dark outlines."

---

## AR-039 · The terrain legend and the NOW marker — MEDIUM

The HUD a kid actually touches. Currently three flat colour swatches and a thin
line.

**Target files** — `src/assets/sprites/track3/`
| File | Key | Size | Notes |
|---|---|---|---|
| `legend-plate.png` | `trk-legend-plate` | 940 × 220 | the bar the three buttons sit on |
| `btn-hill.png` / `btn-hill-pressed.png` | `trk-btn-hill` | 260 × 120 | two states |
| `btn-bridge.png` / `btn-bridge-pressed.png` | `trk-btn-bridge` | 260 × 120 | two states |
| `btn-rain.png` / `btn-rain-pressed.png` | `trk-btn-rain` | 260 × 120 | two states |
| `now-post.png` | `trk-now-post` | 90 × 340 | trackside marker post |

**These are picture buttons, not labelled ones.** The player is four years old
and cannot read. Each button carries a picture of the terrain — a green bank, a
trestle span, a rain cloud — in the same drawing style as the AR-038 piece it
places, so the button and the thing it makes are recognisably the same object.
The word underneath is for the adult.

Match the existing steampunk plaque language from
`src/assets/sprites/buttons/` — brass, wood, stone — so this reads as part of the
same machine as the Workshop and Yard chrome.

**The NOW post** is a trackside signal post marking where "now" is: the car
level with it is the one you are hearing. It stands on the ground beside the
track. It must read at a glance and must not look like scenery — this is the
single most important indicator on the screen.

**Prompt:** "Steampunk brass-and-wood control panel for a kids' 16-bit train
game, with three large picture buttons showing a grassy hill, a timber bridge and
a rain cloud, each in normal and pressed states. Plus a trackside signal post
marker. Warm Nintendo palette, chunky pixels, 1 px dark-plum outlines, hard drop
shadows, no gradients or glow."

---

### Delivery order for this batch

1. **AR-036** (rolling stock) — every car is currently an identical rectangle.
2. **AR-034** (parallax set) — most of the screen area.
3. **AR-038** (terrain pieces) — the mechanic's whole point, and 038a carries the
   one hard constraint.
4. **AR-035** (ground + fringe).
5. **AR-037** (wheels + shadow).
6. **AR-039** (HUD) — the greybox HUD is legible and tappable today, so this is
   last.

Any single file can land on its own and be visible immediately. Nothing here
blocks anything else.

---

## SIDE-SCROLLER BATCH — RECEIVED AND WIRED (2026-08-10)

All 20 files landed. **All are in the build and visible.** The nine drop-in slots
took effect with no code change, exactly as designed; the other eleven are now
wired (car bodies per type, locomotive, contact shadow, legend plate, six button
states, NOW post).

### Verification, measured rather than assumed

| Check | Result |
|---|---|
| Dimensions vs spec | **20/20 exact.** |
| Alpha channel present | **20/20** (PNG colour type 6). |
| Alpha 0 outside the art | Correct on every sprite. `sky`, `ground` and `mound` have opaque corners, which is *right* — they are full-bleed / ground-based plates, not sprites on a transparent surround. A blanket four-corner rule mis-flags them. |
| Hill profile vs `terrain-profile.ts` | Shape correct — matches the raised cosine at all 21 sample points. |
| `ground.png` railhead at row 30 | Correct. |
| `wheel.png` centring | **Exact**: opaque bbox centred on (29.5, 29.5) in a 60×60 canvas. |
| `fringe.png` transparent band | Exact: 0 % opaque above row 78, 53 % below. |
| Tiling seams | `sky`, `rain` (both axes), `ground`, `fringe` all clean. |

### Two findings worth a follow-up — neither blocking, both shipped as-is

**AR-038a hill: a uniform +4.5 px offset.** The drawn surface sits ~4.5 px above
the mathematical curve across the whole span (a base plinth/outline), and because
the summit would then exceed the 120 px canvas it is clipped, making the crest
~4 px *flatter* than the physics. Worst-case disagreement between where the train
is and where the ground is drawn: **5 px on a 120 px hill (4 %)**, roughly 2–3
device pixels on screen. Below the threshold that made the oval look broken, so
it is accepted. If `mound.png` is ever revised: draw the curve with its baseline
ON the bottom edge, and let the summit reach exactly 120.

**AR-034 `trees.png` has a visible horizontal tile seam.** Wrap-around column
difference is **6.5×** the image's own typical adjacent-column difference (~22
levels per channel). It will show as a faint vertical line every 640 px as the
treeline scrolls. `hills.png` scores 8× on the same metric but its absolute delta
is ~1.6 levels per channel — imperceptible, and not worth touching. **Only
`trees.png` is worth a re-export.**

### One spec correction for next time

`ground.png` was checked for sleeper texture near the railhead and has none — the
rows around the rail are flat horizontal bands. **That turned out to be correct**
and the request was wrong to ask for it: in a true side elevation a rail *is* a
flat horizontal line, and the ballast texture belongs below it, which is exactly
what was delivered. Recorded so a future reviewer does not "fix" it.

---

## ✅ DONE — AR-040 · Hill and bridge: revise for detail and fit — HIGH

**Delivered 2026-08-12 as three independently pushed commits.**

| Sub-item | Production file | Delivery commit | Verified result |
|---|---|---|---|
| 040a hill revision | `track3/mound.png` | `791f877` | 1280 × 120. Exact raised-cosine profile verified at all 21 required samples within 1px; baseline stays on the bottom edge; crest reaches 120px. Rebuilt with rail, beat-spaced sleepers, ballast, grass/earth material bands, and sparse terrain detail. |
| 040b bridge revision | `track3/bridge.png` | `4e95294` | 1280 × 170. Top edge remains railhead-registered; transparent support bays retained; stone abutments, timber bents, two-bay cross-bracing, deck beams, bolt plates, and weathering now provide readable structure. Piers reach the bottom edge. |
| 040c storm cloud | `track3/raincloud.png` | `28b5e93` | New 512 × 256 `trk-raincloud` asset. Heavy plum base and piled blue-grey tops; opaque content bbox `x=21, y=39, w=468, h=175`; every canvas-edge pixel and all corners are alpha 0. |

All three exports have real RGBA alpha and pass `scripts/check-sprite-alpha.sh`. The cloud key is already loaded and placed by `TrackV3Scene`; it needs no engineering wiring.

---

## AR-040 · Hill and bridge: revise for detail and fit — HIGH (ORIGINAL SPEC)

**Eric on the shipped batch:** *"the bridge animation isn't detailed enough, it
doesn't fit with the rest of the art."* The same is true of the hill. Everything
else in the side-scroller batch matches the house style; these two read as
placeholder solids sitting in front of good art rather than as part of the world.

The **shape of both is already correct and must not change** — the hill's
silhouette is a hard constraint (AR-038a) and the bridge's registration is right.
This is a detail-and-materials pass on the same geometry.

### 040a · `mound.png` — 1280 × 120, replaces the current file

Currently a flat brown lump with a faint line on top. Problems, in order:

1. **It is bare earth.** The ground either side of it is ballast, sleepers, rail
   and grass. The embankment has to be made of the same things — grass over its
   flanks, a proper rail-and-sleeper line running along the crest, and ballast
   under that line, so the track visibly continues up and over it.
2. **It does not meet the ground.** Its edges end abruptly against `ground.png`.
   The left and right ends should feather into the same grass and ballast tones
   so there is no seam where the embankment starts.
3. **No form.** One flat brown fill. It needs the house's 2–3 tone shading: a lit
   top face, a mid flank, a shadowed base, plus a little scatter (tufts, a rock
   or two) to break the silhouette.

**Keep exactly:** the 21-point height table in AR-038a, the 1280 × 120 canvas,
transparent above the ground line. **One correction to that spec:** draw the
curve with its baseline ON the bottom edge and the summit reaching exactly
120 px. The delivered file sits ~4.5 px high across the span and is clipped flat
at the top, which makes the crest slightly flatter than the physics.

### 040b · `bridge.png` — 1280 × 170, replaces the current file

Currently a simple timber trestle: uniform posts and a plain X-brace, no
material detail. It reads as a diagram.

- **Give it structure and material.** Stone or brick abutments at each end,
  timber piers between them, proper cross-bracing with visible joints, bolt
  plates, and the same 2–3 tone shading and 1 px dark outline everything else in
  this batch has.
- **Give it a deck.** Right now the girder under the rails is a flat bar. It
  should read as a real bridge deck — beams, tie plates, maybe a low parapet at
  the sides.
- **Weathering.** The rest of the scene is warm and lived-in; this is clean and
  grey. Some staining and variation in the timber will do most of the work.

**Keep exactly:** 1280 × 170, top edge at the railhead, transparent outside the
structure. The game draws a dark void behind it and clips that void to this
image's height, so the piers must reach the bottom edge.

### 040c · `raincloud.png` — NEW file, 512 × 256 → key `trk-raincloud`

Rain is the one terrain that is **weather, not ground**, so what a kid sees
coming is a storm cloud crossing the sky — not a wall of water standing on the
rails. (Two passes clipped the rain to its bar span and both read as a grey box
over the scene; Phaser 4 has no soft-edged mask, and a vertical wall of rain was
the wrong idea regardless.) When the cloud reaches the train, rain falls across
the whole screen and then passes.

The cloud is currently a flat grey blob. It needs to be a proper 16-bit storm
cloud: a heavy dark base with lighter piled tops, 2–3 tone shading, 1 px dark
outline, transparent background, and enough character to read as *the thing that
is about to rain on you* from across the room. It scrolls with the world at
track speed, so it should tile-neutral (no hard left/right edge features).

**Prompt:** "A 16-bit pixel-art storm cloud on a transparent background, warm
Nintendo palette: dark heavy flat base, lighter billowing piled tops, 2-3 tone
shading, 1 px dark-plum outline, no gradients or glow."

---

**Prompt:** "Detailed 16-bit pixel-art railway bridge seen from the side, warm
Nintendo palette: stone abutments at each end, weathered timber trestle piers
with cross-bracing and visible bolt plates, a beamed deck under the track, 2–3
tone shading, 1 px dark-plum outlines, no gradients, transparent background.
Plus a grassy railway embankment with ballast, sleepers and rail running over its
crest, shaded in the same style, feathering into flat ground at both ends."

---

## AR-009 — RIDE keycap halo: PRIORITY RAISED to MEDIUM

Logged as LOW when it only affected the Yard. `btn-track-ride` and the
transport keycaps are now on the side-scrolling Track's top bar, over a dark
panel, where the stray semi-opaque halo around the keycap art reads as a grey
box behind each button. Same fix as originally described — true alpha 0 outside
the keycap.

**Measured 2026-08-11, and it is not just the RIDE keycap.** Flood-filling the
background of every chrome sprite from its canvas border: **40 of 71 files**
carry a near-uniform dark layer over the WHOLE canvas at alpha 15–163, covering
33–58 % of each canvas. `btn-yard-totrack-pressed` corners sit at alpha 162;
`btn-transport-stop-idle` at 135; even `panel-header.png` and
`panel-transport-v2.png` carry it. It was invisible for months because every
view that used those buttons sat them on a dark stone plate; the side-scrolling
Track sits them on SKY, where each keycap draws a grey rectangle around itself.

`scripts/build_ui_atlas.py` now keys it out at pack time (border flood below
alpha 200, plus a dust sweep under alpha 40 for wash trapped inside a closed
shape), which is what the contract at the top of this file says engineering does
when a wash slips through. **The source files are still wrong** and should be
re-exported — the packer is a net, not a fix, and every wash it removes is a
wash that risks eating real art the next time the thresholds meet a sprite with
genuine translucency in it.

---

## AR-041 · Track vehicles: drop the baked track slice, draw the wheels — MEDIUM

The AR-036 side-on rolling stock is good art with two structural problems, both
found by measuring the delivered files rather than looking at them.

**1. Every vehicle carries a slice of track.** `loco.png` and all four
`car-*.png` have ~20 px of rail, ballast and sleepers baked across the bottom of
the canvas, with a ~7 px transparent gap between it and the vehicle's frame. The
scene already draws ground, rails and ballast as its own scrolling layers, so
each vehicle lays a second, non-scrolling rail on top of the real one. On flat
ground the two coincide and it reads fine; on a hill each car tilts its private
rail with it. **Please re-export each vehicle with its own frame at the bottom
edge of the canvas and nothing below it.**

**2. The locomotive's arches are empty.** `loco.png` draws two frame arches — a
big one under the cab at x≈77, a small one behind the cowcatcher at x≈270 — and
there is no wheel in either. It has been running on air since the side-scroller
landed. Engineering now places `wheel.png` in both arches (a driver and a pilot
wheel, each turning at its own radius), which is the right seam anyway because a
baked-in wheel cannot rotate — but the ARCH SIZES should be checked against a
60 px wheel: the front one is currently 28 px wide, so the pilot wheel is drawn
at 0.62 scale to fit a hole that a real pilot wheel would fill.

Same note for the cars: the arch centres measure at 24 % and 76 % of the canvas
width, which is what the scene now uses. If a future export moves them, say so —
that number lives in `TrackV3Scene.WHEEL_AT` and nothing else can detect a drift.

**Retired by this round:** `legend-plate.png` (`trk-legend-plate`) from AR-039 is
no longer loaded. The Track's job bar now mounts `panel-transport-v2`, the same
plate the Workshop and Yard use, docked to the bottom edge — Eric's report was
that the standalone plaque read as "superimposed onto the background as opposed
to natively embedded", and a bar that runs off the frame edge is what reads as
chrome. The three terrain picture buttons are unchanged and still in use.

---

## AR-042 · The crew, riding the cars — MEDIUM (new capability, not a fix)

Eric's idea, in his words: *"once you click on a character, you edit their
instrument for the loop, then you click okay when you're ready and instead of the
chalkboard, you physically see the character on the train car! that would need
new art for each character loaded onto each car, but i think that's cool and
worth it. they can be hanging off the cars in different dynamic ways based on the
image and construction of the cars themselves."*

**This is already shipped in its interim form** and needs no art to work: each
lane stands in the car's open interior drawn with that instrument's existing
`inst-*-passive` sprite, and tapping one opens the sequencer popup. What is
missing is the *riding* — right now every character stands upright in a row,
because a shelf pose is all that exists.

**What would earn new art**, in priority order:

1. **A riding pose per character** (8 characters): leaning on the car's side rail,
   sitting on the edge with legs over, holding the grab-iron. One pose each is
   enough to break the row-of-statues look. Same 576 × 768 canvas as the existing
   states so it is a texture swap with no reposition, named `inst-<id>-riding`.
2. **Per-car-type variants** only if (1) proves it is worth it — a boxcar's open
   side, a hopper's rim and a flatcar's bare deck each imply a different pose,
   which is 8 × 4 = 32 files. Do not start here.

Until then the interior the crew stands in is engine-drawn: a deep back wall and
a lighter floor derived from the car's own livery colour. That is deliberate —
`punch_void.py` cut a real hole in the car art so the chalkboard could show
through, and no art has ever existed for the inside of the car. **A painted
interior (three-quarter timber planking, a lit floor) would be a genuine
improvement** and is the smallest art job on this list.

## AR-043 · Track v3: a painted CLEAR plaque for the top bar — LOW

The side-scroller's top bar gained a fourth control (2026-08-12): **CLEAR**,
which empties the train (undoable — the "put it back" chip answers it). It
renders as the engine-drawn keycap fallback today, sitting at design-space
(1930, 170) on the header plate's parchment, sized 260 × 140.

Wanted: a chrome button in the same family as `btn-transport-stop` /
`btn-track-ride` (idle + pressed states), reading as "clear the train" to a
non-reader — e.g. an empty coupling hook, or a car being lifted away. Name it
`btn-track-clear` / `btn-track-clear-pressed` in the UI atlas and the code
finds it; the keycap is only the fallback.

## AR-044 · Tanker source alpha: interior pixels were half-transparent — FIXED IN REPO, RE-EXPORT WANTED

Eric's report (2026-08-12): "there are pixels missing for the three car" — on
the v3 Track the tanker's mid band showed the forest through the metal.

Measured on `src/assets/sprites/track3/car-tanker.png`: interior body pixels
carried alpha ≈ 140–228 where boxcar/hopper carry a clean 255 — the same
export disease as AR-009's background wash, but INSIDE the silhouette, where
the atlas packer's keying can't reach (track3 art loads directly, unpacked).

**The repo copy is repaired programmatically** (flood-fill from the borders;
every semi-alpha pixel not connected nor adjacent to the outside was
solidified to 255 — 5,589 pixels; antialiased edges and the genuine gaps under
the chassis were left untouched). The car now renders solid.

Still wanted from the artist, eventually: a clean re-export of the tanker (and
a check of `loco.png`, whose cab region also reads semi — possibly deliberate
window glass, so it was NOT auto-repaired). The programmatic fix is faithful
to the delivered shapes; a re-export is the honest source.
