#!/usr/bin/env bash
# The editor must never reach a kid's browser.
#
# Three guards keep `src/editor/` out of a production build: `import.meta.env.DEV`
# at the call site, a dynamic `import()` so nothing in the production graph names
# the chunk, and this script. The first two are properties of the source that a
# careless refactor can quietly undo. This one is a property of the OUTPUT, and
# unlike `check-asset-size.sh` (deliberately advisory) it EXITS NON-ZERO — a
# leaked editor is a correctness failure, not a budget warning.
#
# Run after `npm run build`. Checks both build outputs.
set -euo pipefail

MARKER="IBK_SCENE_EDITOR_DEV_ONLY"
status=0

for dir in dist dist-gh; do
  if [ ! -d "$dir" ]; then
    echo "skip: $dir/ not built"
    continue
  fi
  if grep -rql "$MARKER" "$dir" 2>/dev/null; then
    echo "FAIL: the scene editor leaked into $dir/:"
    grep -rl "$MARKER" "$dir" | sed 's/^/  /'
    status=1
  else
    echo "ok: $dir/ carries no editor code"
  fi
done

if [ "$status" -ne 0 ]; then
  echo
  echo "The editor is dev-only. Check that src/app/context.tsx still reaches it"
  echo "through a DYNAMIC import inside an import.meta.env.DEV branch — a static"
  echo "import pulls the whole chunk into the production graph."
fi
exit "$status"
