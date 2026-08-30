import { expect, type Page } from "@playwright/test";
import { parseTiledLayer } from "../../src/game/TiledParser.ts";
import mapMap from "../../src/assets/maps/map.json" with { type: "json" };

export const MAP_VIEWPORT = { width: 1280, height: 720 } as const;

const ART_W = mapMap.width * mapMap.tilewidth;
const ART_H = mapMap.height * mapMap.tileheight;

/**
 * Tap a painted Map landmark through its real canvas hit area. Production
 * builds have no test bridge, so both artifact suites derive this point from
 * map.json and mirror TiledSceneAdapter's cover-fit instead of copying pixels.
 */
export async function tapMapLandmark(page: Page, destination: string): Promise<void> {
  const spawn = parseTiledLayer(mapMap, "ui-layer").find((candidate) => candidate.arg === destination);
  expect(spawn, `map.json must still carry a nav hit-area for "${destination}"`).toBeDefined();

  const scale = Math.max(MAP_VIEWPORT.width / ART_W, MAP_VIEWPORT.height / ART_H);
  const bgW = ART_W * scale;
  const bgH = ART_H * scale;
  const bgX = (MAP_VIEWPORT.width - bgW) / 2;
  const bgY = (MAP_VIEWPORT.height - bgH) / 2;
  await page.mouse.click(bgX + spawn!.cx * bgW, bgY + spawn!.cy * bgH);
}
