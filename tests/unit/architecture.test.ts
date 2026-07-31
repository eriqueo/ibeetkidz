// Architecture guards (ticket S2). CLAUDE.md states five architecture rules in
// prose; prose does not fail a build. These are the same five rules as
// executable source-text assertions over `src/**`.
//
// Two deliberate choices:
//
// 1. SCOPE IS `src/**` ONLY. This file lives in `tests/`, so the guards can
//    never scan themselves — the literal strings "Math.random", `from "tone"`
//    and "fetch(" appear below as patterns and must not be able to trip or
//    defeat their own check. Nothing here greps the test tree.
// 2. COMMENTS ARE STRIPPED before matching. The rules are about code, not
//    prose, and the tree already proves the point: `src/core/generative.ts`
//    documents itself with "No Math.random here." and `src/ports/storage-port.ts`
//    says "Store/fetch a recorded audio blob". A raw text scan would call both
//    of those violations. Stripping is what makes these guards honest instead
//    of merely loud.
//
// Sources come in via `import.meta.glob(..., '?raw')` — the same
// import-the-real-artifact idiom `tiled-maps.test.ts` uses for the Tiled
// fixtures, and it avoids depending on `@types/node` (not installed).

import { describe, expect, it } from "vitest";

const RAW = import.meta.glob("../../src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Repo-relative path (`src/core/rng.ts`) → source text, comments removed. */
const SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(RAW)
  .map(([path, text]) => [path.replace(/^(\.\.\/)+/, ""), stripComments(text)] as const)
  .sort(([a], [b]) => a.localeCompare(b));

// A guard that scans nothing passes everything. If the glob ever stops
// resolving, fail at collection time rather than reporting five green checks
// over an empty file list. (Deliberately not an `it` — S2's acceptance was
// exactly four passing assertions plus one skipped; M1 un-skipped the fifth.)
if (SOURCES.length < 20 || !SOURCES.some(([p]) => p === "src/adapters/tone-sound-port.ts")) {
  throw new Error(
    `architecture guards: source glob resolved ${SOURCES.length} files — pattern is broken`,
  );
}

/**
 * Remove block and line comments. The line-comment rule refuses to fire when
 * the `//` is preceded by `:` or a quote so that `"https://..."` inside a
 * string literal doesn't swallow the rest of the line.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Every `file:line` in `files` whose code line matches `pattern`. */
function offenders(
  pattern: RegExp,
  files: ReadonlyArray<readonly [string, string]> = SOURCES,
): string[] {
  const hits: string[] = [];
  for (const [path, text] of files) {
    text.split("\n").forEach((line, i) => {
      if (pattern.test(line)) hits.push(`${path}:${i + 1}  ${line.trim()}`);
    });
  }
  return hits;
}

const under = (...prefixes: string[]) =>
  SOURCES.filter(([p]) => !prefixes.some((prefix) => p.startsWith(prefix)));

describe("architecture guards (source text over src/**)", () => {
  // 1. Hexagonal core: the core and its ports know nothing about adapters.
  it("keeps src/core and src/ports free of adapter imports", () => {
    const core = SOURCES.filter(
      ([p]) => p.startsWith("src/core/") || p.startsWith("src/ports/"),
    );
    expect(core.length).toBeGreaterThan(0);
    expect(
      offenders(/(from|import)\s*\(?\s*["'][^"']*adapters\//, core),
    ).toEqual([]);
  });

  // 2. Tone.js is a vendor detail of exactly one file.
  it("imports Tone.js only in src/adapters/tone-sound-port.ts", () => {
    const others = SOURCES.filter(([p]) => p !== "src/adapters/tone-sound-port.ts");
    expect(offenders(/(from|import)\s*\(?\s*["']tone(\/[^"']*)?["']/, others)).toEqual([]);
  });

  // 3. Randomness goes through RngPort so reducers stay pure and replayable.
  it("never reaches for Math.random in src", () => {
    expect(offenders(/\bMath\s*\.\s*random\b/)).toEqual([]);
  });

  // 4. Kid-safe + private: the app makes no network calls, ever.
  it("contains no network verbs in src", () => {
    const NETWORK =
      /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\b|\baxios\b|\bnavigator\s*\.\s*sendBeacon\b/;
    expect(offenders(NETWORK)).toEqual([]);
  });

  // 5. React is presentation only. (Un-skipped by M1, which deleted the one
  // live violation, `src/machines/tools.tsx`, after moving `laneColor` into
  // `src/core/lane-color.ts`.)
  it("keeps React out of everything but App/main/components/app", () => {
    const outside = under(
      "src/App.tsx",
      "src/main.tsx",
      "src/components/",
      "src/app/",
    );
    expect(
      offenders(/(from|import)\s*\(?\s*["']react(-dom)?(\/[^"']*)?["']/, outside),
    ).toEqual([]);
  });
});
