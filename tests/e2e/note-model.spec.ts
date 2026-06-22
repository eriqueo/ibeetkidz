import { expect, test, type Page, type Locator } from "@playwright/test";

// Capability 1: the note model (length + roll). Drives the real Stretch drag
// and the double-tap drum roll through the DOM, asserting on the resulting lane
// shape (a stretched note collapses empty cells into one spanning bar; a roll
// adds the .has-roll bar + pips).

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  // Home is the default landing; make sure we're on it.
  await page.locator(".palette").getByRole("button", { name: /home/i }).click();
  await expect(page.locator('section[data-machine="looper-stage"]')).toBeVisible();
}

/** Drag a note's right-edge handle to a target step within its lane. */
async function stretchHandle(
  page: Page,
  laneEl: Locator,
  handle: Locator,
  targetStep: number,
): Promise<void> {
  const laneBox = (await laneEl.boundingBox())!;
  const hBox = (await handle.boundingBox())!;
  const cellW = laneBox.width / 16;
  const y = hBox.y + hBox.height / 2;
  await page.mouse.move(hBox.x + hBox.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(laneBox.x + cellW * (targetStep + 0.5), y, { steps: 10 });
  await page.mouse.up();
}

test("melody: place → stretch → remove a note", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="add-melody"]').click();

  const grid = page.locator(".melody-grid");
  await expect(grid).toBeVisible();
  // 7 rows × 16 steps, all empty to start.
  await expect(grid.locator(".note-cell")).toHaveCount(7 * 16);

  // Place a note at step 2 in one row.
  const row = page.locator(".melody-row").nth(3);
  await row.locator(".note-cell").nth(2).click();
  const onCell = row.locator(".note-cell.on");
  await expect(onCell).toHaveCount(1);

  // Stretch its right edge out to ~step 7: the spanning bar swallows the empty
  // cells it now covers, so this row holds fewer note-cells than 16.
  await stretchHandle(page, row, onCell.locator(".note-handle"), 7);
  await expect.poll(async () => row.locator(".note-cell").count()).toBeLessThan(16);
  await expect(onCell).toHaveCount(1); // still exactly one placed note

  // Tap the bar to remove it → the row is empty again. (dispatchEvent fires the
  // custom onPointerDown directly, past the handle overlay.)
  await onCell.dispatchEvent("pointerdown");
  await expect(row.locator(".note-cell.on")).toHaveCount(0);
  await expect(row.locator(".note-cell")).toHaveCount(16);
});

test("melody: drag a note's edge UP bends it (a swoop line appears)", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="add-melody"]').click();

  const grid = page.locator(".melody-grid");
  await expect(grid).toBeVisible();
  await expect(grid.locator(".bend-line")).toHaveCount(0);

  // Place a note low-ish (4th row from the top), then drag its handle straight
  // up into a higher row → a dominant vertical drag = bend.
  const row = page.locator(".melody-row").nth(4);
  await row.locator(".note-cell").nth(2).click();
  const handle = row.locator(".note-cell.on .note-handle");
  const gridBox = (await grid.boundingBox())!;
  const hBox = (await handle.boundingBox())!;
  await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hBox.x + hBox.width / 2, gridBox.y + 4, { steps: 12 });
  await page.mouse.up();

  // The swoop is drawn as a polyline over the grid, and the note itself stays
  // (one placed note, now bent).
  await expect(grid.locator(".bend-line")).toHaveCount(1);
  await expect(row.locator(".note-cell.on")).toHaveCount(1);
});

test("drum: drag a hit's edge UP tunes it (a pitch badge appears)", async ({ page }) => {
  await boot(page);
  await page.locator('[data-act="add-drum"]').click();
  await page.locator('[data-drum="kick"]').click();

  const lane = page.locator(".loop-track .loop-lane").first();
  await lane.locator(".loop-cell").nth(2).click();
  const hit = lane.locator(".loop-cell.on").first();
  await expect(hit).toHaveCount(1);
  await expect(lane.locator(".tune-badge")).toHaveCount(0);

  // Drag the handle straight up → tune up; a "+n" badge shows on the hit.
  const handle = hit.locator(".note-handle");
  const hBox = (await handle.boundingBox())!;
  await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hBox.x + hBox.width / 2, hBox.y - 50, { steps: 10 });
  await page.mouse.up();

  await expect(lane.locator(".tune-badge")).toHaveCount(1);
  await expect(lane.locator(".tune-badge")).toContainText("+");
});

test("drum: double-tap cycles a cell's roll 1 → 2 → 4 → off", async ({ page }) => {
  await boot(page);
  // Add a kick lane via the Sound picker.
  await page.locator('[data-act="add-drum"]').click();
  await page.locator('[data-drum="kick"]').click();

  const lane = page.locator(".loop-track .loop-lane").first();
  await expect(lane).toBeVisible();

  // Place a hit (single tap on an empty cell is instant).
  await lane.locator(".loop-cell").nth(4).click();
  const hit = lane.locator(".loop-cell.on").first();
  await expect(hit).toHaveCount(1);
  await expect(lane.locator(".loop-cell.has-roll")).toHaveCount(0);

  // Double-tap (two pointerdowns inside the window) → roll of 2.
  const dblTap = async (): Promise<void> => {
    await hit.dispatchEvent("pointerdown");
    await page.waitForTimeout(60);
    await hit.dispatchEvent("pointerdown");
  };
  await dblTap();
  await expect(lane.locator(".loop-cell.has-roll")).toHaveCount(1);
  await expect(lane.locator(".roll-pips")).toHaveText("••");

  // Again → roll of 4.
  await dblTap();
  await expect(lane.locator(".roll-pips")).toHaveText("••••");

  // Again → back to a single hit (roll cleared).
  await dblTap();
  await expect(lane.locator(".loop-cell.has-roll")).toHaveCount(0);
  await expect(lane.locator(".loop-cell.on")).toHaveCount(1); // hit itself stays
});
