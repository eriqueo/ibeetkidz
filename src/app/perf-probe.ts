// `?perf` — an opt-in field recorder for "it is laggy on MY machine".
//
// Lab fixtures never reproduced the stutter Eric reported, so the measurement
// has to happen where the stutter is. With `?perf` in the URL this mounts a
// small readout and keeps the last few minutes of per-second summaries: frame
// pacing, how the frame splits between Phaser's update and render, main-thread
// long tasks, and the audio scheduler's late events and live resource counts.
// COPY hands the whole report to the clipboard (SAVE downloads it) so it can
// be pasted back. Nothing is sent anywhere — the app stays network-free — and
// the report carries counts only, never a recording or a song's contents.
//
// Absent the flag this file does nothing: no listeners, no DOM, no rAF.

import type Phaser from "phaser";

export interface PerfProbeDeps {
  /** Audio scheduler + resource counters (the adapter's `getAudioDiag`). */
  audioDiag: () => Record<string, unknown>;
  /** Counts that describe the song's size, never its contents. */
  songShape: () => Record<string, number>;
  /** Subscribe to "a scene became current". */
  onScene: (listener: (scene: Phaser.Scene) => void) => void;
}

/** Seconds of history kept. Bounded: the oldest second is dropped at the cap. */
const HISTORY_SEC = 300;
/** Long tasks kept, newest last; the oldest is dropped at the cap. */
const LONG_TASK_CAP = 200;

interface SecondRow {
  t: number;
  scene: string;
  frames: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
  over33: number;
  over50: number;
  updateMeanMs: number;
  updateMaxMs: number;
  renderMeanMs: number;
  renderMaxMs: number;
  objects: number;
  transport: unknown;
  late20: number;
  worstLateMs: unknown;
  schedEvents: number;
  melodyVoices: unknown;
  samplePlayers: unknown;
  fxNodes: unknown;
  lookAheadSec: unknown;
  heapMB: number | null;
  /** Frames on which a riding train was drawn where it already was. Frame
   *  pacing cannot see this: the first field report showed a perfect 165 fps
   *  while the world moved 23 times a second. */
  stillFrames: number;
  /** Largest single-frame move over the mean move; 1 is perfectly even. */
  motionUneven: number;
}

const round = (n: number): number => Math.round(n * 10) / 10;
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

export function attachPerfProbe(deps: PerfProbeDeps): void {
  if (typeof window === "undefined") return;
  if (!new URLSearchParams(window.location.search).has("perf")) return;

  const startedAt = performance.now();
  const rows: SecondRow[] = [];
  const longTasks: { t: number; ms: number }[] = [];
  let scene: Phaser.Scene | null = null;
  let hooked: Phaser.Game | null = null;

  let intervals: number[] = [];
  let updates: number[] = [];
  let renders: number[] = [];
  let stepAt = 0;
  let renderAt = 0;
  let moves: number[] = [];
  let drawnAt: number | null = null;

  deps.onScene((next) => {
    scene = next;
    if (hooked === next.game) return;
    hooked = next.game;
    // Phaser's own step boundaries split a frame into update vs render (CPU
    // side of render only — GPU time shows up as a long frame with short both).
    next.game.events.on("prestep", () => { stepAt = performance.now(); });
    next.game.events.on("prerender", () => {
      renderAt = performance.now();
      updates.push(renderAt - stepAt);
    });
    next.game.events.on("postrender", () => { renders.push(performance.now() - renderAt); });
  });

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({ t: round((entry.startTime - startedAt) / 1000), ms: round(entry.duration) });
        if (longTasks.length > LONG_TASK_CAP) longTasks.shift();
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // Safari has no longtask entries; long frames still show in the intervals.
  }

  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:99999;font:12px/1.35 monospace;" +
    "background:rgba(0,0,0,.78);color:#fff;padding:6px 8px;border-radius:6px;" +
    "pointer-events:auto;user-select:none;max-width:60vw";
  const readout = document.createElement("div");
  const button = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "font:12px monospace;margin:4px 6px 0 0;padding:4px 8px;cursor:pointer";
    b.addEventListener("click", onClick);
    return b;
  };

  const stats = (values: number[]): { mean: number; p95: number; max: number } => {
    if (values.length === 0) return { mean: 0, p95: 0, max: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    return {
      mean: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
      p95: round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0),
      max: round(sorted[sorted.length - 1] ?? 0),
    };
  };

  const environment = (): Record<string, unknown> => {
    const game = hooked;
    let gpu: unknown = null;
    const renderer = game?.renderer as { gl?: WebGLRenderingContext } | undefined;
    const gl = renderer?.gl;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }
    const nav = navigator as Navigator & { deviceMemory?: number };
    return {
      userAgent: nav.userAgent,
      cores: nav.hardwareConcurrency,
      deviceMemoryGB: nav.deviceMemory ?? null,
      devicePixelRatio: window.devicePixelRatio,
      window: [window.innerWidth, window.innerHeight],
      canvas: game ? [game.canvas.width, game.canvas.height] : null,
      canvasCss: game ? [game.canvas.clientWidth, game.canvas.clientHeight] : null,
      renderer: gl ? "webgl" : "canvas",
      gpu,
      url: window.location.href,
      visibility: document.visibilityState,
    };
  };

  const report = (): string =>
    JSON.stringify(
      {
        kind: "ibeetkidz-perf-report",
        version: 1,
        recordedSec: round((performance.now() - startedAt) / 1000),
        environment: environment(),
        song: deps.songShape(),
        audioNow: deps.audioDiag(),
        longTasks,
        seconds: rows,
      },
      null,
      1,
    );

  const save = (): void => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([report()], { type: "application/json" }));
    a.download = "ibeetkidz-perf-report.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const copy = button("COPY REPORT", () => {
    void navigator.clipboard.writeText(report()).then(
      () => { copy.textContent = "COPIED"; setTimeout(() => { copy.textContent = "COPY REPORT"; }, 1500); },
      save, // clipboard refused (permissions, insecure context) → download instead
    );
  });
  box.append(readout, copy, button("SAVE FILE", save));
  document.body.append(box);

  let last = performance.now();
  let secondStart = last;
  let lateBase = -1;
  let eventsBase = 0;
  const tick = (now: number): void => {
    intervals.push(now - last);
    last = now;
    // A number only while the train rides; see TrackV3Scene.songPosition.
    const drawn = (scene as { songPosition?: unknown } | null)?.songPosition;
    if (typeof drawn === "number") {
      if (drawnAt !== null) moves.push(Math.abs(drawn - drawnAt));
      drawnAt = drawn;
    } else {
      drawnAt = null;
    }
    if (now - secondStart >= 1000) {
      const frame = stats(intervals);
      const update = stats(updates);
      const render = stats(renders);
      const total = moves.reduce((a, b) => a + b, 0);
      const motion = { mean: total / Math.max(1, moves.length), max: Math.max(0, ...moves) };
      const diag = deps.audioDiag();
      const late = num(diag["schedLate20"]);
      const events = num(diag["schedEvents"]);
      if (lateBase < 0) { lateBase = late; eventsBase = events; }
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const row: SecondRow = {
        t: round((now - startedAt) / 1000),
        scene: scene?.scene.key ?? "",
        frames: intervals.length,
        meanMs: frame.mean,
        p95Ms: frame.p95,
        maxMs: frame.max,
        over33: intervals.filter((ms) => ms > 33.4).length,
        over50: intervals.filter((ms) => ms > 50).length,
        updateMeanMs: update.mean,
        updateMaxMs: update.max,
        renderMeanMs: render.mean,
        renderMaxMs: render.max,
        objects: scene?.children.length ?? 0,
        transport: diag["transportState"],
        late20: late - lateBase,
        worstLateMs: diag["schedWorstLateMs"],
        schedEvents: events - eventsBase,
        melodyVoices: diag["melodyVoices"],
        samplePlayers: diag["samplePlayers"],
        fxNodes: diag["fxNodes"],
        lookAheadSec: diag["lookAheadSec"],
        heapMB: memory ? round(memory.usedJSHeapSize / 1048576) : null,
        stillFrames: moves.filter((m) => m === 0).length,
        motionUneven: moves.length > 0 && motion.mean > 0 ? round(motion.max / motion.mean) : 0,
      };
      lateBase = late;
      eventsBase = events;
      rows.push(row);
      if (rows.length > HISTORY_SEC) rows.shift();
      readout.textContent =
        `${row.frames} fps · frame ${row.meanMs}/${row.p95Ms}/${row.maxMs} ms (mean/p95/max)\n` +
        `update ${row.updateMeanMs} · render ${row.renderMeanMs} ms · slow frames ${row.over33}\n` +
        `audio late ${row.late20} · voices ${String(row.melodyVoices)}+${String(row.samplePlayers)} · ${rows.length}s kept\n` +
        `motion: still frames ${row.stillFrames} · unevenness ${row.motionUneven}`;
      readout.style.whiteSpace = "pre";
      intervals = [];
      updates = [];
      renders = [];
      moves = [];
      secondStart = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
