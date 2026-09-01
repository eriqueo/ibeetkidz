"""Mechanical acceptance checks for reopened AR-060F and AR-060T.

These checks intentionally validate the production geometry described in
ART_REQUESTS.md, independently of the production-canvas screenshot proof.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CARS = ROOT / "src/assets/sprites/cars"
REJECTED_FLAT = "1864dbf81ede7dcb059e87212017c89db072fd91cae4cd677884d9bea88a2603"
REJECTED_TANK_FRONT = "b218536ecce2f71f574123b3043468bed386b8eefc762a319fec84642a3b8cf7"


def rgba(name: str) -> np.ndarray:
    path = CARS / name
    arr = np.asarray(Image.open(path).convert("RGBA")).copy()
    assert arr.shape == (1440, 2560, 4), (name, arr.shape)
    alpha = arr[:, :, 3]
    assert set(np.unique(alpha)).issubset({0, 255}), f"{name}: soft alpha"
    assert all(alpha[y, x] == 0 for x, y in ((0, 0), (2559, 0), (0, 1439), (2559, 1439))), f"{name}: opaque corner"
    return arr


def bbox(alpha: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(alpha > 0)
    assert len(xs), "empty asset"
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def assert_inside(name: str, image: np.ndarray, allowed: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = bbox(image[:, :, 3])
    ax0, ay0, ax1, ay1 = allowed
    assert ax0 <= x0 <= x1 <= ax1 and ay0 <= y0 <= y1 <= ay1, (name, (x0,y0,x1,y1), allowed)
    print(f"PASS {name} content bounds {(x0,y0,x1,y1)}")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    flat = rgba("car-open-flatcar.png")
    flat_front = rgba("car-open-flatcar-front.png")
    tanker_front = rgba("car-open-tanker-front.png")
    assert digest(CARS / "car-open-flatcar.png") != REJECTED_FLAT, "AR-060F is rejected byte-identical art"
    assert digest(CARS / "car-open-tanker-front.png") != REJECTED_TANK_FRONT, "AR-060T is rejected byte-identical art"

    assert_inside("flatcar base", flat, (48, 68, 2507, 1438))
    assert_inside("flatcar front", flat_front, (48, 68, 2507, 1438))
    # Its whole central crew bay must be real open air down to the deck; no sky,
    # wall, or opaque window field can sit behind the riders.
    assert not np.any(flat[410:852, 720:1841, 3]), "flatcar retains base art in central open-air crew bay"
    assert not np.any(flat_front[410:858, 720:1841, 3]), "flatcar front intrudes into open central crew bay"
    # Front can only occlude feet/near edge; its first central painted row is the
    # 865px footline, except the two permitted outer stake zones.
    central_front = flat_front[:, 260:2300, 3]
    ys, _ = np.where(central_front > 0)
    assert int(ys.min()) >= 858, f"flatcar front rises above deck lip: {int(ys.min())}"
    print("PASS AR-060F open central crew bay and restricted near-edge foreground")

    assert_inside("tanker foreground", tanker_front, (25, 132, 2528, 1197))
    # A real near lip is a broad closed shell region with painted pixels in every
    # column across the opening, not sparse elliptical guide fragments.
    alpha = tanker_front[:, :, 3]
    assert int((alpha > 0).sum()) > 85_000, "tanker foreground is too sparse to be a shell"
    for x in range(540, 2021):
        assert np.any(alpha[820:930, x] > 0), f"tanker foreground has a gap at x={x}"
    assert not np.any(alpha[:820]), "tanker foreground floats above the lower shell"
    print("PASS AR-060T continuous lower tank shell lip")


if __name__ == "__main__":
    main()
