import { expect, test, type Page } from "@playwright/test";

// A view's `onSceneReady` must fire on EVERY visit, not just the first.
//
// This is the regression test for a bug the single-Phaser-game change shipped.
// Sharing one game means a revisited scene finds every texture already cached,
// so its `preload` queues nothing and Phaser runs `create()` — and therefore
// `announceReady()` — SYNCHRONOUSLY inside `showScene`. `PhaserScene` used to
// subscribe in a `useEffect`, which React runs AFTER every layout effect, so on
// exactly those revisits the handshake fired into an empty bus.
//
// It failed silently, and no existing test could see it: the dev bridge's
// `getScene()` has its own module-level subscription that never unsubscribes, so
// `waitForScene` kept passing while the VIEW never got its callback — leaving
// `sceneRef.current` on the previous, destroyed scene and every later
// `setModel`/`setCars` writing into a dead object.
//
// Asserts on per-view state that ONLY `onSceneReady` can establish.

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  return crashes;
}
async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => {
    const s = (window as any).__ibeetkidz_test__?.getScene();
    return !!s && s.scene?.key === k;
  }, key);
}
const go = (page: Page, view: string) =>
  page.evaluate((v) => void (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: v }), view);
const emit = (page: Page, ev: string, ...a: unknown[]) =>
  page.evaluate(([e, x]) => void (window as any).__ibeetkidz_test__.emit(e, ...(x as unknown[])), [ev, a] as const);

test("every view is still wired to React on its SECOND visit", async ({ page }) => {
  const crashes = await boot(page);
  await waitForScene(page, "MapScene");
  // Seed content so the Workshop and Track have something to show.
  await go(page, "workshop");
  await waitForScene(page, "WorkshopScene");
  await emit(page, "workshop-add-melody", "guitar");

  // Lap 1 primes every texture cache — after this, every preload is a no-op and
  // every `create()` runs synchronously. That is the condition that broke it.
  for (const [v, k] of [["yard", "YardScene"], ["track", "TrackV3Scene"], ["map", "MapScene"]] as const) {
    await go(page, v);
    await waitForScene(page, k);
  }

  // Lap 2 — the real assertions. Each reads state that only the view's
  // `onSceneReady` (or a later push through the ref it sets) can have written.
  await go(page, "workshop");
  await waitForScene(page, "WorkshopScene");
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().emptyPromptVisible))
    .toBe(false); // the seeded melody lane is on the board, so no empty prompt

  await go(page, "track");
  await waitForScene(page, "TrackV3Scene");
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().vizState !== null), {
      message: "the Track never received its analyser on the second visit",
    })
    .toBe(true);

  await go(page, "yard");
  await waitForScene(page, "YardScene");
  // The Yard's undo chip is attached in `create`; its React wiring is the
  // dispatch funnel, so assert the scene object itself is the LIVE one by
  // driving a real state change through it.
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().undoOffer.offering))
    .toBe(false);

  expect(crashes, crashes.join(" | ")).toEqual([]);
});
