// The policy half of "one Phaser game, four views" — which scene should be
// running, and in what order the SceneManager is driven to get there.
//
// It is split out from `game-host.ts` (the Phaser wiring) for one reason: the
// ordering rules below are the entire refactor, three of them are non-obvious,
// and all three are unreachable from a test that needs a WebGL context. Against
// the narrow `SceneSwapper` port they are ordinary assertions.
//
// The rules, and why each exists:
//
//  1. NOTHING BEFORE READY. Phaser boots asynchronously. Until then the
//     SceneManager only queues, so an `add`/`start` issued now is silently
//     dropped: blank canvas, no `current-scene-ready`, every e2e that waits on
//     a scene times out.
//  2. STOP BEFORE REMOVE. `SceneManager.remove` calls `Systems.destroy`, which
//     emits DESTROY but NOT SHUTDOWN — and SHUTDOWN is where every scene in
//     this repo drops its EventBus subscriptions (`YardScene`, `WorkshopScene`,
//     `BackgroundScene`'s resize hook). Remove without stop and the dead
//     instance keeps answering the bus over a torn-down display list.
//  3. REMOVE, DON'T RESTART. `SceneManager.start` on a live scene reuses the
//     SAME instance, so every field a scene set in `create` survives into the
//     next visit — including `BackgroundScene.ready`, which gates React's state
//     pushes. Removing and re-adding gives each visit a fresh instance, which
//     is exactly what booting a game per view used to give us. The shared
//     TextureManager is the thing we are keeping alive; scene state is not.

import type Phaser from "phaser";

/** A view scene: constructible with no arguments, carrying its own key. */
export interface SceneClass {
  readonly KEY: string;
  new (): Phaser.Scene;
}

/**
 * The four SceneManager operations the switch is allowed to use. Narrow on
 * purpose — it is both the test seam and the contract.
 */
export interface SceneSwapper {
  /** Is a scene with this key currently registered? */
  has(key: string): boolean;
  /** Run the scene's SHUTDOWN path (this is what releases EventBus subs). */
  stop(key: string): void;
  /** Destroy and unregister the scene instance. */
  remove(key: string): void;
  /** Register a fresh instance and start it. */
  add(scene: SceneClass): void;
}

export class SceneSwitch {
  private ready = false;
  private desired: SceneClass | null = null;
  private running: string | null = null;

  constructor(private readonly swapper: SceneSwapper) {}

  /** The key currently on screen, or null before the first scene starts. */
  get runningKey(): string | null {
    return this.running;
  }

  /** Phaser has finished booting; queued intent may now be applied. */
  markReady(): void {
    this.ready = true;
    this.apply();
  }

  /** Ask for `scene` to be the one running. Safe to call before boot, and safe
   *  to call repeatedly with the same scene (React StrictMode re-runs effects). */
  show(scene: SceneClass): void {
    this.desired = scene;
    this.apply();
  }

  private apply(): void {
    const next = this.desired;
    if (!this.ready || !next || next.KEY === this.running) return;
    if (this.running) {
      this.swapper.stop(this.running);
      this.swapper.remove(this.running);
      this.running = null;
    }
    // A key can survive a failed swap (or arrive pre-registered); never add twice.
    if (this.swapper.has(next.KEY)) {
      this.swapper.stop(next.KEY);
      this.swapper.remove(next.KEY);
    }
    this.swapper.add(next);
    this.running = next.KEY;
  }
}
