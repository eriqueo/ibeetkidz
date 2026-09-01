import { describe, expect, it } from "vitest";
import { CAR_TYPES } from "../../src/core/types.ts";
import { CAR_OPEN_SPRITES } from "../../src/game/assets.ts";

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

  it("ships a complete open body and front for every Workshop car type", () => {
    expect(Object.keys(CAR_OPEN_SPRITES).sort()).toEqual([...CAR_TYPES].sort());
    for (const [type, asset] of Object.entries(CAR_OPEN_SPRITES)) {
      expect(asset.url, `${type} body`).not.toBe("");
      expect(asset.front.url, `${type} front`).not.toBe("");
    }
  });
});
