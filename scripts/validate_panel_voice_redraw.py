"""Mechanical acceptance gate for AR-051A panel-voice body redraw.

The redraw may change only machine-body areas. Its existing engine-owned live
regions must be byte-identical to the pre-redraw plate; shared header, title,
close and DONE are not part of this asset and are verified in the assembly test.
"""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'src/assets/sprites/panels/panel-voice.png'
BASELINE = 'b3c8584^'

# Protected engine-owned areas from VoiceToolPanel.PLATE, deliberately inset
# only where a plate frame has always existed. Body detail cannot enter them.
PROTECTED = {
    'record hit bay': (438, 155, 1278, 317),
    'status text span': (438, 350, 1099, 383),
    'FX rack': (193, 413, 1345, 882),
    'left outcome bay': (161, 905, 754, 1036),
    'right outcome bay': (799, 905, 1387, 1036),
}


def baseline_png() -> Image.Image:
    rel = PATH.relative_to(ROOT).as_posix()
    blob = subprocess.check_output(['git', 'show', f'{BASELINE}:{rel}'], cwd=ROOT)
    with tempfile.NamedTemporaryFile(suffix='.png') as fp:
        fp.write(blob); fp.flush()
        return Image.open(fp.name).convert('RGBA').copy()


def main() -> None:
    current = Image.open(PATH).convert('RGBA')
    before = baseline_png()
    assert current.size == (1536, 1152), current.size
    assert before.size == current.size
    alpha = current.getchannel('A')
    assert alpha.getextrema() == (0, 255), alpha.getextrema()
    w, h = current.size
    assert all(alpha.getpixel(p) == 0 for p in ((0, 0), (w-1, 0), (0, h-1), (w-1, h-1)))
    print('PASS AR-051A canvas 1536x1152 and hard alpha with zero corners')

    for name, box in PROTECTED.items():
        assert current.crop(box).tobytes() == before.crop(box).tobytes(), f'{name} changed: {box}'
        print(f'PASS AR-051A protected {name}: {box}')

    # Confirm the recorder-specific body actually changed in the allowed
    # service zones, guarding against a no-op replacement.
    changed = 0
    permitted = ((120, 420, 193, 840), (1345, 420, 1415, 840), (230, 290, 437, 365), (190, 1040, 1390, 1070))
    for box in permitted:
        a, b = current.crop(box).tobytes(), before.crop(box).tobytes()
        changed += sum(x != y for x, y in zip(a, b))
    assert changed > 0, 'no permitted recorder-body pixels changed'
    print(f'PASS AR-051A recorder-body redraw changed {changed} permitted RGBA bytes')


if __name__ == '__main__':
    main()
