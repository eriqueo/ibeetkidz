// HERO MACHINE: record your voice, then make it crazy.
// Flow target: record -> pick an effect tile -> hear the mangled version, in
// under 4 taps. A/B toggle compares original vs mangled.

import type { Machine, MachineContext } from "../core/machine.ts";
import type { Clip, EffectDescriptor, EffectId } from "../core/types.ts";

const EFFECT_TILES: { id: EffectId; label: string; emoji: string; color: string }[] = [
  { id: "reverse", label: "Backwards", emoji: "⏪", color: "#ff5d8f" },
  { id: "pitchUp", label: "Chipmunk", emoji: "🐿️", color: "#ffd166" },
  { id: "pitchDown", label: "Monster", emoji: "👹", color: "#8338ec" },
  { id: "robot", label: "Robot", emoji: "🤖", color: "#3a86ff" },
  { id: "echo", label: "Echo", emoji: "🌀", color: "#06d6a0" },
  { id: "reverb", label: "Big Room", emoji: "🏛️", color: "#118ab2" },
  { id: "bitcrush", label: "Crunchy", emoji: "🎮", color: "#ef476f" },
  { id: "crazy", label: "CRAZY!", emoji: "🤪", color: "#fb5607" },
];

let clipSeq = 0;
// How strong the effects are (0..1). Driven by the "Wildness" knob in the
// options bar; the effect tiles read it when applying. Module-scoped because
// only one machine instance is ever active.
let wildness = 0.6;

export const recordVoiceFxMachine: Machine = {
  id: "record-voicefx",
  label: "My Voice",
  icon: "🎤",

  mount(host: HTMLElement, ctx: MachineContext): void {
    host.innerHTML = "";
    host.classList.add("machine", "machine--voicefx");

    const recordBtn = document.createElement("button");
    recordBtn.className = "big-record";
    recordBtn.textContent = "🎤 HOLD TO RECORD";

    const status = document.createElement("p");
    status.className = "voicefx-status";
    status.textContent = "Tap the effects to change your voice!";

    const tiles = document.createElement("div");
    tiles.className = "fx-tiles";

    let lastRecordingBuffer: string | null = null;

    const setStatus = (msg: string) => {
      status.textContent = msg;
    };

    // Press-and-hold to record (forgiving: release or pointerleave both stop).
    const startRec = async () => {
      try {
        await ctx.sound.startRecording();
        recordBtn.classList.add("recording");
        setStatus("Recording… let go to stop!");
      } catch (err) {
        // Mic denied / missing: stay usable, fall back to built-in sounds.
        recordBtn.classList.remove("recording");
        setStatus("No mic? No problem — try the Sound Pads! 🥁");
        void err;
      }
    };
    const stopRec = async () => {
      if (!recordBtn.classList.contains("recording")) return;
      recordBtn.classList.remove("recording");
      try {
        lastRecordingBuffer = await ctx.sound.stopRecording();
        const clip = makeRecordingClip(lastRecordingBuffer);
        ctx.dispatch({ type: "addClip", clip });
        ctx.sound.play(clip);
        setStatus("Now tap an effect to make it crazy! 🎉");
      } catch {
        setStatus("Hmm, that didn't record. Try again!");
      }
    };

    recordBtn.addEventListener("pointerdown", startRec);
    recordBtn.addEventListener("pointerup", stopRec);
    recordBtn.addEventListener("pointerleave", stopRec);

    for (const tile of EFFECT_TILES) {
      const b = document.createElement("button");
      b.className = "fx-tile";
      b.style.setProperty("--tile-color", tile.color);
      b.innerHTML = `<span class="fx-emoji">${tile.emoji}</span><span>${tile.label}</span>`;
      b.addEventListener("click", () => {
        const project = ctx.getProject();
        const clipId = mostRecentRecordedClipId(project.clips);
        if (!clipId) {
          setStatus("Record your voice first! 🎤");
          return;
        }
        const amount = tile.id === "crazy" ? ctx.rng.next() : wildness;
        const effect: EffectDescriptor = { id: tile.id, amount };
        ctx.dispatch({ type: "applyEffect", clipId, effect });
        const updated = ctx.getProject().clips[clipId];
        if (updated) ctx.sound.play(updated);
        setStatus(`${tile.emoji} ${tile.label}!`);
      });
      tiles.appendChild(b);
    }

    host.append(recordBtn, status, tiles);
  },

  mountOptions(host: HTMLElement, _ctx: MachineContext): void {
    host.innerHTML = "";
    const wrap = document.createElement("label");
    wrap.className = "opt-knob";
    wrap.innerHTML = `<span>🌶️ Wildness</span>`;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "1";
    slider.step = "0.01";
    slider.value = String(wildness);
    slider.addEventListener("input", () => {
      wildness = Number(slider.value);
    });
    wrap.appendChild(slider);
    host.appendChild(wrap);
  },

  onEnter(): void {
    /* nothing machine-local to resume */
  },
  onExit(ctx: MachineContext): void {
    ctx.sound.stopAll();
  },
};

function makeRecordingClip(bufferId: string): Clip {
  return {
    id: `clip-${clipSeq++}`,
    source: { kind: "recording", bufferId },
    effects: [],
    color: "#ff5d8f",
    label: "My Voice",
  };
}

function mostRecentRecordedClipId(clips: Readonly<Record<string, Clip>>): string | null {
  const recorded = Object.values(clips).filter((c) => c.source.kind === "recording");
  const last = recorded[recorded.length - 1];
  return last ? last.id : null;
}
