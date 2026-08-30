import { expect, test } from "@playwright/test";
import updateProtocol from "../../src/pwa-update-protocol.json" with { type: "json" };
import serverProtocol from "../fixtures/pwa-update-server.json" with { type: "json" };
import { MAP_VIEWPORT, tapMapLandmark } from "./map-landmark.ts";

test("legacy migration and later staged updates avoid mixed releases", async ({ context, page }, testInfo) => {
  test.setTimeout(60_000);
  const appUrl = testInfo.project.metadata.pwaUpdateOrigin;
  if (typeof appUrl !== "string") throw new Error("playwright config must provide pwaUpdateOrigin");
  await page.setViewportSize(MAP_VIEWPORT);
  const origin = new URL(appUrl).origin;
  let mainFrameNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) mainFrameNavigations += 1;
  });

  await page.goto(appUrl);
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await expect(page.locator(`meta[name="${serverProtocol.oldReleaseMeta}"]`)).toHaveCount(1);
  await expect.poll(() => page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active))).toBe(true);

  // The controlled reload proves the old release is genuinely coming through
  // Workbox rather than from the fixture server's ordinary HTTP response.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.locator(`meta[name="${serverProtocol.oldReleaseMeta}"]`)).toHaveCount(1);
  const oldEntryUrls = await page.locator('script[type="module"][src]').evaluateAll(
    (scripts) => scripts.map((script) => (script as HTMLScriptElement).src),
  );
  expect(oldEntryUrls, "the legacy fixture must load a real entry module").not.toHaveLength(0);
  const oldEntrySource = (await Promise.all(oldEntryUrls.map(async (url) => {
    const response = await context.request.get(url);
    expect(response.ok(), `legacy entry failed to load: ${url}`).toBe(true);
    return response.text();
  }))).join("\n");
  for (const token of [
    updateProtocol.messageType,
    updateProtocol.controllerChangeEvent,
    updateProtocol.releaseRequestType,
    updateProtocol.releaseResponseType,
  ]) {
    expect(oldEntrySource, `legacy entry unexpectedly contains ${token}`).not.toContain(token);
  }

  // A deployed legacy client has only inline registration. The first release
  // with the handshake therefore performs one marker-guarded activation and
  // one migration navigation. It must not leave old JS interactive after the
  // new Workbox activation cleans obsolete precache entries.
  const migrationAtNavigation = mainFrameNavigations;
  await context.request.get(`${origin}${serverProtocol.switchPath}`);
  const migrationSource = await context.request
    .get(`${appUrl}pwa-handshake-migration.js`)
    .then((response) => response.text());
  const markerCache = migrationSource.match(
    /HANDSHAKE_MARKER_CACHE = "([^"]+)"/,
  )?.[1];
  const pendingPath = migrationSource.match(
    /LEGACY_NAVIGATION_REQUEST = new URL\("([^"]+)"/,
  )?.[1];
  expect(markerCache, "migration script must declare its marker cache").toBeTruthy();
  expect(pendingPath, "migration script must declare its pending request").toBeTruthy();
  await page.evaluate(async ({ cacheName, requestPath }) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("fixture page has no service worker registration");
    const marker = await caches.open(cacheName);
    await marker.put(new URL(requestPath, registration.scope), new Response("pending"));
  }, { cacheName: markerCache!, requestPath: pendingPath! });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("fixture page has no service worker registration");
    void registration.update();
  });
  await expect(page.locator(`meta[name="${serverProtocol.oldReleaseMeta}"]`)).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: /tap to start/i })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return { active: registration?.active?.state, waiting: registration?.waiting?.state ?? null };
  })).toEqual({ active: "activated", waiting: null });
  await expect.poll(() => page.evaluate(async ({ cacheName, requestPath }) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return "registration-missing";
    const marker = await caches.open(cacheName);
    return Boolean(await marker.match(new URL(requestPath, registration.scope)));
  }, { cacheName: markerCache!, requestPath: pendingPath! })).toBe(false);
  expect(mainFrameNavigations - migrationAtNavigation).toBe(1);

  // The new release must be consumable, not merely capable of rendering its
  // HTML boot gate after the controller swap.
  await start.click({ force: true });
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  const trackLoaded = page.waitForResponse(
    (response) => /\/assets\/sky-[^/]+\.png$/.test(new URL(response.url()).pathname),
    { timeout: 20_000 },
  );
  await tapMapLandmark(page, "track");
  await expect((await trackLoaded).ok(), "the activated release must load Track art").toBe(true);

  // Once the migration marker exists, later releases return to the safe
  // contract: discovery while Track is open only stages a waiting worker.
  const stagedAtNavigation = mainFrameNavigations;
  const sibling = await context.newPage();
  await sibling.goto(appUrl);
  await expect(sibling.getByRole("button", { name: /tap to start/i })).toBeVisible();
  await context.request.get(`${origin}${serverProtocol.nextPath}`);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("current fixture has no service worker registration");
    await registration.update();
  });
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.waiting?.state;
  })).toBe("installed");
  await page.waitForTimeout(250);
  expect(mainFrameNavigations).toBe(stagedAtNavigation);
  await expect(page.locator(`meta[name="${serverProtocol.nextReleaseMeta}"]`)).toHaveCount(0);

  // The shared activation request must not promote the worker underneath a
  // sibling that may still be playing a song. It remains staged until only one
  // scoped client remains.
  await page.evaluate(async (messageType) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) throw new Error("next fixture worker is not waiting");
    registration.waiting.postMessage({ type: messageType });
  }, updateProtocol.messageType);
  await page.waitForTimeout(250);
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.waiting?.state;
  })).toBe("installed");
  await expect(sibling.locator(`meta[name="${serverProtocol.nextReleaseMeta}"]`)).toHaveCount(0);
  await sibling.close();

  // Seed the exact browser state observed in CI: next controls the client and
  // waiting is null, but its first SW-served navigation deliberately returns
  // the current release's HTML. The old composition root missed the transition
  // and must independently detect the active worker's distinct entry identity.
  await page.evaluate(async (messageType) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) throw new Error("next fixture worker is not waiting");
    registration.waiting.postMessage({ type: messageType });
  }, updateProtocol.messageType);
  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      active: registration?.active?.state ?? null,
      waiting: registration?.waiting?.state ?? null,
    };
  })).toEqual({ active: "activated", waiting: null });
  const staleUrl = new URL(appUrl);
  staleUrl.searchParams.set(serverProtocol.staleNavigationQuery, "1");
  await page.goto(staleUrl.href, { waitUntil: "commit" });
  await expect(page.locator(`meta[name="${serverProtocol.nextReleaseMeta}"]`)).toHaveCount(1, {
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: /tap to start/i })).toBeVisible();
  expect(mainFrameNavigations - stagedAtNavigation).toBe(2);
});
