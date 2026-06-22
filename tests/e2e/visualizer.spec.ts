import { expect, test, type Page } from "@playwright/test";

// The visualizer is opt-in (the "Watch" panel), never an always-on background.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("no background visualizer on load; Watch opens a contained panel", async ({
  page,
}) => {
  await boot(page);

  // The full-screen background canvas is gone — nothing animates by default.
  await expect(page.locator(".viz-canvas")).toHaveCount(0);
  await expect(page.locator(".viz-panel")).toHaveCount(0);

  // Watch toggles the contained panel on.
  await page.locator('[data-act="watch"]').click();
  await expect(page.locator(".viz-panel")).toBeVisible();
  await expect(page.locator(".viz-panel .viz-canvas")).toBeVisible();
});

test("the style switcher cycles styles and Expand goes full-screen", async ({
  page,
}) => {
  await boot(page);
  await page.locator('[data-act="watch"]').click();

  // Cycling the style changes the displayed label.
  const label = page.locator(".viz-style-label");
  const first = await label.textContent();
  await page.locator('[data-act="viz-next"]').click();
  await expect(label).not.toHaveText(first ?? "");

  // Expand promotes the panel to a full-screen overlay; Esc returns to it.
  await page.locator('[data-act="viz-expand"]').click();
  await expect(page.locator(".viz-panel.viz-fullscreen")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-panel.viz-fullscreen")).toHaveCount(0);
  await expect(page.locator(".viz-panel")).toBeVisible(); // panel still open
});

test("closing Watch removes the panel (stops the loop)", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="watch"]').click();
  await expect(page.locator(".viz-panel")).toBeVisible();

  await page.locator('[data-act="viz-close"]').click();
  await expect(page.locator(".viz-panel")).toHaveCount(0);
  await expect(page.locator(".viz-canvas")).toHaveCount(0);
});
