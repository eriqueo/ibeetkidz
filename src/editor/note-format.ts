// The shape of `design/PREVIEW_NOTES.md`, shared by the dev server that writes
// it (`vite-plugins/ibk-map-writer.ts`) and the tests. Pure: no fs, no DOM.

export const NOTES_FILE = "design/PREVIEW_NOTES.md";

export const NOTES_HEADER = `# Preview notes

Written from the dev rail on the hwc-home preview (\`?edit\` / \`?tune\`), one
entry per save, newest last. An open entry is \`- [ ]\`. An agent starting
ibeetkidz work reads the open ones, does or answers them, and ticks them
(\`- [x]\`) in the same change, with a few words on what was done.

`;

/** A note longer than this is a document, not a note; refuse rather than truncate. */
export const NOTE_MAX = 4000;

/** One entry: a checkbox line with when and where, the text indented under it. */
export function formatNote(text: string, where: string, now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const lines = text.trim().split(/\r?\n/);
  const first = lines.shift() ?? "";
  const rest = lines.map((l) => (l.trim() ? `  ${l}` : ""));
  const place = where.replace(/[\r\n]/g, " ").slice(0, 120);
  return [`- [ ] ${stamp} · ${place} — ${first}`, ...rest].join("\n").concat("\n");
}

/** How many entries are still open. */
export function openNoteCount(text: string): number {
  return (text.match(/^- \[ \] /gm) ?? []).length;
}
