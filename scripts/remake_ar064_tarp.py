"""True-pixel-art remake for AR-064 and its AR-069 TARP control correction.

All UI controls are authored at 128x128 then nearest-neighbour exported to 512x512.
All overlay canvases use a 5x grid. No antialiasing, blurs, smooth scaling, or
non-canonical palette colours are allowed.
"""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from pixel_art import (  # noqa: E402
    CanvasSpec, PALETTE, content_bbox, draw, export_discrete, line, master_canvas,
    pixel_text, polygon, rect, save_master,
)

BUTTONS = ROOT / "src/assets/sprites/buttons"
TRACK = ROOT / "src/assets/sprites/track3"
MASTER = ROOT / "design/art-masters/ar064"
MASTER.mkdir(parents=True, exist_ok=True)


# ---- common Track V3 machine face -------------------------------------------------

def button_shell(spec: CanvasSpec, pressed: bool = False):
    """Draw a chunky, broad-silhouette charcoal/brass Track header keycap."""
    img = master_canvas(spec)
    d = draw(img)
    # Shadow and broad outer profile.
    rect(d, (12, 14, 116, 116), "ink")
    polygon(d, [(11, 9), (18, 4), (110, 4), (117, 11), (117, 108),
                (110, 115), (18, 115), (11, 108)], "ink")
    polygon(d, [(13, 9), (20, 6), (108, 6), (115, 13), (115, 106),
                (108, 113), (20, 113), (13, 106)], "ink_soft")
    # Recessed brass rail around the face.
    rect(d, (18, 13, 110, 106), "sunshine")
    rect(d, (20, 15, 108, 104), "ink")
    # Face has a distinct top-left highlight / bottom-right occlusion without gradient.
    rect(d, (22, 17, 106, 102), "ink_soft")
    rect(d, (24, 19, 104, 100), "ink")
    # Big screw heads, intentionally simple so they read at 70px.
    for x, y in ((18, 16), (110, 16), (18, 102), (110, 102)):
        rect(d, (x - 3, y - 3, x + 3, y + 3), "ink")
        rect(d, (x - 2, y - 2, x + 2, y + 2), "sunshine")
        rect(d, (x - 1, y - 1, x + 1, y + 1), "orange")
    # A clear pressed difference: face and all content are shifted exactly 3 master px.
    return img, d, 3 if pressed else 0


def draw_tarp_pictogram(d, dy: int, covered: bool) -> None:
    """Draw the TARP icon with a large type-readable state change."""
    # Wheel and car outline. Car body intentionally small enough to leave tarp as focus.
    rect(d, (27, 52 + dy, 70, 73 + dy), "ink")
    rect(d, (29, 54 + dy, 68, 71 + dy), "paper2")
    rect(d, (31, 56 + dy, 66, 69 + dy), "orange")
    # Window/body panels — large clusters, no noisy texture.
    rect(d, (33, 58 + dy, 41, 68 + dy), "paper")
    rect(d, (54, 58 + dy, 64, 68 + dy), "paper")
    # Wheels sit below the car; tiny but distinctive.
    for x in (35, 61):
        rect(d, (x - 4, 70 + dy, x + 4, 77 + dy), "ink")
        rect(d, (x - 2, 72 + dy, x + 2, 75 + dy), "sunshine")
    if not covered:
        # Folded blue tarp beside the car — unmistakable chunky bundle.
        polygon(d, [(72, 55 + dy), (91, 55 + dy), (96, 60 + dy),
                    (93, 72 + dy), (75, 72 + dy), (70, 67 + dy)], "ink")
        polygon(d, [(74, 57 + dy), (90, 57 + dy), (94, 61 + dy),
                    (91, 70 + dy), (76, 70 + dy), (72, 66 + dy)], "sky")
        rect(d, (77, 59 + dy, 90, 61 + dy), "sky_top")
        line(d, [(79, 63 + dy), (88, 68 + dy)], "ink_soft", 1)
        line(d, [(75, 70 + dy), (71, 77 + dy)], "sunshine", 1)
        line(d, [(91, 70 + dy), (96, 76 + dy)], "sunshine", 1)
    else:
        # Same canvas tarp draped visibly across 70% of the car; silhouette change >20%.
        polygon(d, [(24, 48 + dy), (67, 48 + dy), (73, 54 + dy),
                    (70, 71 + dy), (64, 75 + dy), (29, 75 + dy),
                    (23, 68 + dy)], "ink")
        polygon(d, [(27, 50 + dy), (65, 50 + dy), (70, 56 + dy),
                    (67, 69 + dy), (62, 72 + dy), (30, 72 + dy),
                    (26, 67 + dy)], "sky")
        # Folds are discrete, wide tracks — not shaded illustration.
        rect(d, (32, 52 + dy, 35, 69 + dy), "sky_top")
        rect(d, (49, 51 + dy, 52, 71 + dy), "ink_soft")
        rect(d, (60, 53 + dy, 63, 70 + dy), "sky_top")
        line(d, [(27, 68 + dy), (23, 77 + dy)], "sunshine", 1)
        line(d, [(67, 69 + dy), (72, 76 + dy)], "sunshine", 1)


def make_tarp_button(filename: str, pressed: bool, covered: bool) -> None:
    spec = CanvasSpec(filename, 512, 512, 4)
    img, d, dy = button_shell(spec, pressed)
    draw_tarp_pictogram(d, dy, covered)
    label = "TARP"
    x = (spec.master_w - (len(label) * 16 - 1)) // 2
    pixel_text(d, (x, 88 + dy), label, "paper", scale=3, spacing=1)
    save_master(img, MASTER / f"{filename}.master.png")
    final = export_discrete(img, spec, BUTTONS / filename)
    print(f"{filename}: content bbox={content_bbox(final)}")


# ---- type-specific tarp covers ------------------------------------------------------

def cover_canvas(filename: str, height: int):
    spec = CanvasSpec(filename, 300, height, 5)
    img = master_canvas(spec)
    return spec, img, draw(img)


def rope(d, points):
    line(d, points, "sunshine", 1)
    x, y = points[-1]
    rect(d, (x - 1, y - 1, x + 1, y + 1), "orange")


def make_boxcar_cover() -> None:
    spec, img, d = cover_canvas("tarp-cover-boxcar.png", 190)
    # Drape over the real rectangle with overhang and a central livery aperture.
    polygon(d, [(3, 4), (56, 4), (58, 7), (56, 26), (50, 29),
                (7, 29), (2, 25)], "ink")
    polygon(d, [(5, 5), (55, 5), (56, 8), (54, 24), (49, 27),
                (8, 27), (4, 24)], "sky")
    rect(d, (8, 7, 12, 24), "sky_top")
    rect(d, (45, 7, 49, 25), "ink_soft")
    rect(d, (28, 6, 32, 26), "sky_top")
    # Livery plate must remain unobstructed (central x=13..46, y=18..26).
    rect(d, (13, 18, 46, 26), "transparent")
    rope(d, [(5, 24), (3, 30)])
    rope(d, [(54, 24), (57, 30)])
    export_discrete(img, spec, TRACK / spec.filename)


def make_tanker_cover() -> None:
    spec, img, d = cover_canvas("tarp-cover-tanker.png", 170)
    # Rounded barrel fit: scalloped tarp crown and curved side drapes.
    polygon(d, [(8, 5), (12, 2), (48, 2), (53, 5), (56, 11),
                (54, 24), (49, 27), (8, 27), (4, 23), (3, 12)], "ink")
    polygon(d, [(10, 6), (13, 4), (47, 4), (51, 7), (54, 12),
                (52, 22), (47, 25), (9, 25), (6, 21), (5, 13)], "sky")
    rect(d, (13, 5, 17, 21), "sky_top")
    rect(d, (41, 5, 45, 23), "ink_soft")
    # Livery aperture and wheel clearance.
    rect(d, (13, 17, 46, 25), "transparent")
    rope(d, [(6, 20), (3, 27)])
    rope(d, [(52, 20), (56, 26)])
    export_discrete(img, spec, TRACK / spec.filename)


def make_hopper_cover() -> None:
    spec, img, d = cover_canvas("tarp-cover-hopper.png", 190)
    # Tarp follows hopper’s sloped walls, with tied vertical corners.
    polygon(d, [(8, 4), (52, 4), (56, 9), (50, 26), (45, 29),
                (13, 29), (5, 24), (3, 10)], "ink")
    polygon(d, [(10, 6), (50, 6), (54, 10), (48, 24), (43, 27),
                (14, 27), (7, 22), (5, 11)], "sky")
    polygon(d, [(10, 7), (17, 7), (14, 26), (9, 23)], "sky_top")
    polygon(d, [(43, 7), (50, 7), (48, 23), (43, 26)], "ink_soft")
    rect(d, (13, 18, 46, 26), "transparent")
    rope(d, [(7, 22), (4, 31)])
    rope(d, [(49, 23), (53, 31)])
    export_discrete(img, spec, TRACK / spec.filename)


def make_flatcar_cover() -> None:
    spec, img, d = cover_canvas("tarp-cover-flatcar.png", 110)
    # Low folded canvas bundle, not a full rectangle: flatcar’s cargo cover.
    polygon(d, [(9, 4), (49, 4), (54, 8), (52, 15), (48, 17),
                (10, 17), (6, 14)], "ink")
    polygon(d, [(11, 6), (47, 6), (52, 9), (50, 13), (46, 15),
                (11, 15), (8, 13)], "sky")
    rect(d, (13, 7, 17, 14), "sky_top")
    rect(d, (42, 7, 46, 15), "ink_soft")
    # Low deck livery opening and entire wheel line remain transparent.
    rect(d, (15, 12, 44, 17), "transparent")
    rope(d, [(9, 14), (7, 19)])
    rope(d, [(50, 14), (53, 19)])
    export_discrete(img, spec, TRACK / spec.filename)


if __name__ == "__main__":
    make_tarp_button("btn-track-tarp-idle.png", pressed=False, covered=False)
    make_tarp_button("btn-track-tarp-seated.png", pressed=True, covered=True)
    make_boxcar_cover()
    make_tanker_cover()
    make_hopper_cover()
    make_flatcar_cover()
    print("AR-064 true pixel-art remake complete.")
