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
  // …and a second ×2 on an ALREADY-DOUBLED note takes it away, so the cell
  // cycles empty → single → doubled → empty.
  //
  // This assertion used to say the opposite ("toggling ×2 off must leave the
  // note"), and that is the bug Eric reported as "i can't unclick a note in the
  // guitar": while the lever is armed, a tap on a note routes here instead of to
  // the toggle, so single ⇄ doubled was the WHOLE cycle and the note could not
  // be removed at all. The switch's plaque reads OFF in the art whichever way it
  // is thrown (AR-026), so there was no way to see you were in that mode either.
  await emit(page, "tool-melody-double", 2, 5);
  await expect
    .poll(async () => (await noteAt(2, 5)) ?? null, {
      message: "×2 on a doubled note must remove it — a note is never stuck",
    })
    .toBeNull();
  // Put it back for the rest of the test.
  await emit(page, "tool-melody-toggle", 2, 5);
  await expect.poll(async () => !!(await noteAt(2, 5))).toBe(true);

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

test("Sound Pads: a pad tap puts that sound in the car, as ONE undo step", async ({ page }) => {
  // This test exists because the pads used to have no state outcome at all:
  // `onPadsPlay` called `sound.play` and dispatched nothing, which made Sound
  // Pads the only Workshop instrument whose panel could not put anything in the
  // car — so nothing a kid tapped in here ever looped, or survived the panel
  // closing. Runs everywhere: the outcome is Project state, not sound.
  const crashes = await openWorkshop(page);
  await emit(page, "workshop-open-tool", "sound-pads");
  await expect.poll(() => activeTool(page)).toBe("sound-pads");

  const laneIds = async (): Promise<string[]> => (await layers(page)).map((l) => l.id);

  // A built-in drum lands on the BEAT MAKER's lane id on purpose: the two tools
  // are two doors into one lane per drum, not two lanes playing the same drum.
  await emit(page, "tool-pads-play", "builtin:kick");
  await expect.poll(laneIds).toEqual(["beat-kick"]);
  const kick = (await layers(page)).find((l) => l.id === "beat-kick");
  expect(kick.steps[0], "the sound must land ON the first step, i.e. it LOOPS").not.toBeNull();

  // Tapping it again auditions; it must not stack a second copy of the lane.
  await emit(page, "tool-pads-play", "builtin:kick");
  await page.waitForTimeout(150);
  expect(await laneIds()).toEqual(["beat-kick"]);

  // A pitched blip is a different sound, so it gets its own lane.
  await emit(page, "tool-pads-play", "builtin:note-do");
  await expect.poll(laneIds).toEqual(["beat-kick", "pad-note-do"]);

  // ONE undo takes back the WHOLE sound — the clip and the lane are two
  // commands but one thing the kid did, so they are one history entry.
  //
  // The lane alone does NOT prove that: dispatched separately, one undo pops the
  // `addLayer` and the lane disappears exactly the same way. What tells a
  // one-step batch from a two-step pair is whether the CLIP went with it, so
  // that is the assertion that carries this test. (Revert `landSound` to two
  // `dispatch` calls and only this line fails.)
  await emit(page, "undo-requested");
  await expect
    .poll(laneIds, { message: "undo must take the lane back" })
    .toEqual(["beat-kick"]);
  const clips = await page.evaluate(() =>
    Object.keys((window as any).__ibeetkidz_test__.getProject().clips));
  expect(clips, "one undo must take back the clip too, not leave it orphaned").not.toContain("pad-note-do");
  expect(clips, "and must not reach back past what the kid just did").toContain("beat-kick");

  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("Sound Pads: refuses to add a lane the chalkboard cannot show", async ({ page }) => {
  // `addLayer` used to accept MAX_LAYERS (8) and silently evict the OLDEST lane
  // past that, while the Workshop grid drew only 6 — so an unguarded pad panel
  // let a kid tap away, see nothing happen, and lose their first lane to make
  // room for one they could not see. Both numbers are now one producer
  // (`MAX_LAYERS` = 6, which `WORKSHOP_GRID_V2.maxLanes` derives from) and the
  // reducer REFUSES rather than evicting. This panel still checks the cap
  // itself, not to enforce it — the reducer does that for all ten `addLayer`
  // call sites — but so the kid is TOLD the car is full before they tap.
  const crashes = await openWorkshop(page);
  await emit(page, "workshop-open-tool", "sound-pads");
  await expect.poll(() => activeTool(page)).toBe("sound-pads");

  for (const id of ["kick", "snare", "hihat", "clap", "tom", "cowbell", "openhat", "rim"]) {
    await emit(page, "tool-pads-play", `builtin:${id}`);
    await page.waitForTimeout(80);
  }
  const ls = await layers(page);
  expect(ls.length, "stops at the number of lanes the board can show").toBe(6);
  // The FIRST lane is still there — nothing was silently evicted.
  expect(ls[0].id).toBe("beat-kick");

  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("Sound Pads and the Magic Pad reach the speakers", async ({ page }) => {
  // Local-only, like `audio-output.spec.ts`. The pads' STATE outcome is covered
  // by the two tests above and runs everywhere; what is left here is the half
  // that is only ever audible — that the sample and the theremin actually reach
  // the master output — and that needs a real audio pipeline.
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

// ── The Melody Editor's control deck, asserted on real scene geometry ─────────
//
// Every assertion above this line is on the PROJECT. These three are on what is
// actually drawn, because all three bugs they pin were invisible to a state
// assertion: a lever that dispatched correctly but never moved, a fader whose
// value never showed, and a panel that was simply too small. Reading the panel's
// private members through `any` is deliberate — a geometry test that cannot see
// geometry is the reason "the existing suite is weak exactly there".

/** The open Melody Editor's live scene objects. */
const melodyPanel = (page: Page) =>
  page.evaluate(() => {
    const s: any = (window as any).__ibeetkidz_test__.getScene();
    const p: any = s.toolPanels["melody-editor"];
    const def = { x0: 0.03, y0: 0.023, x1: 0.969, y1: 0.973 }; // panel-editor content box
    const artW = p.panelImg.displayWidth * (def.x1 - def.x0);
    const artH = p.panelImg.displayHeight * (def.y1 - def.y0);
    return {
      game: { w: s.scale.gameSize.width, h: s.scale.gameSize.height },
      art: { w: artW, h: artH, top: p.panelImg.y - artH / 2, bottom: p.panelImg.y + artH / 2 },
      // AR-026 delivered a real idle/on pair, so "the switch moved" is now the
      // frame being drawn — the mirrored-column ballY arithmetic retired with
      // the interim it measured.
      toggle: { x: p.toggle.x, y: p.toggle.y, scale: p.toggle.scaleX, frame: p.toggle.frame.name },
      levelFill: { h: p.levelFill.height, visible: p.levelFill.visible },
      splits: p.cellSplits.map((row: any[]) =>
        row.map((c) => (c.visible ? Number(c.alpha.toFixed(2)) : 0))),
    };
  });

/** Game-space (x, y) → a click on the canvas. The game runs a fixed 2560×1440
 *  design space under Scale.FIT, so this is one uniform factor plus the letterbox. */
async function tapGame(page: Page, x: number, y: number): Promise<void> {
  const m = await page.evaluate(() => {
    const c = document.querySelector("canvas")!.getBoundingClientRect();
    const g = (window as any).__ibeetkidz_test__.getScene().scale.gameSize;
    return { left: c.left, top: c.top, k: c.width / g.width };
  });
  await page.mouse.click(m.left + x * m.k, m.top + y * m.k);
}

test("Melody Editor: the ×2 lever visibly THROWS, and stays on the canvas", async ({ page }) => {
  const crashes = await openWorkshop(page);
  await emit(page, "workshop-add-melody", "guitar");
  await expect.poll(() => activeTool(page)).toBe("melody-editor");

  const off = await melodyPanel(page);
  // Sanity: the panel is laid out, and its title/✕ band above the art is still
  // on screen (growing the art into the whole region once pushed ✕ off the top).
  expect(off.art.top, "the header band above the art must stay on canvas").toBeGreaterThan(40);
  expect(off.art.bottom).toBeLessThan(off.game.h);
  // The switch rests on its real OFF art (lever down, "OFF" plaque) — AR-026's
  // frame pair replaced the mirrored-column interim this test used to measure.
  expect(off.toggle.frame, "the switch rests on its OFF frame").toBe("toggle-double-idle");

  await tapGame(page, off.toggle.x, off.toggle.y);
  await expect
    .poll(async () => (await melodyPanel(page)).toggle.frame, {
      message: "throwing ×2 must draw the ON art, not just tint the OFF frame",
    })
    .toBe("toggle-double-on");

  // …and back down again.
  await tapGame(page, off.toggle.x, off.toggle.y);
  await expect
    .poll(async () => (await melodyPanel(page)).toggle.frame)
    .toBe("toggle-double-idle");

  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("Melody Editor: ×2 and LEVEL show what they do", async ({ page }) => {
  const crashes = await openWorkshop(page);
  await emit(page, "workshop-add-melody", "guitar");
  await expect.poll(() => activeTool(page)).toBe("melody-editor");

  // The LEVEL fader draws how full it is. "LEVEL" is a word a four-year-old
  // cannot read; the column's height is a quantity they can.
  await emit(page, "tool-lane-volume", 1);
  const full = (await melodyPanel(page)).levelFill.h;
  await emit(page, "tool-lane-volume", 0.25);
  const quarter = (await melodyPanel(page)).levelFill.h;
  expect(full, "a full lane fills the track").toBeGreaterThan(10);
  expect(quarter, "a quiet lane shows a short column").toBeLessThan(full * 0.5);

  // ×2's cue is the note drawn as TWO blocks. Put a note down, arm the lever,
  // and the offer shows as a ghost slot; commit it and the slot goes solid.
  await emit(page, "tool-melody-toggle", 2, 5);
  const visualRow = 7 - 1 - 5; // rows draw high-degree-first
  const idle = await melodyPanel(page);
  expect(idle.splits[visualRow][2], "an un-armed single note shows no slot").toBe(0);

  const panel = await melodyPanel(page);
  await tapGame(page, panel.toggle.x, panel.toggle.y);
  await expect
    .poll(async () => (await melodyPanel(page)).splits[visualRow][2], {
      message: "arming ×2 must OFFER the split on every note that can take it",
    })
    .toBeGreaterThan(0);
  const ghost = (await melodyPanel(page)).splits[visualRow][2];
  expect(ghost, "the offer must stay fainter than the outcome").toBeLessThan(0.5);

  await emit(page, "tool-melody-double", 2, 5);
  await expect
    .poll(async () => (await melodyPanel(page)).splits[visualRow][2], {
      message: "a doubled note's slot goes solid — the block reads as two",
    })
    .toBe(1);

  expect(crashes, crashes.join(" | ")).toEqual([]);
});

test("Melody Editor: the panel fills the canvas it was given", async ({ page }) => {
  // It used to contain-fit into a region 0.70 of the canvas high — a portrait
  // panel bound by its shortest axis, so it used about two-thirds of the space
  // available. Eric: "i also think the whole thing should be a little bigger".
  // The game runs ONE fixed 2560×1440 design space (Scale.FIT), so this holds
  // at every viewport and orientation; the browser letterboxes, not the layout.
  const crashes = await openWorkshop(page);
  await emit(page, "workshop-add-melody", "guitar");
  await expect.poll(() => activeTool(page)).toBe("melody-editor");

  for (const [w, h] of [[1280, 720], [430, 900]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await expect
      .poll(async () => {
        const p = await melodyPanel(page);
        return Math.round((p.art.h / p.game.h) * 100);
      }, { message: `panel too small at ${w}×${h}` })
      .toBeGreaterThan(80);
    const p = await melodyPanel(page);
    expect(p.art.top, "must not overflow the top").toBeGreaterThan(0);
    expect(p.art.bottom, "must not overflow the bottom").toBeLessThan(p.game.h);
  }

  expect(crashes, crashes.join(" | ")).toEqual([]);
});
