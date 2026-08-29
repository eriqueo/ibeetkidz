import { expect, test, type Page } from "@playwright/test";

/**
 * Local audio-profiler regression for the original five-lane skipping report.
 * It is opt-in because shared CI runners do not reliably pump WebAudio. Run:
 *
 *   PW_AUDIO_STRESS=1 PW_HEADED=1 npx playwright test tests/e2e/audio-stress.spec.ts
 *
 * Unlike the normal smoke test, this keeps a dense, cold-effect composition
 * running across several bars and measures each bar independently.
 */
const env = (globalThis as any).process?.env ?? {};

test.skip(
  !env.PW_AUDIO_STRESS || !!env.CI,
  "local hardware-audio profile — set PW_AUDIO_STRESS=1 outside CI",
);

interface AudioSample {
  bar: number;
  peak: number;
  events: number;
  late: number;
  late20: number;
  worstMs: number;
  lookAheadSec: number;
}

async function boot(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForFunction(() => !!(window as any).__ibeetkidz_test__);
}

test("five cold effected lanes stay audible without sustained scheduler misses", async ({ page }) => {
  test.setTimeout(45_000);
  await boot(page);

  await page.evaluate(() => {
    const bridge = (window as any).__ibeetkidz_test__;
    bridge.dispatch({ type: "setActiveView", view: "workshop" });
    bridge.dispatch({ type: "setTempo", bpm: 200 });

    const sounds = ["kick", "snare", "hihat", "tom", "cowbell"];
    for (const [laneIndex, assetId] of sounds.entries()) {
      const clipId = `stress-clip-${laneIndex}`;
      const layerId = `stress-layer-${laneIndex}`;
      bridge.dispatch({
        type: "addClip",
        clip: {
          id: clipId,
          source: { kind: "builtin", assetId },
          effects: [{ id: laneIndex % 2 === 0 ? "echo" : "reverb", amount: 0.45 }],
          color: "#ffffff",
          label: `Stress ${laneIndex + 1}`,
        },
      });
      bridge.dispatch({
        type: "addLayer",
        layer: {
          id: layerId,
          clipId,
          volume: 0.65,
          muted: false,
          kind: "drum",
          steps: Array.from({ length: 16 }, () => ({ row: 0, length: 1 })),
          notes: [],
          wave: "triangle",
          echo: 0.25,
          tone: 0.8,
        },
      });
    }
  });

  await page.waitForFunction(
    () => (window as any).__ibeetkidz_test__?.getScene()?.scene?.key === "WorkshopScene",
  );
  const before = await page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag());
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("transport-play", "loop"));
  await expect
    .poll(() => page.evaluate(() => (window as any).__ibeetkidz_test__.audioDiag().transportState), {
      timeout: 20_000,
      message: "cold effect preparation never committed the transport",
    })
    .toBe("started");

  const samples = await page.evaluate(async (): Promise<AudioSample[]> => {
    const bridge = (window as any).__ibeetkidz_test__;
    const out: AudioSample[] = [];
    const firstBar = bridge.transportBar();
    while (bridge.transportBar() < firstBar + 4) {
      const diag = bridge.audioDiag();
      out.push({
        bar: bridge.transportBar(),
        peak: diag.masterPeak,
        events: diag.schedEvents,
        late: diag.schedLate,
        late20: diag.schedLate20,
        worstMs: diag.schedWorstLateMs,
        lookAheadSec: diag.lookAheadSec,
      });
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return out;
  });

  const bars = new Map<number, AudioSample[]>();
  for (const sample of samples) {
    if (sample.bar < 0) continue;
    const bucket = bars.get(sample.bar) ?? [];
    bucket.push(sample);
    bars.set(sample.bar, bucket);
  }
  expect(bars.size, "profile did not span four transport bars").toBeGreaterThanOrEqual(4);
  for (const [bar, bucket] of [...bars].slice(0, 4)) {
    expect(Math.max(...bucket.map((sample) => sample.peak)), `bar ${bar} was silent`).toBeGreaterThan(0.01);
  }

  const after = samples.at(-1)!;
  const firstAudibleMiss = samples.find((sample) => sample.late20 > before.schedLate20);
  const firstBar = Math.min(...bars.keys());
  const warmupLate20 = Math.max(...bars.get(firstBar)!.map((sample) => sample.late20));
  await test.info().attach("audio-stress-profile.json", {
    body: JSON.stringify({ before, after, samples }, null, 2),
    contentType: "application/json",
  });
  expect(after.events - before.schedEvents, "too few scheduled hits reached the transport").toBeGreaterThanOrEqual(240);
  // Chromium can report one cold-start miss per lane while its headless audio
  // graph warms. That did not correlate with a silent bar in three measured
  // runs. The historical failure was sustained skipping, so pin the stronger
  // signal: misses may not continue after the first transport bar.
  expect(warmupLate20 - before.schedLate20, "more than one warmup miss per lane").toBeLessThanOrEqual(5);
  expect(
    after.late20 - warmupLate20,
    `scheduler misses continued after warmup; first=${JSON.stringify(firstAudibleMiss)} final=${JSON.stringify(after)}`,
  ).toBe(0);
  await page.evaluate(() => (window as any).__ibeetkidz_test__.emit("transport-stop"));
});
