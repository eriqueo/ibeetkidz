#!/usr/bin/env python3
"""Build the runtime train atlas from its tracked, accepted 128 px frames.

The canonical inputs are `src/assets/sprites/train-atlas/manifest.json` and the
40 PNGs beside it. Raw generation references under ignored `art/` directories
are historical inputs, not part of this rebuild contract.
"""

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = ROOT / "src/assets/sprites/train-atlas"
DEFAULT_OUTPUT_DIR = ROOT / "public/assets/spritesheets"


def load_manifest(source_dir: Path) -> tuple[int, list[str], list[str]]:
    manifest_path = source_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if set(manifest) != {"cellSize", "directions", "types"}:
        raise SystemExit(f"unexpected keys in {manifest_path}")

    cell_size = manifest["cellSize"]
    directions = manifest["directions"]
    train_types = manifest["types"]
    if not isinstance(cell_size, int) or cell_size <= 0:
        raise SystemExit("cellSize must be a positive integer")
    if not directions or not all(isinstance(value, str) for value in directions):
        raise SystemExit("directions must be a non-empty string list")
    if not train_types or not all(isinstance(value, str) for value in train_types):
        raise SystemExit("types must be a non-empty string list")
    if len(set(directions)) != len(directions) or len(set(train_types)) != len(train_types):
        raise SystemExit("manifest directions and types must be unique")
    return cell_size, directions, train_types


def build(source_dir: Path, output_dir: Path) -> None:
    cell_size, directions, train_types = load_manifest(source_dir)
    expected_files = {
        f"{train_type}-{direction}.png"
        for train_type in train_types
        for direction in directions
    }
    actual_files = {path.name for path in source_dir.glob("*.png")}
    missing = sorted(expected_files - actual_files)
    extra = sorted(actual_files - expected_files)
    if missing or extra:
        raise SystemExit(
            f"train atlas input set differs; missing={missing or 'none'}; extra={extra or 'none'}"
        )

    atlas = Image.new(
        "RGBA",
        (cell_size * len(directions), cell_size * len(train_types)),
        (0, 0, 0, 0),
    )
    frames: dict[str, dict] = {}
    for row, train_type in enumerate(train_types):
        for column, direction in enumerate(directions):
            name = f"{train_type}-{direction}"
            source_path = source_dir / f"{name}.png"
            with Image.open(source_path) as image:
                if image.size != (cell_size, cell_size) or image.mode != "RGBA":
                    raise SystemExit(
                        f"{source_path} must be {cell_size}x{cell_size}/RGBA; "
                        f"found {image.size[0]}x{image.size[1]}/{image.mode}"
                    )
                atlas.paste(image, (column * cell_size, row * cell_size))
            frame = {
                "x": column * cell_size,
                "y": row * cell_size,
                "w": cell_size,
                "h": cell_size,
            }
            frames[name] = {
                "frame": frame,
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": cell_size, "h": cell_size},
                "sourceSize": {"w": cell_size, "h": cell_size},
            }

    output_dir.mkdir(parents=True, exist_ok=True)
    atlas_path = output_dir / "train.png"
    atlas.save(atlas_path, optimize=True)
    metadata = {
        "frames": frames,
        "meta": {
            "image": "train.png",
            "size": {"w": atlas.width, "h": atlas.height},
            "scale": "1",
        },
    }
    (output_dir / "train.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(
        f"packed {len(frames)} tracked frames into {atlas_path} "
        f"({atlas.width}x{atlas.height}, {atlas_path.stat().st_size / 1000:.0f}KB)"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    arguments = parser.parse_args()
    build(arguments.source_dir, arguments.output_dir)
