// Pure quantization policy — no Tone, no DOM, no state. Decides whether a
// one-off trigger should snap to the beat, and to which grid. The actual
// "time of the next grid line" is the adapter's job (it owns the transport);
// this module owns the *policy* so it stays unit-testable.
//
// Grid names describe the snap resolution:
//   "off"     → never snap (instant)
//   "bar"     → snap to the downbeat (1 bar)
//   "beat"    → snap to each beat / quarter note   ← default
//   "half"    → snap to half-beats / eighth notes
//   "quarter" → snap to quarter-beats / sixteenths

export type QuantizeGrid = "off" | "bar" | "beat" | "half" | "quarter";

/** Tone.js subdivision notation for each grid. `null` = no snapping. */
export function gridSubdivision(grid: QuantizeGrid): string | null {
  switch (grid) {
    case "off":
      return null;
    case "bar":
      return "1m";
    case "beat":
      return "4n";
    case "half":
      return "8n";
    case "quarter":
      return "16n";
  }
}

/** Core rule: snap only while the beat is playing AND a grid is selected.
 *  When stopped, triggers fire instantly so solo exploration stays snappy. */
export function shouldQuantize(
  grid: QuantizeGrid,
  transportRunning: boolean,
): boolean {
  return transportRunning && grid !== "off";
}
