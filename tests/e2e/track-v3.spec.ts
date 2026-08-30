import { expect, test, type Page } from "@playwright/test";
import { tapNamedPhaserObject } from "./phaser-pixels.ts";

// The Track: the side-scroller, which is what you get with no flag at all as of
// 2026-08-16. `?oval` opts back into the old ring.
//
// These assert on MOTION, which a screenshot cannot test: that the world scrolls
// at a rate proportional to tempo, that the wheels turn because distance was
// travelled rather than because time passed, and — the premise of the whole
// rebuild — that a terrain lands AHEAD of the playhead where a kid can see it
// coming. GAME_FEEL.md: "Review animation in motion or not at all."

async function bootV3(page: Page): Promise<void> {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("map-nav", "track"));
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackV3Scene",
  );
}

function state(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().debugState());
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

async function tapMapDestination(page: Page, id: string): Promise<void> {
  const point = await page.evaluate((spawnId) => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const i = scene.chromeSpawns.findIndex((spawn: any) => spawn.id === spawnId);
    const hit = scene.chromeHits[i];
    if (!hit?.input) return { error: `no interactive map spawn ${spawnId}` };
    const canvas = document.querySelector("canvas")!.getBoundingClientRect();
    const game = scene.scale.gameSize;
    return {
      x: canvas.left + hit.x * (canvas.width / game.width),
      y: canvas.top + hit.y * (canvas.height / game.height),
    };
  }, id);
  expect((point as { error?: string }).error ?? null).toBeNull();
  await page.mouse.click((point as any).x, (point as any).y);
}

test("the side-scroller is the Track you get with no flag", async ({ page }) => {
  await bootV3(page);
  const key = await page.evaluate(
    () => (window as any).__ibeetkidz_test__.getScene().scene.key,
  );
  expect(key).toBe("TrackV3Scene");
});

test("a failed Track art request uses its generated fallback, never Phaser's missing texture", async ({
  page,
}) => {
  let failedSkyRequests = 0;
  const observedSkyRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/sky")) {
      observedSkyRequests.push(`${request.resourceType()} ${request.url()}`);
    }
  });
  await page.route(/\/src\/assets\/sprites\/track3\/sky\.png(?:\?|$)/, (route) => {
    if (route.request().resourceType() !== "xhr") return route.continue();
    failedSkyRequests += 1;
    return route.abort("failed");
  });

  await bootV3(page);

  expect(
    failedSkyRequests,
    `the test must exercise the real dropped-art request; saw ${JSON.stringify(observedSkyRequests)}`,
  ).toBeGreaterThan(0);
  const texture = await page.evaluate(() => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    return {
      requestedKey: "trk-sky",
      renderedKey: scene.sky.texture.key,
      fallbackExists: scene.textures.exists("trk-sky"),
    };
  });
  expect(texture).toEqual({
    requestedKey: "trk-sky",
    renderedKey: "trk-sky",
    fallbackExists: true,
  });
});

test("a failed required Track asset stops loudly before a missing texture can render", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.route(/\/src\/assets\/sprites\/track3\/loco\.png(?:\?|$)/, (route) => {
    if (route.request().resourceType() !== "xhr") return route.continue();
    return route.abort("failed");
  });

  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await emit(page, "map-nav", "track");

  await expect
    .poll(() => failures.find((message) => message.includes("TRACK_ART_LOAD_FAILED")) ?? "")
    .toContain("trk-loco");
  const boundary = await page.evaluate(() => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    return {
      activeScene: scene.scene.key,
      renderedMissingTextures: scene.children.list.filter(
        (child: any) => child.texture?.key === "__MISSING",
      ).length,
    };
  });
  expect(boundary).toEqual({ activeScene: "MapScene", renderedMissingTextures: 0 });
});

test("a kid can drive the default Track through its real canvas controls", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );

  await tapMapDestination(page, "hit-track");
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackV3Scene",
  );

  const before = await state(page);
  await tapNamedPhaserObject(page, "track-control:btn-track-ride");
  await expect.poll(async () => (await state(page)).pos).toBeGreaterThan(before.pos);

  const loopText = () =>
    page.evaluate(() =>
      (window as any).__ibeetkidz_test__.getScene().children.getByName("track-display:loop").text,
    );
  expect(await loopText()).toBe("∞");
  await tapNamedPhaserObject(page, "track-control:btn-transport-loop");
  await expect.poll(loopText).toBe("1x");

  await tapNamedPhaserObject(page, "track-mode:hill");
  await expect.poll(async () => (await state(page)).terrain?.kind ?? null).toBe("hill");

  const muted = () =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().train[0]?.muted);
  expect(await muted()).toBe(false);
  await tapNamedPhaserObject(page, "track-control:tarp");
  const car = await state(page);
  const canvasPoint = await page.evaluate(({ x, y }) => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const canvas = document.querySelector("canvas")!.getBoundingClientRect();
    const game = scene.scale.gameSize;
    return {
      x: canvas.left + x * (canvas.width / game.width),
      y: canvas.top + y * (canvas.height / game.height),
    };
  // `soundingCarY` is the railhead (the body’s bottom anchor), while the
  // playing car bobs. Clicking that edge can land just below the hit area on a
  // downbeat; keep the real canvas tap safely inside every car body instead.
  }, { x: car.soundingCarX, y: car.soundingCarY - 80 });
  await page.mouse.click(canvasPoint.x, canvasPoint.y);
  // TARP makes the intended choice prominent, but the car tap itself remains
  // non-mutating; confirm the action through the same real canvas path.
  await tapNamedPhaserObject(page, "track-car-action:tarp");
  await expect.poll(muted).toBe(true);

  await tapNamedPhaserObject(page, "track-control:btn-track-clear");
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().train.length),
  ).toBe(0);
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().undoOffer.offering),
  ).toBe(true);
  await tapNamedPhaserObject(page, "undo-action");
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().train.length),
  ).toBe(1);

  await tapNamedPhaserObject(page, "track-control:btn-nav-map");
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activeView),
  ).toBe("map");
});

test("a car tap waits for an explicit edit, tarp, or close choice", async ({ page }) => {
  await bootV3(page);

  const projectBefore = await page.evaluate(() => {
    const project = (window as any).__ibeetkidz_test__.getProject();
    return {
      activeView: project.activeView,
      activePartId: project.activePartId,
      muted: project.train[0]?.muted,
    };
  });
  const tapCar = async (): Promise<void> => {
    const car = await state(page);
    const point = await page.evaluate(({ x, y }) => {
      const scene = (window as any).__ibeetkidz_test__.getScene();
      const canvas = document.querySelector("canvas")!.getBoundingClientRect();
      const game = scene.scale.gameSize;
      return {
        x: canvas.left + x * (canvas.width / game.width),
        y: canvas.top + y * (canvas.height / game.height),
      };
    }, { x: car.soundingCarX, y: car.soundingCarY - 80 });
    await page.mouse.click(point.x, point.y);
  };
  const menuVisible = () => page.evaluate(() => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const find = (objects: any[]): any => {
      for (const object of objects) {
        if (object.name === "track-car-action:close") return object;
        const nested = Array.isArray(object.list) ? find(object.list) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    const close = find(scene.children.getChildren());
    return Boolean(close?.visible && close.parentContainer?.visible);
  });

  await tapCar();
  await expect.poll(menuVisible).toBe(true);
  expect(await page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activeView))
    .toBe(projectBefore.activeView);
  expect(await page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().train[0]?.muted))
    .toBe(projectBefore.muted);

  await tapNamedPhaserObject(page, "track-car-action:close");
  await expect.poll(menuVisible).toBe(false);
  expect((await state(page)).tarpArmed).toBe(false);
  expect(await page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activePartId))
    .toBe(projectBefore.activePartId);

  await tapNamedPhaserObject(page, "track-control:tarp");
  await expect.poll(async () => (await state(page)).tarpArmed).toBe(true);
  await tapCar();
  await tapNamedPhaserObject(page, "track-car-action:close");
  await expect.poll(menuVisible).toBe(false);
  expect((await state(page)).tarpArmed).toBe(true);

  await tapCar();
  await tapNamedPhaserObject(page, "track-car-action:tarp");
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().train[0]?.muted),
  ).toBe(!projectBefore.muted);
  await expect.poll(async () => (await state(page)).tarpedCars).toBe(1);
  await expect.poll(async () => (await state(page)).tarpArmed).toBe(false);
  expect(await page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activeView))
    .toBe("track");

  await tapNamedPhaserObject(page, "track-control:tarp");
  await expect.poll(async () => (await state(page)).tarpArmed).toBe(true);
  await tapCar();
  await page.evaluate(() => {
    (window as any).__track_car_scene_before_edit =
      (window as any).__ibeetkidz_test__.getScene();
  });
  await tapNamedPhaserObject(page, "track-car-action:edit");
  await expect.poll(() =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activeView),
  ).toBe("workshop");
  expect(await page.evaluate(() =>
    (window as any).__track_car_scene_before_edit.debugState().tarpArmed,
  )).toBe(true);
});

test("?oval opts back into the ring", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/?oval");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "MapScene",
  );
  await emit(page, "map-nav", "track");
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "TrackScene",
  );
});

test("riding scrolls the world and turns the wheels; stopping stops both", async ({
  page,
}) => {
  await bootV3(page);
  const idle = await state(page);
  await page.waitForTimeout(600);
  expect((await state(page)).pos).toBe(idle.pos); // nothing moves at rest

  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(1200);
  const a = await state(page);
  await page.waitForTimeout(1200);
  const b = await state(page);

  expect(b.pos).toBeGreaterThan(a.pos);
  // Distance-driven: the wheel angle advanced with the world, not on a timer.
  expect(b.wheelAngle).toBeGreaterThan(a.wheelAngle);
});

test("the scroll rate scales with tempo (GAME_FEEL Law 4)", async ({ page }) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");

  const rateOver = async (ms: number): Promise<number> => {
    const t0 = await state(page);
    await page.waitForTimeout(ms);
    const t1 = await state(page);
    return (t1.pos - t0.pos) / (ms / 1000);
  };

  // Boot tempo is 100; take it down, then up, and compare bars-per-second.
  await emit(page, "tempo-changed", -60); // → 40 bpm
  await page.waitForTimeout(400);
  const slow = await rateOver(2000);

  await emit(page, "tempo-changed", 160); // → 200 bpm
  await page.waitForTimeout(400);
  const fast = await rateOver(2000);

  expect(slow).toBeGreaterThan(0);
  // 40 → 200 bpm is 5x. Allow generous slack for frame timing and the ramp.
  expect(fast / slow).toBeGreaterThan(2.5);
});

test("a picked terrain lands AHEAD of the playhead — you see it coming", async ({
  page,
}) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(800);

  expect((await state(page)).terrain).toBeNull();
  await emit(page, "terrain-picked", "hill");
  await page.waitForTimeout(150);

  const s = await state(page);
  expect(s.terrain).not.toBeNull();
  expect(s.terrain.kind).toBe("hill");
  // THE PREMISE: it is drawn to the RIGHT of the playhead, i.e. approaching,
  // not applied silently under the train. This is what makes the one-bar delay
  // read as cause and effect to a four-year-old.
  expect(s.terrain.x).toBeGreaterThan(s.playheadX);

  // …and it travels toward the playhead rather than sitting still.
  await page.waitForTimeout(900);
  const later = await state(page);
  if (later.terrain) expect(later.terrain.x).toBeLessThan(s.terrain.x);
});

test("a hill lifts the train and tilts it — terrain is geometry, not a colour", async ({
  page,
}) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(600);

  const flat = await state(page);
  expect(flat.soundingCarAngle).toBe(0);
  const flatY = flat.soundingCarY;

  await emit(page, "terrain-picked", "hill");

  // Wait for the hill to actually reach the playhead, then check the car is
  // standing ON it: higher up the screen, and rotated.
  let climbed: any = null;
  for (let i = 0; i < 60; i++) {
    const s = await state(page);
    if (s.soundingCarY !== null && s.soundingCarY < flatY - 20) {
      climbed = s;
      break;
    }
    await page.waitForTimeout(120);
  }
  expect(climbed, "the train never climbed the hill").not.toBeNull();
  expect(climbed.soundingCarY).toBeLessThan(flatY); // up the screen = uphill
  expect(Math.abs(climbed.soundingCarAngle)).toBeGreaterThan(0.05); // tilted

  // …and the world goes back to flat on its own.
  await expect
    .poll(async () => (await state(page)).soundingCarAngle, { timeout: 30_000 })
    .toBe(0);
});

test("a bridge and rain leave the rails level — only a hill is a climb", async ({
  page,
}) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");
  await page.waitForTimeout(600);
  const flatY = (await state(page)).soundingCarY;

  for (const kind of ["bridge", "rain"]) {
    await emit(page, "terrain-picked", kind);
    if (kind === "bridge") {
      await expect.poll(async () => (await state(page)).bridge.deckWidth).toBeGreaterThan(640);
      await expect.poll(async () => (await state(page)).bridge.visiblePiers).toBeGreaterThan(1);
    }
    for (let i = 0; i < 25; i++) {
      const s = await state(page);
      expect(s.soundingCarAngle).toBe(0);
      expect(s.soundingCarY).toBe(flatY);
      await page.waitForTimeout(100);
    }
  }
});

test("a bridge deck remains registered to its piers while the world advances", async ({
  page,
}) => {
  await bootV3(page);
  await emit(page, "transport-play", "ride");
  await emit(page, "terrain-picked", "bridge");
  await expect.poll(async () => (await state(page)).bridge.visiblePiers).toBeGreaterThan(1);

  const before = await state(page);
  expect(before.bridge.deckX).not.toBeNull();
  expect(before.bridge.deckTilePositionX).not.toBeNull();
  expect(before.bridge.firstVisiblePierX).not.toBeNull();

  await expect
    .poll(async () => Math.abs((await state(page)).bridge.deckX - before.bridge.deckX), {
      timeout: 8_000,
      message: "the production bridge span must advance by more than 100px",
    })
    .toBeGreaterThan(100);
  const after = await state(page);
  const deckDelta = after.bridge.deckX - before.bridge.deckX;
  const pierDelta = after.bridge.firstVisiblePierX - before.bridge.firstVisiblePierX;

  expect(
    after.bridge.deckTilePositionX,
    "solid planks and braces must not scroll inside the moving bridge span",
  ).toBe(before.bridge.deckTilePositionX);
  expect(
    Math.abs(deckDelta - pierDelta),
    "the deck and its first pier must move as one rigid world structure",
  ).toBeLessThanOrEqual(1);
});

test("a tunnel enters, scrolls with the train, and exits instead of dimming in place", async ({
  page,
}) => {
  await bootV3(page);
  const registered = await state(page);
  expect(registered.tunnel.phase).toBe("off");
  expect(registered.wheel).toEqual({ diameter: 60, axleOffset: 73 });

  await emit(page, "transport-play", "ride");
  await emit(page, "track-mode-toggled", "tunnel");
  await expect.poll(async () => (await state(page)).tunnel.phase).toMatch(/entering|inside/);
  await expect.poll(async () => (await state(page)).tunnel.visibleLamps).toBeGreaterThan(1);
  const before = (await state(page)).tunnel.wallOffset;
  await expect
    .poll(async () => (await state(page)).tunnel.wallOffset, { timeout: 8_000 })
    .not.toBe(before);

  await emit(page, "track-mode-toggled", "tunnel");
  await expect.poll(async () => (await state(page)).tunnel.phase).toMatch(/exiting|off/);
});
