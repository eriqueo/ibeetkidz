#!/usr/bin/env python3
"""Every sprite must ship with TRUE alpha 0 outside the art.

ART_REQUESTS.md has carried this rule in bold since AR-009. It has now been
violated five times, and each violation wore a different disguise:

  AR-009 / AR-012 / AR-017  a semi-opaque paper or grey wash
  AR-016 + AR-021           PNG colour-type 2 — no alpha channel at all
  AR-024                    an alpha channel, but the white background merely
                            made TRANSLUCENT: on inst-drums-passive, 74% of the
                            canvas sits at mid alpha (16..199)

The first version of this check only read the PNG header, so it caught the
colour-type-2 drop and then passed the translucent one. Checking that an alpha
channel EXISTS is not the same as checking the background is TRANSPARENT. This
version checks the property the rule actually states.

Three tests, each mapping to a way the rule has actually been broken:

  1. HAS AN ALPHA CHANNEL   colour-type 4/6, or 3 with a tRNS chunk.
  2. CORNERS ARE CLEAR      all four corners exactly alpha 0. Art does not
                            reach the corner of its own bounding canvas.
  3. NO WASH                the fraction of pixels at mid alpha must be small.
                            A real sprite has mid alpha only on its
                            anti-aliased rim — a few percent. A washed canvas
                            has most of its area there.

Backgrounds under scenes-v2/ are exempt: a full-bleed plate is meant to be opaque.

Usage:  python3 scripts/check_sprite_alpha.py [sprite.png ...]
Requires Pillow. Exits non-zero on violation.

With explicit paths, only those delivery-contract assets are checked. With no
paths, the historical whole-tree diagnostic is preserved.
"""
from __future__ import annotations

import subprocess
import sys

try:
    from PIL import Image
except ImportError:
    print("FAIL: check_sprite_alpha requires Pillow; pixel checks did not run.", file=sys.stderr)
    print("  install with `python3 -m pip install pillow`, or run inside", file=sys.stderr)
    print("  nix-shell -p 'python3.withPackages(ps: [ps.pillow])'", file=sys.stderr)
    sys.exit(2)

# A sprite's anti-aliased rim is a thin band, so only a small share of its
# pixels are partially transparent. Every washed drop so far has been >40%.
MID_ALPHA_LIMIT = 0.25
MID_LO, MID_HI = 8, 248

TRACKED = ["src/assets/sprites/**/*.png", "public/assets/spritesheets/*.png"]


def tracked_files(paths: list[str]) -> list[str]:
    if paths:
        return paths
    out = subprocess.run(
        ["git", "ls-files", "--", *TRACKED], capture_output=True, text=True, check=True
    )
    return [line for line in out.stdout.splitlines() if line]


def main(paths: list[str]) -> int:
    failures: list[str] = []
    checked = 0

    for path in tracked_files(paths):
        im = Image.open(path)
        if im.mode not in ("RGBA", "LA", "PA") and "transparency" not in im.info:
            failures.append(f"{path} — no alpha channel (mode {im.mode})")
            continue

        im = im.convert("RGBA")
        checked += 1
        w, h = im.size
        alpha = im.getchannel("A")

        # Panels are pre-trimmed plates: the whole canvas IS the content, and
        # some carry a baked soft shadow that reaches the corner. They have no
        # "outside the art", so the corner rule does not apply to them. The wash
        # rule below still does — a translucent plate would be just as wrong.
        # (See the "pre-trimmed (whole canvas = content)" note in ui-sprites.ts.)
        is_panel = "/panels/" in path or "/spritesheets/" in path

        if not is_panel:
            corners = [
                alpha.getpixel((0, 0)),
                alpha.getpixel((w - 1, 0)),
                alpha.getpixel((0, h - 1)),
                alpha.getpixel((w - 1, h - 1)),
            ]
            if max(corners) != 0:
                failures.append(
                    f"{path} — corners are not transparent (alpha {corners}); "
                    "the background was not removed"
                )
                continue

        hist = alpha.histogram()
        mid = sum(hist[MID_LO:MID_HI])
        frac = mid / (w * h)
        if frac > MID_ALPHA_LIMIT:
            failures.append(
                f"{path} — {frac:.0%} of the canvas is semi-transparent "
                f"(alpha {MID_LO}..{MID_HI - 1}); the background was made "
                "TRANSLUCENT rather than removed"
            )

    if failures:
        print(f"FAIL: {len(failures)} sprite(s) violate the alpha-export rule:\n")
        for f in failures:
            print(f"  {f}")
        print(
            "\nSprites need TRUE alpha 0 outside the art — not white, not grey,\n"
            "and not a translucent version of either. See the export rule at the\n"
            "top of ART_REQUESTS.md.\n\n"
            "This is not cosmetic: placeUiSprite fits a sprite's CONTENT BOX (its\n"
            "alpha bounding box) into its slot. Any pixel that is not fully\n"
            "transparent counts, so a wash makes that box the whole canvas — the\n"
            "art renders at the wrong size AND paints a rectangle over the scene."
        )
        return 1

    print(f"ok: all {checked} sprite PNGs have a clear, truly transparent background")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
