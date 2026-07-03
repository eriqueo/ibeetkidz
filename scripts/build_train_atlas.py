#!/usr/bin/env python3
"""Assemble public/assets/spritesheets/train.png from the per-direction ref
frames in src/assets/spritesheets/ (AR-012).

Atlas format (must match train.json + sprite-assets.ts):
  5 rows  = loco, boxcar, tanker, hopper, flatcar
  8 cols  = E, NE, N, NW, W, SW, S, SE
  frame   = 128x128, atlas = 1024x640

Each ref canvas carries a semi-opaque grey backdrop wash — pixels are keyed
out below ALPHA_KEY, then the frame is cropped to its opaque content box (the
same content-box idea ui-sprites.ts uses) and placed centred in its cell.
One scale per car type (118px / the type's largest content dim) so a car's
proportions stay consistent across its 8 directions.

Flatcar ships only E + NE refs so far: the other six directions are derived
by mirror/rotate as PLACEHOLDERS (logged as AR-012 in ART_REQUESTS.md).
"""
from PIL import Image
import numpy as np
import os

SRC = "src/assets/spritesheets"
OUT = "public/assets/spritesheets/train.png"
DIRS = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
TYPES = ["loco", "boxcar", "tanker", "hopper", "flatcar"]
CELL = 128
MARGIN = 5  # content fits in CELL - 2*MARGIN
ALPHA_KEY = 150


def keyed_content(path: str) -> Image.Image:
    """Load a ref frame, key out the backdrop wash, crop to the content box."""
    im = Image.open(path).convert("RGBA")
    a = np.array(im.getchannel("A"))
    mask = a > ALPHA_KEY
    ys, xs = np.where(mask)
    arr = np.array(im)
    arr[..., 3] = np.where(mask, arr[..., 3], 0)
    return Image.fromarray(arr).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def flatcar_frames() -> dict[str, Image.Image]:
    """E + NE are real art; the rest are mirror/rotate placeholders (AR-012)."""
    e = keyed_content(f"{SRC}/flatcar-ref-E.png")
    ne = keyed_content(f"{SRC}/flatcar-ref-NE.png")
    return {
        "E": e,
        "NE": ne,
        "W": e.transpose(Image.FLIP_LEFT_RIGHT),
        "NW": ne.transpose(Image.FLIP_LEFT_RIGHT),
        "SE": ne.transpose(Image.FLIP_TOP_BOTTOM),
        "SW": ne.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM),
        "N": e.transpose(Image.ROTATE_90),   # CCW: east-facing -> north-facing
        "S": e.transpose(Image.ROTATE_270),  # CW:  east-facing -> south-facing
    }


def main() -> None:
    atlas = Image.new("RGBA", (CELL * len(DIRS), CELL * len(TYPES)), (0, 0, 0, 0))
    for row, t in enumerate(TYPES):
        if t == "flatcar":
            frames = flatcar_frames()
        else:
            frames = {d: keyed_content(f"{SRC}/{t}-ref-{d}.png") for d in DIRS}
        # One scale per car type so proportions hold across directions.
        scale = (CELL - 2 * MARGIN) / max(max(f.size) for f in frames.values())
        for col, d in enumerate(DIRS):
            f = frames[d]
            f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
            x = col * CELL + (CELL - f.width) // 2
            y = row * CELL + (CELL - f.height) // 2
            atlas.paste(f, (x, y), f)
    atlas.save(OUT, optimize=True)
    print(f"wrote {OUT} ({atlas.size[0]}x{atlas.size[1]}, {os.path.getsize(OUT) / 1e3:.0f}KB)")


if __name__ == "__main__":
    main()
