// Storage adapter: Project JSON in localStorage (small), recorded blobs in
// IndexedDB (large). Minimal working implementation; IndexedDB blob store is a
// build-out TODO but the localStorage project flow is real.

import {
  QuotaExceededError,
  type SavedProjectMeta,
  type StoragePort,
} from "../ports/storage-port.ts";
import { deserialize, serialize } from "../core/project-state.ts";
import type { Project } from "../core/types.ts";

const KEY = "ibeetkidz:projects";
const DB_NAME = "ibeetkidz";
const BLOB_STORE = "blobs";

interface Index {
  [id: string]: { name: string; savedAt: number; json: string };
}

function readIndex(): Index {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Index;
  } catch {
    return {};
  }
}

// ── IndexedDB blob store (recorded audio is too big for localStorage) ────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
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
  return dbPromise;
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
  async saveProject(project: Project): Promise<void> {
    const idx = readIndex();
    idx[project.id] = {
      name: project.name,
      savedAt: Date.now(),
      json: serialize(project),
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(idx));
    } catch {
      throw new QuotaExceededError();
    }
  }

  async listProjects(): Promise<readonly SavedProjectMeta[]> {
    const idx = readIndex();
    return Object.entries(idx).map(([id, v]) => ({
      id,
      name: v.name,
      savedAt: v.savedAt,
    }));
  }

  async loadProject(id: string): Promise<Project | null> {
    const entry = readIndex()[id];
    return entry ? deserialize(entry.json) : null;
  }

  async deleteProject(id: string): Promise<void> {
    const idx = readIndex();
    delete idx[id];
    localStorage.setItem(KEY, JSON.stringify(idx));
  }

  async putBlob(id: string, blob: Blob): Promise<void> {
    try {
      await tx("readwrite", (store) => store.put(blob, id));
    } catch {
      throw new QuotaExceededError();
    }
  }

  async getBlob(id: string): Promise<Blob | null> {
    try {
      const result = await tx<Blob | undefined>("readonly", (store) =>
        store.get(id),
      );
      return result ?? null;
    } catch {
      return null;
    }
  }
}
