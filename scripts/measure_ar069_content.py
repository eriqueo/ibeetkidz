"""Report accepted control bounds using the same source list as the build."""
from PIL import Image
from validate_ar069_controls import BUTTONS, read_manifest

for control in read_manifest()["controls"].values():
    for state in control["states"].values():
        name = state["frame"] + ".png"
        with Image.open(BUTTONS / name) as image:
            box = image.getchannel("A").getbbox()
            assert box, f"{name}: empty source"
            w, h = image.size
            normalized = tuple(value / size for value, size in zip(box, (w, h, w, h)))
            print(f"{name:36} {w}x{h} bbox={box} norm={normalized}")
