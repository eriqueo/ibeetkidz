"""Mechanical gate for the reopened AR-060 flatcar and tanker layers.

Visual acceptance still requires assembled Workshop screenshots. This catches
the objective export contract and prevents the two specifically rejected files
from being relabelled or re-submitted unchanged.
"""
from __future__ import annotations

import hashlib
import struct
import sys
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "flatcar body": (
        ROOT / "src/assets/sprites/cars/car-open-flatcar.png",
        "1864dbf81ede7dcb059e87212017c89db072fd91cae4cd677884d9bea88a2603",
        False,
    ),
    "flatcar foreground": (
        ROOT / "src/assets/sprites/cars/car-open-flatcar-front.png",
        "7bce619ec7bc26884033a9762572244bc8e8600bcd25d3b11f488c28133f6c01",
        True,
    ),
    "tanker foreground": (
        ROOT / "src/assets/sprites/cars/car-open-tanker-front.png",
        "b218536ecce2f71f574123b3043468bed386b8eefc762a319fec84642a3b8cf7",
        True,
    ),
}


def paeth(a: int, b: int, c: int) -> int:
    estimate = a + b - c
    distances = (abs(estimate - a), abs(estimate - b), abs(estimate - c))
    return (a, b, c)[distances.index(min(distances))]


def rgba_alpha(path: Path) -> tuple[int, int, list[int]]:
    payload = path.read_bytes()
    assert payload[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name}: not PNG"
    offset = 8
    idat = bytearray()
    width = height = 0
    while offset < len(payload):
        length = struct.unpack(">I", payload[offset:offset + 4])[0]
        kind = payload[offset + 4:offset + 8]
        chunk = payload[offset + 8:offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", chunk)
            assert (depth, color, compression, filtering, interlace) == (8, 6, 0, 0, 0), (
                f"{path.name}: expected non-interlaced 8-bit RGBA PNG"
            )
        elif kind == b"IDAT":
            idat.extend(chunk)
        elif kind == b"IEND":
            break

    stride = width * 4
    raw = zlib.decompress(bytes(idat))
    assert len(raw) == height * (stride + 1), f"{path.name}: unexpected scanline size"
    previous = bytearray(stride)
    alpha: list[int] = []
    cursor = 0
    for _ in range(height):
        filter_kind = raw[cursor]
        cursor += 1
        encoded = raw[cursor:cursor + stride]
        cursor += stride
        row = bytearray(stride)
        for index, value in enumerate(encoded):
            left = row[index - 4] if index >= 4 else 0
            above = previous[index]
            upper_left = previous[index - 4] if index >= 4 else 0
            predictor = (
                0 if filter_kind == 0 else
                left if filter_kind == 1 else
                above if filter_kind == 2 else
                (left + above) // 2 if filter_kind == 3 else
                paeth(left, above, upper_left)
            )
            assert filter_kind in range(5), f"{path.name}: unsupported PNG filter {filter_kind}"
            row[index] = (value + predictor) & 0xFF
        alpha.extend(row[3::4])
        previous = row
    return width, height, alpha


def validate(name: str, path: Path, rejected: str, foreground: bool) -> None:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest != rejected, f"{name}: still the explicitly rejected source ({digest})"

    width, height, alpha = rgba_alpha(path)
    assert (width, height) == (2560, 1440), f"{name}: canvas {(width, height)}, expected 2560x1440"
    corners = (alpha[0], alpha[width - 1], alpha[-width], alpha[-1])
    assert corners == (0, 0, 0, 0), f"{name}: non-transparent corners {corners}"
    mid = sum(1 for value in alpha if 0 < value < 240) / len(alpha)
    assert mid <= 0.05, f"{name}: {mid:.1%} semi-transparent canvas wash"
    if foreground:
        opaque = sum(1 for value in alpha if value > 0) / len(alpha)
        assert opaque < 0.2, f"{name}: foreground covers {opaque:.1%} of the whole canvas"
    print(f"PASS {name}: canvas, alpha, and rejected-fingerprint checks")


def main() -> None:
    failures: list[str] = []
    for name, (path, rejected, foreground) in FILES.items():
        try:
            validate(name, path, rejected, foreground)
        except AssertionError as error:
            failures.append(str(error))
    if failures:
        print("FAIL Workshop open-car art:\n- " + "\n- ".join(failures), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
