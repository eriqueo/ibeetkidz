import { describe, expect, it, vi } from "vitest";
import protocol from "../../src/pwa-update-protocol.json";
import {
  prepareWaitingPwaUpdate,
  type PwaUpdatePort,
  type WaitingWorker,
} from "../../src/pwa-update.ts";

const LOADED_RELEASE = "https://example.test/assets/index-current.js";

function harness(
  waiting: WaitingWorker | null = null,
  options: { activeReleaseId?: string | null; controlledAtLoad?: boolean; alreadyReloadedFor?: string } = {},
): {
  port: PwaUpdatePort;
  fireControllerChange: () => void;
  fireTimeout: () => void;
  register: ReturnType<typeof vi.fn>;
  registrationActivePostMessage: ReturnType<typeof vi.fn>;
  probeControllingRelease: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  scheduledTimeouts: number[];
  stopped: { controller: number; timeout: number };
} {
  let controllerChange: (() => void) | undefined;
  let timeout: (() => void) | undefined;
  const registrationActivePostMessage = vi.fn();
  const register = vi.fn(async () => ({
    waiting,
    active: { postMessage: registrationActivePostMessage },
  }));
  const activeReleaseId = "activeReleaseId" in options
    ? options.activeReleaseId ?? null
    : LOADED_RELEASE;
  const probeControllingRelease = vi.fn(() => ({
    result: Promise.resolve(activeReleaseId),
    stop: vi.fn(),
  }));
  const reload = vi.fn();
  const scheduledTimeouts: number[] = [];
  const stopped = { controller: 0, timeout: 0 };
  let reloadedFor: string | undefined = options.alreadyReloadedFor;
  return {
    port: {
      controlledAtLoad: options.controlledAtLoad ?? true,
      register,
      probeControllingRelease,
      reloadedForMismatch: (id) => reloadedFor === id,
      rememberMismatchReload: (id) => { reloadedFor = id; },
      onControllerChange: (listener) => {
        controllerChange = listener;
        return () => { stopped.controller += 1; };
      },
      onTimeout: (timeoutMs, listener) => {
        scheduledTimeouts.push(timeoutMs);
        timeout = listener;
        return () => { stopped.timeout += 1; };
      },
      reload,
    },
    fireControllerChange: () => controllerChange?.(),
    fireTimeout: () => timeout?.(),
    register,
    registrationActivePostMessage,
    probeControllingRelease,
    reload,
    scheduledTimeouts,
    stopped,
  };
}

describe("safe PWA update preparation", () => {
  it("boots normally when registration fails offline", async () => {
    const h = harness();
    h.register.mockRejectedValue(new Error("offline"));

    await expect(prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE)).resolves.toBe("boot-current");
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });

  it("boots on the same deadline when registration never settles", async () => {
    const h = harness();
    h.register.mockReturnValue(new Promise(() => undefined));
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE);

    h.fireTimeout();

    await expect(prepared).resolves.toBe("boot-current");
    expect(h.register).toHaveBeenCalledOnce();
    expect(h.scheduledTimeouts).toEqual([5_000]);
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });

  it("reloads when control changes while registration is still settling", async () => {
    const h = harness();
    h.register.mockReturnValue(new Promise(() => undefined));
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE);

    h.fireControllerChange();

    await expect(prepared).resolves.toBe("reload-requested");
    expect(h.reload).toHaveBeenCalledOnce();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });

  it("boots when the active worker matches the loaded release", async () => {
    const h = harness(null);

    await expect(prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE)).resolves.toBe("boot-current");
    expect(h.probeControllingRelease).toHaveBeenCalledOnce();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
    expect(h.reload).not.toHaveBeenCalled();
  });

  it("reloads an old document when the active worker reports a newer release", async () => {
    const h = harness(null, { activeReleaseId: "https://example.test/assets/index-next.js" });

    await expect(prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE)).resolves.toBe("reload-requested");
    expect(h.reload).toHaveBeenCalledOnce();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });

  it("reloads for a release mismatch once, then boots rather than looping", async () => {
    // The 2026-10-05 reload loop: a controller that keeps reporting a release
    // other than the loaded one, load after load. One reload is the honest
    // try; a second identical load must boot what it has.
    const next = "https://example.test/assets/index-next.js";
    const first = harness(null, { activeReleaseId: next });
    await expect(prepareWaitingPwaUpdate(first.port, 5_000, LOADED_RELEASE)).resolves.toBe("reload-requested");
    expect(first.reload).toHaveBeenCalledOnce();

    const again = harness(null, { activeReleaseId: next, alreadyReloadedFor: LOADED_RELEASE });
    await expect(prepareWaitingPwaUpdate(again.port, 5_000, LOADED_RELEASE)).resolves.toBe("boot-current");
    expect(again.reload).not.toHaveBeenCalled();
    expect(again.stopped).toEqual({ controller: 1, timeout: 1 });

    // A different loaded release is a new situation and gets its own reload.
    const newer = harness(null, { activeReleaseId: next, alreadyReloadedFor: LOADED_RELEASE });
    await expect(prepareWaitingPwaUpdate(newer.port, 5_000, "https://example.test/assets/index-other.js")).resolves.toBe("reload-requested");
    expect(newer.reload).toHaveBeenCalledOnce();
  });

  it("trusts the old controlling worker while registration active is newer", async () => {
    const h = harness(null, { activeReleaseId: LOADED_RELEASE });

    await expect(prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE)).resolves.toBe("boot-current");
    expect(h.registrationActivePostMessage).not.toHaveBeenCalled();
    expect(h.probeControllingRelease).toHaveBeenCalledOnce();
    expect(h.reload).not.toHaveBeenCalled();
  });

  it("bounds a controlling-worker identity probe that never responds", async () => {
    const h = harness(null);
    const stop = vi.fn();
    h.probeControllingRelease.mockReturnValue({
      result: new Promise(() => undefined),
      stop,
    });
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE);

    await vi.waitFor(() => expect(h.probeControllingRelease).toHaveBeenCalledOnce());
    h.fireTimeout();

    await expect(prepared).resolves.toBe("boot-current");
    expect(stop).toHaveBeenCalledOnce();
    expect(h.scheduledTimeouts).toEqual([5_000]);
    expect(h.reload).not.toHaveBeenCalled();
  });

  it("does not reload a fresh uncontrolled install", async () => {
    const h = harness(null, { activeReleaseId: null, controlledAtLoad: false });

    await expect(prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE)).resolves.toBe("boot-current");
    h.fireControllerChange();
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 0, timeout: 1 });
  });

  it("activates an already-waiting worker and reloads on controllerchange", async () => {
    const postMessage = vi.fn();
    const h = harness({ postMessage });
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE);

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({ type: protocol.messageType });
    });
    h.fireControllerChange();
    h.fireControllerChange();

    await expect(prepared).resolves.toBe("reload-requested");
    expect(h.reload).toHaveBeenCalledOnce();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });

  it("boots at the deadline, then reloads if the worker takes control late", async () => {
    const postMessage = vi.fn();
    const h = harness({ postMessage });
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE);

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({ type: protocol.messageType });
    });
    h.fireTimeout();

    await expect(prepared).resolves.toBe("boot-current");
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 0, timeout: 1 });

    h.fireControllerChange();
    h.fireControllerChange();

    expect(h.reload).toHaveBeenCalledOnce();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });

  it("boots rather than hanging when the waiting worker rejects its message", async () => {
    const h = harness({ postMessage: () => { throw new Error("redundant worker"); } });

    await expect(prepareWaitingPwaUpdate(h.port, 5_000, LOADED_RELEASE)).resolves.toBe("boot-current");
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });
});
