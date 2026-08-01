import { expect, test, type Page } from "@playwright/test";

// The Track view's one hard promise (PROJECT_CHARTER.md §2.5, CLAUDE.md):
// **car i sits at the crossing signal exactly when bar i sounds**, because the
// visual is rendered FROM the transport and never the reverse.
//
// It shipped broken. The cars were spaced bumper-to-bumper (a car body is ~5%
// of the oval's perimeter) while the ride still covers one lap per song, so a
// 4-bar train crossed the signal at bars 0.30 / 0.49 / 0.71 / 0.90 and then
// nothing crossed for the remaining 3 bars — while the signal kept flashing on
// every bar. Neither of the two tests below passed before the fix.
//
// Neither needs audible output (the first does not even need the transport), so
// both run in CI as well as locally.

async function boot(page: Page): Promise<void> {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => {
    const s = (window as any).__ibeetkidz_test__?.getScene();
    return !!s && (s.scene?.key === k || s.constructor?.name === k);
  }, key);
}

/** Put `n` cars on the train and open the Track view on them. */
async function trainOf(page: Page, n: number): Promise<void> {
  await boot(page);
  // The Map is the landing view; let its scene finish claiming the shared canvas
  // before switching, or the swap can land before Phaser is READY and be lost
  // (see src/game/scene-switch.ts).
  await waitForScene(page, "MapScene");
  await page.evaluate((count) => {
    const t = (window as any).__ibeetkidz_test__;
    const p = t.getProject();
    for (const car of p.train) t.dispatch({ type: "removeFromTrain", instanceId: car.instanceId });
    const partId = p.activePartId ?? p.parts[0].id;
    for (let i = 0; i < count; i++)
      t.dispatch({ type: "addToTrain", instanceId: `timing-${i}`, partId });
    t.dispatch({ type: "setActiveView", view: "track" });
  }, n);
  await waitForScene(page, "TrackScene");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().carTokens?.length ?? 0),
    )
    .toBe(n);
}

test("car i is at the crossing signal exactly at bar i", async ({ page }) => {
  const CARS = 4;
  await trainOf(page, CARS);

  // Drive the scene's own progress input — the same 0..1 lap position React
  // feeds it from the transport — and read where the car tokens actually landed.
  const runs = await page.evaluate(async (n) => {
    const s: any = (window as any).__ibeetkidz_test__.getScene();
    const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
    const out: { bar: number; dists: number[] }[] = [];
    for (let bar = 0; bar < n; bar++) {
      s.setProgress(bar / n);
      await frame();
      await frame();
      const sig = s.path.getPoint(0.25); // parkAngle — the crossing signal
      out.push({
        bar,
        dists: s.carTokens.map((c: any) => Math.hypot(c.x - sig.x, c.y - sig.y)),
      });
    }
    return out;
  }, CARS);

  // The oval is ~4076px around at the reference size; a car body is ~200px.
  // "At the signal" is exact (both come from the same `getPoint`), so a couple
  // of pixels is generous; "not at the signal" must be at least a car away.
  for (const { bar, dists } of runs) {
    expect(dists[bar], `car ${bar} must sit ON the signal at bar ${bar}`).toBeLessThan(4);
    dists.forEach((d, i) => {
      if (i !== bar)
        expect(d, `car ${i} must NOT be at the signal at bar ${bar}`).toBeGreaterThan(200);
    });
  }
});

test("the ride never shows a bar the ear has not reached yet", async ({ page }) => {
  // Tone evaluates `Transport.ticks` at `context.now()` — currentTime PLUS the
  // scheduling lookAhead — and the transport itself is started at now(), i.e.
  // one lookAhead in the future. So a correct read of "where the song is" must
  // LAG the wall clock since the play tap by that lead; reading `.ticks`
  // instead put the train a measured 98 ms ahead of its own soundtrack.
  const CARS = 4;
  await trainOf(page, CARS);

  const lead = await page.evaluate(async (n) => {
    const t = (window as any).__ibeetkidz_test__;
    const s: any = t.getScene();
    const barSec = (60 / t.getProject().tempoBpm) * 4;
    const t0 = t.audioDiag().currentTime; // audio clock at the moment of the tap
    t.emit("transport-play", "ride");
    const worst: number[] = [];
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const elapsed = t.audioDiag().currentTime - t0;
      if (s.progress > 0) worst.push(elapsed - s.progress * n * barSec);
    }
    t.emit("transport-stop");
    return worst.length ? Math.min(...worst) : NaN;
  }, CARS);

  expect(lead, "the ride never advanced — nothing was measured").not.toBeNaN();
  // Musical position must always sit BEHIND wall-clock-since-tap by the
  // scheduler's lead (Tone's default lookAhead is 100 ms). Reading the
  // lookahead-shifted clock made this ~0.
  expect(lead, "the train is running ahead of the audio").toBeGreaterThan(0.03);
});
