import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { emptyProject, makeLayer, reduce, serialize } from "../../src/core/project-state.ts";
import {
  TRACK_HEADER,
  TRACK_VISUALIZER,
  trackHeaderSlots,
  trackJobSlots,
} from "../../src/game/scene-layout.ts";
import { trackCarActionSlots } from "../../src/game/track-car-actions.ts";
import { tapMapLandmark } from "./map-landmark.ts";
// Playwright explicitly exports this bundle path, but does not publish its
// declarations. Reuse its pinned PNG decoder instead of adding a second image
// stack solely for release tests.
// @ts-expect-error -- exported JavaScript module intentionally has no .d.ts
import { PNG } from "playwright-core/lib/utilsBundle";

// Production-shaped visual release evidence for the default Track.
//
// Unlike track-v3.spec.ts, this boots dist-gh/ under its real /ibeetkidz/ base
// and has no dev bridge. Every action below enters through Phaser's browser-
// event listeners on the canvas.
// The video and screenshots are disposable Playwright artifacts; objective
// failures (asset/network errors, Phaser's missing-texture green, controls that
// do not visibly latch, or a car tap that cannot reach Workshop) fail the run.

const VIEWPORT = { width: 1280, height: 720 };
const PROJECTS_KEY = "ibeetkidz:projects";
const SEEDED_CAR_TAP = { x: 1083, y: 880 };

test.use({ viewport: VIEWPORT, video: "on" });

interface CanvasMetrics {
  readonly width: number;
  readonly height: number;
  readonly neonGreenPixels: number;
  readonly sampledPixels: number;
  readonly worldLuma: number;
}

interface BrowserFailures {
  readonly page: string[];
  readonly console: string[];
  readonly network: string[];
}

interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

function savedAuditProject(): string {
  const clipId = "visual-release-tone";
  const layerId = "visual-release-lane";
  let project = emptyProject("visual-release-project", "Visual release check");
  project = reduce(project, {
    type: "addClip",
    clip: {
      id: clipId,
      source: { kind: "synth", note: "C4" },
      effects: [],
      color: "#ffd166",
      label: "Release tone",
    },
  });
  project = reduce(project, {
    type: "addLayer",
    layer: makeLayer({
      id: layerId,
      clipId,
      kind: "melody",
      notes: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? [0] : [])),
      wave: "triangle",
      volume: 0.8,
    }),
  });
  return JSON.stringify({
    [project.id]: { name: project.name, savedAt: 1, json: serialize(project) },
  });
}

function observeBrowser(page: Page): BrowserFailures {
  const failures: BrowserFailures = { page: [], console: [], network: [] };
  page.on("pageerror", (error) => failures.page.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.console.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const path = new URL(request.url()).pathname;
    if (path !== "/favicon.ico") {
      failures.network.push(`${request.failure()?.errorText ?? "FAILED"} ${path}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      const path = new URL(response.url()).pathname;
      if (path !== "/favicon.ico") failures.network.push(`${response.status()} ${path}`);
    }
  });
  return failures;
}

async function bootPagesTrack(page: Page, appUrl: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: PROJECTS_KEY, value: savedAuditProject() },
  );
  await page.goto(appUrl);
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForLoadState("networkidle");

  const trackLoaded = page.waitForResponse(
    (response) => /\/assets\/sky-[^/]+\.png$/.test(new URL(response.url()).pathname),
    { timeout: 20_000 },
  );
  await tapMapLandmark(page, "track");
  await expect((await trackLoaded).ok(), "the Pages build must load Track sky art").toBe(true);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

async function tapDesignPoint(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  expect(box, "Phaser canvas must remain visible").not.toBeNull();
  const intrinsic = await canvas.evaluate((element) => {
    const c = element as HTMLCanvasElement;
    return { width: c.width, height: c.height };
  });
  const screenX = box!.x + x * (box!.width / intrinsic.width);
  const screenY = box!.y + y * (box!.height / intrinsic.height);
  expect(
    await page.evaluate(
      ({ clientX, clientY }) => document.elementFromPoint(clientX, clientY)?.tagName,
      { clientX: screenX, clientY: screenY },
    ),
    "the design point must resolve to the unobstructed Phaser canvas",
  ).toBe("CANVAS");
  // Phaser samples pointer state on its game loop. A zero-dwell Playwright
  // click can deliver down + up between two frames on a loaded CI runner and
  // is less representative than even a very quick human tap. Dispatch through
  // the real canvas listener after the hit-test above rather than depending on
  // Chromium's worker-global mouse state late in a long serial CI run.
  const event = { clientX: screenX, clientY: screenY, button: 0, buttons: 1 };
  await canvas.dispatchEvent("mousemove", event);
  await canvas.dispatchEvent("mousedown", event);
  await page.waitForTimeout(80);
  await canvas.dispatchEvent("mouseup", { ...event, buttons: 0 });
}

function decodePng(bytes: Uint8Array): DecodedPng {
  return PNG.sync.read(bytes) as DecodedPng;
}

function metricsOf(image: DecodedPng): CanvasMetrics {
  let neonGreenPixels = 0;
  let sampledPixels = 0;
  let worldLuma = 0;
  let worldSamples = 0;
  // Sampling every other pixel catches Phaser's 32px missing-texture grid
  // cheaply while reading the exact compositor pixels Playwright captured.
  for (let y = 0; y < image.height; y += 2) {
    for (let x = 0; x < image.width; x += 2) {
      const i = (y * image.width + x) * 4;
      const r = image.data[i] ?? 0;
      const g = image.data[i + 1] ?? 0;
      const b = image.data[i + 2] ?? 0;
      if (g >= 240 && r <= 20 && b <= 20) neonGreenPixels++;
      sampledPixels++;
      // The band below the header and above the rails is the world treatment
      // the tunnel must visibly affect. Fractions follow the rendered canvas,
      // so the probe remains valid if the design resolution changes.
      if (y >= image.height * 0.33 && y <= image.height * 0.70) {
        worldLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        worldSamples++;
      }
    }
  }
  return {
    width: image.width,
    height: image.height,
    neonGreenPixels,
    sampledPixels,
    worldLuma: worldLuma / Math.max(1, worldSamples),
  };
}

async function canvasMetrics(page: Page): Promise<CanvasMetrics> {
  const bytes = await page.locator("canvas").first().screenshot({ animations: "allow" });
  return metricsOf(decodePng(bytes));
}

async function patchSignature(page: Page, x: number, y: number): Promise<number> {
  const canvas = page.locator("canvas").first();
  const intrinsic = await canvas.evaluate((element) => {
    const source = element as HTMLCanvasElement;
    return { width: source.width, height: source.height };
  });
  const image = decodePng(await canvas.screenshot({ animations: "allow" }));
  const px = Math.round(x * (image.width / intrinsic.width));
  const py = Math.round(y * (image.height / intrinsic.height));
  const half = Math.max(8, Math.round(28 * (image.width / intrinsic.width)));
  let signature = 0;
  for (let sy = Math.max(0, py - half); sy < Math.min(image.height, py + half); sy++) {
    for (let sx = Math.max(0, px - half); sx < Math.min(image.width, px + half); sx++) {
      const i = (sy * image.width + sx) * 4;
      signature +=
        (image.data[i] ?? 0) +
        3 * (image.data[i + 1] ?? 0) +
        7 * (image.data[i + 2] ?? 0);
    }
  }
  return signature;
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<CanvasMetrics> {
  const path = testInfo.outputPath(`${name}.png`);
  const bytes = await page.locator("canvas").first().screenshot({
    path,
    animations: "allow",
  });
  await testInfo.attach(name, { path, contentType: "image/png" });
  const metrics = metricsOf(decodePng(bytes));
  expect(
    metrics.neonGreenPixels / metrics.sampledPixels,
    `${name}: Phaser's neon-green missing-texture grid must not reach the rendered Track`,
  ).toBeLessThan(0.0005);
  return metrics;
}

test("the Pages Track produces reviewable release evidence", async ({ page }, testInfo) => {
  // Seven screenshots plus bar-scheduled bridge, tunnel, and tarp transitions
  // deliberately exercise more than two minutes of production canvas time on
  // a loaded headed CI runner. Individual assertions retain tighter deadlines.
  test.setTimeout(180_000);
  const appUrl = testInfo.project.metadata.pwaOrigin;
  if (typeof appUrl !== "string") throw new Error("playwright config must provide pwaOrigin");
  const failures = observeBrowser(page);
  await bootPagesTrack(page, appUrl);

  const idle = await capture(page, testInfo, "track-01-idle");
  const headerBottom = TRACK_HEADER.plate.y + TRACK_HEADER.plate.height / 2;
  const designHeight = await page.locator("canvas").first().evaluate(
    (element) => (element as HTMLCanvasElement).height,
  );
  expect(
    headerBottom / designHeight,
    "the header plate must leave at least two-thirds of the Track for the world and train",
  ).toBeLessThanOrEqual(1 / 3);
  expect(
    TRACK_VISUALIZER.y - TRACK_VISUALIZER.height / 2,
    "the visualizer must not overlap the header plate",
  ).toBeGreaterThanOrEqual(headerBottom);

  const slots = trackHeaderSlots();
  await tapDesignPoint(page, slots.ride!.x, slots.ride!.y);
  await page.waitForTimeout(1_200);
  await capture(page, testInfo, "track-02-riding-visualizer");

  const jobSlots = trackJobSlots();
  const bridge = jobSlots.bridge;
  const tunnel = jobSlots.tunnel;
  const bridgeBefore = await patchSignature(page, bridge.x, bridge.y);
  await tapDesignPoint(page, bridge.x, bridge.y);
  await expect
    .poll(() => patchSignature(page, bridge.x, bridge.y), {
      timeout: 12_000,
      message: "BRIDGE must visibly latch after a real canvas tap",
    })
    .not.toBe(bridgeBefore);
  await capture(page, testInfo, "track-03-bridge-approach");
  await page.waitForTimeout(3_000);
  const bridgeRide = await capture(page, testInfo, "track-04-bridge-traversal");

  const tunnelBefore = await patchSignature(page, tunnel.x, tunnel.y);
  await tapDesignPoint(page, tunnel.x, tunnel.y);
  await expect
    .poll(() => patchSignature(page, tunnel.x, tunnel.y), {
      timeout: 12_000,
      message: "TUNNEL must visibly latch after a real canvas tap",
    })
    .not.toBe(tunnelBefore);
  await expect
    .poll(async () => (await canvasMetrics(page)).worldLuma, {
      timeout: 15_000,
      message: "TUNNEL must produce a visible world treatment when its bar arrives",
    })
    .toBeLessThan(bridgeRide.worldLuma * 0.82);
  await capture(page, testInfo, "track-05-tunnel");
  await tapDesignPoint(page, slots.stop!.x, slots.stop!.y);
  await page.waitForTimeout(400);

  // One seeded car has a stable, generous body target around the middle-left
  // of the consist. Arm the authored TARP key, select the car, then confirm the
  // explicit action: this proves both key state and the registered cover in the
  // production canvas before EDIT takes the same two-step path.
  const tarpKeyBefore = await patchSignature(page, slots.tarp!.x, slots.tarp!.y);
  await tapDesignPoint(page, slots.tarp!.x, slots.tarp!.y);
  await expect
    .poll(() => patchSignature(page, slots.tarp!.x, slots.tarp!.y), {
      timeout: 12_000,
      message: "TARP must visibly seat after a real canvas tap",
    })
    .not.toBe(tarpKeyBefore);
  const carBefore = await patchSignature(page, SEEDED_CAR_TAP.x, SEEDED_CAR_TAP.y);
  await tapDesignPoint(page, SEEDED_CAR_TAP.x, SEEDED_CAR_TAP.y);
  await capture(page, testInfo, "track-06-car-actions");
  const actions = trackCarActionSlots(2560);
  await tapDesignPoint(page, actions["toggle-mute"].x, actions["toggle-mute"].y);
  await expect
    .poll(() => patchSignature(page, SEEDED_CAR_TAP.x, SEEDED_CAR_TAP.y), {
      timeout: 12_000,
      message: "confirming TARP must visibly cover the selected car",
    })
    .not.toBe(carBefore);
  await capture(page, testInfo, "track-07-tarped-car");

  await tapDesignPoint(page, SEEDED_CAR_TAP.x, SEEDED_CAR_TAP.y);
  const workshopLoaded = page.waitForResponse(
    (response) => /\/assets\/workshop-interior-clean-[^/]+\.png$/.test(
      new URL(response.url()).pathname,
    ),
    { timeout: 15_000 },
  );
  const edit = actions.edit;
  await tapDesignPoint(page, edit.x, edit.y);
  await expect(
    (await workshopLoaded).ok(),
    "choosing EDIT after tapping the visible car body must open Workshop",
  ).toBe(true);

  expect(failures.page, "uncaught browser errors").toEqual([]);
  expect(failures.console, "browser console errors").toEqual([]);
  expect(failures.network, "failed release requests").toEqual([]);
  await testInfo.attach("track-release-metrics", {
    body: JSON.stringify({ idle, bridgeRide, failures }, null, 2),
    contentType: "application/json",
  });
});
