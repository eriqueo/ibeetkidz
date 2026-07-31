// Ticket B1: the `public/` asset URLs must carry the DEPLOY BASE, not the
// DOCUMENT base.
//
// The four spritesheet atlases and the packed ui-atlas ship verbatim in
// `public/assets/spritesheets/`. They used to be referenced as bare
// document-relative strings ("assets/spritesheets/train.png"), which resolve
// correctly only when the document base happens to be the app directory:
// served at "/ibeetkidz/" they work, served at "/ibeetkidz" (no trailing slash)
// the base is the SITE ROOT and every one of them 404s off the deployment.
//
// `joinPublicBase` is the pure half of the one producer, so the slash contract
// is pinned here without needing a build; `publicAssetUrl` binds it to Vite's
// `import.meta.env.BASE_URL` (which is "/" under Vitest, "/ibeetkidz/" for the
// `--mode gh` build). The whole point is that the result is root-absolute, so a
// grep for a leading "/" is the load-bearing assertion.

import { describe, expect, it } from "vitest";
import { joinPublicBase, publicAssetUrl } from "../../src/game/assets.ts";

// Source text of every module, for the call-site guard below. Same
// `import.meta.glob(..., '?raw')` idiom as architecture.test.ts, and the same
// reason it lives in `tests/`: it scans `src/**` only, so it can never read —
// or trip on — its own patterns.
const SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(
  import.meta.glob("../../src/**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>,
)
  .map(([path, text]) => [path.replace(/^(\.\.\/)+/, ""), text] as const)
  .sort(([a], [b]) => a.localeCompare(b));

describe("joinPublicBase", () => {
  it("joins Vite's already-slash-terminated base without doubling the slash", () => {
    expect(joinPublicBase("/ibeetkidz/", "assets/spritesheets/train.png"))
      .toBe("/ibeetkidz/assets/spritesheets/train.png");
    expect(joinPublicBase("/", "assets/spritesheets/train.png"))
      .toBe("/assets/spritesheets/train.png");
  });

  it("never emits a double slash, whichever side supplies one", () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["/ibeetkidz/", "assets/x.png"],
      ["/ibeetkidz", "assets/x.png"],
      ["/ibeetkidz/", "/assets/x.png"],
      ["/ibeetkidz", "/assets/x.png"],
      ["/", "assets/x.png"],
      ["/", "/assets/x.png"],
    ];
    for (const [base, path] of cases) {
      const url = joinPublicBase(base, path);
      expect(url, `${base} + ${path}`).not.toMatch(/\/\//);
      expect(url, `${base} + ${path}`).toMatch(/\/assets\/x\.png$/);
    }
  });

  it("supplies the separator when a base lacks its trailing slash", () => {
    expect(joinPublicBase("/ibeetkidz", "assets/x.png")).toBe("/ibeetkidz/assets/x.png");
  });

  it("leaves a bare-directory path (Phaser's multiatlas `path` arg) un-terminated", () => {
    // Phaser's Loader.setPath appends the separating "/" itself; we must not
    // pre-empt it, or the pages would load from ".../spritesheets//page.png".
    expect(joinPublicBase("/ibeetkidz/", "assets/spritesheets")).toBe("/ibeetkidz/assets/spritesheets");
  });
});

describe("publicAssetUrl", () => {
  it("is root-absolute, so it does NOT depend on the document base", () => {
    // The regression this ticket fixes: a returned "assets/..." is
    // document-relative and breaks at any base but the app directory.
    for (const path of [
      "assets/spritesheets/train.png",
      "assets/spritesheets/ui-atlas.json",
      "assets/spritesheets",
    ]) {
      const url = publicAssetUrl(path);
      expect(url.startsWith("/"), url).toBe(true);
      expect(url).not.toMatch(/\/\//);
      expect(url.endsWith(path)).toBe(true);
    }
  });

  it("uses Vite's BASE_URL as its prefix", () => {
    expect(publicAssetUrl("assets/spritesheets/train.png"))
      .toBe(joinPublicBase(import.meta.env.BASE_URL, "assets/spritesheets/train.png"));
  });
});

// The helper above is only worth anything if the loader CALL SITES use it.
// Without this guard, reverting the sprite-assets.ts / ui-sprites.ts hunks
// would leave the suite green and the bug back.
describe("Phaser loader call sites", () => {
  it("scans a real, non-empty source set", () => {
    // A guard that scans nothing passes everything.
    expect(SOURCES.length).toBeGreaterThan(20);
    expect(SOURCES.map(([p]) => p)).toContain("src/game/sprite-assets.ts");
    expect(SOURCES.map(([p]) => p)).toContain("src/game/ui-sprites.ts");
  });

  it("never passes a document-relative asset literal to scene.load.*", () => {
    // Only the ARGUMENT TEXT of each `.load.<type>(…)` call is inspected, so
    // the surrounding prose (which necessarily quotes the bad form) is out of
    // scope without needing a comment stripper. A `publicAssetUrl("assets/…")`
    // wrapper is erased first — that is the one sanctioned form.
    const offenders: string[] = [];
    for (const [path, text] of SOURCES) {
      for (const call of loaderCalls(text)) {
        const bare = call.replace(/publicAssetUrl\(\s*[`"'][^`"']*[`"']\s*\)/g, "");
        if (/["'`]assets\//.test(bare)) offenders.push(`${path}: ${call.replace(/\s+/g, " ")}`);
      }
    }
    expect(offenders, "public/ paths must go through publicAssetUrl()").toEqual([]);
  });
});

/** The argument text of every `.load.<type>( … )` call in `src`, paren-balanced
 *  so a multi-line call is one string. */
function loaderCalls(src: string): string[] {
  const calls: string[] = [];
  const re = /\.load\.\w+\(/g;
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")" && --depth === 0) {
        calls.push(src.slice(m.index, i + 1));
        break;
      }
    }
  }
  return calls;
}
