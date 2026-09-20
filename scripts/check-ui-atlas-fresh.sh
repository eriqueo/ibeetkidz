#!/usr/bin/env bash
# Blocking semantic reproducibility check for the committed UI atlas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/check-ui-atlas-fresh.mjs
python3 scripts/validate_ar069_controls.py
python3 scripts/check_ui_atlas_pixels.py
