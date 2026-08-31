// "See the sound" — the visualizer, living in the Track view.
//
// The three `VisualStyle`s (bars / lava / retro scope) are UNCHANGED. They draw
// into a `CanvasRenderingContext2D`, and Phaser's `CanvasTexture` hands us
// exactly that, backed by a GPU texture — so this is a new HOST for them, not a
// rewrite. Decision A1 parked the visualizer rather than deleting it precisely
// because the styles are the part worth keeping; `RendererPort`'s `VisualStyle`
// is the seam that made re-homing a hosting change instead of a rewrite.
//
// Three decisions worth knowing before you move this:
//
// 1. IT HAS A CABINET. The styles were colour-picked against a dark ground
//    (#29242e) for the old DOM panel. The Track's oval interior is bright green
//    meadow, so compositing them straight onto it — additive or screen — blows
//    out to white. Instead it renders as a jumbotron: a Graphics cabinet in the
//    scene's own chip language (cream bezel + plum ground, the same treatment
//    `TrackScene.layoutChrome` gives the SPEED LCD), with the styles drawing
//    onto their intended dark ground inside it. No new art needed.
//
// 2. IT IS INVISIBLE UNLESS THE SONG IS ACTUALLY SOUNDING. Alpha follows the
//    master output's own RMS, so the Track looks exactly as painted whenever
//    nothing is playing, and the draw is skipped entirely once faded out — a
//    silent Track costs zero per-frame canvas work. This also keeps the old
//    design's promise that there is no motion when the kid isn't watching.
//    The signal is the analyser, i.e. what actually reached the speakers, not a
//    transport flag that can claim sound the audio graph never produced.
//
// 3. IT RENDERS SMALL AND SCALES UP. 320x96 backing store stretched across the
//    cabinet: cheap per frame, and under the game's `pixelArt: true` the
//    nearest-neighbour upscale gives chunky pixels that match the 16-bit art
//    instead of fighting it.
import type Phaser from "phaser";
import type { VisualFrame, VisualStyle } from "../ports/renderer-port.ts";
import type { Project } from "../core/types.ts";
import type { Rect } from "./TiledSceneAdapter.ts";

/** Backing-store size. 10:3, matching the authored `viz-screen` rect so the
 *  upscale is uniform on both axes. */
const RENDER_W = 320;
const RENDER_H = 96;

/** Below this envelope level the screen is treated as dark. Chosen well under a
 *  real note and well over the analyser's noise floor; `getAudioDiag`'s
 *  masterPeak reads the same node, so a level that shows there will light this. */
const SILENCE_RMS = 0.004;
/**
 * Peak-hold decay on the level envelope, per frame.
 *
 * NOT a plain RMS threshold, and the difference is the whole feature. Raw RMS
 * goes to zero in the GAPS BETWEEN NOTES — a four-note melody at 120 bpm is
 * silent for most of its bar — so gating on it made the screen strobe on and off
 * once per note. An e2e run caught it: visibility sat around 0.25 instead of
 * climbing, because it was chasing the rests.
 *
 * `env = max(rms, env * decay)` is the level-meter shape: instant attack, slow
 * release, so a musical rest reads as "still playing" and only a genuine stop
 * lets it fall. ~2 s from a note's peak down to the threshold, which comfortably
 * bridges a rest and still clears shortly after STOP.
 *
 * Expressed as a TIME CONSTANT in seconds, not a per-frame factor. Per-frame
 * easing makes every duration here a function of the display: an e2e run at
 * ~27 fps held the screen lit for 5 s after STOP where a 60 fps machine held it
 * for 2 s, and an iPad at 120 Hz would have halved it again. Everything below
 * eases on the frame's own delta so the feel is the same on all three.
 */
const ENV_TAU_S = 0.5;
/** Alpha easing time constants. Quick to appear, gentler to leave. */
const FADE_IN_TAU_S = 0.12;
const FADE_OUT_TAU_S = 0.35;
/** Delta clamp. A backgrounded tab resumes with an enormous delta, which would
 *  otherwise snap the envelope and the fade to their targets in one step. */
const MAX_DT_S = 0.1;
/** Frames between draws under `prefers-reduced-motion` (~10fps at 60). */
const REDUCED_SKIP = 6;
/** Cabinet colours — the scene's chip language (see `TrackScene.layoutChrome`). */
const BEZEL = 0xe9d7ac;
const EDGE = 0x2b2440;

export interface SceneVisualizerOptions {
  /** The master-output tap. Same node `getAudioDiag` reads, so "the visualizer
   *  never lies" stays literally true — it can only show what was played. */
  readonly analyser: AnalyserNode;
  readonly getProject: () => Project;
  readonly styles: readonly VisualStyle[];
  /** Draw order. Must sit above the background and below the train. */
  readonly depth: number;
}

export class SceneVisualizer {
  private readonly scene: Phaser.Scene;
  private readonly opts: SceneVisualizerOptions;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly container: Phaser.GameObjects.Container;
  private readonly cabinet: Phaser.GameObjects.Graphics;
  private readonly screen: Phaser.GameObjects.Image;
  // Pinned to ArrayBuffer, not the default ArrayBufferLike: the Web Audio
  // getters refuse a possibly-shared buffer, and `VisualFrame` accepts the
  // narrower type either way.
  private readonly waveform: Float32Array<ArrayBuffer>;
  private readonly spectrum: Uint8Array<ArrayBuffer>;
  private readonly reduced: boolean;

  private styleIndex = 0;
  private alpha = 0;
  private env = 0;
  private skip = 0;
  private suppressed = false;
  private rect: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(scene: Phaser.Scene, opts: SceneVisualizerOptions) {
    this.scene = scene;
    this.opts = opts;
    this.waveform = new Float32Array(opts.analyser.fftSize);
    this.spectrum = new Uint8Array(opts.analyser.frequencyBinCount);

    // One CanvasTexture per GAME, not per scene visit. The game now outlives
    // every view (game-host.ts), so `createCanvas` answers null the second time
    // the Track is entered — reuse what is already there rather than rendering
    // into nothing. Same rule as every `load.*` call in this codebase.
    const key = "viz-screen";
    const existing = scene.textures.exists(key)
      ? (scene.textures.get(key) as Phaser.Textures.CanvasTexture)
      : null;
    const texture = existing ?? scene.textures.createCanvas(key, RENDER_W, RENDER_H);
    if (!texture) throw new Error("scene-visualizer: could not create the screen texture");
    this.texture = texture;
    this.ctx = texture.getContext();

    this.cabinet = scene.add.graphics();
    this.screen = scene.add.image(0, 0, key).setOrigin(0.5);
    // Interactive ONCE, at the texture's own frame size — the object's scale
    // maps that to whatever `layout` sizes it to, so re-arming on every resize
    // (which rebuilds the hit area for nothing) is not needed. The container is
    // hidden while silent, and Phaser gives invisible objects no input, so the
    // meadow never carries a phantom hit area.
    this.screen.setInteractive({ useHandCursor: true });
    this.container = scene.add
      .container(0, 0, [this.cabinet, this.screen])
      .setDepth(opts.depth)
      .setAlpha(0);

    // Respect prefers-reduced-motion the same way the DOM host did: slower
    // cadence and a dimmer ceiling, so the screen never strobes.
    this.reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** The style currently on screen. Read by the e2e bridge. */
  get styleLabel(): string {
    return this.opts.styles[this.styleIndex]?.label ?? "";
  }

  /** Cabinet alpha, 0..1. Read by the e2e bridge to prove the screen reacts to
   *  real audio rather than to a transport flag. */
  get visibility(): number {
    return this.suppressed ? 0 : this.alpha;
  }

  /** Focus mode owns whether the jumbotron participates at all. The analyser
   *  remains the source of truth when restored; suppression only stops the
   *  visual projection and its hit target. */
  setSuppressed(suppressed: boolean): void {
    if (this.suppressed === suppressed) return;
    this.suppressed = suppressed;
    if (suppressed) {
      this.screen.disableInteractive();
      this.container.setVisible(false).setAlpha(0);
      return;
    }
    this.screen.setInteractive({ useHandCursor: true });
    this.container.setAlpha(this.alpha).setVisible(this.alpha > 0);
  }

  /** Advance to the next style; returns its label. Wired to a tap on the screen
   *  — the only style switcher the v2 UI has room for, and it needs no art. */
  cycleStyle(): string {
    const n = this.opts.styles.length;
    if (n > 0) this.styleIndex = (this.styleIndex + 1) % n;
    return this.styleLabel;
  }

  /** Place the jumbotron. `rect` is the CENTRE + size, matching `placeSpawn`. */
  layout(rect: Rect): void {
    this.rect = rect;
    const { width, height } = rect;
    if (width <= 0 || height <= 0) return;
    this.container.setPosition(rect.x, rect.y);

    // Bezel: a rounded cream frame with a plum edge, drawn container-local.
    const pad = Math.max(6, height * 0.07);
    const ow = width + pad * 2;
    const oh = height + pad * 2;
    const rad = Math.min(oh * 0.18, 22);
    this.cabinet
      .clear()
      .fillStyle(BEZEL, 1)
      .fillRoundedRect(-ow / 2, -oh / 2, ow, oh, rad)
      .lineStyle(Math.max(3, oh * 0.035), EDGE, 1)
      .strokeRoundedRect(-ow / 2, -oh / 2, ow, oh, rad);

    this.screen.setDisplaySize(width, height);
  }

  /** The screen Image, so the scene can attach its own press handling. */
  get hitTarget(): Phaser.GameObjects.Image {
    return this.screen;
  }

  /**
   * One frame. Call from the scene's `update`.
   *
   * Driving off `scene.update` rather than its own `requestAnimationFrame` is
   * deliberate: the loop then starts, stops and pauses exactly with the scene,
   * so the DOM host's manual visibilitychange/start/stop bookkeeping has no
   * equivalent here and cannot get out of balance.
   */
  update(deltaMs: number): void {
    if (this.suppressed) return;
    const dt = Math.min(MAX_DT_S, Math.max(0, deltaMs) / 1000);
    const analyser = this.opts.analyser;
    analyser.getFloatTimeDomainData(this.waveform);

    let sum = 0;
    for (let i = 0; i < this.waveform.length; i++) sum += (this.waveform[i] ?? 0) ** 2;
    const rms = Math.sqrt(sum / this.waveform.length);
    // Instant attack, slow release — see ENV_TAU_S. A rest is not silence.
    this.env = Math.max(rms, this.env * Math.exp(-dt / ENV_TAU_S));
    const live = this.env > SILENCE_RMS;

    const ceiling = this.reduced ? 0.55 : 1;
    const tau = live ? FADE_IN_TAU_S : FADE_OUT_TAU_S;
    this.alpha += ((live ? ceiling : 0) - this.alpha) * (1 - Math.exp(-dt / tau));
    if (this.alpha < 0.004) this.alpha = 0;
    this.container.setAlpha(this.alpha);
    this.container.setVisible(this.alpha > 0);

    // Fully faded out AND silent: nothing to show, so skip the canvas work
    // entirely. A parked Track costs one RMS pass per frame and nothing else.
    if (this.alpha === 0) return;
    if (this.reduced && (this.skip = (this.skip + 1) % REDUCED_SKIP) !== 0) return;

    analyser.getByteFrequencyData(this.spectrum);
    const frame: VisualFrame = { waveform: this.waveform, spectrum: this.spectrum };
    const style = this.opts.styles[this.styleIndex];
    if (!style) return;
    this.ctx.globalAlpha = 1;
    style.draw(this.ctx, frame, this.opts.getProject());
    this.texture.refresh();
  }

  /** Current placement, for the dev scene editor / tests. */
  get bounds(): Rect {
    return this.rect;
  }

  destroy(): void {
    this.container.destroy();
    // The CanvasTexture stays in the game's TextureManager on purpose: the game
    // outlives the scene, and re-entering the Track reuses it (see constructor).
    // It is 320x96 — 120 KB — and re-creating it every visit would churn a GPU
    // texture for nothing.
    void this.scene;
  }
}
