// ─────────────────────────────────────────────────────────────────────────────
// The StoragePort CONTRACT (ticket S6).
//
// A port with exactly one implementation is a shape, not a boundary. This file
// is one suite — `storagePortContract` — run against TWO implementations:
//
//   * `LocalStoragePort`, the real adapter (jsdom localStorage + fake-indexeddb)
//   * `MemoryStoragePort`, an independent in-memory fake written below
//
// They cannot silently diverge, because there is no second list of tests to
// diverge into: both go through the same exported function, and every assertion
// is written against `StoragePort` — never against either implementation's
// internals. Anything an implementation must expose for a test to be MEANINGFUL
// (how do you corrupt "the index" when one lives in localStorage and the other
// in a field?) is named in `PortHarness` and provided by each side.
//
// Two environment notes, both real:
//
//   1. jsdom's `Blob` is a stub — no `text()`, no `arrayBuffer()` — and
//      structured-cloning one yields an EMPTY OBJECT rather than throwing. A
//      jsdom Blob therefore cannot prove that bytes survived a round trip, so
//      the suite stores `Uint8Array`s instead (see `blobOf`).
//   2. `fake-indexeddb/auto` installs `indexedDB` globally for this file only
//      (vitest isolates per file), which is what makes running the REAL adapter
//      in a unit test possible at all.
// ─────────────────────────────────────────────────────────────────────────────

import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalStoragePort } from "../../src/adapters/local-storage-port.ts";
import {
  QuotaExceededError,
  StorageError,
  reachableBlobIds,
  type ReachableProjects,
  type SavedProjectMeta,
  type StoragePort,
} from "../../src/ports/storage-port.ts";
import {
  dispatch,
  emptyProject,
  initHistory,
  reduce,
  serialize,
  undo,
  redo,
} from "../../src/core/project-state.ts";
import type { Clip, Project } from "../../src/core/types.ts";

// ── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * A stand-in for a recorded-audio `Blob`: real bytes, under the port's `Blob`
 * type. See environment note 1 — a jsdom Blob comes back from IndexedDB as an
 * empty object, which would make every "the recording survived" assertion below
 * vacuously true. A `Uint8Array` structured-clones faithfully in both this
 * environment and a real browser, and neither implementation ever inspects the
 * value it stores (it is opaque payload), so the substitution costs the suite
 * nothing it is otherwise able to check here.
 */
const blobOf = (text: string): Blob =>
  new TextEncoder().encode(text) as unknown as Blob;

const textOf = (blob: Blob): string =>
  new TextDecoder().decode(blob as unknown as Uint8Array);

const recordingClip = (id: string, bufferId: string): Clip => ({
  id,
  source: { kind: "recording", bufferId },
  effects: [],
  color: "#ffffff",
  label: id,
});

const withRecording = (project: Project, clip: Clip): Project =>
  reduce(project, { type: "addClip", clip });

// ── The harness each implementation must provide ─────────────────────────────

interface PortHarness {
  readonly port: StoragePort;
  /** Put unreadable text where this implementation keeps its project index. */
  corruptIndex(): void;
  /** Replace the stored TEXT of one saved project with something unreadable. */
  corruptSavedProject(id: string, text: string): void;
  /** The unreadable index text this implementation set aside, if any. */
  quarantined(): string | null;
}

// ── The fake ─────────────────────────────────────────────────────────────────

interface IndexEntry {
  name: string;
  savedAt: number;
  json: string;
}

/**
 * An independent StoragePort: projects in one string (so "the index is corrupt"
 * is expressible, exactly as it is for localStorage), blobs in a Map.
 *
 * Deliberately NOT a subclass or a wrapper of the real adapter — a fake that
 * borrows the implementation under test proves nothing. It restates the
 * CONTRACT (typed failures, the retention rule, idempotent deletes) over a
 * completely different substrate, which is the only way the suite below can
 * tell a port apart from a class.
 */
class MemoryStoragePort implements StoragePort {
  private indexText: string | null = null;
  private corruptCopy: string | null = null;
  private readonly blobs = new Map<string, Blob>();

  // -- test-only reach-in, mirroring PortHarness --
  breakIndex(): void {
    this.indexText = "{ this is not an index";
  }
  breakSavedProject(id: string, text: string): void {
    const read = this.read();
    if (!read.ok) throw new Error("cannot break a save inside a broken index");
    const entry = read.index[id];
    if (!entry) throw new Error(`no saved project ${id}`);
    entry.json = text;
    this.indexText = JSON.stringify(read.index);
  }
  quarantinedText(): string | null {
    return this.corruptCopy;
  }

  private read():
    | { ok: true; index: Record<string, IndexEntry> }
    | { ok: false; error: StorageError } {
    if (this.indexText === null) return { ok: true, index: {} };
    const corrupt = (detail: string): { ok: false; error: StorageError } => ({
      ok: false,
      error: new StorageError("corrupt", detail),
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.indexText);
    } catch {
      return corrupt("the saved-project index is not JSON");
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return corrupt("the saved-project index is not an object");
    const index: Record<string, IndexEntry> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (value === null || typeof value !== "object")
        return corrupt(`saved project ${id} is not an entry`);
      const e = value as Partial<IndexEntry>;
      if (
        typeof e.name !== "string" ||
        typeof e.savedAt !== "number" ||
        typeof e.json !== "string"
      )
        return corrupt(`saved project ${id} is missing fields`);
      index[id] = { name: e.name, savedAt: e.savedAt, json: e.json };
    }
    return { ok: true, index };
  }

  async saveProject(
    project: Project,
    reachable?: ReachableProjects,
  ): Promise<void> {
    const read = this.read();
    if (!read.ok) {
      if (read.error.code !== "corrupt") throw read.error;
      this.corruptCopy = this.indexText; // set aside, never destroyed
    }
    const index = read.ok ? read.index : {};
    index[project.id] = {
      name: project.name,
      savedAt: Date.now(),
      json: serialize(project),
    };
    this.indexText = JSON.stringify(index);

    if (reachable) {
      const retained = new Set(reachableBlobIds(reachable));
      for (const clip of Object.values(project.clips)) {
        if (clip.source.kind === "recording") retained.add(clip.source.bufferId);
      }
      for (const id of [...this.blobs.keys()]) {
        if (!retained.has(id)) this.blobs.delete(id);
      }
    }
  }

  async listProjects(): Promise<readonly SavedProjectMeta[]> {
    const read = this.read();
    if (!read.ok) throw read.error;
    return Object.entries(read.index).map(([id, v]) => ({
      id,
      name: v.name,
      savedAt: v.savedAt,
    }));
  }

  async loadProject(id: string): Promise<Project | null> {
    const read = this.read();
    if (!read.ok) throw read.error;
    const entry = read.index[id];
    if (!entry) return null;
    // The fake parses through the same boundary the real one does — the parse
    // layer is core, not an adapter detail, so sharing it is honest.
    const { parseSave } = await import("../../src/core/project-state.ts");
    const parsed = parseSave(entry.json);
    if (parsed.ok) return parsed.value;
    throw new StorageError(
      parsed.error.code === "too-new" ? "too-new" : "corrupt",
      `saved project ${id}: ${parsed.error.detail}`,
      { kidMessage: parsed.error.kidMessage, cause: parsed.error },
    );
  }

  async deleteProject(id: string): Promise<void> {
    const read = this.read();
    if (!read.ok) throw read.error;
    if (!(id in read.index)) return;
    delete read.index[id];
    this.indexText = JSON.stringify(read.index);
  }

  async putBlob(id: string, blob: Blob): Promise<void> {
    this.blobs.set(id, blob);
  }

  async getBlob(id: string): Promise<Blob | null> {
    return this.blobs.get(id) ?? null;
  }

  async deleteBlob(id: string): Promise<void> {
    this.blobs.delete(id);
  }
}

// ── Harness builders ─────────────────────────────────────────────────────────

/** The real adapter's localStorage key. The suite is entitled to know where the
 *  store lives — that is what makes "the index is corrupt" testable. */
const REAL_KEY = "ibeetkidz:projects";
const REAL_CORRUPT_KEY = `${REAL_KEY}:corrupt`;
const REAL_DB = "ibeetkidz";
const REAL_STORE = "blobs";

/** Empty the real blob store between tests. The adapter caches ONE connection
 *  for the life of the module, so the database is torn down by clearing it, not
 *  by deleting it (a delete would block on that live connection forever). */
async function clearRealBlobStore(): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(REAL_DB, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(REAL_STORE)) d.createObjectStore(REAL_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(REAL_STORE, "readwrite").objectStore(REAL_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function makeRealHarness(): Promise<PortHarness> {
  localStorage.clear();
  await clearRealBlobStore();
  return {
    port: new LocalStoragePort(),
    corruptIndex: () => localStorage.setItem(REAL_KEY, "{ this is not an index"),
    corruptSavedProject: (id, text) => {
      const index = JSON.parse(localStorage.getItem(REAL_KEY) ?? "{}") as Record<
        string,
        IndexEntry
      >;
      const entry = index[id];
      if (!entry) throw new Error(`no saved project ${id}`);
      entry.json = text;
      localStorage.setItem(REAL_KEY, JSON.stringify(index));
    },
    quarantined: () => localStorage.getItem(REAL_CORRUPT_KEY),
  };
}

async function makeFakeHarness(): Promise<PortHarness> {
  const port = new MemoryStoragePort();
  return {
    port,
    corruptIndex: () => port.breakIndex(),
    corruptSavedProject: (id, text) => port.breakSavedProject(id, text),
    quarantined: () => port.quarantinedText(),
  };
}

// ── THE CONTRACT ─────────────────────────────────────────────────────────────

function storagePortContract(
  name: string,
  makeHarness: () => Promise<PortHarness>,
): void {
  describe(`StoragePort contract — ${name}`, () => {
    let harness: PortHarness;
    let port: StoragePort;

    beforeEach(async () => {
      harness = await makeHarness();
      port = harness.port;
    });

    // ── Projects ─────────────────────────────────────────────────────────────

    it("starts with nothing saved", async () => {
      expect(await port.listProjects()).toEqual([]);
      expect(await port.loadProject("nobody")).toBeNull();
    });

    it("brings a saved project back as it was", async () => {
      const project = reduce(emptyProject("p1", "Train Song"), {
        type: "setTempo",
        bpm: 132,
      });
      await port.saveProject(project);

      const metas = await port.listProjects();
      expect(metas.map((m) => m.id)).toEqual(["p1"]);
      expect(metas[0]?.name).toBe("Train Song");

      const loaded = await port.loadProject("p1");
      expect(loaded?.id).toBe("p1");
      expect(loaded?.name).toBe("Train Song");
      expect(loaded?.tempoBpm).toBe(132);
      expect(loaded?.parts.length).toBe(project.parts.length);
    });

    it("overwrites a project saved twice instead of duplicating it", async () => {
      await port.saveProject(emptyProject("p1", "First"));
      await port.saveProject(emptyProject("p1", "Second"));
      const metas = await port.listProjects();
      expect(metas.length).toBe(1);
      expect(metas[0]?.name).toBe("Second");
    });

    it("deletes a project, and deleting an unknown one is not an error", async () => {
      await port.saveProject(emptyProject("p1"));
      await port.saveProject(emptyProject("p2"));
      await port.deleteProject("p1");
      expect((await port.listProjects()).map((m) => m.id)).toEqual(["p2"]);
      expect(await port.loadProject("p1")).toBeNull();
      await expect(port.deleteProject("p1")).resolves.toBeUndefined(); // idempotent
    });

    // ── Blobs ────────────────────────────────────────────────────────────────

    it("stores and returns a recording", async () => {
      await port.putBlob("buf-1", blobOf("a kid singing"));
      const back = await port.getBlob("buf-1");
      expect(back).not.toBeNull();
      expect(textOf(back as Blob)).toBe("a kid singing");
      expect(await port.getBlob("buf-missing")).toBeNull();
    });

    it("deletes one recording and leaves the rest; unknown ids are fine", async () => {
      await port.putBlob("buf-1", blobOf("one"));
      await port.putBlob("buf-2", blobOf("two"));

      await port.deleteBlob("buf-1");

      expect(await port.getBlob("buf-1")).toBeNull();
      expect(textOf((await port.getBlob("buf-2")) as Blob)).toBe("two");
      await expect(port.deleteBlob("buf-1")).resolves.toBeUndefined(); // idempotent
      await expect(port.deleteBlob("never-existed")).resolves.toBeUndefined();
    });

    // ── Don't swallow ────────────────────────────────────────────────────────

    it("an unreadable index surfaces as a typed failure, NOT as an empty list", async () => {
      harness.corruptIndex();

      const listed = port.listProjects();
      await expect(listed).rejects.toBeInstanceOf(StorageError);
      await expect(listed).rejects.toMatchObject({ code: "corrupt" });

      // The old behaviour: `readIndex()` answered `{}` and every saved project
      // silently ceased to exist. That must never be indistinguishable from
      // "this kid has not saved anything yet".
      await expect(port.loadProject("p1")).rejects.toMatchObject({
        code: "corrupt",
      });
    });

    it("an unreadable index still lets the kid save, and keeps the junk", async () => {
      harness.corruptIndex();

      await port.saveProject(emptyProject("p-new", "Fresh Start"));

      expect((await port.listProjects()).map((m) => m.id)).toEqual(["p-new"]);
      expect((await port.loadProject("p-new"))?.name).toBe("Fresh Start");
      // The unreadable text was set aside, not overwritten: it is the only
      // remaining copy of whatever was there.
      expect(harness.quarantined()).toContain("not an index");
    });

    it("an unreadable saved project surfaces instead of coming back as null", async () => {
      await port.saveProject(emptyProject("p1"));
      harness.corruptSavedProject("p1", '{"name":"half a s');

      const load = port.loadProject("p1");
      await expect(load).rejects.toBeInstanceOf(StorageError);
      // `null` means ABSENT. A save that exists but can't be read is a
      // different fact, and the kid gets told about it in their own words.
      await expect(load).rejects.toMatchObject({
        code: "corrupt",
        kidMessage: { title: expect.stringContaining("can't read") },
      });
    });

    it("refuses a save written by a NEWER build rather than mangling it", async () => {
      await port.saveProject(emptyProject("p1"));
      harness.corruptSavedProject("p1", JSON.stringify({ schemaVersion: 99, id: "p1" }));
      await expect(port.loadProject("p1")).rejects.toMatchObject({ code: "too-new" });
    });

    // ── The retention rule ───────────────────────────────────────────────────

    it("collects nothing at all when no history is offered", async () => {
      await port.putBlob("buf-orphan", blobOf("nobody's"));
      // The fail-safe default: no `reachable` argument, no deletions, ever.
      await port.saveProject(emptyProject("p1"));
      expect(await port.getBlob("buf-orphan")).not.toBeNull();
    });

    it("collects a recording that no reachable project mentions", async () => {
      await port.putBlob("buf-orphan", blobOf("nobody's"));
      const history = initHistory(emptyProject("p1"));
      await port.saveProject(history.present, history);
      expect(await port.getBlob("buf-orphan")).toBeNull();
    });

    it("keeps a recording the project being saved still uses", async () => {
      await port.putBlob("buf-1", blobOf("kept"));
      const project = withRecording(emptyProject("p1"), recordingClip("c1", "buf-1"));
      const history = initHistory(project);
      await port.saveProject(project, history);
      expect(await port.getBlob("buf-1")).not.toBeNull();
    });

    it("keeps the saved project's recordings even if the history disagrees", async () => {
      await port.putBlob("buf-1", blobOf("kept"));
      const project = withRecording(emptyProject("p1"), recordingClip("c1", "buf-1"));
      // A deliberately mismatched scope: the history knows nothing about the
      // project being written. The blob must STILL survive — the dangerous case
      // is designed out, not merely avoided by careful callers.
      const stale = initHistory(emptyProject("p1"));
      await port.saveProject(project, stale);
      expect(await port.getBlob("buf-1")).not.toBeNull();
    });

    // ↓↓ THE ONE THAT MATTERS: undo after delete ↓↓
    it("never collects a recording a kid can still UNDO their way back to", async () => {
      await port.putBlob("buf-1", blobOf("my voice"));
      let history = initHistory(
        withRecording(emptyProject("p1"), recordingClip("c1", "buf-1")),
      );

      // The kid deletes the clip. The PRESENT project no longer mentions the
      // recording — collecting on that clause alone loses it forever.
      history = dispatch(history, { type: "removeClip", clipId: "c1" });
      expect(history.present.clips["c1"]).toBeUndefined();

      // Autosave fires (this is where collection happens).
      await port.saveProject(history.present, history);

      // The undo stack still reaches a project that references it, so it stays.
      expect(await port.getBlob("buf-1")).not.toBeNull();

      // And undo really does hand the clip back — WITH its audio, not silence.
      history = undo(history);
      expect(history.present.clips["c1"]).toBeDefined();
      const restored = await port.getBlob("buf-1");
      expect(restored).not.toBeNull();
      expect(textOf(restored as Blob)).toBe("my voice");
    });

    it("keeps a recording only a REDO can reach", async () => {
      await port.putBlob("buf-1", blobOf("my voice"));
      let history = initHistory(emptyProject("p1"));
      history = dispatch(history, {
        type: "addClip",
        clip: recordingClip("c1", "buf-1"),
      });
      history = undo(history); // the clip now lives only in `future`
      expect(history.present.clips["c1"]).toBeUndefined();
      expect(history.future.length).toBe(1);

      await port.saveProject(history.present, history);
      expect(await port.getBlob("buf-1")).not.toBeNull();

      history = redo(history);
      expect(history.present.clips["c1"]).toBeDefined();
      expect(textOf((await port.getBlob("buf-1")) as Blob)).toBe("my voice");
    });

    it("collects the recording once it has fallen out of history for good", async () => {
      await port.putBlob("buf-1", blobOf("my voice"));
      let history = initHistory(
        withRecording(emptyProject("p1"), recordingClip("c1", "buf-1")),
      );
      history = dispatch(history, { type: "removeClip", clipId: "c1" });

      // The kid keeps playing until nothing on either stack remembers the clip
      // (what HISTORY_LIMIT does over time, expressed directly).
      const forgotten = initHistory(history.present);
      await port.saveProject(forgotten.present, forgotten);

      expect(await port.getBlob("buf-1")).toBeNull();
    });
  });
}

// One suite, two implementations. Adding a case above adds it to both.
storagePortContract("LocalStoragePort (localStorage + IndexedDB)", makeRealHarness);
storagePortContract("MemoryStoragePort (fake)", makeFakeHarness);

// ── The retention rule itself ────────────────────────────────────────────────

describe("reachableBlobIds", () => {
  it("takes an undo stack, and cannot take a bare Project", () => {
    // The compile-time half of the retention guarantee: `HistoryState` IS a
    // `ReachableProjects`, so a caller passes its history straight in — while a
    // bare `Project` does not typecheck, which is what makes "collected without
    // consulting history" unrepresentable rather than merely discouraged.
    const history = initHistory(
      withRecording(emptyProject("p1"), recordingClip("c1", "buf-1")),
    );
    const scope: ReachableProjects = history;
    expect([...reachableBlobIds(scope)]).toEqual(["buf-1"]);
  });

  it("unions present, past and future", () => {
    let history = initHistory(
      withRecording(emptyProject("p1"), recordingClip("past", "buf-past")),
    );
    history = dispatch(history, { type: "removeClip", clipId: "past" });
    history = dispatch(history, {
      type: "addClip",
      clip: recordingClip("future", "buf-future"),
    });
    history = undo(history); // "future" is now only reachable by redo
    history = dispatch(history, {
      type: "addClip",
      clip: recordingClip("now", "buf-now"),
    });

    const ids = reachableBlobIds(history);
    expect([...ids].sort()).toEqual(["buf-now", "buf-past"].sort());
    // (`buf-future` left the redo stack the moment a new command was dispatched
    // — `dispatch` clears `future` — so it is genuinely unreachable now.)
  });

  it("ignores clips that are not recordings", () => {
    const project = reduce(emptyProject("p1"), {
      type: "addClip",
      clip: {
        id: "c1",
        source: { kind: "builtin", assetId: "kick" },
        effects: [],
        color: "#fff",
        label: "kick",
      },
    });
    expect(reachableBlobIds(initHistory(project)).size).toBe(0);
  });
});

// ── Adapter-specific: what the failure is ACTUALLY called ────────────────────
// These cannot live in the contract: they are about how one implementation's
// substrate breaks. They are the proof for S4's finding that every failure was
// mislabelled as "your device is full".

describe("LocalStoragePort failure classification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("reports a genuinely full device as full", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      // What a browser actually throws when the quota is gone.
      throw new DOMException("out of room", "QuotaExceededError");
    });
    await expect(
      new LocalStoragePort().saveProject(emptyProject("p1")),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it("does NOT call an ordinary write failure a full device", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage is switched off in this frame");
    });
    const save = new LocalStoragePort().saveProject(emptyProject("p1"));
    await expect(save).rejects.toBeInstanceOf(StorageError);
    await expect(save).rejects.not.toBeInstanceOf(QuotaExceededError);
    await expect(save).rejects.toMatchObject({ code: "unavailable" });
  });

  it("no longer throws a raw DOMException out of deleteProject", async () => {
    const port = new LocalStoragePort();
    await port.saveProject(emptyProject("p1"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("nope", "InvalidStateError");
    });
    // Before S6 this method had no try/catch at all.
    await expect(port.deleteProject("p1")).rejects.toBeInstanceOf(StorageError);
  });

  it("says 'unavailable', not 'full', when the browser has no IndexedDB", async () => {
    // S4's mislabelled-quota bug, exactly: `putBlob`'s catch covered `openDb()`
    // failing outright, so a device with plenty of room was told "No more
    // room!". A fresh module instance is imported because the adapter caches
    // its database handle for the life of the module.
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
    const { LocalStoragePort: Fresh } = await import(
      "../../src/adapters/local-storage-port.ts"
    );
    // The reset gives the adapter a fresh copy of the PORT module too, so its
    // error classes are different objects from the ones imported at the top of
    // this file — `instanceof` has to be asked against that same copy.
    const ports = await import("../../src/ports/storage-port.ts");

    const put = new Fresh().putBlob("buf-1", blobOf("hi"));
    await expect(put).rejects.toBeInstanceOf(ports.StorageError);
    await expect(put).rejects.not.toBeInstanceOf(ports.QuotaExceededError);
    await expect(put).rejects.toMatchObject({ code: "unavailable" });

    vi.resetModules();
  });

  it("keeps a broken blob store from costing a kid their whole song", async () => {
    // The one surviving swallow, asserted so it stays deliberate: `getBlob`
    // answers null rather than rejecting, because it runs once per recorded
    // clip while a song is being restored.
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
    const { LocalStoragePort: Fresh } = await import(
      "../../src/adapters/local-storage-port.ts"
    );

    await expect(new Fresh().getBlob("buf-1")).resolves.toBeNull();

    vi.resetModules();
  });
});
