import { expect, test, type Page } from "@playwright/test";

// Mic is faked via Playwright launch flags (see playwright.config.ts).

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  // The boot button pulses forever by design → skip the stability wait.
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("boots from the gesture gate into the app", async ({ page }) => {
  await boot(page);
  await expect(page.getByRole("button", { name: /my voice/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /magic pad/i })).toBeVisible();
});

test("switching machines shows only the active one (no stacking)", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /beat maker/i }).click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toBeVisible();

  await page.getByRole("button", { name: /my voice/i }).click();
  await expect(
    page.locator('section[data-machine="record-voicefx"]'),
  ).toBeVisible();

  // React unmounts the inactive machine → exactly one is ever in the DOM.
  await expect(page.locator("section[data-machine]")).toHaveCount(1);
});

test("beat maker: toggle steps, play and stop without error", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /beat maker/i }).click();

  const cells = page.locator(".beat-cell");
  await expect(cells.first()).toBeVisible();
  // Light up a few steps across the first row.
  for (const i of [0, 4, 8, 12]) await cells.nth(i).click();
  await expect(page.locator(".beat-cell.on")).toHaveCount(4);

  await page.locator('[data-act="play"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-act="stop"]').click();
});

test("sound pads render the full pack and respond to taps", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /sound pads/i }).click();
  // 12 built-in pads.
  await expect(page.locator(".pad")).toHaveCount(12);
  await page.locator(".pad").first().dispatchEvent("pointerdown");
});

test("surprise-me generates a beat and lands on the loop stage", async ({
  page,
}) => {
  await boot(page);
  await page.locator('[data-act="surprise"]').click();
  // It switches to the Loop Stage, which now lists generated layers.
  await expect(page.locator(".layer-row").first()).toBeVisible();
  const count = await page.locator(".layer-row").count();
  expect(count).toBeGreaterThanOrEqual(3); // kick + snare + hihat at minimum
});

test("a saved jam survives a reload (save → reload → still there)", async ({
  page,
}) => {
  await boot(page);
  await page.locator('[data-act="surprise"]').click();
  await expect(page.locator(".layer-row").first()).toBeVisible();
  const before = await page.locator(".layer-row").count();

  await page.locator('[data-act="save"]').click();
  await page.waitForTimeout(200);

  await boot(page); // reload + re-enter
  // Loop Stage is the active machine post-surprise, so layers show immediately.
  await expect(page.locator(".layer-row").first()).toBeVisible();
  expect(await page.locator(".layer-row").count()).toBe(before);
});

test("hero loop: record → effect keeps the app responsive", async ({
  page,
}) => {
  await boot(page);
  const rec = page.locator(".big-record");
  await rec.dispatchEvent("pointerdown");
  await page.waitForTimeout(350);
  await rec.dispatchEvent("pointerup");

  // Either it recorded (prompt to add an effect) or fell back gracefully — both
  // leave the app usable, never a hard error.
  const status = page.locator(".voicefx-status");
  await expect(status).not.toHaveText(/didn't record/i, { timeout: 4000 });

  // Applying an effect must not throw even before a successful recording.
  await page.locator(".fx-tile").first().click();
  await expect(page.locator(".fx-tiles")).toBeVisible();
});
