"""Render AR-068's required eight-angle wheel turntable proof."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WHEEL = ROOT / "src/assets/sprites/track3/wheel.png"
OUT = ROOT / "design/review/ar068-wheel-turntable.png"
ANGLES = (0, 45, 90, 135, 180, 225, 270, 315)


def main() -> None:
    wheel = Image.open(WHEEL).convert("RGBA")
    cell_w, cell_h = 180, 156
    sheet = Image.new("RGBA", (cell_w * 4, cell_h * 2), (28, 24, 38, 255))
    d = ImageDraw.Draw(sheet)
    for i, angle in enumerate(ANGLES):
        col, row = i % 4, i // 4
        left, top = col * cell_w, row * cell_h
        cx, cy = left + cell_w // 2, top + 82
        # shared exact crosshair / railhead in every cell
        d.line((left + 18, cy, left + cell_w - 18, cy), fill=(106, 74, 58, 255), width=2)
        d.line((cx, top + 28, cx, top + 132), fill=(76, 69, 100, 255), width=1)
        d.line((left + 30, cy + 38, left + cell_w - 30, cy + 38), fill=(189, 183, 173, 255), width=3)
        d.line((left + 30, cy + 41, left + cell_w - 30, cy + 41), fill=(48, 46, 58, 255), width=3)
        rotated = wheel.rotate(-angle, resample=Image.Resampling.NEAREST, expand=False)
        sheet.alpha_composite(rotated, (cx - 38, cy - 38))
        d.text((left + 8, top + 8), f"{angle}°", fill=(246, 231, 189, 255))
    sheet.convert("RGB").save(OUT)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
