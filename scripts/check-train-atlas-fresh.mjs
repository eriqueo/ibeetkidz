import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "pngjs";

export function compareTrainAtlas(generatedDir, committedDir) {
  const generatedJson = readFileSync(join(generatedDir, "train.json"));
  const committedJson = readFileSync(join(committedDir, "train.json"));
  if (!generatedJson.equals(committedJson)) {
    throw new Error("train.json differs from the deterministic generator output");
  }

  const generated = PNG.sync.read(readFileSync(join(generatedDir, "train.png")));
  const committed = PNG.sync.read(readFileSync(join(committedDir, "train.png")));
  const generatedModel = `${generated.width}x${generated.height}/${generated.colorType}/${generated.depth}`;
  const committedModel = `${committed.width}x${committed.height}/${committed.colorType}/${committed.depth}`;
  if (generatedModel !== committedModel) {
    throw new Error(`train.png dimensions or color model differ: ${generatedModel} != ${committedModel}`);
  }
  if (!Buffer.from(generated.data).equals(Buffer.from(committed.data))) {
    throw new Error("train.png decoded pixels differ from the tracked source frames");
  }
}

export function checkTrainAtlas({
  builder = "scripts/build_train_atlas.py",
  committedDir = "public/assets/spritesheets",
} = {}) {
  const generatedDir = mkdtempSync(join(tmpdir(), "ibeetkidz-train-atlas-"));
  try {
    const result = spawnSync(
      "python3",
      [builder, "--output-dir", generatedDir],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.status !== 0) {
      throw new Error(
        `train-atlas generator failed (${result.status ?? "signal"}):\n${result.stderr || result.stdout}`,
      );
    }
    compareTrainAtlas(generatedDir, committedDir);
  } finally {
    rmSync(generatedDir, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  try {
    checkTrainAtlas();
    console.log("ok: committed train atlas matches tracked JSON and decoded PNG pixels");
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    console.error("regenerate with: python3 scripts/build_train_atlas.py");
    process.exitCode = 1;
  }
}
