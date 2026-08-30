import type { Page } from "@playwright/test";

/** Click the centre of a named live Phaser input object through the canvas. */
export async function tapNamedPhaserObject(page: Page, name: string): Promise<void> {
  const point = await page.evaluate((objectName) => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const find = (objects: any[]): any => {
      for (const object of objects) {
        if (object.name === objectName) return object;
        const nested = Array.isArray(object.list) ? find(object.list) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    const obj = find(scene.children.getChildren());
    if (!obj?.input) return { error: `no interactive object named ${objectName}` };
    const hit = obj.input.hitArea;
    const localX = hit ? hit.x + hit.width / 2 - obj.displayOriginX : 0;
    const localY = hit ? hit.y + hit.height / 2 - obj.displayOriginY : 0;
    const world = obj.getWorldTransformMatrix().transformPoint(localX, localY);
    const canvas = document.querySelector("canvas")!.getBoundingClientRect();
    const game = scene.scale.gameSize;
    return {
      x: canvas.left + world.x * (canvas.width / game.width),
      y: canvas.top + world.y * (canvas.height / game.height),
    };
  }, name);
  if ("error" in point) throw new Error(point.error);
  await page.mouse.click(point.x, point.y);
}

/** Capture only a named live Phaser input object's visible hit box. */
export async function screenshotNamedPhaserObject(page: Page, name: string) {
  const clip = await page.evaluate((objectName) => {
    const scene = (window as any).__ibeetkidz_test__.getScene();
    const find = (objects: any[]): any => {
      for (const object of objects) {
        if (object.name === objectName) return object;
        const nested = Array.isArray(object.list) ? find(object.list) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    const obj = find(scene.children.getChildren());
    if (!obj?.input?.hitArea) return { error: `no interactive object named ${objectName}` };
    const hit = obj.input.hitArea;
    const ox = obj.displayOriginX ?? 0;
    const oy = obj.displayOriginY ?? 0;
    const matrix = obj.getWorldTransformMatrix();
    const corners = [
      matrix.transformPoint(hit.x - ox, hit.y - oy),
      matrix.transformPoint(hit.x + hit.width - ox, hit.y - oy),
      matrix.transformPoint(hit.x - ox, hit.y + hit.height - oy),
      matrix.transformPoint(hit.x + hit.width - ox, hit.y + hit.height - oy),
    ];
    const canvas = document.querySelector("canvas")!.getBoundingClientRect();
    const game = scene.scale.gameSize;
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    const x0 = canvas.left + Math.min(...xs) * (canvas.width / game.width);
    const x1 = canvas.left + Math.max(...xs) * (canvas.width / game.width);
    const y0 = canvas.top + Math.min(...ys) * (canvas.height / game.height);
    const y1 = canvas.top + Math.max(...ys) * (canvas.height / game.height);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }, name);
  if ("error" in clip) throw new Error(clip.error);
  return page.screenshot({ clip });
}
