import { expect, test, type Page } from "@playwright/test";

// Terrain: the Lemmings move, applied to the song. A kid picks a terrain while
// the train is riding; it lands on the NEXT bar, holds a couple of bars, then
// the world goes back to normal.
//
// These assert on the LIVE TRANSPORT (`audioDiag().transportBpm` /
// `terrainScale`), which is the real audio clock — not on a flag we set
// ourselves. That matters because the whole mechanic rests on a measured claim:
// a tempo change alone keeps the song in phase, but going through
// `clearScheduled` + reschedule drops the downbeat of the bar it lands on.
// See `spike/tempo-phase.ts` for the offline-rendered measurements.

async function boot(page: Page): Promise<void> {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  // `?oval`: these assert the MOMENTARY terrain path — pick a hill, the
  // transport bends, the world comes back on its own. That is the oval's
  // behaviour. The side-scroller (the default since 2026-08-16) routes
  // `terrain-picked` into the LATCHING mode system instead, which is a
  // different engine call with a different contract and has its own coverage
  // in track-v3.spec.ts and the terrain unit suite.
  await page.goto("/?oval");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

function diag(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag());
}

async function rideTheTrack(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await emit(page, "map-nav", "track");
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackScene",
  );
  await emit(page, "transport-play", "ride");
  await expect.poll(async () => (await diag(page)).transportState).toBe("started");
}

test("a hill bends the live transport, then the world comes back", async ({ page }) => {
  await boot(page);
  await rideTheTrack(page);

  const base = (await diag(page)).transportBpm;
  expect(base).toBeGreaterThan(0);
  expect((await diag(page)).terrainScale).toBe(1); // flat ground to start

  await emit(page, "terrain-picked", "hill");

  // It lands on the NEXT bar, so it is deliberately not instant.
  await expect
    .poll(async () => (await diag(page)).terrainScale, { timeout: 15_000 })
    .toBeLessThan(1);

  // The live clock really moved — this is the whole mechanic.
  const slowed = (await diag(page)).transportBpm;
  expect(slowed).toBeLessThan(base);

  // …and it reverts on its own, without anyone tapping anything.
  await expect
    .poll(async () => (await diag(page)).terrainScale, { timeout: 30_000 })
    .toBe(1);
  expect((await diag(page)).transportBpm).toBeCloseTo(base, 1);
});

test("a bridge colours the sound without touching the beat grid", async ({ page }) => {
  await boot(page);
  await rideTheTrack(page);

  const base = (await diag(page)).transportBpm;
  await emit(page, "terrain-picked", "bridge");

  // Give it well past a bar to land, then confirm the grid never moved: only
  // the hill is allowed to touch tempo, because only tempo can shift the beat.
  await page.waitForTimeout(4000);
  expect((await diag(page)).terrainScale).toBe(1);
  expect((await diag(page)).transportBpm).toBeCloseTo(base, 1);
});

test("terrain is ignored when nothing is riding", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await emit(page, "map-nav", "track");
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackScene",
  );

  // Stopped: there is no ride to ride through anything.
  await emit(page, "terrain-picked", "hill");
  await page.waitForTimeout(1500);
  expect((await diag(page)).terrainScale).toBe(1);
});

test("an unknown terrain is ignored rather than silencing the song", async ({ page }) => {
  await boot(page);
  await rideTheTrack(page);
  const base = (await diag(page)).transportBpm;

  await emit(page, "terrain-picked", "volcano");
  await page.waitForTimeout(2500);

  expect((await diag(page)).terrainScale).toBe(1);
  expect((await diag(page)).transportBpm).toBeCloseTo(base, 1);
  expect((await diag(page)).transportState).toBe("started");
});
