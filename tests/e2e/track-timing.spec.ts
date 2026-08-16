import { expect, test, type Page } from "@playwright/test";

// The Track view's two hard promises (PROJECT_CHARTER.md §2.5, CLAUDE.md):
//
//  1. **The train is a TRAIN.** Every vehicle is coupled to the one in front by
//     half of each of their on-screen lengths — an arc length over the path
//     length. Spacing is a function of how long a car IS, never of how many
//     bars the song has.
//  2. **Which bar is sounding is shown, and it is read FROM the transport.**
//     The visual is derived from `progress`; it may lag the audio, never lead
//     it.
//
// Promise 1 shipped broken twice, in opposite directions. First bumper-to-bumper
// coupling with no bar readout at all; then `i / carCount` of the WHOLE LAP,
// which made position the readout but put a four-bar song's cars a quarter-lap
// apart — four wagons that had lost each other, and the #1 complaint on the
// screenshot. Position cannot be both the coupling and the clock readout, so the
// readout moved to an explicit HIGHLIGHT (a lamp under the sounding car plus a
// bounce on the bar change) and the coupling went back to real geometry.
//
// Neither test needs audible output (the first does not even need the
// transport), so both run in CI as well as locally.

async function boot(page: Page): Promise<void> {
  page.on("pageerror", (e) => console.log("[page-crash]", e.message));
  // `?oval`: every assertion below is about RING geometry — cars coupled a
  // car-length apart rather than a lap-fraction apart, vehicles standing on
  // the painted oval, a highlight walking a closed loop. The side-scroller
  // has no lap at all, so these cannot be retargeted at it; the equivalent
  // motion proofs for the default Track live in track-v3.spec.ts.
  await page.goto("/?oval");
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

test("the cars ride coupled, a car-length apart and not a lap-fraction apart", async ({ page }) => {
  const CARS = 4;
  await trainOf(page, CARS);

  // Drive the scene's own progress input — the same 0..1 lap position React
  // feeds it from the transport — and read where the vehicles actually landed.
  const shots = await page.evaluate(async (probes: number[]) => {
    const s: any = (window as any).__ibeetkidz_test__.getScene();
    const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
    // Parked: no bounce inflating anyone's width while we measure geometry.
    s.setMoving(false);
    const widthOf = (tok: any): number => tok.getData("body").width * tok.scaleX;
    const out: any[] = [];
    for (const t of probes) {
      s.setProgress(t);
      await frame();
      await frame();
      const sig = s.path.getPoint(0.25); // parkAngle — the crossing signal
      out.push({
        t,
        lap: s.path.getLength(),
        loco: { x: s.loco.x, y: s.loco.y, w: widthOf(s.loco) },
        cars: s.carTokens.map((c: any) => ({ x: c.x, y: c.y, w: widthOf(c) })),
        signalOffset: s.carTokens.map((c: any) => ({ dx: c.x - sig.x, dy: c.y - sig.y })),
      });
    }
    return out;
  }, [0, 0.13, 0.37, 0.62, 0.88]);

  const lap = shots[0]!.lap as number;
  expect(lap).toBeGreaterThan(1000);

  for (const shot of shots) {
    const cars = shot.cars as { x: number; y: number; w: number }[];
    const loco = shot.loco as { x: number; y: number; w: number };

    // Adjacent cars are coupled: centres sit half of each of their widths
    // apart. Measured as a straight line, so it reads slightly SHORT of the arc
    // through a curve — hence the asymmetric window. The point of the test is
    // the order of magnitude: ~a car, not ~a quarter of the oval.
    for (let i = 1; i < cars.length; i++) {
      const want = (cars[i - 1]!.w + cars[i]!.w) / 2;
      const got = Math.hypot(cars[i]!.x - cars[i - 1]!.x, cars[i]!.y - cars[i - 1]!.y);
      expect(want, "a car must have a real on-screen width").toBeGreaterThan(20);
      expect(got, `cars ${i - 1}→${i} at t=${shot.t} are uncoupled`).toBeLessThan(want * 1.1);
      expect(got, `cars ${i - 1}→${i} at t=${shot.t} are stacked`).toBeGreaterThan(want * 0.75);
      // The bug this replaced, stated directly: spacing must NOT be a fraction
      // of the lap. At 4 cars that was lap/4.
      expect(got, `cars ${i - 1}→${i} are still spaced by lap/n`).toBeLessThan(lap / CARS / 2);
    }

    // The loco couples onto car 0 by the same rule, and leads it.
    const locoGap = Math.hypot(loco.x - cars[0]!.x, loco.y - cars[0]!.y);
    const wantLoco = (loco.w + cars[0]!.w) / 2;
    expect(locoGap).toBeLessThan(wantLoco * 1.1);
    expect(locoGap).toBeGreaterThan(wantLoco * 0.75);

    // …and the whole consist is one object on the oval, not a scattering.
    const span = cars.reduce(
      (max, c) => Math.max(max, Math.hypot(c.x - loco.x, c.y - loco.y)),
      0,
    );
    // A loco plus four cars is ~26% of this oval, measured — it was ~21% when
    // vehicles were drawn at a flat 1.5×/2.2×, and they are bigger now that the
    // near half of the loop is drawn at the size the painted rails ask for.
    // Under the model this replaced, the same consist spanned three quarters of
    // the oval, which is the thing this number is here to prevent.
    expect(span, `the train is spread over the oval at t=${shot.t}`).toBeLessThan(lap * 0.3);
  }

  // Car 0 is still the phase reference: at progress 0 it is parked ON the
  // crossing signal, which is what keeps the ride phase-locked to bar 0. Along
  // the track that is exact (both sides come from the same `getPoint`); across
  // it the vehicle is drawn a half-gauge lower than the traced centreline,
  // because the art shows the near-side wheels and those stand on the near rail.
  const park = shots[0]!.signalOffset[0] as { dx: number; dy: number };
  expect(Math.abs(park.dx), "car 0 must be parked on the signal at bar 0").toBeLessThan(4);
  expect(park.dy, "car 0 must sit ON the rail, not above the track").toBeGreaterThan(0);
  expect(park.dy, "car 0 has sunk below the track").toBeLessThan(45);
});

test("the highlight names the sounding car, and it lands on that car", async ({ page }) => {
  const CARS = 4;
  await trainOf(page, CARS);

  const runs = await page.evaluate(async (n) => {
    const s: any = (window as any).__ibeetkidz_test__.getScene();
    const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
    // Parked. The highlight is the readout of "which bar is sounding" and must
    // not need the train to be rolling to be correct — and a parked train is
    // also the only way to read a position without the per-car sine bounce
    // moving it under the measurement.
    s.setMoving(false);
    const out: any[] = [];
    // Bar 0 LAST: the scene opens parked on bar 0, and the bounce fires on a
    // CHANGE of sounding car. Walking 1,2,…,0 makes every step a real change.
    const order = [...Array(n).keys()].slice(1).concat(0);
    for (const bar of order) {
      // Mid-bar, so nothing hangs on a boundary rounding either way.
      s.setProgress((bar + 0.5) / n);
      // The bounce decays over ~260 ms and a headless frame can be 100 ms, so
      // sample it across the window and keep the peak rather than betting the
      // assertion on which frame the read lands in.
      //
      // It is a HOP (a lift, in px) and no longer a scale pop: the plate's
      // perspective already owns every vehicle's size, so the beat could not
      // also be told with size without the two meanings colliding.
      const peak = s.carTokens.map(() => 0);
      for (let f = 0; f < 4; f++) {
        await frame();
        s.carTokens.forEach((c: any, i: number) => {
          peak[i] = Math.max(peak[i], (c.getData("hop") as number) ?? 0);
        });
      }
      const g = s.glow;
      out.push({
        bar,
        reported: s.rideHighlight,
        // Which car token the lamp is actually sitting on.
        lampDist: s.carTokens.map((c: any) => Math.hypot(c.x - g.x, c.y - g.y)),
        lampWidth: g.displayWidth,
        carWidth: s.carTokens.map((c: any) => c.getData("body").width * c.scaleX),
        // The bounce is per-car; only the sounding one should be hopping.
        hop: peak,
      });
    }
    return out;
  }, CARS);

  for (const run of runs) {
    const { bar, reported, lampDist, hop } = run as {
      bar: number;
      reported: { bar: number; visible: boolean };
      lampDist: number[];
      hop: number[];
    };
    expect(reported.bar, `the scene must report bar ${bar} as sounding`).toBe(bar);
    expect(reported.visible, `the lamp must be lit at bar ${bar}`).toBe(true);

    // The lamp is ON the sounding car — nearest to it by a clear margin, not
    // merely somewhere in the neighbourhood.
    const nearest = lampDist.indexOf(Math.min(...lampDist));
    expect(nearest, `the lamp is on car ${nearest}, not the sounding car ${bar}`).toBe(bar);
    expect(lampDist[bar], `the lamp is not sitting on car ${bar}`).toBeLessThan(
      run.carWidth[bar] * 0.5,
    );
    lampDist.forEach((d, i) => {
      if (i !== bar) expect(d, `the lamp is ambiguous between cars ${bar} and ${i}`)
        .toBeGreaterThan(run.carWidth[bar] * 0.5);
    });

    // The lamp is big enough to read as belonging to the car.
    expect(run.lampWidth).toBeGreaterThan(run.carWidth[bar] * 0.6);

    // The bounce fires on the sounding car and on nothing else.
    expect(hop[bar], `car ${bar} must bounce on its bar`).toBeGreaterThan(1);
    hop.forEach((p, i) => {
      if (i !== bar) expect(p, `car ${i} bounced on car ${bar}'s bar`).toBe(0);
    });
  }
});

// `design/GAME_FEEL.md` says it plainly: "a screenshot passes 1, 2, 3 and fails
// to test 4, 5, 6, 7 — review animation in motion or not at all". These two
// tests are that review, done by a machine. Neither needs audible output.
test("every vehicle stands on the rails, on whole pixels, at every size", async ({ page }) => {
  await trainOf(page, 4);

  const shots = await page.evaluate(async (probes: number[]) => {
    const s: any = (window as any).__ibeetkidz_test__.getScene();
    const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
    s.setMoving(false);
    const out: any[] = [];
    for (const t of probes) {
      s.setProgress(t);
      await frame();
      await frame();
      const veh = [s.loco, ...s.carTokens].map((v: any) => ({
        x: v.x, y: v.y, scale: v.scaleX, depth: v.depth,
      }));
      out.push({
        t,
        veh,
        shadows: s.shadows.map((sh: any) => ({
          x: sh.x, y: sh.y, scale: sh.scaleX, alpha: sh.alpha, depth: sh.depth,
          visible: sh.visible,
        })),
      });
    }
    return out;
  }, [0, 0.12, 0.25, 0.37, 0.5, 0.63, 0.75, 0.88]);

  const allScales: number[] = [];
  for (const shot of shots) {
    for (const [i, v] of shot.veh.entries()) {
      // Law 7 — sub-pixel positions make pixel art shimmer between frames.
      expect(Number.isInteger(v.x), `vehicle ${i} x=${v.x} at t=${shot.t} is off-pixel`).toBe(true);
      expect(Number.isInteger(v.y), `vehicle ${i} y=${v.y} at t=${shot.t} is off-pixel`).toBe(true);
      expect(v.scale, `vehicle ${i} has no size at t=${shot.t}`).toBeGreaterThan(0.2);
      allScales.push(v.scale);

      // Law 2 — every world object has a contact shadow, under it and on the
      // ground it is standing on (not carried up by the bob).
      const sh = shot.shadows[i];
      expect(sh, `vehicle ${i} has no contact shadow`).toBeDefined();
      expect(sh.depth, "a shadow must draw under its vehicle").toBeLessThan(v.depth);
      expect(sh.alpha).toBeGreaterThan(0.1);
      // The shadow is drawn at the vehicle's own size, tightening a little
      // while the vehicle is lifted off the rail by its bar-hop.
      expect(sh.scale).toBeLessThanOrEqual(v.scale + 1e-9);
      expect(sh.scale).toBeGreaterThan(v.scale * 0.85);
      expect(Math.hypot(sh.x - v.x, sh.y - v.y)).toBeLessThan(64 * v.scale);
    }
  }

  // The plate is drawn in perspective, so size has to track depth: the same car
  // is meaningfully smaller at the top of the oval than at the bottom. (This is
  // interim — AR-033 redraws the plate flat and this collapses to one size.)
  // progress 0 parks car 0 on the crossing signal at the BOTTOM of the oval;
  // half a lap later it is at the top. (`parkAngle` is 0.25, so progress and
  // path position differ by a quarter turn — hence not 0.25/0.75 here.)
  const near = shots.find((s) => s.t === 0)!.veh[1].scale;
  const far = shots.find((s) => s.t === 0.5)!.veh[1].scale;
  expect(near / far, "the train ignores the plate's perspective").toBeGreaterThan(2);
  expect(Math.min(...allScales)).toBeGreaterThan(0.3);
  expect(Math.max(...allScales)).toBeLessThan(3);
});

test("the train's life comes from movement, and stops when it does", async ({ page }) => {
  await trainOf(page, 4);

  const readings = await page.evaluate(async () => {
    const t = (window as any).__ibeetkidz_test__;
    const s: any = t.getScene();
    const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
    const sample = async (frames: number): Promise<any> => {
      let bob = 0;
      let smoke = 0;
      for (let i = 0; i < frames; i++) {
        await frame();
        bob = Math.max(bob, ...s.carTokens.map((c: any) => Math.abs(c.getData("bob") ?? 0)));
        smoke = Math.max(
          smoke,
          s.children.list.filter((o: any) => o.texture && o.texture.key === "smoke").length,
        );
      }
      return { bob, smoke, motion: { ...s.rideMotion } };
    };

    const parked = await sample(10);
    t.emit("transport-play", "ride");
    const riding = await sample(45);
    t.emit("transport-stop");
    // Long enough for the ramp to run all the way out (it is ~520 ms).
    const stopping = await sample(60);
    return { parked, riding, stopping };
  });

  // Law 4/6 — a parked train has no cycle running at all. The bob it replaced
  // was `Math.sin(time.now / 160)`: it ran forever, at one speed, stopped or not.
  expect(readings.parked.bob, "a parked train is bobbing").toBe(0);
  expect(readings.parked.smoke, "a parked train is smoking").toBe(0);
  expect(readings.parked.motion.energy).toBe(0);

  // …and a moving one is alive: it has covered ground, and that ground is what
  // drives the bob.
  expect(readings.riding.motion.travelled, "the ride never moved").toBeGreaterThan(50);
  expect(readings.riding.motion.speed).toBeGreaterThan(0);
  expect(readings.riding.bob, "a moving train is not bobbing").toBeGreaterThan(0);

  // Law 5 — and it eases back out rather than snapping off.
  expect(readings.stopping.motion.energy, "the ramp never reached rest").toBe(0);
  expect(readings.stopping.motion.speed).toBeLessThan(readings.riding.motion.speed);
});

test("the ride never shows a bar the ear has not reached yet", async ({ page }) => {
  // Tone evaluates `Transport.ticks` at `context.now()` — currentTime PLUS the
  // scheduling lookAhead — and the transport itself is started at now(), i.e.
  // one lookAhead in the future. So a correct read of "where the song is" must
  // LAG the wall clock since the play tap by that lead; reading `.ticks`
  // instead put the train a measured 98 ms ahead of its own soundtrack.
  //
  // Coupling moved the bar readout off position and onto the highlight, so this
  // now pins BOTH: `progress` still lags the audio, and the highlight is a pure
  // function of `progress` — which is what makes it inherit the same guarantee
  // instead of becoming a second, unchecked clock.
  const CARS = 4;
  await trainOf(page, CARS);

  const result = await page.evaluate(async (n) => {
    const t = (window as any).__ibeetkidz_test__;
    const s: any = t.getScene();
    const barSec = (60 / t.getProject().tempoBpm) * 4;
    const t0 = t.audioDiag().currentTime; // audio clock at the moment of the tap
    t.emit("transport-play", "ride");
    const worst: number[] = [];
    const disagreements: { progress: number; shown: number; expected: number }[] = [];
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const elapsed = t.audioDiag().currentTime - t0;
      const progress = s.progress;
      const shown = s.rideHighlight.bar;
      const expected = Math.min(n - 1, Math.floor(progress * n));
      if (shown !== expected) disagreements.push({ progress, shown, expected });
      if (progress > 0) worst.push(elapsed - progress * n * barSec);
    }
    t.emit("transport-stop");
    return { lead: worst.length ? Math.min(...worst) : NaN, disagreements };
  }, CARS);

  expect(result.lead, "the ride never advanced — nothing was measured").not.toBeNaN();
  // Musical position must always sit BEHIND wall-clock-since-tap by the
  // scheduler's lead (Tone's default lookAhead is 100 ms). Reading the
  // lookahead-shifted clock made this ~0.
  expect(result.lead, "the train is running ahead of the audio").toBeGreaterThan(0.03);
  // …and the highlight is derived from that same reading, never from a clock of
  // its own, so it cannot lead the audio either.
  expect(result.disagreements, "the highlight disagreed with the transport").toEqual([]);
});
