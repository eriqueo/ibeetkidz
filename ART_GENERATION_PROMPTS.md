# iBeetKidz Phase B Art Generation Prompts

This document provides the exact prompts needed to generate the "clean" base plates and standalone interactive sprites required to unblock the wiring of the Yard, Track, and Map scenes.

## 1. Global Art Style Constraints
Append these style constraints to every generation prompt to ensure consistency across the game:

> **Style Constraints:** 16-bit SNES style pixel art, highly detailed, vibrant colors, warm lighting, nostalgic toy train aesthetic, clean edges, no anti-aliasing, no text or typography, isometric perspective.
> **Resolution:** Base plates must be scaled to exactly `2560x1440` pixels. Sprites must be on a transparent background.

---

## 2. Yard Scene Assets

### Clean Base Plate
> A highly detailed 16-bit pixel art scene of a bustling train yard. Multiple parallel train tracks run horizontally across the scene. In the background, a massive industrial gantry crane stands ready. The ground is gravel and dirt. **Crucially: Do not include any trains, train cars, buttons, or UI panels in the scene.** It must be an empty, clean yard waiting for trains to be placed.

### Nav Panel & Buttons (Sprites)
> A metallic or wooden 16-bit pixel art control panel (long horizontal container) for a train yard, on a transparent background.
> **Buttons (generate individually on transparent backgrounds):** 
> - An "info" icon (question mark or magnifying glass)
> - A "move" icon (directional arrows)
> - A "couple" icon (two train couplers joining)
> - An "uncouple" icon (two train couplers separating)
> - A "build/edit" icon (a wrench or hammer)
> - A "delete" icon (a trash can or red X)
> - An "exit" icon (a map or a door)

### Crane Hook (Sprite)
> A standalone 16-bit pixel art heavy industrial crane hook attached to a thick steel cable, drawn on a transparent background. Create two frames: one with the hook open, and one with the hook closed.

---

## 3. Track Scene Assets

### Clean Base Plate
> A highly detailed 16-bit pixel art scene of a scenic railway track. The track forms a large, continuous oval taking up most of the scene. The environment inside and outside the oval is lush green countryside with trees and small hills. **Crucially: Do not include any trains, crossing signals, buttons, or UI panels in the scene.** It must be an empty, clean track.

### Transport Panel & Buttons (Sprites)
> A metallic 16-bit pixel art control panel for a train dashboard, on a transparent background.
> **Buttons (generate individually on transparent backgrounds):**
> - A "rewind" icon (double left arrows)
> - A "pause" icon (two vertical bars)
> - A "stop" icon (a square)
> - A "play/ride" icon (a right arrow)
> - A "fast-forward" icon (double right arrows)

### Top Nav Buttons (Sprites)
> **Buttons (generate individually on transparent backgrounds):**
> - A "Yard" icon (a small train shed or siding)
> - A "Map" icon (a folded paper map)

### Mute Toggle (Sprites)
> **Buttons (generate individually on transparent backgrounds):**
> - A "mute-on" icon (a speaker with an X or a covered train car)
> - A "mute-off" icon (an active speaker or an uncovered train car)

---

## 4. Map Scene Assets

### Clean Base Plate
> A highly detailed 16-bit pixel art isometric map of a toy train world. The map features three distinct areas connected by tracks: a rustic wooden Workshop cabin on the left, a large industrial train Yard building in the center, and a lush green Track oval on the right. **Crucially: Do not include any text labels, buttons, or UI panels.** The buildings themselves serve as the navigation points.

### Handcar (Sprite)
> A small, standalone 16-bit pixel art handcar (pump trolley) with a wooden handle, designed to sit on train tracks. Draw it from an isometric perspective on a transparent background.

---

## 5. Boxcar "Open Doors" Variant (Workshop)

### Boxcar Interior Sprite
> A 16-bit pixel art train boxcar viewed from the side, but with its large sliding side doors completely wide open, revealing a dark, empty wooden interior. The interior must be dark enough to serve as a background for a glowing sequencer grid. Draw it on a transparent background.
