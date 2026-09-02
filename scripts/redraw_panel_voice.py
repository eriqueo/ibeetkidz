"""AR-051A: body-only My Voice machine redraw.

The live control zones are deliberately never painted over:
  record   x=438..1278, y=155..317
  status   centre y=366
  FX rack  x=193..1345, y=413..882
  outcomes x=161..754 and x=799..1387, y=905..1036

This script retains the production recess frames already measured by VoiceToolPanel,
and redraws only the recorder-machine body material and identity outside/around them.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'src/assets/sprites/panels/panel-voice.png'

# Paint only in these body-only regions: the left record-pictorial bay and
# non-interactive timber/steel service strips. No labels, engine controls,
# effect icons, title, close, or DONE are baked into the plate.
DARK = (20, 18, 25, 255)
OUTLINE = (29, 21, 31, 255)
STEEL_DARK = (47, 48, 56, 255)
STEEL = (69, 70, 78, 255)
STEEL_LIGHT = (111, 113, 122, 255)
BRASS_DARK = (104, 64, 22, 255)
BRASS = (178, 112, 40, 255)
BRASS_LIGHT = (238, 179, 74, 255)
WOOD_DARK = (69, 34, 19, 255)
WOOD = (126, 68, 30, 255)
WOOD_LIGHT = (172, 98, 43, 255)
COPPER = (146, 68, 41, 255)


def rect(d: ImageDraw.ImageDraw, box, fill, outline=None, width=1):
    d.rectangle(box, fill=fill, outline=outline, width=width)


def bolt(d: ImageDraw.ImageDraw, x: int, y: int, r: int = 7) -> None:
    d.ellipse((x-r, y-r, x+r, y+r), fill=OUTLINE)
    d.ellipse((x-r+2, y-r+2, x+r-2, y+r-2), fill=BRASS_DARK)
    d.rectangle((x-r+3, y-r+3, x+1, y+1), fill=BRASS_LIGHT)
    d.rectangle((x+2, y+2, x+r-2, y+r-2), fill=BRASS)


def grain(d: ImageDraw.ImageDraw, x0: int, y0: int, x1: int, y1: int, seed: int) -> None:
    # Fixed, short hard-pixel wood grain; it never enters interactive recesses.
    for i in range(12):
        y = y0 + 12 + ((i * 31 + seed) % max(18, y1-y0-20))
        x = x0 + 8 + ((i * 47 + seed) % max(22, x1-x0-38))
        length = 17 + ((i * 17 + seed) % 37)
        d.line((x, y, min(x + length, x1 - 7), y), fill=WOOD_DARK, width=2)
        if i % 3 == 0:
            d.point((min(x + length + 2, x1 - 5), y-1), fill=WOOD_LIGHT)


def cable(d: ImageDraw.ImageDraw, points, color=COPPER, width=5) -> None:
    # angular, hard-pixel cable route, preserving the toy-machine language
    d.line(points, fill=OUTLINE, width=width+2, joint='curve')
    d.line(points, fill=color, width=width, joint='curve')


def redraw() -> None:
    im = Image.open(PATH).convert('RGBA')
    d = ImageDraw.Draw(im)

    # Reinforce the recorder's left service pedestal (x=120..188) with warm
    # timber insets, brass data lugs, and short waveform vents. This converts
    # the neutral panel side from a flat board into a dedicated voice machine
    # without intruding on the FX grid beginning at x=193.
    for y0, y1, seed in ((420, 616, 13), (644, 840, 29)):
        rect(d, (123, y0, 185, y1), WOOD_DARK, OUTLINE, 3)
        rect(d, (128, y0+5, 180, y1-5), WOOD, BRASS_DARK, 2)
        grain(d, 128, y0+5, 180, y1-5, seed)
        for yy in range(y0+30, y1-20, 42):
            d.rectangle((143, yy, 148, yy+18), fill=OUTLINE)
            d.rectangle((153, yy-7, 158, yy+25), fill=OUTLINE)
            d.rectangle((163, yy-15, 168, yy+33), fill=OUTLINE)
        bolt(d, 132, y0+16, 5); bolt(d, 176, y1-16, 5)

    # Matching right-side service pedestal stays outside the FX rack end x=1345.
    for y0, y1, seed in ((420, 616, 41), (644, 840, 67)):
        rect(d, (1351, y0, 1413, y1), WOOD_DARK, OUTLINE, 3)
        rect(d, (1356, y0+5, 1408, y1-5), WOOD, BRASS_DARK, 2)
        grain(d, 1356, y0+5, 1408, y1-5, seed)
        for yy in range(y0+30, y1-20, 42):
            d.rectangle((1368, yy, 1373, yy+18), fill=OUTLINE)
            d.rectangle((1378, yy-7, 1383, yy+25), fill=OUTLINE)
            d.rectangle((1388, yy-15, 1393, yy+33), fill=OUTLINE)
        bolt(d, 1360, y0+16, 5); bolt(d, 1404, y1-16, 5)

    # The microphone is a pictorial mount left of the record hit bay (x<438).
    # It receives a solid steel foot, copper cable and mechanical side lugs;
    # the actual HOLD TO RECORD control remains entirely engine-drawn in its
    # measured record rectangle.
    rect(d, (239, 304, 420, 334), DARK, OUTLINE, 3)
    rect(d, (250, 309, 409, 326), STEEL_DARK, STEEL_LIGHT, 1)
    for x in (274, 327, 380):
        bolt(d, x, 317, 5)
    cable(d, [(265, 292), (235, 292), (235, 350), (270, 350)], width=4)
    # Brass jack sockets in the empty service margin; outside status/record.
    for x in (260, 304, 348, 392):
        d.ellipse((x-9, 344, x+9, 362), fill=OUTLINE)
        d.ellipse((x-6, 347, x+6, 359), fill=BRASS_DARK)
        d.rectangle((x-2, 349, x+3, 356), fill=BRASS_LIGHT)

    # Give the horizontal status rail a recognisable recorder-console hardware
    # language only beyond the centred live text reading zone. No baked status.
    for x in (196, 230, 1307, 1341):
        rect(d, (x, 358, x+13, 382), STEEL_DARK, OUTLINE, 2)
        d.line((x+3, 361, x+3, 379), fill=STEEL_LIGHT, width=1)
    for x in (184, 1362):
        bolt(d, x, 367, 5)

    # Add hard-pixel brass feet to the body only in the lower noninteractive
    # apron underneath outcome bays. The shared DONE control is mounted outside
    # this plate by BaseToolPanel and is never painted here.
    for x in (205, 338, 1198, 1331):
        rect(d, (x, 1047, x+58, 1068), OUTLINE)
        rect(d, (x+5, 1051, x+53, 1064), BRASS_DARK)
        d.line((x+9, 1054, x+48, 1054), fill=BRASS_LIGHT, width=2)

    # A lower recorder routing trunk gives the machine its own physical job:
    # copper signal conduits and brass plugs live only in the noninteractive
    # apron below the two engine-owned outcome bays (y > 1036).
    rect(d, (450, 1044, 1086, 1067), OUTLINE)
    rect(d, (456, 1048, 1080, 1063), STEEL_DARK, STEEL_LIGHT, 1)
    for x in (492, 612, 732, 852, 972, 1050):
        d.rectangle((x-13, 1051, x+13, 1060), fill=BRASS_DARK)
        d.rectangle((x-9, 1053, x+8, 1057), fill=BRASS)
        d.point((x-7, 1053), fill=BRASS_LIGHT)
    cable(d, [(458, 1046), (438, 1046), (438, 1060), (422, 1060)], width=3)
    cable(d, [(1080, 1046), (1100, 1046), (1100, 1060), (1116, 1060)], width=3)

    # Enforce hard alpha around the complete silhouette; the original plate
    # already has authored alpha and this never introduces a soft matte.
    px = im.load()
    for x, y in ((0,0), (1535,0), (0,1151), (1535,1151)):
        px[x, y] = (0, 0, 0, 0)
    im.save(PATH)
    print(f'wrote {PATH}')


if __name__ == '__main__':
    redraw()
