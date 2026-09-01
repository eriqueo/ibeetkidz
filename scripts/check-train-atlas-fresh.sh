#!/usr/bin/env bash
# Blocking semantic reproducibility check for the committed train atlas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/check-train-atlas-fresh.mjs
