// Voice ownership for scheduled melody notes. Vendor-free on purpose: the
// allocation rule is the part worth testing, and it needs no audio.
//
// The adapter used to build one instrument per scheduled NOTE EVENT, so a dense
// three-car ride held a synth for every future note whether or not two of them
// could ever sound together. A pool hands a note an existing voice whenever
// that voice is provably silent for the note's whole span — and builds a new
// one otherwise. The pool is therefore sized by the music's real overlap, not
// by its note count, and it never steals: a chord of three still gets three
// voices, and a ringing tail is never retriggered away.

/** Where a note sits in the repeating cycle, in seconds at the base tempo.
 *  `needSec` is everything the voice is occupied for: the held note, its
 *  release tail, and any headroom the caller wants (see `VoicePool.acquire`). */
export interface VoiceSpan {
  readonly startSec: number;
  readonly needSec: number;
}

/** Do two spans collide on a loop of `cycleSec`? The schedule repeats, so a
 *  tail at the end of the cycle can land on a note at its start. */
export function spansCollide(a: VoiceSpan, b: VoiceSpan, cycleSec: number): boolean {
  if (!(cycleSec > 0)) return true;
  const ahead = (((b.startSec - a.startSec) % cycleSec) + cycleSec) % cycleSec;
  // b starts `ahead` after a; a starts `cycleSec - ahead` after b.
  return ahead < a.needSec || cycleSec - ahead < b.needSec;
}

interface PooledVoice<V> {
  readonly voice: V;
  readonly spans: VoiceSpan[];
}

export class VoicePool<V> {
  private readonly pools = new Map<string, PooledVoice<V>[]>();

  /** The voice that will play this span: a pooled one that is free for all of
   *  it, else a freshly built one. Voices are only shared within `key` — the
   *  caller puts everything that makes two voices non-interchangeable there
   *  (lane, instrument, level, cycle). */
  acquire(key: string, span: VoiceSpan, cycleSec: number, build: () => V): V {
    let pool = this.pools.get(key);
    if (!pool) {
      pool = [];
      this.pools.set(key, pool);
    }
    for (const entry of pool) {
      if (entry.spans.every((s) => !spansCollide(s, span, cycleSec))) {
        entry.spans.push(span);
        return entry.voice;
      }
    }
    const voice = build();
    pool.push({ voice, spans: [span] });
    return voice;
  }

  /** Forget every assignment. The caller owns (and disposes) the voices. */
  clear(): void {
    this.pools.clear();
  }
}
