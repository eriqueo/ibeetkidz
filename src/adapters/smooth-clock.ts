// A frame-rate view of the audio clock.
//
// `AudioContext.currentTime` does not advance continuously: it jumps by one
// hardware buffer at a time. Measured on Linux Chrome (48 kHz): 42.67 ms per
// jump, so an animation that reads it every frame stands still for most frames
// and then leaps — a ~23 Hz train on a 165 Hz screen, with perfect frame
// timing. The wall clock IS continuous, and the two run at the same rate, so
// the audio clock is rebuilt as `wall + offset`, where `offset` is the slowly
// filtered difference between them. The filter sits at the MEAN of the
// sawtooth, i.e. the same average position the raw reads gave, so picture and
// sound keep the sync they had.
//
// Audio scheduling never uses this. It is for drawing only.

/** How slowly the offset follows the measured difference. One second turns a
 *  43 ms sawtooth into under a millisecond of ripple — below one pixel of
 *  scroll — and still tracks real drift between the two clocks. */
const FOLLOW_SEC = 1;

/** A difference this far from the filtered one is not buffer jitter: the
 *  context was suspended, resumed, or replaced. Follow it at once. */
const RESYNC_SEC = 0.12;

export class SmoothClock {
  private offset: number | null = null;
  private lastWall = 0;

  /** The audio time to draw at, given both clocks read in the same instant. */
  read(audioSec: number, wallSec: number): number {
    const diff = audioSec - wallSec;
    if (this.offset === null || Math.abs(diff - this.offset) > RESYNC_SEC) {
      this.offset = diff;
    } else {
      const dt = Math.max(0, wallSec - this.lastWall);
      this.offset += (diff - this.offset) * (1 - Math.exp(-dt / FOLLOW_SEC));
    }
    this.lastWall = wallSec;
    return wallSec + this.offset;
  }

  reset(): void {
    this.offset = null;
  }
}
