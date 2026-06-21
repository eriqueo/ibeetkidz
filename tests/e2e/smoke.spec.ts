import { expect, test, type Page } from "@playwright/test";

// Mic is faked via Playwright launch flags (see playwright.config.ts).

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  // The boot button pulses forever by design → skip the stability wait.
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
}

test("boots from the gesture gate into the app", async ({ page }) => {
  await boot(page);
  await expect(page.getByRole("button", { name: /my voice/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /magic pad/i })).toBeVisible();
});

test("switching machines shows only the active one (no stacking)", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /beat maker/i }).click();
  await expect(page.locator('section[data-machine="beat-grid"]')).toBeVisible();

  await page.getByRole("button", { name: /my voice/i }).click();
  await expect(
    page.locator('section[data-machine="record-voicefx"]'),
  ).toBeVisible();

  // React unmounts the inactive machine → exactly one is ever in the DOM.
  await expect(page.locator("section[data-machine]")).toHaveCount(1);
});

test("beat maker: toggle steps, play and stop without error", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /beat maker/i }).click();

  const cells = page.locator(".beat-cell");
  await expect(cells.first()).toBeVisible();
  // Light up a few steps across the first row.
  for (const i of [0, 4, 8, 12]) await cells.nth(i).click();
  await expect(page.locator(".beat-cell.on")).toHaveCount(4);

  await page.locator('[data-act="play"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-act="stop"]').click();
});

test("sound pads render the full pack and respond to taps", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /sound pads/i }).click();
  // 12 built-in pads.
  await expect(page.locator(".pad")).toHaveCount(12);
  await page.locator(".pad").first().dispatchEvent("pointerdown");
});

test("surprise-me generates a beat and lands on the loop stage", async ({
  page,
}) => {
  await boot(page);
  await page.locator('[data-act="surprise"]').click();
  // It switches to the Loop Stage, which now lists generated layers.
  await expect(page.locator(".loop-track").first()).toBeVisible();
  const count = await page.locator(".loop-track").count();
  expect(count).toBeGreaterThanOrEqual(3); // kick + snare + hihat at minimum
});

test("a saved jam survives a reload (save → reload → still there)", async ({
  page,
}) => {
  await boot(page);
  await page.locator('[data-act="surprise"]').click();
  await expect(page.locator(".loop-track").first()).toBeVisible();
  const before = await page.locator(".loop-track").count();

  await page.locator('[data-act="save"]').click();
  await page.waitForTimeout(200);

  await boot(page); // reload + re-enter
  // Loop Stage is the active machine post-surprise, so layers show immediately.
  await expect(page.locator(".loop-track").first()).toBeVisible();
  expect(await page.locator(".loop-track").count()).toBe(before);
});

test("loop stage shows editable lanes with a playhead", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="surprise"]').click(); // generate → loop stage

  const cells = page.locator(".loop-cell");
  await expect(cells.first()).toBeVisible();
  expect(await cells.count()).toBeGreaterThanOrEqual(48); // >=3 layers x 16

  // Toggling a step changes the active-cell count (editable in place).
  const before = await page.locator(".loop-cell.on").count();
  await cells.nth(1).click();
  expect(await page.locator(".loop-cell.on").count()).not.toBe(before);

  // Playhead activates while the transport runs.
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('.loop-board[data-playing="true"]')).toBeVisible();
});

test("studio rail: add a melody lane, place notes, tweak guided controls", async ({
  page,
}) => {
  await boot(page);
  // Home is the default landing now; click it in the palette to be explicit.
  await page.locator(".palette").getByRole("button", { name: /home/i }).click();

  // The guided Studio rail is present with its high-level controls.
  await expect(page.locator(".rail")).toBeVisible();
  await expect(page.getByText("Magic Notes: ON")).toBeVisible();

  // Add a melody lane → a note grid appears.
  await page.locator('[data-act="add-melody"]').click();
  const grid = page.locator(".melody-grid");
  await expect(grid.first()).toBeVisible();
  const notes = page.locator(".note-cell");
  expect(await notes.count()).toBe(16 * 7); // STEP_COUNT x MELODY_ROWS

  // Tapping a note cell places it (and previews it).
  await notes.nth(20).click();
  await expect(page.locator(".note-cell.on")).toHaveCount(1);

  // Stack a chord in a fresh column (col 7): cells 7 and 7+16 share a column.
  // Both stay lit alongside the first note → 3 total.
  await notes.nth(7).click();
  await notes.nth(7 + 16).click();
  await expect(page.locator(".note-cell.on")).toHaveCount(3);
  // Tapping a lit note again removes just that one.
  await notes.nth(7 + 16).click();
  await expect(page.locator(".note-cell.on")).toHaveCount(2);

  // The rail's per-lane Sound picker is shown for the selected melody lane.
  await expect(page.locator('.rail [title="Buzzy"]')).toBeVisible();

  // Magic Notes → Rainbow toggles the song scale via the rail.
  await page.getByRole("button", { name: "Magic Notes: ON" }).click();
  await expect(
    page.getByRole("button", { name: "Rainbow Notes" }),
  ).toBeVisible();

  // Play still drives the playhead with a melody lane present.
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('.loop-board[data-playing="true"]')).toBeVisible();
});

test("drum picker: choose a specific drum, and keep playing while editing", async ({
  page,
}) => {
  await boot(page);
  await page.locator(".palette").getByRole("button", { name: /home/i }).click();

  // Opening the picker reveals every drum to choose from (no randomness).
  await page.locator('[data-act="add-drum"]').click();
  await expect(page.locator(".drum-picker")).toBeVisible();
  expect(await page.locator(".drum-chip").count()).toBeGreaterThanOrEqual(6);

  // Pick a SPECIFIC drum → that exact lane appears.
  await page.locator('.drum-chip[data-drum="cowbell"]').click();
  await expect(
    page.locator('section[data-machine="looper-stage"] .loop-track'),
  ).toHaveCount(1);
  await expect(page.locator(".loop-track .layer-name")).toContainText("Ding");

  // Start the loop, then add another drum mid-play — it must KEEP playing.
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('.loop-board[data-playing="true"]')).toBeVisible();
  await page.locator('[data-act="add-drum"]').click();
  await page.locator('.drum-chip[data-drum="kick"]').click();
  await expect(
    page.locator('section[data-machine="looper-stage"] .loop-track'),
  ).toHaveCount(2);
  // Editing did not stop the transport.
  await expect(page.locator('.loop-board[data-playing="true"]')).toBeVisible();
});

test("hero loop: record → effect keeps the app responsive", async ({
  page,
}) => {
  await boot(page);
  // Home is the default landing; the recorder lives on the My Voice page.
  await page.locator(".palette").getByRole("button", { name: /my voice/i }).click();
  const rec = page.locator(".big-record");
  await rec.dispatchEvent("pointerdown");
  await page.waitForTimeout(350);
  await rec.dispatchEvent("pointerup");

  // Either it recorded (prompt to add an effect) or fell back gracefully — both
  // leave the app usable, never a hard error.
  const status = page.locator(".voicefx-status");
  await expect(status).not.toHaveText(/didn't record/i, { timeout: 4000 });

  // Applying an effect must not throw even before a successful recording.
  await page.locator(".fx-tile").first().click();
  await expect(page.locator(".fx-tiles")).toBeVisible();
});

test("voice → Home: record, then send the clip onto the Home stack", async ({
  page,
}) => {
  await boot(page);
  await page.locator(".palette").getByRole("button", { name: /my voice/i }).click();

  const rec = page.locator(".big-record");
  await rec.dispatchEvent("pointerdown");
  await page.waitForTimeout(350);
  await rec.dispatchEvent("pointerup");

  // A named clip card appears with a Send-to-Home action (faked mic records).
  const send = page.locator('[data-act="send-home"]');
  await expect(send).toBeVisible({ timeout: 4000 });
  await send.click();

  // We land on Home and the voice is now a lane in the stack.
  await expect(
    page.locator('section[data-machine="looper-stage"]'),
  ).toBeVisible();
  await expect(page.locator(".loop-track")).toHaveCount(1);
  await expect(page.locator(".loop-track .layer-name")).toContainText("My Voice");
});
