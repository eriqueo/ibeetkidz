# iBeetKidz — Art Direction v2: Retro Console Toy (Mario Paint era)

**Replaces the synthwave v1.** v1 was too neon, too dark, too generic. New north
star: **late-80s/early-90s Nintendo toy software — specifically Mario Paint**
(plus Kirby / Yoshi's Island warmth). Cute, chunky, *legible*, hand-made, a
little goofy. Warm and bright, not dark-and-glowing.

## Why this fixes the "AI-generated" feel

Generic comes from no constraints. This direction is defined by **hard limits** —
follow them and it reads as intentional, not auto-generated:

1. **One shared palette, ~16 colors. Nothing off-palette, ever.** (see palette-nintendo.json)
2. **Flat fills only on UI chrome — no gradients, no glow/bloom.** Shading on
   sprites = 1–2 darker steps of the SAME hue, or tasteful dithering. Depth = a
   hard 2–3px drop-shadow, not a blur.
3. **Fixed pixel grid, integer scaling only, `image-rendering: pixelated`.**
   Icons authored at a base res (24×24 recommended) and only scaled ×2/×3.
4. **Consistent outline + light.** Every sprite gets a 1px dark outline (very dark
   plum, not pure black) and a consistent top-left light source.
5. **Legibility first.** Light "paper" panels with DARK text. Bright backdrop, not
   near-black. Pixel display font for the logo/titles ONLY; a clean rounded sans
   for all labels and body so kids can actually read it.
6. **Restraint.** Fewer effects, more whitespace, big tap targets, one accent per
   element. Charm comes from the sprites, not from CSS effects.

## Palette (warm 16-bit — see palette-nintendo.json)

- Paper / panels: cream `#fbf3d9`, `#f4e8c1` (UI surfaces — dark text on these)
- Ink / outline / text: deep plum `#2b2440`
- Backdrop: friendly sky, not black — `#7fb7e8` → soft `#bfa6e0` (gentle, low-sat)
- Console primaries (flat, saturated but NOT neon): tomato `#e8503a`,
  sunshine `#ffcc3e`, grass `#5bbf52`, sky `#4aa3df`, grape `#8a5cc4`,
  orange `#f08a3c`, berry `#d94f86`
- Each icon: 3–5 of these + the plum outline + one lighter highlight.

## Typography

- Display (logo + section titles, sparing): a chunky pixel face.
- **Everything else: a clean ROUNDED SANS** (e.g. "Baloo 2") — maximum legibility.
  This is the biggest change from v1; stop using terminal/pixel fonts for body.

## Icon system — the part you hated, redone with a principle

Don't draw literal stock objects (squirrel = chipmunk, robot emoji). Instead give
the app **one little cast of characters** — Mario-Paint-style, every object has a
face and personality. Proposal: **"the Beet crew"** (the app is iBeetKidz → a
beet mascot + friends).

- **Voice FX = ONE voice-mascot in different states** (this unifies the 8 effect
  tiles into a coherent set instead of random emoji):
  backwards = mascot turned around / mirrored · chipmunk = puffed cheeks ·
  monster = fangs + one big eye · robot = bolt-on helmet/antenna ·
  echo = mascot with a faded ghost-trail of itself · big room = tiny mascot in a
  big arched space · crunchy = mascot rendered at half-resolution (chunkier
  pixels) · crazy = swirl/spiral eyes + tongue out.
- **Tools = friendly objects with faces:** My Voice = a little mic character ·
  Sound Pads = a drum with a face · Beat Maker = a grid/console critter ·
  Loop Stage = a cassette/loop character · Magic Pad = a star/sparkle sprite.
- **Transport = clean iconic glyphs** (play/stop/undo/redo/dice/save/magnet) in
  the same outline + palette language, no faces.

Spec for every icon: 24×24 base, plum 1px outline, ≤5 palette colors, top-left
light, flat fills, a touch of personality. They should look like a **family** —
same proportions, same outline weight, same eyes.

## Mood dial

Aim ~**70% Mario Paint cheer / 30% chiptune cool**. Bright, warm, readable,
goofy-cute. If in doubt: more legible, less effect.

## Integration contract (unchanged from v1 — keep it)

Same as DESIGN_BRIEF.md: restyle the app's EXISTING classes only, no DOM/JS
changes; offline (self-host fonts, relative urls); keep `[hidden]{display:none!important}`;
icons map via `[data-machine="<id>"]` / `[data-act="<id>"]`; theme app CSS vars
`--bg --panel --ink --accent` + extend. Also theme the new Loop Stage classes:
`.loop-track`, `.loop-track-head`, `.loop-lane`, `.loop-cell`(+`.on`,`.downbeat`),
`.loop-playhead`.

## Redo deliverables

1. Repalette `theme.css` to the warm set; swap glow → flat fills + hard shadows;
   swap body font to the rounded sans (keep pixel font for titles only).
2. Redraw the full icon set as the "Beet crew" cast (tools + the 8 voice-FX
   states + clean transport glyphs), per the icon spec above.
3. New full-screen mockup so we can judge legibility + warmth.
