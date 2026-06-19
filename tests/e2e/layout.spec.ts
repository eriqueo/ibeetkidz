import { expect, test, type Page } from "@playwright/test";

// Mic is faked via Playwright launch flags (see playwright.config.ts).
async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("the four kidpix regions are present", async ({ page }) => {
  await boot(page);
  await expect(page.locator(".palette")).toBeVisible();
  await expect(page.locator(".options-bar")).toBeVisible();
  await expect(page.locator(".canvas")).toBeVisible();
  await expect(page.locator(".playbar")).toBeVisible();
  // Transport lives in the bottom play bar now.
  await expect(page.locator('.playbar [data-act="play"]')).toBeVisible();
  await expect(page.locator('.playbar [data-act="snap"]')).toBeVisible();
});

test("the options bar swaps to the selected tool's knobs", async ({ page }) => {
  await boot(page);

  // Magic Pad exposes sound-shape choices.
  await page.getByRole("button", { name: /magic pad/i }).click();
  await expect(page.locator(".options-bar .opt-choices")).toBeVisible();

  // My Voice exposes the Wildness knob; the Magic Pad options hide (no stacking).
  await page.getByRole("button", { name: /my voice/i }).click();
  await expect(page.locator(".options-bar .opt-knob")).toBeVisible();
  await expect(page.locator("section[data-options]:visible")).toHaveCount(1);
});

test("a tool without knobs shows a labeled options title", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /sound pads/i }).click();
  await expect(page.locator(".options-bar .options-title")).toBeVisible();
});
