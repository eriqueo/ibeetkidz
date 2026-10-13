// Where an edited map goes.
//
// The default sink is Vite's own HMR channel. That choice is load-bearing:
// `tests/unit/architecture.test.ts` rule 4 bans the token `fetch(` anywhere in
// `src/**` (the app is offline-first and must stay that way), so an HTTP save
// endpoint is not available to us. `import.meta.hot.send` needs no fetch, no
// port, no CORS, and is statically eliminated from a production build — which
// also means this whole module compiles away when `import.meta.hot` is absent.
//
// The clipboard and download sinks exist so the editor is still useful without
// the dev server (and so a future iPad version changes only this file).
import type { EditableMap } from "./tiled-mutate.ts";
import { serializeMap } from "./tiled-mutate.ts";

export type SinkKind = "hmr" | "clipboard" | "download";

export interface SaveResult {
  readonly ok: boolean;
  readonly detail: string;
}

/** The message the dev plugin listens for. Kept as one string constant so the
 *  client and the server cannot drift. */
export const SAVE_EVENT = "ibk:save-map";
export const SAVED_EVENT = "ibk:map-saved";

export interface SavePayload {
  /** Map NAME, never a path — the server resolves it against a fixed directory,
   *  so there is no traversal surface. */
  readonly name: string;
  readonly json: string;
  /** What the client believed the file said when it opened it. The server
   *  refuses the write if the file moved underneath us. */
  readonly baseHash: string;
}

/** Cheap, stable content hash. Not cryptographic — this guards against a stale
 *  editor overwriting an edit made in Tiled, not against an attacker. */
export function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

async function viaHmr(edit: EditableMap): Promise<SaveResult> {
  const hot = import.meta.hot;
  if (!hot) return { ok: false, detail: "no dev server (HMR channel absent)" };
  const payload: SavePayload = {
    name: edit.name,
    json: serializeMap(edit.raw),
    baseHash: hashText(edit.baseline),
  };
  return new Promise<SaveResult>((resolve) => {
    const done = (data: SaveResult): void => {
      hot.off(SAVED_EVENT, done);
      resolve(data);
    };
    hot.on(SAVED_EVENT, done);
    hot.send(SAVE_EVENT, payload);
    // A dev server that never answers must not hang the editor forever.
    setTimeout(() => done({ ok: false, detail: "dev server did not answer" }), 4000);
  });
}

async function viaClipboard(edit: EditableMap): Promise<SaveResult> {
  try {
    await navigator.clipboard.writeText(serializeMap(edit.raw));
    return { ok: true, detail: `${edit.name}.json copied — paste it over the file` };
  } catch {
    return { ok: false, detail: "clipboard refused (needs a user gesture)" };
  }
}

function viaDownload(edit: EditableMap): SaveResult {
  const blob = new Blob([serializeMap(edit.raw)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${edit.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true, detail: `${edit.name}.json downloaded` };
}

/** The config half of the channel. Same plugin, same guards, its own event
 *  pair so a map reply can never be mistaken for a config reply. */
export const SAVE_CONFIG_EVENT = "ibk:save-config";
export const CONFIG_SAVED_EVENT = "ibk:config-saved";

/** Write `json` over `src/game/game-config.json`. `baseline` is the text the
 *  panel believed the file held when it opened. */
export async function saveConfig(json: string, baseline: string): Promise<SaveResult> {
  const hot = import.meta.hot;
  if (!hot) return { ok: false, detail: "no dev server (HMR channel absent)" };
  const payload: SavePayload = { name: "game-config", json, baseHash: hashText(baseline) };
  return new Promise<SaveResult>((resolve) => {
    const done = (data: SaveResult): void => {
      hot.off(CONFIG_SAVED_EVENT, done);
      resolve(data);
    };
    hot.on(CONFIG_SAVED_EVENT, done);
    hot.send(SAVE_CONFIG_EVENT, payload);
    setTimeout(() => done({ ok: false, detail: "dev server did not answer" }), 4000);
  });
}

/** The notes half: append one note to `design/PREVIEW_NOTES.md` (the server
 *  owns the file name and the format). `open` is how many notes are still
 *  unticked after this one landed. */
export const SAVE_NOTE_EVENT = "ibk:save-note";
export const NOTE_SAVED_EVENT = "ibk:note-saved";
export const LOAD_NOTES_EVENT = "ibk:load-notes";
export const NOTES_EVENT = "ibk:notes";

export async function saveNote(text: string, where: string): Promise<SaveResult & { open: number }> {
  const hot = import.meta.hot;
  if (!hot) return { ok: false, detail: "no dev server (HMR channel absent)", open: 0 };
  return new Promise((resolve) => {
    const done = (data: SaveResult & { open: number }): void => {
      hot.off(NOTE_SAVED_EVENT, done);
      resolve(data);
    };
    hot.on(NOTE_SAVED_EVENT, done);
    hot.send(SAVE_NOTE_EVENT, { text, where });
    setTimeout(() => done({ ok: false, detail: "dev server did not answer", open: 0 }), 4000);
  });
}

/** How many notes are open, or null without a dev server to ask. */
export async function openNotes(): Promise<number | null> {
  const hot = import.meta.hot;
  if (!hot) return null;
  return new Promise((resolve) => {
    const done = (data: { open: number } | null): void => {
      hot.off(NOTES_EVENT, done);
      resolve(data ? data.open : null);
    };
    hot.on(NOTES_EVENT, done);
    hot.send(LOAD_NOTES_EVENT, {});
    setTimeout(() => done(null), 4000);
  });
}

export async function save(edit: EditableMap, sink: SinkKind = "hmr"): Promise<SaveResult> {
  if (sink === "clipboard") return viaClipboard(edit);
  if (sink === "download") return viaDownload(edit);
  return viaHmr(edit);
}
