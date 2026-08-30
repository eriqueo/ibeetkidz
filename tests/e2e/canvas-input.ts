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
  const canvas = page.locator("canvas").first();
  expect(
    await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
      { x: clientX, y: clientY },
    ),
    "the design point must resolve to the unobstructed Phaser canvas",
  ).toBe("CANVAS");

  const pressed = { clientX, clientY, button: 0, buttons: 1 };
  await canvas.dispatchEvent("mousemove", pressed);
  await canvas.dispatchEvent("mousedown", pressed);
  await page.evaluate(() => new Promise<void>((resolve) => {
    let remaining = 3;
    const afterFrame = (): void => {
      remaining -= 1;
      if (remaining === 0) resolve();
      else requestAnimationFrame(afterFrame);
    };
    requestAnimationFrame(afterFrame);
  }));
  await canvas.dispatchEvent("mouseup", { ...pressed, buttons: 0 });
}
