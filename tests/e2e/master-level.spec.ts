import { expect, test } from "@playwright/test";

// The whole mix must fit the speakers. Every lane is levelled on its own, but
// their SUM was unbounded: a busy car reached 1.87× full scale, and an output
// device flattens whatever passes 1.0. Eric's own export (2026-10-05) had 1.8%
// of its samples pinned at full scale, heard as notes breaking up on loud hits.
//
// This reads the song as the speakers get it (`renderSongWav` taps the
// destination's output), on a car built to be too loud: five lanes at full
// volume. No counter in `audioDiag` can see this; only the samples can.

test("a car louder than the speakers is rounded off, never flattened", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  await page.goto("/");
  const start = page.getByRole("button", { name: /tap to start/i });
  await expect(start).toBeVisible();
  await start.click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__?.engineStarted());
  // The fixture is exactly five loud lanes; START EMPTY removes the starter
  // beat a new song opens with (card C5) so the car has room and no extras.
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("starter-clear"));

  const bytes: number[] = await page.evaluate(async () => {
    const t = (window as any).__ibeetkidz_test__;
    t.dispatch({ type: "setTempo", bpm: 100 });
    const builtin = (id: string, assetId: string) => t.dispatch({
      type: "addClip",
      clip: { id, source: { kind: "builtin", assetId }, effects: [], color: "#fff", label: assetId },
    });
    builtin("ml-kick", "kick");
    builtin("ml-snare", "snare");
    const lane = (id: string, extra: object) => ({
      id, clipId: "ml-kick", volume: 0.75, muted: false, kind: "melody", steps: [], notes: [],
      wave: "triangle", echo: 0, tone: 1, ...extra,
    });
    const every = (n: number, at = 0) =>
      Array.from({ length: 16 }, (_, i) => (i % n === at ? { row: 0, length: 1 } : null));
    t.dispatch({ type: "addLayer", layer: lane("ml-k", { kind: "drum", steps: every(4) }) });
    t.dispatch({ type: "addLayer", layer: lane("ml-s", { kind: "drum", clipId: "ml-snare", steps: every(4) }) });
    t.dispatch({ type: "addLayer", layer: lane("ml-chords", {
      instrument: "piano",
      notes: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? [0, 2, 4].map((row) => ({ row, length: 2 })) : [])),
    }) });
    t.dispatch({ type: "addLayer", layer: lane("ml-organ", {
      instrument: "organ",
      notes: Array.from({ length: 16 }, (_, i) => (i % 8 === 0 ? [{ row: 0, length: 8 }, { row: 4, length: 8 }] : [])),
    }) });
    t.dispatch({ type: "addLayer", layer: lane("ml-lead", {
      instrument: "sharp",
      notes: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? [{ row: 7, length: 3 }] : [])),
    }) });
    return t.renderSongWav();
  });

  // 16-bit PCM; walk the chunks to `data` rather than trusting a fixed offset.
  const wav = new DataView(Uint8Array.from(bytes).buffer);
  const DATA = 0x64617461; // "data"
  let off = 12;
  while (wav.getUint32(off, false) !== DATA) off += 8 + wav.getUint32(off + 4, true);
  const end = off + 8 + wav.getUint32(off + 4, true);
  let pinned = 0;
  let peak = 0;
  let total = 0;
  for (let i = off + 8; i + 1 < end; i += 2) {
    const v = Math.abs(wav.getInt16(i, true));
    if (v >= 32767) pinned++;
    if (v > peak) peak = v;
    total++;
  }
  // Loud enough that the limiter is doing work: its curve is transparent
  // below 0.7 of full scale, so a quiet take would pass this with no limiter.
  expect(peak / 32768, "the fixture must be loud enough to need the limiter").toBeGreaterThan(0.85);
  expect(pinned, `${pinned} of ${total} samples sit at full scale`).toBe(0);
});
