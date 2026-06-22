import { expect, test, type Page } from "@playwright/test";

// Mic is faked via Playwright launch flags (see playwright.config.ts), so the
// recorder always produces a take here.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

async function recordTake(page: Page): Promise<void> {
  const rec = page.locator(".big-record");
  await rec.dispatchEvent("pointerdown");
  await page.waitForTimeout(350);
  await rec.dispatchEvent("pointerup");
}

test("edit a take before Home: card → trash → undo → snap → Send to Home", async ({
  page,
}) => {
  await boot(page);
  await page.locator(".palette").getByRole("button", { name: /my voice/i }).click();

  // Empty state: just the big Record button, no clip card / FX tiles yet.
  await expect(page.locator(".big-record")).toBeVisible();
  await expect(page.locator(".voice-clip-card")).toHaveCount(0);
  await expect(page.locator(".fx-tiles")).toHaveCount(0);

  // Record → the clip card with edit controls appears, then FX, then Send.
  await recordTake(page);
  await expect(page.locator(".voice-clip-card")).toBeVisible({ timeout: 4000 });
  await expect(page.locator('[data-act="clip-preview"]')).toBeVisible();
  await expect(page.locator(".fx-tiles")).toBeVisible();
  await expect(page.locator('[data-act="send-home"]')).toBeVisible();

  // Trash removes the take → back to the empty state (big Record only).
  await page.locator('[data-act="clip-trash"]').click();
  await expect(page.locator(".voice-clip-card")).toHaveCount(0);
  await expect(page.locator(".big-record")).toBeVisible();

  // Undo (play bar) restores the trashed take — removeClip is undoable.
  await page.locator('.playbar [data-act="undo"]').click();
  await expect(page.locator(".voice-clip-card")).toBeVisible();

  // Snap-to-beat toggles on (pressed), then Send to Home still lands a lane.
  const snap = page.locator('[data-act="clip-snap"]');
  await snap.click();
  await expect(snap).toHaveAttribute("aria-pressed", "true");

  await page.locator('[data-act="send-home"]').click();
  await expect(
    page.locator('section[data-machine="looper-stage"]'),
  ).toBeVisible();
  await expect(page.locator(".loop-track")).toHaveCount(1);
  await expect(page.locator(".loop-track .layer-name")).toContainText("My Voice");
});

test("re-record swaps the take in place", async ({ page }) => {
  await boot(page);
  await page.locator(".palette").getByRole("button", { name: /my voice/i }).click();

  await recordTake(page);
  await expect(page.locator(".voice-clip-card")).toBeVisible({ timeout: 4000 });

  // Re-record from the card (hold) produces a fresh take; the card stays.
  const re = page.locator('[data-act="clip-rerecord"]');
  await re.dispatchEvent("pointerdown");
  await page.waitForTimeout(300);
  await re.dispatchEvent("pointerup");
  await expect(page.locator(".voice-clip-card")).toBeVisible();
  // Still exactly one take being shaped (re-record replaced, didn't stack).
  await expect(page.locator(".voice-clip-card")).toHaveCount(1);
});
