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
