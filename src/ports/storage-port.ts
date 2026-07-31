// StoragePort: persists creations. Small state (Project JSON) and large blobs
// (recorded audio) have different homes — localStorage vs IndexedDB — but the
// core only sees this interface, so quota/eviction edge cases stay contained.
//
// ─── Ticket S6: delete, don't swallow ────────────────────────────────────────
//
// Two things were missing from this contract, and both were silent:
//
//   1. There was no way to DELETE a blob. Every recording a kid ever made stayed
//      in IndexedDB forever, so the store grew until the device said no — and
//      the only symptom was a save that stopped working.
//   2. Failure had no vocabulary. The adapter threw `QuotaExceededError` for
//      every possible cause (including "this browser has no IndexedDB at all"),
//      so a kid on a device with plenty of room was told "No more room!".
//
// So: `deleteBlob` exists, failures are a CLOSED, CODED set (`StorageFailure`),
// and blob collection is governed by the retention rule below.
//
// ─── THE RETENTION RULE ──────────────────────────────────────────────────────
//
//   A blob may be collected only when it is referenced by NEITHER the project
//   being saved NOR any project still reachable through undo/redo history.
//
// Both clauses matter, and the second one is the whole point. Deleting a
// recording is an undoable command: after `removeClip` the blob is unreferenced
// by the *present* project, but the kid can still press undo and expect their
// voice back. Collect on the first clause alone and undo hands them a silent
// clip — the exact failure this rule exists to make impossible.
//
// It is made impossible by TYPE, not by care: collection is opt-in, and the only
// way to opt in is to hand `saveProject` a `ReachableProjects` — which cannot be
// built from a `Project` alone, because it structurally demands the past and
// future stacks too (an `UndoStack`'s `HistoryState` satisfies it as-is). A
// caller who forgets simply keeps every blob (a leak, recoverable) rather than
// deleting a live one (a loss, not recoverable).

import type { Project } from "../core/types.ts";
// The kid-facing copy for an unreadable SAVE is owned by the parse boundary
// (S5), not restated here — one producer per fact. A `StorageError` that
// originated in a parse failure carries that module's message through unchanged.
import type { KidMessage } from "../core/project-schema.ts";

export interface SavedProjectMeta {
  readonly id: string;
  readonly name: string;
  readonly savedAt: number;
}

// ── Failure vocabulary (Principle 19: coded, routable, not a string to regex) ─

/**
 * Every way persistence is allowed to fail. Closed on purpose: a caller
 * switching on this set is exhaustively handling storage, and adding a member
 * breaks every switch that forgot it.
 */
export type StorageFailure =
  /** The device is out of room. The one case that literally means "full". */
  | "full"
  /** Storage refuses to work at all: private mode, a sandboxed frame, IndexedDB
   *  disabled. NOT the same as full, and must never be reported as full. */
  | "unavailable"
  /** Something is stored, but it can't be read back. */
  | "corrupt"
  /** Written by a newer build than this one — refused, not best-effort parsed. */
  | "too-new";

/**
 * A storage failure that says what actually happened.
 *
 * `code` is what you route on. `detail` is operator-facing and never shown to a
 * child. `kidMessage` is present only when a layer that OWNS kid copy produced
 * one (today: the save parser, S5) — the device-level copy for `full` /
 * `unavailable` lives with the notice that renders it (`TROUBLE_COPY` in
 * `src/app/context.tsx`), so it is not duplicated here.
 */
export class StorageError extends Error {
  readonly code: StorageFailure;
  readonly detail: string;
  readonly kidMessage?: KidMessage;

  constructor(
    code: StorageFailure,
    detail: string,
    options?: { cause?: unknown; kidMessage?: KidMessage },
  ) {
    super(detail, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "StorageError";
    this.code = code;
    this.detail = detail;
    if (options?.kidMessage) this.kidMessage = options.kidMessage;
  }
}

/**
 * The device is out of room. Kept as its own class because `src/app/context.tsx`
 * routes on `err instanceof QuotaExceededError` to pick the "No more room!"
 * notice; everything else lands on the softer "I can't save here" copy, which is
 * now correct instead of accidental.
 */
export class QuotaExceededError extends StorageError {
  constructor(detail = "Storage is full", options?: { cause?: unknown }) {
    super("full", detail, options);
    this.name = "QuotaExceededError";
  }
}

// ── Retention ────────────────────────────────────────────────────────────────

/**
 * Every project a child can still get back to. Structurally satisfied by
 * `HistoryState` from `src/core/project-state.ts`, so a caller passes its undo
 * stack directly — and CANNOT pass a bare `Project`, which is the point (see
 * the retention rule above).
 */
export interface ReachableProjects {
  /** The project as it is right now. */
  readonly present: Project;
  /** Snapshots an undo would return to. */
  readonly past: readonly Project[];
  /** Snapshots a redo would return to. */
  readonly future: readonly Project[];
}

/**
 * Blob ids that MUST survive a collection pass: every recording referenced by
 * any reachable project. Pure — this is the rule itself, implementations only
 * apply it.
 */
export function reachableBlobIds(
  reachable: ReachableProjects,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const project of [
    reachable.present,
    ...reachable.past,
    ...reachable.future,
  ]) {
    for (const clip of Object.values(project.clips)) {
      if (clip.source.kind === "recording") ids.add(clip.source.bufferId);
    }
  }
  return ids;
}

// ── The port ─────────────────────────────────────────────────────────────────

export interface StoragePort {
  /**
   * Persist the project.
   *
   * Pass `reachable` (an undo stack) to also run a collection pass: blobs held
   * by this implementation that are referenced by NO reachable project are
   * deleted. Omit it and nothing is collected — the fail-safe default.
   * `project`'s own blobs are always retained regardless of `reachable`.
   *
   * Collection is housekeeping and never fails the save.
   *
   * @throws {StorageError} `full` when the device is out of room,
   *   `unavailable` when storage can't be written at all, `corrupt` if the
   *   existing index is unreadable *and* could not be set aside.
   */
  saveProject(project: Project, reachable?: ReachableProjects): Promise<void>;

  /** @throws {StorageError} `corrupt` when what is stored can't be read. */
  listProjects(): Promise<readonly SavedProjectMeta[]>;

  /**
   * The saved project, or `null` when there is no save under `id`.
   * `null` means ABSENT and nothing else — an unreadable save throws.
   *
   * @throws {StorageError} `corrupt` / `too-new`, carrying the parse layer's
   *   `kidMessage`.
   */
  loadProject(id: string): Promise<Project | null>;

  /** Idempotent: deleting an unknown id is not an error. */
  deleteProject(id: string): Promise<void>;

  /** Store a recorded audio blob under `id`. */
  putBlob(id: string, blob: Blob): Promise<void>;

  /**
   * The blob, or `null` when there is no audio to be had for `id` — for ANY
   * reason, including the blob store being unreadable. Deliberately total: this
   * is the rehydrate path, and one unreadable recording must never cost a child
   * the whole song it belongs to.
   */
  getBlob(id: string): Promise<Blob | null>;

  /**
   * Forget a recorded blob. Idempotent (deleting an unknown id is fine).
   * Callers doing bulk cleanup should prefer `saveProject`'s collection pass,
   * which enforces the retention rule; this is the single-blob primitive.
   */
  deleteBlob(id: string): Promise<void>;
}
