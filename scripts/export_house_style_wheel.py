"""Export a dense 16-bit wheel with its hub registered at exact source (38,38)."""
from pathlib import Path
from PIL import Image
from export_house_style_prop import clear_checker

ROOT = Path(__file__).resolve().parents[1]
source = clear_checker(Image.open(ROOT / 'design/review/style-reset/wheel-house-style-source.png'), True)
box = source.getchannel('A').getbbox()
if box is None: raise RuntimeError('no wheel content')
crop = source.crop(box)
# Make a square source crop around its true visual centre before exact centring.
side = max(crop.width, crop.height)
square = Image.new('RGBA', (side, side), (0,0,0,0))
square.alpha_composite(crop, ((side - crop.width)//2, (side - crop.height)//2))
# 74px visible wheel inside a 76px source leaves transparent corner margin and
# puts the visual hub at source coordinate (38,38), used by TrackV3Scene.
wheel = square.resize((74, 74), Image.Resampling.NEAREST)
final = Image.new('RGBA', (76,76), (0,0,0,0)); final.alpha_composite(wheel, (1,1))
a = final.getchannel('A')
assert [a.getpixel((0,0)),a.getpixel((75,0)),a.getpixel((0,75)),a.getpixel((75,75))] == [0,0,0,0]
final.save(ROOT / 'src/assets/sprites/track3/wheel.png')
print('wheel hub=(38,38) alpha_bbox=', a.getbbox())
