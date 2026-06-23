import { expect, test, type Page } from "@playwright/test";

// Voice Keys: record a voice clip → play it as a chromatic instrument →
// add it to Home as a melody lane voiced by the recording. Uses faked media so
// startRecording resolves without hardware.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("voice keys: record → audition keyboard → add to Home as a melody lane", async ({
  page,
}) => {
  await boot(page);

  // Open the new Voice Keys page from the palette.
  await page.locator(".palette").getByRole("button", { name: /voice keys/i }).click();
  await expect(page.locator('section[data-machine="voice-keys"]')).toBeVisible();

  // Hold-to-record (faked mic): press, hold briefly, release.
  const rec = page.locator('[data-act="vk-record"]');
  await rec.dispatchEvent("pointerdown");
  await page.waitForTimeout(350);
  await rec.dispatchEvent("pointerup");

  // A clip card + the audition keyboard appear.
  await expect(page.locator(".voice-clip-card")).toBeVisible();
  const keys = page.locator(".audition-key");
  await expect(keys).toHaveCount(7);
  // Tapping a key auditions the repitched voice (no throw = sampler built).
  await keys.nth(0).dispatchEvent("pointerdown");
  await keys.nth(4).dispatchEvent("pointerdown");

  // Add to Home → a melody lane appears, voiced by the recording.
  await page.locator('[data-act="vk-send-home"]').click();
  await expect(page.locator('section[data-machine="looper-stage"]')).toBeVisible();
  await expect(page.locator(".loop-board .melody-grid")).toBeVisible();
  // The Studio rail shows the lane's voice as the active 🎤 instrument.
  await expect(page.locator('.rail-pill[data-inst="voice"]')).toHaveClass(/active/);
  // A sampler can't bend, so the voice lane must NOT draw a bend overlay
  // (see==hear: the swoop gesture/curve is suppressed for voice lanes).
  await expect(page.locator(".loop-board .bend-layer")).toHaveCount(0);

  // The 🎤 pill is reversible: switch to a synth, then back to the voice.
  await page.locator('.rail-pill[data-inst="bells"]').click();
  await expect(page.locator('.rail-pill[data-inst="voice"]')).not.toHaveClass(/active/);
  await page.locator('.rail-pill[data-inst="voice"]').click();
  await expect(page.locator('.rail-pill[data-inst="voice"]')).toHaveClass(/active/);
});
