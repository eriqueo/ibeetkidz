// Storage adapter: Project JSON in localStorage (small), recorded blobs in
// IndexedDB (large).
//
// This file is the only thing standing between a child and losing their work,
// so ticket S6 rewrote its error handling around one rule: NOTHING FAILS
// QUIETLY, and nothing is deleted that a kid could still ask for back.
//
// What changed and why (the fence pass, recorded here because `git log` has
// nothing to say — the whole file arrived in one build-out commit):
//
//   * `readIndex()` used to answer a parse failure with `{}` — "you have no
//     saved projects" — which is the single most destructive sentence this
//     module can say. It now returns a typed failure and the callers decide.
//   * `saveProject`/`putBlob` both ended in `catch { throw new
//     QuotaExceededError(); }`. `putBlob`'s catch covers `openDb()` failing
//     entirely, so a browser with IndexedDB disabled reported "No more room!"
//     on a device with plenty of room. Causes are now classified.
//   * `deleteProject` wrote to localStorage with no catch at all, throwing a raw
//     DOMException straight past the port boundary.
//   * `getBlob`'s `catch { return null }` SURVIVES, deliberately — see its
//     comment. It is the one place where swallowing is the kinder answer.

import { z } from "zod";
import {
  QuotaExceededError,
  StorageError,
  reachableBlobIds,
  type ReachableProjects,
  type SavedProjectMeta,
  type StoragePort,
} from "../ports/storage-port.ts";
import { parseSave, serialize } from "../core/project-state.ts";
import type { Project } from "../core/types.ts";

const KEY = "ibeetkidz:projects";
/** Where an unreadable index is set aside instead of being overwritten. */
const CORRUPT_KEY = `${KEY}:corrupt`;
const DB_NAME = "ibeetkidz";
const BLOB_STORE = "blobs";

// ── The saved-project index ──────────────────────────────────────────────────
// Parsed, not cast (the S5 invariant, one layer out): what comes back from
// localStorage is a string a page from any era may have written. zod because it
// is already the dialect at this boundary — a second validator would be a second
// dialect.

const IndexEntrySchema = z.object({
  name: z.string(),
  savedAt: z.number(),
  json: z.string(),
});

const IndexSchema = z.record(z.string(), IndexEntrySchema);

type Index = z.infer<typeof IndexSchema>;

type IndexRead =
  | { readonly ok: true; readonly index: Index }
  | { readonly ok: false; readonly error: StorageError };

/**
 * Read the index, or say precisely why not.
 *
 * The ONE legitimate empty result is "the key has never been written". Every
 * other emptiness is a failure with a name: `unavailable` (the browser won't
 * let us near localStorage) or `corrupt` (there is something there and it isn't
 * an index). Returning `{}` for those is what this ticket exists to end.
 */
function readIndex(): IndexRead {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (err) {
    // A sandboxed iframe / disabled-storage browser throws on merely TOUCHING
    // localStorage. That is survivable — the app still plays — but it is not
    // "there are no saved projects", so it does not get to look like that.
    return {
      ok: false,
      error: new StorageError("unavailable", "localStorage is not readable", {
        cause: err,
      }),
    };
  }

  if (raw === null) return { ok: true, index: {} }; // nothing saved yet

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      error: new StorageError(
        "corrupt",
        "the saved-project index is not JSON (a torn or half-written entry)",
        { cause: err },
      ),
    };
  }

  const index = IndexSchema.safeParse(parsed);
  if (!index.success) {
    const issue = index.error.issues[0];
    return {
      ok: false,
      error: new StorageError(
        "corrupt",
        `the saved-project index is not an index${
          issue ? ` (${issue.path.join(".") || "root"}: ${issue.message})` : ""
        }`,
        { cause: index.error },
      ),
    };
  }
  return { ok: true, index: index.data };
}

/**
 * Move an unreadable index out of the way so a fresh one can be written over
 * the top of it WITHOUT destroying it. Corrupt text is not readable by this
 * app, but it is the only remaining copy of a kid's songs, and a grown-up with
 * devtools can still get at it. Overwriting it would be the same silent loss
 * this ticket is about, one layer down.
 */
function quarantineCorruptIndex(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) localStorage.setItem(CORRUPT_KEY, raw);
  } catch {
    // Bare on purpose: quarantine is a courtesy for a human debugging later. If
    // it fails (no room for a second copy, storage gone), the SAVE must still
    // go through — refusing to save because we couldn't archive junk would
    // trade the kid's live song for an unreadable one.
  }
}

/**
 * Is this the browser saying "out of room", or something else entirely?
 *
 * Both storage APIs signal a full device with a `DOMException` named
 * `QuotaExceededError` (Firefox: `NS_ERROR_DOM_QUOTA_REACHED`; legacy numeric
 * codes 22 and 1014). ANY other failure — IndexedDB disabled, a sandboxed
 * frame, a transaction abort — is `unavailable`. Guessing "full" for all of
 * them is what told a kid with an empty device that it was full.
 */
function isQuotaError(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  return err instanceof Error && err.name === "QuotaExceededError";
}

/** Turn a raw write failure into a coded one, keeping the original as `cause`. */
function writeFailure(err: unknown, detail: string): StorageError {
  if (err instanceof StorageError) return err; // already classified
  return isQuotaError(err)
    ? new QuotaExceededError(detail, { cause: err })
    : new StorageError("unavailable", detail, { cause: err });
}

// ── IndexedDB blob store (recorded audio is too big for localStorage) ────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  // Cache the handle, but NOT a rejection. Memoizing the failure poisoned the
  // blob store for the whole page load: one transient open error (a tab
  // opening during an upgrade, a storage prompt the kid dismissed) and every
  // later recording failed with the same stale error, with no way back short
  // of a reload. Clearing on rejection makes the next putBlob/getBlob retry.
  dbPromise = pending;
  void pending.catch(() => {
    if (dbPromise === pending) dbPromise = null;
  });
  return pending;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(BLOB_STORE, mode);
        const req = run(transaction.objectStore(BLOB_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB op failed"));
      }),
  );
}

export class LocalStoragePort implements StoragePort {
  async saveProject(
    project: Project,
    reachable?: ReachableProjects,
  ): Promise<void> {
    const read = readIndex();
    if (!read.ok) {
      // Unreadable-because-unavailable means the write is going to fail too;
      // say so with the real cause rather than pretending we started fresh.
      if (read.error.code !== "corrupt") throw read.error;
      // Unreadable-because-corrupt is recoverable, and recovering is the kind
      // thing to do: set the junk aside and give this kid a working save again.
      quarantineCorruptIndex();
    }
    const idx: Index = read.ok ? read.index : {};
    idx[project.id] = {
      name: project.name,
      savedAt: Date.now(),
      json: serialize(project),
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(idx));
    } catch (err) {
      throw writeFailure(err, "could not write the saved-project index");
    }

    // Housekeeping, strictly after the song is safely stored, and strictly
    // opt-in (see the retention rule on the port). `project`'s own blobs are
    // unioned in so the thing we just saved can never collect its own audio,
    // even if a caller hands us a mismatched history.
    if (reachable) {
      const retained = new Set(reachableBlobIds(reachable));
      for (const clip of Object.values(project.clips)) {
        if (clip.source.kind === "recording") retained.add(clip.source.bufferId);
      }
      try {
        await collectBlobs(retained);
      } catch {
        // Bare on purpose: the save SUCCEEDED. Failing it now because a stale
        // blob couldn't be swept would report a loss that didn't happen and
        // (via the autosave notice) tell a kid their song wasn't kept. An
        // uncollected blob is a leak, and a leak is recoverable next save.
      }
    }
  }

  async listProjects(): Promise<readonly SavedProjectMeta[]> {
    const read = readIndex();
    if (!read.ok) throw read.error; // an unreadable index is not an empty one
    return Object.entries(read.index).map(([id, v]) => ({
      id,
      name: v.name,
      savedAt: v.savedAt,
    }));
  }

  async loadProject(id: string): Promise<Project | null> {
    const read = readIndex();
    if (!read.ok) throw read.error;
    const entry = read.index[id];
    if (!entry) return null; // genuinely absent — the only null this returns
    // S5's boundary: the save text stops being `unknown` exactly here, once.
    const parsed = parseSave(entry.json);
    if (parsed.ok) return parsed.value;
    throw new StorageError(
      parsed.error.code === "too-new" ? "too-new" : "corrupt",
      `saved project ${id}: ${parsed.error.detail}`,
      // The parse layer owns the words a child reads about an unreadable save;
      // they ride along so the notice can show them without a translation.
      { kidMessage: parsed.error.kidMessage, cause: parsed.error },
    );
  }

  async deleteProject(id: string): Promise<void> {
    const read = readIndex();
    // Refuse rather than rewrite: we cannot delete one project out of a document
    // we can't read without throwing away the rest of it.
    if (!read.ok) throw read.error;
    if (!(id in read.index)) return; // idempotent
    delete read.index[id];
    try {
      localStorage.setItem(KEY, JSON.stringify(read.index));
    } catch (err) {
      // Previously uncaught: a raw DOMException went straight past the port.
      throw writeFailure(err, `could not delete saved project ${id}`);
    }
  }

  async putBlob(id: string, blob: Blob): Promise<void> {
    try {
      await tx("readwrite", (store) => store.put(blob, id));
    } catch (err) {
      // Classified, not assumed: this catch also covers `openDb()` rejecting,
      // which is "this browser has no usable IndexedDB", not "your device is
      // full" — reporting the latter was S4's mislabelled-quota bug.
      throw writeFailure(err, `could not store recording ${id}`);
    }
  }

  async getBlob(id: string): Promise<Blob | null> {
    try {
      const result = await tx<Blob | undefined>("readonly", (store) =>
        store.get(id),
      );
      return result ?? null;
    } catch {
      // Bare, and it SURVIVES the "don't swallow" pass on purpose. This is the
      // rehydrate path: `loadLast` calls it once per recorded clip while
      // restoring a song. Throwing here would reject the whole load, so a
      // browser with a broken blob store would cost a kid their entire song —
      // notes, tempo, train and all — to save one recording that is gone
      // either way. Silence is the kinder failure: the song comes back, that
      // one clip is quiet. (The port's doc types this as total for exactly this
      // reason.) Follow-up written down in S6: report the unreadable store on a
      // soft channel so it isn't invisible to a grown-up.
      return null;
    }
  }

  async deleteBlob(id: string): Promise<void> {
    try {
      await tx("readwrite", (store) => store.delete(id));
    } catch (err) {
      throw writeFailure(err, `could not delete recording ${id}`);
    }
  }
}

/**
 * Delete every stored blob that is not in `retained` — the retention rule
 * applied. Takes the KEEP set, never a DELETE list: the failure mode of a
 * mistake here is a leaked blob, not a lost recording.
 */
async function collectBlobs(retained: ReadonlySet<string>): Promise<void> {
  const keys = await tx<IDBValidKey[]>("readonly", (store) =>
    store.getAllKeys(),
  );
  const doomed = keys.filter(
    (k): k is string => typeof k === "string" && !retained.has(k),
  );
  for (const id of doomed) {
    await tx("readwrite", (store) => store.delete(id));
  }
}
