"""AR-060F production redraw: low open deck plus an independent near-edge lip.

The workshop renderer puts riders between car-open-flatcar and its -front layer.
The base therefore carries the substantial deck/undercarriage; the front contains
only the material that can physically cover rider feet at y=865.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/review/ar060-flatcar-source.png"
BASE_OUT = ROOT / "src/assets/sprites/cars/car-open-flatcar.png"
FRONT_OUT = ROOT / "src/assets/sprites/cars/car-open-flatcar-front.png"
CANVAS = (2560, 1440)

INK = (29, 23, 31, 255)
INK2 = (46, 38, 44, 255)
OAK_DARK = (73, 38, 25, 255)
OAK = (142, 77, 38, 255)
OAK_LIGHT = (194, 121, 62, 255)
BRASS_DARK = (108, 69, 26, 255)
BRASS = (193, 132, 48, 255)
BRASS_LIGHT = (244, 196, 99, 255)
STEEL = (59, 61, 68, 255)
STEEL_LIGHT = (151, 157, 167, 255)


def connected_checker_to_alpha(image: Image.Image) -> Image.Image:
    """Erase only the edge-connected neutral checkerboard generated as preview.

    Eight-neighbour flood is deliberate: preview checks touch diagonally, while
    the finished deck's bright metal highlights are enclosed by dark outlines.
    """
    arr = np.asarray(image.convert("RGBA")).copy()
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=2)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    backing = (lum >= 205) & (spread <= 22)
    seen = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if backing[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if backing[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and backing[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((nx, ny))
    arr[seen, 3] = 0
    arr[:, :, 3] = np.where(arr[:, :, 3] > 0, 255, 0).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def remade_base() -> Image.Image:
    source = connected_checker_to_alpha(Image.open(SOURCE))
    # Preserve the source's high-information pixel work, only make a small
    # nearest-neighbour registration adjustment so the outer content lands
    # inside [48,68]…[2507,1438] and the deck top lands at crew footline 865.
    source = source.resize((2509, 1411), Image.Resampling.NEAREST)
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    out.alpha_composite(source, (25, 228))
    # The delivery must be open air above the deck. Preview-generation left
    # faint, disconnected neutral bands there; retain only the two short end
    # stake zones and clear the entire central crew bay above the deck lip.
    arr = np.asarray(out).copy()
    arr[:852, 260:2300, 3] = 0
    out = Image.fromarray(arr, "RGBA")
    return out


def line(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: tuple[int,int,int,int], width: int) -> None:
    draw.line(points, fill=fill, width=width, joint="curve")


def remade_front() -> Image.Image:
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    # This is intentionally ONLY the near side of the deck. Its upper edge
    # crosses y=865, the existing rider footline, and never makes a wall.
    lip = [(95, 858), (2465, 858), (2490, 874), (2480, 924), (90, 924), (70, 883)]
    d.polygon(lip, fill=INK)
    d.polygon([(106, 864), (2454, 864), (2474, 879), (2467, 910), (99, 910), (87, 883)], fill=OAK_DARK)
    d.rectangle((108, 869, 2450, 884), fill=OAK)
    d.rectangle((108, 869, 2450, 872), fill=OAK_LIGHT)
    d.rectangle((100, 887, 2460, 908), fill=STEEL)
    d.rectangle((104, 890, 2456, 894), fill=STEEL_LIGHT)
    line(d, [(100, 910), (2460, 910)], INK2, 6)
    # Individual plank seams and fasteners make the front face join the base
    # without creating a visual wall through the crew bay.
    for x in range(180, 2430, 158):
        line(d, [(x, 865), (x - 6, 883)], OAK_DARK, 4)
        d.ellipse((x - 5, 895, x + 5, 905), fill=BRASS_DARK)
        d.ellipse((x - 2, 896, x + 3, 901), fill=BRASS_LIGHT)
    # Only outer low stakes stand in front; centre riders remain exposed.
    for x in (134, 2426):
        d.rectangle((x - 13, 749, x + 13, 914), fill=INK)
        d.rectangle((x - 8, 755, x + 7, 907), fill=OAK_DARK)
        d.rectangle((x - 5, 760, x - 1, 904), fill=OAK_LIGHT)
        d.rectangle((x - 15, 858, x + 15, 873), fill=BRASS_DARK)
        d.rectangle((x - 12, 860, x + 12, 868), fill=BRASS)
        d.ellipse((x - 3, 862, x + 4, 869), fill=BRASS_LIGHT)
    return out


def validate(image: Image.Image, name: str) -> None:
    arr = np.asarray(image)
    alpha = arr[:, :, 3]
    assert image.size == CANVAS, (name, image.size)
    assert alpha[0, 0] == alpha[0, -1] == alpha[-1, 0] == alpha[-1, -1] == 0, name
    assert set(np.unique(alpha)).issubset({0, 255}), name


if __name__ == "__main__":
    base, front = remade_base(), remade_front()
    validate(base, "base"); validate(front, "front")
    base.save(BASE_OUT); front.save(FRONT_OUT)
    print("AR-060F wrote", BASE_OUT, FRONT_OUT)
