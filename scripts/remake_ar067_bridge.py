"""True-pixel-art remake for AR-067's traversable bridge kit.

Every asset is designed on an integer master grid and exported only with nearest-
neighbour enlargement. Deck and water repeat exactly across their horizontal
seams; piers and approach banks retain true transparent surrounds.
"""
from __future__ import annotations

from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import (  # noqa: E402
    CanvasSpec, PALETTE, content_bbox, draw, export_discrete, export_tile_x,
    line, master_canvas, polygon, rect, save_master,
)

TRACK = ROOT / "src/assets/sprites/track3"
MASTER = ROOT / "design/art-masters/ar067"
MASTER.mkdir(parents=True, exist_ok=True)


def seam_x(image: Image.Image) -> None:
    px = image.load()
    for y in range(image.height):
        px[image.width - 1, y] = px[0, y]


def make_deck() -> None:
    # railhead is y=0 in final output; structure starts immediately below it.
    # 170px is not divisible by the required 4px game-pixel scale. Author a
    # 640×168 grid-perfect plate and add a transparent two-pixel bottom pad;
    # deck registration remains exact because railhead is at output y=0.
    grid_spec = CanvasSpec("bridge-deck-tile-grid.png", 640, 168, 4)
    image = master_canvas(grid_spec)
    d = draw(image)
    # Span: a repeated heavy timber deck with chunky plank faces.
    rect(d, (0, 0, 159, 3), "ink")
    rect(d, (0, 4, 159, 7), "sunshine")
    rect(d, (0, 8, 159, 12), "orange")
    rect(d, (0, 13, 159, 17), "ink")
    # Varied 20px rhythm: individual planks with warm top-light and dark join line.
    for x in range(0, 160, 20):
        rect(d, (x + 1, 14, x + 18, 28), "orange")
        rect(d, (x + 2, 16, x + 17, 19), "sunshine")
        line(d, [(x + 2, 26), (x + 17, 26)], "ink_soft", 1)
        # iron tie plates occur one per beam segment, not busy per-pixel noise.
        rect(d, (x + 8, 17, x + 12, 22), "ink")
        rect(d, (x + 9, 18, x + 11, 20), "paper2")
    # Under-beam is a single strong dark horizontal element.
    rect(d, (0, 29, 159, 34), "ink")
    rect(d, (0, 35, 159, 38), "ink_soft")
    # Repeating triangular fascia braces: open negative space between braces keeps
    # the train world and water visible, instead of a filled full-width slab.
    for x in range(-10, 160, 20):
        polygon(d, [(x + 1, 39), (x + 8, 39), (x + 17, 41), (x + 12, 41)], "ink")
        polygon(d, [(x + 2, 38), (x + 5, 38), (x + 13, 41), (x + 10, 41)], "orange")
        polygon(d, [(x + 18, 38), (x + 15, 38), (x + 7, 41), (x + 10, 41)], "sunshine")
    seam_x(image)
    save_master(image, MASTER / "bridge-deck-tile.master.png")
    grid = export_tile_x(image, grid_spec, TRACK / "bridge-deck-tile.grid.png")
    final = Image.new("RGBA", (640, 170), PALETTE["transparent"])
    final.alpha_composite(grid, (0, 0))
    # Preserve seam equality in the two padded rows as transparent pixels.
    final.save(TRACK / "bridge-deck-tile.png")
    print(f"bridge-deck-tile: bbox={content_bbox(final)}")


def make_pier() -> None:
    spec = CanvasSpec("bridge-pier.png", 160, 360, 4)
    image = master_canvas(spec)
    d = draw(image)
    # Top cap exactly touches y=0; the stone base plants it visually.
    rect(d, (8, 0, 31, 5), "ink")
    rect(d, (10, 1, 29, 4), "sunshine")
    # Two robust timber legs with a cross-braced central bay.
    rect(d, (10, 5, 15, 72), "ink")
    rect(d, (12, 7, 14, 70), "orange")
    rect(d, (24, 5, 29, 72), "ink")
    rect(d, (25, 7, 27, 70), "orange")
    # Three broad brace rhythms + visible bolt plates.
    for y in (13, 34, 55):
        polygon(d, [(14, y), (17, y), (27, y + 16), (24, y + 16)], "ink")
        polygon(d, [(15, y + 1), (16, y + 1), (26, y + 15), (25, y + 15)], "sunshine")
        polygon(d, [(25, y), (28, y), (17, y + 16), (14, y + 16)], "ink")
        polygon(d, [(26, y + 1), (27, y + 1), (16, y + 15), (15, y + 15)], "orange")
        rect(d, (18, y + 7, 21, y + 10), "ink")
        rect(d, (19, y + 8, 20, y + 9), "paper2")
    # Stone footing grounds the trestle.
    polygon(d, [(5, 72), (34, 72), (38, 82), (35, 89), (4, 89), (1, 82)], "ink")
    rect(d, (6, 75, 33, 82), "ink_soft")
    rect(d, (9, 77, 18, 82), "grape")
    rect(d, (21, 77, 30, 82), "ink_soft")
    rect(d, (5, 84, 34, 88), "grape")
    save_master(image, MASTER / "bridge-pier.master.png")
    final = export_discrete(image, spec, TRACK / spec.filename)
    print(f"bridge-pier: bbox={content_bbox(final)}")


def left_bank_master() -> Image.Image:
    spec = CanvasSpec("bank", 320, 250, 5)
    image = master_canvas(spec)
    d = draw(image)
    # Grassy slope leaves air above and opens into the bridge gap on the right.
    # Hold the land one master pixel inside all canvas corners. This keeps the
    # shared alpha-contract intact while the far-facing edge still reads flat.
    ground = [(1, 1), (19, 1), (25, 5), (31, 12), (37, 20),
              (44, 29), (51, 36), (58, 43), (62, 47), (62, 48), (1, 48)]
    polygon(d, ground, "ink")
    ground_inner = [(2, 3), (18, 3), (23, 7), (29, 14), (35, 22),
                    (42, 31), (49, 38), (56, 45), (60, 47), (2, 47)]
    polygon(d, ground_inner, "orange")
    # Bright grass cap follows the bank contour.
    line(d, [(0, 1), (18, 1), (24, 6), (30, 13), (36, 21), (43, 30),
             (50, 37), (57, 44), (62, 48)], "grass", 2)
    # Big stones and grass clusters establish material form, not flat triangles.
    for x0, y0, x1, y1, colour in (
        (5, 29, 17, 36, "grape"), (19, 37, 29, 44, "ink_soft"),
        (31, 31, 42, 38, "paper2"), (42, 41, 50, 46, "grape"),
        (8, 41, 14, 46, "ink_soft"),
    ):
        rect(d, (x0 - 1, y0 - 1, x1 + 1, y1 + 1), "ink")
        rect(d, (x0, y0, x1, y1), colour)
    # Dithered lower-earth lip in large clusters.
    for x, y in ((4, 12), (11, 18), (20, 22), (26, 28), (38, 37), (48, 45)):
        rect(d, (x, y, x + 3, y + 1), "sunshine")
    return image


def make_banks() -> None:
    left_spec = CanvasSpec("bridge-far-bank-left.png", 320, 250, 5)
    left = left_bank_master()
    save_master(left, MASTER / "bridge-far-bank-left.master.png")
    f_left = export_discrete(left, left_spec, TRACK / left_spec.filename)
    right_spec = CanvasSpec("bridge-far-bank-right.png", 320, 250, 5)
    right = left.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    save_master(right, MASTER / "bridge-far-bank-right.master.png")
    f_right = export_discrete(right, right_spec, TRACK / right_spec.filename)
    print(f"banks: left={content_bbox(f_left)} right={content_bbox(f_right)}")


def make_water() -> None:
    spec = CanvasSpec("bridge-water.png", 640, 150, 5)
    image = master_canvas(spec)
    d = draw(image)
    # Quiet dark water base, fully opaque only in its assigned rectangular layer.
    rect(d, (0, 0, 127, 29), "teal")
    # Repeating chunky current lines; all motifs wrap to a 32px master rhythm.
    patterns = [
        (2, 3, 10, "sky_top"), (17, 7, 25, "ink_soft"), (29, 12, 38, "sky"),
        (45, 4, 53, "sky_top"), (62, 16, 73, "ink_soft"), (84, 9, 92, "sky"),
        (101, 20, 112, "sky_top"), (118, 5, 126, "ink_soft"),
    ]
    for x0, y, x1, colour in patterns:
        line(d, [(x0, y), (x1, y)], colour, 1)
        if y + 1 < 30:
            line(d, [(x0 + 3, y + 1), (x1 - 2, y + 1)], colour, 1)
    # A few low highlights only — water stays behind the train.
    for x, y in ((12, 22), (41, 25), (77, 3), (95, 16), (121, 12)):
        rect(d, (x, y, x + 3, y), "paper2")
    seam_x(image)
    save_master(image, MASTER / "bridge-water.master.png")
    final = export_tile_x(image, spec, TRACK / spec.filename)
    print(f"bridge-water: bbox={content_bbox(final)}")


if __name__ == "__main__":
    make_deck()
    make_pier()
    make_banks()
    make_water()
    print("AR-067 true pixel-art bridge kit complete.")
