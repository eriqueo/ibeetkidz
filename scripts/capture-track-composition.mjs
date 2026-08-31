/* global window */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const out = resolve(root, "design/review");
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
try {
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => Boolean(window.__ibeetkidz_test__));

  await page.evaluate(async () => {
    const t = window.__ibeetkidz_test__;
    const source = t.getProject().activePartId;
    for (let i = 2; i <= 4; i++) {
      const id = `composition-car-${i}`;
      if (!t.getProject().parts.some((part) => part.id === id)) {
        t.dispatch({ type: "duplicateCar", partId: source, id });
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      if (!t.getProject().train.some((slot) => slot.instanceId === `composition-slot-${i}`)) {
        t.dispatch({ type: "addToTrain", instanceId: `composition-slot-${i}`, partId: id });
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    t.dispatch({ type: "setActiveView", view: "track" });
  });
  await page.waitForFunction(
    () => window.__ibeetkidz_test__?.getScene()?.scene?.key === "TrackV3Scene",
  );

  const canvas = page.locator("canvas").first();
  await page.evaluate(() => window.__ibeetkidz_test__.emit("track-mode-toggled", "tunnel"));
  await page.evaluate(() => window.__ibeetkidz_test__.emit("transport-play", "ride"));
  await page.waitForTimeout(2600);
  await canvas.screenshot({ path: resolve(out, "track-tunnel-in-context.png"), animations: "allow" });

  await page.evaluate(async () => {
    const t = window.__ibeetkidz_test__;
    // Bridge is captured as its own place, not half-way through a stacked
    // tunnel exit. Stopping settles the distance-driven portal immediately;
    // then turning Tunnel off clears its mode truth before Bridge is armed.
    t.emit("transport-stop");
    await new Promise((resolve) => setTimeout(resolve, 80));
    t.emit("track-mode-toggled", "tunnel");
    await new Promise((resolve) => setTimeout(resolve, 180));
    // The scene's public stopped-transport seam is the authoritative way to
    // settle a travelling portal before the next terrain location is armed.
    t.getScene().settleTunnelAtStop();
    t.emit("track-mode-toggled", "bridge");
  });
  await page.waitForTimeout(450);
  // React may republish all latched modes during Bridge's commit. Settle once
  // more after that publication so this evidence is a day/bridge composition,
  // never a deliberately stacked tunnel/bridge transition frame.
  await page.evaluate(() => window.__ibeetkidz_test__.getScene().settleTunnelAtStop());
  await page.waitForTimeout(80);
  await canvas.screenshot({ path: resolve(out, "track-bridge-in-context.png"), animations: "allow" });
  console.log("Captured Track composition evidence in design/review/.");
} finally {
  await browser.close();
}
