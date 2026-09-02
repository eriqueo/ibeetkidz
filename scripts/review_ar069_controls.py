"""Render all 19 AR-069 faces at literal 70px header height on cream and sky backgrounds."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/assets/sprites/buttons"
OUT = ROOT / "design/review/ar069-all-controls-70px.png"
FACES = (
    ("MAP", "btn-nav-map-idle.png"), ("RIDE", "btn-track-ride-idle.png"),
    ("STOP", "btn-transport-stop-idle.png"), ("CLEAR", "btn-track-clear-idle.png"),
    ("SEND", "btn-send-song-idle.png"), ("SLOW", "btn-transport-slow-idle.png"),
    ("SPEED", "track-speed-readout.png"), ("FAST", "btn-transport-fast-idle.png"),
    ("LOOP", "btn-transport-loop-idle.png"), ("TARP", "btn-track-tarp-idle.png"),
    ("MAP↓", "btn-nav-map-pressed.png"), ("RIDE↓", "btn-track-ride-pressed.png"),
    ("STOP↓", "btn-transport-stop-pressed.png"), ("CLEAR↓", "btn-track-clear-pressed.png"),
    ("SEND↓", "btn-send-song-pressed.png"), ("SLOW↓", "btn-transport-slow-pressed.png"),
    ("FAST↓", "btn-transport-fast-pressed.png"), ("LOOP↓", "btn-transport-loop-pressed.png"),
    ("TARP↓", "btn-track-tarp-seated.png"),
)


def scaled(name: str) -> Image.Image:
    im = Image.open(SRC / name).convert("RGBA")
    scale = 70 / im.height
    return im.resize((round(im.width * scale), 70), Image.Resampling.NEAREST)


def main() -> None:
    cell_w, cell_h = 130, 108
    sheet = Image.new("RGBA", (cell_w * 10, cell_h * 4), (246, 230, 181, 255))
    d = ImageDraw.Draw(sheet)
    for half, bg in enumerate(((246,230,181,255), (113, 183, 222, 255))):
        y_base = half * 2 * cell_h
        d.rectangle((0, y_base, sheet.width, y_base + 2*cell_h), fill=bg)
        for j in range(10):
            d.line((j*cell_w, y_base, j*cell_w, y_base+2*cell_h), fill=(63,50,69,100), width=1)
        for i, (label, name) in enumerate(FACES):
            row, col = divmod(i, 10)
            tile = scaled(name)
            x = col*cell_w + (cell_w-tile.width)//2
            y = y_base + row*cell_h + 20
            sheet.alpha_composite(tile, (x,y))
            d.text((col*cell_w+5, y_base+row*cell_h+4), label, fill=(36,28,42,255))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(OUT)
    print(f"wrote {OUT}")

if __name__ == '__main__':
    main()
