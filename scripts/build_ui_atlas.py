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

# ── the background wash, keyed out here ─────────────────────────────────────
# ART_REQUESTS.md has carried the "TRUE alpha 0 outside the art" rule since
# AR-009 and it has now been broken six times. The sixth is the whole delivered
# chrome set: 40 of 71 files carry a near-uniform dark layer over the ENTIRE
# canvas at alpha 15..163 — a soft halo the generator baked in, not art.
#
# It was invisible for months because every view that used those buttons put
# them on a dark stone plate. The Track's side-scroller puts them on SKY, where
# each keycap draws a grey rectangle around itself and the whole top bar reads
# as floating debug chrome. That is the bug Eric has reported twice.
#
# So the packer keys it out, which is what the contract in ART_REQUESTS says
# engineering does when a wash slips through. Two passes:
#
#   1. FLOOD from the canvas border over pixels below WASH_MAX. Only the
#      background REGION is cleared — a genuinely translucent pixel enclosed by
#      art (a lamp glass, an LCD) is never reachable and survives. A global
#      threshold would eat those; this cannot.
#   2. A dust sweep for wash trapped inside a closed shape (the counter of an
#      arrow, the hole in a loop icon), which the flood cannot reach. Only
#      alpha < DUST_MAX, i.e. far below anything drawn on purpose.
#
# The measured gap makes the thresholds safe rather than tuned: across these
# files the art sits at alpha >= 240 and the wash at <= 175, with under 0.5% of
# pixels anywhere between.
WASH_MAX = 200
DUST_MAX = 40


def dewash(im: Image.Image) -> tuple[Image.Image, int]:
    """Return `im` with its background wash keyed to true alpha 0, and how many
    pixels were cleared (0 = the file already honoured the rule)."""
    w, h = im.size
    alpha = bytearray(im.getchannel("A").tobytes())
    seen = bytearray(w * h)
    stack: list[int] = []

    def push(i: int) -> None:
        if not seen[i] and alpha[i] < WASH_MAX:
            seen[i] = 1
            stack.append(i)

    for x in range(w):
        push(x)
        push((h - 1) * w + x)
    for y in range(h):
        push(y * w)
        push(y * w + w - 1)

    cleared = 0
    while stack:
        i = stack.pop()
        if alpha[i]:
            cleared += 1
            alpha[i] = 0
        x, y = i % w, i // w
        if x > 0:
            push(i - 1)
        if x < w - 1:
            push(i + 1)
        if y > 0:
            push(i - w)
        if y < h - 1:
            push(i + w)

    for i in range(w * h):
        if 0 < alpha[i] < DUST_MAX:
            alpha[i] = 0
            cleared += 1

    if cleared == 0:
        return im, 0
    out = im.copy()
    out.putalpha(Image.frombytes("L", (w, h), bytes(alpha)))
    # Flatten the RGB of cleared pixels to black. Invisible either way, but it
    # collapses hundreds of "transparent but differently coloured" entries the
    # 256-colour quantize below would otherwise spend palette slots on.
    out.paste((0, 0, 0, 0), (0, 0, w, h), out.getchannel("A").point(lambda v: 0 if v else 255))
    return out, cleared


def main() -> None:
    sprites = []
    washed = []
    for d in SRC_DIRS:
        for f in sorted(glob.glob(f"{d}/*.png")):
            im = Image.open(f).convert("RGBA")
            name = os.path.splitext(os.path.basename(f))[0]
            im, cleared = dewash(im)
            if cleared:
                washed.append((name, cleared / (im.width * im.height)))
            sprites.append((name, im))
    if washed:
        print(f"keyed a background wash out of {len(washed)} sprite(s):")
        for name, frac in sorted(washed, key=lambda t: -t[1]):
            print(f"  {name:34s} {frac:6.1%} of canvas")
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
