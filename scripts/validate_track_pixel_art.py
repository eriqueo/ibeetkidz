"""Validate remade AR-064–069 true-pixel-art exports before handoff."""
from __future__ import annotations

from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import (  # noqa: E402
    CanvasSpec, assert_exact_dimensions, validate_corners_alpha0, validate_pair_bbox,
    validate_palette, validate_tile_x,
)

BUTTONS = ROOT / "src/assets/sprites/buttons"
TRACK = ROOT / "src/assets/sprites/track3"

DISCRETE = {
    BUTTONS / "btn-track-tarp-idle.png": (512, 512),
    BUTTONS / "btn-track-tarp-seated.png": (512, 512),
    BUTTONS / "btn-nav-map-idle.png": (512, 512),
    BUTTONS / "btn-nav-map-pressed.png": (512, 512),
    BUTTONS / "btn-track-ride-idle.png": (512, 512),
    BUTTONS / "btn-track-ride-pressed.png": (512, 512),
    BUTTONS / "btn-track-clear-idle.png": (512, 512),
    BUTTONS / "btn-track-clear-pressed.png": (512, 512),
    BUTTONS / "btn-transport-loop-idle.png": (512, 512),
    BUTTONS / "btn-transport-loop-pressed.png": (512, 512),
    BUTTONS / "btn-transport-stop-idle.png": (512, 512),
    BUTTONS / "btn-transport-stop-pressed.png": (512, 512),
    BUTTONS / "btn-send-song-idle.png": (512, 512),
    BUTTONS / "btn-send-song-pressed.png": (512, 512),
    BUTTONS / "btn-transport-slow-idle.png": (512, 512),
    BUTTONS / "btn-transport-slow-pressed.png": (512, 512),
    BUTTONS / "btn-transport-fast-idle.png": (512, 512),
    BUTTONS / "btn-transport-fast-pressed.png": (512, 512),
    BUTTONS / "track-speed-readout.png": (512, 512),
    TRACK / "tarp-cover-boxcar.png": (300, 190),
    TRACK / "tarp-cover-tanker.png": (300, 170),
    TRACK / "tarp-cover-hopper.png": (300, 190),
    TRACK / "tarp-cover-flatcar.png": (300, 110),
    TRACK / "tunnel-mouth-left.png": (640, 640),
    TRACK / "tunnel-mouth-right.png": (640, 640),
    TRACK / "tunnel-lamp-0.png": (96, 128),
    TRACK / "tunnel-lamp-1.png": (96, 128),
    TRACK / "bridge-pier.png": (160, 360),
    TRACK / "bridge-far-bank-left.png": (320, 250),
    TRACK / "bridge-far-bank-right.png": (320, 250),
    TRACK / "wheel.png": (76, 76),
    TRACK / "shadow.png": (300, 44),
}

TILES = {
    TRACK / "tunnel-roof.png": (640, 520),
    TRACK / "tunnel-wall.png": (640, 720),
    TRACK / "bridge-deck-tile.png": (640, 170),
    TRACK / "bridge-water.png": (640, 150),
}

PAIRS = (
    (BUTTONS / "btn-track-tarp-idle.png", BUTTONS / "btn-track-tarp-seated.png"),
    (BUTTONS / "btn-nav-map-idle.png", BUTTONS / "btn-nav-map-pressed.png"),
    (BUTTONS / "btn-track-ride-idle.png", BUTTONS / "btn-track-ride-pressed.png"),
    (BUTTONS / "btn-track-clear-idle.png", BUTTONS / "btn-track-clear-pressed.png"),
    (BUTTONS / "btn-transport-loop-idle.png", BUTTONS / "btn-transport-loop-pressed.png"),
    (BUTTONS / "btn-transport-stop-idle.png", BUTTONS / "btn-transport-stop-pressed.png"),
    (BUTTONS / "btn-send-song-idle.png", BUTTONS / "btn-send-song-pressed.png"),
    (BUTTONS / "btn-transport-slow-idle.png", BUTTONS / "btn-transport-slow-pressed.png"),
    (BUTTONS / "btn-transport-fast-idle.png", BUTTONS / "btn-transport-fast-pressed.png"),
    (TRACK / "tunnel-lamp-0.png", TRACK / "tunnel-lamp-1.png"),
)


def validate(path: Path, dimensions: tuple[int, int], discrete: bool) -> None:
    image = Image.open(path).convert("RGBA")
    spec = CanvasSpec(path.name, dimensions[0], dimensions[1], 1)
    assert_exact_dimensions(image, spec)
    validate_palette(image, path.name)
    if discrete:
        validate_corners_alpha0(image, path.name)
    else:
        validate_tile_x(image, path.name)
    print(f"PASS {path.relative_to(ROOT)}")


if __name__ == "__main__":
    for path, dimensions in DISCRETE.items():
        validate(path, dimensions, discrete=True)
    for path, dimensions in TILES.items():
        validate(path, dimensions, discrete=False)
    for left, right in PAIRS:
        left_img = Image.open(left).convert("RGBA")
        right_img = Image.open(right).convert("RGBA")
        validate_pair_bbox(left_img, right_img, f"{left.name} / {right.name}")
        print(f"PASS paired registration {left.name} / {right.name}")
    print("ALL AR-064–069 TRUE-PIXEL-ART EXPORT CHECKS PASSED")
