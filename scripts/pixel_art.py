"""iBeetKidz true-pixel-art production primitives.

This module deliberately prevents the common "pixel-styled illustration" failure.
All art is authored on a small integer grid and enlarged only with nearest-neighbour.
Every exported RGBA colour is selected from PALETTE; no interpolation, antialiasing,
blur, or post-generation colour quantisation is permitted.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from PIL import Image, ImageDraw

# Canonical palette: design/palette-nintendo.json. Every final pixel must be one of
# these colours or fully transparent. The repeated semantic keys make asset code
# readable while guarding against off-palette RGB values.
PALETTE: Final[dict[str, tuple[int, int, int, int]]] = {
    "transparent": (0, 0, 0, 0),
    "paper": (251, 243, 217, 255),
    "paper2": (244, 232, 193, 255),
    "ink": (43, 36, 64, 255),
    "ink_soft": (90, 79, 110, 255),
    # Approved discrete-alpha depths from the palette's hard shadow rule. These
    # are stepped low-res pixels, never a blur or a smooth alpha gradient.
    "shadow_25": (43, 36, 64, 64),
    "shadow_35": (43, 36, 64, 90),
    "sky_top": (127, 183, 232, 255),
    "sky_bottom": (191, 166, 224, 255),
    "tomato": (232, 80, 58, 255),
    "sunshine": (255, 204, 62, 255),
    "grass": (91, 191, 82, 255),
    "sky": (74, 163, 223, 255),
    "grape": (138, 92, 196, 255),
    "orange": (240, 138, 60, 255),
    "berry": (217, 79, 134, 255),
    "teal": (55, 182, 164, 255),
}

OPAQUE_PALETTE: Final[set[tuple[int, int, int, int]]] = set(PALETTE.values()) - {
    PALETTE["transparent"]
}


@dataclass(frozen=True)
class CanvasSpec:
    """An exact target canvas and its integer low-resolution master grid."""

    filename: str
    target_w: int
    target_h: int
    pixel_scale: int

    @property
    def master_w(self) -> int:
        assert self.target_w % self.pixel_scale == 0, self
        return self.target_w // self.pixel_scale

    @property
    def master_h(self) -> int:
        assert self.target_h % self.pixel_scale == 0, self
        return self.target_h // self.pixel_scale


def master_canvas(spec: CanvasSpec) -> Image.Image:
    """Return a transparent low-resolution master canvas for `spec`."""
    return Image.new("RGBA", (spec.master_w, spec.master_h), PALETTE["transparent"])


def draw(master: Image.Image) -> ImageDraw.ImageDraw:
    """Create a non-antialiased primitive drawer for a low-resolution canvas."""
    return ImageDraw.Draw(master)


def rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: str) -> None:
    """Draw an inclusive rectangle in a canonical palette colour."""
    d.rectangle(box, fill=PALETTE[color])


def line(
    d: ImageDraw.ImageDraw,
    points: Iterable[tuple[int, int]],
    color: str,
    width: int = 1,
) -> None:
    """Draw a crisp low-resolution line in a canonical palette colour."""
    d.line(list(points), fill=PALETTE[color], width=width, joint="curve")


def polygon(
    d: ImageDraw.ImageDraw,
    points: Iterable[tuple[int, int]],
    color: str,
) -> None:
    """Draw a crisp low-resolution polygon in a canonical palette colour."""
    d.polygon(list(points), fill=PALETTE[color])


def ellipse(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: str) -> None:
    """Draw an ellipse on the low-resolution master; scaling preserves hard pixels."""
    d.ellipse(box, fill=PALETTE[color])


FONT_5X7: Final[dict[str, tuple[str, ...]]] = {
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "B": ("11110", "10001", "10001", "11110", "10001", "10001", "11110"),
    "C": ("01111", "10000", "10000", "10000", "10000", "10000", "01111"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "L": ("10000", "10000", "10000", "10000", "10000", "10000", "11111"),
    "M": ("10001", "11011", "10101", "10001", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": ("10001", "10001", "10001", "10001", "10001", "10001", "01110"),
    "V": ("10001", "10001", "10001", "10001", "01010", "01010", "00100"),
    "W": ("10001", "10001", "10001", "10101", "10101", "11011", "10001"),
    "Y": ("10001", "10001", "01010", "00100", "00100", "00100", "00100"),
    "-": ("00000", "00000", "00000", "11111", "00000", "00000", "00000"),
    " ": ("00000", "00000", "00000", "00000", "00000", "00000", "00000"),
}


def text_width(text: str, scale: int = 1, spacing: int = 1) -> int:
    return max(0, len(text) * (5 * scale + spacing) - spacing)


def pixel_text(
    d: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    color: str = "paper",
    scale: int = 1,
    spacing: int = 1,
) -> None:
    """Draw uppercase 5x7 bitmap lettering, never antialiased type."""
    x0, y0 = xy
    x = x0
    for glyph in text.upper():
        bitmap = FONT_5X7.get(glyph, FONT_5X7[" "])
        for row, row_bits in enumerate(bitmap):
            for col, bit in enumerate(row_bits):
                if bit == "1":
                    rect(d, (x + col * scale, y0 + row * scale,
                             x + (col + 1) * scale - 1,
                             y0 + (row + 1) * scale - 1), color)
        x += 5 * scale + spacing


def nearest_export(master: Image.Image, spec: CanvasSpec, output_path: Path) -> Image.Image:
    """Export exact target dimensions using nearest-neighbour only."""
    if master.size != (spec.master_w, spec.master_h):
        raise ValueError(f"{spec.filename}: master {master.size} != expected "
                         f"{spec.master_w}x{spec.master_h}")
    image = master.resize((spec.target_w, spec.target_h), Image.Resampling.NEAREST)
    image.save(output_path)
    return image


def validate_palette(image: Image.Image, filename: str) -> None:
    """Reject blended/off-palette pixels, excluding fully transparent pixels."""
    rgba = image.convert("RGBA")
    colours = set(rgba.getdata())
    invalid = {colour for colour in colours if colour[3] and colour not in OPAQUE_PALETTE}
    if invalid:
        sample = sorted(invalid)[:10]
        raise AssertionError(f"{filename}: off-palette opaque colours found: {sample}")


def validate_corners_alpha0(image: Image.Image, filename: str) -> None:
    """Require transparent corners for discrete sprites, overlays, and UI assets."""
    rgba = image.convert("RGBA")
    w, h = rgba.size
    corners = [rgba.getpixel((0, 0))[3], rgba.getpixel((w - 1, 0))[3],
               rgba.getpixel((0, h - 1))[3], rgba.getpixel((w - 1, h - 1))[3]]
    if any(corners):
        raise AssertionError(f"{filename}: non-zero corner alpha {corners}")


def content_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    """Return the opaque-alpha content box as x, y, width, height."""
    alpha = image.convert("RGBA").getchannel("A")
    box = alpha.getbbox()
    if box is None:
        return None
    left, top, right, bottom = box
    return left, top, right - left, bottom - top


def validate_pair_bbox(image_a: Image.Image, image_b: Image.Image, pair_name: str) -> None:
    """Require texture-swap state pairs to share exact alpha content bounds."""
    a = content_bbox(image_a)
    b = content_bbox(image_b)
    if a != b:
        raise AssertionError(f"{pair_name}: state alpha boxes differ: {a} != {b}")


def validate_tile_x(image: Image.Image, filename: str) -> None:
    """Require exact left/right edge equality for a horizontally tiling pixel plate."""
    rgba = image.convert("RGBA")
    left = [rgba.getpixel((0, y)) for y in range(rgba.height)]
    right = [rgba.getpixel((rgba.width - 1, y)) for y in range(rgba.height)]
    if left != right:
        raise AssertionError(f"{filename}: left/right tile seam mismatch")


def validate_tile_xy(image: Image.Image, filename: str) -> None:
    """Require exact opposite-edge equality for an X/Y tiling weather layer."""
    validate_tile_x(image, filename)
    rgba = image.convert("RGBA")
    top = [rgba.getpixel((x, 0)) for x in range(rgba.width)]
    bottom = [rgba.getpixel((x, rgba.height - 1)) for x in range(rgba.width)]
    if top != bottom:
        raise AssertionError(f"{filename}: top/bottom tile seam mismatch")


def dark_composite(image: Image.Image, output_path: Path) -> None:
    """Save an alpha-quality review image on the game’s dark-plum background."""
    bg = Image.new("RGBA", image.size, PALETTE["ink"])
    bg.alpha_composite(image.convert("RGBA"))
    bg.convert("RGB").save(output_path)


def cream_composite(image: Image.Image, output_path: Path) -> None:
    """Save an alpha-quality review image on the game’s parchment background."""
    bg = Image.new("RGBA", image.size, PALETTE["paper"])
    bg.alpha_composite(image.convert("RGBA"))
    bg.convert("RGB").save(output_path)


def assert_exact_dimensions(image: Image.Image, spec: CanvasSpec) -> None:
    if image.size != (spec.target_w, spec.target_h):
        raise AssertionError(f"{spec.filename}: {image.size} != "
                             f"{spec.target_w}x{spec.target_h}")


def export_discrete(master: Image.Image, spec: CanvasSpec, output_path: Path) -> Image.Image:
    """Nearest-export and validate a transparent discrete game asset."""
    image = nearest_export(master, spec, output_path)
    assert_exact_dimensions(image, spec)
    validate_palette(image, spec.filename)
    validate_corners_alpha0(image, spec.filename)
    return image


def export_tile_x(master: Image.Image, spec: CanvasSpec, output_path: Path) -> Image.Image:
    """Nearest-export and validate a horizontally seamless tile plate."""
    image = nearest_export(master, spec, output_path)
    assert_exact_dimensions(image, spec)
    validate_palette(image, spec.filename)
    validate_tile_x(image, spec.filename)
    return image


def export_tile_xy(master: Image.Image, spec: CanvasSpec, output_path: Path) -> Image.Image:
    """Nearest-export and validate a bi-directionally seamless tile plate."""
    image = nearest_export(master, spec, output_path)
    assert_exact_dimensions(image, spec)
    validate_palette(image, spec.filename)
    validate_tile_xy(image, spec.filename)
    return image


def erase_rect(master: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Cut a true transparent aperture into a low-resolution master asset."""
    ImageDraw.Draw(master).rectangle(box, fill=PALETTE["transparent"])


def save_master(master: Image.Image, path: Path) -> None:
    """Save a low-resolution source master for art review and future tweaking."""
    master.save(path)
