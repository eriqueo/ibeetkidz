// A byte-budgeted least-recently-used map for DISPOSABLE derived audio: effect
// bakes, beat-snapped loops, trimmed sampler copies, synthesized drums. Every
// entry can be rebuilt from an original, so eviction costs a re-render and
// never music. Originals (recordings, built-ins) must not be stored here.
//
// At the cap: the least-recently-used entries are dropped until the budget
// holds. The entry being written is never dropped, so one oversized buffer
// still plays — it simply lives alone. A voice already scheduled keeps its own
// reference to its buffer, so eviction cannot silence anything that is sounding.

export class ByteLru<K, V> {
  private readonly entries = new Map<K, { value: V; bytes: number }>();
  private total = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly sizeOf: (value: V) => number,
  ) {}

  /** Read and mark as recently used. */
  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /** Presence check that also marks as recently used — a caller that skips
   *  work because the entry exists is about to depend on it. */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  set(key: K, value: V): void {
    const old = this.entries.get(key);
    if (old) {
      this.total -= old.bytes;
      this.entries.delete(key);
    }
    const bytes = Math.max(0, this.sizeOf(value));
    this.entries.set(key, { value, bytes });
    this.total += bytes;
    for (const [k, entry] of this.entries) {
      if (this.total <= this.maxBytes || k === key) break;
      this.entries.delete(k);
      this.total -= entry.bytes;
    }
  }

  get stats(): { entries: number; bytes: number } {
    return { entries: this.entries.size, bytes: this.total };
  }
}
