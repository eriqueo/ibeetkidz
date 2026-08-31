// Vitest executes this behavioral check in Node, while the browser app's
// TypeScript config deliberately does not expose Node types.
// @ts-expect-error -- test-host builtin without project-wide Node types
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
// @ts-expect-error -- test-host builtin without project-wide Node types
import { tmpdir } from "node:os";
// @ts-expect-error -- test-host builtin without project-wide Node types
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PNG, type DecodedPng } from "pngjs";
// @ts-expect-error -- production checker is intentionally plain Node ESM
import { compareAtlasDirectories } from "../../scripts/check-ui-atlas-fresh.mjs";

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function fixtureDirs(): { generated: string; committed: string } {
  const root = mkdtempSync(join(tmpdir(), "ibeetkidz-atlas-check-"));
  fixtures.push(root);
  const generated = join(root, "generated");
  const committed = join(root, "committed");
  mkdirSync(generated);
  mkdirSync(committed);
  return { generated, committed };
}

function png(color: readonly [number, number, number, number], deflateLevel: number): Uint8Array {
  const image: DecodedPng = {
    width: 1,
    height: 1,
    data: new Uint8Array(color),
  };
  return PNG.sync.write(image, { deflateLevel });
}

function writeAtlas(
  dir: string,
  color: readonly [number, number, number, number],
  options: { readonly deflateLevel?: number; readonly json?: string } = {},
): void {
  writeFileSync(join(dir, "ui-atlas.json"), options.json ?? "{\"textures\":[]}\n");
  writeFileSync(join(dir, "ui-atlas-0.png"), png(color, options.deflateLevel ?? 6));
}

describe("UI-atlas semantic freshness checker", () => {
  it("accepts different PNG encodings with identical color model and pixels", () => {
    const dirs = fixtureDirs();
    writeAtlas(dirs.generated, [10, 20, 30, 255], { deflateLevel: 0 });
    writeAtlas(dirs.committed, [10, 20, 30, 255], { deflateLevel: 9 });

    expect(() => compareAtlasDirectories(dirs.generated, dirs.committed)).not.toThrow();
  });

  it("rejects a decoded-pixel mismatch", () => {
    const dirs = fixtureDirs();
    writeAtlas(dirs.generated, [10, 20, 30, 255]);
    writeAtlas(dirs.committed, [11, 20, 30, 255]);

    expect(() => compareAtlasDirectories(dirs.generated, dirs.committed)).toThrow(
      "ui-atlas-0.png decoded pixels differ",
    );
  });

  it("rejects deterministic JSON drift", () => {
    const dirs = fixtureDirs();
    writeAtlas(dirs.generated, [10, 20, 30, 255]);
    writeAtlas(dirs.committed, [10, 20, 30, 255], { json: "{\"textures\":[1]}\n" });

    expect(() => compareAtlasDirectories(dirs.generated, dirs.committed)).toThrow(
      "ui-atlas.json differs",
    );
  });

  it("rejects an extra committed atlas page", () => {
    const dirs = fixtureDirs();
    writeAtlas(dirs.generated, [10, 20, 30, 255]);
    writeAtlas(dirs.committed, [10, 20, 30, 255]);
    writeFileSync(join(dirs.committed, "ui-atlas-1.png"), png([10, 20, 30, 255], 6));

    expect(() => compareAtlasDirectories(dirs.generated, dirs.committed)).toThrow(
      "ui-atlas page set differs",
    );
  });
});
