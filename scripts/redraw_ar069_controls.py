"""Restore accepted control bytes; this command never draws replacement art.

The historical command name remains for existing callers. The source revision
and SHA256 values come from the same manifest checked by the build. Git history
is needed only for restoration, never for normal validation or CI.
"""
from __future__ import annotations

import hashlib
import subprocess
from validate_ar069_controls import BUTTONS, ROOT, read_manifest, validate


def main() -> None:
    manifest = read_manifest()
    restored = []
    # Check every retrieved blob before touching any source. A missing historical
    # commit or a mismatched manifest cannot leave a partially restored family.
    for control in manifest["controls"].values():
        for state in control["states"].values():
            name = state["frame"] + ".png"
            data = subprocess.check_output(
                ["git", "show", f"{manifest['sourceRevision']}:src/assets/sprites/buttons/{name}"], cwd=ROOT,
            )
            assert hashlib.sha256(data).hexdigest() == state["sha256"], f"{name}: historical source differs from accepted hash"
            restored.append((BUTTONS / name, data))
    for path, data in restored:
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)
    validate()
    print("Restored accepted source bytes; rebuild the UI atlas to publish them.")


if __name__ == "__main__":
    main()
