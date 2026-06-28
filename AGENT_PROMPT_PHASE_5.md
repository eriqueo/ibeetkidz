# Refactor Phase 5: Satellite Tools (Phaser Migration)

## Context
Phases 1-4 established the Phaser-native architecture, migrating the main views (Workshop, Yard, Track, Map) and fixing viewport scaling, coordinate alignment, and basic navigation. The final major architectural hurdle is the set of "satellite tools" (Voice, Keys, Pads, Beat, Magic). 

Currently, these tools live in `src/machines/tools.tsx` as React HTML modals (`<div role="dialog">`) that render *over* the `WorkshopScene` canvas. This causes layout issues, breaks the 16-bit immersion, and requires complex event bubbling between DOM pointer events and the AudioEngine.

**Goal:** Rebuild the five satellite tools as Phaser-native panels that render inside `WorkshopScene` (or as their own overlay scenes), eliminating the HTML modals entirely.

**Crucial Architecture Note:** The `src/core/` directory is strictly off-limits. All changes must happen in the React components, Phaser scenes, `scene-layout.ts`, and the `EventBus`. The EventBus remains the only bridge between Phaser and React.

## The Tools to Migrate

### 1. My Voice (`record-voicefx`)
- **Current State:** A big "HOLD TO RECORD" HTML button that transforms into a `ClipCard` with FX tiles (pitch, robot, echo, etc.) and "Send as Beat" / "Send as Notes" buttons.
- **Phaser Target:** A painted modal panel.
  - A large interactive sprite for the Record button (handles `pointerdown`/`pointerup`).
  - Sprites for the FX tiles that toggle active states.
  - Text objects for status messages.
  - Emits new `EventBus` events (e.g., `"tool-voice-record-start"`, `"tool-voice-apply-fx"`).

### 2. Voice Keys (`voice-keys`)
- **Current State:** Similar to My Voice (record a clip), but instead of FX tiles, it renders an HTML keyboard (`.audition-keyboard`) to preview the voice repitched across the scale.
- **Phaser Target:** A painted modal panel.
  - Record button sprite.
  - A row of interactive sprites for the piano keys (`pointerdown` triggers the preview note).
  - Emits `"tool-voice-keys-audition"`.

### 3. Sound Pads (`sound-pads`)
- **Current State:** A grid of HTML buttons (`.pad`) for built-in sounds and recorded clips. Tapping a pad plays the sound and flashes the button.
- **Phaser Target:** A 3x3 or 4x4 grid of sprites.
  - `pointerdown` scales the sprite slightly (pop effect) and emits `"tool-pads-play"`.

### 4. Beat Maker (`beat-grid`)
- **Current State:** An HTML grid of rows (one per drum sound) and columns (16 steps). Tapping a cell toggles it.
- **Phaser Target:** A Phaser grid, similar to the main Workshop grid but contained within the modal panel.
  - `pointerdown` on a cell emits `"tool-beat-toggle"`.

### 5. Magic Pad (`theremin-xy`)
- **Current State:** An HTML `div` that captures pointer coordinates (`onPointerMove`) to drive the Theremin synth, plus a wave-shape selector.
- **Phaser Target:** A large interactive Phaser rectangle or sprite.
  - Listen to `pointerdown`, `pointermove`, and `pointerup` on the zone.
  - Map local pointer coordinates (0..1) to X/Y and emit `"tool-magic-move"`.

## Implementation Strategy

1. **Expand `EventBus.ts`:**
   - Add all necessary events for the tools to communicate with React (e.g., recording start/stop, pad hits, beat grid toggles, magic pad moves).

2. **Update `scene-layout.ts`:**
   - Define a new layout region for the tool modal (e.g., `WORKSHOP_LAYOUT_V2.toolModal`). This should be a large centered panel that covers most of the car interior but leaves the top nav and bottom transport visible.

3. **Create `ToolPanel` Phaser Classes:**
   - Instead of stuffing all five tools into `WorkshopScene.ts`, create a modular system. E.g., a `BaseToolPanel` container that handles the background and "Close" button, extended by `VoiceToolPanel`, `BeatToolPanel`, etc.
   - `WorkshopScene` manages showing/hiding the active tool panel based on state pushed from React.

4. **Refactor `Workshop.tsx`:**
   - Strip out the `<div role="dialog">` rendering logic.
   - The left dock (`STATION_LIST`) stays as HTML `PixelButton`s for now, but clicking them simply dispatches an event or state update that tells `WorkshopScene` to open the corresponding Phaser panel.
   - Move the AudioEngine interaction logic (currently inside the React components in `tools.tsx`) into `useEffect` listeners in `Workshop.tsx` that listen to the new `EventBus` events.

5. **Deprecate HTML Tools:**
   - Remove the old Canvas components from `src/machines/tools.tsx` once their Phaser equivalents are wired up.

## Definition of Done
- `npm run typecheck` passes.
- All five satellite tools open as Phaser-rendered panels inside the canvas, not HTML DOM elements.
- The tools retain full functionality (recording mic input, applying FX, playing pads, drawing theremin notes).
- The `EventBus` strictly handles all communication between the Phaser tool panels and the React audio/state layer.
- The UI feels cohesive and 16-bit, with no floating HTML text or native browser scrollbars.
