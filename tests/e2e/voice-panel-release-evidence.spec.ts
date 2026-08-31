import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { emptyProject, serialize } from "../../src/core/project-state.ts";
import { tapCanvasAtClientPoint } from "./canvas-input.ts";
import { tapMapLandmark } from "./map-landmark.ts";
// @ts-expect-error -- Playwright exposes this pinned decoder without .d.ts
import { PNG } from "playwright-core/lib/utilsBundle";

// Acceptance requires the real 2560×1440 game canvas, not a 1280×720 review-scale screenshot.
const VIEWPORT = { width: 2560, height: 1440 };
const PROJECTS_KEY = "ibeetkidz:projects";
const DESIGN = { width: 2560, height: 1440 };

// Workshop map's live inst-mic interaction: (394,915,272,224).
const MIC_STATION = { x: 530, y: 1027 };
// WORKSHOP_TOOL_MODAL is height-bound for a 1536x1152 plate. At 2560x1440,
// panel-voice therefore lays at x=704, y=101, w=1152, h=864; this is the
// centre of the documented record region x=.285..832/y=.135..275.
const RECORD_BAY = { x: 1347, y: 278 };

function savedEmptyProject(): string {
  const project = emptyProject("voice-panel-release", "Voice panel release evidence");
  return JSON.stringify({
    [project.id]: { name: project.name, savedAt: 1, json: serialize(project) },
  });
}

async function designPoint(page: Page, point: { x: number; y: number }): Promise<{ x: number; y: number }> {
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  expect(box, "production canvas must be visible").not.toBeNull();
  const intrinsic = await canvas.evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    return { width: canvas.width, height: canvas.height };
  });
  return {
    x: box!.x + point.x * (box!.width / intrinsic.width),
    y: box!.y + point.y * (box!.height / intrinsic.height),
  };
}

async function tapDesignPoint(page: Page, point: { x: number; y: number }): Promise<void> {
  const client = await designPoint(page, point);
  await tapCanvasAtClientPoint(page, client.x, client.y);
}

async function capturePanel(page: Page, testInfo: TestInfo, name: string): Promise<Uint8Array> {
  const path = testInfo.outputPath(`${name}.png`);
  const bytes = await page.locator("canvas").first().screenshot({ path, animations: "allow" });
  const decoded = PNG.sync.read(bytes) as { width: number; height: number; data: Uint8Array };
  expect({ width: decoded.width, height: decoded.height }, `${name} must be a 2560x1440 production canvas`).toEqual(DESIGN);
  let neonGreen = 0;
  for (let i = 0; i < decoded.data.length; i += 16) {
    const r = decoded.data[i] ?? 0;
    const g = decoded.data[i + 1] ?? 0;
    const b = decoded.data[i + 2] ?? 0;
    if (g >= 240 && r <= 20 && b <= 20) neonGreen++;
  }
  expect(neonGreen, `${name} may not contain Phaser missing-texture green`).toBeLessThan(10);
  await testInfo.attach(name, { path, contentType: "image/png" });
  return bytes;
}

test.use({ viewport: VIEWPORT, video: "on" });

test("the Pages My Voice body assembles around empty and recorded live controls", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const appUrl = testInfo.project.metadata.pwaOrigin;
  if (typeof appUrl !== "string") throw new Error("Playwright Pages origin is not configured");

  // The project-pinned Chromium instance has a deterministic file-backed fake
  // microphone. Explicit permission is still required for production Pages
  // origin so this proves the successful recorded state, not the honest
  // no-microphone fallback state.
  await page.context().grantPermissions(["microphone"], { origin: new URL(appUrl).origin });
  // The PWA artifact is untouched. Only this production evidence fixture
  // supplies a deterministic MediaStream when the sandbox browser cannot
  // expose the Playwright file-backed fake device to a service-worker page.
  // The app still calls its ordinary getUserMedia → MediaRecorder → decode path.
  await page.addInitScript(() => {
    const navigatorWithMedia = navigator as Navigator & { mediaDevices?: MediaDevices };
    const original = navigatorWithMedia.mediaDevices;
    const createToneStream = async (): Promise<MediaStream> => {
      const AudioContextCtor = window.AudioContext;
      const context = new AudioContextCtor();
      const destination = context.createMediaStreamDestination();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 440;
      gain.gain.value = 0.12;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      return destination.stream;
    };
    if (original) {
      Object.defineProperty(original, "getUserMedia", { configurable: true, value: createToneStream });
    } else {
      Object.defineProperty(navigatorWithMedia, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: createToneStream },
      });
    }
  });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: PROJECTS_KEY, value: savedEmptyProject() },
  );
  await page.goto(appUrl);
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await tapMapLandmark(page, "workshop");
  await page.waitForTimeout(700);

  // A real Phaser canvas click opens My Voice. No test bridge or DOM shortcut is used.
  await tapDesignPoint(page, MIC_STATION);
  await page.waitForTimeout(500);
  const empty = await capturePanel(page, testInfo, "voice-panel-01-empty-take");

  // Keep the trusted canvas pointer down long enough for the file-backed fake
  // microphone to create a real recording, then release within the same live
  // record hit bay.
  const record = await designPoint(page, RECORD_BAY);
  await page.mouse.move(record.x, record.y);
  await page.mouse.down();
  await page.waitForTimeout(1_300);
  await page.mouse.up();
  await page.waitForTimeout(1_500);
  const recorded = await capturePanel(page, testInfo, "voice-panel-02-recorded-take");
  const visiblyDifferent = empty.length !== recorded.length || empty.some((value, index) => value !== recorded[index]);
  expect(visiblyDifferent, "recorded state must visibly differ from empty state").toBe(true);
});
