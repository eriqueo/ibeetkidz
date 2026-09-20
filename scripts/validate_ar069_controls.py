"""Verify the accepted rich controls without requiring Git history.

Source identity and runtime registration share src/assets/track-controls.json.
Hash checks reject a different art family even when its dimensions are valid.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BUTTONS = ROOT / "src/assets/sprites/buttons"
MANIFEST = ROOT / "src/assets/track-controls.json"


def read_manifest() -> dict:
    manifest = json.loads(MANIFEST.read_text())
    assert manifest["version"] == 1, "unsupported accepted-art manifest version"
    return manifest


def validate() -> None:
    manifest = read_manifest()
    count = 0
    for name, control in manifest["controls"].items():
        width, height = control["width"], control["height"]
        content = control["content"]
        assert len(content) == 4 and 0 <= content[0] < content[2] <= 1 and 0 <= content[1] < content[3] <= 1, name
        expected_bounds = tuple(round(value * size) for value, size in zip(content, (width, height, width, height)))
        assert control["base"] in control["states"], name
        for state in control["states"].values():
            path = BUTTONS / (state["frame"] + ".png")
            assert hashlib.sha256(path.read_bytes()).hexdigest() == state["sha256"], f"{path.name}: differs from accepted rich artwork; restore with scripts/redraw_ar069_controls.py"
            with Image.open(path) as source:
                assert source.mode == "RGBA", f"{path.name}: expected RGBA"
                assert source.size == (width, height), f"{path.name}: wrong canvas"
                alpha = source.getchannel("A")
                assert alpha.getbbox() == expected_bounds, f"{path.name}: stale content registration"
                assert all(alpha.getpixel(point) == 0 for point in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1))), f"{path.name}: opaque corner"
            count += 1

    control = manifest["controls"]["track-speed-readout"]
    window = manifest["speedWindow"]
    x, y = round(window["x"] * control["width"]), round(window["y"] * control["height"])
    width, height = round(window["width"] * control["width"]), round(window["height"] * control["height"])
    with Image.open(BUTTONS / (control["states"][control["base"]]["frame"] + ".png")) as source:
        assert 0 <= x < x + width <= source.width and 0 <= y < y + height <= source.height, "SPEED window outside source"
        for r, g, b, a in source.crop((x, y, x + width, y + height)).getdata():
            assert a == 255 and 0.2126 * r + 0.7152 * g + 0.0722 * b <= 62, "SPEED window must remain dark and opaque"
    assert count == 19, f"expected 19 accepted control faces, got {count}"
    print(f"PASS {count} accepted rich controls: source hashes, canvases, registration and SPEED window")


if __name__ == "__main__":
    validate()
