"""Create an internal dark-background review sheet for AR-064 tarp overlays."""
from __future__ import annotations

from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from pixel_art import PALETTE  # noqa: E402

TRACK = ROOT / "src/assets/sprites/track3"
OUT = ROOT / "design/review/ar064-tarp-remake.png"
entries = [
    ("tarp-cover-boxcar.png", "BOXCAR"),
    ("tarp-cover-tanker.png", "TANKER"),
    ("tarp-cover-hopper.png", "HOPPER"),
    ("tarp-cover-flatcar.png", "FLATCAR"),
]

cell_w, cell_h = 330, 250
sheet = Image.new("RGBA", (cell_w * 2, cell_h * 2), PALETTE["ink"])
d = ImageDraw.Draw(sheet)
for i, (filename, label) in enumerate(entries):
    art = Image.open(TRACK / filename).convert("RGBA")
    # Preserve actual low-grid blocks when enlarging the source thumbnail.
    art = art.resize((300, art.height), Image.Resampling.NEAREST)
    cell_x = (i % 2) * cell_w
    cell_y = (i // 2) * cell_h
    x = cell_x + 15
    y = cell_y + 40
    sheet.alpha_composite(art, (x, y))
    d.text((cell_x + 15, cell_y + 12), label, fill=PALETTE["paper"])
sheet.convert("RGB").save(OUT)
print(OUT)
