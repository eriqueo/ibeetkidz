import { expect, test } from "@playwright/test";

test("a fresh visit with blocked storage warns once while edits keep trying to save", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    let attempts = 0;
    Object.assign(window, { storageWriteAttempts: () => attempts });
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("ibeetkidz:")) {
        attempts++;
        throw new DOMException("Storage denied", "SecurityError");
      }
      original.call(this, key, value);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click();
  await expect(page.locator("#boot-gate")).toHaveCount(0);
  await expect(page.locator("#storage-notice")).toBeVisible();
  await page.locator("#storage-notice button").click();
  const before = await page.evaluate(() => (window as any).storageWriteAttempts());
  await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setTempo", bpm: 137 }));
  await expect.poll(() => page.evaluate(() => (window as any).storageWriteAttempts())).toBeGreaterThan(before);
  await expect(page.locator("#storage-notice")).toHaveCount(0);
});
