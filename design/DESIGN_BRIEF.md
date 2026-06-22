# iBeetKidz — Synthwave Pixel Design Brief

A retro-synthwave, pixel-art skin for a kids' browser music toy. This brief is
the **integration contract**: the app is vanilla-CSS + React with stable class
names, so the theme must restyle *existing* selectors and ship as CSS + assets
only — **no DOM or class renames, no JS changes.**

## Vibe

80s **synthwave / Outrun / vaporwave**, rendered as crisp **pixel art** — neon
sunset gradients, CRT scanlines, a glowing perspective grid horizon, chrome
shine, bloom/glow on neon. Reference moods: Hotline Miami, Outrun, Kung Fury.
**Not** generic rounded-rect material UI. Chunky and playful but **legible** —
bold, not babyish. Audience: kids 5–10, touch-first on iPad, fully offline.

## Palette (proposed starting tokens — see design-tokens.json)

- Backdrop: deep indigo-black `#0d0221`, panel base `#1a0b2e`, raised `#241046`
- Ink `#f6f2ff`, muted `#b39ddb`
- Neon: pink `#ff2e97`, magenta `#ff5d8f`, cyan `#2de2e6`, purple `#b14aed`,
  orange `#ff8a3d`, yellow `#ffd23f`
- Grid lines: pink/cyan; accent = neon pink (replaces the current `#fb5607`)
- Per-item hues come through CSS vars set inline (`--tile-color`, `--pad-color`,
  `--row-color`) — use them as glow/border so each tile/row keeps its color.

## Typography (self-host, offline — no CDN)

- Display (labels/headers, used sparingly): a pixel font e.g. "Press Start 2P".
- Body / denser text (must stay readable for kids): e.g. "VT323" or a clean
  fallback. Deliver `.woff2` + `@font-face` with **relative** `src` urls.

## Motifs

CRT scanline overlay, neon perspective grid + chrome sun behind content, 1–2px
hard pixel borders, hard drop-shadows, neon text-glow on active elements,
`image-rendering: pixelated` on all pixel art. Avoid soft blurs on small UI.

## Component contract — restyle these EXISTING selectors (all states)

Layout: `.shell-grid`, `.palette` + `.palette button.active`, `.m-icon`,
`.options-bar`, `.options-title`, `.options-icon`, `.opt-knob` + `input[type=range]`,
`.opt-choices`, `.opt-choice.active`, `.canvas`, `.machine`, `.playbar`,
`.t-btn` (+ `:active`, `.active`, `.flash`), `.tempo`, `#boot-gate`, `#boot-button`,
`.viz-canvas`.

Tools: `.big-record`(+`.recording`), `.voicefx-status`, `.fx-tiles`,
`.fx-tile`(uses `--tile-color`), `.fx-emoji`; `.pad-grid`, `.pad`(+`.hit`, uses
`--pad-color`), `.pad-emoji`; `.beat-rows`, `.beat-row`(`--row-color`),
`.beat-label`, `.beat-cell`(+`.on`,+`.downbeat`); `.layer-list`,
`.layer-row`(`--row-color`), `.layer-name`, `.layer-mute`, `.layer-vol`,
`.layer-remove`; `.xy-pad`, `.xy-hint`, `.xy-dot`; `.stub-note`.

**Loop Stage rework (in progress) — please also theme these new classes:**
`.loop-track`(`--row-color`), `.loop-track-head`, `.loop-lane`,
`.loop-cell`(+`.on`,+`.downbeat`), `.loop-playhead` (a glowing vertical sweep
positioned by JS — style its look only).

## Data hooks for pixel icons (pure-CSS swap, no markup change)

Tool buttons carry `[data-machine="<id>"]`, controls carry `[data-act="<id>"]`.
Map icons via CSS background-image on these, e.g.
`.palette button[data-machine="beat-grid"] .m-icon { background-image:url(./assets/theme/icons/icon-beat-grid.png) }`.
Tool ids: `record-voicefx`, `sound-pads`, `beat-grid`, `looper-stage`, `theremin-xy`.
Control ids (in `.playbar`): `play`, `stop`, `tempo`, `snap`, `undo`, `redo`,
`surprise`, `save`.

## Visualizer palette (JS-controlled — provide hex, engineer wires it)

The full-screen audio visualizer is drawn in `src/visualizer/styles/retro-scope.ts`.
Give 3–5 hex values for the waveform line + spectrum bars, and note it should be
**dimmed/recessed behind panels** (especially Loop Stage) so it doesn't compete.

## Deliverables

1. `theme.css` — tokens + all component skins + `@font-face` + icon-mapping, relative urls.
2. `assets/theme/icons/icon-<id>.png` — pixel art for every tool + control id.
3. `assets/theme/fonts/*.woff2`.
4. `tokens.md` — final CSS-variable list + hex, viz palette, font names.
5. A full-screen mockup (palette / options bar / canvas / play bar).
