#!/usr/bin/env bash
# Every sprite must ship with a real alpha channel.
#
# ART_REQUESTS.md has carried this rule in bold since AR-009:
#
#   "backgrounds must be TRUE alpha 0 everywhere outside the art — no
#    semi-opaque paper/grey wash on the canvas"
#
# It has now been violated four times, most recently by all 24 files of the
# AR-016/AR-021 instrument drop, which arrived as PNG colour-type 2 (RGB, no
# alpha channel whatsoever) on a solid near-white background. Wired as-is, each
# character renders as an opaque rectangle over the scene, and its content box
# measures as the whole canvas so it is drawn at the wrong size too.
#
# A rule that only lives in prose gets violated. This makes it mechanical.
#
# No image library needed: a PNG's IHDR is fixed-layout, and byte 25 (0-indexed)
# is the colour type.
#   0 = greyscale          no alpha        REJECT
#   2 = truecolour (RGB)   no alpha        REJECT
#   3 = palette            alpha only via a tRNS chunk  -> check for tRNS
#   4 = greyscale + alpha                  ok
#   6 = truecolour + alpha (RGBA)          ok
#
# Backgrounds are exempt: a full-bleed scene plate is meant to be opaque.
set -euo pipefail

status=0
checked=0

# Sprites only. Scene plates (scenes-v2/) and reference art are deliberately opaque.
while IFS= read -r png; do
  checked=$((checked + 1))
  ctype=$(od -An -tu1 -j25 -N1 "$png" | tr -d ' ')
  case "$ctype" in
    4 | 6) ;; # has an alpha channel
    3)
      # Palette PNG: transparent only if it carries a tRNS chunk.
      if ! grep -qa 'tRNS' "$png"; then
        echo "FAIL: $png — palette PNG with no tRNS chunk (no transparency)"
        status=1
      fi
      ;;
    *)
      echo "FAIL: $png — PNG colour-type $ctype has no alpha channel"
      status=1
      ;;
  esac
done < <(git ls-files -- 'src/assets/sprites/**/*.png' 'public/assets/spritesheets/*.png')

if [ "$status" -ne 0 ]; then
  echo
  echo "Sprites must be exported with a real alpha channel and TRUE alpha 0"
  echo "outside the art — not a white or grey background, and not a semi-opaque"
  echo "wash. See the export rule at the top of ART_REQUESTS.md."
  echo
  echo "This is not cosmetic: placeUiSprite fits a sprite's CONTENT BOX into its"
  echo "slot, and an opaque background makes that box the entire canvas — so the"
  echo "art renders at the wrong size AND paints a rectangle over the scene."
else
  echo "ok: all $checked sprite PNGs carry an alpha channel"
fi
exit "$status"
