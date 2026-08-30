import { expect, type Page } from "@playwright/test";

/**
 * Tap a Phaser canvas at browser-client coordinates and keep the press visible
 * across actual game frames. A fixed millisecond dwell is only a proxy: on a
 * saturated headed CI runner, 80 ms can pass without requestAnimationFrame
 * advancing, so Phaser observes neither edge.
 */
export async function tapCanvasAtClientPoint(
  page: Page,
  clientX: number,
  clientY: number,
): Promise<void> {
  expect(
    await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
      { x: clientX, y: clientY },
    ),
    "the design point must resolve to the unobstructed Phaser canvas",
  ).toBe("CANVAS");

  // Playwright's mouse produces the browser's trusted input path. Synthetic
  // dispatchEvent mouse events can be ignored after a long headed run even
  // when their coordinates and dwell are correct (CI runs 33312618230 and
  // 33313433355 both left LOOP on infinity). Hold the trusted down edge until
  // Phaser has received multiple real animation ticks.
  await page.mouse.move(clientX, clientY);
  await page.mouse.down();
  try {
    await page.evaluate(() => new Promise<void>((resolve) => {
      let remaining = 3;
      const afterFrame = (): void => {
        remaining -= 1;
        if (remaining === 0) resolve();
        else requestAnimationFrame(afterFrame);
      };
      requestAnimationFrame(afterFrame);
    }));
  } finally {
    await page.mouse.up();
  }
}
