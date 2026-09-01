"""AR-060T: render only the near tanker shell that can occlude rider feet.

The body is deliberately a curved, riveted lower lip—not a full car redraw,
not a guide ellipse, and not a free-floating horizontal line.  It joins the
existing inner shell rims at both ends of the recorded crew bay.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/sprites/cars/car-open-tanker-front.png"
SIZE = (2560, 1440)

INK = (28, 22, 29, 255)
INK2 = (46, 35, 48, 255)
PURPLE_DARK = (73, 49, 68, 255)
PURPLE = (111, 76, 103, 255)
STEEL_DARK = (64, 66, 75, 255)
STEEL = (114, 119, 128, 255)
STEEL_LIGHT = (202, 204, 210, 255)
BRASS_DARK = (100, 62, 25, 255)
BRASS = (181, 119, 38, 255)
BRASS_LIGHT = (235, 184, 84, 255)


def curve_points(offset: int = 0) -> list[tuple[int, int]]:
    # Five-pixel stair rhythm is intentional: authored hard-pixel curvature.
    return [
        (500, 832 + offset), (530, 842 + offset), (570, 854 + offset),
        (640, 870 + offset), (740, 884 + offset), (900, 895 + offset),
        (1280, 901 + offset), (1660, 895 + offset), (1820, 884 + offset),
        (1920, 870 + offset), (1990, 854 + offset), (2030, 842 + offset),
        (2060, 832 + offset),
    ]


def main() -> None:
    out = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    top = curve_points(0)
    mid = curve_points(19)
    bottom = curve_points(74)
    # Stitched shell band: closed, thick, physically plausible and continuous.
    silhouette = top + list(reversed(bottom))
    d.polygon(silhouette, fill=INK)
    d.polygon(mid + list(reversed(curve_points(66))), fill=PURPLE_DARK)
    # Main brushed-steel near shell face. Its lower contour gives it thickness.
    d.polygon(curve_points(24) + list(reversed(curve_points(55))), fill=STEEL_DARK)
    d.polygon(curve_points(28) + list(reversed(curve_points(46))), fill=STEEL)
    d.line(curve_points(24), fill=STEEL_LIGHT, width=5, joint="curve")
    d.line(curve_points(51), fill=INK2, width=6, joint="curve")
    # Brass cap strip echoes the base's brass lower hardware, not a floating rule.
    d.line(curve_points(63), fill=BRASS_DARK, width=11, joint="curve")
    d.line(curve_points(61), fill=BRASS, width=5, joint="curve")
    # End plates curve into the base's two existing inner shell rims.
    for x, flip in ((530, -1), (2030, 1)):
        d.polygon([(x - 20, 833), (x + 24, 841), (x + 31, 909), (x - 13, 905)], fill=INK)
        d.polygon([(x - 13, 840), (x + 17, 846), (x + 22, 900), (x - 7, 896)], fill=PURPLE)
        d.line([(x + flip * 3, 843), (x + flip * 3, 897)], fill=STEEL_LIGHT, width=4)
        for yy in (858, 883):
            d.ellipse((x - 3, yy, x + 7, yy + 10), fill=BRASS_DARK)
            d.ellipse((x - 1, yy + 1, x + 5, yy + 7), fill=BRASS_LIGHT)
    # Bolts are a set of material fasteners on a shaped surface, no dangling line.
    for x, y in ((690, 894), (850, 907), (1030, 913), (1210, 917), (1390, 917), (1570, 913), (1750, 907), (1900, 894)):
        d.ellipse((x - 7, y - 7, x + 8, y + 8), fill=INK)
        d.ellipse((x - 4, y - 4, x + 5, y + 5), fill=BRASS_DARK)
        d.ellipse((x - 2, y - 3, x + 3, y + 2), fill=BRASS_LIGHT)
    # Hard alpha only; source corners remain transparent by construction.
    arr = np.asarray(out).copy()
    arr[:, :, 3] = np.where(arr[:, :, 3] > 0, 255, 0).astype(np.uint8)
    out = Image.fromarray(arr, "RGBA")
    alpha = out.getchannel("A")
    assert out.size == SIZE
    assert all(alpha.getpixel(p) == 0 for p in ((0,0),(2559,0),(0,1439),(2559,1439)))
    out.save(OUT)
    print("AR-060T wrote", OUT)

if __name__ == "__main__":
    main()
