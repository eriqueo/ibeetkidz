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

## AR-001 · Yard action buttons (individual, idle + pressed) — HIGH

**Target files:** `src/assets/sprites/buttons/btn-yard-<name>-idle.png` +
`btn-yard-<name>-pressed.png` for `edit`, `hitch`, `unhitch`, `totrack`,
`delete` (and optionally `reorder`).

**Canvas:** square, same canvas/margin conventions as `btn-stop-idle.png`
(~13% transparent margin, keycap reads centred).

**Why:** the Yard bottom bar currently ships the interim baked six-tile strip
(`yard-panel-buttons.png`) with transparent hit-areas + engine captions laid
over it. Individual sprites give real pressed states and let the captions and
spacing breathe (today UNHITCH/TO TRACK captions have to shrink to avoid
colliding).

**Prompt:** "Pixel-art steampunk square button plaques for a kids' train game,
one icon per button on a dark stone keycap with silver bevel frame: (1) blue
magnifying glass EDIT, (2) silver chain coupling HITCH, (3) broken chain with
red X UNHITCH, (4) golden rail track segment TO TRACK, (5) big red X DELETE,
(6, optional) gold four-way move arrows REORDER. Idle + pressed (pressed = icon
shifted 2px down, bevel inverted). Transparent background, 1px dark plum
outline, hard drop shadow, warm 16-color palette."

**Unblocks:** replacing the `panel-yard-actions` strip + hit-areas in
`src/assets/maps/yard.json` with five `ui-button` sprite objects (engine
already supports it — copy how `track.json` does its transport bar).

---

## AR-002 · Empty Yard bottom-bar panel plate — MEDIUM

**Target file:** `src/assets/sprites/panels/panel-yard-actions.png`

**Canvas:** landscape plate, pre-trimmed to the opaque frame (no padding), like
`panel-transport.png`.

**Why:** the current strip has the six buttons **baked in** and is RGB with
opaque black margins (the engine crops it via its content box as an interim
measure — see `crop: true` in `ui-sprites.ts`). Once AR-001 lands, the bar
needs a clean empty plate for the buttons to sit on.

**Prompt:** "Empty pixel-art steampunk panel plate, riveted dark stone with a
silver bevel frame, landscape ~3.7:1, nothing mounted on it. Transparent
background outside the frame, pre-trimmed. Same material family as the existing
track bottom-bar frame."

---

## AR-003 · Nav plaque cleanup: stray alpha halo + pressed states — LOW

**Target files:** `src/assets/sprites/btn-nav-workshop.png`,
`btn-nav-yard.png`, `btn-nav-exit.png` (replacements), plus new `-pressed`
variants (which would let them move into `sprites/buttons/` naming:
`btn-nav-<x>-idle/-pressed.png`).

**Why:** `btn-nav-workshop` and `btn-nav-yard` carry a semi-opaque dark backdrop
across the whole 1920×1920 canvas (alpha ≈ 8–30 everywhere — measured), which
renders as a faint dark square behind the plaque. They also have no pressed art,
so the engine falls back to a scale-pop instead of a true pressed texture.

**Prompt:** "Re-export the Workshop (wrench+hammer), Yard (train shed), and Map
(folded map) square nav plaques with a fully transparent background (alpha 0
outside the plaque), plus a pressed variant of each (icon 2px down, bevel
inverted). Same size, position, and style as the current files."

---

## AR-004 · Dedicated RIDE button icon — LOW

**Target files:** `src/assets/sprites/buttons/btn-ride-idle.png` + `-pressed.png`

**Why:** the Track transport bar reuses the Workshop `btn-play` (green triangle)
as RIDE. It works, but a loco silhouette would say "ride the train" better for
pre-readers.

**Prompt:** "Steampunk square keycap button matching the existing transport set:
a chunky side-view locomotive silhouette in green, idle + pressed. Same canvas,
margin, and bevel as btn-play-idle.png."

---

## AR-005 · Top-bar bands for Yard/Track base plates — LOW / needs design call

**Target files:** revised `src/assets/scenes-v2/yard-scene-clean-v2.png` +
`track-scene-clean-v2.png` (or a shared slim header plate sprite).

**Why:** the Three-Zone rule gives every scene a Top Bar, but both base plates
are full-bleed scenery — the nav plaques float in the corners with no painted
bar behind them. The Workshop's ornate `panel-header-v2` cannot be reused as-is:
it is ~360px tall and would cover the Yard assembly line and the Track oval's
top edge (both start ≈90px from the top of the art).

**Ask:** either (a) repaint the top ~140px of both base plates as a slim
stone/brass band the plaques mount on, or (b) a standalone slim header plate
(2560×~140, transparent below) the map can place — whichever fits the art
direction. Field art must stay clear.
