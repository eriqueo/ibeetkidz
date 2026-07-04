import { expect, test, type Page } from "@playwright/test";

// Audio must actually REACH the master output — not just "the transport clock
// ran". The train animating while the app is silent is exactly the failure
// mode that motivated this: the transport drives the visuals even when no
// samples flow. `audioDiag().masterPeak` reads the destination-tapped analyser
// (the same one that feeds the visualizer), so a peak > 0 is real signal.

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

const diag = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag());

test("PLAY with a notes lane pushes real samples to the master output", async ({ page }) => {
  await boot(page);
  await page.evaluate(() =>
    (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "workshop" }),
  );
  await page.waitForFunction(() => {
    const s = (window as any).__ibeetkidz_test__?.getScene();
    return !!s && s.scene?.key === "WorkshopScene";
  });

  // A fresh melody lane seeds 4 notes, so PLAY must be audible immediately.
  await emit(page, "workshop-add-melody", "guitar");
  await emit(page, "transport-play", "loop");

  // The context must be running and the transport started…
  await expect.poll(async () => (await diag(page)).contextState).toBe("running");
  await expect.poll(async () => (await diag(page)).transportState).toBe("started");

  // …and within a couple of bars, signal must show up at the destination.
  await expect
    .poll(
      async () => (await diag(page)).masterPeak,
      { timeout: 8000, message: "no samples reached the master output" },
    )
    .toBeGreaterThan(0.02);

  await emit(page, "transport-stop");
});
