import { expect, test } from "@playwright/test";
import { tapMapLandmark } from "./map-landmark.ts";

for (const density of [1, 2]) test.describe(`display density ${density}`, () => {
  test.use({ deviceScaleFactor: density });
  test("render detail follows the display across scene changes and resize", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await page.getByRole("button", { name: /tap to start/i }).click();
    await page.waitForFunction(() => (window as any).__ibeetkidz_test__?.getScene()?.scene.key === "MapScene");
    const dimensions = () => page.evaluate(() => {
      const scene = (window as any).__ibeetkidz_test__.getScene();
      const canvas = document.querySelector("canvas")!;
      const bounds = canvas.getBoundingClientRect();
      return { width: canvas.width, height: canvas.height,
        logicalWidth: scene.scale.gameSize.width, logicalHeight: scene.scale.gameSize.height,
        cameraWidth: scene.cameras.main.width, cameraHeight: scene.cameras.main.height,
        cssWidth: bounds.width, cssHeight: bounds.height, density: devicePixelRatio };
    });
    const expectDisplayDetail = async () => {
      const viewport = page.viewportSize()!;
      const fittedWidth = Math.min(viewport.width, viewport.height * 16 / 9);
      await expect.poll(async () => {
        const d = await dimensions();
        // Assert against physical display pixels, independently of the renderer's
        // sizing helper. A fixed 720p buffer must fail on a larger/denser display.
        const scale = Math.min(1, d.cssWidth * d.density / 2560, d.cssHeight * d.density / 1440);
        return d.logicalWidth === 2560 && d.logicalHeight === 1440
          && Math.abs(d.cssWidth - fittedWidth) <= 1
          && Math.abs(d.cssHeight - fittedWidth * 9 / 16) <= 1
          && d.cameraWidth === d.width && d.cameraHeight === d.height
          && Math.abs(d.width - Math.ceil(2560 * scale)) <= 1
          && Math.abs(d.height - Math.ceil(1440 * scale)) <= 1;
      }).toBe(true);
      // Phaser updates the camera's input matrix when the resized scene renders.
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }));
    };
    await expectDisplayDetail();
    for (const destination of ["workshop", "yard", "track", "workshop"]) {
      await tapMapLandmark(page, destination);
      await expect.poll(() => page.evaluate(() =>
        (window as any).__ibeetkidz_test__.getProject().activeView)).toBe(destination);
      // Navigation updates project state before the destination's assets load.
      // Do not navigate back while the outgoing Map is still the reported scene.
      const sceneKey = { workshop: "WorkshopScene", yard: "YardScene", track: "TrackV3Scene" }[destination];
      await page.waitForFunction((key) =>
        (window as any).__ibeetkidz_test__?.getScene()?.scene.key === key, sceneKey);
      await page.setViewportSize({ width: 1024, height: 768 });
      await expectDisplayDetail();
      // Revisit the Map, then enter the next scene through its real landmark.
      await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "map" }));
      await page.waitForFunction(() => (window as any).__ibeetkidz_test__.getScene()?.scene.key === "MapScene");
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expectDisplayDetail();
    }
  });
});
