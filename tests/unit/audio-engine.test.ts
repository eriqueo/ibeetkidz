import { describe, expect, it } from "vitest";
import { AudioEngine } from "../../src/core/audio-engine.ts";
import {
  emptyProject,
  makeLayer,
  reduce,
} from "../../src/core/project-state.ts";
import type { Clip, Project } from "../../src/core/types.ts";
import type { SoundPort } from "../../src/ports/sound-port.ts";

/** A SoundPort that records the (cycleBars, barOffset) of every scheduled voice,
 *  so we can assert the Song Train lays cars out across the right bars without
 *  touching Tone/audio. Everything else is an inert stub. */
interface Sched {
  readonly clipId: string;
  readonly cycleBars: number;
  readonly barOffset: number;
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
    _stepIndex: number,
    _totalSteps: number,
    _opts: unknown,
    _lengthSteps?: number,
    _roll?: number,
    _pitch?: number,
    cycleBars = 1,
    barOffset = 0,
  ): void {
    this.scheduled.push({ clipId: clip.id, cycleBars, barOffset });
  }
  clearScheduled(): void {
    this.clears++;
    this.scheduled.length = 0;
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
  getTransportBar(): number {
    return -1;
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

describe("AudioEngine play modes", () => {
  it("loop mode schedules the active car at one bar, offset 0", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.playLoop(oneHitCar());
    expect(engine.playMode).toBe("loop");
    expect(sound.scheduled).toEqual([
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
    expect(sound.scheduled).toEqual([
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
    expect(sound.scheduled).toEqual([
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
    expect(sound.scheduled).toEqual([
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
    expect(sound.scheduled).toEqual([
      { clipId: "d1", cycleBars: 1, barOffset: 0 },
    ]);
  });

  it("a one-car ride is identical to a loop (byte-for-byte schedule)", async () => {
    const sound = new FakeSoundPort();
    const engine = await booted(sound);
    engine.playRide(oneHitCar());
    expect(sound.scheduled).toEqual([
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
