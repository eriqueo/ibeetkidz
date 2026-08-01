// Boot honesty (S4). Three failure paths the app used to swallow:
//   1. `engine.start()` rejects  -> the gate froze on a disabled "TAP TO START".
//   2. no AudioContext / unreachable storage (Safari private mode throws on
//      `localStorage.setItem`) -> never checked at all.
//   3. `QuotaExceededError` -> thrown by the storage adapter, caught nowhere,
//      discarded by `void persist()`; the kid's work stopped saving in silence.
//
// jsdom, no JSX (vitest only collects `tests/unit/**/*.ts`), so components are
// mounted through `createElement` + `react-dom/client`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, type FC } from "react";
import { createRoot, type Root } from "react-dom/client";

// `src/game/EventBus.ts` imports Phaser as a value, and Phaser's module-init
// probes a real 2D canvas — which jsdom doesn't have. The bus only needs an
// event emitter here; nothing in this spec touches Phaser.
vi.mock("phaser", () => {
  class FakeEmitter {
    on(): this {
      return this;
    }
    off(): this {
      return this;
    }
    emit(): boolean {
      return true;
    }
    removeAllListeners(): this {
      return this;
    }
  }
  return {
    default: { Events: { EventEmitter: FakeEmitter } },
    Events: { EventEmitter: FakeEmitter },
  };
});

import { BootGate } from "../../src/components/BootGate.tsx";
import {
  AppProvider,
  clearStorageTrouble,
  useApp,
  type AppApi,
} from "../../src/app/context.tsx";
import { AudioEngine } from "../../src/core/audio-engine.ts";
import { LocalStoragePort } from "../../src/adapters/local-storage-port.ts";
import { StorageError } from "../../src/ports/storage-port.ts";
import { QuotaExceededError } from "../../src/ports/storage-port.ts";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;

/** Grabs the live api out of the provider so a test can call `save()`. */
let api: AppApi | null = null;
const ApiProbe: FC = () => {
  api = useApp();
  return null;
};

async function mount(children: ReturnType<typeof createElement>): Promise<void> {
  await act(async () => {
    root.render(createElement(AppProvider, null, children, createElement(ApiProbe)));
  });
}

const bootButton = (): HTMLButtonElement => {
  const el = container.querySelector<HTMLButtonElement>("#boot-button");
  if (!el) throw new Error("no #boot-button");
  return el;
};

async function tapBoot(): Promise<void> {
  await act(async () => {
    bootButton().click();
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  // jsdom ships neither an AudioContext nor an IndexedDB; a healthy browser has
  // both, so the happy baseline is stubbed in and each test breaks one thing.
  vi.stubGlobal("AudioContext", class {});
  vi.stubGlobal("indexedDB", {} as IDBFactory);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  api = null;
  clearStorageTrouble();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("BootGate failure paths", () => {
  it("a rejected engine.start() leaves a working retry, not a dead button", async () => {
    const started = vi.fn();
    const start = vi
      .spyOn(AudioEngine.prototype, "start")
      .mockRejectedValue(new Error("AudioContext.resume blocked"));
    await mount(createElement(BootGate, { onStarted: started }));

    await tapBoot();

    expect(started).not.toHaveBeenCalled();
    expect(container.querySelector("#boot-oops")).not.toBeNull();
    // The regression this ticket exists for: the button must be alive again.
    expect(bootButton().disabled).toBe(false);
    expect(bootButton().textContent).toContain("TRY AGAIN");

    // ...and the retry must actually retry.
    start.mockResolvedValue(undefined);
    await tapBoot();
    expect(started).toHaveBeenCalledTimes(1);
    expect(container.querySelector("#boot-oops")).toBeNull();
  });

  it("a browser with no AudioContext fails legibly instead of hanging", async () => {
    const started = vi.fn();
    vi.stubGlobal("AudioContext", undefined);
    // Nothing should even try to start audio when the constructor is missing.
    const start = vi.spyOn(AudioEngine.prototype, "start");
    await mount(createElement(BootGate, { onStarted: started }));

    await tapBoot();

    expect(start).not.toHaveBeenCalled();
    expect(started).not.toHaveBeenCalled();
    expect(container.querySelector("#boot-oops")?.textContent).toContain("Oops");
    expect(bootButton().disabled).toBe(false);
  });

  it("unreachable storage still boots — it just says it can't save", async () => {
    const started = vi.fn();
    vi.spyOn(AudioEngine.prototype, "start").mockResolvedValue(undefined);
    // Safari private mode: reading works, writing throws.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    await mount(createElement(BootGate, { onStarted: started }));

    await tapBoot();

    // Forgiving UX: a device that can't save is not a device that can't play.
    expect(started).toHaveBeenCalledTimes(1);
    const notice = container.querySelector("#storage-notice");
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain("can't save");
  });

  it("a full device surfaces QuotaExceededError instead of swallowing it", async () => {
    vi.spyOn(LocalStoragePort.prototype, "saveProject").mockRejectedValue(
      new QuotaExceededError(),
    );
    await mount(createElement("span", null));
    expect(api).not.toBeNull();

    await act(async () => {
      api?.save();
    });

    const notice = container.querySelector("#storage-notice");
    expect(notice?.textContent).toContain("No more room!");

    // The kid can dismiss it and keep playing.
    await act(async () => {
      notice?.querySelector("button")?.click();
    });
    expect(container.querySelector("#storage-notice")).toBeNull();
  });

  it("shows the parse layer's own words when a save can't be read", async () => {
    // S5 wrote kid-legible copy for an unreadable or too-new save and S6 made
    // loadProject throw it on a StorageError — but nothing put it on screen, so
    // a child got a blank project and no explanation. This is that last mile.
    vi.spyOn(LocalStoragePort.prototype, "listProjects").mockResolvedValue([
      { id: "p1", name: "Song", savedAt: 1 },
    ]);
    vi.spyOn(LocalStoragePort.prototype, "loadProject").mockRejectedValue(
      new StorageError("too-new", "saved by a newer build", {
        kidMessage: {
          title: "🚂 This song is too new for me!",
          body: "It was made with a newer ibeetkidz.",
        },
      }),
    );

    vi.spyOn(AudioEngine.prototype, "start").mockResolvedValue(undefined);
    await mount(createElement(BootGate, { onStarted: vi.fn() }));
    await tapBoot();

    const notice = container.querySelector("#storage-notice");
    expect(notice).not.toBeNull();
    // The SPECIFIC words, not the generic "I can't save here" fallback.
    expect(notice?.textContent).toContain("too new for me");
  });
});
