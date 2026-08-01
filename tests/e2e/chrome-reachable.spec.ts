import { expect, test, type Page } from "@playwright/test";

// THE CHROME A KID TAPS IS ACTUALLY WIRED.
//
// Why this file exists, stated bluntly because the gap it closes was measured:
// every other e2e spec drives the app by EMITTING on the EventBus
// (`__ibeetkidz_test__.emit("map-nav", "workshop")`) instead of touching the
// thing a child touches. That proves the handler works. It proves nothing about
// whether any button reaches the handler.
//
// The demonstration: neutering `fire()` in `src/game/ui-scene.ts` — one early
// return, which kills EVERY Tiled-authored button and instrument sprite in all
// four scenes and leaves the app completely untappable by a child — was run
// against the full suite and scored **20/20 passed**, including the specs named
// "the three destinations are reachable", "tap a painted instrument" and
// "Workshop stations open the creative tools". The suite was structurally
// incapable of noticing that the entire UI had stopped responding.
//
// That is the same blind spot that let undo, "Surprise me", the visualizer and
// Sound Pads all ship built-but-unreachable. Those were found by a human opening
// the app, four separate times. This file is the mechanical check instead.
//
// So: NOTHING HERE MAY USE `emit()` TO TRIGGER THE THING IT ASSERTS. Taps go
// through `page.mouse.click` at real screen pixels. `dispatch` is allowed only
// to STAGE state (getting to a view whose nav is guarded), never to stand in for
// the tap under test.
//
// Coverage is chosen to hit every distinct emit path, and there are FOUR, in
// TWO separate pipelines — which the `fire()` experiment above did not reveal,
// because it only killed one of them:
//
//   `src/game/ui-scene.ts` (spawnUiLayer → Workshop, Yard, Track), all routed
//   through the single `fire()`:
//     - `wireButton`     — `ui-button` spawns; the plaques and transport keys.
//     - `wireInstrument` — `instrument` spawns; the Workshop's characters.
//     - `makeHit`        — the art-less fallback for a spawn with no sprite.
//
//   `src/game/TiledSceneAdapter.ts` (spawnTiledScene → Map ONLY), which carries
//   its OWN duplicated arm/press/emit block and shares nothing with `fire()`.
//     - the Map's three `nav` destination hits.
//
// That duplication is why the earlier mutation left the Map working: two
// same-layer siblings hold copy-pasted wiring instead of one promoted producer.
// Not fixed here (it is a refactor, not this fix), but it is exactly why this
// spec walks BOTH pipelines rather than assuming one covers the app.

interface Tap {
  readonly x: number;
  readonly y: number;
}

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  return crashes;
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => {
    const s = (window as any).__ibeetkidz_test__?.getScene();
    return !!s && s.scene?.key === k;
  }, key);
}

/** Stage-only. Never used to trigger what a test asserts. */
const stageView = (page: Page, view: string) =>
  page.evaluate(
    (v) => void (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: v }),
    view,
  );

const activeView = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject().activeView);

/**
 * Where a chrome spawn's LIVE HIT AREA sits, in the game's 2560x1440 space.
 *
 * Deliberately the hit area's centre and not the sprite's origin: the Workshop's
 * instrument characters carry ~2x transparent padding and `setContentInteractive`
 * fits the input rect to the ART, so the sprite centre and the tappable centre
 * are different points. Aiming at the sprite would make a passing tap depend on
 * padding geometry that a re-export can change.
 */
async function hitCentre(page: Page, sceneKey: string, spawnId: string): Promise<Tap> {
  const p = await page.evaluate(
    ([key, id]) => {
      const s = (window as any).__ibeetkidz_test__.getScene();
      if (s.scene.key !== key) return { err: `scene is ${s.scene.key}, wanted ${key}` };
      // Two pipelines, two shapes. `spawnUiLayer` returns UiElement[] carrying
      // their own spawn; `spawnTiledScene` returns bare Rectangles kept
      // INDEX-ALIGNED with a parallel spawn array.
      let obj: any;
      const el = (s.chrome ?? []).find((e: any) => e.spawn?.id === id);
      if (el) obj = el.image ?? el.hit;
      else {
        const i = (s.chromeSpawns ?? []).findIndex((sp: any) => sp.id === id);
        if (i < 0) return { err: `no chrome spawn "${id}" in ${key}` };
        obj = (s.chromeHits ?? [])[i];
      }
      if (!obj) return { err: `spawn "${id}" rendered neither art nor a hit-area` };
      if (!obj.input) return { err: `spawn "${id}" is not interactive` };
      const ha = obj.input.hitArea;
      // A Rectangle fallback hit-area is already centre-origin at its own x/y;
      // an Image carries a texture-space rect that has to be transformed out.
      if (!ha || obj.type === "Rectangle") return { x: obj.x, y: obj.y };
      return {
        x: obj.x + (ha.x + ha.width / 2 - obj.displayOriginX) * obj.scaleX,
        y: obj.y + (ha.y + ha.height / 2 - obj.displayOriginY) * obj.scaleY,
      };
    },
    [sceneKey, spawnId] as const,
  );
  expect((p as { err?: string }).err ?? null, `locating "${spawnId}"`).toBeNull();
  return p as Tap;
}

/** Click real screen pixels, mapping game space through the FIT scale. */
async function tap(page: Page, at: Tap): Promise<void> {
  const m = await page.evaluate(() => {
    const c = document.querySelector("canvas")!.getBoundingClientRect();
    const g = (window as any).__ibeetkidz_test__.getScene().scale.gameSize;
    return { left: c.left, top: c.top, k: c.width / g.width };
  });
  await page.mouse.click(m.left + at.x * m.k, m.top + at.y * m.k);
}

async function tapSpawn(page: Page, sceneKey: string, spawnId: string): Promise<void> {
  await tap(page, await hitCentre(page, sceneKey, spawnId));
}

test("every action-bearing spawn is interactive and on-screen", async ({ page }) => {
  // The structural half. It cannot catch a dead `fire()` — that is what the tap
  // test below is for — but it does catch a spawn that lost its hit area or got
  // placed outside the canvas, which is how a button goes dead without anyone
  // editing the wiring.
  const crashes = await boot(page);
  const scenes = [
    ["map", "MapScene"],
    ["workshop", "WorkshopScene"],
    ["yard", "YardScene"],
    ["track", "TrackScene"],
  ] as const;

  let checked = 0;
  for (const [view, key] of scenes) {
    await stageView(page, view);
    await waitForScene(page, key);
    const report = await page.evaluate(() => {
      const s = (window as any).__ibeetkidz_test__.getScene();
      const g = s.scale.gameSize;
      // Normalise both pipelines to (spawn, displayObject) before asserting.
      const pairs: { spawn: any; obj: any }[] = (s.chrome ?? []).map((e: any) => ({
        spawn: e.spawn,
        obj: e.image ?? e.hit,
      }));
      (s.chromeSpawns ?? []).forEach((sp: any, i: number) => {
        if (!pairs.some((p) => p.spawn?.id === sp.id)) {
          pairs.push({ spawn: sp, obj: (s.chromeHits ?? [])[i] });
        }
      });
      return pairs
        .filter((p) => p.spawn?.action !== undefined)
        .map(({ spawn, obj: o }) => ({
          id: spawn.id,
          action: spawn.action,
          interactive: !!o?.input,
          onScreen:
            !!o && o.x >= 0 && o.y >= 0 && o.x <= g.width && o.y <= g.height && o.visible,
        }));
    });

    expect(report.length, `${key} spawned no action-bearing chrome at all`).toBeGreaterThan(0);
    for (const r of report as { id: string; action: string; interactive: boolean; onScreen: boolean }[]) {
      expect(r.interactive, `${key}/${r.id} (${r.action}) takes no pointer input`).toBe(true);
      expect(r.onScreen, `${key}/${r.id} (${r.action}) is off-canvas or hidden`).toBe(true);
    }
    checked += report.length;
  }
  // Guards the guard: if the chrome pipeline stopped spawning, every loop above
  // would vacuously pass. 34 action-bearing objects are authored across the four
  // maps today; assert we are in that ballpark, not at zero.
  expect(checked, "far fewer spawns than the maps author — is the walk finding them?").toBeGreaterThan(25);
  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("tapping the real pixels of a button actually does something", async ({ page }) => {
  // THE ONE THAT WOULD HAVE CAUGHT IT. Every assertion below is downstream of a
  // real `page.mouse.click` landing on Tiled-authored art and `fire()` emitting.
  const crashes = await boot(page);
  await waitForScene(page, "MapScene");

  // 1. Map — `nav` spawns, i.e. the `makeHit` art-less fallback path.
  await tapSpawn(page, "MapScene", "hit-workshop");
  await expect
    .poll(() => activeView(page), { message: "tapping the Map's WORKSHOP sign did nothing" })
    .toBe("workshop");
  await waitForScene(page, "WorkshopScene");

  // 2. Workshop plaque — the `wireButton` path.
  //
  //    ORDER MATTERS, and it encodes a real UI fact rather than test tidiness:
  //    the instrument tap in step 4 opens a tool panel whose modal backdrop
  //    covers the nav chrome, so a nav tap after it lands on the backdrop and
  //    does nothing. (That is the same masking that leaves the undo chip
  //    unreachable behind any open panel.) The nav taps therefore come first,
  //    while the chrome is genuinely exposed — otherwise this spec would report
  //    a dead button when the button is merely covered.
  await tapSpawn(page, "WorkshopScene", "btn-nav-yard");
  await expect
    .poll(() => activeView(page), { message: "tapping the Workshop's YARD plaque did nothing" })
    .toBe("yard");
  await waitForScene(page, "YardScene");

  // 3. Yard chrome (yard.json). Back to the Workshop rather than on to the
  //    Track, because the TRACK plaque is guarded on having an assembled train
  //    and a guarded no-op is indistinguishable from a dead button.
  await tapSpawn(page, "YardScene", "btn-yard-workshop");
  await expect
    .poll(() => activeView(page), { message: "tapping the Yard's WORKSHOP plaque did nothing" })
    .toBe("workshop");
  await waitForScene(page, "WorkshopScene");

  // 4. Workshop instrument — the `wireInstrument` path. A guitar tap must leave
  //    a real melody lane in the active car, not merely change a frame.
  const lanes = () =>
    page.evaluate(() => {
      const p = (window as any).__ibeetkidz_test__.getProject();
      const part = p.parts.find((x: any) => x.id === p.activePartId) ?? p.parts[0];
      return part.layers.length;
    });
  const before = await lanes();
  await tapSpawn(page, "WorkshopScene", "inst-guitar");
  await expect
    .poll(lanes, { message: "tapping the guitar character added no lane" })
    .toBeGreaterThan(before);

  // 5. Track chrome (track.json). Staged into the view — the tap under test is
  //    the one leaving it, which is unguarded.
  await stageView(page, "track");
  await waitForScene(page, "TrackScene");
  await tapSpawn(page, "TrackScene", "btn-track-map");
  await expect
    .poll(() => activeView(page), { message: "tapping the Track's MAP plaque did nothing" })
    .toBe("map");

  expect(crashes, crashes.join(" | ")).toEqual([]);
});
