// @ts-expect-error -- test-host builtin without project-wide Node types
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import atlas from "../../public/assets/spritesheets/ui-atlas.json";
import policy from "../../scripts/ui-atlas-policy.json";

describe("shipped UI texture resources", () => {
  it("fits the decoded budget, including atlas padding", () => {
    const bytes = atlas.textures.reduce((total, texture) => {
      // Read the actual PNG IHDR: a small download is not a small GPU texture.
      const png = readFileSync(`public/assets/spritesheets/${texture.image}`);
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(texture.size).toEqual({ w: width, h: height });
      expect(width).toBeLessThanOrEqual(policy.pageSize);
      expect(height).toBeLessThanOrEqual(policy.pageSize);
      return total + width * height * 4;
    }, 0);
    expect(bytes).toBeLessThanOrEqual(policy.maxDecodedBytes);
  });

  it("keeps trimmed artwork inside its original runtime canvas", () => {
    const names = new Set<string>();
    for (const texture of atlas.textures) for (const frame of texture.frames) {
      expect(names.has(frame.filename)).toBe(false);
      names.add(frame.filename);
      const { frame: cut, spriteSourceSize: trim, sourceSize: source } = frame;
      expect(cut.x + cut.w).toBeLessThanOrEqual(texture.size.w);
      expect(cut.y + cut.h).toBeLessThanOrEqual(texture.size.h);
      expect(trim.w).toBe(cut.w);
      expect(trim.h).toBe(cut.h);
      expect(trim.x + trim.w).toBeLessThanOrEqual(source.w);
      expect(trim.y + trim.h).toBeLessThanOrEqual(source.h);
    }
  });
});
