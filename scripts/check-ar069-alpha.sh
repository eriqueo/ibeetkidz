#!/usr/bin/env bash
# Blocking source-alpha contract for AR-069's ten Track control faces.
#
# Permanent by design: these fixed-canvas sources feed the packed UI atlas, so
# an opaque or washed export can always turn a header control into a rectangle.
# The broader no-argument Python diagnostic intentionally remains non-blocking
# while unrelated legacy sprites and opaque Track tiles still violate its
# whole-tree policy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

checker="scripts/check_sprite_alpha.py"
assets=(
  "src/assets/sprites/buttons/btn-nav-map-idle.png"
  "src/assets/sprites/buttons/btn-nav-map-pressed.png"
  "src/assets/sprites/buttons/btn-track-ride-idle.png"
  "src/assets/sprites/buttons/btn-track-ride-pressed.png"
  "src/assets/sprites/buttons/btn-track-clear-idle.png"
  "src/assets/sprites/buttons/btn-track-clear-pressed.png"
  "src/assets/sprites/buttons/btn-transport-loop-idle.png"
  "src/assets/sprites/buttons/btn-transport-loop-pressed.png"
  "src/assets/sprites/buttons/btn-track-tarp-idle.png"
  "src/assets/sprites/buttons/btn-track-tarp-seated.png"
)

# Seed the dependency failure on the same checker and asset list used below.
# Isolated mode plus -S hides site packages even after CI installs Pillow.
if missing_output=$(python3 -I -S "$checker" "${assets[@]}" 2>&1); then
  printf '%s\n' "$missing_output"
  echo "FAIL: check_sprite_alpha returned success without Pillow"
  exit 1
else
  missing_status=$?
fi
if [[ "$missing_status" -ne 2 ]] || [[ "$missing_output" != *"requires Pillow"* ]]; then
  printf '%s\n' "$missing_output"
  echo "FAIL: missing-Pillow proof returned $missing_status instead of dependency error 2"
  exit 1
fi
echo "ok: missing Pillow fails the sprite alpha checker"

# The ordinary interpreter sees the dependency installed by the workflow and
# must still accept every currently valid AR-069 source.
python3 "$checker" "${assets[@]}"
