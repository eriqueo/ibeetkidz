#!/usr/bin/env bash
# Blocking reproducibility check for the committed UI atlas.
#
# Source sprites are the truth; the game loads the packed files under
# public/assets/spritesheets/. Rebuild them with the real generator and reject
# any byte drift so an updated sprite cannot deploy behind a stale atlas.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 scripts/build_ui_atlas.py

shopt -s nullglob
atlas_outputs=(
  public/assets/spritesheets/ui-atlas.json
  public/assets/spritesheets/ui-atlas-*.png
)
shopt -u nullglob

untracked_outputs=()
for output in "${atlas_outputs[@]}"; do
  if ! git ls-files --error-unmatch -- "$output" >/dev/null 2>&1; then
    untracked_outputs+=("$output")
  fi
done
if (( ${#untracked_outputs[@]} > 0 )); then
  printf 'untracked generated ui-atlas output: %s\n' "${untracked_outputs[@]}"
  echo "::error::every regenerated ui-atlas output must be committed"
  exit 1
fi

atlas_status="$(git status --short --untracked-files=all -- \
  public/assets/spritesheets/ui-atlas.json \
  'public/assets/spritesheets/ui-atlas-*.png')"
if [[ -n "$atlas_status" ]]; then
  printf '%s\n' "$atlas_status"
  echo "::error::ui-atlas is stale — run scripts/build_ui_atlas.py and commit the result"
  exit 1
fi

echo "ok: committed ui atlas matches its source sprites"
