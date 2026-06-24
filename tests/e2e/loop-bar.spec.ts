import { expect, test, type Page } from "@playwright/test";

// The loop lives on its OWN track below the cars: two big draggable tunnels mark
// the loop start + end, with a highlighted band between them.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("loop track: drag the end tunnel to shrink the loop region", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="add-melody"]').click();
  await page.locator(".melody-row").nth(3).locator(".note-cell").nth(0).click();
  await page.locator('[data-act="send-tracks"]').click();
  for (let i = 0; i < 4; i++) await page.locator('[data-act="new-car"]').click();

  // The loop track, its band, and the two tunnels are present.
  const band = page.locator(".loop-band");
  await expect(page.locator("[data-loop-track]")).toBeVisible();
  await expect(page.locator(".loop-tunnel")).toHaveCount(2);
  const before = (await band.boundingBox())!.width;

  // Drag the END tunnel toward the middle → the loop band shrinks.
  const end = page.locator('[data-act="loop-end"]');
  const eb = (await end.boundingBox())!;
  const track = (await page.locator("[data-loop-track]").boundingBox())!;
  await page.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width * 0.45, eb.y + eb.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);

  const after = (await band.boundingBox())!.width;
  expect(after).toBeLessThan(before - 20);
});
