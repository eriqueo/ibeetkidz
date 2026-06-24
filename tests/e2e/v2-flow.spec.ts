import { expect, test, type Page } from "@playwright/test";

// The v2 sprite flow with painted, in-canvas controls (transparent hit-areas).
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
  // The painted WORKSHOP/YARD/TRACK labels live in the art; the hit-areas over
  // them are the three destination buttons.
  await expect(page.getByRole("button", { name: "Workshop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Track" })).toBeVisible();
});

test("Workshop: tap a painted instrument → a sequencer lane appears", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();

  await page.locator('button[title="Add kick"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();

  await page.locator('button[title="Play"]').click();
  await page.waitForTimeout(300);
  await page.locator('button[title="Stop"]').click();
});

test("Workshop toolbar opens the creative-tool stations", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();

  await page.locator('button[title="beatgrid"]').click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toBeVisible();
  await page.getByRole("button", { name: /Done/ }).click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toHaveCount(0);

  await page.locator('button[title="myvoice"]').click();
  await expect(page.locator('section[data-machine="record-voicefx"]')).toBeVisible();
});

test("Yard → Track: couple a car and ride it", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.locator('button[title="Add kick"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();

  // Workshop toolbar → Yard (the green ↔ icon).
  await page.locator('button[title="yard"]').click();
  await page.locator('button[title="Add to Train (couple)"]').click();
  await page.waitForTimeout(900); // crane animation + dispatch

  await page.locator('button[title="Send to Track"]').click();
  await page.locator('button[title="Ride"]').click();
  await page.waitForTimeout(500);
  await page.locator('button[title="Stop"]').click();
});

test("Map guards Track until a train exists", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Yard" }).click();
  // Select the default train slot and delete it.
  await page.getByRole("button", { name: /Train car 1/i }).click();
  await page.locator('button[title="Delete"]').click();
  // Back to the Map and try Track → guarded.
  await page.locator('button[title="Map"]').click();
  await page.getByRole("button", { name: "Track" }).click();
  await expect(page.getByText(/build a train first/i)).toBeVisible();
});
