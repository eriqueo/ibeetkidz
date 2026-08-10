> # ⛔ STALE — DO NOT GENERATE FROM THIS DOCUMENT
>
> Last meaningfully updated **2026-06-24**. It describes the Phase A vision and
> has not tracked the game since. Specific things in here that are now WRONG:
>
> - **"Track scene: Top-down oval track on green grass field"** — the Track is a
>   SIDE-SCROLLER as of 2026-08-07. The oval is retired. This single line is the
>   most dangerous thing in the file: an agent that locks style from it will draw
>   the wrong projection for the whole scene.
> - **"Sky/void: Pure black — scenes float on black"** — the side-scrolling Track
>   has a daylight sky and parallax bands. Only the Map still floats on black.
> - **The hex palette here is not the game's palette.** It was sampled off early
>   reference images; the shipped palette is `design/palette-nintendo.json`.
> - **"Perspective: slight top-down isometric"** as a GLOBAL rule — the game uses
>   a different projection per scene. See the CURRENT VISUAL DIRECTION table in
>   `ART_REQUESTS.md`.
>
> **Current sources of truth for art direction:**
>
> | For | Read |
> |---|---|
> | What to draw, and the contract it must satisfy | `ART_REQUESTS.md` (maintained; includes the CURRENT VISUAL DIRECTION block at the top) |
> | The palette | `design/palette-nintendo.json` — the single producer, mapped to the app's CSS vars |
> | What the style actually looks like now | the shipped sprites under `src/assets/sprites/` — trust these over any prose |
> | What the game currently IS | `design/HISTORY.md` + `BASELINE.md` |
>
> Kept as a record of what was decided and why. Nothing below is a live brief.

# iBeetKidz Pixel Art Style Guide

Extracted from the existing reference scenes for use in AI generation prompts.

## Core Style
- **Era:** 16-bit SNES/Genesis era pixel art, circa 1991-1994
- **Perspective:** Slight top-down isometric (not strict 2:1 iso — more like a 15-20 degree tilt)
- **Pixel size:** Large, chunky pixels — approximately 3-4px per "game pixel" at 2560x1440
- **Outline style:** Hard 1-2px black outlines on all objects
- **Shading:** Simple 2-3 tone shading (highlight, midtone, shadow) — no gradients, no anti-aliasing

## Color Palette
- **Grass:** Deep forest green (#1a5c1a, #2d7a2d, #3d9e3d) with darker dithered patches
- **Dirt/ballast:** Sandy tan (#c8a96e, #b8935a, #a07840) with grey gravel
- **Track rails:** Silver-grey (#a0a0a0, #808080) with dark brown wooden ties
- **Sky/void:** Pure black (#000000) — scenes float on black
- **UI chrome:** Warm grey-tan (#9a8c7a, #7a6e5e) with beveled edges
- **UI text:** Bright white or yellow on dark backgrounds, pixel font

## Scene Compositions
- **Track scene:** Top-down oval track on green grass field, trees in corners, grey rocks scattered, black bottom UI panel with transport controls
- **Yard scene:** Dark asphalt/gravel yard, multiple parallel sidings, gantry crane (yellow), yard office building (right), fence perimeter
- **Workshop scene:** Side-on view of a large brown boxcar on tracks, purple/dark background, instrument icons below on dirt ground
- **Map scene:** Floating island with grass, connecting track between three locations, black void border

## Key Reference Elements
- Crossing signal: Red circular light on grey post, yellow X-crossbuck sign above
- Locomotive: Black boiler, red cab, large drive wheels, cowcatcher front, smoke stack
- Boxcar: Rectangular body, sliding door panel, grab irons, trucks (wheel assemblies) at each end
- Tanker: Cylindrical tank on flatcar frame, dome on top, ladder on side
- Hopper car: Open-top V-shaped body, coal/gravel load visible
- Flatcar: Low flat deck, no sides, stake pockets along edge
- Gantry crane: Yellow steel lattice frame, grey cab/operator box, cable and hook

## Generation Prompt Template
"16-bit SNES era pixel art, top-down slight isometric view, chunky pixels with hard black outlines, no anti-aliasing, limited color palette, [SUBJECT], in the style of Railroad Tycoon 2 / Transport Tycoon / Locomotion video game graphics, 2560x1440 resolution"
