# iBeetKidz — Director Handoff

> **For any LLM taking over as project director.** Read this entire document before writing a single agent prompt. It covers the product vision, the architecture, the current state, the exact open bugs, and the friction patterns that have caused wasted cycles with previous coding agents.

---

## 1. What This App Is and What It Should Feel Like

**iBeetKidz** is a music-making game for kids, running entirely in the browser. The aesthetic is 16-bit SNES pixel art. The metaphor is a toy train world: you make music by loading instruments into train cars, assembling a train in the yard, and riding it around a track. Each car is one loop of music. The train is the song.

The finished app should feel like a **self-contained pixel game**. There must be zero visible browser chrome — no HTML buttons, no CSS borders, no web-style hover states. Every interactive element must look like it belongs in the painted art. If a kid can tell they are using a website, the UI is wrong.

The four scenes are:

| Scene | What it is |
|---|---|
| **Map** | The world map. Three painted buildings: Workshop, Yard, Track. Tap a building to go there. |
| **Workshop** | The music studio. A boxcar sits on the tracks. You load instruments into it. The boxcar interior is the sequencer grid. |
| **Yard** | The train yard. You see all your cars on sidings. You assemble them into a train and send it to the Track. |
| **Track** | The race track. Your train rides the oval. Each car plays its loop as it passes the crossing signal. |

The core creative loop is: **Workshop → make music in a car → Yard → assemble train → Track → hear the song**.

---

## 2. The Architecture (Do Not Break This)

The codebase uses a **hexagonal/ports-and-adapters** architecture. This is not optional — it is the reason the app is fast, testable, and maintainable.

```
src/core/          ← Pure domain logic. No React, no Phaser, no audio APIs.
  types.ts         ← All data types (Project, Layer, TrainCar, etc.)
  project-state.ts ← Reducer + all commands (addCar, toggleNote, removeLayer, etc.)
  sound-catalog.ts ← Built-in instrument definitions (no audio code)
  instruments.ts   ← Melody instrument recipes

src/ports/         ← Interface definitions (contracts)
  sound-port.ts    ← The audio interface (startRecording, playNote, etc.)

src/adapters/      ← Implementations of ports
  tone-sound-port.ts ← Tone.js audio implementation

src/game/          ← Phaser scenes (presentation layer only)
  scenes/          ← One file per scene
  scene-layout.ts  ← ALL coordinate data (normalized 0..1 fractions of the background image)
  tool-panels.ts   ← Phaser-native satellite tool panels
  EventBus.ts      ← Typed event bus bridging Phaser ↔ React

src/components/    ← React wrappers (thin — mostly EventBus listeners + dispatch)
  Workshop.tsx     ← Handles all Workshop EventBus events, calls sound port
  Yard.tsx         ← Handles Yard EventBus events
  Track.tsx        ← Handles Track EventBus events
  Map.tsx          ← Handles Map navigation
```

**The golden rule:** Phaser scenes emit events via `EventBus`. React components listen and call `dispatch()` (state) or `sound.*` (audio). Phaser never touches state or audio directly. This boundary must never be crossed.

**Coordinate system:** All positions in `scene-layout.ts` are **normalized fractions of the background image** (0..1 in both axes). The `backgroundRect` in each scene converts them to screen pixels at runtime. This means coordinates are resolution-independent. When tuning hit-area positions, always measure from the background art PNG, not from the running canvas.

---

## 3. The Background Art (The Ground Truth)

Every scene is a single flat PNG background. The art is the UI. Code draws transparent hit-areas over the painted buttons. **The art never changes. Code adapts to the art.**

### Workshop (`src/assets/scenes-v2/workshop-scene-clean.png`, 2560×1440)

The workshop has three interactive zones painted in the art:

**Top toolbar** — 9 icon buttons in a row inside a painted panel. Left to right:
1. Notepad → New Car
2. Music note → Magic Pad
3. Speaker → Sound Pads
4. Waveform → My Voice
5. Grid → Beat Maker
6. Arrows → Send to Yard
7. Star → Surprise
8. Magnifier → Voice Keys / Melody Editor
9. EXIT → Map

Measured icon centres (normalized x, all at y≈0.035):
`0.199, 0.266, 0.332, 0.398, 0.465, 0.531, 0.598, 0.664, 0.730`

**Ground instruments** — 4 painted instruments on the dirt in front of the tracks. Left to right:
1. **Drum kit** (x≈0.230, y≈0.694) → opens Beat Maker
2. **Microphone** (x≈0.434, y≈0.674) → opens My Voice
3. **Guitar/bass** (x≈0.613, y≈0.688) → opens Sound Pads
4. **Keyboard/piano** (x≈0.777, y≈0.694) → opens Voice Keys / Melody Editor

**Bottom transport panel** — painted STOP / PLAY / LOOP / SPEED↓ / SPEED↑ buttons, plus a SONG LCD and a TEMPO/SPEED LCD. The TEMPO LCD shows "120" in lime green on a very dark green screen (`#0d1a0d`). The SPEED LCD shows "04" in the same style. The digit color is approximately `#739936`.

### Yard (`src/assets/scenes-v2/yard-scene-clean.png`, 2560×1440)

Bottom panel has 6 painted buttons: INFO, MOVE, COUPLE, UNCOUPLE, BUILD, DELETE — plus an EXIT button bottom-right. The EXIT button is wired in `YardScene.ts` via `YARD_LAYOUT_V2.panel.exit`.

### Track (`src/assets/scenes-v2/track-scene-clean.png`, 2560×1440)

Bottom panel has 5 painted transport buttons: ⏪ ⏸ ⏹ ▶ ⏩. All wired in `TrackScene.ts`.

### Map (`src/assets/references/map-scene.png`, 2560×1440)

Three painted labels: WORKSHOP (cabin, left), YARD (building, centre), TRACK (oval, right). Navigation is currently handled by transparent React `<button>` overlays in `Map.tsx`. This is acceptable for the Map because the buttons are truly transparent (no visible chrome) and the Map has no other interactive elements.

---

## 4. Current State (as of Phase 6)

### What is working

- All four scenes render full-bleed (no letterbox) via `addBackground("cover")`.
- Workshop toolbar (9 icons) is wired as Phaser hit-areas via `buildToolbar()`. Tapping an icon opens the correct tool panel or navigates.
- Workshop transport (STOP/PLAY/LOOP/SPEED↓/SPEED↑) is wired as transparent Phaser hit-areas. STOP, PLAY, LOOP work. Speed buttons fire `tempo-changed` events.
- The sequencer grid renders in the boxcar interior and updates from the project model.
- The five satellite tool panels (`VoiceToolPanel`, `VoiceKeysToolPanel`, `PadsToolPanel`, `BeatToolPanel`, `MagicToolPanel`) are Phaser-native (no HTML modals). They open/close correctly.
- `MelodyEditorPanel` exists in `tool-panels.ts` for melody lanes.
- Yard scene: crane animation, palette cars, Add to Train, Send to Track all work.
- Track scene: train rides the oval, crossing signal, speed/direction controls all work.
- 126 unit tests pass. Typecheck clean.

### What is broken (open bugs, in priority order)

**Bug 1 — Instrument shelf: wrong count and wrong coordinates.**
`WORKSHOP_SHELF_IDS` has 8 entries but the art only has **4 painted instruments** (drum kit, mic, guitar, keyboard). The `instruments` layout spreads 8 evenly-spaced zones across the instrument area, so the zones do not align with the painted instruments. The fix is to change `WORKSHOP_SHELF_IDS` to 4 entries and define each hit-area individually with measured coordinates:

```ts
// CORRECT mapping (to implement):
instruments: {
  drumKit:  { x: 0.230, y: 0.694, w: 0.10, h: 0.18 },  // → Beat Maker
  mic:      { x: 0.434, y: 0.674, w: 0.08, h: 0.20 },  // → My Voice
  guitar:   { x: 0.613, y: 0.688, w: 0.10, h: 0.18 },  // → Sound Pads
  keyboard: { x: 0.777, y: 0.694, w: 0.12, h: 0.16 },  // → Voice Keys / Melody Editor
}
```

**Bug 2 — Speed display: live BPM number floats over the painted LCD.**
The current implementation adds a dark-green mask rect over the painted TEMPO LCD and draws a Phaser `Text` on top. The painted "04" or "120" bleeds through because the mask color is wrong. The fix is to sample the exact LCD background color from the art using PIL/ImageMagick and use that exact hex value for the mask rect. The LCD background is approximately `#0d1a0d`. The digit color is `#739936`.

**Bug 3 — Press animations: missing on all Phaser interactive objects.**
No interactive object in any scene has a proper press animation. The correct behavior (consistent across all scenes) is:
- On `pointerdown`: scale container to 0.92 + shift y by +2px (simulates physical press).
- On `pointerup`/`pointerout`: restore scale to 1.0 and position.
- Applies to: toolbar buttons, shelf instruments, transport buttons, Yard panel buttons, Track control buttons, and all `PanelButton` instances in `tool-panels.ts`.

**Bug 4 — Delete instrument from car: no UI.**
The `removeLayer` reducer action exists in `project-state.ts`. The `workshop-layer-delete` event is defined in `EventBus.ts`. But there is no visible delete control on lane rows in the Workshop grid. The fix is to add a small `✕` hit-area on the left edge of each lane row label in the grid, emitting `workshop-layer-delete` with the lane id.

**Bug 5 — HTML nav buttons still floating over Yard and Track.**
`Yard.tsx` and `Track.tsx` still have `PixelButton` React elements in absolute-positioned `<div>` containers at top-left and top-right of the viewport (the "◀ Workshop" and "🗺️ Map" buttons). These are visually inconsistent with the pixel art. The fix is to move these into the Phaser scenes as hit-areas over the painted EXIT button (Yard already has `YARD_LAYOUT_V2.panel.exit` defined) and add a similar nav button to the Track scene's painted panel.

**Bug 6 — Toolbar coordinate mismatch.**
Current `scene-layout.ts` has `toolbar: { count: 9, c0: 0.321, c1: 0.814 }`. Measured from the art, the correct values are `c0: 0.199, c1: 0.730`. The current values place hit-areas shifted right of the actual painted icons.

**Bug 7 — Track tarp strip is HTML.**
`Track.tsx` renders a row of `<button>` elements above the scene for muting/unmuting cars. These should be Phaser-native hit-areas over the painted car slots on the track oval, or at minimum rendered as a Phaser overlay panel.

---

## 5. The Intended Workshop Flow (Full Detail)

This is the most important scene. Every interaction must feel native to the pixel art.

1. Kid arrives at the Workshop. They see the boxcar (empty sequencer grid) and 4 instruments on the ground.
2. They **tap the drum kit** → Beat Maker panel slides in over the scene. It looks like a pixel panel with a 4×16 step grid. They tap cells to program a beat. They tap "DONE" or the close button → the beat appears as a lane in the boxcar grid.
3. They **tap the microphone** → My Voice panel slides in. They tap the record button, sing or make a sound, tap stop. They can apply FX tiles (reverse, pitch, robot, echo, reverb, bitcrush). They tap "Send to Car" → a voice lane appears in the boxcar grid.
4. They **tap the guitar** → Sound Pads panel slides in. A grid of sound pads (built-in sounds + their recordings). They tap a pad to preview it. They tap "Add to Car" → a melody lane with that sound appears.
5. They **tap the keyboard** → Voice Keys or Melody Editor panel slides in. For melody: a BeepBox-style pitch grid (7 rows = scale degrees, 16 columns = steps). They tap cells to write a melody. They tap "Done" → a melody lane appears.
6. The boxcar grid now shows their lanes. Each lane row has a colored label on the left and 16 step cells. There is a `✕` on each lane to delete it.
7. The transport buttons (STOP/PLAY/LOOP/SPEED↓/SPEED↑) control playback. The TEMPO LCD shows the current BPM live. The SONG LCD shows the current car number.
8. When they are happy with the car, they tap the **arrows icon** (toolbar icon 6) → "Send to Yard" → the car is added to their collection.
9. They tap **EXIT** (toolbar icon 9) → back to the Map.

---

## 6. What CCC Keeps Getting Wrong (The Friction Patterns)

These are patterns from the conversation history that have caused wasted cycles. Any LLM directing this project must anticipate these and write prompts that prevent them.

**Pattern 1: Overlaying instead of replacing.**
When asked to show a live value (e.g., the BPM number in the TEMPO LCD), CCC adds a Phaser `Text` object on top of the painted art without properly masking the painted value underneath. The result is two numbers visible at once. The correct approach: measure the exact background color of the LCD screen from the PNG, draw a filled rectangle of that exact color over the painted number, then draw the live text on top. Always use PIL or ImageMagick to sample the color — never guess.

**Pattern 2: Spreading N zones over M painted objects (N ≠ M).**
When asked to make painted instruments tappable, CCC used `rowCell()` to spread 8 evenly-spaced zones across the instrument area. The art has 4 instruments at specific positions. The zones did not align with the instruments. The correct approach: measure each instrument's center from the PNG and define each hit-area individually by name, not by index in a spread.

**Pattern 3: Adding emoji/text labels to transparent hit-areas.**
The painted art is the label. Adding an emoji or text label on top of a painted button covers the art and looks wrong. Transparent hit-areas should have `fillAlpha: 0` and no child text objects. The only visual feedback should be a brief press animation (scale + position shift on pointerdown).

**Pattern 4: Claiming it works without being able to see it.**
CCC cannot run a browser and see the canvas. It can only verify typecheck + unit tests. These do not catch coordinate misalignment. Agent prompts must explicitly require CCC to state when a coordinate is a measurement from the PNG vs a guess, and to flag any coordinate it cannot verify visually.

**Pattern 5: Defending half-measures.**
When the user points out that a fix is wrong (e.g., "the green number is floating over the painted LCD"), CCC should not defend the implementation. It should acknowledge the problem, identify the root cause, and fix it. The user's visual judgment is correct.

**Pattern 6: Not reading the art before writing coordinates.**
Every coordinate in `scene-layout.ts` must be measured from the PNG using PIL or ImageMagick before being written. The workflow is:
```python
from PIL import Image
img = Image.open('src/assets/scenes-v2/workshop-scene-clean.png')
w, h = img.size
# Sample a pixel color at (x, y)
r, g, b, a = img.getpixel((x_pixels, y_pixels))
# Normalized coordinate of a feature at pixel position (px, py)
nx, ny = px / w, py / h
```
Never write a coordinate as a guess. Always measure.

**Pattern 7: Scope creep in the wrong direction.**
CCC sometimes adds features that were not asked for (e.g., adding a `speedLabel` text object when only the live BPM number was requested) and simultaneously fails to implement the thing that was asked for (the mask). Agent prompts should be explicit: "do X, do not do Y."

---

## 7. How to Write Agent Prompts for This Project

Agent prompts (the `AGENT_PROMPT_PHASE_N.md` files) are instructions for CCC (Claude Code). They follow a consistent format:

1. **Context** — One paragraph summarizing what phase this is and what the previous phase delivered.
2. **Gates** — The pass/fail criteria that must all be true before the agent commits: `typecheck clean`, `126 unit tests pass`, `build green`.
3. **Tasks** — Numbered list of specific changes. Each task specifies:
   - Which file to change
   - What the current behavior is
   - What the correct behavior is
   - The exact coordinate or value (measured, not guessed)
4. **Do Not** — Explicit list of things CCC must not do (prevents Pattern 3, 5, 7).
5. **Measurement instructions** — PIL/ImageMagick commands to verify coordinates before writing them.

The prompts are committed to the repo so CCC can read them directly. They are not sent as chat messages.

---

## 8. Remaining Work (Prioritized)

### Next phase — Fix the Workshop ground truth

1. **Fix instrument shelf** — Change `WORKSHOP_SHELF_IDS` to 4 entries. Change `instruments` in `scene-layout.ts` to 4 named positions (measured from art). Change `buildShelf()` to create 4 hit-areas that open the corresponding tool panel. Remove the `rowCell` spread. Hit-areas must be transparent (`fillAlpha: 0`), no emoji labels.

2. **Fix toolbar coordinates** — Change `c0: 0.321, c1: 0.814` to `c0: 0.199, c1: 0.730` in `scene-layout.ts`. Verify all 9 toolbar icons are hit correctly.

3. **Fix TEMPO LCD** — Sample the exact LCD background color from the art. Use that color for the mask rect. Position the live BPM text precisely over the painted "120" digits.

4. **Add press animations** — Implement a shared `pressAnimation(container)` helper that does `setScale(0.92)` + `y += 2` on pointerdown and restores on pointerup/pointerout. Apply to all interactive Phaser objects in all scenes.

5. **Add lane delete** — Add a `✕` hit-area on the left edge of each lane row in the Workshop grid. Emit `workshop-layer-delete` on tap.

### Following phase — Remove remaining HTML overlay

1. Move Yard nav buttons (Workshop ◀, Map 🗺️) into `YardScene.ts` as Phaser hit-areas.
2. Move Track nav buttons into `TrackScene.ts`.
3. Move Track tarp strip into `TrackScene.ts` as Phaser hit-areas over the painted car slots.
4. Move Map destination buttons into `MapScene.ts` as Phaser hit-areas over the painted WORKSHOP/YARD/TRACK labels.

### Following phase — Audio verification

1. Verify all satellite tool panels work with real audio (mic recording, FX, send to car, pad playback, beat grid, theremin).
2. Verify melody editor (note grid) correctly populates a lane and plays back.
3. Verify Voice Keys (record a clip, play it as a chromatic instrument).
4. Fix any audio bugs found.

---

## 9. Key Files Reference

| File | Purpose |
|---|---|
| `src/game/scene-layout.ts` | All normalized coordinates. Change this first for any position fix. |
| `src/game/scenes/WorkshopScene.ts` | Workshop Phaser scene. Builds toolbar, shelf, transport, grid. |
| `src/game/tool-panels.ts` | All 6 satellite tool panels (Phaser-native). |
| `src/game/EventBus.ts` | Typed event bus. All Phaser→React communication goes here. |
| `src/components/Workshop.tsx` | React wrapper. All EventBus listeners + dispatch + sound calls. |
| `src/core/project-state.ts` | Reducer + all commands. The source of truth for what actions exist. |
| `src/core/types.ts` | All data types. Read this before touching state. |
| `src/assets/scenes-v2/` | Background PNGs. The ground truth for all coordinates. |
| `CLAUDE.md` | Auto-updated project log. Read for current state details. |

---

## 10. Commands

```bash
npm install
npm run dev        # localhost:5173 — use this to visually verify coordinates
npm run typecheck  # must pass before commit
npm run test       # 126 unit tests — must pass before commit
npm run build      # production build
```

Deployment is via GitHub Actions to GitHub Pages at `https://eriqueo.github.io/ibeetkidz/`. Push to `main` triggers deploy automatically.

---

## 11. One-Sentence Summary for Each Scene

- **Map:** Tap a painted building to go to that scene. Currently uses React transparent buttons — acceptable but should eventually move to Phaser.
- **Workshop:** Make music. Tap instruments to open tools. Tools add lanes to the boxcar grid. Transport buttons control playback. Send the car to the Yard when done.
- **Yard:** Assemble your cars into a train. Tap COUPLE to add a car. Tap the track icon to send the train to the Track.
- **Track:** Hear your song. The train rides the oval. Each car plays its loop at the crossing signal.
