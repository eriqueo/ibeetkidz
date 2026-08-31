from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) != 3:
    raise SystemExit('usage: mirror_track_asset.py <source.png> <output.png>')
source = Image.open(ROOT / sys.argv[1]).convert('RGBA')
mirrored = source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
mirrored.save(ROOT / sys.argv[2])
print(ROOT / sys.argv[2], mirrored.size)
