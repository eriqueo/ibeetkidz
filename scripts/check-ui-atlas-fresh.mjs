import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "pngjs";

function atlasPages(dir) {
  return readdirSync(dir)
    .filter((name) => /^ui-atlas-\d+\.png$/.test(name))
    .sort((left, right) => left.localeCompare(right));
}

export function compareAtlasDirectories(generatedDir, committedDir) {
  const generatedJson = readFileSync(join(generatedDir, "ui-atlas.json"));
  const committedJson = readFileSync(join(committedDir, "ui-atlas.json"));
  if (!generatedJson.equals(committedJson)) {
    throw new Error("ui-atlas.json differs from the deterministic generator output");
  }

  const generatedPages = atlasPages(generatedDir);
  const committedPages = atlasPages(committedDir);
  if (generatedPages.join("\n") !== committedPages.join("\n")) {
    throw new Error(
      `ui-atlas page set differs: generated [${generatedPages.join(", ")}], ` +
      `committed [${committedPages.join(", ")}]`,
    );
  }

  for (const name of generatedPages) {
    const generated = PNG.sync.read(readFileSync(join(generatedDir, name)));
    const committed = PNG.sync.read(readFileSync(join(committedDir, name)));
    const generatedModel = `${generated.width}x${generated.height}/${generated.colorType}/${generated.depth}`;
    const committedModel = `${committed.width}x${committed.height}/${committed.colorType}/${committed.depth}`;
    if (generatedModel !== committedModel) {
      throw new Error(`${name} dimensions or color model differ: ${generatedModel} != ${committedModel}`);
    }
    if (!Buffer.from(generated.data).equals(Buffer.from(committed.data))) {
      throw new Error(`${name} decoded pixels differ from the generator output`);
    }
  }
}

export function checkUiAtlas({
  builder = "scripts/build_ui_atlas.py",
  committedDir = "public/assets/spritesheets",
} = {}) {
  const generatedDir = mkdtempSync(join(tmpdir(), "ibeetkidz-ui-atlas-"));
  try {
    const result = spawnSync(
      "python3",
      [builder, "--output-dir", generatedDir],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      throw new Error(
        `ui-atlas generator failed (${result.status ?? "signal"}):\n${result.stderr || result.stdout}`,
      );
    }
    compareAtlasDirectories(generatedDir, committedDir);
  } finally {
    rmSync(generatedDir, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  try {
    checkUiAtlas();
    console.log("ok: committed ui atlas matches generated JSON and decoded PNG pixels");
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    console.error("regenerate with: python3 scripts/build_ui_atlas.py");
    process.exitCode = 1;
  }
}
