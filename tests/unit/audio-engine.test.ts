import { describe, expect, it } from "vitest";
import { AudioEngine } from "../../src/core/audio-engine.ts";
import {
  emptyProject,
  makeLayer,
  reduce,
} from "../../src/core/project-state.ts";
import type { Clip, Project } from "../../src/core/types.ts";
import type { SoundPort } from "../../src/ports/sound-port.ts";
import { LATCH_HOLD_BARS, NEUTRAL_TERRAIN, TERRAIN, combineModes, type TerrainEffect } from "../../src/core/terrain.ts";

/** A SoundPort that records the (cycleBars, barOffset) of every scheduled voice,
 *  so we can assert the Song Train lays cars out across the right bars without
 *  touching Tone/audio. Everything else is an inert stub. */
interface Sched {
  readonly clipId: string;
  readonly cycleBars: number;
  readonly barOffset: number;
  /** WHERE in the bar the hit was placed. BACKWARDS is a claim about this
   *  number, so a fake that threw it away could not tell a reversed song from
   *  an unreversed one — which is how "plays backwards" shipped meaning only
   *  "each sample plays backwards in its original slot". */
  readonly stepIndex: number;
  readonly totalSteps: number;
}

class FakeSoundPort implements SoundPort {
  readonly scheduled: Sched[] = [];
  clears = 0;
  /** Bars requested of the last captureBars call, with the schedule snapshot
   *  visible at capture time (renderSong must schedule BEFORE capturing). */
  captured: { bars: number; scheduledAtCapture: number } | null = null;

  async captureBars(bars: number): Promise<Blob> {
    this.captured = { bars, scheduledAtCapture: this.scheduled.length };
    return new Blob([], { type: "audio/wav" });
  }

  scheduleStep(
    clip: Clip,
    stepIndex: number,
    totalSteps: number,
    _opts: unknown,
    _lengthSteps?: number,
    _roll?: number,
    _pitch?: number,
    cycleBars = 1,
    barOffset = 0,
  ): void {
    this.scheduled.push({ clipId: clip.id, cycleBars, barOffset, stepIndex, totalSteps });
  }
  clearScheduled(): void {
    this.clears++;
    this.scheduled.length = 0;
  }

  /** Terrain rides requested, in order, plus how often flat ground was forced. */
  readonly terrains: { effect: TerrainEffect; holdBars: number; bpm: number }[] = [];
  terrainClears = 0;
  /** Pretend the ride is at bar 7, so callers can be checked on what they do
   *  with the span the real transport hands back. */
  scheduleTerrain(
    effect: TerrainEffect, holdBars: number, bpm: number,
  ): { startBar: number; endBar: number } | null {
    this.terrains.push({ effect, holdBars, bpm });
    return { startBar: 8, endBar: 8 + holdBars };
  }
  clearTerrain(): void {
    this.terrainClears++;
  }

  /** BACKWARDS toggles received, latest state last. */
  readonly reversedStates: boolean[] = [];
  setReversed(on: boolean): void {
    this.reversedStates.push(on);
  }

  // ── inert stubs ──────────────────────────────────────────────────────────
  async resume(): Promise<void> {}
  async loadBuiltins(): Promise<void> {}
  async startRecording(): Promise<void> {}
  async stopRecording(): Promise<string> {
    return "b";
  }
  async startPerformanceRecording(): Promise<void> {}
  async stopPerformanceRecording(): Promise<string> {
    return "b";
  }
  async renderEffects(): Promise<string> {
    return "b";
  }
  async rehydrate(): Promise<void> {}
  getRecordingBlob(): Blob | null {
    return null;
  }
  getBufferDuration(): number | null {
    return null;
  }
  play(): void {}
  previewNote(): void {}
  scheduleNote(): void {}
  setThereminXY(): void {}
  thereminOn(): void {}
  thereminOff(): void {}
  setThereminWaveform(): void {}
  setTempo(): void {}
  startTransport(): void {}
  stopTransport(): void {}
  stopAll(): void {}
  setQuantize(): void {}
  getTransportStep(): number {
    return -1;
  }
  /** Drivable, so the loop-count tests can walk the song forward a bar at a
   *  time. -1 is "stopped", which is what the real port reports. */
  bar = -1;
  getTransportBar(): number {
    return this.bar;
  }
  getAnalyser(): AnalyserNode {
    return {} as AnalyserNode;
  }
}

/** A project with one drum lane (a single hit at step 0) per car. */
function oneHitCar(): Project {
  let s = reduce(emptyProject("eng"), {
    type: "addClip",
    clip: {
      id: "d1",
      source: { kind: "recording", bufferId: "buf" },
      effects: [],
      color: "#fff",
      label: "d1",
    },
  });
  s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "d1", clipId: "d1" }) });
  return reduce(s, { type: "toggleStep", layerId: "d1", index: 0 });
}

async function booted(sound: FakeSoundPort): Promise<AudioEngine> {
  const engine = new AudioEngine(sound);
  await engine.start();
  return engine;
}

/** Just the BAR placement of everything scheduled. The arrangement tests are
 *  about which bar a car lands in; where the hit sits inside that bar is the
 *  BACKWARDS tests' business, and mixing the two would make every arrangement
 *  expectation carry a step index it does not care about. */
function bars(sound: FakeSoundPort): { clipId: string; cycleBars: number; barOffset: number }[] {
  return sound.scheduled.map(({ clipId, cycleBars, barOffset }) => ({ clipId, cycleBars, barOffset }));
}

/** Two DISTINCT cars, one bar each, in train order A then B. Distinct clips on
 *  purpose: `duplicateCar` would give both cars the same clip id, and the
 *  bar-order test has to be able to say which car moved. */
function twoCarTrain(): Project {
  const clip = (id: string): Clip => ({
    id, source: { kind: "recording", bufferId: id }, effects: [], color: "#fff", label: id,
  });
  let s = reduce(emptyProject("eng"), { type: "addClip", clip: clip("carA") });
  s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "lA", clipId: "carA" }) });
  s = reduce(s, { type: "toggleStep", layerId: "lA", index: 0 });
  s = reduce(s, { type: "addCar", id: "car-B" });
  s = reduce(s, { type: "addClip", clip: clip("carB") });
  s = reduce(s, { type: "addLayer", layer: makeLayer({ id: "lB", clipId: "carB" }) });
  s = reduce(s, { type: "toggleStep", layerId: "lB", index: 0 });
  return reduce(s, { type: "addToTrain", instanceId: "iB", partId: "car-B" });
}

describe("AudioEngine play modes", () => {
  it("loop mode schedules the active car at one bar, offset 0", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.playLoop(oneHitCar());
    expect(engine.playMode).toBe("loop");
    expect(bars(sound)).toEqual([
      { clipId: "d1", cycleBars: 1, barOffset: 0 },
    ]);
  });

  it("ride mode lays each train slot across consecutive bars of the song", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    // Add a second library car and place it on the train → a 2-bar song.
    const base = oneHitCar();
    let project = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    project = reduce(project, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    engine.playRide(project);
    expect(engine.playMode).toBe("ride");
    // Each slot's lane scheduled at cycleBars = 2 (song length), at bars 0 and 1.
    expect(bars(sound)).toEqual([
      { clipId: "d1", cycleBars: 2, barOffset: 0 },
      { clipId: "d1", cycleBars: 2, barOffset: 1 },
    ]);
  });

  it("ride honors repeats: the same car placed twice fills consecutive bars", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    // Place the default car a SECOND time, then car-2 → a 3-bar song.
    const base = oneHitCar();
    let project = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    const car1 = project.parts[0]!.id;
    project = reduce(project, { type: "addToTrain", instanceId: "r2", partId: car1 });
    project = reduce(project, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    engine.playRide(project);
    expect(bars(sound)).toEqual([
      { clipId: "d1", cycleBars: 3, barOffset: 0 },
      { clipId: "d1", cycleBars: 3, barOffset: 1 },
      { clipId: "d1", cycleBars: 3, barOffset: 2 },
    ]);
  });

  it("ride skips muted (tarped) cars — that bar is silent but still occupies its slot", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    // 3-bar song; tarp the middle slot.
    const base = oneHitCar();
    let project = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    const car1 = project.parts[0]!.id;
    project = reduce(project, { type: "addToTrain", instanceId: "mid", partId: "car-2" });
    project = reduce(project, { type: "addToTrain", instanceId: "last", partId: car1 });
    project = reduce(project, { type: "muteCar", instanceId: "mid", muted: true });
    engine.playRide(project);
    // Bars 0 and 2 sound at cycleBars = 3; bar 1 (muted) is skipped.
    expect(bars(sound)).toEqual([
      { clipId: "d1", cycleBars: 3, barOffset: 0 },
      { clipId: "d1", cycleBars: 3, barOffset: 2 },
    ]);
  });

  it("playCarLoop loops a single car at one bar regardless of the train", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const base = oneHitCar();
    let project = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    project = reduce(project, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    engine.playCarLoop(project.parts[0]!.id, project);
    expect(engine.playMode).toBe("loop");
    expect(bars(sound)).toEqual([
      { clipId: "d1", cycleBars: 1, barOffset: 0 },
    ]);
  });

  it("a one-car ride is identical to a loop (byte-for-byte schedule)", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.playRide(oneHitCar());
    expect(bars(sound)).toEqual([
      { clipId: "d1", cycleBars: 1, barOffset: 0 },
    ]);
  });

  it("renderSong schedules the ride, captures the song's bar count, then stops", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const base = oneHitCar();
    let project = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    project = reduce(project, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    const blob = await engine.renderSong(project);
    expect(blob.type).toBe("audio/wav");
    // Both train slots were on the transport when the capture ran (a 2-bar song).
    expect(sound.captured).toEqual({ bars: 2, scheduledAtCapture: 2 });
    // Fully torn down afterwards: not playing, schedule cleared.
    expect(engine.isPlaying).toBe(false);
    expect(sound.scheduled).toHaveLength(0);
  });

  it("renderSong stops playback even when the capture fails", async () => {
    const sound = new FakeSoundPort();
    sound.captureBars = async () => {
      throw new Error("boom");
    };
    const engine = await booted(sound);
    await expect(engine.renderSong(oneHitCar())).rejects.toThrow("boom");
    expect(engine.isPlaying).toBe(false);
    expect(sound.scheduled).toHaveLength(0);
  });

  it("reconcile re-clears and follows the active mode on edits", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const base = oneHitCar();
    let project = reduce(base, { type: "duplicateCar", partId: base.activePartId!, id: "car-2" });
    project = reduce(project, { type: "addToTrain", instanceId: "i2", partId: "car-2" });
    engine.playRide(project);
    const clearsAfterPlay = sound.clears;
    engine.reconcile(project); // an edit while riding
    expect(sound.clears).toBe(clearsAfterPlay + 1);
    expect(sound.scheduled).toHaveLength(2); // still the whole song
  });
});

describe("AudioEngine terrain", () => {
  it("rides a terrain only while the song is actually playing", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = oneHitCar();

    engine.applyTerrain("hill", project); // stopped — nothing to ride through
    expect(sound.terrains).toHaveLength(0);

    engine.playRide(project);
    engine.applyTerrain("hill", project);
    expect(sound.terrains).toHaveLength(1);

    engine.stop();
    engine.applyTerrain("hill", project);
    expect(sound.terrains).toHaveLength(1);
  });

  it("passes the terrain's effect, hold and the song's own tempo down", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = { ...oneHitCar(), tempoBpm: 96 };
    engine.playRide(project);

    engine.applyTerrain("bridge", project, 3);
    expect(sound.terrains[0]).toEqual({
      effect: TERRAIN.bridge,
      holdBars: 3,
      bpm: 96,
    });
  });

  it("defaults to a couple of bars, not one", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = oneHitCar();
    engine.playRide(project);
    engine.applyTerrain("rain", project);
    expect(sound.terrains[0]?.holdBars).toBe(2);
  });

  it("terrain never schedules or clears voices — it is not a reschedule", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = oneHitCar();
    engine.playRide(project);
    const clearsBefore = sound.clears;
    const scheduledBefore = sound.scheduled.length;

    engine.applyTerrain("hill", project);

    // The whole point of test 0: a hill must not go through the reschedule
    // path, because cancel+reschedule on a bar line drops that bar's downbeat.
    expect(sound.clears).toBe(clearsBefore);
    expect(sound.scheduled).toHaveLength(scheduledBefore);
  });

  it("clearTerrain returns to flat ground", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.clearTerrain();
    expect(sound.terrainClears).toBe(1);
  });

  it("toggleMode latches and STACKS: on, stacked, then off one at a time", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = oneHitCar();
    engine.playRide(project);

    // On: the mode's own effect, held effectively forever (the latch).
    const on = engine.toggleMode("hill", project);
    expect(on).toEqual({ on: true, atBar: 8 });
    expect(sound.terrains[0]?.effect).toEqual(combineModes(["hill"], "hill"));
    expect(sound.terrains[0]?.holdBars).toBe(LATCH_HOLD_BARS);

    // A second mode STACKS — one combined effect, both still latched.
    engine.toggleMode("rain", project);
    expect([...engine.latchedModes].sort()).toEqual(["hill", "rain"]);
    expect(sound.terrains[1]?.effect).toEqual(combineModes(["hill", "rain"], "rain"));

    // Toggling one off leaves the other in force…
    engine.toggleMode("hill", project);
    expect([...engine.latchedModes]).toEqual(["rain"]);
    expect(sound.terrains[2]?.effect).toEqual(combineModes(["rain"], "hill"));

    // …and toggling the last one off IS the revert: the empty set is neutral.
    engine.toggleMode("rain", project);
    expect(engine.latchedModes.size).toBe(0);
    expect(sound.terrains[3]?.effect).toEqual({ ...NEUTRAL_TERRAIN, rampBeats: TERRAIN.rain.rampBeats });
  });

  it("a latch needs a ride, and stopping the ride drops them all", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = oneHitCar();

    // Not playing: refused, nothing scheduled, nothing latched.
    expect(engine.toggleMode("hill", project)).toEqual({ on: false, atBar: null });
    expect(sound.terrains).toHaveLength(0);
    expect(engine.latchedModes.size).toBe(0);

    engine.playRide(project);
    engine.toggleMode("night", project);
    engine.toggleMode("tiny", project);
    expect(engine.latchedModes.size).toBe(2);
    engine.stop();
    expect(engine.latchedModes.size).toBe(0);
  });

  it("toggleReversed flips the port and reconciles a playing song in place", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = oneHitCar();
    engine.playRide(project);
    const clearsBefore = sound.clears;

    expect(engine.toggleReversed(project)).toBe(true);
    expect(sound.reversedStates).toEqual([true]);
    // The flip is HEARD without stopping: a reconcile, not a stop/start.
    expect(sound.clears).toBe(clearsBefore + 1);

    expect(engine.toggleReversed(project)).toBe(false);
    expect(sound.reversedStates).toEqual([true, false]);
  });

  it("BACKWARDS mirrors the STEPS in the bar, not just the samples", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    // One hit, on the downbeat.
    const project = oneHitCar();
    engine.playRide(project);
    const forward = sound.scheduled.at(-1)!;
    expect(forward.stepIndex).toBe(0);

    engine.toggleReversed(project);
    const back = sound.scheduled.at(-1)!;
    // Played backwards, the FIRST hit of the bar is the LAST thing you hear.
    // This is the assertion the shipped version would have failed: it flipped
    // the sample and left the hit sitting on the downbeat.
    expect(back.stepIndex).toBe(forward.totalSteps - 1);
    expect(back.totalSteps).toBe(forward.totalSteps);

    engine.toggleReversed(project);
    expect(sound.scheduled.at(-1)!.stepIndex).toBe(0);
  });

  it("BACKWARDS mirrors the ORDER of the train's bars", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    const project = twoCarTrain();
    engine.playRide(project);
    const forward = sound.scheduled.map((s) => s.barOffset);
    expect(new Set(forward)).toEqual(new Set([0, 1]));

    sound.scheduled.length = 0;
    engine.toggleReversed(project);
    // Same two bars, opposite order: the car that played second now plays
    // first. A song run backwards has to end at its beginning.
    const byClip = (id: string): number =>
      sound.scheduled.find((s) => s.clipId === id)!.barOffset;
    expect(byClip("carA")).toBe(1);
    expect(byClip("carB")).toBe(0);
  });
});

describe("ride loop count", () => {
  it("rides for ever by default — the behaviour the Track has always had", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.playRide(twoCarTrain());
    expect(engine.rideLoopCount).toBe(null);
    // Far past any plausible song length; still going.
    sound.bar = 9999;
    expect(engine.tickRide()).toBe(false);
    expect(engine.isPlaying).toBe(true);
  });

  it("stops after N times round, counting the SONG and not the bar", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.setRideLoops(2);
    engine.playRide(twoCarTrain()); // a two-bar song
    // Bar 3 is the last bar of the second time round — not done yet.
    for (const bar of [0, 1, 2, 3]) {
      sound.bar = bar;
      expect(engine.tickRide(), `bar ${bar}`).toBe(false);
      expect(engine.isPlaying).toBe(true);
    }
    sound.bar = 4; // 2 loops x 2 bars — the song has run twice
    expect(engine.tickRide()).toBe(true);
    expect(engine.isPlaying).toBe(false);
  });

  it("holds the finish line it started with when the train is edited mid-ride", async () => {
    // `rideBars` is captured at playRide on purpose: a kid deleting a car while
    // the song runs must not make the song end early (or never), because the
    // finish line would move under a ride already in progress.
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.setRideLoops(1);
    engine.playRide(twoCarTrain());
    sound.bar = 1;
    expect(engine.tickRide()).toBe(false);
    sound.bar = 2;
    expect(engine.tickRide()).toBe(true);
  });

  it("counts nothing while stopped, and nothing in single-car LOOP mode", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.setRideLoops(1);
    // Never started: a bar reading of -1 must not be read as "past the end".
    sound.bar = -1;
    expect(engine.tickRide()).toBe(false);
    // LOOP mode is the Workshop's play-one-car; a ride count must not stop it.
    const project = twoCarTrain();
    engine.playLoop(project);
    sound.bar = 500;
    expect(engine.tickRide()).toBe(false);
    expect(engine.isPlaying).toBe(true);
  });
});
