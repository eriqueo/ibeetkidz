import { expect, test } from "@playwright/test";

test("the Pages artifact installs and boots after the network disappears", async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const appUrl = testInfo.project.metadata.pwaOrigin;
  if (typeof appUrl !== "string") throw new Error("playwright config must provide pwaOrigin");
  await page.goto(appUrl);
  await expect(page.getByRole("button", { name: /tap to start/i })).toBeVisible();
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), {
      timeout: 15_000,
      message: "the registration script emitted by the release build must run",
    })
    .toBe(1);

  const precacheEntryCount = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const swText = await fetch(new URL("sw.js", registration.scope)).then((response) =>
      response.text(),
    );
    return [...swText.matchAll(/url:"([^"]+)"/g)].length;
  });

  expect(precacheEntryCount, "the generated worker must carry the whole release manifest").toBeGreaterThan(90);
  const cacheSummary = await page.evaluate(async () => {
    const names = await caches.keys();
    const requests = names.length > 0 ? await (await caches.open(names[0]!)).keys() : [];
    return { names, urls: requests.slice(0, 3).map((request) => request.url) };
  });
  expect(cacheSummary.names, JSON.stringify(cacheSummary)).not.toHaveLength(0);

  // The first navigation installs the worker; a controlled online reload
  // mirrors closing/reopening once before taking a tablet away from Wi-Fi.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  // Abort anything that escapes the service worker. Playwright's CDP-level
  // offline switch also disconnects the worker process itself on some bundled
  // Chromium builds, which tests the harness rather than the cache boundary.
  await context.route("**/*", (route) => route.abort("internetdisconnected"));
  await page.reload();
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start, "the app shell must come from CacheStorage").toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("canvas").first(), "the cached game must reach its first scene").toBeVisible();
});
