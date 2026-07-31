import { expect, test, type Page } from "@playwright/test";

// Ticket S8 — verify the thing kids actually touch.
//
// Every other spec drives `npm run dev`, where Vite serves from `/` and rewrites
// nothing. The artifact kids load is `dist-gh/`, built with `base:
// "/ibeetkidz/"` and served under that path prefix on GitHub Pages. Those two
// differ in exactly one way that matters: **how a relative URL resolves**. This
// spec is the only place that difference is under test.
//
// The trap it hunts, per the ticket: the base path served WITHOUT a trailing
// slash. At `…/ibeetkidz/` the document base is the app directory, so a loader
// URL like `assets/spritesheets/train.png` resolves inside the app. At
// `…/ibeetkidz` the document base is the SITE ROOT, and the same URL resolves to
// `/assets/…` — off the deployment. Any asset referenced relatively 404s, and
// it 404s only in the built artifact, never in `npm run dev`.
//
// HARNESS — why `page.route` and not a real server:
//   * `vite preview --mode gh` cannot reproduce the trap at all: it 404s on
//     `/ibeetkidz` rather than serving index.html there (verified, S8).
//   * A hand-rolled `node:http` server cannot live in a spec — this repo has no
//     `@types/node`, and `tsconfig.json` includes `tests/`, so `import
//     "node:http"` fails `npm run typecheck`.
//   * Route fulfilment reads the REAL built bytes off disk and needs no port,
//     so it can never be hijacked by a stray server the way an unpinned
//     `PW_PORT` can (see BASELINE.md).
// The serving policy below is deliberately dumb and explicit: mount `dist-gh/`
// at `/ibeetkidz`, serve index.html for that exact path AND for the trailing-
// slash form, NO redirect between them, and a real 404 for everything else. A
// redirect is what hides this bug class in production; the spec must not add
// one back.
//
// FRESHNESS: `npm run test:e2e` builds `dist-gh/` first (package.json). If the
// artifact is missing, the document 404s and the first assertion names the fix
// — this spec cannot pass vacuously against an absent build.

const BASE = "/ibeetkidz"; // must match `base` in vite.config.ts for `--mode gh`
const ORIGIN = "http://ibeetkidz.test"; // synthetic; every request is fulfilled from disk
const NO_TRAILING_SLASH = `${ORIGIN}${BASE}`; // the URL under test
const CANONICAL = `${ORIGIN}${BASE}/`; // what GitHub Pages 301-redirects to

// Explicit, not inferred: a module script served with the wrong Content-Type is
// rejected by the browser, which would look like an app bug instead of a
// harness bug.
const MIME: Record<string, string> = {
  html: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  json: "application/json",
  map: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  txt: "text/plain",
};

/** Requests the browser makes on its own that no deployment owns. */
function isBrowserNoise(pathname: string): boolean {
  return (
    pathname === "/favicon.ico" || pathname === "/.well-known/appspecific/com.chrome.devtools.json"
  );
}

/**
 * Mount the built `dist-gh/` under `${BASE}` for this page. The returned array
 * accumulates every request the deployment could not answer, plus any uncaught
 * page error — i.e. the ways a built artifact breaks that a dev server hides.
 */
async function serveBuiltArtifact(page: Page, distDir: string): Promise<string[]> {
  const failures: string[] = [];

  await page.route(`${ORIGIN}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const notFound = (why: string): Promise<void> =>
      route.fulfill({ status: 404, contentType: "text/plain", body: `404 ${pathname} (${why})` });

    // Serve index.html at BOTH forms of the base path, and do not redirect
    // between them — the redirect is precisely what masks the bug in prod.
    const rel =
      pathname === BASE || pathname === `${BASE}/`
        ? "index.html"
        : pathname.startsWith(`${BASE}/`)
          ? pathname.slice(BASE.length + 1)
          : null;

    if (rel === null || rel.includes("..")) {
      await notFound("outside the deployment");
      return;
    }
    const ext = rel.includes(".") ? rel.slice(rel.lastIndexOf(".") + 1).toLowerCase() : "";
    try {
      await route.fulfill({
        path: `${distDir}/${decodeURIComponent(rel)}`,
        contentType: MIME[ext] ?? "application/octet-stream",
      });
    } catch {
      await notFound("no such file in dist-gh/");
    }
  });

  page.on("response", (r) => {
    if (r.status() >= 400 && !isBrowserNoise(new URL(r.url()).pathname)) {
      failures.push(`${r.status()} ${r.url()}`);
    }
  });
  page.on("requestfailed", (r) => {
    if (!isBrowserNoise(new URL(r.url()).pathname)) {
      failures.push(`FAILED ${r.url()} — ${r.failure()?.errorText ?? "unknown"}`);
    }
  });
  page.on("pageerror", (e) => failures.push(`PAGE CRASH — ${e.message}`));

  return failures;
}

/** Load the artifact at `url` and take it through the gesture gate. */
async function bootBuilt(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  expect(
    response?.status(),
    `${url} must serve dist-gh/index.html — run \`npm run build:gh\` if this is 404`,
  ).toBe(200);
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start, "the boot gate must render in the built artifact").toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("canvas").first(), "Phaser must reach a rendered canvas").toBeVisible();
}

/**
 * Every asset URL the SHIPPED bundles reference relatively, harvested from the
 * bundles the page actually loaded — not from a hand-maintained list, so a new
 * relative asset is covered the day it lands.
 */
async function relativeAssetRefs(page: Page): Promise<string[]> {
  const harvest = await page.evaluate(async () => {
    const bundles = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((n) => n.endsWith(".js"));
    const refs = new Set<string>();
    for (const url of bundles) {
      const src = await (await fetch(url)).text();
      for (const m of src.matchAll(/["'`](assets\/[\w\-./]+\.\w{2,5})["'`]/g)) refs.add(m[1]!);
    }
    return { bundleCount: bundles.length, refs: [...refs].sort() };
  });
  expect(harvest.bundleCount, "no JS bundle loaded — the harvest would be vacuous").toBeGreaterThan(0);
  return harvest.refs;
}

/**
 * Resolve each ref the way the browser resolves a loader URL (against
 * `document.baseURI`, which is exactly what Phaser's Loader relies on) and
 * fetch it. Returns the ones the deployment cannot answer.
 */
async function unresolvableRefs(page: Page, refs: string[]): Promise<string[]> {
  const results = await page.evaluate(async (paths: string[]) => {
    const out: { ref: string; resolved: string; status: number }[] = [];
    for (const ref of paths) {
      const resolved = new URL(ref, document.baseURI).href;
      try {
        out.push({ ref, resolved, status: (await fetch(resolved)).status });
      } catch {
        out.push({ ref, resolved, status: -1 });
      }
    }
    return out;
  }, refs);
  return results.filter((r) => r.status !== 200).map((r) => `${r.status} ${r.ref} → ${r.resolved}`);
}

/**
 * Absolute path to the built artifact, anchored to `playwright.config.ts` — NOT
 * to the process cwd (which varies by how the suite is invoked) and NOT to
 * `config.rootDir` (which Playwright resolves to `testDir`, i.e. `tests/e2e`).
 */
const distDirOf = (configFile: string | undefined): string =>
  `${(configFile ?? "").slice(0, (configFile ?? "").lastIndexOf("/"))}/dist-gh`;

test.describe("built GitHub Pages artifact (dist-gh/)", () => {
  test("boots at its base path served without a trailing slash", async ({ page }, testInfo) => {
    const failures = await serveBuiltArtifact(page, distDirOf(testInfo.config.configFile));
    await bootBuilt(page, NO_TRAILING_SLASH);
    // Give the boot scene's loaders a beat to finish before judging the tally.
    await page.waitForTimeout(2_000);
    expect(failures, `requests the deployment could not answer at ${NO_TRAILING_SLASH}`).toEqual([]);
  });

  test("every asset the bundles reference resolves without a trailing slash", async ({
    page,
  }, testInfo) => {
    await serveBuiltArtifact(page, distDirOf(testInfo.config.configFile));
    await bootBuilt(page, NO_TRAILING_SLASH);

    const refs = await relativeAssetRefs(page);
    expect(refs.length, "harvested no asset references — the check would be vacuous").toBeGreaterThan(
      0,
    );
    expect(
      await unresolvableRefs(page, refs),
      `these asset URLs resolve off the deployment when the base path carries no trailing slash ` +
        `(document base = ${NO_TRAILING_SLASH}). The fix is to build them from ` +
        `import.meta.env.BASE_URL instead of a document-relative literal.`,
    ).toEqual([]);
  });

  // Control: the SAME assertion at the URL GitHub Pages actually redirects to.
  // If this one is green while the one above is red, the built bytes are fine
  // and relative URL resolution is the defect — the failure localises itself.
  test("every asset resolves at the canonical trailing-slash URL", async ({ page }, testInfo) => {
    await serveBuiltArtifact(page, distDirOf(testInfo.config.configFile));
    await bootBuilt(page, CANONICAL);

    const refs = await relativeAssetRefs(page);
    expect(refs.length, "harvested no asset references — the check would be vacuous").toBeGreaterThan(
      0,
    );
    expect(
      await unresolvableRefs(page, refs),
      `the built artifact is broken at its own canonical URL (${CANONICAL})`,
    ).toEqual([]);
  });
});
