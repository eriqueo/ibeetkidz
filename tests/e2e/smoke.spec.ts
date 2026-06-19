import { expect, test } from "@playwright/test";

// Smoke: the boot gate gates audio, and tapping START reveals the app + the
// machine toolbar. Mic is faked via Playwright launch flags (see config).
test("boots from the gesture gate into the app", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click();

  // App becomes visible and the hero machine ("My Voice") is in the toolbar.
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.getByRole("button", { name: /my voice/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /magic pad/i })).toBeVisible();
});

// TODO(build): full hero journey — record -> reverse -> hear it -> save -> reload.
