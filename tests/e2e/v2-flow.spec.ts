import { expect, test, type Page } from "@playwright/test";

// The v2 sprite flow. The Map landing + the per-view nav chrome are HTML, but the
// Workshop/Yard/Track interiors are pure Phaser canvas — so we drive them through
// the same shared EventBus React uses, via a dev-only test bridge
// (`window.__ibeetkidz_test__`, mounted in `src/app/context.tsx`). We assert on
// real state (the live Project) and the surviving HTML chrome, never on canvas.
// Mic is faked via Playwright launch flags.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  // The bridge mounts at module load; wait until it's reachable before emitting.
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

// Wait until the currently-mounted view's Phaser scene has finished `create()`
// and reported itself ready (so its React subscriptions are live too).
async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
    (k) => {
      const s = (window as any).__ibeetkidz_test__?.getScene();
      return !!s && (s.scene?.key === k || s.constructor?.name === k);
    },
    key,
  );
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

function getProject(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());
}

function activeMelodyCount(project: any): number {
  const part = project.parts.find((p: any) => p.id === project.activePartId) ?? project.parts[0];
  return part.layers.filter((l: any) => l.kind === "melody").length;
}

test("boots into the Map and shows the three destinations", async ({ page }) => {
  await boot(page);
  await expect(page.getByRole("button", { name: "Workshop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Track" })).toBeVisible();
});

test("Workshop: tap a painted instrument → a sequencer lane appears", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await waitForScene(page, "WorkshopScene");

  const before = activeMelodyCount(await getProject(page));
  await emit(page, "workshop-add-melody", "guitar");

  // The store flip is the truth: the active car gained a melody lane.
  await expect.poll(async () => activeMelodyCount(await getProject(page))).toBe(before + 1);
});

test("Workshop stations open the creative tools", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await waitForScene(page, "WorkshopScene");

  const activeTool = () =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().activeToolId as string | null);

  await emit(page, "workshop-open-tool", "beat-grid");
  await expect.poll(activeTool).toBe("beat-grid");

  // `workshop-open-tool` toggles; re-emitting the SAME id closes it.
  await emit(page, "workshop-open-tool", "beat-grid");
  await expect.poll(activeTool).toBeNull();

  await emit(page, "workshop-open-tool", "record-voicefx");
  await expect.poll(activeTool).toBe("record-voicefx");
});

test("Yard → Track: couple a car and ride it", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await waitForScene(page, "WorkshopScene");
  await emit(page, "workshop-add-melody", "guitar"); // give the active car content

  // Travel to the Yard (Workshop handles `workshop-nav`).
  await emit(page, "workshop-nav", "yard");
  await waitForScene(page, "YardScene");

  const project = await getProject(page);
  const partId: string = project.activePartId ?? project.parts[0].id;

  await emit(page, "yard-add-to-train", partId);
  await page.waitForTimeout(1300); // crane tween + dispatch on its onComplete
  await expect.poll(async () => (await getProject(page)).train.length).toBeGreaterThan(0);

  // Depart for the Track.
  await emit(page, "yard-send-to-track");
  await expect.poll(async () => (await getProject(page)).activeView).toBe("track");
  // The Track tarp strip renders one chip per live car.
  await expect(page.locator("button.pixel-tap").first()).toBeVisible();
  await waitForScene(page, "TrackScene");

  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(500);
  await emit(page, "transport-stop");
});

test("Map guards Track until a train exists", async ({ page }) => {
  await boot(page);
  // `emptyProject` seeds one car on the train so the app is rideable on boot,
  // and the v2 UI has no EventBus path to remove a train slot — so empty the
  // train through the test bridge to reach the guard precondition.
  await page.evaluate(() => {
    const t = (window as any).__ibeetkidz_test__;
    for (const car of t.getProject().train) {
      t.dispatch({ type: "removeFromTrain", instanceId: car.instanceId });
    }
  });
  await expect.poll(async () => (await getProject(page)).train.length).toBe(0);

  await page.getByRole("button", { name: "Track" }).click();
  await expect(page.getByText(/build a train first/i)).toBeVisible();
});
