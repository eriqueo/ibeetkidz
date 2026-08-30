"""True-pixel-art remake for remaining AR-065 Track header controls.

Each button is authored on a 128x128 master, then nearest-exported 4x to the
existing 512x512 slot. AR-064 and AR-069 own the TARP, MAP, RIDE, CLEAR and LOOP
faces; this file completes the coherent family with STOP, SEND, SLOW, FAST and
an empty SPEED display housing.
"""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import (  # noqa: E402
    CanvasSpec, content_bbox, draw, export_discrete, line, master_canvas,
    pixel_text, polygon, rect, save_master, validate_pair_bbox,
)

BUTTONS = ROOT / "src/assets/sprites/buttons"
MASTER = ROOT / "design/art-masters/ar065"
MASTER.mkdir(parents=True, exist_ok=True)


def shell(spec: CanvasSpec, pressed: bool):
    image = master_canvas(spec)
    d = draw(image)
    # Same coarse mechanical slate-and-brass family as AR-064/AR-069.
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
    for x, y in ((18, 16), (110, 16), (18, 102), (110, 102)):
        rect(d, (x - 3, y - 3, x + 3, y + 3), "ink")
        rect(d, (x - 2, y - 2, x + 2, y + 2), "sunshine")
        rect(d, (x - 1, y - 1, x + 1, y + 1), "orange")
    return image, d, 3 if pressed else 0


def stop_icon(d, dy: int) -> None:
    # STOP is the sole semantic-red control: one large unmistakable block.
    rect(d, (36, 41 + dy, 89, 80 + dy), "ink")
    rect(d, (40, 45 + dy, 85, 76 + dy), "tomato")
    rect(d, (44, 48 + dy, 81, 52 + dy), "orange")


def send_icon(d, dy: int) -> None:
    # A broad brass envelope and arrow, no small system emoji.
    polygon(d, [(28, 44 + dy), (92, 44 + dy), (92, 78 + dy),
                (28, 78 + dy)], "ink")
    polygon(d, [(31, 47 + dy), (89, 47 + dy), (89, 75 + dy),
                (31, 75 + dy)], "paper")
    line(d, [(31, 48 + dy), (60, 66 + dy), (89, 48 + dy)], "orange", 2)
    line(d, [(31, 74 + dy), (52, 60 + dy)], "sunshine", 2)
    line(d, [(89, 74 + dy), (68, 60 + dy)], "sunshine", 2)
    polygon(d, [(72, 36 + dy), (96, 36 + dy), (96, 58 + dy),
                (103, 58 + dy), (84, 72 + dy), (65, 58 + dy),
                (72, 58 + dy)], "sunshine")


def slow_icon(d, dy: int) -> None:
    # A single chunky cyan down chevron over three brass speed lines.
    for y, left, right in ((49 + dy, 31, 48), (59 + dy, 27, 48), (69 + dy, 23, 48)):
        rect(d, (left, y, right, y + 3), "sunshine")
    polygon(d, [(59, 39 + dy), (91, 39 + dy), (91, 49 + dy),
                (80, 49 + dy), (80, 74 + dy), (70, 74 + dy),
                (70, 49 + dy), (59, 49 + dy)], "sky")
    polygon(d, [(59, 70 + dy), (91, 70 + dy), (75, 87 + dy)], "sky")


def fast_icon(d, dy: int) -> None:
    # A single chunky cyan up chevron over three brass speed lines.
    for y, left, right in ((49 + dy, 82, 99), (59 + dy, 82, 103), (69 + dy, 82, 107)):
        rect(d, (left, y, right, y + 3), "sunshine")
    polygon(d, [(59, 76 + dy), (91, 76 + dy), (91, 66 + dy),
                (80, 66 + dy), (80, 42 + dy), (70, 42 + dy),
                (70, 66 + dy), (59, 66 + dy)], "sky")
    polygon(d, [(59, 46 + dy), (91, 46 + dy), (75, 30 + dy)], "sky")


ICONS = {"stop": stop_icon, "send": send_icon, "slow": slow_icon, "fast": fast_icon}
LABELS = {"stop": "STOP", "send": "SEND", "slow": "SLOW", "fast": "FAST"}
FILES = {
    "stop": ("btn-transport-stop-idle.png", "btn-transport-stop-pressed.png"),
    "send": ("btn-send-song-idle.png", "btn-send-song-pressed.png"),
    "slow": ("btn-transport-slow-idle.png", "btn-transport-slow-pressed.png"),
    "fast": ("btn-transport-fast-idle.png", "btn-transport-fast-pressed.png"),
}


def make_button(kind: str, filename: str, pressed: bool):
    spec = CanvasSpec(filename, 512, 512, 4)
    image, d, dy = shell(spec, pressed)
    ICONS[kind](d, dy)
    label = LABELS[kind]
    label_w = len(label) * (5 * 3 + 1) - 1
    pixel_text(d, ((128 - label_w) // 2, 91 + dy), label, "paper", scale=3, spacing=1)
    save_master(image, MASTER / f"{filename}.master.png")
    return export_discrete(image, spec, BUTTONS / filename)


def make_speed_readout():
    filename = "track-speed-readout.png"
    spec = CanvasSpec(filename, 512, 512, 4)
    image, d, _ = shell(spec, pressed=False)
    # A 268×128px blank runtime display, exact at the 4px master grid:
    # x=120, y=168, w=268, h=128 in the native 512² canvas.
    rect(d, (24, 34, 102, 81), "ink")
    rect(d, (27, 37, 99, 78), "sunshine")
    rect(d, (29, 40, 97, 75), "ink_soft")
    rect(d, (30, 42, 96, 73), "ink")
    # Two brass ticks only—no baked SPEED text or value. The engine owns the
    # complete readout inside the inset window, avoiding competing text layers.
    rect(d, (34, 52, 37, 63), "sunshine")
    rect(d, (89, 52, 92, 63), "sunshine")
    # Lower panel space intentionally remains blank.
    save_master(image, MASTER / f"{filename}.master.png")
    return export_discrete(image, spec, BUTTONS / filename)


if __name__ == "__main__":
    for kind, (idle_file, pressed_file) in FILES.items():
        idle = make_button(kind, idle_file, pressed=False)
        pressed = make_button(kind, pressed_file, pressed=True)
        validate_pair_bbox(idle, pressed, kind)
        print(f"{kind}: state alpha bbox={content_bbox(idle)}")
    speed = make_speed_readout()
    print(f"track-speed-readout.png: alpha bbox={content_bbox(speed)}; display-window=(120,168,268,128)")
    print("AR-065 true pixel-art remainder complete.")
