import { expect, test, type Page } from "@playwright/test";

// "Forgiving UX. … mic-denied must leave the app fully usable" — one of this
// project's stated rules, and it had no test at all. A parent who taps Block on
// the permission prompt is a completely ordinary case, and the failure mode it
// guards against is severe: a hung recorder, a dead tool panel, or an unhandled
// rejection that takes the page with it, on a device where the kid cannot
// retry.
//
// This runs everywhere (no `test.skip` on CI): it needs `getUserMedia` to FAIL,
// which is exactly what a runner with no capture device does anyway. It is the
// mirror of `v2-flow`'s hold-to-record proof, which is local-only because it
// needs real capture.

/** Reject every mic request the way a real "Block" does — before any app code
 *  runs, so the app has never seen a working recorder. */
async function denyTheMic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const deny = (): Promise<MediaStream> =>
      Promise.reject(
        Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }),
      );
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", { value: {}, configurable: true });
    }
    navigator.mediaDevices.getUserMedia = deny;
    // Older path some engines still route through.
    (navigator as unknown as { getUserMedia?: unknown }).getUserMedia = deny;
  });
}

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await expect(page.locator("#app")).toBeVisible();
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
  return crashes;
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((k) => {
    const s = (window as any).__ibeetkidz_test__?.getScene();
    return !!s && (s.scene?.key === k || s.constructor?.name === k);
  }, key);
}

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

const project = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());
const scene = (page: Page) =>
  page.evaluate(() => {
    const s = (window as any).__ibeetkidz_test__.getScene();
    return { tool: s.activeToolId ?? null, status: s.toolStatus };
  });

test("a denied mic leaves the whole app usable", async ({ page }) => {
  await denyTheMic(page);
  const crashes = await boot(page);

  await waitForScene(page, "MapScene");
  await emit(page, "map-nav", "workshop");
  await waitForScene(page, "WorkshopScene");

  // Hold the mic and let go, exactly as a kid would.
  await emit(page, "workshop-open-tool", "record-voicefx");
  await expect.poll(async () => (await scene(page)).tool).toBe("record-voicefx");
  await emit(page, "tool-voice-record", true);
  await page.waitForTimeout(400);
  await emit(page, "tool-voice-record", false);
  await page.waitForTimeout(400);

  // No take was captured — and the kid is TOLD something, in kid words, rather
  // than being left holding a mic that does nothing.
  const p = await project(page);
  expect(
    (Object.values(p.clips) as any[]).some((c) => c.source?.kind === "recording"),
    "a denied mic must not fabricate a recording",
  ).toBe(false);
  const s = await scene(page);
  expect(s.status.voice, "the kid must be told, and pointed somewhere else").toMatch(/no mic/i);
  expect(s.tool, "the tool panel must stay open, not collapse").toBe("record-voicefx");

  // The recorder must not be latched: a second hold behaves the same, rather
  // than the phase ref sticking in "opening" and swallowing every later press.
  await emit(page, "tool-voice-record", true);
  await page.waitForTimeout(300);
  await emit(page, "tool-voice-record", false);
  await page.waitForTimeout(300);
  expect((await scene(page)).status.voice).toMatch(/no mic/i);

  // Voice Keys is the same hold-to-record machinery on a different tool.
  await emit(page, "workshop-open-tool", "record-voicefx"); // close
  await emit(page, "workshop-open-tool", "voice-keys");
  await emit(page, "tool-keys-record", true);
  await page.waitForTimeout(400);
  await emit(page, "tool-keys-record", false);
  await page.waitForTimeout(400);
  expect((await scene(page)).status.keys).toMatch(/no mic/i);

  // …and now the part that actually matters: EVERYTHING ELSE still works.
  await emit(page, "workshop-open-tool", "voice-keys"); // close
  await emit(page, "workshop-add-melody", "guitar");
  await expect
    .poll(async () => {
      const proj = await project(page);
      const part = proj.parts.find((x: any) => x.id === proj.activePartId) ?? proj.parts[0];
      return part.layers.length;
    })
    .toBeGreaterThan(0);

  await emit(page, "transport-play", "loop");
  await page.waitForTimeout(600);
  await emit(page, "transport-stop");

  await emit(page, "nav-yard");
  await waitForScene(page, "YardScene");
  await expect.poll(async () => (await project(page)).activeView).toBe("yard");

  // A rejected getUserMedia must not have surfaced as an unhandled error. Kid-
  // safe copy is worthless if the page threw on the way to showing it.
  expect(crashes, `page errors after a denied mic: ${crashes.join(" | ")}`).toEqual([]);
});
