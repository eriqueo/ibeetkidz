"""Render all 19 AR-069 faces at literal 70px header height on cream and sky backgrounds."""
from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image, ImageDraw
from validate_ar069_controls import read_manifest, validate

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/assets/sprites/buttons"
OUT = ROOT / "design/review/ar069-all-controls-70px.png"


def scaled(name: str, content: list[float]) -> Image.Image:
    im = Image.open(SRC / name).convert("RGBA")
    im = im.crop(tuple(round(value * size) for value, size in zip(content, (im.width, im.height, im.width, im.height))))
    scale = 70 / im.height
    return im.resize((round(im.width * scale), 70), Image.Resampling.NEAREST)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUT)
    output = parser.parse_args().output
    validate()
    controls = read_manifest()["controls"]
    faces = []
    for base_only in (True, False):
        for name, control in controls.items():
            for state, source in control["states"].items():
                if (state == control["base"]) != base_only:
                    continue
                label = "SPEED" if name == "track-speed-readout" else name.split("-")[-1].upper()
                if name == "btn-send-song":
                    label = "SEND"
                faces.append((label + ("" if base_only else " (on)"), source["frame"] + ".png", control["content"]))
    cell_w, cell_h = 130, 108
    sheet = Image.new("RGBA", (cell_w * 10, cell_h * 4), (246, 230, 181, 255))
    d = ImageDraw.Draw(sheet)
    for half, bg in enumerate(((246,230,181,255), (113, 183, 222, 255))):
        y_base = half * 2 * cell_h
        d.rectangle((0, y_base, sheet.width, y_base + 2*cell_h), fill=bg)
        for j in range(10):
            d.line((j*cell_w, y_base, j*cell_w, y_base+2*cell_h), fill=(63,50,69,100), width=1)
        for i, (label, name, content) in enumerate(faces):
            row, col = divmod(i, 10)
            tile = scaled(name, content)
            x = col*cell_w + (cell_w-tile.width)//2
            y = y_base + row*cell_h + 20
            sheet.alpha_composite(tile, (x,y))
            d.text((col*cell_w+5, y_base+row*cell_h+4), label, fill=(36,28,42,255))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output)
    print(f"wrote {output}")

if __name__ == '__main__':
    main()
