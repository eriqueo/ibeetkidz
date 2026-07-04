"""
punch_void.py — Programmatically stamp a consistent transparent void rect
into all 4 car-side sprites so the chalkboard sequencer mounts identically
across every car type.

Void spec (centred on 2560-wide canvas):
  x=474  y=280  w=1612  h=430
  (right=2086, bottom=710)

This rect was chosen to:
  - Be horizontally centred on 2560px canvas (474 + 1612/2 = 1280)
  - Sit in the upper-mid section of each car body (y=280 to y=710)
  - Match the proportions of the chalkboard concept art
"""

from PIL import Image, ImageDraw
import os

VOID_X = 474
VOID_Y = 280
VOID_W = 1612
VOID_H = 430

cars = ['boxcar', 'tanker', 'hopper', 'flatcar']
base = '/home/ubuntu/ibeetkidz/src/assets/sprites/cars'

for c in cars:
    path = f'{base}/car-side-{c}.png'
    img = Image.open(path).convert('RGBA')
    # Punch transparent hole
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [VOID_X, VOID_Y, VOID_X + VOID_W - 1, VOID_Y + VOID_H - 1],
        fill=(0, 0, 0, 0)
    )
    img.save(path)
    print(f'{c}: void punched at x={VOID_X} y={VOID_Y} w={VOID_W} h={VOID_H}')

print(f'\nVoid rect for Fable: x={VOID_X} y={VOID_Y} w={VOID_W} h={VOID_H}')
print(f'Canvas: 2560x1440  |  Centre x: {VOID_X + VOID_W//2}  Centre y: {VOID_Y + VOID_H//2}')
