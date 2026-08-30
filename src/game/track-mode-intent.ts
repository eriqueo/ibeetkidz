import { MODE_KINDS, type ModeKind } from "../core/terrain.ts";

/** Ports owned by the Track composition boundary. The coordinator sequences a
 *  user intent; it does not weaken AudioEngine's rule that a mode may only be
 *  committed against a live transport. */
export interface TrackModeIntentPorts {
  readonly isRideActive: () => boolean;
  readonly hasTrain: () => boolean;
  readonly startRide: () => Promise<void>;
  readonly commitMode: (kind: ModeKind) => void;
  readonly setPendingModes: (kinds: ReadonlySet<ModeKind>) => void;
  readonly onStartFailed: (error: unknown) => void;
}

/**
 * Turns a job-switch tap into the compound intent a kid sees: start the train,
 * then apply that job. At most one Ride start may be in flight.
 *
 * The pending buffer is bounded by the registered `MODE_KINDS` vocabulary:
 * one entry per kind, seven entries maximum. A duplicate tap removes that kind
 * (cancellation); an invalid or eighth unregistered value is shed. Different
 * kinds retain insertion order and therefore drain in tap order.
 */
export class TrackModeIntentCoordinator {
  private readonly pending = new Set<ModeKind>();
  private startFlight: Promise<void> | null = null;
  private generation = 0;
  private disposed = false;

  constructor(private readonly ports: TrackModeIntentPorts) {}

  get pendingModes(): readonly ModeKind[] {
    return [...this.pending];
  }

  /** The ordinary RIDE key shares the same flight, so tapping it while a cold
   *  job intent is preparing cannot supersede that preparation with a second
   *  start. Once already riding, a fresh key tap retains the existing restart
   *  behavior. */
  startRide(): void {
    if (this.disposed || !this.ports.hasTrain() || this.startFlight) return;
    this.beginStart();
  }

  request(kind: ModeKind): void {
    if (this.disposed || !(MODE_KINDS as readonly string[]).includes(kind)) return;
    if (this.ports.isRideActive()) {
      this.ports.commitMode(kind);
      return;
    }
    // A scenery-only transport is not a useful game state. CLEAR's existing
    // undo offer remains the route back when there is no consist to ride.
    if (!this.ports.hasTrain()) return;

    if (this.pending.has(kind)) this.pending.delete(kind);
    else if (this.pending.size < MODE_KINDS.length) this.pending.add(kind);
    this.publishPending();

    // A cancellation does not stop a Ride start already crossing an async
    // preparation boundary. It only guarantees that the cancelled mode will
    // not be committed when that start settles.
    if (!this.startFlight) this.beginStart();
  }

  /** STOP invalidates both queued modes and the authority of an old start. */
  clear(): void {
    this.generation += 1;
    this.pending.clear();
    this.publishPending();
  }

  /** Unmount is terminal: late async completion must not publish into a scene
   *  which no longer owns the Track interaction. */
  dispose(): void {
    this.disposed = true;
    this.clear();
  }

  private publishPending(): void {
    this.ports.setPendingModes(new Set(this.pending));
  }

  private drainPending(): void {
    const queued = [...this.pending];
    this.pending.clear();
    this.publishPending();
    for (const kind of queued) this.ports.commitMode(kind);
  }

  private beginStart(): void {
    const generation = this.generation;
    let flight: Promise<void>;
    try {
      flight = this.ports.startRide();
    } catch (error) {
      this.failStart(error, generation);
      return;
    }
    this.startFlight = flight;
    void flight
      .then(() => {
        if (this.disposed || generation !== this.generation) return;
        if (!this.ports.isRideActive()) {
          this.pending.clear();
          this.publishPending();
          return;
        }
        this.drainPending();
      })
      .catch((error: unknown) => this.failStart(error, generation))
      .finally(() => {
        if (this.startFlight === flight) this.startFlight = null;
        if (this.disposed || this.pending.size === 0) return;
        // A new intent may arrive after STOP invalidated the old flight. Reuse
        // a Ride which nevertheless became authoritative; otherwise start one
        // fresh flight. Never fan out two starts.
        if (this.ports.isRideActive()) this.drainPending();
        else this.beginStart();
      });
  }

  private failStart(error: unknown, generation: number): void {
    if (this.disposed || generation !== this.generation) return;
    this.pending.clear();
    this.publishPending();
    this.ports.onStartFailed(error);
  }
}
