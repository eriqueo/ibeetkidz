import { describe, expect, it, vi } from "vitest";
import protocol from "../../src/pwa-update-protocol.json";
import {
  prepareWaitingPwaUpdate,
  type PwaUpdatePort,
  type WaitingWorker,
} from "../../src/pwa-update.ts";

function harness(waiting: WaitingWorker | null = null): {
  port: PwaUpdatePort;
  fireControllerChange: () => void;
  fireTimeout: () => void;
  register: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  scheduledTimeouts: number[];
  stopped: { controller: number; timeout: number };
} {
  let controllerChange: (() => void) | undefined;
  let timeout: (() => void) | undefined;
  const register = vi.fn(async () => ({ waiting }));
  const reload = vi.fn();
  const scheduledTimeouts: number[] = [];
  const stopped = { controller: 0, timeout: 0 };
  return {
    port: {
      register,
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
    reload,
    scheduledTimeouts,
    stopped,
  };
}

describe("safe PWA update preparation", () => {
  it("boots normally when registration fails offline", async () => {
    const h = harness();
    h.register.mockRejectedValue(new Error("offline"));

    await expect(prepareWaitingPwaUpdate(h.port, 5_000)).resolves.toBe("boot-current");
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 0, timeout: 1 });
  });

  it("boots on the same deadline when registration never settles", async () => {
    const h = harness();
    h.register.mockReturnValue(new Promise(() => undefined));
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000);

    h.fireTimeout();

    await expect(prepared).resolves.toBe("boot-current");
    expect(h.register).toHaveBeenCalledOnce();
    expect(h.scheduledTimeouts).toEqual([5_000]);
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 0, timeout: 1 });
  });

  it("boots without subscribing when no worker was already waiting", async () => {
    const h = harness(null);

    await expect(prepareWaitingPwaUpdate(h.port, 5_000)).resolves.toBe("boot-current");
    expect(h.stopped).toEqual({ controller: 0, timeout: 1 });
    expect(h.reload).not.toHaveBeenCalled();
  });

  it("activates an already-waiting worker and reloads on controllerchange", async () => {
    const postMessage = vi.fn();
    const h = harness({ postMessage });
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000);

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
    const prepared = prepareWaitingPwaUpdate(h.port, 5_000);

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

    await expect(prepareWaitingPwaUpdate(h.port, 5_000)).resolves.toBe("boot-current");
    expect(h.reload).not.toHaveBeenCalled();
    expect(h.stopped).toEqual({ controller: 1, timeout: 1 });
  });
});
