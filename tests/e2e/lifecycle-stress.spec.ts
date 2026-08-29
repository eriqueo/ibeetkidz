import { expect, test, type Page } from "@playwright/test";

// Shared-game lifecycle stress. Navigation is staged through the production
// dispatch funnel because the subject here is scene ownership/cleanup, not the
// reachability of painted buttons (chrome-reachable.spec.ts owns that contract).

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  return crashes;
}

const sceneKey = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getScene()?.scene?.key ?? null);

const activeView = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activeView);

async function go(page: Page, view: string): Promise<void> {
  await page.evaluate(
    (v) => void (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: v }),
    view,
  );
}

test("rapid navigation leaves one live, React-wired scene", async ({ page }) => {
  const crashes = await boot(page);

  // Prime every texture cache first. Revisits then take the synchronous create
  // path that previously raced the current-scene-ready subscription.
  for (const [view, key] of [
    ["workshop", "WorkshopScene"],
    ["yard", "YardScene"],
    ["track", "TrackV3Scene"],
    ["map", "MapScene"],
  ] as const) {
    await go(page, view);
    await expect.poll(() => sceneKey(page)).toBe(key);
  }

  // No waits between these writes: React may coalesce them, while Phaser may
  // already be able to create cached scenes synchronously. The last intent wins.
  await page.evaluate(() => {
    const t = (window as any).__ibeetkidz_test__;
    for (const view of ["workshop", "yard", "map", "workshop", "track"]) {
      t.dispatch({ type: "setActiveView", view });
    }
  });

  await expect.poll(() => activeView(page)).toBe("track");
  await expect.poll(() => sceneKey(page)).toBe("TrackV3Scene");
  // attachVisualizer is called only by Track's onSceneReady callback. This is
  // intentionally not satisfied by the bridge's independent scene observer.
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().vizState !== null))
    .toBe(true);

  // A leaked Track listener would apply this delta more than once. This pins
  // component cleanup as well as SceneSwitch's one-running-scene invariant.
  const before = await page.evaluate(
    () => (window as any).__ibeetkidz_test__.getProject().tempoBpm as number,
  );
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("tempo-changed", 10));
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().tempoBpm))
    .toBe(before + 10);

  expect(crashes, crashes.join(" | ")).toEqual([]);
});
