import { z } from "zod";
import type { EventMap } from "./EventBus.ts";

const noArg = z.undefined();
const view = z.enum(["map", "workshop", "yard", "track"]);

/** Runtime schemas for the EventBus actions Tiled map data may author. */
export const TILED_ACTION_ARGS = {
  "map-nav": view,
  "nav-map": noArg,
  "nav-yard": noArg,
  "tempo-changed": z.number().finite(),
  "terrain-picked": z.enum(["hill", "bridge", "rain"]),
  "toggle-car-picker": noArg,
  "track-nav": view,
  "transport-play": z.enum(["loop", "ride"]),
  "transport-stop": noArg,
  "workshop-add-melody": z.enum(["guitar", "violin", "piano"]),
  "workshop-loop-car": noArg,
  "workshop-open-tool": z.enum([
    "beat-grid",
    "record-voicefx",
    "sound-pads",
    "theremin-xy",
    "voice-keys",
  ]),
  "workshop-send-to-yard": noArg,
  "yard-add": noArg,
  "yard-depart": noArg,
  "yard-edit-car": noArg,
  "yard-nav": view,
  "yard-remove-car": noArg,
  "yard-remove-from-train": noArg,
} as const satisfies Partial<Record<keyof EventMap, z.ZodTypeAny>>;

export type TiledActionName = keyof typeof TILED_ACTION_ARGS;
export type TiledActionArg = {
  [K in TiledActionName]: Exclude<z.infer<(typeof TILED_ACTION_ARGS)[K]>, undefined>;
}[TiledActionName];

export type ParsedTiledAction = {
  [K in TiledActionName]: z.infer<(typeof TILED_ACTION_ARGS)[K]> extends undefined
    ? { action: K }
    : { action: K; arg: z.infer<(typeof TILED_ACTION_ARGS)[K]> };
}[TiledActionName];

/** Parse an optional Tiled action+arg pair into the closed runtime protocol. */
export function parseTiledAction(
  action: string | number | boolean | undefined,
  arg: string | number | boolean | undefined,
): ParsedTiledAction | null {
  if (action === undefined || action === "") {
    if (arg !== undefined) throw new Error("Tiled object has an arg but no action");
    return null;
  }
  if (typeof action !== "string" || !(action in TILED_ACTION_ARGS)) {
    throw new Error(`Unknown Tiled action: ${String(action)}`);
  }
  const name = action as TiledActionName;
  const parsed = TILED_ACTION_ARGS[name].safeParse(arg);
  if (!parsed.success) {
    throw new Error(`Invalid Tiled payload for ${name}: ${String(arg)}`);
  }
  return parsed.data === undefined
    ? ({ action: name } as ParsedTiledAction)
    : ({ action: name, arg: parsed.data } as ParsedTiledAction);
}

/** Re-parse at the dynamic EventBus edge, then emit the proven tuple. */
export function emitTiledAction(
  emitter: { emit(event: string, ...args: unknown[]): boolean },
  action: TiledActionName,
  arg: TiledActionArg | undefined,
): boolean {
  const intent = parseTiledAction(action, arg);
  if (!intent) throw new Error("Cannot emit an absent Tiled action");
  return "arg" in intent
    ? emitter.emit(intent.action, intent.arg)
    : emitter.emit(intent.action);
}
