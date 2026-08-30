import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __ibkMicAudit?: {
      delayMs: number;
      streams: MediaStream[];
    };
  }
}

async function instrumentMic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const audit = { delayMs: 0, streams: [] as MediaStream[] };
    window.__ibkMicAudit = audit;
    navigator.mediaDevices.getUserMedia = async (...args) => {
      const delayMs = audit.delayMs;
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const stream = await original(...args);
      audit.streams.push(stream);
      return stream;
    };
  });
}

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

async function go(page: Page, view: string, scene: string): Promise<void> {
  await page.evaluate(
    (nextView) => void (window as any).__ibeetkidz_test__.dispatch({
      type: "setActiveView",
      view: nextView,
    }),
    view,
  );
  await page.waitForFunction(
    (sceneKey) => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === sceneKey,
    scene,
  );
}

const recordingClipCount = (page: Page): Promise<number> =>
  page.evaluate(() => Object.values((window as any).__ibeetkidz_test__.getProject().clips)
    .filter((clip: any) => clip.source?.kind === "recording").length);

const trackState = (page: Page, index: number): Promise<MediaStreamTrackState | null> =>
  page.evaluate(
    (streamIndex) => window.__ibkMicAudit?.streams[streamIndex]?.getAudioTracks()[0]?.readyState ?? null,
    index,
  );

test("leaving Workshop cancels opening and live microphone takes", async ({ page }) => {
  await instrumentMic(page);
  await boot(page);
  await go(page, "workshop", "WorkshopScene");

  // Navigate while permission/hardware startup is still pending. A stream that
  // resolves after Workshop has unmounted belongs to the abandoned take and
  // must be stopped before any recorder is allowed to survive.
  await page.evaluate(() => {
    window.__ibkMicAudit!.delayMs = 500;
    (window as any).__ibeetkidz_test__.emit("tool-voice-record", true);
    (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "map" });
  });
  await page.waitForFunction(() => window.__ibkMicAudit?.streams.length === 1);
  await expect.poll(() => trackState(page, 0)).toBe("ended");
  expect(await recordingClipCount(page)).toBe(0);

  // Cancellation is not a poisoned recorder state: a later take can open, and
  // navigating away from that live take releases the browser's physical track.
  await go(page, "workshop", "WorkshopScene");
  await page.evaluate(() => {
    window.__ibkMicAudit!.delayMs = 0;
    (window as any).__ibeetkidz_test__.emit("tool-voice-record", true);
  });
  await page.waitForFunction(() => window.__ibkMicAudit?.streams.length === 2);
  await expect.poll(() => trackState(page, 1)).toBe("live");
  await go(page, "map", "MapScene");
  await expect.poll(() => trackState(page, 1)).toBe("ended");
  expect(await recordingClipCount(page)).toBe(0);
});
