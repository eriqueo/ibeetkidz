#!/usr/bin/env python3
"""Pack the Three-Zone UI chrome (buttons / instruments / panels) into a
Phaser multiatlas so a scene loads ONE packed image instead of ~38 separate
PNGs — GitHub Pages round-trips per view switch were the load-time killer.

Output: public/assets/spritesheets/ui-atlas.json (+ ui-atlas-<n>.png pages).
Frame names = file stems (btn-play-idle, inst-drums-hover, …), identical to
the old standalone texture keys, so UI_SPRITES state maps don't change.
Re-run after adding/updating any sprite in src/assets/sprites/.
"""
from PIL import Image
import glob
import json
import os

SRC_DIRS = [
    "src/assets/sprites/buttons",
    "src/assets/sprites/instruments",
    "src/assets/sprites/panels",
]
OUT_DIR = "public/assets/spritesheets"
PAGE = 4096  # safe GPU texture ceiling (older iPads)
PAD = 2


def main() -> None:
    sprites = []
    for d in SRC_DIRS:
        for f in sorted(glob.glob(f"{d}/*.png")):
            im = Image.open(f).convert("RGBA")
            sprites.append((os.path.splitext(os.path.basename(f))[0], im))
    # shelf-pack, tallest first
    sprites.sort(key=lambda s: -s[1].height)

    pages, shelves = [], []  # shelves: per-page list of [x, y, shelf_h]

    def place(w, h):
        for pi, sh in enumerate(shelves):
            for shelf in sh:
                if shelf[0] + w <= PAGE and shelf[2] >= h:
                    x, y = shelf[0], shelf[1]
                    shelf[0] += w + PAD
                    return pi, x, y
            y_next = sh[-1][1] + sh[-1][2] + PAD
            if y_next + h <= PAGE:
                sh.append([w + PAD, y_next, h])
                return pi, 0, y_next
        pages.append(Image.new("RGBA", (PAGE, PAGE), (0, 0, 0, 0)))
        shelves.append([[w + PAD, 0, h]])
        return len(pages) - 1, 0, 0

    frames_per_page: list[list[dict]] = []
    for name, im in sprites:
        pi, x, y = place(im.width, im.height)
        while len(frames_per_page) <= pi:
            frames_per_page.append([])
        pages[pi].paste(im, (x, y))
        frames_per_page[pi].append({
            "filename": name,
            "frame": {"x": x, "y": y, "w": im.width, "h": im.height},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height},
            "sourceSize": {"w": im.width, "h": im.height},
        })

    os.makedirs(OUT_DIR, exist_ok=True)
    for old in glob.glob(f"{OUT_DIR}/ui-atlas-*.png"):
        os.remove(old)
    textures = []
    total = 0
    for pi, page in enumerate(pages):
        # crop the page to used height, quantize to palette PNG
        used_h = max(s[1] + s[2] for s in shelves[pi])
        img = page.crop((0, 0, PAGE, used_h)).quantize(colors=256, method=Image.FASTOCTREE)
        fname = f"ui-atlas-{pi}.png"
        img.save(f"{OUT_DIR}/{fname}", optimize=True)
        total += os.path.getsize(f"{OUT_DIR}/{fname}")
        textures.append({
            "image": fname,
            "format": "RGBA8888",
            "size": {"w": PAGE, "h": used_h},
            "scale": 1,
            "frames": frames_per_page[pi],
        })
    json.dump({"textures": textures, "meta": {"app": "build_ui_atlas.py", "version": "1.0"}},
              open(f"{OUT_DIR}/ui-atlas.json", "w"))
    print(f"packed {len(sprites)} sprites into {len(pages)} page(s), {total / 1e6:.1f}MB total")


if __name__ == "__main__":
    main()
