from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TRACK = ROOT / 'src/assets/sprites/track3'
OUT = ROOT / 'design/review/style-reset/house-style-tarps.png'
items = [
    ('BOXCAR', 'car-boxcar.png', 'tarp-cover-boxcar.png'),
    ('TANKER', 'car-tanker.png', 'tarp-cover-tanker.png'),
    ('HOPPER', 'car-hopper.png', 'tarp-cover-hopper.png'),
    ('FLATCAR', 'car-flatcar.png', 'tarp-cover-flatcar.png'),
]
width, height = 660, 480
sheet = Image.new('RGBA', (width, height), (31, 29, 34, 255))
d = ImageDraw.Draw(sheet)
for i, (label, car_file, tarp_file) in enumerate(items):
    car = Image.open(TRACK / car_file).convert('RGBA')
    tarp = Image.open(TRACK / tarp_file).convert('RGBA')
    group = Image.new('RGBA', car.size, (0, 0, 0, 0))
    group.alpha_composite(car)
    group.alpha_composite(tarp)
    group.thumbnail((280, 170), Image.Resampling.NEAREST)
    x = 20 + (i % 2) * 325
    y = 32 + (i // 2) * 230
    sheet.alpha_composite(group, (x, y + 25))
    d.text((x, y), label, fill=(251, 243, 217, 255))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.convert('RGB').save(OUT)
print(OUT)
