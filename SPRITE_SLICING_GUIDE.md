# Sprite Slicing and Inpainting Guide

This document is a complete reference for converting flat PNG scenes into the "sliced sprites" architecture. It covers how to slice interactive elements out of a flat image using Python (PIL), and how to generate the clean base plates (inpainting) so you have total freedom to move elements around in Phaser.

## 1. The Strategy

To move from flat art to real interactive sprites, you need two things per scene:
1. **The Sprites:** Individual PNGs for every button, instrument, and interactive element.
2. **The Base Plate:** The background scenery with the interactive elements painted out (replaced with matching dirt, paneling, or sky).

When you load the base plate and place the sprites on top, it looks identical to the original flat art. But because the sprites are separate objects, you can anchor them to the viewport edges (solving cover-fit cropping), scale them on press (real press animations), and move them around without changing the background.

## 2. Slicing the Sprites (Python + PIL)

Do not slice sprites by hand in Photoshop. Use a Python script with the `Pillow` library. This makes the process repeatable, precise, and documented.

Here is the exact pattern used to slice the Workshop scene. You can copy this script, change the source image path, and update the coordinates for the Yard, Track, and Map scenes.

```python
"""
slice_sprites.py - Extract interactive elements from a flat scene PNG.
"""
from PIL import Image
import os

# 1. Setup paths
SRC = "src/assets/scenes-v2/workshop-scene-clean.png"
OUT = "src/assets/scenes-v2-sliced"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC)
W, H = img.size

def crop_center(name, cx, cy, nw, nh, pad=0):
    """
    Crop centered on normalized coordinates (cx, cy).
    nw, nh: normalized width and height of the crop box.
    pad: extra pixels to pad the bounding box.
    """
    x = int((cx - nw / 2) * W) - pad
    y = int((cy - nh / 2) * H) - pad
    w = int(nw * W) + pad * 2
    h = int(nh * H) + pad * 2
    
    # Clamp to image boundaries
    x, y = max(0, x), max(0, y)
    x2, y2 = min(W, x + w), min(H, y + h)
    
    region = img.crop((x, y, x2, y2))
    path = os.path.join(OUT, f"{name}.png")
    region.save(path)
    print(f"Saved {name}.png ({x2-x}x{y2-y})")

# 2. Define the regions to slice
# Example: Toolbar icons (measured from the art)
toolbar_names = ["icon-notepad", "icon-musicnote", "icon-speaker", "icon-waveform", 
                 "icon-grid", "icon-arrows", "icon-star", "icon-magnifier", "icon-exit"]
toolbar_xs = [0.295, 0.362, 0.429, 0.496, 0.563, 0.630, 0.697, 0.764, 0.858]

for name, cx in zip(toolbar_names, toolbar_xs):
    # cy=0.060, width=0.060, height=0.090, pad 4px
    crop_center(name, cx, 0.060, 0.060, 0.090, pad=4)

# Example: Instruments
instruments = [
    ("inst-drum",    0.262, 0.690, 0.14, 0.22),
    ("inst-mic",     0.448, 0.665, 0.10, 0.24),
    ("inst-guitar",  0.560, 0.690, 0.12, 0.22),
    ("inst-keys",    0.722, 0.695, 0.16, 0.18),
]
for name, cx, cy, nw, nh in instruments:
    crop_center(name, cx, cy, nw, nh, pad=6)
```

### How to get the coordinates
To get the `cx`, `cy`, `nw`, and `nh` values for a new scene:
1. Give Claude (or any multimodal LLM) the flat PNG.
2. Ask: *"Measure the exact pixel bounding boxes for the buttons in this image. Return the center X, center Y, width, and height as normalized values (0.0 to 1.0) relative to the full image dimensions."*
3. Plug those values into the `crop_center` calls in the script.

## 3. Creating the Base Plate (Inpainting)

To create the clean base plate, you need to erase the interactive elements from the flat PNG and fill the holes with matching background texture.

**Do not try to prompt an LLM to generate the base plate from scratch.** It will not match the existing art style perfectly, and the scene will look different.

Instead, use an **inpainting** tool. Inpainting takes an image and a mask (the areas to erase) and uses AI to fill the mask seamlessly.

### The Inpainting Workflow

1. **Create the mask:** Open the flat PNG in any image editor (Photoshop, GIMP, Photopea). Paint solid black over every button, instrument, and interactive element you sliced out. Make the rest of the image white. Export this as `mask.png`.
2. **Use an inpainting model:** You can use tools like Photoshop's Generative Fill, Stable Diffusion WebUI (Automatic1111) with an inpainting model, or online services like Midjourney/Runway inpainting.
3. **The prompt:** When the inpainting tool asks what to generate in the masked areas, use a prompt that describes the surrounding texture.

**Example Prompts for Inpainting:**
* **Workshop Instruments:** *"Empty dirt ground, scattered small rocks, sparse grass, continuation of the train tracks, 16-bit pixel art style."*
* **Workshop Toolbar:** *"Empty gray metal paneling, industrial rivets, flat steel texture, 16-bit pixel art style."*
* **Track Scene Tarp Buttons:** *"Solid blue plastic tarp texture, folds and creases, 16-bit pixel art style."*

### Why this works
Inpainting only alters the pixels inside the mask. The rest of your scene remains exactly as it was. When you load the inpainted base plate in Phaser and place the sprites over the inpainted areas, the scene looks identical to the original flat PNG. But when a user drags a sprite, they reveal seamless dirt/paneling underneath, not a chopped-off ghost of the instrument.

## 4. Wiring it in Phaser (The Prompt)

Once you have the sprites and the base plate, use the following prompt structure to instruct the agent to wire them up. This is a generalized version of the Phase 8 prompt.

```markdown
# Phase [X] — Sliced Sprites Migration for [Scene Name]

We are migrating [Scene Name] from flat art to sliced sprites. The background art has been inpainted to remove interactive elements, and individual sprites have been provided.

## Assets
- Base plate: `src/assets/scenes-v2-sliced/[scene]-base.png`
- Sprites: `src/assets/scenes-v2-sliced/[sprite-name].png`, etc.

## Tasks
1. Update `[Scene Name].ts` to load `[scene]-base.png` as the background.
2. Load all sprite PNGs in the `preload()` method.
3. Replace the invisible hit-areas (`setFillStyle(0xffffff, 0)`) with actual `this.add.sprite()` calls.
4. **Anchoring:** Position the sprites relative to the camera viewport (`this.cameras.main.width`, `this.cameras.main.height`), NOT the background rect. This ensures edge buttons are never cropped by cover-fit.
5. **Press Animation:** Apply the standard `pressPop()` scale animation to the sprite objects on pointer down.
6. **Cleanup:** Remove any normalized coordinate logic (`scene-layout.ts`) previously used for these buttons.
```

This workflow guarantees that your UI is fully modular, responsive to any aspect ratio, and completely independent of the background art layer.
