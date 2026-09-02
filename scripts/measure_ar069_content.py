"""Report exact alpha bounds and normalized content boxes for the AR-069 family."""
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/assets/sprites/buttons"
FILES = [
    "btn-nav-map-idle.png", "btn-nav-map-pressed.png", "btn-track-ride-idle.png", "btn-track-ride-pressed.png",
    "btn-transport-stop-idle.png", "btn-transport-stop-pressed.png", "btn-track-clear-idle.png", "btn-track-clear-pressed.png",
    "btn-send-song-idle.png", "btn-send-song-pressed.png", "btn-transport-slow-idle.png", "btn-transport-slow-pressed.png",
    "track-speed-readout.png", "btn-transport-fast-idle.png", "btn-transport-fast-pressed.png",
    "btn-transport-loop-idle.png", "btn-transport-loop-pressed.png", "btn-track-tarp-idle.png", "btn-track-tarp-seated.png",
]
for name in FILES:
    arr = np.asarray(Image.open(SRC/name).convert('RGBA'))
    ys, xs = np.where(arr[:, :, 3] > 0)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    h, w = arr.shape[:2]
    print(f"{name:36} {w:4}x{h:<4} bbox={x0:4},{y0:4}..{x1:4},{y1:4} norm=({x0/w:.4f},{y0/h:.4f},{(x1+1)/w:.4f},{(y1+1)/h:.4f})")
