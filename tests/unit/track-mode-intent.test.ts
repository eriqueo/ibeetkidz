import { describe, expect, it, vi } from "vitest";
import { MODE_KINDS, type ModeKind } from "../../src/core/terrain.ts";
import {
  TrackModeIntentCoordinator,
  type TrackModeIntentPorts,
} from "../../src/game/track-mode-intent.ts";

function deferred(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (error: unknown) => void;
} {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function harness(overrides: Partial<TrackModeIntentPorts> = {}) {
  let riding = false;
  let train = true;
  const coldStart = deferred();
  const pending: ModeKind[][] = [];
  const ports: TrackModeIntentPorts = {
    isRideActive: () => riding,
    hasTrain: () => train,
    startRide: vi.fn(() => coldStart.promise),
    commitMode: vi.fn(),
    setPendingModes: vi.fn((kinds) => pending.push([...kinds])),
    onStartFailed: vi.fn(),
    ...overrides,
  };
  const coordinator = new TrackModeIntentCoordinator(ports);
  return {
    coordinator,
    ports,
    coldStart,
    pending,
    setRiding: (next: boolean) => { riding = next; },
    setTrain: (next: boolean) => { train = next; },
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Track mode compound intent", () => {
  it("starts one Ride and commits the idle mode after that Ride is authoritative", async () => {
    const h = harness();

    h.coordinator.request("hill");
    expect(h.ports.startRide).toHaveBeenCalledTimes(1);
    expect(h.ports.commitMode).not.toHaveBeenCalled();
    expect(h.pending.at(-1)).toEqual(["hill"]);

    h.setRiding(true);
    h.coldStart.resolve();
    await settle();

    expect(h.ports.commitMode).toHaveBeenCalledWith("hill");
    expect(h.pending.at(-1)).toEqual([]);
  });

  it("coalesces a cold burst into the registered vocabulary and drains in tap order", async () => {
    const h = harness();
    for (const kind of MODE_KINDS) h.coordinator.request(kind);
    h.coordinator.request("not-a-mode" as ModeKind);

    expect(h.ports.startRide).toHaveBeenCalledTimes(1);
    expect(h.coordinator.pendingModes).toEqual(MODE_KINDS);
    expect(h.coordinator.pendingModes).toHaveLength(MODE_KINDS.length);

    h.setRiding(true);
    h.coldStart.resolve();
    await settle();

    expect(h.ports.commitMode).toHaveBeenCalledTimes(MODE_KINDS.length);
    expect(vi.mocked(h.ports.commitMode).mock.calls.map(([kind]) => kind)).toEqual(MODE_KINDS);
  });

  it("treats a duplicate pending tap as cancellation without starting twice", async () => {
    const h = harness();
    h.coordinator.request("rain");
    h.coordinator.request("rain");

    expect(h.coordinator.pendingModes).toEqual([]);
    expect(h.ports.startRide).toHaveBeenCalledTimes(1);

    h.setRiding(true);
    h.coldStart.resolve();
    await settle();
    expect(h.ports.commitMode).not.toHaveBeenCalled();
  });

  it("shares the one cold start with a RIDE-key tap", async () => {
    const h = harness();
    h.coordinator.request("tiny");
    h.coordinator.startRide();

    expect(h.ports.startRide).toHaveBeenCalledTimes(1);
    h.setRiding(true);
    h.coldStart.resolve();
    await settle();
    expect(h.ports.commitMode).toHaveBeenCalledWith("tiny");
  });

  it("toggles immediately only when a Ride, not merely another play mode, is active", () => {
    const active = harness({ isRideActive: () => true });
    active.coordinator.request("night");
    expect(active.ports.commitMode).toHaveBeenCalledWith("night");
    expect(active.ports.startRide).not.toHaveBeenCalled();

    const loop = harness({ isRideActive: () => false });
    loop.coordinator.request("night");
    expect(loop.ports.startRide).toHaveBeenCalledTimes(1);
    expect(loop.ports.commitMode).not.toHaveBeenCalled();
  });

  it("does not start scenery without a train", () => {
    const h = harness();
    h.setTrain(false);
    h.coordinator.request("tunnel");
    h.coordinator.startRide();

    expect(h.ports.startRide).not.toHaveBeenCalled();
    expect(h.ports.commitMode).not.toHaveBeenCalled();
    expect(h.coordinator.pendingModes).toEqual([]);
  });

  it("clears pending work on STOP or unmount and ignores a late start", async () => {
    for (const dispose of [false, true]) {
      const h = harness();
      h.coordinator.request("giant");
      if (dispose) h.coordinator.dispose();
      else h.coordinator.clear();
      h.setRiding(true);
      h.coldStart.resolve();
      await settle();

      expect(h.coordinator.pendingModes).toEqual([]);
      expect(h.ports.commitMode).not.toHaveBeenCalled();
    }
  });

  it("clears the bounded set and reports a rejected Ride start", async () => {
    const h = harness();
    const error = new Error("cold clip failed");
    h.coordinator.request("bridge");
    h.coldStart.reject(error);
    await settle();

    expect(h.coordinator.pendingModes).toEqual([]);
    expect(h.ports.commitMode).not.toHaveBeenCalled();
    expect(h.ports.onStartFailed).toHaveBeenCalledWith(error);
  });
});
