import type { Layer, Project } from "./types.ts";
import { STEP_COUNT } from "./types.ts";
import { activeLayers, liveTrain, partForCar } from "./project-state.ts";
import { resolveInstrument } from "./instruments.ts";
import { degreeToNote } from "./scale.ts";
import type { SoundPort } from "../ports/sound-port.ts";

export type PlayMode = "loop" | "ride";
type PlaybackEvent =
  | { readonly kind: "step"; readonly args: Parameters<SoundPort["scheduleStep"]> }
  | { readonly kind: "note"; readonly args: Parameters<SoundPort["scheduleNote"]> };

/** The exact calls that will reach the sound port. Preparation, comparison and
 * playback consume this same plan, so a separate list of "audio commands" cannot
 * drift from what the scheduler actually uses. Never persisted. */
export interface PlaybackPlan {
  readonly tempoBpm: number;
  readonly reversed: boolean;
  readonly events: readonly PlaybackEvent[];
}

export function playbackPlan(
  project: Project,
  mode: PlayMode,
  reversed: boolean,
  loopLayers: readonly Layer[] = activeLayers(project),
): PlaybackPlan {
  const events: PlaybackEvent[] = [];
  const addLayers = (layers: readonly Layer[], cycleBars: number, barOffset: number): void => {
    for (const layer of layers) {
      if (layer.muted) continue;
      const clip = project.clips[layer.clipId];
      if (!clip) continue;
      const opts = {
        volume: layer.volume,
        swing: layer.swing ?? project.swing,
        echo: layer.echo,
        tone: layer.tone,
        wobble: layer.wobble ?? 0,
        crunch: layer.crunch ?? 0,
        laneKey: layer.id,
      };
      // Reverse the event's entire span, not just its start. Otherwise long
      // notes land late and can extend past the end of the reversed bar.
      const at = (i: number, span: number, total: number): number =>
        reversed ? Math.max(0, total - i - Math.max(1, span)) : i;
      if (layer.kind === "melody") {
        const total = layer.notes.length || STEP_COUNT;
        const instrument = resolveInstrument(layer.instrument, layer.wave);
        layer.notes.forEach((chord, i) => {
          for (const n of chord) {
            const note = degreeToNote(project.scaleId, project.keyId, n.row);
            const bend = n.pins?.map((p) => ({
              t: reversed ? 1 - p.t : p.t,
              noteName: degreeToNote(project.scaleId, project.keyId, p.row),
            }));
            events.push({ kind: "note", args: [
              note, instrument, at(i, n.length ?? 1, total), total, opts,
              n.length, n.roll ?? 1, bend, cycleBars, barOffset,
            ] });
          }
        });
      } else {
        const total = layer.steps.length || STEP_COUNT;
        layer.steps.forEach((cell, i) => {
          if (cell) events.push({ kind: "step", args: [
            clip, at(i, cell.length ?? 1, total), total, opts,
            cell.length, cell.roll ?? 1, cell.row, cycleBars, barOffset,
          ] });
        });
      }
    }
  };
  if (mode === "loop") addLayers(loopLayers, 1, 0);
  else {
    const train = liveTrain(project);
    const length = Math.max(1, train.length);
    train.forEach((car, k) => {
      if (car.muted) return; // Silent cars still occupy their bar.
      const part = partForCar(project, car);
      if (part) addLayers(part.layers, length, reversed ? length - 1 - k : k);
    });
  }
  return { tempoBpm: project.tempoBpm, reversed, events };
}

/** Exact, collision-free comparison. Only the clip's presentation fields are
 * removed; all current and future SoundPort arguments participate by default. */
export function playbackFingerprint(plan: PlaybackPlan): string {
  return JSON.stringify({
    ...plan,
    events: plan.events.map((event) => {
      if (event.kind === "note") return event;
      const [clip, ...args] = event.args;
      const { color: _color, label: _label, ...audioClip } = clip;
      return { kind: event.kind, args: [audioClip, ...args] };
    }),
  });
}

export async function preparePlayback(plan: PlaybackPlan, sound: SoundPort): Promise<void> {
  const clips = new Map<string, Parameters<SoundPort["prepareClip"]>[0]>();
  for (const event of plan.events) {
    if (event.kind === "step") clips.set(event.args[0].id, event.args[0]);
  }
  await Promise.all([...clips.values()].map((clip) => sound.prepareClip(clip, plan.tempoBpm)));
}

export function schedulePlayback(plan: PlaybackPlan, sound: SoundPort): void {
  for (const event of plan.events) {
    if (event.kind === "step") sound.scheduleStep(...event.args);
    else sound.scheduleNote(...event.args);
  }
}
