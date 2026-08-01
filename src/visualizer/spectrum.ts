// Turning an FFT into bars you can actually watch.
//
// Both bar-drawing styles used to walk the spectrum LINEARLY — `spectrum.length
// / bars` bins per bar. That is wrong for this app in a way that only shows up
// once the visualizer is big enough to look at: a 2048-point FFT at 48 kHz is
// ~23 Hz per bin, so a kid's melody, voice and drums all live in roughly the
// first 3% of the bins. Sampling evenly spent 96% of the screen width on
// frequencies nothing here produces, and the first screenshot of the finished
// jumbotron showed exactly that — a couple of stubs on the left and a wide
// empty plain.
//
// Log spacing is the fix and it is also just how ears work: each band covers a
// constant RATIO of frequency, so an octave gets the same width wherever it sits.
//
// ONE PRODUCER: both `bars` and `retro-scope` call this rather than each
// carrying its own binning loop (they had two slightly different ones).

/** Lowest bin to show. Bin 0 is DC — a constant offset, never music. */
const MIN_BIN = 1;

/** Scratch buffers, keyed by band count. A render loop allocating a fresh array
 *  every frame is how you get GC hitches in an animation; module-scoped mutable
 *  state is fine here for the same reason `blob.ts` says it is — this is a
 *  rendering adapter, not core. */
const scratch = new Map<number, Float32Array>();

/**
 * Reduce `spectrum` (0..255 magnitudes) to `bands` log-spaced levels, 0..1.
 *
 * PEAK within each band, not mean. Log bands are wide at the top — the last of
 * 28 bands spans hundreds of bins — so averaging buries a loud harmonic under
 * the silence either side of it and the bars barely leave the floor. Peak is
 * also what every hardware analyser shows, and it stays honest: it is a real
 * magnitude that was really in the signal, not a boost.
 *
 * The returned array is REUSED between calls with the same band count — read it
 * and draw, do not retain it.
 */
export function bandLevels(spectrum: Uint8Array, bands: number): Float32Array {
  let out = scratch.get(bands);
  if (!out || out.length !== bands) {
    out = new Float32Array(bands);
    scratch.set(bands, out);
  }
  const top = spectrum.length;
  if (bands <= 0 || top <= MIN_BIN) {
    out.fill(0);
    return out;
  }
  // Constant ratio per band: bin(i) = MIN_BIN * (top/MIN_BIN)^(i/bands).
  const ratio = Math.log(top / MIN_BIN) / bands;
  let lo = MIN_BIN;
  for (let i = 0; i < bands; i++) {
    // At the bottom the ideal edges land inside one bin; step by at least one
    // so no band is empty and the low end still reads as separate bars.
    const hi = Math.max(lo + 1, Math.min(top, Math.round(MIN_BIN * Math.exp(ratio * (i + 1)))));
    let peak = 0;
    for (let b = lo; b < hi; b++) {
      const v = spectrum[b] ?? 0;
      if (v > peak) peak = v;
    }
    out[i] = peak / 255;
    lo = hi;
  }
  return out;
}
