from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'src/assets/sprites/track3/tunnel-lamp-1.png').convert('RGBA')
px = source.load()
for y in range(source.height):
    for x in range(source.width):
        r, g, b, a = px[x, y]
        if not a:
            continue
        # Preserve the brass housing while turning only the bright glass/core into
        # a smoked indigo lens. The outer silhouette stays bit-identical.
        if r > 165 and g > 130 and b < 150:
            px[x, y] = (62, 58, 80, a)
        elif r > 130 and g > 110 and b > 90:
            px[x, y] = (80, 72, 86, a)
source.save(ROOT / 'src/assets/sprites/track3/tunnel-lamp-0.png')
print('wrote matched unlit lamp', source.getchannel('A').getbbox())
