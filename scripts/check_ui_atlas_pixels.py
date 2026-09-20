"""Reject resolution, color, or registration loss between sources and the atlas."""
from pathlib import Path
import argparse
import json
from PIL import Image, ImageChops
from build_ui_atlas import SRC_DIRS, dewash


def main(directory: Path | None = None) -> None:
    root = Path(__file__).resolve().parents[1]
    directory = directory or root / "public/assets/spritesheets"
    atlas = json.loads((directory / "ui-atlas.json").read_text())
    sources = {p.stem: p for d in SRC_DIRS for p in (root / d).glob("*.png")}
    seen = set()
    for texture in atlas["textures"]:
        page = Image.open(directory / texture["image"]).convert("RGBA")
        for frame in texture["frames"]:
            name = frame["filename"]
            assert name not in seen, f"duplicate frame: {name}"
            seen.add(name)
            source, _ = dewash(Image.open(sources[name]).convert("RGBA"))
            assert frame["sourceSize"] == {"w": source.width, "h": source.height}, f"{name}: source resolution lost"
            rect = frame["frame"]
            cut = page.crop((rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"]))
            restored = Image.new("RGBA", source.size)
            trim = frame["spriteSourceSize"]
            restored.paste(cut, (trim["x"], trim["y"]))
            # Alpha trimming may discard meaningless RGB outside visible art.
            # Canonicalize only fully invisible pixels, preserving every channel
            # of every visible (including partially transparent) pixel exactly.
            for im in (source, restored):
                im.paste((0, 0, 0, 0), (0, 0, im.width, im.height),
                         im.getchannel("A").point(lambda a: 0 if a else 255))
            # RGBA getbbox defaults to alpha-only; inspect every channel so RGB
            # changes cannot disappear behind an unchanged alpha channel.
            assert ImageChops.difference(source, restored).getbbox(alpha_only=False) is None, f"{name}: decoded pixels differ"
    assert seen == set(sources), "atlas/source frame set differs"
    print(f"PASS: {len(seen)} UI frames preserve full-resolution visible post-wash RGBA pixels")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas-dir", type=Path)
    main(parser.parse_args().atlas_dir)
