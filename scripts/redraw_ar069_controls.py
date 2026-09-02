"""AR-069 unified Track-control redraw.

Restores MAP/RIDE/CLEAR/LOOP/TARP directly from the accepted aaad950 candidate,
then creates STOP, SEND, SLOW, SPEED, and FAST within the same measured content
boxes.  Every active face keeps its existing filename and runtime canvas:
512×512 for square controls and 1024×683 for MAP/SEND landscape plaques.
"""
from __future__ import annotations

import io
import subprocess
from pathlib import Path
from typing import Mapping
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BUTTONS = ROOT / "src/assets/sprites/buttons"
APPROVED = "aaad950"

# The exact accepted faces.  Copy them, never approximate them.
APPROVED_FILES = (
    "btn-nav-map-idle.png", "btn-nav-map-pressed.png",
    "btn-track-ride-idle.png", "btn-track-ride-pressed.png",
    "btn-track-clear-idle.png", "btn-track-clear-pressed.png",
    "btn-transport-loop-idle.png", "btn-transport-loop-pressed.png",
    "btn-track-tarp-idle.png", "btn-track-tarp-seated.png",
)

# Fixed material ramp sampled from the approved aaad950 machine faces.
CLEAR = (0, 0, 0, 0)
PLUM = (43, 35, 60, 255)
PLUM_DARK = (29, 23, 42, 255)
PLUM_LIGHT = (101, 88, 130, 255)
INK = (22, 18, 29, 255)
STEEL = (90, 94, 109, 255)
STEEL_LIGHT = (181, 184, 194, 255)
BRASS_DARK = (102, 64, 26, 255)
BRASS = (181, 125, 49, 255)
BRASS_LIGHT = (244, 205, 111, 255)
CREAM = (246, 230, 181, 255)
CREAM_SHADOW = (186, 151, 93, 255)
CYAN = (64, 182, 211, 255)
CYAN_LIGHT = (148, 230, 239, 255)
RED = (207, 67, 59, 255)
RED_LIGHT = (248, 127, 96, 255)
OAK = (106, 58, 28, 255)
OAK_LIGHT = (169, 99, 47, 255)

FONT: Mapping[str, tuple[str, ...]] = {
    "A": ("01110","10001","10001","11111","10001","10001","10001"),
    "D": ("11110","10001","10001","10001","10001","10001","11110"),
    "E": ("11111","10000","11110","10000","10000","10000","11111"),
    "F": ("11111","10000","11110","10000","10000","10000","10000"),
    "L": ("10000","10000","10000","10000","10000","10000","11111"),
    "N": ("10001","11001","11001","10101","10011","10011","10001"),
    "O": ("01110","10001","10001","10001","10001","10001","01110"),
    "P": ("11110","10001","10001","11110","10000","10000","10000"),
    "S": ("01111","10000","10000","01110","00001","00001","11110"),
    "T": ("11111","00100","00100","00100","00100","00100","00100"),
    "W": ("10001","10001","10001","10101","10101","10101","01010"),
}


def approved(name: str) -> Image.Image:
    data = subprocess.check_output(["git", "show", f"{APPROVED}:src/assets/sprites/buttons/{name}"], cwd=ROOT)
    return Image.open(io.BytesIO(data)).convert("RGBA")


def export_approved() -> None:
    for name in APPROVED_FILES:
        (BUTTONS / name).write_bytes(subprocess.check_output(
            ["git", "show", f"{APPROVED}:src/assets/sprites/buttons/{name}"], cwd=ROOT
        ))


def fill_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: tuple[int, int, int, int]) -> None:
    d.rectangle(box, fill=color)


def pixel_text(d: ImageDraw.ImageDraw, text: str, x: int, y: int, scale: int, color: tuple[int, int, int, int]) -> None:
    for char in text:
        glyph = FONT[char]
        for gy, row in enumerate(glyph):
            for gx, bit in enumerate(row):
                if bit == "1":
                    fill_rect(d, (x + gx*scale, y + gy*scale, x + (gx+1)*scale-1, y + (gy+1)*scale-1), color)
        x += 6*scale


def plaque_base(template: str, pressed: bool) -> Image.Image:
    im = approved(template).copy()
    d = ImageDraw.Draw(im)
    # Same accepted chassis persists.  Only the recessed pictorial well and its
    # label are cleared to make a new control job.
    yoff = 8 if pressed else 0
    fill_rect(d, (103, 90 + yoff, 409, 351 + yoff), PLUM_DARK)
    # Keep an inner mechanical border visible after clearing the accepted art.
    d.rectangle((97, 84 + yoff, 415, 358 + yoff), outline=INK, width=5)
    d.rectangle((103, 90 + yoff, 409, 352 + yoff), outline=PLUM_LIGHT, width=2)
    d.rectangle((108, 95 + yoff, 404, 347 + yoff), outline=PLUM, width=3)
    # Dedicated lower cream/brass label plate, same alpha silhouette / bounds.
    fill_rect(d, (132, 394, 380, 461), INK)
    d.rectangle((132, 394, 380, 461), outline=BRASS_DARK, width=5)
    d.rectangle((138, 400, 374, 455), outline=BRASS_LIGHT, width=2)
    fill_rect(d, (145, 406, 367, 449), PLUM_DARK)
    return im


def bolts(d: ImageDraw.ImageDraw, points: tuple[tuple[int,int], ...]) -> None:
    for x, y in points:
        d.rectangle((x-3, y-3, x+3, y+3), fill=INK)
        d.rectangle((x-2, y-2, x+2, y+2), fill=BRASS_DARK)
        d.point((x-1, y-1), fill=BRASS_LIGHT)


def draw_stop(im: Image.Image, pressed: bool) -> None:
    d = ImageDraw.Draw(im); y = 8 if pressed else 0
    # Signal stop plate: only STOP uses red.
    d.rectangle((166, 145+y, 346, 325+y), fill=INK)
    d.rectangle((174, 153+y, 338, 317+y), fill=STEEL)
    d.rectangle((184, 163+y, 328, 307+y), fill=RED)
    d.rectangle((197, 176+y, 315, 294+y), fill=RED_LIGHT)
    d.rectangle((207, 186+y, 305, 284+y), fill=RED)
    bolts(d, ((184,163+y),(328,163+y),(184,307+y),(328,307+y)))
    pixel_text(d, "STOP", 166, 416, 7, CREAM)


def arrow(d: ImageDraw.ImageDraw, x: int, y: int, direction: int, double: bool) -> None:
    # Thick cyan transport arrow, grouped as one clear silhouette.
    for n in range(2 if double else 1):
        ox = n * (-54 if direction > 0 else 54)
        pts = [(x+ox-70*direction, y-25), (x+ox+8*direction, y-25), (x+ox+8*direction, y-58),
               (x+ox+82*direction, y), (x+ox+8*direction, y+58), (x+ox+8*direction, y+25),
               (x+ox-70*direction, y+25)]
        d.polygon(pts, fill=INK)
        pts2 = [(px + (5 if direction > 0 else -5), py) for px,py in pts]
        d.polygon(pts2, fill=CYAN)
        x0, x1 = x + ox - 52*direction, x + ox + 12*direction
        d.rectangle((min(x0, x1), y-17, max(x0, x1), y+17), fill=CYAN_LIGHT)


def draw_arrow_control(im: Image.Image, label: str, direction: int, pressed: bool) -> None:
    d = ImageDraw.Draw(im); y = 8 if pressed else 0
    arrow(d, 256, 220+y, direction, double=(label == "FAST"))
    # Small brass speed nicks make slow vs fast readable before the label.
    count = 1 if label == "SLOW" else 3
    for i in range(count):
        xx = 132 + i*22 if direction > 0 else 358 - i*22
        d.rectangle((xx, 176+y, xx+12, 181+y), fill=BRASS)
    pixel_text(d, label, 166 if label == "SLOW" else 174, 416, 7, CREAM)


def draw_speed(im: Image.Image) -> None:
    d = ImageDraw.Draw(im)
    # A real dark runtime screen, intentionally free of a baked number.
    d.rectangle((125, 142, 387, 307), fill=INK)
    d.rectangle((131, 148, 381, 301), fill=STEEL)
    d.rectangle((139, 156, 373, 293), fill=BRASS_DARK)
    d.rectangle((145, 162, 367, 287), fill=(29, 27, 42, 255))
    d.rectangle((151, 168, 361, 281), outline=PLUM_LIGHT, width=2)
    # Engine text owns this entire measured rectangle. It must be uniformly
    # opaque and dark; the bezel lives outside it so cream runtime readout text
    # never crosses a decorative steel or brass pixel.
    fill_rect(d, (122, 168, 389, 295), (29, 27, 42, 255))
    bolts(d, ((137,154),(375,154),(137,309),(375,309)))
    pixel_text(d, "SPEED", 150, 416, 7, CREAM)


def landscape_base(template: str, pressed: bool) -> Image.Image:
    im = approved(template).copy()
    d = ImageDraw.Draw(im); y = 8 if pressed else 0
    # Preserve aaad950's landscape chassis and alpha bounds, replacing only its
    # central map vignette with a send-to-yard scene and a clear label strip.
    fill_rect(d, (208, 116+y, 814, 492+y), PLUM_DARK)
    d.rectangle((198, 106+y, 824, 502+y), outline=INK, width=7)
    d.rectangle((208, 116+y, 814, 492+y), outline=PLUM_LIGHT, width=3)
    fill_rect(d, (340, 520, 684, 613), INK)
    d.rectangle((340, 520, 684, 613), outline=BRASS_DARK, width=6)
    d.rectangle((348, 528, 676, 605), outline=BRASS_LIGHT, width=2)
    fill_rect(d, (356, 536, 668, 597), PLUM_DARK)
    return im


def draw_send(im: Image.Image, pressed: bool) -> None:
    d = ImageDraw.Draw(im); y = 8 if pressed else 0
    # Side-on car slides through a large brass export arrow—readable without the
    # SEND label at the final contain-fitted header size.
    d.rectangle((286, 244+y, 515, 348+y), fill=INK)
    d.rectangle((298, 250+y, 504, 338+y), fill=OAK)
    d.rectangle((306, 260+y, 496, 328+y), fill=OAK_LIGHT)
    for xx in (325, 412, 479):
        d.rectangle((xx, 258+y, xx+8, 330+y), fill=INK)
    d.rectangle((360, 273+y, 439, 317+y), fill=INK)
    d.line((360, 273+y, 439, 317+y), fill=BRASS, width=4)
    d.line((439, 273+y, 360, 317+y), fill=BRASS, width=4)
    for xx in (334, 458):
        d.ellipse((xx, 334+y, xx+29, 363+y), fill=INK)
        d.ellipse((xx+6, 340+y, xx+23, 357+y), fill=STEEL)
    # a broad brass arrow to the Yard/right side
    d.polygon([(558,226+y),(690,226+y),(690,190+y),(784,276+y),(690,362+y),(690,326+y),(558,326+y)], fill=INK)
    d.polygon([(565,233+y),(682,233+y),(682,205+y),(770,276+y),(682,347+y),(682,319+y),(565,319+y)], fill=BRASS)
    d.rectangle((579, 247+y, 682, 259+y), fill=BRASS_LIGHT)
    bolts(d, ((304,251+y),(499,251+y),(304,337+y),(499,337+y)))
    pixel_text(d, "SEND", 394, 548, 9, CREAM)


def save(im: Image.Image, name: str) -> None:
    # explicit exact RGBA / hard-alpha export
    im.convert("RGBA").save(BUTTONS / name)


def main() -> None:
    export_approved()
    for state, pressed in (("idle", False), ("pressed", True)):
        im = plaque_base("btn-track-ride-idle.png", pressed)
        draw_stop(im, pressed); save(im, f"btn-transport-stop-{state}.png")
        im = plaque_base("btn-track-ride-idle.png", pressed)
        draw_arrow_control(im, "SLOW", -1, pressed); save(im, f"btn-transport-slow-{state}.png")
        im = plaque_base("btn-track-ride-idle.png", pressed)
        draw_arrow_control(im, "FAST", 1, pressed); save(im, f"btn-transport-fast-{state}.png")
        im = landscape_base("btn-nav-map-idle.png", pressed)
        draw_send(im, pressed); save(im, f"btn-send-song-{state}.png")
    speed = plaque_base("btn-track-ride-idle.png", False)
    draw_speed(speed); save(speed, "track-speed-readout.png")
    print("wrote all 19 AR-069 controls: 10 exact aaad950 restorations + 9 matching unresolved faces")


if __name__ == "__main__":
    main()
