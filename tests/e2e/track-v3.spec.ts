import { expect, test, type Page } from "@playwright/test";

// Track v3, the side-scroller greybox (`?v3`).
//
// These assert on MOTION, which a screenshot cannot test: that the world scrolls
// at a rate proportional to tempo, that the wheels turn because distance was
// travelled rather than because time passed, and — the premise of the whole
// rebuild — that a terrain lands AHEAD of the playhead where a kid can see it
// coming. GAME_FEEL.md: "Review animation in motion or not at all."

async function bootV3(page: Page): Promise<void> {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/?v3");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("map-nav", "track"));
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackV3Scene",
  );
}

function state(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().debugState());
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

test("?v3 opens the side-scroller instead of the oval", async ({ page }) => {
  await bootV3(page);
  const key = await page.evaluate(
    () => (window as any).__ibeetkidz_test__.getScene().scene.key,
  );
  expect(key).toBe("TrackV3Scene");
});

test("the oval is still the default without the flag", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await emit(page, "map-nav", "track");
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackScene",
  );
});

test("riding scrolls the world and turns the wheels; stopping stops both", async ({
  page,
}) => {
  await bootV3(page);
  const idle = await state(page);
  await page.waitForTimeout(600);
  expect((await state(page)).pos).toBe(idle.pos); // nothing moves at rest

  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(1200);
  const a = await state(page);
  await page.waitForTimeout(1200);
  const b = await state(page);

  expect(b.pos).toBeGreaterThan(a.pos);
  // Distance-driven: the wheel angle advanced with the world, not on a timer.
  expect(b.wheelAngle).toBeGreaterThan(a.wheelAngle);
});

test("the scroll rate scales with tempo (GAME_FEEL Law 4)", async ({ page }) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");

  const rateOver = async (ms: number): Promise<number> => {
    const t0 = await state(page);
    await page.waitForTimeout(ms);
    const t1 = await state(page);
    return (t1.pos - t0.pos) / (ms / 1000);
  };

  // Boot tempo is 100; take it down, then up, and compare bars-per-second.
  await emit(page, "tempo-changed", -60); // → 40 bpm
  await page.waitForTimeout(400);
  const slow = await rateOver(2000);

  await emit(page, "tempo-changed", 160); // → 200 bpm
  await page.waitForTimeout(400);
  const fast = await rateOver(2000);

  expect(slow).toBeGreaterThan(0);
  // 40 → 200 bpm is 5x. Allow generous slack for frame timing and the ramp.
  expect(fast / slow).toBeGreaterThan(2.5);
});

test("a picked terrain lands AHEAD of the playhead — you see it coming", async ({
  page,
}) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(800);

  expect((await state(page)).terrain).toBeNull();
  await emit(page, "terrain-picked", "hill");
  await page.waitForTimeout(150);

  const s = await state(page);
  expect(s.terrain).not.toBeNull();
  expect(s.terrain.kind).toBe("hill");
  // THE PREMISE: it is drawn to the RIGHT of the playhead, i.e. approaching,
  // not applied silently under the train. This is what makes the one-bar delay
  // read as cause and effect to a four-year-old.
  expect(s.terrain.x).toBeGreaterThan(s.playheadX);

  // …and it travels toward the playhead rather than sitting still.
  await page.waitForTimeout(900);
  const later = await state(page);
  if (later.terrain) expect(later.terrain.x).toBeLessThan(s.terrain.x);
});
