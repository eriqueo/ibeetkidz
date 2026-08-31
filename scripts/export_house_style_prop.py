"""Convert detailed generated Track prop art into exact-size transparent PNGs.

Only neutral checkerboard cells are removed. Optional enclosed checker cleanup is
used for genuine negative spaces such as wheel spokes and trestle bays; it is
not used on illustrated cards with parchment highlights.
"""
from collections import deque
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def is_checker(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and min(r, g, b) >= 205 and max(r, g, b) - min(r, g, b) <= 13


def clear_checker(image: Image.Image, enclosed: bool) -> Image.Image:
    output = image.convert('RGBA').copy()
    px = output.load(); w, h = output.size
    if enclosed:
        for y in range(h):
            for x in range(w):
                if is_checker(px[x, y]):
                    px[x, y] = (0, 0, 0, 0)
        return output
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()
    for x in range(w): queue.extend(((x, 0), (x, h - 1)))
    for y in range(1, h - 1): queue.extend(((0, y), (w - 1, y)))
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not is_checker(px[x, y]):
            continue
        seen.add((x, y)); px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                queue.append((nx, ny))
    return output


def clear_enclosed_dark(image: Image.Image, x: int, y: int) -> None:
    """Clear one specified inner void, without damaging separated outline pixels."""
    px = image.load(); w, h = image.size
    if not (0 <= x < w and 0 <= y < h):
        raise ValueError('void seed out of range')
    if px[x, y][3] == 0:
        return
    r, g, b, a = px[x, y]
    if max(r, g, b) > 45:
        raise ValueError(f'void seed is not dark: {px[x,y]}')
    queue: deque[tuple[int, int]] = deque([(x, y)])
    seen: set[tuple[int, int]] = set()
    while queue:
        cx, cy = queue.popleft()
        if (cx, cy) in seen: continue
        seen.add((cx, cy))
        cr, cg, cb, ca = px[cx, cy]
        if ca == 0 or max(cr, cg, cb) > 48:
            continue
        px[cx, cy] = (0, 0, 0, 0)
        for dx, dy in ((-1,0),(1,0),(0,-1),(0,1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                queue.append((nx, ny))


def main() -> None:
    if len(sys.argv) not in (6, 9):
        raise SystemExit('usage: export_house_style_prop.py source output width height enclosed [void_x void_y]')
    source = ROOT / sys.argv[1]; output = ROOT / sys.argv[2]
    width, height = int(sys.argv[3]), int(sys.argv[4])
    enclosed = sys.argv[5].lower() == 'true'
    image = clear_checker(Image.open(source), enclosed)
    if len(sys.argv) == 9:
        clear_enclosed_dark(image, int(sys.argv[6]), int(sys.argv[7]))
    box = image.getchannel('A').getbbox()
    if box is None: raise RuntimeError('no opaque art remains after cleanup')
    cropped = image.crop(box)
    # Fit intact prop to the requested rectangle with a small transparent margin.
    margin = max(3, min(width, height) // 80)
    scale = min((width - margin * 2) / cropped.width, (height - margin * 2) / cropped.height)
    size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    resized = cropped.resize(size, Image.Resampling.NEAREST)
    final = Image.new('RGBA', (width, height), (0,0,0,0))
    # World props register at their bottom edge; horizontally centre by default.
    final.alpha_composite(resized, ((width - size[0]) // 2, height - margin - size[1]))
    output.parent.mkdir(parents=True, exist_ok=True); final.save(output)
    alpha = final.getchannel('A')
    corners = [alpha.getpixel((0,0)), alpha.getpixel((width-1,0)), alpha.getpixel((0,height-1)), alpha.getpixel((width-1,height-1))]
    print(output, 'bbox=', alpha.getbbox(), 'corners=', corners)

if __name__ == '__main__':
    main()
