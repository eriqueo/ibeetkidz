# Agent Prompt — Workshop UI Polish Pass

**Branch:** work directly on `main`. Pull first.  
**Gates:** typecheck clean · 167/167 unit · 5/5 e2e · build green · push.

---

## Context

The Workshop scene renders from a painted base plate (`workshop-scene-clean.png`, 2560×1440 art) with transparent Tiled hit-areas on top. The transport bar and toolbar are painted into the base plate — we do not re-generate the art. All fixes below are code-only overlays and Tiled map coordinate adjustments.

The screenshot provided shows four issues. Fix all four in one commit.

---

## Fix 1 — SPEED counter: align the live digit to the painted LCD box

**Problem:** The `speedText` Phaser.Text object is positioned from `lcd-speed-screen` in `workshop.json` but the digit `0·02` is visually offset — it does not sit cleanly inside the painted green LCD rectangle on the base plate.

**Root cause:** The `speedBg` black mask rectangle and the `speedText` both use `setOrigin(0.5)` (center-anchored), but `placeSpawn` returns `{x, y}` as the **center** of the spawn rect. This should be correct — but the painted LCD box in the art may not be perfectly centred on the `lcd-speed-screen` Tiled object. The digit is also using `"0·02"` format (two decimal places with a dot) which is wrong — it should show the level integer `01`–`08`.

**Fix in `WorkshopScene.ts`:**
1. The `refreshSpeed()` method currently pads to 2 chars: `String(speedLevel(...)).padStart(2, "0")`. That is correct — keep it. The displayed value should be `01`, `02`, … `08`.
2. The font size formula `Math.max(11, p.height * 0.62)` may be too small. Change the multiplier to `0.75` so the digit fills the LCD box height better.
3. Add `setLetterSpacing(2)` to the `speedText` construction so the two digits are not cramped.
4. The `speedBg` mask should be slightly larger than the spawn rect to fully cover the painted digits. Change `setSize(p.width, p.height)` to `setSize(p.width + 4, p.height + 4)` for the mask only.

---

## Fix 2 — Remove TEMPO from the transport bar

**Problem:** The painted base plate has a `TEMPO` label and digit area in the bottom-left of the transport bar. The current code masks the TEMPO digit area with a black `tempoHideBg` rectangle, but the `TEMPO` text label itself is still visible in the painted art.

**Fix in `WorkshopScene.ts`:**
The `tempoHideBg` rectangle only covers the digit area (`lcd-tempo-screen` Tiled object). Extend it to also cover the `TEMPO` label above it. In `layoutChrome()`, after positioning `tempoHideBg` from the `lcd-tempo-screen` spawn:

```ts
// Extend the mask upward to cover the painted TEMPO label above the digits
this.tempoHideBg.setSize(p.width * 2.2, p.height * 2.8).setPosition(p.x - p.width * 0.1, p.y - p.height * 0.6);
```

Adjust the multipliers visually if needed — the goal is to cover both the `TEMPO` text and the digit area with the black rectangle. The `SONG` label and `001` digit above it must remain visible.

**Also in `workshop.json`:** The `lcd-tempo-screen` Tiled object is currently a narrow strip (`w=210 h=49`). Expand it in the JSON to cover the full TEMPO section including the label:
- Change `"height": 49` → `"height": 130` (covers label + digits)
- Change `"y"` to move the object up by ~80px so it starts at the top of the TEMPO label

This ensures the mask is correctly sized from the Tiled data rather than hardcoded multipliers.

---

## Fix 3 — Consistent navigation buttons across all scenes

**Problem:** Every scene currently has its own nav button sprites (`btn-nav-exit.png`, `btn-nav-workshop.png`, `btn-nav-yard.png`) but they were generated separately and may look inconsistent. More importantly, the Workshop scene uses the painted toolbar's `icon-exit` and `icon-arrows` buttons for navigation — these look different from the standalone nav sprites used in Yard and Track.

**The desired standard:** Every scene should have exactly two nav buttons in the top corners:
- **Top-left:** "go back / previous scene" — a consistent pixel-art button with a left-arrow or home icon
- **Top-right:** "go to map" — a consistent pixel-art button with the map/atlas icon

**Fix:** The nav sprites (`btn-nav-exit.png`, `btn-nav-workshop.png`, `btn-nav-yard.png`) already exist in `src/assets/sprites/`. The Workshop currently uses the painted toolbar icons for nav (which look like toolbar tool buttons, not nav buttons). 

Add two standalone nav sprite overlays to the Workshop scene — the same way Yard and Track do it — so the nav chrome is visually consistent:

In `WorkshopScene.buildChrome()`, after `spawnTiledScene`, add:
```ts
// Nav sprites — same pattern as YardScene/TrackScene
// These sit on top of the toolbar at the nav button positions
// The existing icon-exit and icon-arrows Tiled hits remain as the hit areas
```

Actually — **do not add extra sprites**. Instead, the correct fix is to ensure the `icon-exit` and `icon-arrows` hit areas in `workshop.json` use the `ui-top-right` and `ui-top-left` anchors respectively, so they are pinned to the screen corners like the other scenes. Currently `icon-exit` uses `anchor=ui-top-right` (correct) but `icon-arrows` has no anchor (it's a toolbar button, not a corner nav button).

**The real fix:** The Workshop toolbar already has the EXIT button in the top-right corner of the toolbar strip, which is visually consistent. The `icon-arrows` (→ Yard) is the 6th button in the toolbar row, not a corner nav button — this is intentional for Workshop (it's a tool scene, not a transit scene). 

**What needs to change:** The Yard and Track scenes should use the same visual style for their nav buttons as the Workshop toolbar uses for `icon-exit`. Currently Yard/Track use `btn-nav-exit.png` and `btn-nav-workshop.png` which were AI-generated and may not match the Workshop toolbar style. 

**Simplest consistent fix:** In `YardScene.buildChrome()` and `TrackScene.buildChrome()`, replace the `btn-nav-exit.png` and `btn-nav-workshop.png` sprites with Phaser.Text labels styled to match the Workshop toolbar's EXIT button appearance — or better, generate new nav sprites that match the Workshop toolbar button style. 

**For now (code-only fix):** Add a `label` text overlay to each nav button in Yard and Track so they are at minimum legible. In `YardScene.layoutChrome()` and `TrackScene.layoutChrome()`, after placing the nav sprites, add:
```ts
// Label text under each nav sprite (temporary until art is regenerated)
```

Actually — see Fix 4 below, which addresses labels. Handle nav consistency as part of Fix 4.

---

## Fix 4 — Header toolbar buttons need pixel-art instrument labels

**Problem:** The Workshop toolbar has 8 icon buttons (notepad, music-note, speaker, waveform, grid, arrows, star, magnifier) with no labels. The user wants some of these to show pixelated instrument names or icons below/on the buttons.

**The specific buttons that need labels (from the screenshot, left to right):**
1. `icon-notepad` — label: `"SONG"` (or a tiny notepad icon)
2. `icon-musicnote` — label: `"THEREMIN"` (or a music note icon — this opens the theremin-xy tool)
3. `icon-speaker` — label: `"PADS"` (opens sound-pads)
4. `icon-waveform` — label: `"VOICE"` (opens record-voicefx)
5. `icon-grid` — label: `"BEATS"` (opens beat-grid)
6. `icon-arrows` — label: `"YARD"` (navigates to yard)
7. `icon-star` — label: `"BONUS"` (workshop-surprise)
8. `icon-magnifier` — label: `"KEYS"` (opens voice-keys)

**Implementation in `WorkshopScene.ts`:**

In `buildChrome()`, after `spawnTiledScene`, create a `toolbarLabels: Phaser.GameObjects.Text[]` array. For each toolbar button spawn (all spawns in `ui-layer` that are in the toolbar row — `y < 200` in art coordinates), add a `Phaser.GameObjects.Text` below the button:

```ts
private toolbarLabels: Phaser.GameObjects.Text[] = [];

// In buildChrome(), after spawnTiledScene:
const TOOLBAR_LABELS: Record<string, string> = {
  'icon-notepad':   'SONG',
  'icon-musicnote': 'THEREMIN',
  'icon-speaker':   'PADS',
  'icon-waveform':  'VOICE',
  'icon-grid':      'BEATS',
  'icon-arrows':    'YARD',
  'icon-star':      'BONUS',
  'icon-magnifier': 'KEYS',
  'icon-exit':      'EXIT',
};
for (const [id, label] of Object.entries(TOOLBAR_LABELS)) {
  const t = this.add.text(0, 0, label, {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: '8px',
    color: '#D4B483',   // warm gold — matches the toolbar border colour
    align: 'center',
  }).setOrigin(0.5, 0).setDepth(11).setVisible(false);
  (t as any).__spawnId = id;
  this.toolbarLabels.push(t);
}
```

In `layoutChrome()`, after `relayoutSpawns`, position each label below its button:
```ts
for (const label of this.toolbarLabels) {
  const id = (label as any).__spawnId as string;
  const spawn = this.chromeSpawns.find(s => s.id === id);
  if (!spawn) continue;
  const p = placeSpawn(spawn, r, { width, height });
  label.setPosition(p.x, p.y + p.height * 0.5 + 2).setVisible(true);
  // Scale font with the scene
  label.setFontSize(Math.max(6, Math.round(p.height * 0.18)));
}
```

Also destroy the labels in `shutdown()` / `destroy()` alongside the other chrome objects.

**Note on `icon-exit`:** The EXIT button already has a text label painted into the base plate art (`EXIT` text is visible in the toolbar). Do not add a second label for it — skip `icon-exit` in the `TOOLBAR_LABELS` loop, or set its label to `""`.

---

## Do Not Touch

- The Workshop grid, lane logic, instrument panels, or audio engine.
- The Yard, Track, or Map scene logic (only fix nav labels if you address Fix 3).
- The `SONG 001` counter — it is correct and should remain.
- The `workshop-baseplate.png` or any other art file — all fixes are code-only overlays.

---

## Commit message

```
fix(workshop): speed LCD alignment, TEMPO mask, toolbar labels, nav consistency
```
