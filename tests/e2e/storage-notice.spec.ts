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

test("the opt-in report names the actual failed operation and underlying browser error", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("private content must not enter the report", "SecurityError");
    };
  });
  await page.goto("/?storagecheck");
  await page.getByRole("button", { name: /tap to start/i }).click();
  await expect(page.locator("#boot-gate")).toHaveCount(0);
  const report = page.locator("#storage-diagnostics");
  await expect(report).toContainText("probe-write: FAILED: SecurityError (18)");
  await expect(report).toContainText("list-projects: OK");
  await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setTempo", bpm: 138 }));
  await expect(report).toContainText("save-project: FAILED: StorageError (unavailable) → SecurityError (18)");
  await expect(report).not.toContainText("private content");
});

test("the opt-in report confirms a successful save on a fresh visit", async ({ page }) => {
  await page.goto("/?storagecheck");
  await page.getByRole("button", { name: /tap to start/i }).click();
  await expect(page.locator("#boot-gate")).toHaveCount(0);
  await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setTempo", bpm: 139 }));
  await expect(page.locator("#storage-diagnostics")).toContainText("save-project: OK");
  await expect(page.locator("#storage-notice")).toHaveCount(0);
});
