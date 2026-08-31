import { expect, test, type Page } from "@playwright/test";
import { tapCanvasAtClientPoint } from "./canvas-input.ts";
import { tapMelodyCell, tapNamedPhaserObject } from "./phaser-pixels.ts";

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

type YardTarget =
  | "hitch"
  | "delete"
  | "edit"
  | "unhitch"
  | { readonly paletteId: string }
  | { readonly trainId: string };

async function liveObjectPoint(
  page: Page,
  findObject: YardTarget,
): Promise<{ x: number; y: number }> {
  const point = await page.evaluate((target) => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const object = typeof target === "string"
      ? (() => {
          const spawnId = target === "hitch"
            ? "btn-add-to-train"
            : target === "delete"
              ? "btn-delete-car"
              : target === "edit"
                ? "btn-edit-car"
                : "btn-remove-from-train";
          const element = scene.chrome.find((candidate: any) => candidate.spawn.id === spawnId);
          return element?.image ?? element?.hit;
        })()
      : "paletteId" in target
        ? scene.paletteTokens.get(target.paletteId)?.car
        : scene.trainTokens[scene.train.findIndex((slot: any) => slot.instanceId === target.trainId)]?.car;
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
  return point;
}

async function tapLiveObject(page: Page, findObject: YardTarget): Promise<void> {
  const point = await liveObjectPoint(page, findObject);
  await tapCanvasAtClientPoint(page, point.x, point.y);
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([name, payload]) => void (window as any).__ibeetkidz_test__.emit(name, ...(payload as unknown[])),
    [event, args] as const,
  );
}

const project = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());

const yardModel = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().debugModel);

test("Yard EDIT CAR reaches an instrument and note on the selected non-empty car", async ({ page }) => {
  const crashes = await boot(page);
  const selectedId = await page.evaluate(() => {
    const testApi = (window as any).__ibeetkidz_test__;
    const partId = testApi.getProject().activePartId as string;
    const clipId = "yard-edit-kick";
    testApi.dispatch({
      type: "addClip",
      clip: {
        id: clipId,
        source: { kind: "builtin", assetId: "kick" },
        effects: [],
        color: "#ff6b6b",
        label: "Yard Edit Kick",
      },
    });
    testApi.dispatch({
      type: "addLayer",
      layer: {
        id: "yard-edit-layer",
        clipId,
        volume: 1,
        muted: false,
        kind: "drum",
        steps: [{ row: 0, length: 1 }, ...Array.from({ length: 15 }, () => null)],
        notes: [],
        wave: "triangle",
        echo: 0,
        tone: 1,
      },
    });
    testApi.dispatch({ type: "setActiveView", view: "yard" });
    return partId;
  });
  await waitForScene(page, "YardScene");
  await expect.poll(async () => (await yardModel(page)).selectedId).toBe(selectedId);

  await tapLiveObject(page, "edit");
  await waitForScene(page, "WorkshopScene");
  expect((await project(page)).activePartId).toBe(selectedId);
  const beforeLayers = (await project(page)).parts.find((part: any) => part.id === selectedId).layers.length;

  await tapNamedPhaserObject(page, "workshop-control:inst-guitar");
  await expect.poll(() => page.evaluate(() =>
    (window as any).__ibeetkidz_test__.getScene().activeToolId,
  )).toBe("melody-editor");
  await expect.poll(async () =>
    (await project(page)).parts.find((part: any) => part.id === selectedId).layers.length,
  ).toBe(beforeLayers + 1);

  await tapMelodyCell(page, 2, 2);
  await expect.poll(async () => {
    const part = (await project(page)).parts.find((candidate: any) => candidate.id === selectedId);
    return part.layers.at(-1).notes[2]?.some((note: any) => note.row === 4) ?? false;
  }).toBe(true);
  expect(crashes, crashes.join(" | ")).toEqual([]);
});

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

test("Yard UNHITCH removes the selected assembled instance and preserves drag reorder", async ({ page }) => {
  const crashes = await boot(page);
  const ids = ["yard-train-a", "yard-train-b", "yard-train-c"];
  await page.evaluate((instanceIds) => {
    const testApi = (window as any).__ibeetkidz_test__;
    const partId = testApi.getProject().activePartId as string;
    for (const slot of testApi.getProject().train) {
      testApi.dispatch({ type: "removeFromTrain", instanceId: slot.instanceId });
    }
    for (const instanceId of instanceIds) {
      testApi.dispatch({ type: "addToTrain", instanceId, partId });
    }
    testApi.dispatch({ type: "setActiveView", view: "yard" });
  }, ids);
  await waitForScene(page, "YardScene");
  await expect.poll(async () => (await project(page)).train.map((slot: any) => slot.instanceId)).toEqual(ids);

  await tapLiveObject(page, { trainId: ids[1]! });
  expect((await yardModel(page)).selectedTrainId).toBe(ids[1]);
  expect((await yardModel(page)).selectedTrainRingIds).toEqual([ids[1]]);

  await tapLiveObject(page, "unhitch");
  await expect
    .poll(async () => (await project(page)).train.map((slot: any) => slot.instanceId))
    .toEqual([ids[0], ids[2]]);
  await expect.poll(async () => (await yardModel(page)).selectedTrainId).toBeNull();
  const offer = await page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().undoOffer);
  expect(offer).toEqual({ offering: true, lost: "CAR UNHITCHED" });

  await emit(page, "undo-requested");
  await expect
    .poll(async () => (await project(page)).train.map((slot: any) => slot.instanceId))
    .toEqual(ids);
  await expect.poll(async () => (await yardModel(page)).trainIds).toEqual(ids);
  expect((await yardModel(page)).selectedTrainId).toBeNull();
  expect((await yardModel(page)).selectedTrainRingIds).toEqual([]);

  // Undo restores the slot, not an invisible stale selection. With no visible
  // green ring, UNHITCH must use its documented tail fallback.
  await tapLiveObject(page, "unhitch");
  await expect
    .poll(async () => (await project(page)).train.map((slot: any) => slot.instanceId))
    .toEqual([ids[0], ids[1]]);
  await emit(page, "undo-requested");
  await expect.poll(async () => (await yardModel(page)).trainIds).toEqual(ids);

  const from = await liveObjectPoint(page, { trainId: ids[0]! });
  const to = await liveObjectPoint(page, { trainId: ids[2]! });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await project(page)).train.map((slot: any) => slot.instanceId))
    .toEqual([ids[1], ids[2], ids[0]]);
  expect((await yardModel(page)).selectedTrainId).toBeNull();

  await page.evaluate(() => {
    (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "map" });
  });
  await waitForScene(page, "MapScene");
  await page.evaluate(() => {
    (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "yard" });
  });
  await waitForScene(page, "YardScene");
  expect((await yardModel(page)).selectedTrainId).toBeNull();

  await tapLiveObject(page, "unhitch");
  await expect
    .poll(async () => (await project(page)).train.map((slot: any) => slot.instanceId))
    .toEqual([ids[1], ids[2]]);
  expect(crashes, crashes.join(" | ")).toEqual([]);
});
