import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { emptyProject, makeLayer, reduce, serialize } from "../../src/core/project-state.ts";
import { tapMapLandmark } from "./map-landmark.ts";
// @ts-expect-error -- Playwright exposes this pinned decoder without .d.ts
import { PNG } from "playwright-core/lib/utilsBundle";

const VIEWPORT = { width: 2560, height: 1440 };
const PROJECTS_KEY = "ibeetkidz:projects";

type RequestedCar = "flatcar" | "tanker";

test.use({ viewport: VIEWPORT, video: "on" });

function savedWorkshopProject(carType: RequestedCar, crewed: boolean): string {
  let project = emptyProject(`open-car-${carType}-${crewed ? "crew" : "empty"}`, `${carType} visual proof`);
  const partId = project.activePartId!;
  project = reduce(project, { type: "setCarType", partId, carType });
  if (crewed) {
    const crew = [
      { id: "open-car-guitar", station: "guitar" as const, note: "C4" },
      { id: "open-car-violin", station: "violin" as const, note: "E4" },
      { id: "open-car-piano", station: "piano" as const, note: "G4" },
    ];
    for (const member of crew) {
      const clipId = `${member.id}-clip`;
      project = reduce(project, {
        type: "addClip",
        clip: {
          id: clipId,
          source: { kind: "synth", note: member.note },
          effects: [], color: "#ffd166", label: member.station,
        },
      });
      project = reduce(project, {
        type: "addLayer",
        layer: makeLayer({
          id: member.id, clipId, kind: "melody", station: member.station,
          notes: [[0], [], [], []], wave: "triangle", volume: 0.8,
        }),
      });
    }
  }
  return JSON.stringify({
    [project.id]: { name: project.name, savedAt: 1, json: serialize(project) },
  });
}

async function bootWorkshop(page: Page, carType: RequestedCar, crewed: boolean, appUrl: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: PROJECTS_KEY, value: savedWorkshopProject(carType, crewed) },
  );
  await page.goto(appUrl);
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await tapMapLandmark(page, "workshop");
  await page.waitForTimeout(900);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string): Promise<Uint8Array> {
  const file = testInfo.outputPath(`${name}.png`);
  const bytes = await page.locator("canvas").first().screenshot({ path: file, animations: "allow" });
  const decoded = PNG.sync.read(bytes) as { width: number; height: number; data: Uint8Array };
  expect({ width: decoded.width, height: decoded.height }, `${name} must show the 2560×1440 game canvas`).toEqual({ width: 2560, height: 1440 });
  let neonGreen = 0;
  for (let i = 0; i < decoded.data.length; i += 20) {
    const r = decoded.data[i] ?? 0, g = decoded.data[i + 1] ?? 0, b = decoded.data[i + 2] ?? 0;
    if (g >= 240 && r <= 20 && b <= 20) neonGreen++;
  }
  expect(neonGreen, `${name} may not contain Phaser missing-texture green`).toBeLessThan(12);
  await testInfo.attach(name, { path: file, contentType: "image/png" });
  return bytes;
}

async function captureState(page: Page, testInfo: TestInfo, carType: RequestedCar, crewed: boolean, appUrl: string): Promise<Uint8Array> {
  await bootWorkshop(page, carType, crewed, appUrl);
  return screenshot(page, testInfo, `workshop-${carType}-${crewed ? "three-crew" : "empty"}`);
}

// Four real Pages-artifact assemblies. The same production compositor draws
// base → riders → front; no art-only composite or dev scene bridge is involved.
test("Pages Workshop proves the open flatcar and tanker foreground with empty and three-character crews", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const appUrl = testInfo.project.metadata.pwaOrigin;
  if (typeof appUrl !== "string") throw new Error("Playwright Pages origin is not configured");

  const flatEmpty = await captureState(page, testInfo, "flatcar", false, appUrl);
  const flatCrew = await captureState(page, testInfo, "flatcar", true, appUrl);
  const tankerEmpty = await captureState(page, testInfo, "tanker", false, appUrl);
  const tankerCrew = await captureState(page, testInfo, "tanker", true, appUrl);

  for (const [name, empty, crew] of [["flatcar", flatEmpty, flatCrew], ["tanker", tankerEmpty, tankerCrew]] as const) {
    const differs = empty.length !== crew.length || empty.some((value, index) => value !== crew[index]);
    expect(differs, `${name} three-character assembly must visibly differ from its empty car`).toBe(true);
  }
});
