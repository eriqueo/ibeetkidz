"""Export the hand-drawn tunnel-floor source as the exact in-engine tile.

The source is a high-resolution presentation image. This exporter crops the useful
stone/ballast field, uses nearest-neighbour resampling only, and locks the last
edge pixels to the first so Phaser's TileSprite has no visible wrap seam.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/review/style-reset/tunnel-floor-house-style-source.png"
OUTPUT = ROOT / "src/assets/sprites/track3/tunnel-floor.png"

# Final world slot: begins below the existing railhead and fills the screen to
# the scene bottom.  The crop omits the generator's black preview bands and
# accidental rail, retaining only the close masonry and ballast field.
W, H = 640, 406
CROP = (384, 380, 1920, 1355)  # x0, y0, x1, y1 — exact 1536×975 source field
SEAM_PX = 4


def main() -> None:
    src = Image.open(SOURCE).convert("RGBA")
    tile = src.crop(CROP).resize((W, H), Image.Resampling.NEAREST)
    px = tile.load()
    # Continuous wrap: the final seam columns use the same edge values as the
    # opening columns. This is a deterministic export correction, not visual
    # filtering; all interior image pixels remain untouched hard-edged art.
    for y in range(H):
        for x in range(SEAM_PX):
            px[W - SEAM_PX + x, y] = px[x, y]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    tile.save(OUTPUT)
    print(f"wrote {OUTPUT.relative_to(ROOT)} {tile.size}")


if __name__ == "__main__":
    main()
