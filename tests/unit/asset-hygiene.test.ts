import { describe, expect, it } from "vitest";

// Runtime sprites normally belong to a purpose-specific directory or a packed
// atlas. The root accumulated standalone precursors that looked available but
// had no loader; the 2026-08-28 cleanup removed seventeen of them. Handcar is
// the deliberate exception: it is the Map's scene fixture and is loaded through
// SPRITES in game/assets.ts.
const ROOT_SPRITES = import.meta.glob("../../src/assets/sprites/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

describe("asset hygiene", () => {
  it("keeps loose root sprites limited to the Map handcar fixture", () => {
    const names = Object.keys(ROOT_SPRITES)
      .map((path) => path.split("/").pop())
      .sort();

    expect(names).toEqual(["handcar.png"]);
  });
});
