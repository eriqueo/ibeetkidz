import { describe, expect, it } from "vitest";
import assetWorkflow from "../../.github/workflows/asset-size.yml?raw";
import buildWorkflow from "../../.github/workflows/build-and-deploy.yml?raw";
import imageRequirements from "../../scripts/requirements-ui-atlas.txt?raw";

const atlasCheck = "bash scripts/check-ui-atlas-fresh.sh";
const installImageTools =
  "python3 -m pip install --quiet -r scripts/requirements-ui-atlas.txt";

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
    expect(buildWorkflow).not.toContain("scripts/build_ui_atlas.py");
    expect(assetWorkflow).not.toContain("scripts/build_ui_atlas.py");
  });

  it("installs one pinned Pillow toolchain in both workflows", () => {
    expect(imageRequirements.trim()).toBe("Pillow==12.3.0");
    expect(occurrences(buildWorkflow, installImageTools)).toBe(1);
    expect(occurrences(assetWorkflow, installImageTools)).toBe(1);
    expect(buildWorkflow).not.toMatch(/pip install --quiet pillow\b/i);
    expect(assetWorkflow).not.toMatch(/pip install --quiet pillow\b/i);
  });
});
