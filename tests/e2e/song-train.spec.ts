import { expect, test, type Page } from "@playwright/test";

// Capability 4, Increment 1: the Song Train. Drives the real UX — Send to
// Tracks → New Car (duplicate) → edit the copy → Ride the song — and asserts
// the strip appears, grows to two cars, and the arrangement plays (a car lights
// up as it rides).

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  await page.locator(".palette").getByRole("button", { name: /home/i }).click();
  await expect(page.locator('section[data-machine="looper-stage"]')).toBeVisible();
}

test("song train: send to tracks, add a car, edit it, ride the song", async ({
  page,
}) => {
  await boot(page);

  // Give Car 1 some content (a melody note) so it's a real loop.
  await page.locator('[data-act="add-melody"]').click();
  await page.locator(".melody-row").nth(3).locator(".note-cell").nth(0).click();

  // No train yet → the Tracks strip is hidden.
  await expect(page.locator(".tracks-strip")).toHaveCount(0);

  // Send to Tracks → the strip appears with exactly one car (today's loop),
  // and Home now wears the "which loop am I editing" banner.
  await page.locator('[data-act="send-tracks"]').click();
  await expect(page.locator(".tracks-strip")).toBeVisible();
  await expect(page.locator(".car-block")).toHaveCount(1);
  await expect(page.locator(".car-banner")).toBeVisible();
  await expect(page.locator(".car-banner-num")).toContainText("Car 1");

  // + New Car → duplicate the current car, open it on Home to edit.
  await page.locator('[data-act="new-car"]').click();
  await expect(page.locator(".car-block")).toHaveCount(2);
  await expect(page.locator('section[data-machine="looper-stage"]')).toBeVisible();
  // The new (2nd) car is the active one — banner and strip ring agree.
  await expect(page.locator(".car-block").nth(1)).toHaveClass(/active/);
  await expect(page.locator(".car-banner-num")).toContainText("Car 2");
  // The copy carries Car 1's melody lane.
  await expect(page.locator(".melody-grid")).toBeVisible();

  // Edit the copy: add another note (so the two cars differ).
  await page.locator(".melody-row").nth(5).locator(".note-cell").nth(4).click();

  // Ride the whole song → the transport runs and a car lights up as it plays.
  await page.locator('[data-act="ride"]').click();
  await expect(page.locator(".car-block.riding")).toHaveCount(1);

  // Tapping a car opens it in Home (selects it as the active/editing car).
  await page.locator('[data-act="stop"]').click();
  await page.locator(".car-block").nth(0).click();
  await expect(page.locator(".car-block").nth(0)).toHaveClass(/active/);
  await expect(page.locator(".car-banner-num")).toContainText("Car 1");

  // The banner's ‹ › flips to the neighbouring car right from Home.
  await page.locator('[data-act="next-car"]').click();
  await expect(page.locator(".car-banner-num")).toContainText("Car 2");
  await expect(page.locator(".car-block").nth(1)).toHaveClass(/active/);
});
