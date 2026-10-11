import { expect, test, type Page } from "@playwright/test";

// My Voice, as Eric asked for it (2026-10-05): "make the recording, then be
// able to toggle on or off the effects, each toggle press plays it once so you
// can hear what the effect does … fine if you can only pick one or two", and
// no separate MAKE A BEAT / MAKE NOTES treatment — one way into the car.
//
// Drives the scene's own events and reads the panel's drawn state, so it
// checks what the kid sees (the switch looks ON) and what the song holds.
// Needs a decodable recording, which CI runners' fake capture does not give
// (see v2-flow's mic block), so it is a local proof like that one.

function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  return page.evaluate(
    ([ev, a]) => void (window as any).__ibeetkidz_test__.emit(ev, ...(a as unknown[])),
    [event, args] as const,
  );
}

test("effects are on/off switches, two at most, and the take goes in the car one way", async ({ page }) => {
  test.skip(!!(globalThis as any).process?.env?.CI, "needs a decodable fake-mic take — run locally");
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__?.engineStarted());
  await page.evaluate(() => (window as any).__ibeetkidz_test__.dispatch({ type: "setActiveView", view: "workshop" }));
  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "WorkshopScene",
  );
  await emit(page, "workshop-open-tool", "record-voicefx");
  await emit(page, "tool-voice-record", true);
  await page.waitForTimeout(1200);
  await emit(page, "tool-voice-record", false);

  const take = () => page.evaluate(() => {
    const p = (window as any).__ibeetkidz_test__.getProject();
    return (Object.values(p.clips) as any[]).find((c) => c.source?.kind === "recording") ?? null;
  });
  await expect.poll(async () => (await take()) !== null, { timeout: 15_000 }).toBe(true);
  const effects = async () => ((await take())?.effects ?? []).map((e: any) => e.id);
  const shownOn = () => page.evaluate(() =>
    (window as any).__ibeetkidz_test__.getScene().toolPanels["record-voicefx"].effectsShownOn);

  // Only one way in: no MAKE NOTES.
  const labels: string[] = await page.evaluate(() => {
    const panel = (window as any).__ibeetkidz_test__.getScene().toolPanels["record-voicefx"];
    return [panel.playBtn.label.text, panel.sendBtn.label.text];
  });
  expect(labels.join(" ")).not.toMatch(/NOTES|BEAT/);

  await emit(page, "tool-voice-fx", "robot");
  await expect.poll(effects).toEqual(["robot"]);
  await expect.poll(shownOn).toEqual(["robot"]);

  // The same switch turns it back off.
  await emit(page, "tool-voice-fx", "robot");
  await expect.poll(effects).toEqual([]);
  await expect.poll(shownOn).toEqual([]);

  // Two at most: a third pushes the oldest off, and its switch goes dark.
  await emit(page, "tool-voice-fx", "pitchUp");
  await emit(page, "tool-voice-fx", "pitchDown");
  await emit(page, "tool-voice-fx", "echo");
  await expect.poll(effects).toEqual(["pitchDown", "echo"]);
  await expect.poll(async () => [...(await shownOn())].sort()).toEqual(["echo", "pitchDown"]);

  // PUT IN CAR: one drum-kind lane that plays the take as itself.
  const clipId = (await take()).id;
  await emit(page, "tool-voice-send");
  const lane = await page.evaluate((id) => {
    const p = (window as any).__ibeetkidz_test__.getProject();
    const part = p.parts.find((x: any) => x.id === p.activePartId);
    return part.layers.find((l: any) => l.clipId === id) ?? null;
  }, clipId);
  expect(lane?.kind).toBe("drum");
});
