// InputRouter: the single pointer/touch/key entry point (kidpix's ev_canvas
// analog). It normalizes touch vs mouse to a unified PointerSample and throttles
// the firehose of events a kid generates by hammering the screen.

export interface PointerSample {
  /** Normalized 0..1 within the target element. */
  readonly x: number;
  readonly y: number;
  readonly phase: "down" | "move" | "up";
}

export type PointerHandler = (s: PointerSample) => void;

export function attachPointer(
  el: HTMLElement,
  handler: PointerHandler,
  throttleMs = 16,
): () => void {
  let last = 0;
  const norm = (ev: PointerEvent, phase: PointerSample["phase"]): PointerSample => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)),
      phase,
    };
  };

  const down = (ev: PointerEvent) => {
    el.setPointerCapture(ev.pointerId);
    handler(norm(ev, "down"));
  };
  const move = (ev: PointerEvent) => {
    const now = performance.now();
    if (now - last < throttleMs) return; // throttle move flood
    last = now;
    if (ev.pressure > 0 || ev.buttons > 0) handler(norm(ev, "move"));
  };
  const up = (ev: PointerEvent) => handler(norm(ev, "up"));

  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
  };
}
