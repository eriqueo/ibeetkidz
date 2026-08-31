from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
# A dense stepped ground-contact shadow: subtle enough to stay behind the detailed
# wheels, with hand-drawn pixel edges rather than a blur.
img = Image.new('RGBA', (300, 44), (0,0,0,0))
d = ImageDraw.Draw(img)
# The asset contract permits only true alpha 0 outside art. Use darker opaque
# colour steps for a restrained shadow instead of a semi-transparent wash.
outer = (64, 53, 70, 255)
mid = (45, 37, 51, 255)
core = (31, 25, 37, 255)
# Uneven clusters create a terrain-contact footprint under both wheel positions.
d.polygon([(27,27),(45,20),(75,17),(115,19),(140,15),(172,18),(208,16),(246,21),(271,28),(258,33),(54,33)], fill=outer)
d.polygon([(42,27),(66,21),(110,22),(138,18),(171,21),(203,19),(239,23),(255,28),(242,31),(58,31)], fill=mid)
d.polygon([(58,27),(84,24),(119,25),(145,21),(171,24),(201,22),(225,26),(237,28),(218,30),(74,30)], fill=core)
# Broken dark contact knots directly beneath wheel zones.
for x0, x1 in ((62,94),(130,157),(197,229)):
    d.rectangle((x0, 27, x1, 30), fill=(20,16,23,255))
    d.line((x0+4, 26, x1-4, 26), fill=(75,65,83,255), width=1)
img.save(ROOT / 'src/assets/sprites/track3/shadow.png')
a=img.getchannel('A')
assert [a.getpixel((0,0)),a.getpixel((299,0)),a.getpixel((0,43)),a.getpixel((299,43))]==[0,0,0,0]
print('shadow alpha_bbox=', a.getbbox())
