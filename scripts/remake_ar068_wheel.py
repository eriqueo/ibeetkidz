"""True-pixel-art remake for AR-068 wheel/contact repair and registration proof."""
from __future__ import annotations

from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import (  # noqa: E402
    CanvasSpec, PALETTE, content_bbox, draw, export_discrete, master_canvas,
    pixel_text, rect, save_master,
)

TRACK = ROOT / "src/assets/sprites/track3"
REG = ROOT / "design/registration"
MASTER = ROOT / "design/art-masters/ar068"
MASTER.mkdir(parents=True, exist_ok=True)
REG.mkdir(parents=True, exist_ok=True)

# Native-file coordinates used by TrackV3Scene. Wheel centre is measured in the
# 76px source coordinate system; wheel tangents must equal each canvas railhead.
WHEEL_HUB = (38, 38)
WHEEL_RADIUS = 30
CAR_AXLES = ((77, 160), (223, 160))


def make_wheel() -> Image.Image:
    """Draw a symmetric 38px low-res master; 2x export makes native 76px art."""
    spec = CanvasSpec("wheel.png", 76, 76, 2)
    image = master_canvas(spec)
    d = draw(image)
    # A full 76px tyre diameter is required because the renderer displays this
    # source at 60px (radius 30): its lower tangent must land on the railhead.
    # The spans are mirrored exactly about the 38px source centreline.
    outer_spans = {
        0: (16, 21), 1: (12, 25), 2: (9, 28), 3: (7, 30),
        4: (5, 32), 5: (4, 33), 6: (3, 34),
        **{y: (2, 35) for y in range(7, 31)},
        31: (3, 34), 32: (4, 33), 33: (5, 32), 34: (7, 30),
        35: (9, 28), 36: (12, 25), 37: (16, 21),
    }
    for y, (left, right) in outer_spans.items():
        rect(d, (left, y, right, y), "ink")
    # Steel sidewall, inset symmetrically while retaining a substantial tyre.
    inner_spans = {
        3: (16, 21), 4: (12, 25), 5: (10, 27), 6: (8, 29),
        7: (7, 30), 8: (6, 31), 9: (5, 32),
        **{y: (5, 32) for y in range(10, 28)},
        28: (6, 31), 29: (7, 30), 30: (8, 29), 31: (10, 27),
        32: (12, 25), 33: (16, 21),
    }
    for y, (left, right) in inner_spans.items():
        rect(d, (left, y, right, y), "ink_soft")
    # Empty centre makes broad spokes legible when the wheel turns.
    d.rectangle((11, 11, 26, 26), fill=PALETTE["ink"])
    # Four broad 90-degree spokes, mirrored around the even 38px source centre.
    rect(d, (17, 8, 20, 17), "grape")
    rect(d, (17, 20, 20, 29), "grape")
    rect(d, (8, 17, 17, 20), "grape")
    rect(d, (20, 17, 29, 20), "grape")
    # Steel highlights retain the same rotation symmetry.
    rect(d, (18, 9, 19, 16), "sky_top")
    rect(d, (18, 21, 19, 28), "sky_top")
    rect(d, (9, 18, 16, 19), "sky_top")
    rect(d, (21, 18, 28, 19), "sky_top")
    # Brass hub and a compact ink cap exactly at the geometric centre.
    rect(d, (14, 14, 23, 23), "ink")
    rect(d, (16, 16, 21, 21), "sunshine")
    rect(d, (18, 18, 19, 19), "paper")
    rect(d, (19, 19, 19, 19), "ink")
    save_master(image, MASTER / "wheel.master.png")
    final = export_discrete(image, spec, TRACK / spec.filename)
    print(f"wheel: bbox={content_bbox(final)} centre={WHEEL_HUB} radius={WHEEL_RADIUS}")
    return final


def make_shadow() -> Image.Image:
    """Draw a stepped-alpha, compact ground-contact shadow without blur."""
    spec = CanvasSpec("shadow.png", 300, 44, 4)
    image = master_canvas(spec)
    d = draw(image)
    # Outer contact footprint uses discrete 25% alpha pixels only.
    rect(d, (12, 4, 62, 6), "shadow_25")
    rect(d, (8, 5, 66, 6), "shadow_25")
    rect(d, (14, 7, 60, 7), "shadow_25")
    # Core is darker but still flat, hard-edged alpha—never a soft blur.
    rect(d, (20, 5, 54, 6), "shadow_35")
    rect(d, (24, 4, 50, 7), "shadow_35")
    save_master(image, MASTER / "shadow.master.png")
    final = export_discrete(image, spec, TRACK / spec.filename)
    print(f"shadow: bbox={content_bbox(final)} alpha steps={{64,90}}")
    return final


def target_cross(drawer: ImageDraw.ImageDraw, x: int, y: int, label: str) -> None:
    colour = PALETTE["tomato"]
    # Solid crosshair keeps centre exact on native-pixel registrations.
    drawer.line((x - 11, y, x + 11, y), fill=colour, width=2)
    drawer.line((x, y - 11, x, y + 11), fill=colour, width=2)
    drawer.rectangle((x - 2, y - 2, x + 2, y + 2), fill=PALETTE["paper"])
    # Label is intentionally native-pixel drawn (no antialiased font).
    pixel_text(drawer, (min(x + 13, 240), max(3, y - 12)), label, "paper", scale=1, spacing=1)


def registration_sheet(
    asset: str,
    label: str,
    centres: tuple[tuple[int, int, int, str], ...],
) -> None:
    """Annotate a real car body image with its axes, radius, baseline and railhead."""
    body = Image.open(TRACK / asset).convert("RGBA")
    w, h = body.size
    # Present actual source art on a stable dark field; sheet itself is non-shipping.
    sheet = Image.new("RGBA", (w, h), PALETTE["ink"])
    sheet.alpha_composite(body)
    d = ImageDraw.Draw(sheet)
    # Railhead/body baseline: wheel tyres touch the source canvas's bottom edge.
    d.line((0, h - 1, w - 1, h - 1), fill=PALETTE["sunshine"], width=2)
    pixel_text(d, (6, max(3, h - 22)), f"RAIL {h}", "sunshine", scale=1, spacing=1)
    for x, y, radius, axle_label in centres:
        # Ring is a sampled, hard-pixel radius guide; no smooth overlay.
        d.ellipse((x - radius, y - radius, x + radius, y + radius),
                  outline=PALETTE["sky"], width=1)
        target_cross(d, x, y, axle_label)
    pixel_text(d, (6, 5), label, "paper", scale=1, spacing=1)
    sheet.convert("RGB").save(REG / f"wheel-registration-{label.lower()}.png")


if __name__ == "__main__":
    make_wheel()
    make_shadow()
    registration_sheet("car-boxcar.png", "BOXCAR", ((77, 160, 30, "A"), (223, 160, 30, "B")))
    registration_sheet("car-tanker.png", "TANKER", ((77, 140, 30, "A"), (223, 140, 30, "B")))
    registration_sheet("car-hopper.png", "HOPPER", ((77, 160, 30, "A"), (223, 160, 30, "B")))
    registration_sheet("car-flatcar.png", "FLATCAR", ((77, 80, 30, "A"), (223, 80, 30, "B")))
    registration_sheet("loco.png", "LOCOMOTIVE", ((78, 190, 30, "DRIVER"), (277, 201, 19, "PILOT")))
    print("AR-068 true pixel-art wheel/contact and registration sheets complete.")
