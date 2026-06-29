"""
Workshop base plate generator — 2560×1440, 16-bit pixel art style.
Warm-golden 4pm palette. Pure scenery: packed-dirt ground, single
horizontal track, shed wall / forest-edge background. Zero instruments,
buttons, panels, or trains.

Output: src/assets/scenes-v2/workshop-baseplate.png
"""

from PIL import Image, ImageDraw
import random
import os

# ── Canvas ────────────────────────────────────────────────────────────────────
W, H = 2560, 1440
PIXEL = 4          # "pixel art" block size — every mark is a multiple of this

# ── Palette ───────────────────────────────────────────────────────────────────
SKY_TOP        = (100, 140, 200)
SKY_HORIZON    = (220, 170,  90)
CLOUD_LIGHT    = (255, 240, 200)
CLOUD_SHADOW   = (180, 155, 110)

FOREST_DARK    = ( 30,  70,  35)
FOREST_MID     = ( 55, 105,  50)
FOREST_LIGHT   = ( 85, 145,  65)
FOREST_TRUNK   = ( 80,  55,  30)

SHED_WALL      = (160, 120,  70)
SHED_PLANK     = (140, 100,  55)
SHED_HIGHLIGHT = (190, 150,  90)
SHED_SHADOW    = ( 90,  65,  35)
SHED_ROOF      = ( 60,  40,  25)

GROUND_BASE    = (155, 120,  65)
GROUND_DARK    = (115,  85,  45)
GROUND_LIGHT   = (185, 150,  90)
GRASS_A        = ( 90, 130,  45)
GRASS_B        = ( 70, 105,  35)

RAIL_STEEL     = (175, 180, 190)
RAIL_SHADOW    = ( 80,  85,  95)
TIE_WOOD       = (110,  70,  35)
TIE_SHADOW     = ( 75,  45,  20)
BALLAST_A      = (135, 125, 110)
BALLAST_B      = (105,  95,  80)

# ── Helpers ───────────────────────────────────────────────────────────────────

def snap(n):
    return (int(n) // PIXEL) * PIXEL

def rect(draw, x, y, w, h, color):
    x, y, w, h = snap(x), snap(y), max(PIXEL, snap(w)), max(PIXEL, snap(h))
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)

# ── Sky gradient ──────────────────────────────────────────────────────────────

def draw_sky(draw, horizon_y):
    for row in range(0, horizon_y, PIXEL):
        t = row / horizon_y
        r = int(SKY_TOP[0] + (SKY_HORIZON[0] - SKY_TOP[0]) * t)
        g = int(SKY_TOP[1] + (SKY_HORIZON[1] - SKY_TOP[1]) * t)
        b = int(SKY_TOP[2] + (SKY_HORIZON[2] - SKY_TOP[2]) * t)
        draw.rectangle([0, row, W - 1, row + PIXEL - 1], fill=(r, g, b))

# ── Clouds ────────────────────────────────────────────────────────────────────

def draw_cloud(draw, cx, cy, scale=1.0):
    s = PIXEL * scale
    blobs = [
        (0, 0, 10, 5),
        (-6, 2, 8, 4),
        (6, 2, 8, 4),
        (-3, -3, 6, 4),
        (3, -4, 7, 4),
    ]
    for bx, by, bw, bh in blobs:
        x = cx + bx * s
        y = cy + by * s
        w = bw * s
        h = bh * s
        rect(draw, x, y, w, h, CLOUD_LIGHT)
    for bx, by, bw, bh in blobs:
        x = cx + bx * s
        y = cy + (by + bh - 1) * s
        w = bw * s
        rect(draw, x, y, w, PIXEL * 2, CLOUD_SHADOW)

# ── Shed wall (drawn first — behind trees) ────────────────────────────────────

def draw_shed(draw, shed_top_y, shed_bottom_y):
    shed_h = shed_bottom_y - shed_top_y
    rect(draw, 0, shed_top_y, W, shed_h, SHED_WALL)

    plank_h = PIXEL * 7
    for row in range(shed_top_y, shed_bottom_y, plank_h * 2):
        rect(draw, 0, row, W, plank_h, SHED_PLANK)
        if row + plank_h < shed_bottom_y:
            rect(draw, 0, row + plank_h, W, plank_h, SHED_HIGHLIGHT)

    # Vertical support beams
    for bx in range(0, W, snap(280)):
        rect(draw, bx, shed_top_y, PIXEL * 4, shed_h, SHED_SHADOW)

    # Eave shadow
    rect(draw, 0, shed_top_y, W, PIXEL * 5, SHED_SHADOW)
    rect(draw, 0, shed_top_y, W, PIXEL * 2, SHED_ROOF)

# ── Forest tree line (drawn in front of shed) ─────────────────────────────────

def draw_tree(draw, tx, ground_y, height):
    trunk_w = max(PIXEL * 3, snap(height * 0.10))
    trunk_h = snap(height * 0.30)
    canopy_w = max(PIXEL * 8, snap(height * 0.60))
    canopy_h = snap(height * 0.75)

    trunk_x = tx - trunk_w // 2
    trunk_y = ground_y - trunk_h
    canopy_x = tx - canopy_w // 2
    canopy_y = ground_y - trunk_h - canopy_h

    rect(draw, trunk_x, trunk_y, trunk_w, trunk_h, FOREST_TRUNK)
    rect(draw, canopy_x, canopy_y, canopy_w, canopy_h, FOREST_MID)
    # sunlit left edge
    rect(draw, canopy_x, canopy_y, PIXEL * 3, canopy_h, FOREST_LIGHT)
    # dark right shadow
    rect(draw, canopy_x + canopy_w - PIXEL * 3, canopy_y, PIXEL * 3, canopy_h, FOREST_DARK)
    # sunlit top highlight
    rect(draw, canopy_x, canopy_y, canopy_w, PIXEL * 3, FOREST_LIGHT)

def draw_forest(draw, horizon_y):
    random.seed(42)
    x = 0
    while x < W + snap(200):
        height = random.randint(snap(160), snap(300))
        spacing = random.randint(snap(55), snap(110))
        draw_tree(draw, x, horizon_y, height)
        x += spacing

# ── Ground ────────────────────────────────────────────────────────────────────

def draw_ground(draw, ground_y):
    ground_h = H - ground_y
    rect(draw, 0, ground_y, W, ground_h, GROUND_BASE)

    random.seed(7)
    for _ in range(22):
        ry = ground_y + random.randint(PIXEL * 3, ground_h - PIXEL * 6)
        rw = random.randint(snap(80), snap(320))
        rx = random.randint(0, W - rw)
        rect(draw, rx, ry, rw, PIXEL * 2, GROUND_DARK)

    for _ in range(14):
        py = ground_y + random.randint(PIXEL * 5, ground_h - PIXEL * 8)
        pw = random.randint(snap(40), snap(130))
        px2 = random.randint(0, W - pw)
        rect(draw, px2, py, pw, PIXEL, GROUND_LIGHT)

    for _ in range(70):
        gx = random.randint(0, W - PIXEL * 5)
        gy = ground_y + random.randint(0, ground_h - PIXEL * 8)
        color = GRASS_A if random.random() > 0.4 else GRASS_B
        rect(draw, gx, gy, PIXEL, PIXEL * 4, color)
        rect(draw, gx + PIXEL * 2, gy + PIXEL, PIXEL, PIXEL * 3, color)

# ── Railway track ─────────────────────────────────────────────────────────────

def draw_track(draw, track_y):
    bed_h = PIXEL * 18
    bed_y = track_y - bed_h // 2

    # Ballast bed
    rect(draw, 0, bed_y, W, bed_h, BALLAST_A)
    random.seed(13)
    for _ in range(40):
        bx = random.randint(0, W - snap(24))
        by = bed_y + random.randint(0, bed_h - PIXEL)
        bw = random.randint(snap(6), snap(20))
        rect(draw, bx, by, bw, PIXEL * 2, BALLAST_B)

    # Ties (sleepers) — thicker, more visible
    tie_spacing = snap(72)
    tie_w = snap(60)
    tie_h = PIXEL * 7
    for tx in range(0, W, tie_spacing):
        tie_x = tx + snap(6)
        tie_y = track_y - tie_h // 2
        rect(draw, tie_x, tie_y, tie_w, tie_h, TIE_WOOD)
        rect(draw, tie_x, tie_y + tie_h - PIXEL * 2, tie_w, PIXEL * 2, TIE_SHADOW)

    # Rails — two thick parallel bars, clearly separated
    rail_gap = snap(22)   # gap from track centre to inner edge of each rail
    rail_h = PIXEL * 6
    for rail_y in [track_y - rail_gap - rail_h, track_y + rail_gap]:
        # dark shadow under rail (gives 3D lift)
        rect(draw, 0, rail_y + rail_h - PIXEL * 2, W, PIXEL * 2, RAIL_SHADOW)
        # rail body
        rect(draw, 0, rail_y, W, rail_h - PIXEL * 2, RAIL_STEEL)
        # bright highlight on top edge
        rect(draw, 0, rail_y, W, PIXEL * 2, (210, 215, 225))

# ── Main ──────────────────────────────────────────────────────────────────────

def generate():
    img = Image.new("RGB", (W, H), SKY_TOP)
    draw = ImageDraw.Draw(img)

    # Layout — generous sky, shed wall behind trees, track in lower third
    horizon_y   = snap(int(H * 0.50))   # where sky meets ground/shed
    shed_top_y  = snap(int(H * 0.18))   # eave of shed — more sky above
    shed_bot_y  = snap(int(H * 0.50))   # shed meets ground
    track_y     = snap(int(H * 0.62))   # centre of track

    # Layer order: sky → clouds → shed → forest → ground → track
    draw_sky(draw, horizon_y)
    draw_cloud(draw, snap(300),  snap(80),  scale=3.2)
    draw_cloud(draw, snap(900),  snap(55),  scale=2.4)
    draw_cloud(draw, snap(1600), snap(90),  scale=2.9)
    draw_cloud(draw, snap(2200), snap(65),  scale=2.1)
    draw_shed(draw, shed_top_y, shed_bot_y)
    draw_forest(draw, horizon_y)
    draw_ground(draw, horizon_y)
    draw_track(draw, track_y)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "scenes-v2")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "workshop-baseplate.png")
    img.save(out_path, "PNG")
    print(f"Saved: {out_path}  ({W}×{H})")

if __name__ == "__main__":
    generate()
