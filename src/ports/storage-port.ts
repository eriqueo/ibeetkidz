// StoragePort: persists creations. Small state (Project JSON) and large blobs
// (recorded audio) have different homes — localStorage vs IndexedDB — but the
// core only sees this interface, so quota/eviction edge cases stay contained.

import type { Project } from "../core/types.ts";

export interface SavedProjectMeta {
  readonly id: string;
  readonly name: string;
  readonly savedAt: number;
}

export interface StoragePort {
  saveProject(project: Project): Promise<void>;
  listProjects(): Promise<readonly SavedProjectMeta[]>;
  loadProject(id: string): Promise<Project | null>;
  deleteProject(id: string): Promise<void>;

  /** Store/fetch a recorded audio blob by id. */
  putBlob(id: string, blob: Blob): Promise<void>;
  getBlob(id: string): Promise<Blob | null>;
}

export class QuotaExceededError extends Error {
  constructor() {
    super("Storage is full");
    this.name = "QuotaExceededError";
  }
}
