import { describe, expect, it } from "vitest";

// Runtime sprites normally belong to a purpose-specific directory or a packed
// atlas. The root accumulated standalone precursors that looked available but
// had no loader; loose runtime exceptions are not allowed.
const ROOT_SPRITES = import.meta.glob("../../src/assets/sprites/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

describe("asset hygiene", () => {
  it("keeps the loose root sprite directory empty", () => {
    const names = Object.keys(ROOT_SPRITES)
      .map((path) => path.split("/").pop())
      .sort();

    expect(names).toEqual([]);
  });
});
