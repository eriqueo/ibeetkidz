"""Mechanical acceptance gate for AR-069's 19 unified Track control faces."""
from __future__ import annotations

import io
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
B = ROOT / "src/assets/sprites/buttons"
APPROVED = "aaad950"
EXPECTED = {
    "btn-nav-map-idle.png": (1024, 683), "btn-nav-map-pressed.png": (1024, 683),
    "btn-track-ride-idle.png": (512, 512), "btn-track-ride-pressed.png": (512, 512),
    "btn-transport-stop-idle.png": (512, 512), "btn-transport-stop-pressed.png": (512, 512),
    "btn-track-clear-idle.png": (512, 512), "btn-track-clear-pressed.png": (512, 512),
    "btn-send-song-idle.png": (1024, 683), "btn-send-song-pressed.png": (1024, 683),
    "btn-transport-slow-idle.png": (512, 512), "btn-transport-slow-pressed.png": (512, 512),
    "track-speed-readout.png": (512, 512),
    "btn-transport-fast-idle.png": (512, 512), "btn-transport-fast-pressed.png": (512, 512),
    "btn-transport-loop-idle.png": (512, 512), "btn-transport-loop-pressed.png": (512, 512),
    "btn-track-tarp-idle.png": (512, 512), "btn-track-tarp-seated.png": (512, 512),
}
APPROVED_EXACT = (
    "btn-nav-map-idle.png", "btn-nav-map-pressed.png",
    "btn-track-ride-idle.png", "btn-track-ride-pressed.png",
    "btn-track-clear-idle.png", "btn-track-clear-pressed.png",
    "btn-transport-loop-idle.png", "btn-transport-loop-pressed.png",
    "btn-track-tarp-idle.png", "btn-track-tarp-seated.png",
)
PAIRS = (
    ("btn-nav-map-idle.png", "btn-nav-map-pressed.png"),
    ("btn-track-ride-idle.png", "btn-track-ride-pressed.png"),
    ("btn-transport-stop-idle.png", "btn-transport-stop-pressed.png"),
    ("btn-track-clear-idle.png", "btn-track-clear-pressed.png"),
    ("btn-send-song-idle.png", "btn-send-song-pressed.png"),
    ("btn-transport-slow-idle.png", "btn-transport-slow-pressed.png"),
    ("btn-transport-fast-idle.png", "btn-transport-fast-pressed.png"),
    ("btn-transport-loop-idle.png", "btn-transport-loop-pressed.png"),
    ("btn-track-tarp-idle.png", "btn-track-tarp-seated.png"),
)


def rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def bbox(im: Image.Image) -> tuple[int, int, int, int]:
    result = im.getchannel("A").getbbox()
    assert result is not None
    return result


def blob_at(ref: str, name: str) -> bytes:
    return subprocess.check_output(["git", "show", f"{ref}:src/assets/sprites/buttons/{name}"], cwd=ROOT)


def main() -> None:
    assert len(EXPECTED) == 19
    for name, size in EXPECTED.items():
        im = rgba(B / name)
        assert im.size == size, f"{name}: {im.size} != {size}"
        alpha = im.getchannel("A")
        assert alpha.getextrema()[0] == 0, f"{name}: missing transparent surround"
        assert all(alpha.getpixel(pt) == 0 for pt in ((0,0),(size[0]-1,0),(0,size[1]-1),(size[0]-1,size[1]-1))), f"{name}: nonzero corner"
        print("PASS AR-069 face", name, size)
    for name in APPROVED_EXACT:
        assert (B / name).read_bytes() == blob_at(APPROVED, name), f"{name}: differs from approved {APPROVED} source"
        print("PASS exact aaad950 restore", name)
    for a, b in PAIRS:
        left, right = rgba(B / a), rgba(B / b)
        assert left.size == right.size, f"{a}/{b}: canvas mismatch"
        assert bbox(left) == bbox(right), f"{a}/{b}: alpha registration changed {bbox(left)} != {bbox(right)}"
        print("PASS registered state pair", a, b, bbox(left))
    speed = rgba(B / "track-speed-readout.png")
    for y in range(168, 296):
        for x in range(122, 390):
            r,g,b,a = speed.getpixel((x,y))
            assert a == 255 and 0.2126*r + 0.7152*g + 0.0722*b <= 62, f"SPEED window not dark/opaque at {(x,y)}"
    print("PASS SPEED runtime window x122..389 y168..295 is dark and opaque")
    print("PASS AR-069 all 19 faces, exact approved restoration, canvases, alpha registration and runtime window")

if __name__ == "__main__":
    main()
