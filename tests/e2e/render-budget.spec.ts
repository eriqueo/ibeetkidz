import { expect, test } from "@playwright/test";
import { tapMapLandmark } from "./map-landmark.ts";

test("render pixels stay bounded across scene changes and tablet resize", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click();
  await page.waitForFunction(() => (window as any).__ibeetkidz_test__?.getScene()?.scene.key === "MapScene");
  const dimensions = () => page.evaluate(() => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const canvas = document.querySelector("canvas")!;
    return { width: canvas.width, height: canvas.height,
      logicalWidth: scene.scale.gameSize.width, logicalHeight: scene.scale.gameSize.height };
  });
  const expected = { width: 1280, height: 720, logicalWidth: 2560, logicalHeight: 1440 };
  await expect.poll(dimensions).toEqual(expected);
  for (const destination of ["workshop", "yard", "track", "workshop"]) {
    await tapMapLandmark(page, destination);
    await expect.poll(() => page.evaluate(() =>
      (window as any).__ibeetkidz_test__.getProject().activeView)).toBe(destination);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(dimensions).toEqual(expected);
    // Revisit the Map, then enter the next scene through its real landmark.
    await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "map" }));
    await page.waitForFunction(() => (window as any).__ibeetkidz_test__.getScene()?.scene.key === "MapScene");
    await page.setViewportSize({ width: 1280, height: 800 });
  }
});
