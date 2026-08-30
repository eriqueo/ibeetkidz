import protocol from "./pwa-update-protocol.json";

export interface WaitingWorker {
  postMessage(message: { readonly type: string }): void;
}

export interface PwaRegistration {
  readonly waiting: WaitingWorker | null;
}

export interface PwaUpdatePort {
  register(): Promise<PwaRegistration>;
  onControllerChange(listener: () => void): () => void;
  onTimeout(timeoutMs: number, listener: () => void): () => void;
  reload(): void;
}

export type PwaUpdateDisposition = "boot-current" | "reload-requested";

/**
 * Activates only a worker that was already waiting when this page loaded.
 * Workers discovered later remain waiting until the child's next explicit load.
 */
export async function prepareWaitingPwaUpdate(
  port: PwaUpdatePort,
  bootTimeoutMs: number,
): Promise<PwaUpdateDisposition> {
  let stopTimeout: () => void = () => undefined;
  const deadline = new Promise<"timed-out">((resolve) => {
    stopTimeout = port.onTimeout(bootTimeoutMs, () => resolve("timed-out"));
  });
  const registrationResult = Promise.resolve()
    .then(() => port.register())
    .then(
      (registration) => ({ kind: "registered", registration }) as const,
      () => ({ kind: "registration-failed" }) as const,
    );
  const firstResult = await Promise.race([
    registrationResult,
    deadline.then(() => ({ kind: "timed-out" }) as const),
  ]);
  if (firstResult.kind !== "registered") {
    stopTimeout();
    return "boot-current";
  }

  const waiting = firstResult.registration.waiting;
  if (!waiting) {
    stopTimeout();
    return "boot-current";
  }

  let stopControllerChange: () => void = () => undefined;
  let controllerChanged = false;
  let releasedAfterTimeout = false;
  let reloadRequested = false;
  let resolveActivation: () => void = () => undefined;
  const activation = new Promise<"activated">((resolve) => {
    resolveActivation = () => resolve("activated");
  });
  const reloadOnce = () => {
    if (reloadRequested) return;
    reloadRequested = true;
    stopControllerChange();
    port.reload();
  };

  try {
    stopControllerChange = port.onControllerChange(() => {
      if (controllerChanged) return;
      controllerChanged = true;
      resolveActivation();
      // If the bounded boot already released the old app, switch it as soon as
      // the new worker controls requests so old code cannot use a cleaned cache.
      if (releasedAfterTimeout) reloadOnce();
    });
    waiting.postMessage({ type: protocol.messageType });
  } catch {
    stopControllerChange();
    stopTimeout();
    return "boot-current";
  }

  const result = await Promise.race([activation, deadline]);
  stopTimeout();
  if (result === "timed-out") {
    releasedAfterTimeout = true;
    // Covers the narrow ordering where both promises settled before this
    // continuation ran but the deadline won Promise.race.
    if (controllerChanged) reloadOnce();
    return "boot-current";
  }

  // controllerchange can be emitted more than once, but this boundary performs
  // one non-retriable navigation for the worker activated by this page load.
  reloadOnce();
  return "reload-requested";
}

export function createBrowserPwaUpdatePort(baseUrl: string): PwaUpdatePort | null {
  if (!("serviceWorker" in navigator)) return null;

  return {
    register: () => navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl }),
    onControllerChange: (listener) => {
      navigator.serviceWorker.addEventListener(protocol.controllerChangeEvent, listener, { once: true });
      return () => navigator.serviceWorker.removeEventListener(protocol.controllerChangeEvent, listener);
    },
    onTimeout: (timeoutMs, listener) => {
      const timeout = window.setTimeout(listener, timeoutMs);
      return () => window.clearTimeout(timeout);
    },
    reload: () => window.location.reload(),
  };
}

export function prepareBrowserPwaUpdate(
  baseUrl: string,
  bootTimeoutMs: number,
): Promise<PwaUpdateDisposition> {
  const port = createBrowserPwaUpdatePort(baseUrl);
  return port
    ? prepareWaitingPwaUpdate(port, bootTimeoutMs)
    : Promise.resolve("boot-current");
}
