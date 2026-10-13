// The dev rail's notes land in `design/PREVIEW_NOTES.md`, and an agent finds
// the open ones by their `- [ ]`. These pin the entry shape that lookup needs.
import { describe, expect, it } from "vitest";
import { NOTES_HEADER, formatNote, openNoteCount } from "../../src/editor/note-format.ts";

const NOW = new Date(2026, 9, 13, 9, 5);

describe("formatNote", () => {
  it("is one open checkbox line with when and where", () => {
    expect(formatNote("TRACK sign is too low", "yard · btn-yard-track", NOW)).toBe(
      "- [ ] 2026-10-13 09:05 · yard · btn-yard-track — TRACK sign is too low\n",
    );
  });

  it("indents the rest of a multi-line note under its checkbox", () => {
    expect(formatNote("first\nsecond\n\nthird\n", "map", NOW)).toBe(
      "- [ ] 2026-10-13 09:05 · map — first\n  second\n\n  third\n",
    );
  });

  it("keeps a where on one line, so it cannot forge a second entry", () => {
    const entry = formatNote("x", "map\n- [ ] forged", NOW);
    expect(openNoteCount(entry)).toBe(1);
  });
});

describe("openNoteCount", () => {
  it("counts open entries and not ticked ones or the header", () => {
    const file = `${NOTES_HEADER}${formatNote("a", "map", NOW)}- [x] done — b\n${formatNote("c", "yard", NOW)}`;
    expect(openNoteCount(file)).toBe(2);
  });

  it("does not count a checkbox inside an indented continuation", () => {
    expect(openNoteCount(formatNote("a\n- [ ] not an entry", "map", NOW))).toBe(1);
  });
});
