import { expect, test, type Page } from "@playwright/test";
import { tapNamedPhaserObject } from "./phaser-pixels.ts";

// Card C5 (approved 2026-10-05): a brand-new song opens with a starter beat in
// car 1, and the first time the Workshop shows it, START EMPTY is offered. The
// tap goes through the real chip, and the kid can put the beat back.

const project = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());
const laneIds = async (page: Page): Promise<string[]> => {
  const p = await project(page);
  return p.parts.find((x: any) => x.id === p.activePartId).layers.map((l: any) => l.id);
};

test("a new song starts with a beat, and START EMPTY takes it out (and back)", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__?.engineStarted());
  expect(await laneIds(page)).toEqual(["beat-kick", "beat-snare", "beat-hihat"]);

  await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "workshop" }));
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "WorkshopScene",
  );
  const offering = () => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().starterOffering);
  await expect.poll(offering).toBe(true);

  await tapNamedPhaserObject(page, "starter-action");
  await expect.poll(() => laneIds(page)).toEqual([]);
  await expect.poll(offering).toBe(false);

  // One step back, through the ordinary undo offer.
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().undoOffer.offering)).toBe(true);
  await tapNamedPhaserObject(page, "undo-action");
  await expect.poll(() => laneIds(page)).toEqual(["beat-kick", "beat-snare", "beat-hihat"]);
});

test("START EMPTY steps aside once the kid opens a tool, and keeps the beat", async ({ page }) => {
  // The chip is drawn above every panel; left standing it covered the open My
  // Voice panel's effect row and status line (preview, 2026-10-10).
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__?.engineStarted());
  await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "workshop" }));
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "WorkshopScene",
  );
  const offering = () => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().starterOffering);
  await expect.poll(offering).toBe(true);

  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("workshop-open-tool", "record-voicefx"));
  await expect.poll(offering).toBe(false);
  expect(await laneIds(page)).toEqual(["beat-kick", "beat-snare", "beat-hihat"]);

  // Offered once per visit: closing the panel does not bring it back.
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("workshop-open-tool", null));
  await page.waitForTimeout(400);
  expect(await offering()).toBe(false);
});
