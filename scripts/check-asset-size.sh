#!/usr/bin/env bash
#
# check-asset-size.sh — advisory size report for tracked binaries under src/.
#
# Decision A3: re-home, don't police. Raw art belongs in the gitignored art/
# tree; anything large that lands under src/ is worth a second look, but this
# check is a WARNING and MUST NOT fail a build. Eric ships reference batches
# deliberately (see src/assets/spritesheets/ar015/) and a blocking guard would
# fight his actual workflow. Exit status is always 0, by design.
#
# Threshold: 2 MB, override with ASSET_SIZE_LIMIT_MB.

set -uo pipefail

LIMIT_MB="${ASSET_SIZE_LIMIT_MB:-2}"
LIMIT_BYTES=$(( LIMIT_MB * 1024 * 1024 ))

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 0

# Tracked files only — untracked scratch and the gitignored art/ tree are not
# the build's problem.
mapfile -t -d '' tracked < <(git ls-files -z -- src) || exit 0

over=()
total=0
for f in "${tracked[@]}"; do
  [ -f "$f" ] || continue
  size=$(wc -c < "$f")
  if [ "$size" -gt "$LIMIT_BYTES" ]; then
    over+=("$size	$f")
    total=$(( total + size ))
  fi
done

if [ ${#over[@]} -eq 0 ]; then
  echo "asset-size: no tracked file under src/ exceeds ${LIMIT_MB} MB."
  exit 0
fi

total_mb=$(( total / 1024 / 1024 ))
echo "::warning title=Large binaries under src/::${#over[@]} tracked file(s) under src/ exceed ${LIMIT_MB} MB (${total_mb} MB total). Raw art belongs in the gitignored art/ tree; the repo history cannot be shrunk after the fact."
echo "asset-size: ${#over[@]} tracked file(s) over ${LIMIT_MB} MB, ${total_mb} MB total (largest first):"
printf '%s\n' "${over[@]}" | sort -rn | awk -F'\t' '{ printf "  %8.1f MB  %s\n", $1/1048576, $2 }'
echo "asset-size: advisory only — this step never fails the build."

exit 0
