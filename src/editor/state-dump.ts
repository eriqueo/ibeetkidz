// The scene-state dump: one JSON file that says what the app was doing when a
// bug was seen, so a report is "here is the file" rather than a conversation
// about what was on screen.
//
// Everything here is READ. The project and the audio diagnostics come through
// the dev test bridge (`window.__ibeetkidz_test__`, installed by
// `src/app/context.tsx` under the dev server only), which is the seam the e2e
// suite already uses to observe the app — so this module imports nothing from
// `src/app` and the editor → game dependency arrow stays one-way. Scene
// diagnostics are whatever getters the running scene exposes, read one at a
// time inside a try so a getter that throws becomes a line in the dump, not
// the end of it. Nothing constructs or resumes an AudioContext.
import { snapshotGameConfig } from "../game/game-config.ts";

/** The scene getters worth a dump, by name. Not every scene has every one;
 *  a name that is absent is simply skipped. Each is a plain-data getter on
 *  one of the four view scenes (grep `get <name>()` / `<name>()` in
 *  `src/game/scenes/`). */
export const SCENE_PROBES = [
  "debugModel",
  "debugState",
  "undoOffer",
  "sendUiState",
  "songPosition",
  "toolStatus",
  "activeToolId",
  "boardVisible",
  "starterOffering",
  "emptyPromptVisible",
  "rideMotion",
  "rideHighlight",
  "riderPoints",
] as const;

/** A recent error or rejection, kept so the dump can say what blew up. */
export interface CapturedError {
  readonly at: string;
  readonly kind: "error" | "rejection";
  readonly message: string;
  readonly stack?: string;
}

const MAX_ERRORS = 20;
const captured: CapturedError[] = [];
let capturing = false;

function remember(kind: CapturedError["kind"], reason: unknown): void {
  const err = reason instanceof Error ? reason : null;
  const entry: CapturedError = {
    at: new Date().toISOString(),
    kind,
    message: err?.message ?? String(reason),
  };
  captured.push(err?.stack ? { ...entry, stack: err.stack } : entry);
  if (captured.length > MAX_ERRORS) captured.shift();
}

/** Start remembering window errors and unhandled rejections. Idempotent. */
export function captureErrors(target: Window = window): void {
  if (capturing) return;
  capturing = true;
  target.addEventListener("error", (e) => remember("error", e.error ?? e.message));
  target.addEventListener("unhandledrejection", (e) => remember("rejection", e.reason));
}

/** What has been captured so far, oldest first. */
export function capturedErrors(): readonly CapturedError[] {
  return captured;
}

/** Read every probe the scene has, each guarded. The key is the probe name;
 *  the value is what it returned, or `{ error }` when reading it threw. */
export function describeScene(scene: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!scene || typeof scene !== "object") return out;
  const s = scene as Record<string, unknown> & { scene?: { key?: string } };
  out["key"] = s.scene?.key ?? null;
  for (const name of SCENE_PROBES) {
    if (!(name in s)) continue;
    try {
      const v = s[name];
      out[name] = typeof v === "function" ? (v as () => unknown).call(scene) : v;
    } catch (err) {
      out[name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return out;
}

/** The slice of the dev bridge the dump reads. Narrow on purpose: it is the
 *  test seam, and this is the second consumer, so the shape is pinned here. */
export interface DumpBridge {
  getProject(): unknown;
  getScene(): unknown;
  audioDiag(): unknown;
  transportBar(): number;
  engineStarted(): boolean;
}

export interface StateDump {
  readonly at: string;
  readonly url: string;
  readonly userAgent: string;
  readonly viewport: { width: number; height: number; dpr: number };
  readonly scene: Record<string, unknown>;
  readonly audio: unknown;
  readonly transportBar: number | null;
  readonly engineStarted: boolean | null;
  readonly project: unknown;
  readonly config: unknown;
  readonly errors: readonly CapturedError[];
}

function guarded<T>(read: () => T): T | { error: string } {
  try {
    return read();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Everything, now. `bridge` defaults to the dev test bridge; a page without
 *  one (a production build) yields a dump that says so in each field. */
export function collectStateDump(
  bridge: DumpBridge | undefined = window.__ibeetkidz_test__,
  win: Window = window,
): StateDump {
  const missing = { error: "no dev bridge on this page" };
  return {
    at: new Date().toISOString(),
    url: win.location.href,
    userAgent: win.navigator.userAgent,
    viewport: { width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio },
    scene: bridge ? guarded(() => describeScene(bridge.getScene())) : missing,
    audio: bridge ? guarded(() => bridge.audioDiag()) : missing,
    transportBar: bridge ? (guarded(() => bridge.transportBar()) as number) : null,
    engineStarted: bridge ? (guarded(() => bridge.engineStarted()) as boolean) : null,
    project: bridge ? guarded(() => bridge.getProject()) : missing,
    config: snapshotGameConfig(),
    errors: [...captured],
  };
}

/** The file name a dump is saved under: sortable, no colons (Windows). */
export function dumpFileName(at: string): string {
  return `ibeetkidz-state-${at.replace(/[:.]/g, "-")}.json`;
}

/** Collect, download as a file, and copy to the clipboard. Returns a line
 *  for the status chip. The clipboard may refuse outside a user gesture;
 *  the download is the one that always lands. */
export async function dumpState(): Promise<string> {
  const dump = collectStateDump();
  const text = JSON.stringify(dump, null, 2);
  const name = dumpFileName(dump.at);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  const copied = await navigator.clipboard.writeText(text).then(() => true, () => false);
  return `${name} downloaded${copied ? " + copied" : ""} (${dump.errors.length} recent errors)`;
}
