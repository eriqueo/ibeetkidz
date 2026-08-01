// Which commands take something away from a kid, and what to call it.
//
// "Forgiving UX. Undo everywhere" is one of this project's stated rules, and the
// machinery for it has always been here — `UndoStack`, `store.undo()`,
// `AppApi.undo()`, all built, all tested. What was missing was any way for a
// CHILD to reach it: the v2 UI shipped with zero callers, so tapping ✕ on a lane
// or DELETE on a car was final.
//
// The affordance is a "put it back" offer that appears when something is
// destroyed, rather than a permanent button — the Workshop and Yard chrome bars
// are full of authored art with no room for another keycap, and an offer that
// arrives exactly when it is relevant is better for a five-year-old than a
// button they have to know about in advance.
//
// This table is the single producer of "destructive". It lives in core, next to
// the `Command` vocabulary it classifies, for the same reason the parse layer
// owns its own kid copy: this is the only place that knows what a command takes
// away. `context.tsx` reads it in the ONE dispatch funnel every command passes
// through, so a destructive command added later is covered the moment its entry
// lands here — and `tests/unit/undoable.test.ts` fails if one is added without.

import type { Command } from "./types.ts";

/** Kid words for what just disappeared. Present ⇒ offer to put it back. */
const LOST: Partial<Record<Command["type"], string>> = {
  removeLayer: "Track gone",
  removeCar: "Car gone",
  removeFromTrain: "Car unhitched",
  removeClip: "Sound gone",
  removeEffect: "Effect gone",
  removePattern: "Pattern gone",
  removeNote: "Note gone",
};

/**
 * What this command took away, or null if it took nothing.
 *
 * `removeNote` is in the table but deliberately filtered by the caller: a kid
 * un-tapping a note is drawing, not losing work, and offering to undo every
 * grid tap would put a chip on screen constantly. It is listed so that the
 * completeness test below can tell "considered and excluded" from "forgotten".
 */
export function lostBy(cmd: Command): string | null {
  return LOST[cmd.type] ?? null;
}

/** Commands whose undo offer would be noise rather than rescue. */
const TOO_SMALL_TO_OFFER: ReadonlySet<Command["type"]> = new Set<Command["type"]>([
  "removeNote",
]);

/** Should destroying this earn a visible "put it back"? */
export function offersUndo(cmd: Command): boolean {
  return lostBy(cmd) !== null && !TOO_SMALL_TO_OFFER.has(cmd.type);
}

/** Every command type this module has an opinion about — the completeness test
 *  compares this against the `Command` union so a new `remove*` cannot land
 *  unclassified. */
export const CLASSIFIED: readonly Command["type"][] = Object.keys(LOST) as Command["type"][];
