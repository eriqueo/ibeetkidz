"""True-pixel-art remake for AR-066's layered Track V3 tunnel kit.

All source artwork is authored on 4x smaller masters, from the shared 16-colour
palette, then nearest-neighbour exported. Tunnel roof and wall use deliberate
repeat rhythms and exact matching edge columns to guarantee horizontal tiling.
"""
from __future__ import annotations

from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import (  # noqa: E402
    CanvasSpec, PALETTE, content_bbox, draw, export_discrete, export_tile_x,
    line, master_canvas, polygon, rect, save_master, validate_pair_bbox,
)

TRACK = ROOT / "src/assets/sprites/track3"
MASTER = ROOT / "design/art-masters/ar066"
MASTER.mkdir(parents=True, exist_ok=True)


def enforce_x_seam(master: Image.Image) -> None:
    """Copy master column zero into final master column for a perfect X seam."""
    px = master.load()
    for y in range(master.height):
        px[master.width - 1, y] = px[0, y]


def fill_rect(master: Image.Image, box, color: str) -> None:
    draw(master).rectangle(box, fill=PALETTE[color])


def make_wall() -> None:
    spec = CanvasSpec("tunnel-wall.png", 640, 720, 4)
    image = master_canvas(spec)
    d = draw(image)
    # Back wall begins as a dark indigo interior, not a flat black rect.
    rect(d, (0, 0, 159, 179), "ink")
    # 32 master-pixel stone rhythm repeats across the 160px tile width.
    # Uneven stone courses create readable scrolling texture without noise.
    course_heights = [0, 13, 27, 43, 58, 76, 93, 111, 129, 148, 165]
    for row, y in enumerate(course_heights[:-1]):
        next_y = course_heights[row + 1] - 2
        offset = (row % 2) * 8
        x = -offset
        widths = [15, 10, 18, 13, 16, 12]
        index = row % len(widths)
        while x < 160:
            stone_w = widths[index % len(widths)]
            # alternates muted plum/blue-grey; small amber stones avoid monotony.
            colour = "ink_soft" if (row + index) % 3 else "grape"
            if (row * 5 + index * 3) % 19 == 0:
                colour = "orange"
            rect(d, (x + 1, y + 1, min(159, x + stone_w - 1), next_y), colour)
            # Lower-edge shadow gives each course mass in discrete pixels.
            if next_y - y > 4:
                line(d, [(x + 2, next_y), (min(159, x + stone_w - 2), next_y)], "ink", 1)
            x += stone_w + 2
            index += 1
    # Broad damp streaks repeat with x rhythm; not photoreal texture.
    for x, y, h in ((18, 17, 22), (62, 48, 25), (108, 15, 16), (142, 88, 31),
                    (38, 119, 24), (86, 143, 25)):
        line(d, [(x, y), (x, y + h)], "ink", 2)
    enforce_x_seam(image)
    save_master(image, MASTER / "tunnel-wall.master.png")
    final = export_tile_x(image, spec, TRACK / spec.filename)
    print(f"tunnel-wall: bbox={content_bbox(final)}")


def make_roof() -> None:
    spec = CanvasSpec("tunnel-roof.png", 640, 520, 4)
    image = master_canvas(spec)
    d = draw(image)
    # Repeating scalloped lower edge. It begins at y=88 and drops unevenly to y=119.
    profile = [94, 94, 93, 92, 94, 96, 98, 101, 105, 108, 110, 112,
               111, 108, 104, 100, 97, 95, 93, 91, 90, 91, 93, 94,
               94, 93, 92, 92, 93, 94, 94, 94]
    # Draw dark roof mass above profile.
    for x in range(160):
        edge = profile[x % len(profile)]
        rect(d, (x, 0, x, edge), "ink_soft")
    # Top-band timber ribs / stone bands in broad cadence.
    rect(d, (0, 0, 159, 8), "ink")
    rect(d, (0, 9, 159, 13), "grape")
    for x in range(0, 160, 20):
        polygon(d, [(x + 2, 8), (x + 8, 8), (x + 11, 94), (x + 5, 96)], "ink")
        polygon(d, [(x + 4, 10), (x + 7, 10), (x + 9, 89), (x + 6, 91)], "orange")
        # Chunky wooden brace head.
        rect(d, (x + 1, 7, x + 9, 12), "sunshine")
    # Stone face blocks above the braces.
    for x in range(10, 160, 24):
        rect(d, (x, 20, x + 12, 27), "grape")
        rect(d, (x + 2, 22, x + 10, 25), "ink_soft")
    # Mark lower rocky edge in dark plum, then restore alpha beneath it.
    for x in range(160):
        y = profile[x % len(profile)]
        rect(d, (x, y, x, y + 1), "ink")
    enforce_x_seam(image)
    save_master(image, MASTER / "tunnel-roof.master.png")
    final = export_tile_x(image, spec, TRACK / spec.filename)
    print(f"tunnel-roof: bbox={content_bbox(final)}")


def mirror(master: Image.Image) -> Image.Image:
    return master.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def make_portal_master(right: bool = False) -> Image.Image:
    # 640^2 final at 4x => 160^2 master. Bottom edge registers to railhead.
    spec = CanvasSpec("portal", 640, 640, 4)
    image = master_canvas(spec)
    d = draw(image)
    # Big weathered rock face; carved arch is cut to true alpha afterwards.
    polygon(d, [(4, 159), (4, 69), (10, 69), (10, 50), (18, 50),
                (18, 35), (30, 35), (30, 23), (45, 23), (45, 14),
                (60, 14), (60, 8), (100, 8), (100, 14), (115, 14),
                (115, 23), (130, 23), (130, 35), (142, 35), (142, 50),
                (150, 50), (150, 69), (156, 69), (156, 159)], "ink")
    polygon(d, [(8, 159), (8, 70), (14, 70), (14, 53), (22, 53),
                (22, 38), (33, 38), (33, 27), (48, 27), (48, 18),
                (62, 18), (62, 12), (98, 12), (98, 18), (112, 18),
                (112, 27), (127, 27), (127, 38), (138, 38), (138, 53),
                (146, 53), (146, 70), (152, 70), (152, 159)], "ink_soft")
    # Broad, hand-laid stone clusters—each is clear at native game scale.
    stones = [
        (12, 78, 31, 91, "grape"), (14, 96, 39, 109, "ink_soft"),
        (10, 115, 34, 131, "grape"), (13, 137, 44, 154, "ink_soft"),
        (34, 45, 50, 57, "orange"), (47, 26, 63, 37, "grape"),
        (65, 15, 83, 26, "ink_soft"), (98, 17, 113, 29, "grape"),
        (112, 31, 128, 43, "orange"), (130, 52, 145, 65, "ink_soft"),
        (129, 78, 149, 91, "grape"), (122, 98, 146, 111, "ink_soft"),
        (126, 119, 150, 135, "grape"), (117, 140, 148, 155, "ink_soft"),
    ]
    for x0, y0, x1, y1, colour in stones:
        rect(d, (x0, y0, x1, y1), "ink")
        rect(d, (x0 + 2, y0 + 2, x1 - 1, y1 - 2), colour)
    # Cut true transparent arched opening: train / rail stay visible behind it.
    transparent = PALETTE["transparent"]
    # Central opening.
    d.rectangle((52, 80, 108, 159), fill=transparent)
    # Stepped arch crown.
    d.rectangle((55, 62, 105, 159), fill=transparent)
    d.rectangle((59, 50, 101, 159), fill=transparent)
    d.rectangle((65, 41, 95, 159), fill=transparent)
    d.rectangle((72, 35, 88, 159), fill=transparent)
    # Hard inner-shell lip to make the cutaway read as depth, leaving hole clear.
    line(d, [(50, 159), (50, 78), (53, 78), (53, 61), (57, 61),
             (57, 49), (63, 49), (63, 40), (71, 40)], "sunshine", 2)
    line(d, [(89, 40), (97, 40), (97, 49), (103, 49), (103, 61),
             (107, 61), (107, 78), (110, 78), (110, 159)], "orange", 2)
    # Ensure the hole remains transparent after lip details in the centre.
    # The side lips stay visible, middle opening is still transparent.
    if right:
        image = mirror(image)
    return image


def make_portals() -> None:
    left_spec = CanvasSpec("tunnel-mouth-left.png", 640, 640, 4)
    left = make_portal_master(right=False)
    save_master(left, MASTER / "tunnel-mouth-left.master.png")
    final_left = export_discrete(left, left_spec, TRACK / left_spec.filename)
    print(f"tunnel-mouth-left: bbox={content_bbox(final_left)}")
    right_spec = CanvasSpec("tunnel-mouth-right.png", 640, 640, 4)
    right = make_portal_master(right=True)
    save_master(right, MASTER / "tunnel-mouth-right.master.png")
    final_right = export_discrete(right, right_spec, TRACK / right_spec.filename)
    print(f"tunnel-mouth-right: bbox={content_bbox(final_right)}")


def lamp_master(lit: bool) -> Image.Image:
    spec = CanvasSpec("lamp", 96, 128, 4)
    image = master_canvas(spec)
    d = draw(image)
    # Stable mount and housing silhouette. Both states share it exactly.
    line(d, [(1, 6), (7, 6), (7, 10)], "ink", 2)
    rect(d, (5, 8, 18, 29), "ink")
    rect(d, (7, 10, 16, 27), "orange")
    rect(d, (8, 12, 15, 25), "ink_soft")
    rect(d, (6, 27, 17, 30), "ink")
    rect(d, (8, 27, 15, 28), "sunshine")
    # The only delta is internal warm lamp fill, never a soft glow or shifted body.
    if lit:
        rect(d, (9, 13, 14, 24), "sunshine")
        rect(d, (10, 15, 13, 22), "paper")
    else:
        rect(d, (10, 15, 13, 22), "grape")
    return image


def make_lamps() -> None:
    images = []
    for lit, filename in ((False, "tunnel-lamp-0.png"), (True, "tunnel-lamp-1.png")):
        spec = CanvasSpec(filename, 96, 128, 4)
        image = lamp_master(lit)
        save_master(image, MASTER / f"{filename}.master.png")
        final = export_discrete(image, spec, TRACK / filename)
        print(f"{filename}: bbox={content_bbox(final)}")
        images.append(final)
    validate_pair_bbox(images[0], images[1], "tunnel lamp")


if __name__ == "__main__":
    make_wall()
    make_roof()
    make_portals()
    make_lamps()
    print("AR-066 true pixel-art tunnel kit complete.")
