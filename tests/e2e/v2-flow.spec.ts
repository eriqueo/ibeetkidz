import { expect, test, type Page } from "@playwright/test";

// The v2 sprite flow with visible, labelled in-canvas pixel buttons.
// Mic is faked via Playwright launch flags.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
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

  await page.locator('button[title="Add Kick"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();

  await page.locator('button[title="Play"]').click();
  await page.waitForTimeout(300);
  await page.locator('button[title="Stop"]').click();
});

test("Workshop stations open the creative tools", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();

  await page.locator('button[title="Beat"]').click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toBeVisible();
  await page.locator('button[title="Done"]').click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toHaveCount(0);

  await page.locator('button[title="Voice"]').click();
  await expect(page.locator('section[data-machine="record-voicefx"]')).toBeVisible();
});

test("Yard → Track: couple a car and ride it", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.locator('button[title="Add Kick"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();

  await page.locator('button[title="To Yard"]').click();
  await page.locator('button[title="Add to Train"]').click();
  await page.waitForTimeout(1300); // crane animation + dispatch

  await page.locator('button[title="Send to Track"]').click();
  await page.locator('button[title="Ride"]').click();
  await page.waitForTimeout(500);
  await page.locator('button[title="Stop"]').click();
});

test("Map guards Track until a train exists", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Yard" }).click();
  await page.getByRole("button", { name: /Train car 1/i }).click();
  await page.locator('button[title="Remove"]').click();
  await page.locator('button[title="Map"]').click();
  await page.getByRole("button", { name: "Track" }).click();
  await expect(page.getByText(/build a train first/i)).toBeVisible();
});
