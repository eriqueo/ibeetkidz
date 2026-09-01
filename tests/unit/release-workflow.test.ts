import { describe, expect, it } from "vitest";
import assetWorkflow from "../../.github/workflows/asset-size.yml?raw";
import buildWorkflow from "../../.github/workflows/build-and-deploy.yml?raw";
import testWorkflow from "../../.github/workflows/test.yml?raw";
import imageRequirements from "../../scripts/requirements-ui-atlas.txt?raw";
import packageText from "../../package.json?raw";
import trackReleaseEvidence from "../e2e/track-release-evidence.spec.ts?raw";

const atlasCheck = "bash scripts/check-ui-atlas-fresh.sh";
const installImageTools =
  "python3 -m pip install --quiet -r scripts/requirements-ui-atlas.txt";
const workshopCarArtCheck = "npm run check:workshop-car-art";

function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe("release workflow", () => {
  it("blocks the Pages build on the shared UI-atlas freshness check", () => {
    expect(occurrences(buildWorkflow, atlasCheck)).toBe(1);
    expect(buildWorkflow.indexOf(atlasCheck)).toBeLessThan(
      buildWorkflow.indexOf("npm run build"),
    );
    expect(buildWorkflow).toContain("needs: [build, tests]");
  });

  it("keeps the advisory asset workflow on the same atlas check", () => {
    expect(occurrences(assetWorkflow, atlasCheck)).toBe(1);
    expect(occurrences(assetWorkflow, "actions/setup-node@v4")).toBe(1);
    expect(occurrences(assetWorkflow, "npm ci")).toBe(1);
    expect(assetWorkflow.indexOf("npm ci")).toBeLessThan(
      assetWorkflow.indexOf(atlasCheck),
    );
    expect(buildWorkflow).not.toContain("scripts/build_ui_atlas.py");
    expect(assetWorkflow).not.toContain("scripts/build_ui_atlas.py");
  });

  it("installs one pinned image-validation toolchain in both workflows", () => {
    expect(imageRequirements.trim().split("\n")).toEqual([
      "Pillow==12.3.0",
      "numpy==2.5.2",
    ]);
    expect(occurrences(buildWorkflow, installImageTools)).toBe(1);
    expect(occurrences(assetWorkflow, installImageTools)).toBe(1);
    expect(buildWorkflow).not.toMatch(/pip install --quiet pillow\b/i);
    expect(assetWorkflow).not.toMatch(/pip install --quiet pillow\b/i);
  });

  it("blocks the Pages build on the accepted AR-060 geometry", () => {
    const packageJson = JSON.parse(packageText) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["check:workshop-car-art"]).toBe(
      "python3 scripts/validate_ar060_reopens.py",
    );
    expect(occurrences(buildWorkflow, workshopCarArtCheck)).toBe(1);
    expect(buildWorkflow.indexOf(installImageTools)).toBeLessThan(
      buildWorkflow.indexOf(workshopCarArtCheck),
    );
    expect(buildWorkflow.indexOf(workshopCarArtCheck)).toBeLessThan(
      buildWorkflow.indexOf("npm run build"),
    );
  });

  it("isolates the current focus/endless-Ride release journey by a stable tag", () => {
    const tag = "@track-focus-release";
    expect(occurrences(trackReleaseEvidence, tag)).toBe(1);
    expect(occurrences(testWorkflow, `--grep "${tag}"`)).toBe(1);
    expect(testWorkflow).toContain("suite: track-focus");
    expect(testWorkflow).not.toMatch(/track-finite|finite Track journey|finite Track ride/i);
  });
});
