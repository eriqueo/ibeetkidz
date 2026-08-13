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

## CURRENT PRODUCTION PRIORITY (2026-08-13, rev 5)

**Rev 3's entire queue is delivered AND integrated** (see "INTEGRATED" below).
Rev 5 is the review that followed, on the live screens.

1. **AR-060 — WHOLE cars with their insides drawn — P0, and read it before
   touching cabin art again.** AR-055 is delivered, mounted and per-type, and
   engineering has since matched the palettes by putting the car's own livery
   paint on the interior. It STILL reads as superimposed, for a reason no
   interior texture can fix: the punched void is one rectangle cut through four
   differently-shaped cars, including a cylinder. AR-060 replaces the
   body+interior+rail layering with one drawing per car type. **Three rounds of
   revised interiors have now been made; do not make a fourth.**
2. **AR-056 — the My Voice effect rack — P0.** Eight flat neon tiles with
   system emoji on a painted steel plate. Engineering has moved them onto the
   AR-054 keycap and made the labels fit; what is missing is the ICONS.
3. **AR-057 — the shared chrome pair: ✕ and DONE — HIGH.** Every tool panel now
   carries both, in the same slot, and both are stand-ins.
4. **AR-058 — the Percussion plate, redrawn into the machine-face family —
   HIGH.** AR-050's plate is a wooden frame around a flat field; next to
   AR-051's three steel machines it is now the odd one out.
5. **Open cleanup/polish:** AR-018, AR-006, AR-008, AR-009, AR-019, and AR-027.
   Do not retire these merely because they are old; only supersede them when a
   replacement request explicitly replaces their user-visible result.

**AR-055 and AR-059 are delivered and integrated** — see the INTEGRATED table.
6. **The TUNNEL world treatment is still parked** pending a design round (per
   AR-049), as are AR-049's optional painted night/tunnel washes. The NIGHT half
   is now painted art (AR-053's sky band + a wash over the land only); the tunnel
   is still a flat near-black rectangle. **Ask before building it** — the shape
   of a tunnel that a side-scrolling train enters and leaves is a design
   question, not a texture request.

### INTEGRATED 2026-08-13 (engineering)

| Request | Where it now shows |
|---|---|
| AR-020 | The oval Track header's SEND plaque (`TrackScene`); the cream chip is gone, ● REC still overprints during a take. |
| AR-022 | The Map's baked destination signs (no wiring — the scene art carries them). |
| AR-043 | The v3 Track header's CLEAR plaque, in a square slot beside RIDE and STOP. |
| AR-051 | `VoiceToolPanel`, `VoiceKeysToolPanel` and `MagicToolPanel`, mounted through the shared `BaseToolPanel.mountPlate` / `placePlate` seam that AR-050 now also uses. Controls sit in the measured recesses; the Magic playfield is left clear as asked. |
| AR-052 | The Workshop car's void: rear cabin behind the crew, bench rail in front of their legs, both travelling with the car on departure. |
| AR-053 | `trk-smoke` / `trk-splash` (picked up automatically by the drop-folder glob) and the NIGHT sky band, which now tiles and parallaxes over the day sky while the wash darkens only the land. |
| AR-054 | The percussion shelf's ten tinted keycaps and their drum icons, the percussion editor's row heads, and the conductor chalkboard's sound badges — which is where the six `tone-*` icons are reachable, every melody lane's clip being the built-in `note-do`. |
| AR-055 | The four per-car-type cabins, chosen by `cabinFor`. Engineering additionally put the car's LIVERY COAT on the interior — the body was tinted and the room inside it was not, so a gold tanker held a blue-grey steel room. Superseded in approach by AR-060; the art itself is what the current build ships. |
| AR-059 | The Beat Lantern, riding the sounding car's ROOF and flicking to its high frame on each of the bar's four beats (read off the transport position, not off distance travelled — a lantern pulsing with the wheels would be a wheel lantern). `trk-now-post` is retired wherever the lantern art is present, and remains the fallback when it is not. Anchored by the LOW frame's measured painted base rather than the canvas edge: hung by the canvas the lamp floated half a car above the roof, which is the exact detachment the lantern was drawn to fix. |

**Sizing note for every entry below.** Deliver at roughly **2× the drawn size**,
not at generation resolution. `placeUiSprite` contain-fits a sprite's *content
box* into a fixed slot, so native resolution changes nothing on screen — it only
costs GPU memory. Where an entry pins a canvas size, that number is derived from
the slot; do not round it up "for safety". (Measured: the live atlas is 61 frames
/ 34.1 Mpx, plus 28 dead frames / 13.8 Mpx that engineering is deleting
separately — the live art is correctly sized and does not need re-delivery.)

---

## AR-059 · Active-car Beat Lantern — HIGH

**Target files:**
- `src/assets/sprites/track3/beat-lantern-low.png`
- `src/assets/sprites/track3/beat-lantern-high.png`

**Why (2026-08-13 live Track review):** `now-post.png` is a tall detached NOW
sign planted behind the currently sounding car. It reads as trackside scenery,
not as a live musical cue; it also makes the active marker depend on a word.
The playing car needs a small, clearly attached visual beat that a non-reader
can follow instantly.

**Design:** a **Beat Lantern**—a compact brass railway signal lantern with a
warm cream lens, a tiny blue music-note cutout/vent, and a short springy brass
hanger. It is not a ball and not a placard. It lives immediately above the active
car roof, bobs on each beat, and reads as a music-powered railway signal. Low
state is the lantern a little nearer the roof; high state rises about 18–24px
with a brighter cream lens and a tiny two-pixel steam/note flick. The lantern
must be substantially wider than the current 90px NOW post but much shorter:
transparent **160 × 160** canvases, matching subject registration, no shaft to
the rail, no baked word. Use warm 16-colour Nintendo palette, chunky 2–4px
pixel clusters, 1px dark-plum outline, hard shadow only, true alpha 0 outside
art. It must read at an on-screen height around 45–55px.

**Engineering handoff:** retire `trk-now-post` and mount the paired Beat Lantern
above the active car roof, **in front of the car body** so the cue is visibly
attached rather than standing behind it. Swap low/high frame or tween the same
states with the sequencer beat; the marker tracks the currently sounding car
exactly as the current post does. No word label and no pole are retained.

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

## RETIRED — AR-025 · Sound Pads keycap — superseded by AR-054

The two neutral keycap states are too narrow a remedy for the current percussion
surface. AR-054 replaces this with a coherent drum-pad, row-control, and icon
system that shares the panel's material language. Do not generate AR-025 alone.

---

## AR-025 · Sound Pads keycap — SUPERSEDED SPEC

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

## ✅ CLOSED — AR-013 · Steampunk LCD display plate (SONG/TEMPO + SPEED readouts)

**Closed 2026-08-13 by product decision.** The engine-drawn SONG/TEMPO and SPEED
chips are no longer a requested art investment. Do not generate `panel-lcd.png`
or schedule wiring for it unless the product decision is explicitly reopened.

---

## AR-013 · Steampunk LCD display plate (SONG/TEMPO + SPEED readouts) — SUPERSEDED SPEC

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

## ✅ DELIVERED — AR-020 · SEND SONG plaque + result panel for the Track header — HIGH

**Art delivered 2026-08-13 in `15facf5`.** `btn-send-song-idle.png` and
`btn-send-song-pressed.png` are paired 1024 × 683 hard-alpha plaques in the
timber, brass, iron, and parchment control family. Their music card, train, and
upward-arrow pictogram explain sending/exporting a song, while the exact centered
**SEND SONG** label remains readable at header scale. Both have alpha-0 corners
and pass the sprite-alpha gate.

**Engineering handoff:** mount the paired atlas states at `TrackScene`'s current
`track-send` plaque site. Retain the existing send-state logic, REC state, and
result modal; this delivery replaces only the cream-chip fallback face.

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

## ✅ DELIVERED — AR-022 · Map building labels — HIGH

**Art delivered 2026-08-13 in `8ac2832`.** The canonical 2560 × 1440
`map-scene-clean.png` now includes three small physical signposts: **WORKSHOP**
beside the wrench-roof building, **YARD** beside the central rail shed, and
**TRACK** beside the oval loop. Each uses the existing map's dark wood, brass
fasteners, cream pixel lettering, hard shadow, and unobtrusive landmark-safe
placement. The map's rail geometry, buildings, paths, trees, terrain, and
floating-island silhouette are preserved; all four exterior corners are alpha 0.

**Engineering handoff:** no new loader or tap geometry is required—the live map
continues to use its canonical scene art. This is a visual legibility revision
only.

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

## RETIRED — AR-030 · Track foreground occluder overlay

**Retired 2026-08-13.** This belonged to the pre-V3 Track composition. The
side-scroller now uses its delivered ground, fringe, bridge, hill, rider, and
parallax layers; generate only against current Track V3 requests.

---

## AR-030 · Track foreground occluder overlay — RETIRED SPEC

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

## RETIRED — AR-031 · Train vehicles redrawn at on-screen size

**Retired 2026-08-13.** Its old projection and depth-tier assumptions were
replaced by Track V3 side-on rolling stock, separate wheelsets, and AR-041's
remaining source-cleanup check.

---

## AR-031 · Train vehicles redrawn at on-screen size — RETIRED SPEC

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

## RETIRED — AR-032 · Train motion + ground kit

**Retired 2026-08-13.** Track V3 has delivered wheel, shadow, ground, and fringe
assets; remaining vehicle-source work is documented precisely in AR-041.

---

## AR-032 · Train motion + ground kit — RETIRED SPEC

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

## RETIRED — AR-033 · Track plate redraw

**Retired 2026-08-13.** The V3 side-scroller replaced the oval Track plate and
its projection assumptions. Current Track changes must use the live V3 art
seams, not this retired plate brief.

---

## AR-033 · Track plate redraw — RETIRED SPEC

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

## AR-042 · The crew, riding the cars — SUPERSEDED BY AR-046 (2026-08-12)

> The tap-to-edit flow shipped with the crew rework (one character per
> instrument; riders open their own editors). The ART half — riding poses —
> is superseded by **AR-046**, which upgrades it to per-car INTEGRATED poses
> with a measured registration contract. Generate from AR-046, not from the
> canvas notes below.

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

## ✅ DELIVERED — AR-043 · Track v3: a painted CLEAR plaque for the top bar — HIGH

**Art delivered 2026-08-13 in `a684424`.** `btn-track-clear-idle.png` and
`btn-track-clear-pressed.png` are matched 512 × 512 hard-alpha states in the
Track plaque family: steel frame, cracked black stone, brass bolts, readable
cream pixel lettering, and a broom sweeping small car blocks from a rail. The
files have alpha-0 corners and pass the sprite-alpha gate.

**Engineering handoff:** replace `TrackV3Scene`'s engine-drawn CLEAR keycap
fallback with the two new atlas states at the existing `btn-track-clear` button
site. The control remains undoable; this delivery changes only its visual face.

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

## ✅ DONE — AR-045 · The CONDUCTOR — replaces the raccoon on the Workshop floor — HIGH

**Delivered 2026-08-12 in `b45b8f1`.** The standard 576 × 768 RGBA station set is now present:
`inst-conductor-passive.png`, `inst-conductor-hover.png`, and
`inst-conductor-active.png`. It depicts a round, mustachioed human who reads as both an orchestra conductor and a train conductor: navy cap with brass badge, tailcoat, red neckerchief, baton, and pocket watch. Hover is a brighter attentive state; active is a larger raised-baton performance cue. Each export is hard-alpha, palette-limited, and has true alpha-0 corners.

**Engineering handoff:** ✅ landed 2026-08-12 — `UI_SPRITES["inst-conductor"]`
declared (content box measured: bbox 393×591+92+81 of 576×768), the Workshop
map's floor slot (object 41) renamed and repointed to `inst-conductor`, and
the UI atlas regenerated (75 sprites, now 4 pages — the multiatlas loader
takes its page list from the JSON, so no code change). The tap still routes
to the whole-train chalkboard. `inst-pads` stays in the atlas: it remains the
tone-family fallback picture (`livery-style.ts`) and the icon on lanes made
by the retired Sound Pads panel.

---

## AR-045 · The CONDUCTOR — replaces the raccoon on the Workshop floor — HIGH (ORIGINAL SPEC)

Eric's brief, in his words (2026-08-12): *"have the racoon art change it to
being a conductor of the train — and lets get rid of the raccoon art and have
a silly conductor be a human, fat and with a mustache, with a orchestra
conductor's clothes, but looking like a train conductor, leaning into the pun."*

So: one silly human — round, mustachioed, tailcoat-and-baton ORCHESTRA
conductor dress that simultaneously reads as a TRAIN conductor (cap with a
badge, pocket watch, maybe a whistle). The pun is the character.

**Role (already wired, 2026-08-12):** tapping this character opens the
whole-train chalkboard — the meta view of every lane in the car. Every OTHER
character now opens its own instrument editor directly, and all percussion
folded into ONE frog whose tap opens the revamped drum grid. The conductor is
the only "see everything" surface, which is exactly the meta-ness Eric found
confusing when it wore a raccoon holding sound pads.

**Deliverables:** the standard station set at the standard canvas —
`inst-conductor-passive|hover|active` (576 × 768 RGBA, true alpha-0 outside
the art, same framing as the other eight characters). The Tiled workshop map
and the shelf keep the raccoon's slot; engineering swaps the sprite id when
the files land.

**Engineering note (for whoever wires it):** the retired Sound Pads panel was
the only surface listing a kid's PAST recordings (`PadsToolPanel`, parked in
`tool-panels.ts` with this note referenced). The sound library needs a new
home before that class is deleted.

## AR-046 · The crew INSIDE the cars — per-car integrated riding art — HIGH

### ✅ First delivery complete — Drums (2026-08-12, `bf02622`)

The four per-car frog files are now live: `ride-drums-boxcar.png`,
`ride-drums-hopper.png`, `ride-drums-tanker.png`, and
`ride-drums-flatcar.png`. Each is a 120 × 120 hard-alpha drop-in with its
bottom anchor on the scene’s corresponding measured peek line. The poses are
specific to the car construction: roofline lean, hopper-rim grip,
barrel-top peek, and seated flatcar-deck pose. A true-scale composite check
confirmed all four land against the supplied car bodies with no code changes.
### ✅ Second delivery complete — Piano (2026-08-12, `1c247d1`)

`ride-piano-boxcar.png`, `ride-piano-hopper.png`,
`ride-piano-tanker.png`, and `ride-piano-flatcar.png` now retain the husky’s
aviator goggles, black-and-cream face pattern, and red neckerchief at Track
scale. A true-scale composite check confirms their paws and compact seated pose
land on the corresponding roofline, rim, barrel, and deck seams.

### ✅ Seventh delivery complete — Magic Pad (2026-08-13, `c71a9ee`)

`ride-magic-boxcar.png`, `ride-magic-hopper.png`, `ride-magic-tanker.png`, and
`ride-magic-flatcar.png` complete the blue fox wizard's car-native sequence.
Every pose preserves the oversized purple star hat, yellow trim, blue fox
silhouette, and theremin antenna/console cue. The tanker deliberately exposes
only the head/hat/upper identity behind the barrel; the flatcar holds a compact
theremin-stage pose.

### ✅ AR-046 COMPLETE — all 28 integrated rider files delivered

The seven four-car families—drums, piano, guitar, violin, mic, Voice Keys, and
Magic Pad—are now present as `ride-<station>-<car>.png` under `track3/`. Each
family was validated on the measured Track peek lines and through the sprite
alpha gate before its independent commit. The Track scene discovers these files
through its existing per-car rider texture seam; no new art-loader code is
needed.

### ✅ Sixth delivery complete — Voice Keys (2026-08-13, `300fe88`)

`ride-keys-boxcar.png`, `ride-keys-hopper.png`, `ride-keys-tanker.png`, and
`ride-keys-flatcar.png` now retain the squat purple-bear silhouette, propeller
cap, pale belly, and rainbow keyboard at Track scale. Their measured car poses
are roofline lean, rim grip, barrel peek, and low-car stage position; the tanker
intentionally carries only the character's upper identity above the barrel.

### ✅ Fifth delivery complete — Mic (2026-08-13, `3fdda24`)

`ride-mic-boxcar.png`, `ride-mic-hopper.png`, `ride-mic-tanker.png`, and
`ride-mic-flatcar.png` now carry the chipmunk singer’s brown/cream silhouette,
gold star sunglasses, buck tooth, striped tail, and vintage silver microphone
into distinct roofline, rim, barrel, and deck contacts. A measured Track
peek-line composite confirmed that only the intended upper performer rises
above the three high car walls, while the flatcar uses a deck-anchored stage pose.

### ✅ Fourth delivery complete — Violin (2026-08-13, `2cd10e6`)

`ride-violin-boxcar.png`, `ride-violin-hopper.png`,
`ride-violin-tanker.png`, and `ride-violin-flatcar.png` now make the lime-green
three-eyed alien, purple-and-gold suit, antenna bulbs, orange bowed string
instrument, and bow read at Track scale. Each pose was reviewed at the real
Track peek line: roofline lean, rim grip, barrel-top peek, and deck-anchored
flatcar performance. The tanker crop intentionally hides the lower body behind
the barrel rather than showing a full sprite floating over it.

### ✅ Third delivery complete — Guitar (2026-08-12, `2b7ddef`)

`ride-guitar-boxcar.png`, `ride-guitar-hopper.png`,
`ride-guitar-tanker.png`, and `ride-guitar-flatcar.png` now carry the orange
tabby’s black jacket and blue bass-guitar identity into distinct roofline, rim,
barrel, and deck interactions. Exports were rechecked after a strict
checker-matte cleanup; all have true hard alpha and bottom-row contacts.

All 28 requested per-car rider files are now delivered.

Supersedes AR-042's riding-pose items (AR-042's tap-to-edit flow shipped with
the crew rework; its art half moves here, upgraded per Eric's direction,
2026-08-12): *"i dont want them just ontop of the train, i want art of them
inside the train, integrated natively into each car based on the car's art."*

**What ships today (the honest interim):** the crew draws BEHIND each car body,
top-anchored at a measured per-car peek line, so the wall occludes the lower
body and heads-and-shoulders rise from inside (GAME_FEEL Law 3 — the actor
passes behind something). It works, but it is the shelf art peeking over a
wall, not a character interacting with THAT car.

**The ask — one file per character per car type**, drawn as the VISIBLE
PORTION ONLY, natively posed against that car's construction:

- **boxcar** — leaning out over the roofline / through the sliding door's top
  gap, forearms on the roof edge;
- **hopper** — down in the open bay, elbows hooked over the rim;
- **tanker** — behind the barrel, hands on the tank top, or straddling it;
- **flatcar** — seated or standing on the bare deck, legs over the near lip.

### Registration contract (this is what makes it a drop-in)

Files go in `src/assets/sprites/track3/` named
**`ride-<station>-<carType>.png`** (e.g. `ride-drums-hopper.png`). The scene
already looks these keys up and, when present, draws the file IN FRONT of the
body with its **bottom edge sitting exactly on that car's peek line** — so the
art must contain NOTHING that should be hidden by the car, and its bottom row
IS the line it rests on. The peek lines, measured off the delivered
`car-*.png` (canvas px from the art's top edge):

| car | canvas | peek line (y from top) | what the line is |
|---|---|---|---|
| boxcar | 300 × 190 | 8 | the roofline |
| hopper | 300 × 190 | 14 | the open rim |
| tanker | 300 × 170 | 30 | the barrel top |
| flatcar | 300 × 110 | 10 | the deck lip |

Suggested canvas ≈ **120 × 120** per file (the scene contain-fits to a
100 × 116 design-px slot, never upscaling past 1:1). Match the CAR sprites'
pixel density and style — 1px dark-plum outline, hard shadows, warm palette
(`design/palette-nintendo.json`) — these composite ONTO the cars, so any
density mismatch reads instantly. Hands/elbows overlapping the wall are the
whole point: the file is in front, so contact with the car's own ironwork is
what "integrated natively" means. Alpha-export rules from the top of this
file apply (true alpha 0, corners clear, verify over a dark background).

### Order of delivery (28 files total — land them incrementally, each works alone)

1. `ride-drums-*` (4) — the frog is on nearly every car (all percussion folds
   into it since the crew rework).
2. `ride-piano-*`, `ride-guitar-*` (8) — the common melody characters.
3. `ride-violin-*`, `ride-mic-*`, `ride-keys-*`, `ride-magic-*` (16).

A generic `ride-<station>.png` (whole character, any pose) is also honoured as
a middle fallback — drawn behind the wall like the interim — but the per-car
files are the ask; do not spend the generic set first.

**Unblocks when it lands:** each file replaces its interim the moment it is
committed — no code change, the same drop-a-PNG seam as every track3 slot.

---

## ✅ DONE — AR-047 · Track runtime bridge rebuild — HIGH

**Delivered 2026-08-12 in `c9adb1c`.** Replaced
`src/assets/sprites/track3/bridge.png` with the full 1280 × 170 side-on timber
trestle now required by the Track scene. The old sprite was rail-correct but
read as a sparse, repeated construction diagram while the `btn-bridge` preview
was a richly authored world object. The replacement carries the button’s
quality bar into the runtime world: a weathered timber deck fascia, varied
brace rhythm, iron straps and bolts, genuinely transparent bays, and
stone/grass end landings.

**Registration and export checks:** the railhead is at **y=0**; non-transparent
content bbox is `x=3 y=0 w=1274 h=168`; all four corners are exact alpha 0;
`scripts/check-sprite-alpha.sh` passes. The existing `trk-bridge` loader needs
no engineering change.

---

## ✅ DONE — AR-048 · The BACKWARDS switch — a painted lever for the Track's job bar — MEDIUM

**Delivered 2026-08-13 in `b2094a0`.** The Track sprite folder now contains
`btn-backwards.png` and `btn-backwards-pressed.png`, both 260 × 120 with true
hard alpha. The pictogram combines tape reels, a strongly leftward gold arrow,
and a reverse-facing little locomotive, so a non-reader can infer the mode.
The paired recessed state preserves the same canvas for a texture swap; the
sprite-alpha gate and dark-composite export check pass.

**Engineering handoff:** the current `TrackV3Scene` still renders its rectangle
and text fallback, so wire these two assets at the existing BACKWARDS button
site. They are delivered and ready; the art does not require a new scene seam.

---

## AR-048 · The BACKWARDS switch — a painted lever for the Track's job bar — MEDIUM (ORIGINAL SPEC)

> Numbered AR-048 after a mid-air collision: the art agent minted AR-047 for
> the bridge rebuild above while this entry was still unpushed as "AR-047".
> The agent's number stands (it is already in its delivery ledger); this is
> the same request, renumbered.

The Track's bottom bar gained a fourth control (2026-08-13): **BACKWARDS**,
which plays every sampled voice tape-reversed until toggled again (melody
synths keep playing forward; the drums-and-takes flip is what reads as
backwards). It latches like the terrains, and shows as a keycap fallback at
design-space (1930, H−145), 300 × 120, until painted.

Wanted: a picture button in the same family as `btn-hill`/`btn-bridge`/
`btn-rain` (260 × 120 idle + pressed), readable by a non-reader as
"everything runs backwards" — e.g. a tape reel with arrows running the wrong
way, or the little loco mirrored driving in reverse. Name it
`btn-backwards.png` / `btn-backwards-pressed.png` in
`src/assets/sprites/track3/` and the scene's drop-a-PNG seam takes it; add a
LATCHED (on) state variant `btn-backwards-on.png` if a third frame is cheap —
the code currently shows the latch as a gold wash.

## ✅ DONE — AR-049 · The mode switches: NIGHT / TUNNEL / TINY / GIANT — buttons + world washes — HIGH

**Button delivery complete 2026-08-13 in `62760ca`.** Eight matched 260 × 120
true-alpha assets now provide idle and pressed states for NIGHT, TUNNEL, TINY,
and GIANT. Each uses the existing terrain-button brass/steel picture-button
language and a non-reader pictogram: moon/pines, tunnel mouth, little
loco/mouse, and giant loco/dinosaur. State pairs share an exact canvas and the
sprite-alpha gate passes; the current Track drop-a-PNG seam requires no wiring.

**Deferred by design:** painted NIGHT sky and TUNNEL world treatments remain a
separate world-art round; the controls are complete without baking a flat overlay
into an art sprite.

---

## AR-049 · The mode switches: NIGHT / TUNNEL / TINY / GIANT — buttons + world washes — HIGH (ORIGINAL SPEC)

The Track's job bar is eight latching, STACKING switches now (2026-08-13):
the geometry trio, then NIGHT, TUNNEL, TINY, GIANT, then BACKWARDS (AR-048).
The four new modes render as keycap fallbacks; the bar sits eight-across on
`panel-transport-v2`'s parchment (slots ≈ 208 px wide, centres at
x = 400 + (i + 0.5)·1664/8, i = 3..6).

**1. Four picture buttons**, same family and size as `btn-hill`/`btn-bridge`/
`btn-rain` (260 × 120, idle + pressed), named `btn-night`, `btn-tunnel`,
`btn-tiny`, `btn-giant` (+ `-pressed`) in `src/assets/sprites/track3/` — the
drop-a-PNG seam takes them, and they will draw at ~0.72 scale in the slot.
Non-reader reads: a moon-and-stars sky (night), a tunnel mouth in a hillside
(tunnel), the loco drawn wee with a mouse beside it (tiny), the loco drawn
huge with a dino silhouette (giant). NOTE the buttons latch: the code holds a
gold wash on a latched switch, so keep the idle art readable under tint.

**2. World washes (lower priority, replaces flat rects):** while NIGHT is
latched the scene shows a flat dark-blue full-screen rectangle, and TUNNEL a
near-black one. Painted versions would be: a night sky band (stars, a moon —
same 512-wide tiling contract as `trk-sky`, key `trk-sky-night`) and a tunnel
treatment (a scrolling rock-wall foreground strip + roof band). Ask before
building the tunnel one — it may want its own design round with Eric.

Reminder that **AR-048 (the BACKWARDS lever)** is already queued and unblocks
the eighth slot's art; nothing about it changed.

---

---

## ✅ DONE — AR-048 · Track world-depth: layered distant hills — HIGH

**Delivered 2026-08-12 in `03b87a9`.** Replaced `track3/hills.png` at its
existing 640 × 260 slot with a multi-depth distant world layer: pale far ridge,
blue-green foothills, a restrained dark-pine middle band, and an irregular
sand/grass horizon. This replaces the near-empty single sand silhouette that
made the Track read as a train on a flat wallpaper band.

The source was checked against a dark composite, chroma-key residue was removed,
all four corners are exact alpha 0, and `scripts/check-sprite-alpha.sh` passes.
It remains a separate transparent parallax strip; the near treeline and ground
continue to layer independently.

## ✅ DONE — AR-050 · The Percussion Editor's painted plate — the frog's drum machine — HIGH

**Delivered 2026-08-13 in `5ab9a59`.** `panel-percussion.png` is a 1536 × 1152
true-alpha steel-and-wood drum-machine plate. Its low-contrast recessed grid
field retains the plain left row-head rail for engine-drawn emoji/mute/delete
controls, while the lower shelf contains ten distinct square recesses for the
engine-drawn drum pads. This makes the controls look embedded rather than
stickered, without competing with colored active cells.

**Engineering handoff:** rebuild the sprite atlas, mount `panel-percussion.png`
for `PercussionToolPanel`, then retain the current row/cell/pad code over the
matching clear zones. No behavior changes are required.

---

## AR-050 · The Percussion Editor's painted plate — the frog's drum machine — HIGH (ORIGINAL SPEC)

The frog's tool (2026-08-13 revamp) is the busiest new surface in the app and
the barest: rows of engine-drawn cells on the generic parchment panel. It
deserves the `panel-editor` treatment (AR-016's melody plate is the quality
bar and the family to match).

**One landscape plate** for the tool region (the panel contain-fits it, so a
~1536 × 1152 canvas works; match `panel-editor`'s pixel density and steel/
wood/brass family):

- a recessed GRID FIELD occupying the upper ~84% of the inner area, with a
  row-head rail down its left ~16% (the sound emojis, mute and ✕ sit on it —
  engine-drawn over the plate, so leave the rail plain);
- a DRUM SHELF strip along the bottom ~16%: ten shallow square recesses in a
  row (the ten coloured drum pads sit IN them; today they read as stickers);
- keep the field itself dark and low-contrast — the cells tint per drum
  colour and must stay the loudest thing on the plate.

Name it `panel-percussion.png` under `src/assets/sprites/panels/`, rebuild
contract as usual (engineering regenerates the atlas and mounts it; the cell
grid stays engine-drawn over the plate exactly like the melody editor's).

## AR-051 · Painted plates for My Voice, Voice Keys and the Magic Pad — P0

### ✅ First delivery complete — My Voice (2026-08-13, `bf165c8`)

`panel-voice.png` is now a 1536 × 1152 hard-alpha recorder-machine face in the
Melody/Percussion steel, timber, and brass family. It has a broad microphone
record bay, quiet status strip, eight 4×2 FX recesses, and two lower send bays
that align to the existing `VoiceToolPanel` proportions. The generated plate
was checked over dark ground, has alpha-0 corners, and passes the sprite-alpha
gate.

**Engineering handoff:** mount it below `VoiceToolPanel`'s existing controls;
the engine-drawn record button, status, 4×2 FX grid, and two send buttons are
already positioned to the matching plate recesses. Do not retain the generic
parchment frame behind it.

### ✅ Second delivery complete — Voice Keys (2026-08-13, `e29fa62`)

`panel-keys.png` is a 1536 × 1152 hard-alpha vocal-keyboard machine face. Its
broad record bay, thin status strip, eight equal tall keyboard recesses, and
centered send bay map directly to `VoiceKeysToolPanel`'s existing control
proportions. It retains the same steel, timber, brass, and non-reader music
language as the My Voice plate; alpha corners are 0 and the sprite-alpha gate
passes.

**Engineering handoff:** mount it behind Voice Keys' existing record/status,
eight key buttons, and Add-to-Car control. Keep the engine controls in the
matching recesses and retire the generic parchment frame.

### ✅ Third delivery complete — Magic Pad (2026-08-13, `e3f2eda`)

`panel-magic.png` is a 1536 × 1152 hard-alpha theremin machine face. It provides
four wave-selector recesses, a large deliberately quiet XY playfield, and paired
Record/Send bays; the antenna-like side details distinguish it without breaking
the shared steel, timber, and brass tool family. Alpha corners are 0 and the
sprite-alpha gate passes.

**Engineering handoff:** mount the plate behind `MagicToolPanel`'s four wave
buttons, engine-drawn XY zone/dot/hint, and bottom Record/Send controls. Its
large empty central face is reserved for the live pointer interaction—do not
cover it with decorative art or retain the generic parchment frame.

### ✅ AR-051 COMPLETE — all three remaining painted tool plates delivered

My Voice, Voice Keys, and Magic Pad now have their dedicated physical-machine
surfaces. Each asset matches the existing engine control geometry, has true hard
alpha, and is ready for its corresponding panel to replace generic parchment.



These are the three remaining generic-parchment tools. Deliver **one painted
machine face at a time**, My Voice first: `panel-voice.png` needs a large mic
mount and FX-tile rack; `panel-keys.png` needs a child-readable keyboard ledge;
`panel-magic.png` needs a substantial XY pad face and wave-picker rail. Each
plate must leave the engine-drawn controls in quiet, precisely recessed zones
rather than putting a new ornamental frame behind a generic interface.

**Acceptance bar:** at runtime each tool must read as a dedicated physical music
machine in the same steel/wood/brass family as Melody and Percussion, not as a
parchment modal with controls pasted on top. Engineering measures the recesses
and mounts the existing controls on delivery.

## ✅ DELIVERED — AR-052 · The Workshop car's painted cabin — P0 (character integration)

**Art delivered 2026-08-13 in `0a5cb26`.** The standardized 1612 × 430 void now
has two aligned transparent production layers under `sprites/panels/`:
`workshop-car-interior.png` (rear timber cabin, warm lamps, floor/bench plane,
central chalkboard-safe wall) and `workshop-car-foreground-rail.png` (front
bench/rail, cable and tool-box accents). Both export with hard alpha and alpha-0
corners; the composite review verifies the intended weave: rear interior → car
body → crew → foreground rail.

**Engineering handoff:** replace `drawCarInterior()`'s two procedural bands with
the rear sprite at the current `voidRect`; load the foreground rail as a second
sprite at the same rect and put it above `DEPTH_RIDER`. The rail must travel with
the car and crew on departure. This final front pass is the part that grounds
lower legs and makes the musicians read inside the car rather than pasted into
its opening.

---

## AR-052 · The Workshop car's painted cabin — DELIVERED SPEC

This request exists to solve the current Workshop failure visible in the live
screen: the characters read as a line of large cut-outs pasted into a flat
maroon void, not as musicians seated or standing **inside a moving workshop car**.
A background-only replacement is insufficient.

**Deliver two aligned shared layers for the identical void** `x=474 y=280
w=1612 h=430` on the 2560 × 1440 car canvas:

1. `workshop-car-interior.png` — three-quarter timber back wall, warm practical
   lamps, shallow shelves/tool hooks, and a lit floor or bench plane with clear
   depth; keep a calm central zone for the chalkboard.
2. `workshop-car-foreground-rail.png` — a transparent foreground sill/bench/
   rail strip that can draw **in front of the crew's lower legs**, grounding
   them on a shared seat/floor line and giving the eye a car-side occlusion plane.

The four car types can share both layers. Engineering must place the interior
behind crew/chalkboard and the foreground rail above the crew, all at the
existing punched-void registration. The acceptance test is simple: in the
Workshop screenshot, each character must look seated, leaning, or standing on a
real interior surface—not pasted onto a colour rectangle.

## AR-054 · Percussion Editor coherence pass — P0

### ✅ Final delivery complete — 2026-08-13, `b830478`

**Second delivery:** six compact 128 × 128 true-alpha tone icons now complete
the visual family: `tone-do`, `tone-re`, `tone-mi`, `tone-sol`, `tone-la`, and
`tone-do2`. The initial ornate, background-bearing generated attempt was rejected
and removed. The accepted replacement uses only a simple colored note, 1px
dark-plum outline, and a tiny cream glint—no badge, scenery, or matte—so it
matches the compact drum-icon scale and can remain clear after tinting.

### ✅ First delivery complete — 2026-08-13, `8eb05ea`

The coherent percussion foundation is delivered: `buttons/pad-key-idle.png` and
`buttons/pad-key-seated.png` are matched neutral 512 × 512 keycaps designed for
engine tinting, and `sprites/icons/drum-*.png` provides a 128 × 128 child-readable
family for all ten drum sounds (kick, snare, hi-hat, clap, tom, cowbell, open hat,
rim, shaker, conga). The idle key reads raised; the seated key visibly drops into
its socket and gains a small gold selected tick. All assets pass the hard-alpha
gate and use alpha-0 corners.

**Engineering handoff:** replace Percussion Editor's generic `PanelButton` shelf
faces with these paired sprites, tinting the neutral keycaps with each sound's
existing color. Replace emoji row labels and shelf glyphs with the matching
`drum-<assetId>.png` icon while retaining the engine-drawn text labels, mute, and
delete interactions. The icons and keycaps are visual assets only; keep gameplay
state in the existing model.



The delivered `panel-percussion.png` is a useful structural base, but the live
Drums screen still fails the visual bar: the bottom pad strip reads as mismatched
flat stickers, system-emoji row art clashes with the chunky Workshop characters,
and the interaction states do not share the strong authored button language.

**Supersedes AR-025.** Deliver a coherent drum-machine surface in this order:

1. Neutral, tintable `pad-key-idle.png` and `pad-key-seated.png` whose bevel,
   brass/steel socket, and pressed recession match the Percussion plate rather
   than generic flat colour tiles; the engine continues to tint them per sound.
2. A compact house-style pixel icon set for the ten drum sounds and six tone
   sounds, replacing system emoji at editor scale. Every icon must remain
   recognisable to a non-reader at the small row/shelf size.
3. If needed after a runtime check, a revised drum-shelf insert with better
   spacing/raised sockets; do not redraw the whole panel merely to hide a layout
   problem.

**Acceptance bar:** the user must read one authored child-friendly drum machine,
not a polished frame surrounding sticker controls. Test in the live panel with
active, inactive, muted, and seated pads before accepting the art.

---

## ✅ DELIVERED — AR-053 · Track garnish: smoke, splashes, and the NIGHT sky — MEDIUM

**Art delivered 2026-08-13 in `ae5701c`.** `smoke.png` (96 × 96) and
`splash.png` (40 × 22) replace the procedural locomotive-puff and rain-on-ballast
blobs with small hard-alpha pixel assets. `sky-night.png` is a 1280 × 540
moon, cloud, and star world layer designed for the Track NIGHT treatment. The
smoke and splash corners are alpha 0; the NIGHT strip is RGBA and uses a
near-identical edge-safe field for scroll continuity.

**Engineering handoff:** bind the assets to the existing `trk-smoke`,
`trk-splash`, and NIGHT sky texture seams in `TrackV3Scene`; retain procedural
`trk-gloom` as the intentional top-weighted rain wash. No gameplay behavior
changes are needed.

Measured leftovers (2026-08-13 audit — these are the last engine-drawn
textures on the v3 Track): `trk-smoke` (chimney puffs) and `trk-splash`
(rain hitting the ballast) are procedural blobs; a painted puff and splash
(one small canvas each, ~64px, the engine scales/fades them) finishes the
weather. And the NIGHT mode currently darkens the world with a flat blue
rectangle — a painted `trk-sky-night` band (moon + stars, same 512-wide
tiling contract as `trk-sky`) upgrades it properly. The TUNNEL treatment
stays parked pending a design round (per AR-049). `trk-gloom` stays
engine-drawn on purpose — it is a wash and should look like one.

---

## ✅ DELIVERED — AR-055 · The car cabin, revised — remove the nested car, and vary it per type — P0

**Art delivered 2026-08-13 in `00dec4e`.** Eight aligned 1612 × 430 layers
now provide a cabin rear and sparse foreground contact rail for **boxcar,
tanker, hopper, and flatcar**. The rooms remove the shared cabin's edge-tracing
outer frame and vary materially by car: de-framed timber workshop; riveted
steel/catwalk tanker; slatted hopper bin; and an outdoor daylight flatcar deck.
The contact rails are deliberately sparse, transparent above the lower crew
contact zone, and distinguish timber, steel, raw-plank, and open-deck use.

**Engineering handoff:** `cabinFor()` already registers all eight names and
prefers them over the shared fallback. Rebuild the UI atlas and mount them at the
existing void rect/depth weave; no scene logic changes are needed. Verify full
crew and empty states for all four types before deleting the shared fallback.

**Supersedes the art of AR-052, not its intent.** `workshop-car-interior.png`
and `workshop-car-foreground-rail.png` are mounted (rear layer behind the crew,
rail in front of their legs, both travelling with the car) and the composite
weave is right. The ART is wrong, in two specific ways, both reported on the
live screen.

### 1. It reads as a train inside the train

The delivered interior carries its own **exterior signature**: a strapped roof
beam across the top, hard rounded upper corners, and a framed edge all round.
Those are the marks of a car's OUTSIDE. Drawn inside the car's punched opening,
the eye reads the near frame (the car) and then a second, smaller framed box
behind it, and names it a nested car. Eric's words: *"there's just a new train
inside the train? this looks terrible."*

**The rule an interior has to follow: it has no frame of its own.** The punched
hole in the car body IS the frame. So:

- **No top beam, no strap hardware, no rounded corners, no outline.** Nothing
  that traces the edge of the art.
- **Bleed past all four edges.** Draw the room as if the canvas were a window
  cut out of a bigger space — planks, shelf lines and the floor plane must run
  off every edge mid-stroke, never stop short and never turn a corner.
- **Depth by INTERIOR cues only:** the back wall further away and cooler, the
  floor/bench plane catching light, lamps as practical sources, and shadow in
  the top corners where a roof would be — implied, not drawn.
- The existing lamps, tool boards and cable are good and should survive; it is
  the framing around them that has to go.

### 2. It does not change per car type

One timber room is currently drawn inside all four bodies, so a purple **hopper**
has a boxcar's wooden room in it (`it also doesnt change per car`). Deliver the
pair **per type**, all on the same `1612 × 430` void canvas and all following the
no-frame rule above:

| File stem | The room inside |
|---|---|
| `workshop-car-interior-boxcar` + `-foreground-rail-boxcar` | The timber workshop room already drawn, de-framed. |
| `workshop-car-interior-tanker` + `-foreground-rail-tanker` | Riveted steel cylinder: curved inner shell, banded ribs receding, a catwalk plate for the floor, one caged lamp. |
| `workshop-car-interior-hopper` + `-foreground-rail-hopper` | Slatted bin: raw board walls with gaps of dark between them, sloped hopper sides converging toward the bottom, a plank floor over the chute. |
| `workshop-car-interior-flatcar` + `-foreground-rail-flatcar` | Mostly OPEN: a low stake-side rail, deck planks running to the edges, and daylight/sky behind rather than a wall — a flatcar has no room, and pretending it does is the same lie as the nested box. |

**Engineering is already wired for this.** `cabinFor()` in `WorkshopScene`
prefers `workshop-car-<layer>-<type>` when the atlas carries it and falls back
to the shared pair otherwise, and all eight keys are pre-registered in
`ui-sprites.ts`. Drop the PNGs, rebuild the atlas, and they appear — no code
change, and a partial delivery (say, the tanker only) is safe.

**Acceptance bar:** with a crew aboard, each character reads as standing inside
that particular kind of car. Nothing in the opening may read as an edge, a
frame, or a second vehicle. Check all four types with a full crew and empty.

---

## ✅ DELIVERED — AR-056 · The My Voice effect rack — eight icons, no more emoji — P0

**Art delivered 2026-08-13 in `3422fd4`.** Eight compact 128 × 128 hard-alpha
icons now replace the system-emoji picture layer: reverse tape, high/low pitch,
robot, echo, big room, bitcrush, and crazy. Each has a simple child-readable
subject, dark-plum outline, cream glint, and no badge/scenery/matte; they are
intended to remain legible under the existing per-effect keycap tint.

**Engineering handoff:** map the existing eight effect asset IDs to
`fx-reverse`, `fx-pitch-up`, `fx-pitch-down`, `fx-robot`, `fx-echo`,
`fx-reverb`, `fx-bitcrush`, and `fx-crazy` through the existing
`PanelButton({ keycap, icon })` seam. Keep runtime text labels and effect logic.

The eight effect tiles are the loudest thing on the My Voice machine: flat
saturated rectangles carrying system emoji, sitting on a painted steel plate.
Engineering has already moved them onto AR-054's neutral `pad-key` keycap (so
they take the machine's own light and keep their per-effect colour) and made the
labels fit inside the key. What is missing is the picture.

**Deliver eight 128 × 128 true-alpha icons**, the same compact house style and
scale as AR-054's `drum-*` set — a simple subject, a 1px dark-plum outline, one
cream glint, no badge, no scenery, no matte, and legible after tinting:

| File | Effect | What it has to say to a non-reader |
|---|---|---|
| `fx-reverse.png` | Backwards | Sound running the wrong way — a reversed arrow or a tape spool unwinding. |
| `fx-pitch-up.png` | Chipmunk | A tiny high voice: small creature, mouth open, small notes rising. |
| `fx-pitch-down.png` | Monster | A big low voice: heavy jaw, big note falling. |
| `fx-robot.png` | Robot | A square-jawed speaker head, stepped/quantised sound. |
| `fx-echo.png` | Echo | The same shape repeating away into the distance, fading. |
| `fx-reverb.png` | Big Room | A small figure in a big hall — sound opening out. |
| `fx-bitcrush.png` | Crunchy | Sound broken into coarse blocks; deliberately chunky pixels. |
| `fx-crazy.png` | CRAZY! | All of them at once — a happy scribble of everything above. |

Same for the four Magic Pad wave pickers if it is cheap: `wave-triangle`,
`wave-sine`, `wave-square`, `wave-saw` (Soft / Smooth / Buzzy / Sharp).

**Engineering handoff:** these mount through the existing
`PanelButton({ keycap, icon })` seam that the drum shelf already uses — the
icon frame name is the only wiring, and the engine keeps the text label under it
for the adult.

---

## ✅ DELIVERED — AR-057 · The shared chrome pair: the ✕ and the DONE plaque — HIGH

**Art delivered 2026-08-13 in `ff48c3b`.** Matched idle/pressed states now exist
for a 512 × 512 machined close socket (`btn-panel-close-*`) and a 1024 × 340
friendly green timber-and-brass DONE plaque (`btn-panel-done-*`). The close
control is a recessed brass-ringed X socket rather than a flat glyph; DONE is
baked in a large cream pixel label with a small music/rail cue. All four
exports have hard alpha and shared state registration.

**Engineering handoff:** mount the pair in `BaseToolPanel` through its existing
idle/pressed contract, and use the same DONE textures for the conductor
chalkboard chip so panel and chalkboard completion never drift apart.

Every tool panel now carries **the same two controls in the same two places**,
because a four-year-old should learn one gesture for "I am finished" rather than
one per machine (Voice Keys said "Add to Car", the Magic Pad said "Send to Car",
the drum grid said nothing at all). Both are currently stand-ins.

1. **`btn-panel-close-idle/-pressed.png`** — square, ~512², the top-right corner
   of every machine face. It sits directly on painted steel, so it must be a
   real machined control: a recessed brass-ringed socket with a dark ✕ cut into
   it, not a flat dark square with a glyph on top (which is what it is now).
2. **`btn-panel-done-idle/-pressed.png`** — a WIDE plaque, roughly 3:1, ~1024 ×
   340, that hangs BELOW the machine on the dark backdrop (the same place and
   the same job as the conductor chalkboard's DONE chip). Baked label reading
   **DONE**. Green family, in the timber/brass control language — it is the one
   affirmative button in the app and should look like the biggest, friendliest
   thing on the screen.

**Engineering handoff:** both mount in `BaseToolPanel` (one construction site
for all six panels) through the same idle/pressed contract every other button
uses. The pair is also the natural face for the chalkboard's DONE chip; wire
that at the same time so the two never drift apart.

---

## ✅ DELIVERED — AR-058 · The Percussion plate, redrawn into the machine-face family — HIGH

**Art delivered 2026-08-13 in `b77361f`.** `panel-percussion.png` is now a
1536 × 1152 steel-and-brass drum-machine face aligned with the three AR-051
machines. It retains a deliberately quiet central grid recess, a left rail with
ten empty row bays, and ten lower physical sockets sized for the AR-054 pad
keycaps; the wooden picture-frame treatment is retired.

**Engineering handoff:** re-measure the existing `PercussionToolPanel.PLATE`
fractions against this replacement, then mount the unchanged engine step grid,
row controls and pad keycaps into the corresponding quiet recesses. The goal is
for Drum, Voice and Magic to read as three purpose-built machines from one
Workshop.

AR-050's `panel-percussion.png` was drawn before AR-051 established what a tool
machine looks like in this app. Beside the three steel/timber/brass machine
faces it is now the odd one out: a wooden picture frame around one large flat
dark field, with the drum shelf as a strip beneath it.

**Redraw it to match `panel-voice` / `panel-keys` / `panel-magic`**, same
1536 × 1152 canvas and the same regions engineering already measures against:

- The **grid field** stays a large quiet recess — it holds a step grid and must
  not compete with it — but recessed into a steel face with the family's rivets
  and corner hardware, not framed in wood.
- A **row rail** down its left ~16 %, drawn as part of the machine (the engine
  puts each drum's icon, mute and ✕ in it) rather than as empty field.
- The **ten shelf sockets** along the bottom, sized and spaced for AR-054's
  `pad-key` keycaps, which now sit in them.
- Keep the drum-machine identity: this is the frog's kit, and it should look
  like a piece of percussion gear, not a generic panel.

**Engineering handoff:** the region fractions in `PercussionToolPanel.PLATE`
(`field`, `shelf`) are measured off the current PNG and will be re-measured on
delivery — hold the *proportions* roughly and the remount is one edit.

**Acceptance bar:** open Drums, then My Voice, then the Magic Pad in sequence.
All three must read as three machines from the same workshop.

---

## AR-060 · Stop punching holes in cars: deliver WHOLE cars with their insides drawn — P0

**This supersedes the layered approach of AR-052/AR-055 and is the fix for a
complaint that has now been made three times about three different versions of
the same art.** Read this section before touching cabin art again.

### What is actually wrong

The Workshop car is assembled from three pieces at runtime: a car BODY png with
a rectangular hole punched through it, a separate INTERIOR png stretched into
that hole, and a separate foreground RAIL png over the crew's legs. Engineering
has now fixed everything that layering can fix — registration is exact, the
interior is per car type, the framing that made it read as a nested car is
gone, and the interior even wears the car's livery paint so the palettes match.
It still reads as pasted on, and it always will, for two reasons that no
interior texture can solve:

1. **The hole is a rectangle; the cars are not.** The same 1612 × 430 box is cut
   through a boxcar, a hopper, a **cylinder** and a flat deck. A rectangular
   window into a round tank is not a thing that can exist, so the eye correctly
   refuses to read it as an opening and reads it as a picture laid on top.
2. **Two pictures, two light sources.** A separate interior is lit, shaded and
   perspectived by itself, and its edges meet the body's edges at a hard seam no
   matter how well the two are matched.

Eric, on the current build: *"you see how its still not native to the art behind
it, it is still superimposed. maybe its just an art rewrite, to make the new art
that can live load the characters just be built out to be full cars?"* That is
the right call, and it is what this request asks for.

### What to deliver

**One complete car per type, drawn as a single picture, with its opening and its
interior already part of it** — the way you would draw a cutaway in a picture
book. Not a body plus an interior; one car that happens to be open.

| File stem | The car, opened |
|---|---|
| `car-open-boxcar` | Sliding door rolled back; timber room visible through a door-shaped opening with the door's own frame and runners around it. |
| `car-open-tanker` | An inspection hatch or cut-away section that belongs on a CYLINDER — the opening's top and bottom edges must curve with the tank, and the shell's thickness should show at the cut. |
| `car-open-hopper` | Open-topped bin seen from the side, looking down into the slatted hopper — the opening is the bin's own mouth, not a window in its side. |
| `car-open-flatcar` | No opening at all: a flat deck with stake sides, the crew standing on it in open air. |

Each on the existing **2560 × 1440 car canvas**, drawn at the same scale and on
the same wheel baseline as the current `car-side-*.png` set, so nothing about
placement changes.

Plus, per type, **one foreground layer** (`car-open-<type>-front`) carrying only
what must draw IN FRONT of the crew — the near door edge, the tank's near shell
lip, the bin's near wall, the flatcar's stake rail. Transparent everywhere else.

### What engineering needs back, per type

Two numbers, and they can be a comment in the delivery note rather than a file:

- **The crew rect** — where in the 2560 × 1440 canvas the characters may stand
  (x, y, w, h). It no longer has to be the same rect on every type, which is the
  whole point: a flatcar's crew stands on a deck, a tanker's stands in a hatch.
- **The floor line** — the y the characters' feet sit on inside that rect.

Engineering replaces the punched-void geometry with these per type; the crew,
the chalkboard and the livery coat all key off them.

### Acceptance bar

Open each car type with a full crew, and with the paint rack set to three
different colours. In every combination the car must read as **one drawing** —
no rectangle, no seam, no second light source, nothing that could be described
as a picture inside a car. If a screenshot lets you point at where the interior
art stops and the body art starts, it is not done.

**Do not deliver a revised `workshop-car-interior-*` instead.** Three rounds of
that have now been made and the fault is the layering, not the painting.
