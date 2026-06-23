import { expect, test, type Page } from "@playwright/test";

// The loop bar (BeepBox/UltraBox style): a draggable capsule above the cars that
// sets the Ride loop region; tunnels sit at its ends.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("loop bar: drag an end handle to shrink the loop region", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="add-melody"]').click();
  await page.locator(".melody-row").nth(3).locator(".note-cell").nth(0).click();
  await page.locator('[data-act="send-tracks"]').click();
  for (let i = 0; i < 3; i++) await page.locator('[data-act="new-car"]').click();

  const pill = page.locator("[data-loop-pill]");
  await expect(pill).toBeVisible();
  // Two tunnels (loop start + end) are present.
  await expect(page.locator(".track-tunnel")).toHaveCount(2);

  const before = (await pill.boundingBox())!.width;

  // Drag the right handle left to the 2nd car → the loop (and pill) shrinks.
  const handle = page.locator('[data-act="loop-end"]');
  const h = (await handle.boundingBox())!;
  const car2 = (await page.locator(".car-block").nth(1).boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(car2.x + car2.width / 2, h.y + h.height / 2, { steps: 8 });
  await page.mouse.up();

  const after = (await pill.boundingBox())!.width;
  expect(after).toBeLessThan(before - 20);
});
