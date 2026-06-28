"""
Slice the Workshop background art into individual button sprites.
Outputs to /home/ubuntu/ibeetkidz/src/assets/scenes-v2-sliced/
"""
from PIL import Image
import os

SRC = "/home/ubuntu/ibeetkidz/src/assets/scenes-v2/workshop-scene-clean.png"
OUT = "/home/ubuntu/ibeetkidz/src/assets/scenes-v2-sliced"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC)
W, H = img.size
print(f"Source: {W}x{H}")

def crop(name, nx, ny, nw, nh, pad=0):
    """Crop a region by normalized coords and save as PNG with transparency."""
    x = int(nx * W) - pad
    y = int(ny * H) - pad
    w = int(nw * W) + pad * 2
    h = int(nh * H) + pad * 2
    # Clamp
    x, y = max(0, x), max(0, y)
    x2, y2 = min(W, x + w), min(H, y + h)
    region = img.crop((x, y, x2, y2))
    path = os.path.join(OUT, f"{name}.png")
    region.save(path)
    print(f"  {name}: ({x},{y}) {x2-x}x{y2-y} → {path}")
    return region

def crop_center(name, cx, cy, nw, nh, pad=8):
    """Crop centered on (cx,cy) with given normalized width/height."""
    nx = cx - nw / 2
    ny = cy - nh / 2
    return crop(name, nx, ny, nw, nh, pad=pad)

print("\n=== TOOLBAR ICONS (9 icons) ===")
# Measured icon centres at y≈0.035, c0=0.295, c1=0.858
# Each icon is about 0.060 wide, 0.10 tall
toolbar_xs = [0.295, 0.362, 0.429, 0.496, 0.563, 0.630, 0.697, 0.764, 0.858]
toolbar_names = [
    "icon-notepad",    # 0 new car
    "icon-musicnote",  # 1 magic pad
    "icon-speaker",    # 2 sound pads
    "icon-waveform",   # 3 my voice
    "icon-grid",       # 4 beat maker
    "icon-arrows",     # 5 send to yard
    "icon-star",       # 6 surprise
    "icon-magnifier",  # 7 voice keys
    "icon-exit",       # 8 exit
]
for name, cx in zip(toolbar_names, toolbar_xs):
    crop_center(name, cx, 0.060, 0.060, 0.090, pad=4)

print("\n=== GROUND INSTRUMENTS (4) ===")
instruments = [
    ("inst-drum",    0.262, 0.690, 0.14, 0.22),
    ("inst-mic",     0.448, 0.665, 0.10, 0.24),
    ("inst-guitar",  0.560, 0.690, 0.12, 0.22),
    ("inst-keys",    0.722, 0.695, 0.16, 0.18),
]
for name, cx, cy, nw, nh in instruments:
    crop_center(name, cx, cy, nw, nh, pad=6)

print("\n=== TRANSPORT BUTTONS (5) ===")
transport = [
    ("btn-stop",       0.300, 0.862, 0.08, 0.10),
    ("btn-play",       0.435, 0.862, 0.08, 0.10),
    ("btn-loop",       0.574, 0.862, 0.08, 0.10),
    ("btn-speed-down", 0.696, 0.862, 0.06, 0.10),
    ("btn-speed-up",   0.846, 0.862, 0.06, 0.10),
]
for name, cx, cy, nw, nh in transport:
    crop_center(name, cx, cy, nw, nh, pad=4)

print("\n=== TEMPO LCD SCREEN ===")
# The TEMPO LCD screen area (where the live BPM digits go)
crop("lcd-tempo-screen", 0.158, 0.910, 0.082, 0.034, pad=2)

print(f"\nDone. All sprites saved to {OUT}/")
print(f"Total files: {len(os.listdir(OUT))}")
