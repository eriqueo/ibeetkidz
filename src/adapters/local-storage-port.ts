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

  async putBlob(_id: string, _blob: Blob): Promise<void> {
    // TODO(build): IndexedDB object store for recorded audio blobs.
  }
  async getBlob(_id: string): Promise<Blob | null> {
    // TODO(build): IndexedDB read.
    return null;
  }
}
