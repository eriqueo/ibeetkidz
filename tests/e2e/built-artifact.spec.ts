import { expect, test, type Page } from "@playwright/test";
import { parseTiledLayer } from "../../src/game/TiledParser.ts";
import mapMap from "../../src/assets/maps/map.json" with { type: "json" };

// Ticket S8 — verify the thing kids actually touch.
//
// Every other spec drives `npm run dev`, where Vite serves from `/` and rewrites
// nothing. The artifact kids load is `dist-gh/`, built with `base:
// "/ibeetkidz/"` and served under that path prefix on GitHub Pages. Those two
// differ in exactly one way that matters: **how a relative URL resolves**. This
// spec is the only place that difference is under test.
//
// The trap, per the ticket: the base path served WITHOUT a trailing slash. At
// `…/ibeetkidz/` the document base is the app directory, so a document-relative
// loader URL happens to land inside the app. At `…/ibeetkidz` the document base
// is the SITE ROOT and the same URL resolves to `/assets/…` — off the
// deployment. It 404s only in the built artifact, never in `npm run dev`.
//
// WHAT IS ASSERTED, AND WHY IT IS THIS AND NOT SOMETHING CHEAPER.
// The first cut of this spec harvested `assets/…` string literals out of the
// shipped bundles and probed each one. That check was wrong in a way worth
// recording, because it looked convincing: it measured **how the URL was
// spelled in the bundle**, not whether the URL resolved. When B1 fixed the real
// defect it also rewrote the call sites to build the path in a template
// literal, so the bundle no longer contains any whole path — the harvest went
// silently blind to eight of the nine call sites it existed to guard, while
// false-positiving on the ninth. A regression would have kept the suite green.
//
// So the assertion is now a RUNTIME one: serve the real artifact at the
// no-trailing-slash base, DRIVE the app until its scenes run their real Phaser
// loaders, and require that every request the deployment received could be
// answered. That measures resolution, which is the thing we care about, and it
// is immune to how any URL is spelled or constructed.
//
// Track is the destination on purpose: `TrackScene.preload` is the only scene
// that runs BOTH loaders — `loadSpriteAssets` (four atlases, URL arguments) and
// `loadUiSprites` (the multiatlas, which additionally exercises Phaser's `path`
// argument, since the atlas JSON lists its pages as bare filenames and the
// loader prepends that path). MapScene alone loads neither and would prove
// nothing.
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
// `?oval` on purpose, and it is load-bearing — see the header note about Track
// being the destination because it is the only scene running BOTH loader
// shapes. That is the OVAL Track. The side-scroller (the default since
// 2026-08-16) preloads `loadUiSprites` plus Vite-globbed image URLs, which is a
// strict subset of the URL shapes the oval exercises: it never calls
// `loadSpriteAssets`, whose four URL-argument atlases are exactly what this
// spec exists to catch resolving wrong. Driving the default here would QUIETLY
// narrow the coverage while still passing.
const NO_TRAILING_SLASH = `${ORIGIN}${BASE}?oval`; // the URL under test
const CANONICAL = `${ORIGIN}${BASE}/?oval`; // what GitHub Pages 301-redirects to

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

// The Tiled authoring canvas, derived from the map itself rather than hardcoded
// — it is also the pixel size of the painted background art, which is the
// contract the whole Tiled workflow rests on.
const ART_W = mapMap.width * mapMap.tilewidth;
const ART_H = mapMap.height * mapMap.tileheight;
const VIEWPORT = { width: 1280, height: 720 };

/** Requests the browser makes on its own that no deployment owns. */
function isBrowserNoise(pathname: string): boolean {
  return (
    pathname === "/favicon.ico" || pathname === "/.well-known/appspecific/com.chrome.devtools.json"
  );
}

interface Observation {
  /** Requests the deployment could not answer, plus any uncaught page error. */
  failures: string[];
  /** Every URL the page requested, in order. */
  requests: string[];
}

/** Mount the built `dist-gh/` under `${BASE}` for this page and start recording. */
async function serveBuiltArtifact(page: Page, distDir: string): Promise<Observation> {
  const obs: Observation = { failures: [], requests: [] };

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

  page.on("request", (r) => obs.requests.push(r.url()));
  page.on("response", (r) => {
    if (r.status() >= 400 && !isBrowserNoise(new URL(r.url()).pathname)) {
      obs.failures.push(`${r.status()} ${r.url()}`);
    }
  });
  page.on("requestfailed", (r) => {
    if (!isBrowserNoise(new URL(r.url()).pathname)) {
      obs.failures.push(`FAILED ${r.url()} — ${r.failure()?.errorText ?? "unknown"}`);
    }
  });
  page.on("pageerror", (e) => obs.failures.push(`PAGE CRASH — ${e.message}`));

  return obs;
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
 * Tap the Map's painted landmark for `destination`.
 *
 * The built artifact has no test bridge (`__ibeetkidz_test__` is gated behind
 * `import.meta.env.DEV`), so this is a real click on the real canvas — which is
 * also what a kid does. The point comes from the app's OWN data and parser
 * (`map.json` + `parseTiledLayer`), never from copied coordinates, so
 * re-authoring the map moves the click with it. The cover-fit mirrors
 * `TiledSceneAdapter.coverRect` (unit-tested in
 * `tests/unit/tiled-scene-adapter.test.ts`); it is four lines here rather than
 * an import because `TiledSceneAdapter` pulls in `EventBus`, which imports
 * Phaser and touches `window` — neither survives Playwright's Node context.
 */
async function tapMapLandmark(page: Page, destination: string): Promise<void> {
  const spawn = parseTiledLayer(mapMap, "ui-layer").find((s) => s.arg === destination);
  expect(spawn, `map.json must still carry a nav hit-area for "${destination}"`).toBeDefined();

  const scale = Math.max(VIEWPORT.width / ART_W, VIEWPORT.height / ART_H);
  const bgW = ART_W * scale;
  const bgH = ART_H * scale;
  const bgX = (VIEWPORT.width - bgW) / 2;
  const bgY = (VIEWPORT.height - bgH) / 2;
  await page.mouse.click(bgX + spawn!.cx * bgW, bgY + spawn!.cy * bgH);
}

/**
 * Boot the artifact at `url`, tap through to the Track, and wait until that
 * scene's loaders have actually run. Returns the requests made after the tap.
 *
 * The wait keys on observed traffic rather than a fixed sleep: the multiatlas
 * PAGES are requested only after its JSON has been fetched and parsed, so
 * seeing a page proves both halves of the multiatlas path resolved.
 */
async function driveToTrack(page: Page, url: string, obs: Observation): Promise<string[]> {
  await page.setViewportSize(VIEWPORT);
  await bootBuilt(page, url);

  // MapScene's hit-areas are spawned in `create()`, which runs only after its
  // own `preload` has fetched the background + handcar. Wait for the traffic to
  // go quiet so the tap can't land on a scene that has not wired itself up yet.
  await page.waitForLoadState("networkidle");
  const beforeNav = obs.requests.length;
  const sceneRequests = (): string[] => obs.requests.slice(beforeNav);

  // A settled MapScene issues no further requests, so the first new request is
  // the navigation itself. Re-tap ONLY while nothing has happened — that way a
  // lost first tap is recovered without ever double-tapping into the next
  // scene's controls.
  await expect
    .poll(
      async () => {
        if (sceneRequests().length === 0) await tapMapLandmark(page, "track");
        return sceneRequests().length;
      },
      {
        timeout: 15_000,
        message:
          "tapping the Map's Track landmark produced no request at all — the tap missed. " +
          "Check map.json's nav hit-area and the cover-fit above.",
      },
    )
    .toBeGreaterThan(0);

  await expect
    .poll(() => sceneRequests().some((u) => /\/ui-atlas-\d+\.png$/.test(u)), {
      timeout: 20_000,
      message:
        "TrackScene's multiatlas pages never appeared — the tap did not reach the Track, " +
        "so this run proves nothing.",
    })
    .toBe(true);

  // Let anything the scene asks for after the atlases settle before judging.
  await page.waitForTimeout(1_500);
  return sceneRequests();
}

/**
 * Guard against a green that means "we navigated nowhere". A runtime probe that
 * never reached the loaders is exactly the failure mode this assertion
 * replaced, so it must fail loudly rather than report an empty failure list.
 *
 * These match on BASENAMES, never on a whole path or a prefix: the prefix is
 * the thing under test, so the guard must not assume one. If a rename ever
 * makes them stop matching, the guard fails — the safe direction.
 */
function assertLoadersActuallyRan(sceneRequests: string[]): void {
  expect(
    sceneRequests.length,
    "no request at all followed the Map tap — the probe navigated nowhere",
  ).toBeGreaterThan(0);

  const names = sceneRequests.map((u) => new URL(u).pathname.split("/").pop() ?? "");
  // loadSpriteAssets: four atlases, both halves of each.
  for (const atlas of ["train", "smoke", "signal", "tarp"]) {
    for (const ext of ["png", "json"]) {
      expect(names, `TrackScene must have requested ${atlas}.${ext}`).toContain(`${atlas}.${ext}`);
    }
  }
  // loadUiSprites: the multiatlas JSON (a URL argument) AND at least one page
  // (Phaser's `path` argument — the subtler half of the same bug class).
  expect(names, "TrackScene must have requested the chrome multiatlas").toContain("ui-atlas.json");
  expect(
    names.filter((n) => /^ui-atlas-\d+\.png$/.test(n)).length,
    "the multiatlas pages must have been requested (they exercise Phaser's `path` argument)",
  ).toBeGreaterThan(0);
}

/**
 * Absolute path to the built artifact, anchored to `playwright.config.ts` — NOT
 * to the process cwd (which varies by how the suite is invoked) and NOT to
 * `config.rootDir` (which Playwright resolves to `testDir`, i.e. `tests/e2e`).
 */
const distDirOf = (configFile: string | undefined): string =>
  `${(configFile ?? "").slice(0, (configFile ?? "").lastIndexOf("/"))}/dist-gh`;

test.describe("built GitHub Pages artifact (dist-gh/)", () => {
  test("serves every scene asset at a base path with NO trailing slash", async ({
    page,
  }, testInfo) => {
    const obs = await serveBuiltArtifact(page, distDirOf(testInfo.config.configFile));
    const sceneRequests = await driveToTrack(page, NO_TRAILING_SLASH, obs);

    assertLoadersActuallyRan(sceneRequests);
    expect(
      obs.failures,
      `the deployment could not answer these requests with the document base at ` +
        `${NO_TRAILING_SLASH}. A document-relative asset URL resolves to the SITE ROOT here — ` +
        `build it from import.meta.env.BASE_URL (see publicAssetUrl in src/game/assets.ts).`,
    ).toEqual([]);
  });

  // Control: the same drive at the URL GitHub Pages actually redirects to. If
  // this is green while the one above is red, the built bytes are fine and URL
  // resolution is the defect — the failure localises itself.
  test("serves every scene asset at the canonical trailing-slash URL", async ({
    page,
  }, testInfo) => {
    const obs = await serveBuiltArtifact(page, distDirOf(testInfo.config.configFile));
    const sceneRequests = await driveToTrack(page, CANONICAL, obs);

    assertLoadersActuallyRan(sceneRequests);
    expect(
      obs.failures,
      `the built artifact is broken at its own canonical URL (${CANONICAL})`,
    ).toEqual([]);
  });
});
