"""Deterministic export and blocker validation for AR-064 through AR-069.

This gate intentionally checks rendering contracts, not subjective art quality.
The final mechanical-blocker section mirrors the exact reported acceptance criteria.
"""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / "src/assets/sprites/buttons"
T = ROOT / "src/assets/sprites/track3"
ATLAS = ROOT / "public/assets/spritesheets"

discrete = {
    B / "btn-track-tarp-idle.png": (512, 512), B / "btn-track-tarp-seated.png": (512, 512),
    B / "btn-nav-map-idle.png": (512, 512), B / "btn-nav-map-pressed.png": (512, 512),
    B / "btn-track-ride-idle.png": (512, 512), B / "btn-track-ride-pressed.png": (512, 512),
    B / "btn-track-clear-idle.png": (512, 512), B / "btn-track-clear-pressed.png": (512, 512),
    B / "btn-transport-loop-idle.png": (512, 512), B / "btn-transport-loop-pressed.png": (512, 512),
    B / "btn-transport-stop-idle.png": (512, 512), B / "btn-transport-stop-pressed.png": (512, 512),
    B / "btn-send-song-idle.png": (512, 512), B / "btn-send-song-pressed.png": (512, 512),
    B / "btn-transport-slow-idle.png": (512, 512), B / "btn-transport-slow-pressed.png": (512, 512),
    B / "btn-transport-fast-idle.png": (512, 512), B / "btn-transport-fast-pressed.png": (512, 512),
    B / "track-speed-readout.png": (512, 512),
    T / "tarp-cover-boxcar.png": (300, 190), T / "tarp-cover-tanker.png": (300, 170),
    T / "tarp-cover-hopper.png": (300, 190), T / "tarp-cover-flatcar.png": (300, 110),
    T / "tunnel-mouth-left.png": (640, 640), T / "tunnel-mouth-right.png": (640, 640),
    T / "tunnel-lamp-0.png": (96, 128), T / "tunnel-lamp-1.png": (96, 128),
    T / "bridge-pier.png": (160, 360), T / "bridge-far-bank-left.png": (320, 250),
    T / "bridge-far-bank-right.png": (320, 250), T / "wheel.png": (76, 76), T / "shadow.png": (300, 44),
}
tiles = {
    T / "tunnel-roof.png": (640, 520), T / "tunnel-wall.png": (640, 720),
    T / "tunnel-floor.png": (640, 406), T / "bridge-deck-tile.png": (640, 170),
    T / "bridge-water.png": (640, 150),
}
pairs = (
    (B / "btn-track-tarp-idle.png", B / "btn-track-tarp-seated.png"),
    (B / "btn-nav-map-idle.png", B / "btn-nav-map-pressed.png"),
    (B / "btn-track-ride-idle.png", B / "btn-track-ride-pressed.png"),
    (B / "btn-track-clear-idle.png", B / "btn-track-clear-pressed.png"),
    (B / "btn-transport-loop-idle.png", B / "btn-transport-loop-pressed.png"),
    (B / "btn-transport-stop-idle.png", B / "btn-transport-stop-pressed.png"),
    (B / "btn-send-song-idle.png", B / "btn-send-song-pressed.png"),
    (B / "btn-transport-slow-idle.png", B / "btn-transport-slow-pressed.png"),
    (B / "btn-transport-fast-idle.png", B / "btn-transport-fast-pressed.png"),
    (T / "tunnel-lamp-0.png", T / "tunnel-lamp-1.png"),
)


def im(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def check_discrete(path: Path, size: tuple[int, int]) -> None:
    image = im(path)
    assert image.size == size, (path, image.size, size)
    alpha = image.getchannel("A")
    w, h = image.size
    assert all(alpha.getpixel(point) == 0 for point in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))), path
    assert all(value in (0, 255) for value in alpha.getdata()), path
    print("PASS", path.relative_to(ROOT))


def check_tile(path: Path, size: tuple[int, int]) -> None:
    image = im(path)
    assert image.size == size, (path, image.size, size)
    assert [image.getpixel((0, y)) for y in range(image.height)] == [image.getpixel((image.width - 1, y)) for y in range(image.height)], path
    print("PASS", path.relative_to(ROOT))


def clear_arch_mask(image: Image.Image) -> list[tuple[int, int]]:
    """The train aperture inside the left portal's stone rim, in source pixels."""
    cx, spring_y, radius, vertical_half = 449, 431, 84, 76
    points: list[tuple[int, int]] = []
    for y in range(347, image.height):
        if y <= spring_y:
            inside = radius * radius - (y - spring_y) ** 2
            half = int(inside ** 0.5) if inside >= 0 else -1
        else:
            half = vertical_half
        for x in range(max(0, cx - half + 1), min(image.width, cx + half)):
            points.append((x, y))
    return points


def no_baked_lamp(image: Image.Image, box: tuple[int, int, int, int], name: str) -> None:
    """Former lamp bbox may contain dark masonry/wood but no warm lamp core."""
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            r, g, b, a = image.getpixel((x, y))
            assert not (a == 255 and r >= 175 and g >= 100 and b <= 95), f"{name}: baked warm lamp pixel at {(x, y)}"


def exact_blocker_checks() -> None:
    deck = im(T / "bridge-deck-tile.png")
    # The false white/checkerboard bay source is neutral and near-white. Below
    # the fascia, no such opaque bay pixel may remain.
    # Open bays begin below the timber fascia; y<76 contains legitimate steel
    # bolt highlights and must not be mistaken for preview checkerboard.
    for y in range(76, deck.height):
        for x in range(deck.width):
            r, g, b, a = deck.getpixel((x, y))
            assert not (a == 255 and min(r, g, b) >= 220 and max(r, g, b) - min(r, g, b) <= 20), f"bridge checkerboard pixel at {(x, y)}"
    print("PASS mechanical bridge deck bays are alpha-cleared")

    left = im(T / "tunnel-mouth-left.png")
    right = im(T / "tunnel-mouth-right.png")
    for x, y in clear_arch_mask(left):
        assert left.getpixel((x, y))[3] == 0, f"left aperture not alpha at {(x, y)}"
        assert right.getpixel((right.width - 1 - x, y))[3] == 0, f"right aperture not alpha at {(x, y)}"
    print("PASS mechanical complete left/right tunnel apertures are alpha-zero")

    wall = im(T / "tunnel-wall.png")
    for center in (100, 300, 500):
        no_baked_lamp(wall, (center - 25, 234, center + 25, 316), "tunnel wall")
    print("PASS mechanical tunnel wall has no baked lamps")

    floor = im(T / "tunnel-floor.png")
    no_baked_lamp(floor, (48, 52, 112, 141), "tunnel floor")
    no_baked_lamp(floor, (528, 52, 592, 141), "tunnel floor")
    assert [floor.getpixel((0, y)) for y in range(floor.height)] == [floor.getpixel((floor.width - 1, y)) for y in range(floor.height)], "tunnel-floor final column differs from first"
    print("PASS mechanical tunnel floor has no baked lamps and exact wrap seam")

    speed = im(B / "track-speed-readout.png")
    for y in range(168, 168 + 128):
        for x in range(122, 122 + 268):
            r, g, b, a = speed.getpixel((x, y))
            assert a == 255 and 0.2126 * r + 0.7152 * g + 0.0722 * b <= 62, f"speed window not dark/opaque at {(x, y)}"
    print("PASS mechanical SPEED runtime window is opaque and dark")

    wheel = im(T / "wheel.png")
    hub_x = hub_y = 38
    contact = [x for x in range(wheel.width) if wheel.getpixel((x, 75))[3] == 255]
    assert contact and min(contact) <= hub_x <= max(contact), "wheel tyre does not reach contact row y=75 at hub tangent"
    assert wheel.getpixel((hub_x, hub_y))[3] == 255, "wheel hub registration pixel missing at (38, 38)"
    # The Track renderer rotates around (38,38).  Cardinal opaque extents are
    # the simplest deterministic definition of the tyre's four visible radii.
    # Unequal extents create a wobble even when the nominal hub is centred.
    radii = (
        hub_x - min(x for x in range(hub_x + 1) if wheel.getpixel((x, hub_y))[3] == 255),
        hub_y - min(y for y in range(hub_y + 1) if wheel.getpixel((hub_x, y))[3] == 255),
        max(x for x in range(hub_x, wheel.width) if wheel.getpixel((x, hub_y))[3] == 255) - hub_x,
        max(y for y in range(hub_y, wheel.height) if wheel.getpixel((hub_x, y))[3] == 255) - hub_y,
    )
    assert len(set(radii)) == 1, f"wheel radii must be equal about hub (38,38), got {radii}"
    print(f"PASS mechanical wheel tyre reaches y=75; hub (38,38); equal radii {radii}")

    atlas = json.loads((ATLAS / "ui-atlas.json").read_text())
    frames = {frame["filename"]: (texture, frame) for texture in atlas["textures"] for frame in texture["frames"]}
    texture, frame = frames["track-speed-readout"]
    assert frame["sourceSize"] == {"w": 512, "h": 512}, "stale SPEED atlas frame dimensions"
    assert (ATLAS / texture["image"]).is_file(), "missing atlas page for SPEED"
    print("PASS mechanical ui atlas includes regenerated SPEED frame and page")


for path, size in discrete.items():
    check_discrete(path, size)
for path, size in tiles.items():
    check_tile(path, size)
for left, right in pairs:
    assert im(left).getchannel("A").getbbox() == im(right).getchannel("A").getbbox(), (left, right)
    print("PASS paired bounds", left.name, right.name)
exact_blocker_checks()
print("ALL HIGH-DETAIL AR-064–069 EXPORT AND BLOCKER CHECKS PASSED")
