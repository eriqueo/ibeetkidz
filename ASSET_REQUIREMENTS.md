---
title: asset-requirements
type: Reference
timestamp: 2026-06-28T15:30:00-06:00
tags: [assets, pixel-art, sprites, backgrounds, scenes]
status: stable
---

# Master Asset Requirements Guide

> **This guide details the complete set of visual assets required to build the iBeetKidz app according to the Tiled/data-driven architecture.**

The app consists of four main scenes (Map, Workshop, Yard, Track) and several satellite tools (Beat Grid, Sound Pads, Voice Keys, My Voice, Magic Pad). Every interactive element must be a standalone sprite, and every background must be a clean "base plate" devoid of interactive elements [1].

This document audits what we have, identifies the gaps, and provides a comprehensive checklist for the art team.

---

## 1. Scene Backgrounds (Base Plates)

A base plate is a flat PNG (e.g., 2560x1440) that contains only static scenery. It must **not** contain any buttons, instruments, vehicles, or dynamic text [2].

| Scene | Current State | Required Action |
| :--- | :--- | :--- |
| **Workshop** | Contains painted instruments, toolbar icons, and transport buttons. | **Inpaint** to remove all instruments from the dirt, all 9 icons from the top toolbar frame, and all 5 transport buttons + LCD text from the bottom frame. Leave the empty metal frames. |
| **Yard** | Contains parked train cars on sidings and nav buttons in the bottom panel. | **Inpaint** to remove all train cars from the tracks and all 7 nav buttons from the bottom panel. Leave the empty tracks and empty panel. |
| **Track** | Contains a static train on the top track and transport buttons in the bottom panel. | **Inpaint** to remove the static train completely and all 5 transport buttons + LCD text from the bottom panel. Leave the empty track and empty panel. |
| **Map** | Contains a static handcar on the track between buildings. | **Inpaint** to remove the handcar. The buildings themselves act as the hit-areas, so they can stay in the art. |

---

## 2. Interactive Sprites

Every element that the user can tap, drag, or interact with must be a standalone transparent PNG.

### 2.1. Workshop Sprites

| Category | Sprite Name | Current State | Required Action |
| :--- | :--- | :--- | :--- |
| **Toolbar** | `icon-notepad`, `icon-musicnote`, `icon-speaker`, `icon-waveform`, `icon-grid`, `icon-arrows`, `icon-star`, `icon-magnifier`, `icon-exit` | Exists in `src/assets/scenes-v2-sliced/` | **Verify.** The current crops are good, but if the art style changes, these must be regenerated. |
| **Instruments** | `inst-drum`, `inst-mic`, `inst-guitar`, `inst-keys` | Exists, but crops are misaligned. | **Regenerate.** Need clean, tightly-bounded transparent PNGs of each instrument. Must add the missing 5 instruments (cowbell, cymbal, tambourine, snare, tom) to match the `INSTRUMENTS` catalog. |
| **Transport** | `btn-stop`, `btn-play`, `btn-loop`, `btn-speed-down`, `btn-speed-up` | Exists in `src/assets/scenes-v2-sliced/` | **Verify.** Current crops are usable. |
| **Displays** | `lcd-tempo-screen` | Exists in `src/assets/scenes-v2-sliced/` | **Verify.** Current crop is usable. |
| **Grid** | `grid-cell-empty`, `grid-cell-filled` | Missing. Currently using programmatic Phaser rectangles. | **Create.** Need pixel-art style boxes for the sequencer grid cells to match the boxcar aesthetic. |
| **Car Picker** | `picker-arrow-left`, `picker-arrow-right` | Missing. Currently using text arrows. | **Create.** Need pixel-art style arrow buttons for the car type selector. |

### 2.2. Yard Sprites

| Category | Sprite Name | Current State | Required Action |
| :--- | :--- | :--- | :--- |
| **Nav Panel** | `btn-info`, `btn-move`, `btn-couple`, `btn-uncouple`, `btn-build`, `btn-delete`, `btn-exit` | Missing. Currently using HTML/CSS buttons. | **Create.** Need pixel-art style buttons matching the Yard's bottom panel aesthetic. |
| **Crane** | `crane-hook-open`, `crane-hook-closed` | Missing. Currently using a programmatic rectangle for the lift. | **Create.** Need sprites for the crane hook to animate picking up cars. |

### 2.3. Track Sprites

| Category | Sprite Name | Current State | Required Action |
| :--- | :--- | :--- | :--- |
| **Transport** | `btn-rewind`, `btn-pause`, `btn-stop`, `btn-play`, `btn-fastforward` | Missing. Currently using HTML/CSS buttons. | **Create.** Need pixel-art style buttons matching the Track's bottom panel aesthetic. |
| **Nav** | `btn-yard`, `btn-map` | Missing. Currently using HTML/CSS buttons. | **Create.** Need pixel-art style buttons for top-screen navigation. |
| **Mute** | `btn-mute-on`, `btn-mute-off` | Missing. Currently using HTML/CSS buttons. | **Create.** Need pixel-art style toggle buttons that will float above each train car. |

---

## 3. Vehicle Spritesheets

Vehicles (the train cars) need to be rendered from multiple angles to support the 2.5D perspective as they travel around the Track oval.

We currently have a robust set of vehicle sprites in `src/assets/sprites-v2/` (boxcar, flatcar, hopper, loco, tanker) rendered from 8 directions (N, NE, E, SE, S, SW, W, NW). These are packed into `src/assets/spritesheets/train.json`.

| Vehicle Type | Current State | Required Action |
| :--- | :--- | :--- |
| **Boxcar** | Complete (8 directions). | **Infill required.** The boxcar needs an "open doors" variant so the sequencer grid can be seen inside it while in the Workshop. |
| **Locomotive** | Complete (8 directions). | None. |
| **Flatcar** | Complete (8 directions). | None. |
| **Hopper** | Complete (8 directions). | None. |
| **Tanker** | Complete (8 directions). | None. |
| **Handcar** | Missing. | **Create.** Need a handcar sprite for the Map scene. |

---

## 4. Satellite Tool Assets

The satellite tools (Beat Maker, Sound Pads, etc.) are currently HTML modals. To migrate them to Phaser, we need pixel-art assets for their interfaces [3].

| Tool | Required Sprites |
| :--- | :--- |
| **Base Panel** | `tool-bg-panel` (A generic pixel-art window background with a border), `btn-close-x`. |
| **Beat Maker** | `drum-icon-kick`, `drum-icon-snare`, `drum-icon-hihat`, etc. (matching `DRUM_SOUNDS` catalog). |
| **Sound Pads** | `pad-up`, `pad-down` (Large, chunky pixel-art buttons). |
| **Voice Keys** | `key-white-up`, `key-white-down`, `key-black-up`, `key-black-down`. |
| **My Voice** | `btn-record-up`, `btn-record-down`, `fx-tile-empty`, `fx-tile-active` (with icons for robot, echo, etc.). |
| **Magic Pad** | `magic-wand-cursor`, `wave-selector-active`, `wave-selector-inactive`. |

## References

[1] M. W. Hadley, "Modular Game Worlds in Phaser 3 (Tilemaps #1) — Static Maps," Medium, Jul. 4, 2018. [Online]. Available: https://medium.com/@michaelwesthadley/modular-game-worlds-in-phaser-3-tilemaps-1-958fc7e6bbd6
[2] "How to Make Pixel Art for Games (Sprite-Ready)," Sorceress Blog, May 30, 2026. [Online]. Available: https://sorceress.games/blog/how-to-make-pixel-art-for-games-sprite-ready
[3] "Designing UI for Pixel Art Games," Reddit, Aug. 12, 2024. [Online]. Available: https://www.reddit.com/r/PixelArt/comments/1e0abcd/designing_ui_for_pixel_art_games/
