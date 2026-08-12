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

  // 6. The dev-only scene editor is reachable ONLY through a dynamic import.
  //
  // Not one of CLAUDE.md's original five — this one guards a NEW seam. The
  // editor (`src/editor/`, `?edit`) may read the game freely, but the game must
  // never name it, or Rollup pulls the whole chunk into the production graph
  // and kids ship a level editor. `scripts/check-no-editor-in-dist.sh` catches
  // that in the OUTPUT (verified to fail on a real leak, not just to pass on a
  // clean tree); this catches it in the SOURCE, where the diff is legible.
  it("lets nothing outside src/editor reach it except one dynamic import", () => {
    const outside = SOURCES.filter(([p]) => !p.startsWith("src/editor/"));
    const STATIC = /(?:^|\n)\s*import\s[^\n]*from\s*["'][^"']*editor\/[^"']*["']/;
    expect(offenders(STATIC, outside)).toEqual([]);

    // …and exactly one dynamic reference, so a second entry point cannot be
    // added without this line turning red and asking why.
    const DYNAMIC = /import\s*\(\s*["'][^"']*editor\/[^"']*["']\s*\)/;
    const dynamic = offenders(DYNAMIC, outside).map((hit) => hit.split(":")[0]);
    expect(dynamic).toEqual(["src/app/context.tsx"]);
  });

  // 7. Every loader call is guarded by a cache check.
  //
  // Also not one of CLAUDE.md's original five. It became load-bearing when one
  // `Phaser.Game` started serving all four scenes: with a shared TextureManager,
  // re-entering a space re-queues assets it already holds, and `load.atlas` fails
  // SILENTLY on the second call — the PNG is skipped as a cache conflict while
  // the JSON is refetched, so Phaser's MultiFile sits at 1-of-2 and never
  // reaches `addToCache`. `loadSpriteAssets` shipped unguarded for exactly that
  // reason and nobody noticed, because with a game per view it could not bite.
  //
  // The check: every asset-queuing call must have a `.exists(` cache check
  // within the preceding few CODE lines (blank/comment-only lines don't count
  // against the budget, so a comment block between the guard and the call is
  // fine). Deliberately shape-based rather than semantic — it matches the
  // dialect all six existing call sites already use, and a new site that wants
  // to be different has to come argue with this test.
  it("guards every Phaser loader call with a cache check", () => {
    // `once`/`start`/`reset` don't queue anything; only these four do.
    const QUEUES = /\.load\.(image|atlas|multiatlas|spritesheet|audio|json|binary)\s*\(/;
    const GUARD = /\.exists\s*\(/;
    const WINDOW = 8;
    const offenders: string[] = [];
    for (const [path, text] of SOURCES) {
      // Code lines only, keeping their real line numbers for the message.
      const code = text
        .split("\n")
        .map((line, i) => [i + 1, line.trim()] as const)
        .filter(([, line]) => line.length > 0);
      code.forEach(([lineNo, line], i) => {
        if (!QUEUES.test(line)) return;
        const back = code.slice(Math.max(0, i - WINDOW), i + 1);
        if (!back.some(([, prev]) => GUARD.test(prev))) {
          offenders.push(`${path}:${lineNo}  ${line}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  // …and the guard above is worthless if it is scanning nothing. Loader calls
  // only ever live in the game layer; if that stops being true the count check
  // fails rather than the rule quietly passing over zero call sites.
  it("has loader calls to guard", () => {
    const QUEUES = /\.load\.(image|atlas|multiatlas|spritesheet|audio|json|binary)\s*\(/;
    const sites = offenders(QUEUES);
    expect(sites.length).toBeGreaterThanOrEqual(6);
    expect(sites.every((hit) => hit.startsWith("src/game/"))).toBe(true);
  });

  // 8. The audio clock drives the visual, NEVER the reverse (PROJECT_CHARTER
  // Decision A4). Terrain is the most likely place to invert that, because it
  // is *picked* while the train is moving, so "which bar does this land on?"
  // reads naturally — and wrongly — as "where is the train drawn right now?".
  // The answer must come from the transport, which lives behind SoundPort. So:
  // nothing in the game/render layer may schedule terrain itself.
  it("resolves terrain from the transport, never from the render loop", () => {
    const renderLayer = SOURCES.filter(([p]) => p.startsWith("src/game/"));
    expect(renderLayer.length).toBeGreaterThan(0);
    expect(offenders(/\bscheduleTerrain\s*\(/, renderLayer)).toEqual([]);
    // …and the scene must not compute a bar for it either.
    expect(offenders(/\bapplyTerrain\s*\(/, renderLayer)).toEqual([]);
  });

  // The guard above is worthless if terrain scheduling has moved or vanished.
  it("has exactly one place that schedules terrain", () => {
    const sites = offenders(/\bscheduleTerrain\s*\(/).map((h) => h.split(":")[0]);
    expect(new Set(sites)).toEqual(
      new Set([
        "src/ports/sound-port.ts", // the contract
        "src/adapters/tone-sound-port.ts", // the one implementation
        "src/core/audio-engine.ts", // the one caller
      ]),
    );
  });

  // 9. The adapter reads the transport/destination through its pinned live-
  // context getters, never the global accessors. `Tone.Offline` (the fx bake)
  // SWAPS the global context synchronously and restores it only after its
  // callback settles — a live-path `Tone.getTransport()` during that window
  // schedules onto a throwaway offline transport (a silently dead car), and
  // two overlapping bakes restore each other's contexts and strand the app
  // deaf until reload (both measured, 2026-08-12). Exactly one occurrence of
  // each accessor may exist: the fallback inside the pinned getter itself.
  it("pins the live transport/destination in the Tone adapter", () => {
    const adapter = SOURCES.filter(([p]) => p === "src/adapters/tone-sound-port.ts");
    expect(adapter.length).toBe(1);
    expect(offenders(/Tone\.getTransport\s*\(/, adapter).length).toBe(1);
    expect(offenders(/Tone\.getDestination\s*\(/, adapter).length).toBe(1);
    // `Tone.Time`/`Tone.Ticks` conversions read the GLOBAL transport's tempo,
    // so they are banned outright — tempo math derives from the pinned one.
    expect(offenders(/Tone\.(Time|Ticks)\s*\(/, adapter)).toEqual([]);
  });

  // The editor is only worth guarding if it is actually there.
  it("has an editor to guard", () => {
    const files = SOURCES.filter(([p]) => p.startsWith("src/editor/")).map(([p]) => p);
    expect(files).toContain("src/editor/boot.ts");
    expect(files.length).toBeGreaterThan(3);
  });
});
