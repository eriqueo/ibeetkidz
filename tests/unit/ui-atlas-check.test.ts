// Vitest executes this behavioral shell test in Node, while the browser app's
// TypeScript config deliberately does not install or expose @types/node.
// @ts-expect-error -- test-host builtin without project-wide Node types
import { spawnSync } from "node:child_process";
// @ts-expect-error -- test-host builtin without project-wide Node types
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
// @ts-expect-error -- test-host builtin without project-wide Node types
import { tmpdir } from "node:os";
// @ts-expect-error -- test-host builtin without project-wide Node types
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import atlasCheck from "../../scripts/check-ui-atlas-fresh.sh?raw";

declare const process: { readonly env: Record<string, string | undefined> };

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function executable(path: string, contents: string): void {
  writeFileSync(path, contents, { mode: 0o755 });
}

function runFixture(options: {
  readonly dirtyStatus?: string;
  readonly untrackedOutput?: string;
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "ibeetkidz-atlas-check-"));
  fixtures.push(root);
  const scripts = join(root, "scripts");
  const tools = join(root, "fake-bin");
  const atlasDir = join(root, "public/assets/spritesheets");
  mkdirSync(scripts, { recursive: true });
  mkdirSync(tools);
  mkdirSync(atlasDir, { recursive: true });

  const checkPath = join(scripts, "check-ui-atlas-fresh.sh");
  const pythonMarker = join(root, "python-ran");
  writeFileSync(checkPath, atlasCheck, { mode: 0o755 });
  writeFileSync(join(scripts, "build_ui_atlas.py"), "# fixture\n");
  writeFileSync(join(atlasDir, "ui-atlas.json"), "{}\n");
  writeFileSync(join(atlasDir, "ui-atlas-0.png"), "fixture\n");

  executable(
    join(tools, "python3"),
    "#!/bin/sh\n: > \"$FAKE_PYTHON_MARKER\"\n",
  );
  executable(
    join(tools, "git"),
    `#!/bin/sh
case "$1" in
  ls-files)
    last=""
    for arg in "$@"; do last="$arg"; done
    if [ -n "$FAKE_UNTRACKED_OUTPUT" ] && [ "$last" = "$FAKE_UNTRACKED_OUTPUT" ]; then
      exit 1
    fi
    exit 0
    ;;
  status)
    if [ -n "$FAKE_DIRTY_STATUS" ]; then printf '%s\\n' "$FAKE_DIRTY_STATUS"; fi
    exit 0
    ;;
esac
exit 2
`,
  );

  const result = spawnSync("/bin/bash", [checkPath], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${tools}:${process.env.PATH ?? ""}`,
      FAKE_PYTHON_MARKER: pythonMarker,
      FAKE_DIRTY_STATUS: options.dirtyStatus ?? "",
      FAKE_UNTRACKED_OUTPUT: options.untrackedOutput ?? "",
    },
  });
  return { ...result, pythonRan: existsSync(pythonMarker) };
}

describe("UI-atlas freshness checker", () => {
  it("fails after regeneration reports a changed committed atlas", () => {
    const result = runFixture({
      dirtyStatus: " M public/assets/spritesheets/ui-atlas.json",
    });

    expect(result.pythonRan).toBe(true);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "M public/assets/spritesheets/ui-atlas.json",
    );
    expect(result.stdout).toContain("::error::ui-atlas is stale");
  });

  it("rejects a regenerated page removed from tracking and hidden by ignore rules", () => {
    const result = runFixture({
      untrackedOutput: "public/assets/spritesheets/ui-atlas-0.png",
    });

    expect(result.pythonRan).toBe(true);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "untracked generated ui-atlas output: public/assets/spritesheets/ui-atlas-0.png",
    );
    expect(result.stdout).toContain(
      "::error::every regenerated ui-atlas output must be committed",
    );
  });

  it("passes when regenerated outputs are tracked and byte-clean", () => {
    const result = runFixture();

    expect(result.pythonRan).toBe(true);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "ok: committed ui atlas matches its source sprites",
    );
  });
});
