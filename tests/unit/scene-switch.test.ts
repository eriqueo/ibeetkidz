// The ordering rules for the one-game refactor (see `src/game/scene-switch.ts`).
//
// Every one of these was a real failure during the first, reverted attempt, and
// none of them is reachable from a test that needs a WebGL context — which is
// why the policy is split out from the Phaser wiring at all. The fake below
// records the call ORDER, because in all three cases the order is the bug.

import { describe, expect, it } from "vitest";
import { SceneSwitch, type SceneClass, type SceneSwapper } from "../../src/game/scene-switch.ts";

/** A stand-in view scene. Only `KEY` is ever read by the switch. */
function fakeScene(key: string): SceneClass {
  return class {
    static readonly KEY = key;
  } as unknown as SceneClass;
}

const Workshop = fakeScene("WorkshopScene");
const Yard = fakeScene("YardScene");

function harness(): { log: string[]; hub: SceneSwitch } {
  const log: string[] = [];
  const live = new Set<string>();
  const swapper: SceneSwapper = {
    has: (key) => live.has(key),
    stop: (key) => void log.push(`stop:${key}`),
    remove: (key) => {
      live.delete(key);
      log.push(`remove:${key}`);
    },
    add: (scene) => {
      live.add(scene.KEY);
      log.push(`add:${scene.KEY}`);
    },
  };
  return { log, hub: new SceneSwitch(swapper) };
}

describe("SceneSwitch", () => {
  it("touches nothing until Phaser reports READY", () => {
    // Phaser boots asynchronously; before READY the SceneManager only QUEUES,
    // so an add/start issued now is silently dropped — blank canvas, no
    // `current-scene-ready`, every e2e that waits for a scene times out.
    const { log, hub } = harness();
    hub.show(Workshop);
    expect(log).toEqual([]);
    expect(hub.runningKey).toBeNull();

    // …and the intent survives the wait, rather than being lost.
    hub.markReady();
    expect(log).toEqual(["add:WorkshopScene"]);
    expect(hub.runningKey).toBe("WorkshopScene");
  });

  it("stops the outgoing scene BEFORE removing it", () => {
    // `SceneManager.remove` calls `Systems.destroy`, which emits DESTROY but
    // never SHUTDOWN — and SHUTDOWN is where every scene here drops its
    // EventBus subscriptions. Remove without stop and the dead instance keeps
    // answering the bus over a torn-down display list.
    const { log, hub } = harness();
    hub.markReady();
    hub.show(Workshop);
    hub.show(Yard);
    expect(log).toEqual([
      "add:WorkshopScene",
      "stop:WorkshopScene",
      "remove:WorkshopScene",
      "add:YardScene",
    ]);
  });

  it("gives every visit a fresh scene instance", () => {
    // `SceneManager.start` on a live scene REUSES the instance, so fields set
    // in `create` (notably `BackgroundScene.ready`, which gates React's state
    // pushes) would survive into the next visit. Booting a game per view used
    // to guarantee freshness; remove-then-add is how we keep that guarantee
    // while the TextureManager — the thing actually worth sharing — lives on.
    const { log, hub } = harness();
    hub.markReady();
    hub.show(Workshop);
    hub.show(Yard);
    log.length = 0;
    hub.show(Workshop);
    expect(log).toEqual(["stop:YardScene", "remove:YardScene", "add:WorkshopScene"]);
  });

  it("ignores a repeat request for the scene already running", () => {
    // React StrictMode double-invokes effects in dev; without this the second
    // invocation would tear the just-created scene down and rebuild it.
    const { log, hub } = harness();
    hub.markReady();
    hub.show(Workshop);
    log.length = 0;
    hub.show(Workshop);
    expect(log).toEqual([]);
  });

  it("never adds a key that is somehow still registered", () => {
    // Belt and braces: two scenes under one key is the failure mode where both
    // render and both answer the EventBus.
    const { log, hub } = harness();
    hub.markReady();
    hub.show(Workshop);
    hub.show(Yard);
    hub.show(Workshop);
    const added = log.filter((entry) => entry.startsWith("add:"));
    const removed = log.filter((entry) => entry.startsWith("remove:"));
    expect(added.length - removed.length).toBe(1);
  });
});
