"""True-pixel-art remake for the AR-069 Track controls at real 70px readability.

Four pairs are authored at 128x128 and exported to 512x512 with exact 4x nearest
neighbour scaling. The contact sheet is an acceptance artifact rendered at the
actual in-game 70px size over both required backgrounds.
"""
from __future__ import annotations

from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import (  # noqa: E402
    CanvasSpec, PALETTE, content_bbox, draw, export_discrete, line, master_canvas,
    pixel_text, polygon, rect, save_master, validate_pair_bbox,
)

BUTTONS = ROOT / "src/assets/sprites/buttons"
MASTER = ROOT / "design/art-masters/ar069"
REVIEW = ROOT / "design/review"
MASTER.mkdir(parents=True, exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)


def shell(spec: CanvasSpec, pressed: bool):
    """The shared Track V3 charcoal/brass keycap with a broad 4px-grid outline."""
    image = master_canvas(spec)
    d = draw(image)
    # Hard physical shadow and slab silhouette.
    polygon(d, [(12, 14), (18, 8), (110, 8), (116, 14), (116, 112),
                (110, 118), (18, 118), (12, 112)], "ink")
    polygon(d, [(10, 9), (18, 3), (110, 3), (118, 11), (118, 108),
                (110, 116), (18, 116), (10, 108)], "ink")
    polygon(d, [(13, 10), (20, 6), (108, 6), (115, 13), (115, 105),
                (108, 112), (20, 112), (13, 105)], "ink_soft")
    rect(d, (18, 13, 110, 106), "sunshine")
    rect(d, (20, 15, 108, 104), "ink")
    rect(d, (23, 18, 105, 101), "ink_soft")
    rect(d, (25, 20, 103, 99), "ink")
    # Four intentionally oversized brass screws: material detail that survives 70px.
    for x, y in ((18, 16), (110, 16), (18, 102), (110, 102)):
        rect(d, (x - 3, y - 3, x + 3, y + 3), "ink")
        rect(d, (x - 2, y - 2, x + 2, y + 2), "sunshine")
        rect(d, (x - 1, y - 1, x + 1, y + 1), "orange")
    return image, d, 3 if pressed else 0


def map_icon(d, dy: int) -> None:
    # Big folded map: one silhouette with two folds and a dotted brass route.
    polygon(d, [(30, 39 + dy), (48, 34 + dy), (75, 40 + dy), (97, 34 + dy),
                (97, 76 + dy), (75, 82 + dy), (48, 76 + dy), (30, 82 + dy)], "ink")
    polygon(d, [(33, 41 + dy), (49, 37 + dy), (74, 43 + dy), (94, 37 + dy),
                (94, 74 + dy), (75, 79 + dy), (50, 73 + dy), (33, 79 + dy)], "paper")
    polygon(d, [(50, 38 + dy), (75, 44 + dy), (75, 78 + dy), (50, 72 + dy)], "paper2")
    line(d, [(49, 38 + dy), (49, 72 + dy)], "orange", 1)
    line(d, [(75, 44 + dy), (75, 78 + dy)], "orange", 1)
    # Route is deliberately a broad sequence of dots rather than fine path detail.
    for x, y in ((39, 50 + dy), (47, 55 + dy), (57, 53 + dy), (66, 60 + dy),
                 (78, 57 + dy), (87, 48 + dy)):
        rect(d, (x, y, x + 3, y + 3), "sunshine")


def ride_icon(d, dy: int) -> None:
    # Unmistakable side-on steam locomotive: boiler, cab, funnel, two broad wheels.
    rect(d, (27, 55 + dy, 79, 76 + dy), "ink")
    rect(d, (30, 57 + dy, 73, 73 + dy), "orange")
    rect(d, (34, 52 + dy, 61, 72 + dy), "sunshine")  # boiler
    rect(d, (63, 43 + dy, 80, 72 + dy), "orange")    # cab
    rect(d, (66, 46 + dy, 77, 57 + dy), "paper")     # window
    # Tall smokestack; this makes RIDE instantly a train, not a cart.
    rect(d, (42, 37 + dy, 52, 53 + dy), "ink")
    rect(d, (44, 39 + dy, 50, 52 + dy), "sunshine")
    rect(d, (40, 35 + dy, 54, 40 + dy), "ink")
    rect(d, (42, 36 + dy, 52, 38 + dy), "orange")
    polygon(d, [(79, 60 + dy), (92, 71 + dy), (79, 71 + dy)], "tomato")
    for x in (40, 68):
        rect(d, (x - 7, 71 + dy, x + 7, 84 + dy), "ink")
        rect(d, (x - 5, 73 + dy, x + 5, 82 + dy), "tomato")
        rect(d, (x - 2, 76 + dy, x + 2, 80 + dy), "sunshine")


def clear_icon(d, dy: int) -> None:
    # A broad broom sweeping three chunky marks away; nameable without reading label.
    # Handle.
    polygon(d, [(39, 37 + dy), (47, 37 + dy), (75, 68 + dy), (70, 73 + dy)], "ink")
    polygon(d, [(41, 39 + dy), (45, 39 + dy), (73, 69 + dy), (70, 71 + dy)], "sunshine")
    # Bristle head.
    polygon(d, [(65, 68 + dy), (88, 76 + dy), (81, 91 + dy), (58, 82 + dy)], "ink")
    polygon(d, [(66, 70 + dy), (85, 77 + dy), (79, 88 + dy), (61, 80 + dy)], "paper")
    line(d, [(66, 77 + dy), (81, 82 + dy)], "orange", 1)
    line(d, [(64, 80 + dy), (79, 85 + dy)], "orange", 1)
    # Erased crumbs swept away to show action and direction.
    rect(d, (28, 76 + dy, 36, 80 + dy), "paper2")
    rect(d, (22, 82 + dy, 29, 86 + dy), "paper2")
    rect(d, (33, 88 + dy, 39, 91 + dy), "paper2")


def loop_icon(d, dy: int) -> None:
    # Two wide circular arrows built as chunky 4px grid outlines—not a thin ring.
    # Upper/right arrow, clockwise.
    line(d, [(46, 44 + dy), (58, 37 + dy), (75, 37 + dy), (87, 49 + dy),
             (87, 62 + dy), (81, 68 + dy)], "sunshine", 5)
    polygon(d, [(76, 63 + dy), (91, 64 + dy), (84, 78 + dy)], "sunshine")
    # Lower/left arrow, clockwise continuation.
    line(d, [(81, 79 + dy), (70, 87 + dy), (53, 87 + dy), (41, 75 + dy),
             (41, 61 + dy), (47, 55 + dy)], "paper", 5)
    polygon(d, [(52, 60 + dy), (37, 59 + dy), (44, 45 + dy)], "paper")


ICONS = {
    "map": map_icon,
    "ride": ride_icon,
    "clear": clear_icon,
    "loop": loop_icon,
}
LABELS = {"map": "MAP", "ride": "RIDE", "clear": "CLEAR", "loop": "LOOP"}
FILENAMES = {
    "map": ("btn-nav-map-idle.png", "btn-nav-map-pressed.png"),
    "ride": ("btn-track-ride-idle.png", "btn-track-ride-pressed.png"),
    "clear": ("btn-track-clear-idle.png", "btn-track-clear-pressed.png"),
    "loop": ("btn-transport-loop-idle.png", "btn-transport-loop-pressed.png"),
}


def make_control(kind: str, filename: str, pressed: bool) -> Image.Image:
    spec = CanvasSpec(filename, 512, 512, 4)
    image, d, dy = shell(spec, pressed)
    ICONS[kind](d, dy)
    label = LABELS[kind]
    scale = 3 if label != "CLEAR" else 2
    width = len(label) * (5 * scale + 1) - 1
    pixel_text(d, ((128 - width) // 2, 90 + dy), label, "paper", scale=scale, spacing=1)
    save_master(image, MASTER / f"{filename}.master.png")
    final = export_discrete(image, spec, BUTTONS / filename)
    return final


def make_review_sheet(controls: dict[str, tuple[Image.Image, Image.Image]]) -> None:
    """Required AR-069 proof at real 70px size on cream and sky-blue surfaces."""
    labels = ["MAP", "RIDE", "CLEAR", "LOOP", "TARP"]
    states = [("IDLE", "pressed"), ("STATE", "pressed")]
    # 5 columns * 78px, two background panels with 2 state rows each.
    cell, left, top = 78, 52, 28
    width, height = left + cell * 5 + 8, top + 2 * 82 * 2 + 20
    sheet = Image.new("RGBA", (width, height), PALETTE["ink"])
    d = ImageDraw.Draw(sheet)
    for col, label in enumerate(labels):
        d.text((left + col * cell + 8, 5), label, fill=PALETTE["paper"])
    # Add TARP pair (already rendered by AR-064 remake) to the proof.
    tarp_idle = Image.open(BUTTONS / "btn-track-tarp-idle.png").convert("RGBA")
    tarp_pressed = Image.open(BUTTONS / "btn-track-tarp-seated.png").convert("RGBA")
    full = dict(controls)
    full["tarp"] = (tarp_idle, tarp_pressed)
    for bg_index, bg_color in enumerate((PALETTE["paper"], PALETTE["sky_top"])):
        panel_y = top + bg_index * 164
        ImageDraw.Draw(sheet).rectangle((0, panel_y - 4, width, panel_y + 160), fill=bg_color)
        for row, (state_text, _) in enumerate(states):
            y = panel_y + row * 82
            d.text((4, y + 25), state_text, fill=PALETTE["ink"])
            for col, kind in enumerate(("map", "ride", "clear", "loop", "tarp")):
                source = full[kind][row]
                thumb = source.resize((70, 70), Image.Resampling.NEAREST)
                sheet.alpha_composite(thumb, (left + col * cell, y))
    sheet.convert("RGB").save(REVIEW / "ar069-controls-70px.png")


if __name__ == "__main__":
    rendered: dict[str, tuple[Image.Image, Image.Image]] = {}
    for kind, (idle_name, pressed_name) in FILENAMES.items():
        idle = make_control(kind, idle_name, pressed=False)
        pressed = make_control(kind, pressed_name, pressed=True)
        validate_pair_bbox(idle, pressed, kind)
        print(f"{kind}: state alpha bbox={content_bbox(idle)}")
        rendered[kind] = (idle, pressed)
    make_review_sheet(rendered)
    print("AR-069 true pixel-art remake and 70px proof complete.")
