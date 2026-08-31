from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TRACK = ROOT / 'src/assets/sprites/track3'
OUT = ROOT / 'design/review/style-reset/house-style-world-kit.png'
sheet = Image.new('RGBA', (1100, 690), (111, 184, 226, 255))
d = ImageDraw.Draw(sheet)
# Ground / tunnel composition.
d.rectangle((0, 465, 1100, 690), fill=(69, 114, 54, 255))
portal = Image.open(TRACK / 'tunnel-mouth-left.png').convert('RGBA')
portal.thumbnail((430,430), Image.Resampling.NEAREST)
sheet.alpha_composite(portal, (20, 35))
# Wheel and lamp show actual prop density beside portal.
wheel = Image.open(TRACK / 'wheel.png').convert('RGBA').resize((150,150), Image.Resampling.NEAREST)
lamp = Image.open(TRACK / 'tunnel-lamp-1.png').convert('RGBA').resize((90,120), Image.Resampling.NEAREST)
sheet.alpha_composite(wheel, (475, 100)); sheet.alpha_composite(lamp, (520, 265))
# Bridge composition, water below with deck at its required world railhead.
water = Image.open(TRACK / 'bridge-water.png').convert('RGBA').resize((560,130), Image.Resampling.NEAREST)
deck = Image.open(TRACK / 'bridge-deck-tile.png').convert('RGBA').resize((560,150), Image.Resampling.NEAREST)
pier = Image.open(TRACK / 'bridge-pier.png').convert('RGBA').resize((100,225), Image.Resampling.NEAREST)
bank_l = Image.open(TRACK / 'bridge-far-bank-left.png').convert('RGBA').resize((190,150), Image.Resampling.NEAREST)
bank_r = Image.open(TRACK / 'bridge-far-bank-right.png').convert('RGBA').resize((190,150), Image.Resampling.NEAREST)
sheet.alpha_composite(water, (540, 505)); sheet.alpha_composite(deck, (540, 340))
sheet.alpha_composite(pier, (685, 455)); sheet.alpha_composite(pier, (925, 455))
sheet.alpha_composite(bank_l, (530, 360)); sheet.alpha_composite(bank_r, (910, 360))
d.text((12, 10), 'TUNNEL / WHEEL / LAMP', fill=(251,243,217,255))
d.text((552, 310), 'TRAVERSABLE BRIDGE KIT', fill=(251,243,217,255))
OUT.parent.mkdir(parents=True, exist_ok=True); sheet.convert('RGB').save(OUT)
print(OUT)
