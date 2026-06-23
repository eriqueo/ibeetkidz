import { expect, test, type Page } from "@playwright/test";

// Melody lanes can pick a real instrument voice (Soft/Piano/Bells/Organ/…).
// The Studio rail shows the instrument picker for the selected melody lane.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  await page.locator(".palette").getByRole("button", { name: /home/i }).click();
  await expect(page.locator('section[data-machine="looper-stage"]')).toBeVisible();
}

test("melody lane: pick an instrument from the Studio rail", async ({ page }) => {
  await boot(page);

  // Add a melody lane and place a note (also selects the lane).
  await page.locator('[data-act="add-melody"]').click();
  await page.locator(".melody-row").nth(3).locator(".note-cell").nth(0).click();

  // The rail shows the instrument picker; "Soft" is the default.
  const soft = page.locator('.rail-pill[data-inst="soft"]');
  const bells = page.locator('.rail-pill[data-inst="bells"]');
  await expect(soft).toBeVisible();
  await expect(soft).toHaveClass(/active/);

  // Pick Bells → it becomes the active voice, Soft drops active.
  await bells.click();
  await expect(bells).toHaveClass(/active/);
  await expect(soft).not.toHaveClass(/active/);
});
