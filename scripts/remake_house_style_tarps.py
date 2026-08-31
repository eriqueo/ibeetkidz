"""Detailed 1× Track tarp overlays for AR-064.

These overlays preserve the existing detailed car bodies, wheels, nameplates and
couplers. Each is drawn directly on the final 300px car grid to match the dense
Track vehicle pixel scale; all surrounding pixels remain true alpha 0.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/sprites/track3'

C = {
    'clear': (0, 0, 0, 0),
    'outline': (37, 27, 37, 255),
    'deep': (16, 40, 92, 255),
    'shade': (25, 59, 132, 255),
    'blue': (42, 94, 190, 255),
    'light': (82, 143, 228, 255),
    'shine': (142, 193, 245, 255),
    'rope_dark': (102, 63, 25, 255),
    'rope': (191, 135, 56, 255),
    'brass_dark': (116, 77, 21, 255),
    'brass': (235, 180, 66, 255),
}


def pixel_line(d, points, color, width=1):
    d.line(points, fill=C[color], width=width, joint='curve')


def eyelet(d, x, y):
    d.rectangle((x - 4, y - 3, x + 4, y + 3), fill=C['outline'])
    d.rectangle((x - 3, y - 2, x + 3, y + 2), fill=C['brass_dark'])
    d.rectangle((x - 2, y - 1, x + 2, y + 1), fill=C['brass'])
    d.point((x, y), fill=C['outline'])


def rope(d, x0, y0, x1, y1):
    pixel_line(d, [(x0, y0), ((x0 + x1) // 2, y0 + 6), (x1, y1)], 'outline', 3)
    pixel_line(d, [(x0, y0), ((x0 + x1) // 2, y0 + 6), (x1, y1)], 'rope', 1)
    # compact knot
    d.rectangle((x1 - 3, y1 - 2, x1 + 2, y1 + 2), fill=C['outline'])
    d.rectangle((x1 - 2, y1 - 1, x1 + 1, y1 + 1), fill=C['rope'])


def apply_folds(d, x0, y0, x1, lower_y):
    """Irregular vertical fabric folds, each finished in crisp pixel clusters."""
    positions = [x0 + 13, x0 + 31, x0 + 54, x0 + 82, x0 + 110, x0 + 139, x0 + 167, x0 + 193, x0 + 220, x1 - 12]
    for i, x in enumerate(positions):
        bottom = lower_y[i % len(lower_y)]
        lean = (-2, -1, 1, 2)[i % 4]
        pixel_line(d, [(x, y0 + 5), (x + lean, bottom - 8)], 'deep', 4)
        pixel_line(d, [(x + 1, y0 + 5), (x + lean + 1, bottom - 9)], 'blue', 1)
        if i % 2 == 0:
            pixel_line(d, [(x + 4, y0 + 8), (x + lean + 5, bottom - 14)], 'light', 1)
    # staggered lower hem: a visible physical seam, not translucent blue filter.
    for x in range(x0 + 5, x1 - 3, 11):
        d.rectangle((x, min(lower_y) - 2, x + 7, min(lower_y) + 1), fill=C['deep'])
        d.line((x + 1, min(lower_y) - 2, x + 6, min(lower_y) - 2), fill=C['light'])


def cut_nameplate(image, box):
    d = ImageDraw.Draw(image)
    d.rectangle(box, fill=C['clear'])


def boxcar():
    img = Image.new('RGBA', (300, 190), C['clear']); d = ImageDraw.Draw(img)
    contour = [(19, 33), (33, 25), (265, 25), (280, 34), (280, 126),
               (273, 133), (252, 130), (235, 138), (210, 132), (187, 139),
               (160, 131), (137, 138), (109, 131), (83, 138), (58, 131),
               (37, 135), (19, 126)]
    d.polygon(contour, fill=C['outline'])
    inner = [(23, 37), (35, 29), (262, 29), (276, 37), (276, 123),
             (269, 129), (252, 126), (235, 134), (210, 128), (187, 135),
             (160, 127), (137, 134), (109, 127), (83, 134), (58, 127),
             (38, 131), (23, 123)]
    d.polygon(inner, fill=C['blue'])
    d.rectangle((34, 30, 264, 35), fill=C['light'])
    d.line((35, 30, 261, 30), fill=C['shine'])
    apply_folds(d, 23, 32, 276, [129, 126, 133, 128, 134, 127, 132, 128, 133, 127])
    # Preserve the prominent livery plate through a dressed fabric aperture.
    cut_nameplate(img, (142, 67, 253, 115))
    d = ImageDraw.Draw(img)
    d.rectangle((139, 64, 256, 67), fill=C['outline']); d.rectangle((139, 115, 256, 118), fill=C['outline'])
    d.line((142, 65, 253, 65), fill=C['rope'])
    for x in (33, 67, 101, 135, 261):
        eyelet(d, x, 127); rope(d, x, 129, x + (5 if x % 2 else -5), 145)
    return img


def tanker():
    img = Image.new('RGBA', (300, 170), C['clear']); d = ImageDraw.Draw(img)
    contour = [(21, 58), (29, 43), (45, 32), (68, 24), (232, 24), (256, 32),
               (272, 44), (280, 58), (280, 104), (271, 112), (249, 108),
               (227, 114), (203, 108), (178, 114), (151, 107), (124, 114),
               (98, 108), (73, 114), (50, 108), (29, 112), (21, 104)]
    d.polygon(contour, fill=C['outline'])
    d.ellipse((25, 27, 276, 111), fill=C['shade'])
    d.ellipse((29, 31, 272, 107), fill=C['blue'])
    d.rectangle((38, 37, 262, 44), fill=C['light'])
    d.line((49, 34, 245, 34), fill=C['shine'])
    apply_folds(d, 31, 32, 270, [108, 106, 111, 107, 111, 106, 110, 107, 111, 106])
    cut_nameplate(img, (139, 64, 255, 108))
    d = ImageDraw.Draw(img)
    d.rectangle((136, 61, 258, 64), fill=C['outline']); d.rectangle((136, 108, 258, 111), fill=C['outline'])
    for x in (35, 72, 109, 132, 263):
        eyelet(d, x, 109); rope(d, x, 111, x + 5, 124)
    return img


def hopper():
    img = Image.new('RGBA', (300, 190), C['clear']); d = ImageDraw.Draw(img)
    contour = [(25, 29), (274, 29), (268, 75), (251, 123), (228, 145),
               (72, 145), (49, 123), (32, 75)]
    d.polygon(contour, fill=C['outline'])
    inner = [(30, 34), (269, 34), (263, 74), (247, 119), (225, 140),
             (75, 140), (53, 119), (37, 74)]
    d.polygon(inner, fill=C['blue'])
    d.rectangle((31, 34, 268, 40), fill=C['light'])
    d.line((34, 34, 266, 34), fill=C['shine'])
    apply_folds(d, 34, 38, 266, [140, 135, 140, 136, 140, 136, 140, 136, 140, 136])
    cut_nameplate(img, (141, 74, 255, 118))
    d = ImageDraw.Draw(img)
    d.rectangle((138, 71, 258, 74), fill=C['outline']); d.rectangle((138, 118, 258, 121), fill=C['outline'])
    for x, y in ((49, 121), (84, 137), (119, 140), (135, 128), (263, 121)):
        eyelet(d, x, y); rope(d, x, y + 2, x + 6, y + 14)
    return img


def flatcar():
    img = Image.new('RGBA', (300, 110), C['clear']); d = ImageDraw.Draw(img)
    # Rolled low tarp bundle retains the flatcar's shallow silhouette and clear wheels.
    contour = [(25, 39), (39, 28), (259, 28), (275, 40), (275, 70), (264, 79),
               (45, 79), (25, 69)]
    d.polygon(contour, fill=C['outline'])
    d.polygon([(29, 42), (42, 32), (256, 32), (271, 42), (271, 67), (261, 75),
               (48, 75), (29, 66)], fill=C['blue'])
    d.rectangle((40, 34, 258, 40), fill=C['light'])
    d.line((42, 34, 254, 34), fill=C['shine'])
    for x in range(45, 258, 19):
        pixel_line(d, [(x, 39), (x - 4, 72)], 'deep', 3)
        pixel_line(d, [(x + 1, 41), (x - 2, 69)], 'light', 1)
    d.rectangle((38, 72, 262, 77), fill=C['deep'])
    d.line((42, 72, 258, 72), fill=C['light'])
    # A low aperture leaves the existing centre nameplate readable.
    cut_nameplate(img, (143, 43, 254, 70))
    d = ImageDraw.Draw(img)
    for x in (48, 87, 126, 262):
        eyelet(d, x, 75); rope(d, x, 77, x + 5, 90)
    return img


if __name__ == '__main__':
    outputs = {
        'tarp-cover-boxcar.png': boxcar(),
        'tarp-cover-tanker.png': tanker(),
        'tarp-cover-hopper.png': hopper(),
        'tarp-cover-flatcar.png': flatcar(),
    }
    for name, img in outputs.items():
        img.save(OUT / name)
        a = img.getchannel('A')
        corners = [a.getpixel((0, 0)), a.getpixel((img.width - 1, 0)), a.getpixel((0, img.height - 1)), a.getpixel((img.width - 1, img.height - 1))]
        assert corners == [0, 0, 0, 0], (name, corners)
        print(name, 'bbox=', a.getbbox(), 'corners=', corners)
