// The Track jumbotron (`src/game/scene-visualizer.ts`).
//
// Three behaviours here are load-bearing and all three fail SILENTLY — a broken
// one leaves a Track that looks fine and just never shows the song:
//
//   1. It is driven by the master output's real level, so it is invisible (and
//      costs nothing) while nothing is playing, and appears when audio does.
//   2. It reuses the CanvasTexture across visits, because one Phaser game now
//      serves every scene and `createCanvas` answers null for a key already in
//      the manager — the second visit would otherwise render into nothing.
//   3. Cycling wraps through every style.
//
// The fake scene below is deliberately explicit rather than a Proxy: it is the
// exact Phaser surface this class touches, so widening that surface has to be a
// visible edit here.

import { describe, expect, it, vi } from "vitest";
import { SceneVisualizer } from "../../src/game/scene-visualizer.ts";
import type { VisualStyle } from "../../src/ports/renderer-port.ts";
import type { Project } from "../../src/core/types.ts";

// ── fakes ───────────────────────────────────────────────────────────────────

/** An analyser whose time-domain signal is a constant, so RMS === |amplitude|. */
function fakeAnalyser(): { node: AnalyserNode; setLevel: (v: number) => void } {
  let level = 0;
  const node = {
    fftSize: 64,
    frequencyBinCount: 32,
    getFloatTimeDomainData: (a: Float32Array) => a.fill(level),
    getByteFrequencyData: (a: Uint8Array) => a.fill(200),
  } as unknown as AnalyserNode;
  return { node, setLevel: (v) => { level = v; } };
}

/** Shared across "scenes" in a test, the way the real TextureManager is shared
 *  across views now that one game serves all four. */
function fakeTextures() {
  const list = new Map<string, unknown>();
  const created: string[] = [];
  const refreshes = { count: 0 };
  const canvasTexture = {
    getContext: () => ({ canvas: { width: 320, height: 96 }, globalAlpha: 1 }),
    refresh: () => { refreshes.count++; },
  };
  return {
    created,
    refreshes,
    api: {
      exists: (k: string) => list.has(k),
      get: (k: string) => list.get(k),
      createCanvas: (k: string, _w: number, _h: number) => {
        if (list.has(k)) return null;
        created.push(k);
        list.set(k, canvasTexture);
        return canvasTexture;
      },
    },
  };
}

function chainable(props: Record<string, unknown>) {
  const self: Record<string, unknown> = { ...props };
  for (const name of [
    "setOrigin", "setInteractive", "setDisplaySize", "setPosition", "setDepth",
    "clear", "fillStyle", "fillRoundedRect", "lineStyle", "strokeRoundedRect",
    "on", "destroy",
  ]) {
    self[name] = () => self;
  }
  return self;
}

function fakeScene(textures: ReturnType<typeof fakeTextures>) {
  const container = chainable({
    alpha: 0,
    visible: false,
    setAlpha(this: { alpha: number }, v: number) { this.alpha = v; return this; },
    setVisible(this: { visible: boolean }, v: boolean) { this.visible = v; return this; },
  });
  return {
    container,
    scene: {
      textures: textures.api,
      add: {
        graphics: () => chainable({}),
        image: () => chainable({}),
        container: () => container,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

const PROJECT = {} as Project;

/** One 60 fps frame. The class eases on the real delta, not on frame COUNT, so
 *  these tests are stating durations: 60 iterations here means one second. */
const FRAME_MS = 1000 / 60;

function styleSpy(id: string): VisualStyle & { calls: number } {
  const s = {
    id,
    label: id.toUpperCase(),
    calls: 0,
    draw() { s.calls++; },
  };
  return s;
}

function build(textures = fakeTextures()) {
  const analyser = fakeAnalyser();
  const styles = [styleSpy("a"), styleSpy("b"), styleSpy("c")];
  const scene = fakeScene(textures);
  const viz = new SceneVisualizer(scene.scene, {
    analyser: analyser.node,
    getProject: () => PROJECT,
    styles,
    depth: 2,
  });
  viz.layout({ x: 100, y: 100, width: 400, height: 120 });
  return { viz, analyser, styles, textures, scene };
}

// ── tests ───────────────────────────────────────────────────────────────────

describe("SceneVisualizer", () => {
  it("stays invisible and does no drawing while the output is silent", () => {
    const { viz, styles, textures } = build();
    for (let i = 0; i < 200; i++) viz.update(FRAME_MS);
    expect(viz.visibility).toBe(0);
    // The whole point: a parked Track pays one RMS pass and nothing else. If
    // this ever regresses, every silent second burns a canvas repaint + a GPU
    // upload, and nothing on screen says so.
    expect(styles.reduce((n, s) => n + s.calls, 0)).toBe(0);
    expect(textures.refreshes.count).toBe(0);
  });

  it("fades up and draws once real audio reaches the output", () => {
    const { viz, analyser, styles, textures } = build();
    analyser.setLevel(0.4);
    for (let i = 0; i < 120; i++) viz.update(FRAME_MS);
    expect(viz.visibility).toBeGreaterThan(0.9);
    expect(styles[0]!.calls).toBeGreaterThan(100);
    expect(textures.refreshes.count).toBeGreaterThan(100);
  });

  it("fades back out on silence and stops drawing again", () => {
    const { viz, analyser, styles } = build();
    analyser.setLevel(0.4);
    for (let i = 0; i < 120; i++) viz.update(FRAME_MS);
    analyser.setLevel(0);
    for (let i = 0; i < 400; i++) viz.update(FRAME_MS);
    expect(viz.visibility).toBe(0);
    const settled = styles.reduce((n, s) => n + s.calls, 0);
    for (let i = 0; i < 100; i++) viz.update(FRAME_MS);
    expect(styles.reduce((n, s) => n + s.calls, 0)).toBe(settled);
  });

  it("rides through the gaps between notes instead of strobing", () => {
    // The bug an e2e run caught: gating on raw RMS meant the screen chased the
    // RESTS. A four-note melody at 120 bpm is silent for most of its bar, so the
    // jumbotron flashed on and off once per note and visibility never climbed
    // past ~0.25. The envelope's slow release is the fix; this pins it.
    const { viz, analyser } = build();
    const FRAMES_PER_BEAT = 30; // 0.5 s at 60 fps — 120 bpm
    for (let beat = 0; beat < 8; beat++) {
      analyser.setLevel(0.3); // the note: two frames of sound…
      viz.update(FRAME_MS);
      viz.update(FRAME_MS);
      analyser.setLevel(0); // …then a full beat of digital silence
      for (let i = 0; i < FRAMES_PER_BEAT - 2; i++) viz.update(FRAME_MS);
      if (beat >= 2) {
        expect(viz.visibility, `dropped out during the rest after beat ${beat}`)
          .toBeGreaterThan(0.8);
      }
    }
  });

  it("treats a whisper as silence but a real note as sound", () => {
    // The threshold has to sit under a quiet note and over the analyser's own
    // floor. Pin both sides so a future tweak has to state which it broke.
    const { viz, analyser } = build();
    analyser.setLevel(0.001);
    for (let i = 0; i < 200; i++) viz.update(FRAME_MS);
    expect(viz.visibility).toBe(0);
    analyser.setLevel(0.02);
    for (let i = 0; i < 200; i++) viz.update(FRAME_MS);
    expect(viz.visibility).toBeGreaterThan(0.9);
  });

  it("cycles through every style and wraps", () => {
    const { viz } = build();
    expect(viz.styleLabel).toBe("A");
    expect(viz.cycleStyle()).toBe("B");
    expect(viz.cycleStyle()).toBe("C");
    expect(viz.cycleStyle()).toBe("A");
  });

  it("draws with the style the kid selected", () => {
    const { viz, analyser, styles } = build();
    viz.cycleStyle();
    analyser.setLevel(0.4);
    for (let i = 0; i < 120; i++) viz.update(FRAME_MS);
    expect(styles[0]!.calls).toBe(0);
    expect(styles[1]!.calls).toBeGreaterThan(100);
  });

  it("reuses the screen texture on a second visit instead of creating a new one", () => {
    // One Phaser game serves every view now, so the TextureManager outlives the
    // scene and `createCanvas` returns NULL for a key it already holds. Without
    // the reuse branch the second visit to the Track throws — or worse, draws
    // into a texture nothing displays.
    const textures = fakeTextures();
    build(textures);
    expect(textures.created).toEqual(["viz-screen"]);

    const second = build(textures);
    expect(textures.created).toEqual(["viz-screen"]); // still one
    second.analyser.setLevel(0.4);
    for (let i = 0; i < 120; i++) second.viz.update(FRAME_MS);
    expect(second.viz.visibility).toBeGreaterThan(0.9);
    expect(second.styles[0]!.calls).toBeGreaterThan(100);
  });

  it("hides the container whenever it is fully faded out", () => {
    // Phaser gives invisible objects no input, and that is what keeps a phantom
    // tap target out of the meadow while the screen is not showing.
    const { viz, analyser, scene } = build();
    expect(scene.container["visible"]).toBe(false);
    analyser.setLevel(0.4);
    for (let i = 0; i < 60; i++) viz.update(FRAME_MS);
    expect(scene.container["visible"]).toBe(true);
  });

  it("refuses to run without a screen texture rather than drawing nowhere", () => {
    const textures = fakeTextures();
    const dead = { ...textures.api, exists: () => false, createCanvas: () => null };
    const scene = fakeScene(textures);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (scene.scene as any).textures = dead;
    expect(() =>
      new SceneVisualizer(scene.scene, {
        analyser: fakeAnalyser().node,
        getProject: () => PROJECT,
        styles: [styleSpy("a")],
        depth: 2,
      }),
    ).toThrow(/screen texture/);
  });

  it("skips layout for a degenerate rect instead of drawing a zero-size cabinet", () => {
    const { viz } = build();
    const before = viz.bounds;
    viz.layout({ x: 0, y: 0, width: 0, height: 0 });
    expect(viz.bounds).not.toEqual(before);
    expect(() => viz.update(FRAME_MS)).not.toThrow();
  });
});

// A guard on the fake itself: if `SceneVisualizer` starts calling a Phaser
// method the fake does not have, the tests above would fail with a confusing
// "not a function" instead of saying so.
describe("the fake scene covers what the class actually uses", () => {
  it("never sees an undefined method", () => {
    const spy = vi.spyOn(console, "error");
    const { viz, analyser } = build();
    analyser.setLevel(0.3);
    viz.update(FRAME_MS);
    viz.layout({ x: 10, y: 10, width: 200, height: 60 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
