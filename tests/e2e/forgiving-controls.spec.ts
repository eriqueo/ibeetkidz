import { expect, test, type Page } from "@playwright/test";
import { tapNamedPhaserObject } from "./phaser-pixels.ts";

// Card C6 (approved 2026-10-05): forgiving controls. UNDO and REDO are always
// on screen and answer the real history; STOP stays reachable when the Track's
// header is hidden; every control on the four screens is at least 48 CSS px to
// tap on a landscape iPad; and a long train scrolls in the Yard instead of its
// cars piling on top of each other. Every tap goes through the canvas.

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__?.engineStarted());
  return crashes;
}

async function go(page: Page, view: string, key: string): Promise<void> {
  await page.evaluate((v) => (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: v }), view);
  await page.waitForFunction((k) => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === k, key);
}

const laneIds = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const p = (window as any).__ibeetkidz_test__.getProject();
    return p.parts.find((x: any) => x.id === p.activePartId).layers.map((l: any) => l.id);
  });

const historyKeys = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().historyKeys);

test("UNDO and REDO are always on screen and walk the history", async ({ page }) => {
  const crashes = await boot(page);
  await go(page, "workshop", "WorkshopScene");
  // A brand-new song has nothing to undo yet: both keys are dim.
  await expect.poll(() => historyKeys(page)).toEqual({ canUndo: false, canRedo: false });

  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("starter-clear"));
  await expect.poll(() => laneIds(page)).toEqual([]);
  await expect.poll(() => historyKeys(page)).toEqual({ canUndo: true, canRedo: false });

  await tapNamedPhaserObject(page, "undo-key");
  await expect.poll(() => laneIds(page)).toEqual(["beat-kick", "beat-snare", "beat-hihat"]);
  await expect.poll(() => historyKeys(page)).toEqual({ canUndo: false, canRedo: true });

  await tapNamedPhaserObject(page, "redo-key");
  await expect.poll(() => laneIds(page)).toEqual([]);

  // The keyboard reaches the same history.
  await page.keyboard.press("Control+z");
  await expect.poll(() => laneIds(page)).toHaveLength(3);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(() => laneIds(page)).toEqual([]);

  // The keys come along to the other screens with the same answer.
  await go(page, "yard", "YardScene");
  await expect.poll(() => historyKeys(page)).toEqual({ canUndo: true, canRedo: false });
  await go(page, "track", "TrackV3Scene");
  await expect.poll(() => historyKeys(page)).toEqual({ canUndo: true, canRedo: false });
  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("STOP stays on screen when the Track header is hidden", async ({ page }) => {
  const crashes = await boot(page);
  await go(page, "track", "TrackV3Scene");
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("transport-play", "ride"));
  await expect.poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.engineStarted())).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag().transportState)).toBe("started");

  await tapNamedPhaserObject(page, "track-control:toolbar-header");
  await expect.poll(() => page.evaluate(() =>
    (window as any).__ibeetkidz_test__.getScene().debugState().toolbarVisible.header)).toBe(false);

  await tapNamedPhaserObject(page, "track-control:btn-transport-stop");
  await expect.poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag().transportState)).not.toBe("started");
  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("a long train scrolls in the Yard instead of piling up", async ({ page }) => {
  const crashes = await boot(page);
  await go(page, "yard", "YardScene");
  const ids = Array.from({ length: 20 }, (_, i) => `long-${i}`);
  await page.evaluate((instanceIds) => {
    const t = (window as any).__ibeetkidz_test__;
    const partId = t.getProject().activePartId;
    for (const slot of t.getProject().train) t.dispatch({ type: "removeFromTrain", instanceId: slot.instanceId });
    for (const instanceId of instanceIds) t.dispatch({ type: "addToTrain", instanceId, partId });
  }, ids);
  const model = () => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().debugModel);
  await expect.poll(async () => (await model()).trainCount).toBe(20);

  // The newest car is on show; the straight holds a page of whole cars.
  const shown = (await model()).shownTrainIds as string[];
  expect(shown.length).toBeGreaterThanOrEqual(10);
  expect(shown.length).toBeLessThan(20);
  expect(shown.at(-1)).toBe("long-19");
  expect((await model()).scroll).toEqual({ shown: true, back: true, on: false });

  // ◀ goes back along the train, and the first car comes into view.
  await tapNamedPhaserObject(page, "yard-train-back");
  await tapNamedPhaserObject(page, "yard-train-back");
  await expect.poll(async () => ((await model()).shownTrainIds as string[])[0]).toBe("long-0");
  expect((await model()).scroll).toEqual({ shown: true, back: false, on: true });

  // A short train shows no arrows at all.
  await page.evaluate((instanceIds) => {
    const t = (window as any).__ibeetkidz_test__;
    for (const id of instanceIds.slice(3)) t.dispatch({ type: "removeFromTrain", instanceId: id });
  }, ids);
  await expect.poll(async () => (await model()).scroll.shown).toBe(false);
  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test.describe("touch targets on a landscape iPad", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("every control on the four screens is at least 48 CSS px", async ({ page }) => {
    const crashes = await boot(page);
    const small = (): Promise<string[]> => page.evaluate(() => {
      const scene = (window as any).__ibeetkidz_test__.getScene();
      const canvas = document.querySelector("canvas")!.getBoundingClientRect();
      const k = canvas.width / scene.scale.gameSize.width;
      const out: string[] = [];
      for (const o of scene.sys.input._list) {
        if (!o.input?.enabled || !o.willRender?.(scene.cameras.main)) continue;
        let alpha = 1;
        for (let p = o; p; p = p.parentContainer) alpha *= p.visible === false ? 0 : (p.alpha ?? 1);
        if (alpha < 0.05) continue;
        const m = o.getWorldTransformMatrix();
        const ha = o.input.hitArea;
        const w = (ha.width ?? ha.radius * 2) * Math.abs(m.scaleX) * k;
        const h = (ha.height ?? ha.radius * 2) * Math.abs(m.scaleY) * k;
        if (Math.min(w, h) < 47.5) out.push(`${scene.scene.key}:${o.name || o.type} ${Math.round(w)}x${Math.round(h)}`);
      }
      return out;
    });
    await page.waitForFunction(() => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene");
    expect(await small()).toEqual([]);
    await go(page, "workshop", "WorkshopScene");
    expect(await small()).toEqual([]);
    await go(page, "yard", "YardScene");
    expect(await small()).toEqual([]);
    await go(page, "track", "TrackV3Scene");
    expect(await small()).toEqual([]);
    expect(crashes, crashes.join(" | ")).toEqual([]);
  });
});
