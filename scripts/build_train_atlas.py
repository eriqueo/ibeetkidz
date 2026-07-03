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

A missing ref falls back to a horizontal mirror of its partner direction
(E<->W, NE<->NW, SE<->SW) — a legitimate stand-in in this 3/4 perspective —
and reports what it derived. Anything still missing is an art gap (AR-012).
"""
from PIL import Image
import numpy as np
import os

SRC = "src/assets/spritesheets"
OUT = "public/assets/spritesheets/train.png"
DIRS = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
MIRROR_PARTNER = {"E": "W", "W": "E", "NE": "NW", "NW": "NE", "SE": "SW", "SW": "SE"}
TYPES = ["loco", "boxcar", "tanker", "hopper", "flatcar"]
CELL = 128
MARGIN = 5  # content fits in CELL - 2*MARGIN
ALPHA_KEY = 150


def keyed_content(path: str) -> Image.Image:
    """Load a ref frame, key out the backdrop, crop to the content box.

    Two backdrop styles exist in the ref sets: a semi-transparent grey wash
    (alpha ~60-90 — removed by the alpha threshold) and an OPAQUE white/light
    plate with a soft drop shadow (later refs). The opaque style is removed by
    flood-filling light, low-saturation pixels connected to the border.
    """
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    a = arr[..., 3].astype(int)
    rgb = arr[..., :3].astype(int)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    # candidate background: transparent-ish wash OR light near-grey (incl. shadow)
    bgish = (a <= ALPHA_KEY) | ((lum > 150) & (sat < 45))
    # flood from the border through bgish pixels (iterative dilation, no scipy)
    bg = np.zeros_like(bgish)
    bg[0, :] = bgish[0, :]
    bg[-1, :] = bgish[-1, :]
    bg[:, 0] = bgish[:, 0]
    bg[:, -1] = bgish[:, -1]
    while True:
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]
        grown[:-1, :] |= bg[1:, :]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= bgish
        if (grown == bg).all():
            break
        bg = grown
    keep = ~bg & (a > ALPHA_KEY)
    ys, xs = np.where(keep)
    arr[..., 3] = np.where(keep, arr[..., 3], 0)
    return Image.fromarray(arr).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def frames_for(t: str) -> dict[str, Image.Image]:
    frames: dict[str, Image.Image] = {}
    for d in DIRS:
        path = f"{SRC}/{t}-ref-{d}.png"
        if os.path.exists(path):
            frames[d] = keyed_content(path)
    for d in DIRS:
        if d in frames:
            continue
        partner = MIRROR_PARTNER.get(d)
        if partner and partner in frames:
            frames[d] = frames[partner].transpose(Image.FLIP_LEFT_RIGHT)
            print(f"  derived {t}-{d} as mirror of {partner} (AR-012: real ref still wanted)")
        else:
            raise SystemExit(f"no ref or mirror partner for {t}-{d} — art gap, see AR-012")
    return frames


def main() -> None:
    atlas = Image.new("RGBA", (CELL * len(DIRS), CELL * len(TYPES)), (0, 0, 0, 0))
    for row, t in enumerate(TYPES):
        frames = frames_for(t)
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
