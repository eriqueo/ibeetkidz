"""AR-068: exact-radius Track wheel.

Native 76×76 source art. The tyre perimeter is geometrically registered to
hub (38,38): visible cardinal contacts are exactly x/y=1 and 75, so each
cardinal radius is 37 source pixels and the bottom tangent is source row 75.
"""
from __future__ import annotations

from math import cos, pi, sin
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/sprites/track3/wheel.png"
SIZE, CX, CY, R = 76, 38, 38, 37

CLEAR = (0, 0, 0, 0)
PLUM = (31, 24, 42, 255)
INK = (19, 18, 27, 255)
TYRE = (50, 50, 61, 255)
STEEL_DARK = (75, 76, 92, 255)
STEEL = (126, 129, 145, 255)
STEEL_LIGHT = (202, 207, 210, 255)
BRASS_DARK = (102, 59, 23, 255)
BRASS = (179, 112, 41, 255)
BRASS_LIGHT = (245, 196, 86, 255)
RED_DARK = (126, 54, 49, 255)
RED = (185, 74, 57, 255)


def disk(draw: ImageDraw.ImageDraw, r: int, color: tuple[int, int, int, int]) -> None:
    draw.ellipse((CX-r, CY-r, CX+r, CY+r), fill=color)


def main() -> None:
    image = Image.new("RGBA", (SIZE, SIZE), CLEAR)
    draw = ImageDraw.Draw(image)

    # Exact 37px registered tyre. Draw from broad outer shape to inner material
    # rings; each band is fully opaque and all corners remain true alpha 0.
    disk(draw, R, PLUM)
    disk(draw, 35, INK)
    disk(draw, 33, TYRE)
    disk(draw, 31, STEEL_DARK)
    disk(draw, 29, PLUM)
    disk(draw, 27, INK)

    # Six balanced, inside-the-rim spokes with decisive outlines. Endpoints lie
    # at r=26 and thus can never move the tyre's common outer radius.
    for i in range(6):
        a = -pi / 2 + i * pi / 3
        x, y = round(CX + 26*cos(a)), round(CY + 26*sin(a))
        draw.line((CX, CY, x, y), fill=PLUM, width=7)
        draw.line((CX, CY, x, y), fill=STEEL_DARK, width=5)
        draw.line((CX, CY, x, y), fill=STEEL, width=3)
        # one hard highlight per spoke, offset inward for a machined bevel
        hx, hy = round(CX + 17*cos(a)), round(CY + 17*sin(a))
        draw.rectangle((hx-1, hy-1, hx+1, hy+1), fill=STEEL_LIGHT)

    # Red counterweights sit strictly inside the tyre and keep the locomotive's
    # handmade toy-machine personality without affecting radial registration.
    for a in (-pi / 2 + pi / 3, -pi / 2 + 4*pi / 3):
        x, y = round(CX + 21*cos(a)), round(CY + 21*sin(a))
        draw.rectangle((x-2, y-3, x+2, y+3), fill=PLUM)
        draw.rectangle((x-1, y-2, x+1, y+2), fill=RED_DARK)
        draw.point((x-1, y-2), fill=RED)

    # Concentric brass hub fixed exactly at the renderer's expected pixel.
    disk(draw, 11, PLUM)
    disk(draw, 9, BRASS_DARK)
    disk(draw, 7, BRASS)
    disk(draw, 4, BRASS_LIGHT)
    draw.rectangle((CX-1, CY-1, CX+1, CY+1), fill=BRASS_DARK)
    draw.point((CX-1, CY-1), fill=BRASS_LIGHT)

    # Small rim bolts: all remain within r=34.
    for i in range(8):
        a = -pi / 2 + i * pi / 4
        x, y = round(CX + 33*cos(a)), round(CY + 33*sin(a))
        draw.rectangle((x-1, y-1, x+1, y+1), fill=INK)
        draw.point((x, y), fill=STEEL_LIGHT)

    # Reassert the exact cardinal tyre contacts after decorative passes.
    for x, y in ((1, CY), (75, CY), (CX, 1), (CX, 75)):
        image.putpixel((x, y), PLUM)
    for x, y in ((0, 0), (75, 0), (0, 75), (75, 75)):
        image.putpixel((x, y), CLEAR)

    image.save(OUT)
    print(f"wrote {OUT}; hub=({CX},{CY}), cardinal_radius={R}, contact_row=75")


if __name__ == "__main__":
    main()
