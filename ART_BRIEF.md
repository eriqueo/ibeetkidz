---
title: art-brief
type: Reference
timestamp: 2026-06-28T16:25:00-06:00
tags: [art, assets, generation, prompts]
status: stable
---

# iBeetKidz Art Generation Brief

> **This document contains the exact prompts and constraints for generating the Phase A art assets using tools like Midjourney, DALL-E, or Stable Diffusion.**

To achieve the "UI as sprites" architecture [1], the background art must be generated as **clean base plates** (scenery only, no interactive buttons painted in). The interactive elements are generated separately as sprites.

---

## 1. Global Art Style Constraints

Append these style constraints to every generation prompt to ensure consistency across the game:

> **Style Constraints:** 16-bit SNES style pixel art, highly detailed, vibrant colors, warm lighting, nostalgic toy train aesthetic, clean edges, no anti-aliasing, no text or typography, isometric perspective.

**Resolution:** Generate at 16:9 aspect ratio. Final assets must be scaled to exactly `2560x1440` pixels.

---

## 2. Scene 1: The Workshop

The Workshop is the music studio. It is the interior of a train yard shed or a dirt clearing next to a track.

### Base Plate Prompt
> A highly detailed 16-bit pixel art scene of a rustic train yard workshop. A single set of train tracks runs horizontally across the middle of the scene. The ground in front of the tracks is packed dirt with sparse grass. The background behind the tracks is a wooden shed wall or forest edge. **Crucially: Do not include any instruments, tools, buttons, UI panels, or trains in the scene.** It must be an empty, clean environment waiting for objects to be placed.

### Interactive Sprites Needed (Generate Separately)
*   **Instruments:** A drum kit, a vintage microphone on a stand, an electric bass guitar, a synthesizer keyboard. Each must be a standalone object on a transparent background, drawn in the same 16-bit isometric style.
*   **Toolbar Panel:** A long, horizontal metallic or wooden panel (the container for the top nav icons).
*   **Transport Panel:** A metallic control panel with a digital LCD screen area (the container for the bottom playback controls).

---

## 3. Scene 2: The Yard

The Yard is where trains are assembled.

### Base Plate Prompt
> A highly detailed 16-bit pixel art scene of a bustling train yard. Multiple parallel train tracks run horizontally across the scene. In the background, a massive industrial gantry crane stands ready. The ground is gravel and dirt. **Crucially: Do not include any trains, train cars, buttons, or UI panels in the scene.** It must be an empty, clean yard waiting for trains to be placed.

### Interactive Sprites Needed (Generate Separately)
*   **Nav Panel:** A metallic control panel (the container for the bottom Yard controls).
*   **Crane Hook:** A standalone pixel art crane hook attached to a cable, used for the assembly animation.

---

## 4. Scene 3: The Track

The Track is where the train rides and the song plays.

### Base Plate Prompt
> A highly detailed 16-bit pixel art scene of a scenic railway track. The track forms a large, continuous oval taking up most of the scene. The environment inside and outside the oval is lush green countryside with trees and small hills. **Crucially: Do not include any trains, crossing signals, buttons, or UI panels in the scene.** It must be an empty, clean track.

### Interactive Sprites Needed (Generate Separately)
*   **Crossing Signal:** A standalone pixel art railroad crossing signal. Needs two frames: arm up (idle), arm down (playing).
*   **Transport Panel:** A metallic control panel (the container for the bottom Track controls).

---

## 5. Scene 4: The Map

The Map is the world navigation screen.

### Base Plate Prompt
> A highly detailed 16-bit pixel art isometric map of a toy train world. The map features three distinct areas connected by tracks: a rustic wooden Workshop cabin on the left, a large industrial train Yard building in the center, and a lush green Track oval on the right. **Crucially: Do not include any text labels, buttons, or UI panels.** The buildings themselves serve as the navigation points.

### Interactive Sprites Needed (Generate Separately)
*   **Handcar:** A small, standalone pixel art handcar (pump trolley) that sits on the tracks to indicate the player's current location.

---

## References

[1] 00-Evan, "Shattered Pixel Dungeon," GitHub. [Online]. Available: https://github.com/00-Evan/shattered-pixel-dungeon
