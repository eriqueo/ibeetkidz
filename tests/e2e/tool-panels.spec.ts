import { expect, test, type Page } from "@playwright/test";

// Deep coverage of the Workshop's satellite tool panels (W5-04 in the backlog —
// "rebuilding deep per-tool e2e through the Workshop tool-panel nav" has been a
// named follow-up since the v1 machine-shell specs were retired).
//
// Until now the only assertion on any panel was `activeToolId` — i.e. that it
// OPENS. Eight instrument characters were wired two sessions ago and several of
// their panels have never had their actual work exercised by anything.
//
// The split here is deliberate and is the same rule the rest of the suite uses:
// a flow with a STATE outcome is asserted on the live Project and runs
// everywhere; a flow whose only outcome is sound needs real capture and is
// gated to local runs, like `audio-output.spec.ts`.

async function boot(page: Page): Promise<string[]> {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
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

const getProject = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getProject());
const activeTool = (page: Page) =>
  page.evaluate(() => (window as any).__ibeetkidz_test__.getScene().activeToolId as string | null);

/** The layers of the car the kid is working on. */
async function layers(page: Page): Promise<any[]> {
  const p = await getProject(page);
  const part = p.parts.find((x: any) => x.id === p.activePartId) ?? p.parts[0];
  return part.layers;
}

async function openWorkshop(page: Page): Promise<string[]> {
  const crashes = await boot(page);
  await waitForScene(page, "MapScene");
  await emit(page, "map-nav", "workshop");
  await waitForScene(page, "WorkshopScene");
  return crashes;
}

test("Beat Maker: tapping a step creates that drum's lane and lands the note", async ({ page }) => {
  const crashes = await openWorkshop(page);
  await emit(page, "workshop-open-tool", "beat-grid");
  await expect.poll(() => activeTool(page)).toBe("beat-grid");

  // First tap on a drum that has no lane yet must CREATE the lane (clip + layer)
  // and set the step — not silently do half of it.
  await emit(page, "tool-beat-toggle", "kick", 0);
  await expect.poll(async () => (await layers(page)).some((l) => l.id === "beat-kick")).toBe(true);
  let kick = (await layers(page)).find((l) => l.id === "beat-kick");
  expect(kick.steps[0], "the tap that made the lane must also land its note").not.toBeNull();

  // A second drum gets its OWN lane rather than joining the first.
  await emit(page, "tool-beat-toggle", "snare", 4);
  await expect.poll(async () => (await layers(page)).some((l) => l.id === "beat-snare")).toBe(true);
  expect((await layers(page)).find((l) => l.id === "beat-snare").steps[4]).not.toBeNull();

  // Toggling the same cell again clears it, and does NOT delete the lane —
  // an emptied drum row the kid is still editing must stay on the board.
  await emit(page, "tool-beat-toggle", "kick", 0);
  kick = (await layers(page)).find((l) => l.id === "beat-kick");
  expect(kick, "clearing the last step must not remove the lane").toBeDefined();
  expect(kick.steps[0]).toBeNull();

  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("Melody Editor: notes, the ×2 roll, and the deck knobs all reach the lane", async ({ page }) => {
  const crashes = await openWorkshop(page);

  // Guitar seeds a starter melody and opens the editor on it.
  await emit(page, "workshop-add-melody", "guitar");
  await expect.poll(() => activeTool(page)).toBe("melody-editor");
  const melody = (await layers(page)).find((l: any) => l.kind === "melody");
  expect(melody, "the guitar character must make a melody lane").toBeDefined();

  const noteAt = async (step: number, row: number): Promise<any> => {
    const l = (await layers(page)).find((x: any) => x.id === melody.id);
    return l.notes[step]?.find((n: any) => n.row === row);
  };

  // A fresh cell the starter melody did not use.
  expect(await noteAt(2, 5), "picking an empty cell to test with").toBeUndefined();
  await emit(page, "tool-melody-toggle", 2, 5);
  await expect.poll(async () => !!(await noteAt(2, 5))).toBe(true);

  // ×2 sets the double-beat roll on an EXISTING note…
  await emit(page, "tool-melody-double", 2, 5);
  await expect.poll(async () => (await noteAt(2, 5))?.roll).toBe(2);
  // …and toggles back off, KEEPING the note. Note the canonical form: clearing
  // a roll drops the field rather than storing 1 (`setRoll` does
  // `roll === 1 ? undefined : roll`), so an absent `roll` means one hit. This
  // test asserted `roll === 1` first and read the resulting `undefined` as a
  // deleted note — the model was right and the assertion was wrong.
  await emit(page, "tool-melody-double", 2, 5);
  await expect
    .poll(async () => {
      const n = await noteAt(2, 5);
      return n ? (n.roll ?? 1) : null;
    }, { message: "toggling ×2 off must leave the note, not remove it" })
    .toBe(1);

  // The deck writes onto the lane being edited, not onto the song.
  await emit(page, "tool-lane-wobble", 0.7);
  await emit(page, "tool-lane-crunch", 0.4);
  await emit(page, "tool-lane-volume", 0.5);
  await expect
    .poll(async () => {
      const l = (await layers(page)).find((x: any) => x.id === melody.id);
      return [l.wobble, l.crunch, l.volume];
    })
    .toEqual([0.7, 0.4, 0.5]);

  // Removing the note again leaves the lane in place.
  await emit(page, "tool-melody-toggle", 2, 5);
  await expect.poll(async () => !!(await noteAt(2, 5))).toBe(false);
  expect((await layers(page)).some((l: any) => l.id === melody.id)).toBe(true);

  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("every instrument character's panel opens and closes cleanly", async ({ page }) => {
  // The eight characters were wired two sessions ago; this walks all of the
  // tool-opening ones in sequence, which is the state machine most likely to
  // strand a panel open behind another.
  const crashes = await openWorkshop(page);
  for (const tool of ["beat-grid", "record-voicefx", "voice-keys", "sound-pads", "theremin-xy"]) {
    await emit(page, "workshop-open-tool", tool);
    await expect.poll(() => activeTool(page), { message: `${tool} did not open` }).toBe(tool);
  }
  // Whatever is open closes on the shared `tool-closed` signal.
  await emit(page, "tool-closed");
  await expect.poll(() => activeTool(page)).toBeNull();
  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("Sound Pads and the Magic Pad reach the speakers", async ({ page }) => {
  // Local-only, like `audio-output.spec.ts`: a pad tap has NO state outcome —
  // its entire job is to make a noise — so the only honest assertion is that
  // samples reached the master output, and that needs a real audio pipeline.
  test.skip(!!(globalThis as any).process?.env?.CI, "hardware-audio proof — run locally");
  const crashes = await openWorkshop(page);
  const peak = () =>
    page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag().masterPeak as number);

  await emit(page, "workshop-open-tool", "sound-pads");
  await expect.poll(() => activeTool(page)).toBe("sound-pads");
  const drum = await page.evaluate(() => {
    const p = (window as any).__ibeetkidz_test__.getProject();
    return p ? "builtin:kick" : "";
  });
  await emit(page, "tool-pads-play", drum);
  await expect
    .poll(peak, { timeout: 5000, message: "a pad tap must actually make a sound" })
    .toBeGreaterThan(0);

  // Magic Pad: dragging voices a live theremin.
  await emit(page, "workshop-open-tool", "sound-pads"); // close
  await emit(page, "workshop-open-tool", "theremin-xy");
  await emit(page, "tool-magic-pointer", "down", 0.5, 0.5);
  await emit(page, "tool-magic-pointer", "move", 0.7, 0.3);
  await expect
    .poll(peak, { timeout: 5000, message: "dragging the Magic Pad must sound" })
    .toBeGreaterThan(0);
  await emit(page, "tool-magic-pointer", "up", 0.7, 0.3);

  expect(crashes, crashes.join(" | ")).toEqual([]);
});
