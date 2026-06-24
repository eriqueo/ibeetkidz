#!/usr/bin/env python3
"""
pack-sprites.py
Processes raw AI-generated sprites:
1. Removes the green (#00FF00) chroma-key background
2. Crops to content bounding box with padding
3. Resizes to a consistent 128x128 game-pixel size
4. Packs into spritesheets with Phaser-compatible JSON atlases

Output:
  src/assets/spritesheets/train.png + train.json   (loco + all car types, 8 dirs each)
  src/assets/spritesheets/smoke.png + smoke.json   (4 smoke frames)
  src/assets/spritesheets/signal.png + signal.json (signal-up, signal-down)
  src/assets/spritesheets/tarp.png + tarp.json     (single tarp frame)
"""

import json
import math
import os
from pathlib import Path

from PIL import Image
import numpy as np

SPRITES_DIR = Path(__file__).parent.parent / "src/assets/sprites-v2"
OUT_DIR = Path(__file__).parent.parent / "src/assets/spritesheets"
OUT_DIR.mkdir(parents=True, exist_ok=True)

FRAME_SIZE = 128   # each frame in the final spritesheet
CHROMA_KEY = (0, 255, 0)  # #00FF00
CHROMA_TOLERANCE = 60     # how close to pure green counts as background


def remove_chroma_key(img: Image.Image) -> Image.Image:
    """Replace green background pixels with transparency."""
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.int32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    # pixels that are close to #00FF00 AND not already transparent
    mask = (
        (np.abs(g - 255) < CHROMA_TOLERANCE) &
        (np.abs(r - 0)   < CHROMA_TOLERANCE) &
        (np.abs(b - 0)   < CHROMA_TOLERANCE) &
        (a > 0)
    )
    data[mask, 3] = 0
    return Image.fromarray(data.astype(np.uint8), "RGBA")


def remove_grey_background(img: Image.Image) -> Image.Image:
    """Remove the grey (#808080-ish) background that some sprites have instead of green."""
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.int32)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    # grey: r≈g≈b and all in range 150-220
    grey_mask = (
        (np.abs(r.astype(int) - g.astype(int)) < 25) &
        (np.abs(g.astype(int) - b.astype(int)) < 25) &
        (r > 140) & (r < 230) &
        (a > 0)
    )
    data[grey_mask, 3] = 0
    return Image.fromarray(data.astype(np.uint8), "RGBA")


def crop_to_content(img: Image.Image, padding: int = 4) -> Image.Image:
    """Crop to the bounding box of non-transparent pixels, with padding."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    l, t, r, b = bbox
    l = max(0, l - padding)
    t = max(0, t - padding)
    r = min(img.width, r + padding)
    b = min(img.height, b + padding)
    return img.crop((l, t, r, b))


def process_sprite(path: Path) -> Image.Image:
    """Load, remove background, crop, resize to FRAME_SIZE×FRAME_SIZE."""
    img = Image.open(path).convert("RGBA")
    # Try chroma key first, then grey
    img = remove_chroma_key(img)
    img = remove_grey_background(img)
    img = crop_to_content(img, padding=6)
    # Resize to square frame, maintaining aspect ratio with letterbox
    img.thumbnail((FRAME_SIZE, FRAME_SIZE), Image.LANCZOS)
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    offset_x = (FRAME_SIZE - img.width) // 2
    offset_y = (FRAME_SIZE - img.height) // 2
    frame.paste(img, (offset_x, offset_y), img)
    return frame


def pack_spritesheet(frames: dict[str, Image.Image], out_name: str):
    """Pack frames into a spritesheet PNG + Phaser JSON atlas."""
    names = list(frames.keys())
    n = len(names)
    cols = min(8, n)
    rows = math.ceil(n / cols)
    sheet_w = cols * FRAME_SIZE
    sheet_h = rows * FRAME_SIZE
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    atlas = {"frames": {}, "meta": {"image": f"{out_name}.png", "size": {"w": sheet_w, "h": sheet_h}, "scale": "1"}}

    for i, name in enumerate(names):
        col = i % cols
        row = i // cols
        x = col * FRAME_SIZE
        y = row * FRAME_SIZE
        sheet.paste(frames[name], (x, y))
        atlas["frames"][name] = {
            "frame": {"x": x, "y": y, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "sourceSize": {"w": FRAME_SIZE, "h": FRAME_SIZE}
        }

    sheet.save(OUT_DIR / f"{out_name}.png")
    with open(OUT_DIR / f"{out_name}.json", "w") as f:
        json.dump(atlas, f, indent=2)
    print(f"  ✓ {out_name}.png  ({sheet_w}×{sheet_h}, {n} frames)")


# ─── TRAIN SPRITESHEET ────────────────────────────────────────────────────────
# loco + 4 car types × 8 directions = 40 frames
DIRECTIONS = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
TRAIN_TYPES = ["loco", "boxcar", "tanker", "hopper", "flatcar"]

print("Packing train spritesheet...")
train_frames = {}
for t in TRAIN_TYPES:
    for d in DIRECTIONS:
        key = f"{t}-{d}"
        path = SPRITES_DIR / f"{key}.png"
        if path.exists():
            train_frames[key] = process_sprite(path)
            print(f"  processed {key}")
        else:
            print(f"  MISSING: {key}")

pack_spritesheet(train_frames, "train")

# ─── SMOKE SPRITESHEET ────────────────────────────────────────────────────────
print("\nPacking smoke spritesheet...")
smoke_frames = {}
for i in range(1, 5):
    key = f"smoke-{i}"
    path = SPRITES_DIR / f"{key}.png"
    if path.exists():
        smoke_frames[key] = process_sprite(path)
        print(f"  processed {key}")
    else:
        print(f"  MISSING: {key}")

pack_spritesheet(smoke_frames, "smoke")

# ─── SIGNAL SPRITESHEET ───────────────────────────────────────────────────────
print("\nPacking signal spritesheet...")
signal_frames = {}
for key in ["signal-up", "signal-down"]:
    path = SPRITES_DIR / f"{key}.png"
    if path.exists():
        signal_frames[key] = process_sprite(path)
        print(f"  processed {key}")
    else:
        print(f"  MISSING: {key}")

pack_spritesheet(signal_frames, "signal")

# ─── TARP SPRITESHEET ─────────────────────────────────────────────────────────
print("\nPacking tarp spritesheet...")
tarp_path = SPRITES_DIR / "tarp.png"
if tarp_path.exists():
    pack_spritesheet({"tarp": process_sprite(tarp_path)}, "tarp")
else:
    print("  MISSING: tarp.png")

print("\nDone. Spritesheets written to:", OUT_DIR)
