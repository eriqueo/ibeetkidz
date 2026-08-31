"""Export a rich generated landscape strip to its exact Track tile canvas.

The source's light checkerboard preview is removed only where it touches an outer
edge. World-wall tiles retain opaque interiors; roof tiles keep their transparent
lower region. Both output X edges are made pixel-identical after resampling.
"""
from collections import deque
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def is_preview(pixel):
    r, g, b, a = pixel
    return a > 0 and min(r, g, b) >= 205 and max(r, g, b) - min(r, g, b) <= 13


def remove_outer_preview(image):
    image = image.convert('RGBA').copy(); px = image.load(); w, h = image.size
    q = deque(); seen = set()
    for x in range(w): q.extend(((x, 0), (x, h - 1)))
    for y in range(1, h - 1): q.extend(((0, y), (w - 1, y)))
    while q:
        x, y = q.popleft()
        if (x,y) in seen or not is_preview(px[x,y]): continue
        seen.add((x,y)); px[x,y] = (0,0,0,0)
        for dx,dy in ((-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen: q.append((nx,ny))
    return image


def main():
    if len(sys.argv) != 6:
        raise SystemExit('usage: export_house_style_tile.py source output width height mode(opaque|top)')
    src, out = ROOT/sys.argv[1], ROOT/sys.argv[2]
    width, height, mode = int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    image = remove_outer_preview(Image.open(src))
    box = image.getchannel('A').getbbox()
    if box is None: raise RuntimeError('tile source contains no art')
    crop = image.crop(box)
    final = Image.new('RGBA', (width, height), (0,0,0,0))
    if mode == 'opaque':
        resized = crop.resize((width, height), Image.Resampling.NEAREST)
        final.alpha_composite(resized)
        # if source transparency remains from a checker, fill it with a nearby
        # dark pixel band rather than creating a transparent world-wall void.
        px = final.load()
        for y in range(height):
            last = None
            for x in range(width):
                if px[x,y][3]: last=px[x,y]
                elif last: px[x,y]=last
            last = None
            for x in range(width-1,-1,-1):
                if px[x,y][3]: last=px[x,y]
                elif last: px[x,y]=last
    elif mode == 'top':
        # Art fills the intended roof depth, leaving true transparent space below.
        draw_h = max(1, height - max(14, height // 22))
        resized = crop.resize((width, draw_h), Image.Resampling.NEAREST)
        final.alpha_composite(resized, (0, 0))
    else:
        raise SystemExit('mode must be opaque or top')
    # Hard seam guarantee for scroll operation; do this after all fills.
    px=final.load()
    for y in range(height): px[width-1,y]=px[0,y]
    out.parent.mkdir(parents=True, exist_ok=True); final.save(out)
    print(out, final.getchannel('A').getbbox())

if __name__ == '__main__': main()
