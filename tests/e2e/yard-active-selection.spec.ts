import { expect, test, type Page } from "@playwright/test";
import { tapCanvasAtClientPoint } from "./canvas-input.ts";

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  return crashes;
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
    (sceneKey) => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === sceneKey,
    key,
  );
}

async function tapLiveObject(
  page: Page,
  findObject: "hitch" | "delete" | { readonly paletteId: string },
): Promise<void> {
  const point = await page.evaluate((target) => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const object = typeof target === "string"
      ? (() => {
          const spawnId = target === "hitch" ? "btn-add-to-train" : "btn-delete-car";
          const element = scene.chrome.find((candidate: any) => candidate.spawn.id === spawnId);
          return element?.image ?? element?.hit;
        })()
      : scene.paletteTokens.get(target.paletteId)?.car;
    if (!object?.input?.hitArea) return { error: `missing live Yard target ${JSON.stringify(target)}` };
    const hit = object.input.hitArea;
    const localX = hit.x + hit.width / 2 - (object.displayOriginX ?? 0);
    const localY = hit.y + hit.height / 2 - (object.displayOriginY ?? 0);
    const world = object.getWorldTransformMatrix().transformPoint(localX, localY);
    const canvas = document.querySelector("canvas")!.getBoundingClientRect();
    const game = scene.scale.gameSize;
    return {
      x: canvas.left + world.x * (canvas.width / game.width),
      y: canvas.top + world.y * (canvas.height / game.height),
    };
  }, findObject);
  if ("error" in point) throw new Error(point.error);
  await tapCanvasAtClientPoint(page, point.x, point.y);
}

const project = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());

const yardModel = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().debugModel);

test("Yard carries the active car into a visible, immediately hitchable selection", async ({ page }) => {
  const crashes = await boot(page);
  const ids = await page.evaluate(() => {
    const testApi = (window as any).__ibeetkidz_test__;
    const firstId = testApi.getProject().activePartId as string;
    const clipId = "yard-audition-clip";
    testApi.dispatch({
      type: "addClip",
      clip: {
        id: clipId,
        source: { kind: "builtin", assetId: "kick" },
        effects: [],
        color: "#ff6b6b",
        label: "Yard Kick",
      },
    });
    testApi.dispatch({
      type: "addLayer",
      layer: {
        id: "yard-audition-layer",
        clipId,
        volume: 1,
        muted: false,
        kind: "drum",
        steps: Array.from({ length: 16 }, (_, index) =>
          index === 0 ? { row: 0, length: 1 } : null),
        notes: [],
        wave: "triangle",
        echo: 0,
        tone: 1,
      },
    });
    const secondId = "yard-active-second";
    testApi.dispatch({ type: "addCar", id: secondId });
    testApi.dispatch({ type: "setActiveView", view: "yard" });
    return { firstId, secondId };
  });
  await waitForScene(page, "YardScene");

  await expect.poll(async () => (await yardModel(page)).selectedId).toBe(ids.secondId);
  expect((await yardModel(page)).selectedRingIds).toEqual([ids.secondId]);

  const trainBeforeHitch = (await project(page)).train.length;
  await tapLiveObject(page, "hitch");
  await expect.poll(async () => (await yardModel(page)).busy).toBe(true);
  expect((await project(page)).train).toHaveLength(trainBeforeHitch);
  await tapLiveObject(page, { paletteId: ids.firstId });
  expect((await project(page)).activePartId).toBe(ids.secondId);
  expect((await yardModel(page)).selectedRingIds).toEqual([ids.secondId]);
  await expect
    .poll(async () => (await project(page)).train, { timeout: 5_000 })
    .toHaveLength(trainBeforeHitch + 1);
  expect((await project(page)).train.at(-1).partId).toBe(ids.secondId);
  await expect.poll(async () => (await yardModel(page)).busy).toBe(false);
  expect((await yardModel(page)).selectedId).toBe(ids.secondId);
  expect((await yardModel(page)).selectedRingIds).toEqual([ids.secondId]);

  // A scene switch cancels Phaser tweens without completing them. Returning
  // must clear the animation latch, restore the hidden palette token, and not
  // commit the interrupted crane's state effect.
  const trainBeforeInterruptedHitch = (await project(page)).train.length;
  await tapLiveObject(page, "hitch");
  await expect.poll(async () => (await yardModel(page)).busy).toBe(true);

  await page.evaluate(() => {
    const testApi = (window as any).__ibeetkidz_test__;
    testApi.dispatch({ type: "setActiveView", view: "map" });
  });
  await waitForScene(page, "MapScene");
  await page.evaluate(() => {
    const testApi = (window as any).__ibeetkidz_test__;
    testApi.dispatch({ type: "setActiveView", view: "yard" });
  });
  await waitForScene(page, "YardScene");
  await expect.poll(async () => (await yardModel(page)).selectedId).toBe(ids.secondId);
  expect((await yardModel(page)).selectedRingIds).toEqual([ids.secondId]);
  expect((await yardModel(page)).busy).toBe(false);
  expect((await project(page)).train).toHaveLength(trainBeforeInterruptedHitch);

  await tapLiveObject(page, "hitch");
  await expect.poll(async () => (await yardModel(page)).busy).toBe(true);
  expect((await project(page)).train).toHaveLength(trainBeforeInterruptedHitch);
  await expect
    .poll(async () => (await project(page)).train, { timeout: 5_000 })
    .toHaveLength(trainBeforeInterruptedHitch + 1);
  await expect.poll(async () => (await yardModel(page)).busy).toBe(false);

  const rebuildsBeforeSelection = (await yardModel(page)).rebuildCount;
  await tapLiveObject(page, { paletteId: ids.firstId });
  await expect.poll(async () => (await project(page)).activePartId).toBe(ids.firstId);
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag().transportState))
    .toBe("started");
  expect((await yardModel(page)).selectedId).toBe(ids.firstId);
  expect((await yardModel(page)).selectedRingIds).toEqual([ids.firstId]);
  expect((await yardModel(page)).rebuildCount).toBe(rebuildsBeforeSelection);

  await tapLiveObject(page, "delete");
  await expect.poll(async () => (await project(page)).activePartId).toBe(ids.secondId);
  await expect.poll(async () => (await yardModel(page)).selectedId).toBe(ids.secondId);
  expect((await project(page)).parts.map((part: any) => part.id)).not.toContain(ids.firstId);
  expect((await yardModel(page)).selectedRingIds).toEqual([ids.secondId]);
  expect(crashes, crashes.join(" | ")).toEqual([]);
});
