# iBeetKidz Project Charter

**Date:** July 1, 2026
**Status:** Canonical Source of Truth

> **For any LLM taking over as project director or engineer:** This document is the absolute law for product vision, architecture, and visual style. It supersedes all previous design briefs, handoff documents, and architectural guides. Read this before writing a single line of code or generating any art.

---

## 1. Product Vision & Aesthetic

**iBeetKidz** is a music-making game for kids, running entirely in the browser. The aesthetic is late-80s/early-90s Nintendo toy software (specifically *Mario Paint*). It must feel like a **self-contained pixel game**, not a website.

*   **The Metaphor:** A toy train world. You make music by loading instruments into train cars, assembling a train in the yard, and riding it around a track. Each car is one loop of music. The train is the song.
*   **The Core Loop:** Workshop (make music in a car) → Yard (assemble train) → Track (hear the song).
*   **The Vibe:** Warm, bright, readable, goofy-cute, hand-made. No dark synthwave, no neon glow, no generic emoji.
*   **The Cast:** The "Beet crew" — instruments and tools are friendly objects with faces and personalities (e.g., frog on drums, chipmunk on mic).

### Visual Style Rules
*   **Palette:** Warm Nintendo toy-world hue families with rich material ramps for oak, brass, steel, parchment, cloth, water and scenery. UI state pairs stay coherent. No neon glow or generic modern gradient treatment.
*   **Pixels:** Crisp pixel clusters and nearest-neighbour treatment where assets are scaled. Preserve authored detail and registration; do not reduce accepted art to a sparse fixed-grid sketch.
*   **Outlines & Depth:** Decisive dark outlines and hard-edged contact/drop shadows. No blurred glow.
*   **Typography:** Press Start 2P for game labels and display text; Cascadia Code for readable body and operational text. Keep text high-contrast on its authored plate.

---

## 2. Architecture & Engineering Principles

The codebase follows strict principles to ensure maintainability, testability, and flexibility.

### 2.1 Hexagonal Core (Ports & Adapters)
*   **Core:** `src/core/` and `src/ports/` contain pure domain logic (types, reducers, commands). No React, no Phaser, no audio APIs.
*   **Presentation:** React (`src/components/`) and Phaser (`src/game/`) are strictly presentation. They listen to events and dispatch commands.
*   **Audio:** Tone.js is isolated in `src/adapters/tone-sound-port.ts`.
*   **The Boundary:** Phaser scenes emit events via `EventBus`. React listens and calls `dispatch()` or `sound.*`. Phaser never touches state or audio directly.

### 2.2 Data-Driven Layout (The Tiled Pipeline)
We treat authored scene layout as data where a Tiled map exists.
*   **Separation of Assets:** Scenes consist of a clean Base Plate (scenery only) and separate interactive Sprites (buttons, instruments).
*   **Tiled Maps:** Layout is authored visually in Tiled and exported as JSON (`src/assets/maps/*.json`).
*   **Generic Interpreters:** Phaser scenes are generic interpreters that load the JSON map, spawn sprites based on the `InteractiveObjects` layer, and wire them to the `EventBus` based on their `action` property.
*   **TrackV3 exception:** The default side-scrolling Track has no Tiled map. `TrackV3Scene` builds its moving world and screen chrome programmatically; its coordinates are presentation detail and must not leak into the core.

### 2.3 The Three-Zone UI Rule
Every scene (except Map) follows a strict three-zone layout. Tiled-backed scenes
define the zones in Tiled; TrackV3 implements the same contract in its scene:
1.  **Top Bar:** Navigation (left/right arrows) and view-level mode switching (e.g., car type).
2.  **Field:** The interactive elements you manipulate (e.g., instruments in Workshop, cars in Yard).
3.  **Bottom Bar:** Controls for the current view's manipulations (e.g., transport/mixer in Workshop, add/remove in Yard).

### 2.4 State & Commands
*   **Everything is a Clip.** No parallel sound representations.
*   **Mutations via Command + Reduce.** Reducers are pure. Undo/redo is free.
*   **Errors as Values.** Fail loud at boundaries, recover silently in core.

### 2.5 The Transport Is The Clock (decided — do not re-litigate)

**The audio transport drives the train. The train never drives the audio.**

This is the settled architecture, not an open question. `AudioEngine.scheduleArrangement`
lays the whole train out on Tone.js's transport ahead of time; the Phaser train, the
crossing signal and the sounding-car highlight in `TrackScene` are **rendered from** the
transport's position — the car the highlight names is exactly the bar that is sounding,
because the visual reads the clock, never the reverse. Playback is gapless and jitter-free
as a result.

**Which visual carries the readout is NOT part of this decision.** It was car POSITION for
one round (`i / carCount` of the lap), which forced car spacing to be a function of song
length and made the train read as scattered wagons. The cars are now coupled by real arc
length and the readout is an explicit highlight. Both are derived from the same `progress`,
so the rule above is untouched — a future round may move the readout again, and only has to
keep deriving it from the transport. See `design/HISTORY.md` for the two failed models.

**Why the inverse was rejected.** The alternative — the train's physical position on the
oval triggering each car's loop as it passes the signal — makes audio onsets a function of
the render loop. That couples musical timing to frame delivery: a dropped frame, a
backgrounded tab, or a slow device becomes an audible timing error, and no amount of
tuning fixes it, because a rAF callback is not a clock. Scheduling ahead on the transport
is the only way to stay sample-accurate. Frame-driven audio triggering is a known timing
hazard and is out of scope permanently.

**Consequences for anyone working in `TrackScene` or `AudioEngine`:**
*   Direction and speed controls on the Track are **cosmetic over the same clock** — they
    change tempo and the drawn direction, and must stay signal-consistent. They are not a
    second source of timing truth.
*   Never introduce a second writer of playback position. If a visual needs sub-bar
    smoothness, read it (`SoundPort.getTransportStep`), don't compute it.
*   A visual that disagrees with the audio is a rendering bug, to be fixed on the visual
    side.

This decision retired an earlier proposal to let train position trigger audio;
Git history retains that rejected design. It is deleted, not deferred.

---

## 3. Scene Definitions

| Scene | Purpose | Top Bar | Field | Bottom Bar |
| :--- | :--- | :--- | :--- | :--- |
| **Map** | World navigation | N/A | Clickable buildings (Workshop, Yard, Track) | N/A |
| **Workshop** | Music studio | Nav + Car Type Switcher | Instruments (tap to add lane) | Transport (Stop/Play/Loop/Tempo) |
| **Yard** | Train assembly | Nav | Train cars on sidings | Add/Reorder/Delete controls |
| **Track** | Song playback | Nav + transport | Side-scrolling train, terrain, modes | Tarp/send controls |

### The Satellite Tools
These are Phaser-native panels that open over the Workshop when an instrument is tapped:
*   **Beat Maker:** 16-step drum machine.
*   **My Voice:** Record voice, apply FX (the 8 mascot states), send to car.
*   **Sound Pads:** Soundboard of built-in + recorded sounds.
*   **Voice Keys / Melody Editor:** Pitch grid to write melodies.
*   **Magic Pad:** Live oscillator/filter voice (theremin).

---

## 4. Execution Workflow

1.  **Chesterton's Fence:** Understand why code exists before changing it.
2.  **Minimum Viable Fix:** Fix the exact bug and stop.
3.  **Visual Verification:** Do not guess coordinates or colors. Measure from the PNGs using PIL/ImageMagick.
4.  **Gate Checks:** Every commit must pass `npm run typecheck`, `npm run test`, and `npm run lint`. **Do not quote a test count from this document or from `CLAUDE.md`** — `BASELINE.md` at the repo root is the single producer of that fact, and hardcoded counts here have gone stale repeatedly. Read `BASELINE.md`, or run the gate.

## References
[1] R. C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
[2] M. W. Hadley, "Modular Game Worlds in Phaser 3 (Tilemaps #1) — Static Maps," Medium, Jul. 4, 2018. [Online]. Available: https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6
