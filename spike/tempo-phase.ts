// Phase 1 / test 0 — does a mid-song tempo change keep the song in phase?
//
// THROWAWAY SPIKE. Not part of the app, not in the production module graph
// (`index.html` is the only build entry), so importing Tone here does not break
// the "Tone only in the adapter" architecture rule — that guard globs `src/**`
// and this lives at the repo root.
//
// jsdom has no Web Audio, so this cannot be a Vitest unit test. It runs in real
// Chromium under Tone's OFFLINE renderer, which is deterministic: same input,
// same samples, every time. We measure the rendered audio, not our intentions.

import * as Tone from "tone";

const SR = 8000; // plenty for onset timing, cheap to render
const CLICK_MS = 4;

/** A short click, so an onset is unambiguous in the rendered buffer. */
function clickBuffer(ctx: BaseAudioContext): AudioBuffer {
  const n = Math.round((CLICK_MS / 1000) * ctx.sampleRate);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (1 - i / n) ** 2; // decaying spike
  return buf;
}

/** Rising edges above `thresh`, in seconds, with a refractory gap. */
function onsets(data: Float32Array, sr: number, thresh = 0.2): number[] {
  const out: number[] = [];
  let armed = true;
  let lastIdx = -1e9;
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i]!);
    if (armed && v > thresh && i - lastIdx > sr * 0.02) {
      out.push(i / sr);
      lastIdx = i;
      armed = false;
    } else if (!armed && v < thresh * 0.5) {
      armed = true;
    }
  }
  return out;
}

const r3 = (x: number): number => Math.round(x * 1000) / 1000;

/** Gaps between successive onsets. */
function gaps(ts: number[]): number[] {
  return ts.slice(1).map((t, i) => r3(t - ts[i]!));
}

type Result = { name: string; lines: string[] };
const results: Result[] = [];

function report(name: string, lines: string[]): void {
  results.push({ name, lines });
}

// ---------------------------------------------------------------------------
// A — pure bpm change, NO reschedule. Does the already-scheduled grid follow?
// ---------------------------------------------------------------------------
async function expA(): Promise<void> {
  const DUR = 10;
  const buf = await Tone.Offline(async (ctx) => {
    const t = ctx.transport;
    const click = clickBuffer(ctx.rawContext as unknown as BaseAudioContext);
    const player = new Tone.Player(click).toDestination();
    t.bpm.value = 120;
    // one click per quarter note, forever
    t.scheduleRepeat((time) => player.start(time), "4n", 0);
    // at exactly 4 s (= bar 2 at 120bpm), halve the tempo
    t.bpm.setValueAtTime(60, 4);
    t.start(0);
  }, DUR, 1, SR);

  const ts = onsets(buf.getChannelData(0), SR);
  const g = gaps(ts);
  report("A — pure bpm change, no reschedule", [
    `onsets: ${ts.map(r3).join(" ")}`,
    `gaps:   ${g.join(" ")}`,
    `before 4s: expect 0.5 spacing → ${g.filter((_, i) => ts[i]! < 3.9).join(" ")}`,
    `after  4s: expect 1.0 spacing → ${g.filter((_, i) => ts[i]! >= 4).join(" ")}`,
  ]);
}

// ---------------------------------------------------------------------------
// B — what `reconcile()` ACTUALLY does: setTempo, then cancel(), then
//     re-scheduleRepeat every step at an offset computed in SECONDS at the new
//     tempo. This is the real code path a hill would take. Does the beat grid
//     survive it, or does the song jump?
// ---------------------------------------------------------------------------
async function expB(at: number): Promise<void> {
  const DUR = 10;
  const STEPS = 4; // 4 steps per bar, like a quarter-note grid

  const buf = await Tone.Offline(async (ctx) => {
    const t = ctx.transport;
    const click = clickBuffer(ctx.rawContext as unknown as BaseAudioContext);
    const player = new Tone.Player(click).toDestination();

    // Mirrors ToneSoundPort.scheduleStep: interval "1m", offset in SECONDS.
    // NB: the adapter uses `Tone.Time("1m").toSeconds()`, which reads the GLOBAL
    // transport — correct in the app (one transport) but wrong under Offline,
    // so we derive the bar length from THIS transport's own bpm instead.
    const schedule = (): void => {
      const barSec = (60 / t.bpm.value) * 4;
      for (let i = 0; i < STEPS; i++) {
        const offset = (barSec / STEPS) * i;
        t.scheduleRepeat((time) => player.start(time), "1m", offset);
      }
    };

    t.bpm.value = 120;
    schedule();

    // The tempo change, exactly as AudioEngine.reconcile sequences it.
    t.scheduleOnce(() => {
      t.bpm.value = 60;   // setTempo
      t.cancel();         // clearScheduled
      schedule();         // re-schedule at the new tempo
    }, at);

    t.start(0);
  }, DUR, 1, SR);

  const ts = onsets(buf.getChannelData(0), SR);
  const g = gaps(ts);
  report(`B — reconcile() path (bpm + cancel + reschedule) at t=${at}`, [
    `onsets: ${ts.map(r3).join(" ")}`,
    `gaps:   ${g.join(" ")}`,
    `expect after ${at}s: 1.0 spacing, unbroken. A dropped beat = a double gap.`,
  ]);
}

// ---------------------------------------------------------------------------
// D — the PROPOSED hill: change bpm and playbackRate only. No cancel, no
//     reschedule, no re-bake. If this is clean it is strictly better than the
//     reconcile path and removes the cost/cache risks the plan budgeted for.
// ---------------------------------------------------------------------------
async function expD(ramp: boolean): Promise<void> {
  const DUR = 14;
  const buf = await Tone.Offline(async (ctx) => {
    const t = ctx.transport;
    const raw = ctx.rawContext as unknown as BaseAudioContext;

    const loopLen = Math.round(2 * SR); // 1 bar @120
    const loop = raw.createBuffer(1, loopLen, SR);
    const d = loop.getChannelData(0);
    const stamp = (at: number): void => {
      const n = Math.round((CLICK_MS / 1000) * SR);
      for (let i = 0; i < n; i++) d[Math.round(at * SR) + i] = (1 - i / n) ** 2;
    };
    stamp(0);
    stamp(1);

    const player = new Tone.Player(loop).toDestination();
    t.bpm.value = 120;
    t.scheduleRepeat((time) => player.start(time), "1m", 0);

    // Bar 2 (t=4s): go down the hill. Bar 4 (t≈8s at 60bpm): come back up.
    if (ramp) {
      // A hill is a slope, not a step: ramp over one bar and back.
      t.bpm.setValueAtTime(120, 4);
      t.bpm.linearRampToValueAtTime(60, 6);
      player.playbackRate = 1;
      t.scheduleOnce(() => { player.playbackRate = 0.5; }, 6);
    } else {
      t.bpm.setValueAtTime(60, 4);
      t.scheduleOnce(() => { player.playbackRate = 0.5; }, 4);
    }
    t.scheduleOnce(() => {
      t.bpm.value = 120;
      player.playbackRate = 1;
    }, 12);

    t.start(0);
  }, DUR, 1, SR);

  const ts = onsets(buf.getChannelData(0), SR);
  report(`D — hill via bpm+playbackRate only, ${ramp ? "ramped" : "stepped"}`, [
    `onsets: ${ts.map(r3).join(" ")}`,
    `gaps:   ${gaps(ts).join(" ")}`,
    `expect: NO hole. Gaps stretch 1.0 → 2.0 while slow, back to 1.0 after 12s.`,
  ]);
}

// ---------------------------------------------------------------------------
// C — the sample problem. A voice loop baked to exactly 1 bar @120 (2 s) is a
//     FIXED buffer. When the tempo halves, does it drift? And can playbackRate
//     re-lock it without a re-bake (which is what the plan budgeted for)?
// ---------------------------------------------------------------------------
async function expC(rate: "none" | "scaled"): Promise<void> {
  const DUR = 10;
  const buf = await Tone.Offline(async (ctx) => {
    const t = ctx.transport;
    const raw = ctx.rawContext as unknown as BaseAudioContext;

    // A 2-second "loop": clicks at 0 and 1 s — i.e. beats 1 and 3 of a bar @120.
    const loopLen = Math.round(2 * SR);
    const loop = raw.createBuffer(1, loopLen, SR);
    const d = loop.getChannelData(0);
    const stamp = (at: number): void => {
      const n = Math.round((CLICK_MS / 1000) * SR);
      for (let i = 0; i < n; i++) d[Math.round(at * SR) + i] = (1 - i / n) ** 2;
    };
    stamp(0);
    stamp(1);

    const player = new Tone.Player(loop).toDestination();
    t.bpm.value = 120;
    t.scheduleRepeat((time) => player.start(time), "1m", 0);

    t.scheduleOnce(() => {
      t.bpm.value = 60;
      // The whole question: can a fixed buffer follow the tempo for free?
      if (rate === "scaled") player.playbackRate = 60 / 120;
      t.cancel();
      const barSec = Tone.Time("1m").toSeconds();
      void barSec;
      t.scheduleRepeat((time) => player.start(time), "1m", 0);
    }, 4);

    t.start(0);
  }, DUR, 1, SR);

  const ts = onsets(buf.getChannelData(0), SR);
  report(`C(${rate}) — baked 1-bar loop across a tempo halving`, [
    `onsets: ${ts.map(r3).join(" ")}`,
    `gaps:   ${gaps(ts).join(" ")}`,
    rate === "none"
      ? `expect AFTER 4s: clicks still 1.0 s apart inside a 4 s bar → drift/gap`
      : `expect AFTER 4s: clicks 2.0 s apart, filling the 4 s bar → locked`,
  ]);
}

// ---------------------------------------------------------------------------
// E — the bridge (reverb) and the rain (distortion), LIVE. Tone.Reverb has to
//     generate an impulse response and exposes `.ready`; the plan flagged that
//     as new work. Question: can both be built ONCE at boot, left in the chain
//     at wet 0, and simply ramped? If so there is no await on the hot path.
// ---------------------------------------------------------------------------
async function expE(): Promise<void> {
  const DUR = 8;
  const buf = await Tone.Offline(async (ctx) => {
    const t = ctx.transport;
    const click = clickBuffer(ctx.rawContext as unknown as BaseAudioContext);

    // Built once, up front — the "boot" moment.
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0 }).toDestination();
    await reverb.ready; // the only await, and it happens before playback
    const dist = new Tone.Distortion({ distortion: 0.9, wet: 0 }).connect(reverb);
    const player = new Tone.Player(click).connect(dist);

    t.bpm.value = 120;
    t.scheduleRepeat((time) => player.start(time), "4n", 0);
    // dry ... then bridge ... then rain
    t.scheduleOnce(() => { reverb.wet.rampTo(1, 0.05); }, 2);
    t.scheduleOnce(() => { reverb.wet.rampTo(0, 0.05); }, 4);
    t.scheduleOnce(() => { dist.wet.rampTo(1, 0.05); }, 6);
    t.start(0);
  }, DUR, 1, SR);

  // Energy in the 300 ms AFTER each click: a reverb tail shows up as a big jump.
  const d = buf.getChannelData(0);
  const tailAt = (sec: number): number => {
    const a = Math.round((sec + 0.02) * SR);
    const b = Math.round((sec + 0.32) * SR);
    let s = 0;
    for (let i = a; i < b && i < d.length; i++) s += d[i]! * d[i]!;
    return r3(Math.sqrt(s / (b - a)) * 1000);
  };
  report("E — live reverb + distortion, pre-built at boot", [
    `tail RMS x1000 @ dry(1.0s)=${tailAt(1)}  wet(3.0s)=${tailAt(3)}  ` +
      `dry-again(5.0s)=${tailAt(5)}  distorted(7.0s)=${tailAt(7)}`,
    `expect: wet >> dry, dry-again ≈ dry, distorted > dry.`,
    `reverb.ready resolved BEFORE transport start → no await on the hot path.`,
  ]);
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const out = document.getElementById("out") as HTMLPreElement;
  try {
    await expA();
    await expB(4);   // exactly on a bar boundary
    await expB(3.9); // just before one — the "apply at the next bar" case
    await expC("none");
    await expC("scaled");
    await expD(false);
    await expD(true);
    await expE();
    const text = results
      .map((r) => `### ${r.name}\n${r.lines.join("\n")}`)
      .join("\n\n");
    out.textContent = text;
    (window as unknown as { __spike__: string }).__spike__ = text;
  } catch (err) {
    const text = `FAILED: ${String(err)}\n${(err as Error)?.stack ?? ""}`;
    out.textContent = text;
    (window as unknown as { __spike__: string }).__spike__ = text;
  }
}

void main();
