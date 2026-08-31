"""Remove connected checkerboard preview backing and export one 512px UI card.

This is a fallback alpha-cleanup step after the image variation model retained
its checkerboard preview. It never alters enclosed art pixels: only light neutral
checker cells connected to a canvas edge are removed.
"""
from collections import deque
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TARGET = 512
MARGIN = 12


def is_checker_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and min(r, g, b) >= 205 and max(r, g, b) - min(r, g, b) <= 12


def clear_connected_checker(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        queue.extend(((x, 0), (x, h - 1)))
    for y in range(1, h - 1):
        queue.extend(((0, y), (w - 1, y)))
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not is_checker_pixel(px[x, y]):
            continue
        seen.add((x, y))
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                queue.append((nx, ny))
    return rgba


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: export_house_style_card.py <source.png> <output.png>")
    source = ROOT / sys.argv[1]
    output = ROOT / sys.argv[2]
    cleaned = clear_connected_checker(Image.open(source))
    box = cleaned.getchannel("A").getbbox()
    if box is None:
        raise RuntimeError("alpha cleanup removed all content")
    cropped = cleaned.crop(box)
    max_size = TARGET - MARGIN * 2
    scale = min(max_size / cropped.width, max_size / cropped.height)
    size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    resized = cropped.resize(size, Image.Resampling.NEAREST)
    final = Image.new("RGBA", (TARGET, TARGET), (0, 0, 0, 0))
    final.alpha_composite(resized, ((TARGET - size[0]) // 2, (TARGET - size[1]) // 2))
    output.parent.mkdir(parents=True, exist_ok=True)
    final.save(output)
    alpha = final.getchannel("A")
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((511, 0)), alpha.getpixel((0, 511)), alpha.getpixel((511, 511))]
    print("output", output, "bbox", alpha.getbbox(), "corners", corners)


if __name__ == "__main__":
    main()
