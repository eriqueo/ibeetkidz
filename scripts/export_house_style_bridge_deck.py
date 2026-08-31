"""Export rich trestle art as the 640×170 transparent AR-067 deck tile."""
from pathlib import Path
import sys
from PIL import Image
from export_house_style_tile import remove_outer_preview

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) != 3:
    raise SystemExit('usage: export_house_style_bridge_deck.py source.png output.png')
source, output = ROOT/sys.argv[1], ROOT/sys.argv[2]
image = remove_outer_preview(Image.open(source))
box = image.getchannel('A').getbbox()
if box is None: raise RuntimeError('no deck art')
crop = image.crop(box)
# The trestle source is deliberately stretched only along its scrolling axis;
# full 170px height retains detailed deck/brace reading while rails touch y=0.
resized = crop.resize((640, 170), Image.Resampling.NEAREST)
final = Image.new('RGBA', (640, 170), (0,0,0,0))
final.alpha_composite(resized)
# The model does not know tile boundaries. Make edge pixels identical only where
# both source edges carry the same layer role; transparent bays remain untouched.
px=final.load()
for y in range(170):
    left, right = px[0,y], px[639,y]
    if left[3] == 0 or right[3] == 0:
        px[0,y] = px[639,y] = (0,0,0,0)
    else:
        px[639,y] = px[0,y]
output.parent.mkdir(parents=True, exist_ok=True); final.save(output)
print(output, final.getchannel('A').getbbox())
