"""Create a visibly pressed Track-card state from an approved idle card.

The ornate frame stays in exactly the same place for texture swapping. The face
and illustration receive a hard, darker down-light treatment rather than a blur
or a resampled shift, producing a readable physical pressed state at game scale.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def darken(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    r, g, b, a = pixel
    if not a:
        return pixel
    # Preserve hue/material hierarchy while making the card visibly seat down.
    return (r * 62 // 100, g * 62 // 100, b * 62 // 100, a)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('usage: make_house_style_pressed.py <idle.png> <pressed.png>')
    source = ROOT / sys.argv[1]
    output = ROOT / sys.argv[2]
    idle = Image.open(source).convert('RGBA')
    pressed = Image.new('RGBA', idle.size, (0, 0, 0, 0))
    # Keep the outer silhouette / alpha box exact, but darken all materials.
    pressed.putdata([darken(px) for px in idle.getdata()])
    # Hard inset shade within the card face makes the physical press legible.
    shade = Image.new('RGBA', idle.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(shade)
    d.rectangle((78, 94, 433, 374), fill=(43, 36, 64, 72))
    pressed.alpha_composite(shade)
    # A crisp brass lower-edge catch preserves the seated mechanical impression.
    d = ImageDraw.Draw(pressed)
    d.line((98, 451, 414, 451), fill=(118, 77, 21, 255), width=3)
    output.parent.mkdir(parents=True, exist_ok=True)
    pressed.save(output)
    if idle.getchannel('A').getbbox() != pressed.getchannel('A').getbbox():
        raise RuntimeError('pressed state changed alpha registration')
    print(output, idle.getchannel('A').getbbox())


if __name__ == '__main__':
    main()
