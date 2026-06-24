import { expect, test, type Page } from "@playwright/test";

// The v2 sprite flow: boot → Map → Workshop (build a car) → Yard (assemble the
// train) → Track (ride it). Mic is faked via Playwright launch flags.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("boots into the Map and shows the three destinations", async ({ page }) => {
  await boot(page);
  await expect(page.getByText(/pick a place to play/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Workshop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Track" })).toBeVisible();
});

test("Workshop: add an instrument → a sequencer lane appears", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();
  await expect(page.getByRole("button", { name: /New Car/i })).toBeVisible();

  // Tap an instrument on the shelf → a LoopTrack lane shows in the boxcar.
  await page.locator('button[title="Add Kick"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();

  // Play / Stop the loop without error.
  await page.getByRole("button", { name: /Play/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Stop/ }).click();
});

test("Yard → Track: assemble the train and ride it", async ({ page }) => {
  await boot(page);

  // Build a beat first so the car isn't empty.
  await page.getByRole("button", { name: "Workshop" }).click();
  await page.locator('button[title="Add Kick"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();

  // To the Yard — the default car is selected; add it to the train (crane).
  await page.getByRole("button", { name: /📦 Yard/ }).click();
  const add = page.getByRole("button", { name: /Add to Train/i });
  await expect(add).toBeEnabled();
  await add.click();
  await page.waitForTimeout(900); // crane animation + dispatch

  // Send the train to the Track and ride it.
  await page.getByRole("button", { name: /Send to Track/i }).click();
  const ride = page.getByRole("button", { name: /Ride Train/i });
  await expect(ride).toBeVisible();
  await ride.click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Stop/ }).click();
});

test("Workshop stations open the creative tools over the scene", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "Workshop" }).click();

  // Open the Beat Maker station → its machine UI mounts over the car.
  await page.getByRole("button", { name: "Beat Maker" }).click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toBeVisible();
  await page.getByRole("button", { name: /Done/ }).click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toHaveCount(0);

  // The My Voice station opens too (mic faked).
  await page.getByRole("button", { name: "My Voice" }).click();
  await expect(page.locator('section[data-machine="record-voicefx"]')).toBeVisible();
});

test("Map guards Track until a train exists", async ({ page }) => {
  await boot(page);
  // Remove the default car's only train slot via the Yard, then Map → Track toasts.
  await page.getByRole("button", { name: "Yard" }).click();
  // Select the assembled car slot and remove it.
  await page.getByRole("button", { name: /Train car 1/i }).click();
  await page.getByRole("button", { name: /Remove/i }).click();
  await page.getByRole("button", { name: /🗺️ Map/ }).click();
  await page.getByRole("button", { name: "Track" }).click();
  await expect(page.getByText(/build a train first/i)).toBeVisible();
});
