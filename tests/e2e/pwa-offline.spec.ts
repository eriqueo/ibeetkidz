import { expect, test } from "@playwright/test";
import { MAP_VIEWPORT, tapMapLandmark } from "./map-landmark.ts";

test("the Pages artifact installs and boots Track after the network disappears", async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const appUrl = testInfo.project.metadata.pwaOrigin;
  if (typeof appUrl !== "string") throw new Error("playwright config must provide pwaOrigin");
  await page.setViewportSize(MAP_VIEWPORT);
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
  const canvas = page.locator("canvas").first();
  await expect(canvas, "the cached game must reach its first scene").toBeVisible();

  // Service-worker cache hits do not surface as ordinary Playwright request
  // events. Compare real canvas captures instead: the Map's small moving
  // handcar cannot account for a whole-scene pixel change.
  await page.waitForTimeout(1_000);
  const mapCapture = await canvas.screenshot({ type: "png" });
  await tapMapLandmark(page, "track");
  await page.waitForTimeout(1_500);

  // Decode a real browser capture rather than trusting that a canvas merely
  // exists. Phaser's missing texture is black with exact neon-green grid
  // lines; legitimate Track art and its generated fallbacks never use them.
  const trackCapture = await canvas.screenshot({ type: "png" });
  const rendered = await page.evaluate(async ({ mapUrl, trackUrl }) => {
    const decode = async (url: string): Promise<HTMLImageElement> => {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    };
    const [mapImage, trackImage] = await Promise.all([decode(mapUrl), decode(trackUrl)]);
    const probe = document.createElement("canvas");
    probe.width = trackImage.width;
    probe.height = trackImage.height;
    const ctx = probe.getContext("2d");
    if (!ctx) throw new Error("2D screenshot probe unavailable");
    ctx.drawImage(mapImage, 0, 0);
    const before = ctx.getImageData(0, 0, probe.width, probe.height).data;
    ctx.clearRect(0, 0, probe.width, probe.height);
    ctx.drawImage(trackImage, 0, 0);
    const after = ctx.getImageData(0, 0, probe.width, probe.height).data;
    let changedPixels = 0;
    let neonPixels = 0;
    for (let i = 0; i < after.length; i += 4) {
      const difference =
        Math.abs(after[i]! - before[i]!) +
        Math.abs(after[i + 1]! - before[i + 1]!) +
        Math.abs(after[i + 2]! - before[i + 2]!);
      if (difference > 24) changedPixels += 1;
      if (after[i]! < 8 && after[i + 1]! > 247 && after[i + 2]! < 8) neonPixels += 1;
    }
    return { changedPixels, neonPixels, totalPixels: after.length / 4 };
  }, {
    mapUrl: `data:image/png;base64,${mapCapture.toString("base64")}`,
    trackUrl: `data:image/png;base64,${trackCapture.toString("base64")}`,
  });
  expect(
    rendered.changedPixels / rendered.totalPixels,
    "the offline Map tap must replace the Map with the Track scene",
  ).toBeGreaterThan(0.1);
  expect(rendered.neonPixels, "the controlled/offline Track must not render Phaser's missing grid").toBe(0);
});
