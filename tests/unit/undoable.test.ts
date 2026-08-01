// "Undo everywhere" (`src/core/undoable.ts`).
//
// The rule is one of this project's stated UX promises and it shipped for a
// whole release as a lie: `UndoStack`, `store.undo()` and `AppApi.undo()` all
// existed, all tested, with ZERO callers in the v2 UI. So the tests that matter
// here are not "does the table work" — it is a table — but the two that keep the
// promise from rotting again:
//
//   1. Every `remove*` command in the vocabulary is classified. A future
//      destructive command that nobody classifies fails this file rather than
//      silently shipping as unrecoverable.
//   2. The dispatch funnel withdraws the offer as soon as anything else
//      happens, because `undo()` pops the LAST history entry — a stale offer
//      would undo the wrong thing.

import { describe, expect, it } from "vitest";
import { CLASSIFIED, lostBy, offersUndo } from "../../src/core/undoable.ts";
import type { Command } from "../../src/core/types.ts";

// The same import-the-real-artifact idiom `architecture.test.ts` and
// `tiled-maps.test.ts` use. `node:fs` is not available here — these run in a
// browser-like environment and `@types/node` is deliberately not installed.
const TYPES_SRC = (
  await import("../../src/core/types.ts?raw")
).default as unknown as string;

describe("undoable", () => {
  it("names, in kid words, what each destructive command took away", () => {
    expect(lostBy({ type: "removeLayer", layerId: "l1" })).toBe("Track gone");
    expect(lostBy({ type: "removeCar", partId: "p1" })).toBe("Car gone");
    expect(lostBy({ type: "removeFromTrain", instanceId: "i1" })).toBe("Car unhitched");
  });

  it("says nothing about commands that take nothing away", () => {
    expect(lostBy({ type: "setTempo", bpm: 120 })).toBeNull();
    expect(lostBy({ type: "addCar", id: "c1" })).toBeNull();
    expect(offersUndo({ type: "toggleStep", layerId: "l", index: 0 })).toBe(false);
  });

  it("does not offer for a single note tap — that is drawing, not losing work", () => {
    const cmd: Command = { type: "removeNote", layerId: "l", index: 0, row: 0 };
    // Classified (so the completeness check below sees it was considered)…
    expect(lostBy(cmd)).not.toBeNull();
    // …but deliberately not offered, or the chip would live on screen.
    expect(offersUndo(cmd)).toBe(false);
  });

  it("classifies EVERY remove* command the vocabulary has", () => {
    // The guard that keeps the promise. Reads the `Command` union straight out
    // of `types.ts` rather than restating it here — a restated list is exactly
    // what goes stale, and going stale means a kid loses work with no way back.
    const declared = [...TYPES_SRC.matchAll(/type:\s*"(remove[A-Za-z]*)"/g)].map((m) => m[1]!);
    expect(declared.length, "found no remove* commands — the regex is broken").toBeGreaterThan(4);
    const missing = [...new Set(declared)].filter((t) => !CLASSIFIED.includes(t as Command["type"]));
    expect(
      missing,
      `unclassified destructive command(s) — add them to LOST in src/core/undoable.ts, ` +
        `or a kid deletes this and cannot get it back`,
    ).toEqual([]);
  });
});
