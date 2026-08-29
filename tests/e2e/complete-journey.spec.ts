import { expect, test, type Page } from "@playwright/test";

interface BrowserIssue {
  kind: "console" | "page";
  text: string;
}

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  await expect.poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.engineStarted())).toBe(true);
}

const project = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());

const emit = (page: Page, event: string, ...args: unknown[]) =>
  page.evaluate(
    ([name, values]) => void (window as any).__ibeetkidz_test__.emit(name, ...(values as unknown[])),
    [event, args] as const,
  );

const dispatch = (page: Page, command: unknown) =>
  page.evaluate((cmd) => void (window as any).__ibeetkidz_test__.dispatch(cmd), command);

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
    (sceneKey) => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === sceneKey,
    key,
  );
}

test("a five-car song survives the complete create → ride → undo → reload → export journey", async ({ page }) => {
  test.setTimeout(70_000);
  const issues: BrowserIssue[] = [];
  page.on("pageerror", (error) => issues.push({ kind: "page", text: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push({ kind: "console", text: message.text() });
  });

  await boot(page);
  await dispatch(page, { type: "setActiveView", view: "workshop" });
  await waitForScene(page, "WorkshopScene");
  await dispatch(page, { type: "setTempo", bpm: 200 });

  const sounds = ["kick", "snare", "hihat", "tom", "cowbell"];
  for (const [index, assetId] of sounds.entries()) {
    const clipId = `journey-clip-${index}`;
    const layerId = `journey-layer-${index}`;
    await dispatch(page, {
      type: "addClip",
      clip: {
        id: clipId,
        source: { kind: "builtin", assetId },
        effects: [{ id: index % 2 === 0 ? "echo" : "reverb", amount: 0.35 }],
        color: "#ffffff",
        label: `Journey ${index + 1}`,
      },
    });
    await dispatch(page, {
      type: "addLayer",
      layer: {
        id: layerId,
        clipId,
        volume: 0.65,
        muted: false,
        kind: "drum",
        steps: Array.from({ length: 16 }, (_, step) =>
          step % (index + 2) === 0 ? { row: 0, length: 1 } : null,
        ),
        notes: [],
        wave: "triangle",
        echo: 0.15,
        tone: 0.85,
      },
    });
  }

  const original = await project(page);
  const sourcePartId: string = original.activePartId;
  for (let index = 2; index <= 5; index++) {
    const partId = `journey-car-${index}`;
    await dispatch(page, { type: "duplicateCar", partId: sourcePartId, id: partId });
    await dispatch(page, { type: "addToTrain", instanceId: `journey-slot-${index}`, partId });
  }

  const assembled = await project(page);
  expect(assembled.parts).toHaveLength(5);
  expect(assembled.train).toHaveLength(5);
  expect(assembled.parts.map((part: any) => part.layers.length)).toEqual([5, 5, 5, 5, 5]);

  await dispatch(page, { type: "setActiveView", view: "track" });
  await waitForScene(page, "TrackV3Scene");
  await emit(page, "transport-play", "ride");
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag().transportState), {
      timeout: 20_000,
    })
    .toBe("started");
  const barBefore = await page.evaluate(() => (window as any).__ibeetkidz_test__.transportBar());
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.transportBar()))
    .toBeGreaterThan(barBefore);

  // Edit and reconcile while the five-car ride is live, then exercise the
  // child-facing destructive undo path from the Track scene.
  const activePart = (await project(page)).activePartId;
  await dispatch(page, { type: "removeLayer", layerId: "journey-layer-4" });
  await expect.poll(async () => {
    const current = await project(page);
    return current.parts.find((part: any) => part.id === activePart)?.layers.length;
  }).toBe(4);
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().undoOffer.offering))
    .toBe(true);
  await emit(page, "undo-requested");
  await expect.poll(async () => {
    const current = await project(page);
    return current.parts.find((part: any) => part.id === activePart)?.layers.length;
  }).toBe(5);
  await emit(page, "transport-stop");

  // Autosave is an 800 ms debounce. Give its IndexedDB transaction time to
  // commit, then force a true application reload and boot-time loadLast path.
  const beforeReload = await project(page);
  await page.waitForTimeout(1_500);
  await page.reload();
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  await expect.poll(async () => (await project(page)).parts.length).toBe(5);
  const afterReload = await project(page);
  expect(afterReload.train).toEqual(beforeReload.train);
  expect(afterReload.parts).toEqual(beforeReload.parts);
  expect(afterReload.clips).toEqual(beforeReload.clips);

  await dispatch(page, { type: "setActiveView", view: "track" });
  await waitForScene(page, "TrackV3Scene");
  await emit(page, "track-send");
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().sendUiState.kind),
      { timeout: 30_000 },
    )
    .toBe("ready");
  const download = page.waitForEvent("download");
  await emit(page, "track-send-save");
  expect((await download).suggestedFilename()).toBe("my-train-song.wav");

  expect(issues, `browser errors: ${JSON.stringify(issues, null, 2)}`).toEqual([]);
});
