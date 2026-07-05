import { expect, test, type Page } from "@playwright/test";

// The v2 sprite flow. Every view — Map landing, Workshop, Yard, Track — is now a
// pure Phaser canvas (nav + transport migrated off HTML into Tiled hit-areas), so
// we drive them through the same shared EventBus React uses, via a dev-only test
// bridge (`window.__ibeetkidz_test__`, mounted in `src/app/context.tsx`). We
// assert on real state (the live Project) + the surviving HTML chrome (the Track
// tarp strip), never on canvas. Mic is faked via Playwright launch flags.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  // The bridge mounts at module load; wait until it's reachable before emitting.
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

// Wait until the currently-mounted view's Phaser scene has finished `create()`
// and reported itself ready (so its React subscriptions are live too).
async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
    (k) => {
      const s = (window as any).__ibeetkidz_test__?.getScene();
      return !!s && (s.scene?.key === k || s.constructor?.name === k);
    },
    key,
  );
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

function getProject(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());
}

function setView(page: Page, view: string): Promise<void> {
  return page.evaluate(
    (v) => void (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: v }),
    view,
  );
}

// Map → a destination via the canvas nav (the data-driven `map-nav` Tiled hit).
async function gotoFromMap(page: Page, view: string): Promise<void> {
  await waitForScene(page, "MapScene");
  await emit(page, "map-nav", view);
  await expect.poll(async () => (await getProject(page)).activeView).toBe(view);
}

function activeMelodyCount(project: any): number {
  const part = project.parts.find((p: any) => p.id === project.activePartId) ?? project.parts[0];
  return part.layers.filter((l: any) => l.kind === "melody").length;
}

test("boots into the Map and the three destinations are reachable", async ({ page }) => {
  await boot(page);
  // boot seeds one train car, so Track is allowed; each `map-nav` Tiled hit
  // navigates to its destination, then we return to the Map for the next one.
  for (const view of ["workshop", "yard", "track"] as const) {
    await gotoFromMap(page, view);
    await setView(page, "map");
    await expect.poll(async () => (await getProject(page)).activeView).toBe("map");
  }
});

test("Workshop: tap a painted instrument → a sequencer lane appears", async ({ page }) => {
  await boot(page);
  await gotoFromMap(page, "workshop");
  await waitForScene(page, "WorkshopScene");

  const before = activeMelodyCount(await getProject(page));
  await emit(page, "workshop-add-melody", "guitar");

  // The store flip is the truth: the active car gained a melody lane.
  await expect.poll(async () => activeMelodyCount(await getProject(page))).toBe(before + 1);
});

test("Workshop stations open the creative tools", async ({ page }) => {
  await boot(page);
  await gotoFromMap(page, "workshop");
  await waitForScene(page, "WorkshopScene");

  const activeTool = () =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().activeToolId as string | null);

  await emit(page, "workshop-open-tool", "beat-grid");
  await expect.poll(activeTool).toBe("beat-grid");

  // `workshop-open-tool` toggles; re-emitting the SAME id closes it.
  await emit(page, "workshop-open-tool", "beat-grid");
  await expect.poll(activeTool).toBeNull();

  await emit(page, "workshop-open-tool", "record-voicefx");
  await expect.poll(activeTool).toBe("record-voicefx");
});

test("My Voice: hold-to-record captures real, non-silent audio (fake mic)", async ({ page }) => {
  await boot(page);
  await gotoFromMap(page, "workshop");
  await waitForScene(page, "WorkshopScene");
  await emit(page, "workshop-open-tool", "record-voicefx");

  // Hold to record for a beat and a half of the fake mic's tone, then release.
  await emit(page, "tool-voice-record", true);
  await page.waitForTimeout(1500);
  await emit(page, "tool-voice-record", false);

  // A recording clip must land in the project…
  const recordingClip = async () => {
    const p = await getProject(page);
    return (Object.values(p.clips) as any[]).find((c) => c.source?.kind === "recording");
  };
  await expect.poll(async () => (await recordingClip()) !== undefined).toBe(true);

  // …and its decoded take must be REAL AUDIO. Duration alone can't catch the
  // iOS-class failure where the recorder "succeeds" but captures pure silence,
  // so assert the buffer's peak sample too (the fake mic emits a loud tone).
  const clip = await recordingClip();
  const probes = await page.evaluate(
    (bufferId) => ({
      duration: (window as any).__ibeetkidz_test__.bufferDuration(bufferId),
      peak: (window as any).__ibeetkidz_test__.bufferPeak(bufferId),
    }),
    clip.source.bufferId,
  );
  expect(probes.duration, "take must have real length").toBeGreaterThan(0.5);
  expect(probes.peak, "take must not be silence").toBeGreaterThan(0.05);
});

test("Yard → Track: couple a car and ride it", async ({ page }) => {
  // Surface page-side errors in the test log — the SEND flow shows a kid-safe
  // "oops" on failure, so without this a cross-engine breakage is opaque.
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") console.log("[page-error]", m.text());
  });
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await boot(page);
  await gotoFromMap(page, "workshop");
  await waitForScene(page, "WorkshopScene");
  await emit(page, "workshop-add-melody", "guitar"); // give the active car content

  // Travel to the Yard (Workshop handles `workshop-nav`).
  await emit(page, "workshop-nav", "yard");
  await waitForScene(page, "YardScene");

  const project = await getProject(page);
  const partId: string = project.activePartId ?? project.parts[0].id;

  await emit(page, "yard-add-to-train", partId);
  await page.waitForTimeout(1300); // crane tween + dispatch on its onComplete
  await expect.poll(async () => (await getProject(page)).train.length).toBeGreaterThan(0);

  // Depart for the Track.
  await emit(page, "yard-send-to-track");
  await expect.poll(async () => (await getProject(page)).activeView).toBe("track");
  await waitForScene(page, "TrackScene");

  // Tap-a-car-to-tarp-it: the scene's car token emits the mute toggle.
  const slot = (await getProject(page)).train[0];
  await emit(page, "track-car-mute-toggled", slot.instanceId);
  await expect.poll(async () => (await getProject(page)).train[0].muted).toBe(true);
  await emit(page, "track-car-mute-toggled", slot.instanceId);
  await expect.poll(async () => (await getProject(page)).train[0].muted).toBe(false);

  // Ride long enough for the loco smoke timer (800ms) to fire — a runtime
  // error anywhere in the game step kills Phaser's whole render loop, which
  // shows up as the loco freezing while React keeps pushing progress.
  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(1200);
  const x1 = await page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().loco.x);
  await page.waitForTimeout(1200);
  const x2 = await page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().loco.x);
  expect(x2, "the loco must still be moving after the smoke timer fires").not.toBe(x1);
  await emit(page, "transport-stop");

  // SEND: the in-scene plaque kicks off a master-output render (the train
  // rides the song once), the result panel offers Save, and a real WAV
  // download must land, followed by the explicit "Saved!" confirmation.
  const sendState = () =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().sendUiState?.kind);
  expect(await sendState()).toBe("idle");
  await emit(page, "track-send");
  await expect
    .poll(sendState, { timeout: 20_000, message: "the render (1 bar + tail) must finish" })
    .toBe("ready");
  const download = page.waitForEvent("download");
  await emit(page, "track-send-save");
  expect((await download).suggestedFilename()).toBe("my-train-song.wav");
  await expect.poll(sendState).toBe("saved");
  await emit(page, "track-send-close");
  await expect.poll(sendState).toBe("idle");
});

test("Map guards Track until a train exists", async ({ page }) => {
  await boot(page);
  // `emptyProject` seeds one car on the train so the app is rideable on boot,
  // and the v2 UI has no EventBus path to remove a train slot — so empty the
  // train through the test bridge to reach the guard precondition.
  await page.evaluate(() => {
    const t = (window as any).__ibeetkidz_test__;
    for (const car of t.getProject().train) {
      t.dispatch({ type: "removeFromTrain", instanceId: car.instanceId });
    }
  });
  await expect.poll(async () => (await getProject(page)).train.length).toBe(0);

  // The Map's `map-nav` Tiled hit guards Track when the train is empty → toast.
  await waitForScene(page, "MapScene");
  await emit(page, "map-nav", "track");
  await expect(page.getByText(/build a train first/i)).toBeVisible();
  await expect.poll(async () => (await getProject(page)).activeView).toBe("map");
});
