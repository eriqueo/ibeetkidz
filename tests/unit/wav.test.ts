import { describe, expect, it } from "vitest";
import { encodeWav, encodeWavBytes, type PcmSource } from "../../src/adapters/wav.ts";

/** A tiny in-memory PcmSource (what AudioBuffer provides structurally). */
function pcm(channels: Float32Array[], sampleRate = 44100): PcmSource {
  return {
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    sampleRate,
    getChannelData: (c) => channels[c]!,
  };
}

describe("encodeWav", () => {
  it("writes a valid RIFF/WAVE header for a stereo buffer", () => {
    const src = pcm([new Float32Array([0, 0.5]), new Float32Array([0, -0.5])], 48000);
    const v = new DataView(encodeWavBytes(src));
    const tag = (o: number, n: number) =>
      String.fromCharCode(...Array.from({ length: n }, (_, i) => v.getUint8(o + i)));
    expect(tag(0, 4)).toBe("RIFF");
    expect(tag(8, 4)).toBe("WAVE");
    expect(v.getUint16(22, true)).toBe(2); // channels
    expect(v.getUint32(24, true)).toBe(48000); // sample rate
    expect(v.getUint16(34, true)).toBe(16); // bit depth
    expect(v.getUint32(40, true)).toBe(2 * 2 * 2); // data size: frames×ch×2B
    expect(v.byteLength).toBe(44 + 8);
    const blob = encodeWav(src);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + 8);
  });

  it("interleaves channels and scales samples to 16-bit, clamping overs", () => {
    const v = new DataView(
      encodeWavBytes(pcm([new Float32Array([1, 2]), new Float32Array([-1, -2])])),
    );
    expect(v.getInt16(44, true)).toBe(0x7fff); // L0 = full scale
    expect(v.getInt16(46, true)).toBe(-0x8000); // R0 = full negative
    expect(v.getInt16(48, true)).toBe(0x7fff); // L1 clamped
    expect(v.getInt16(50, true)).toBe(-0x8000); // R1 clamped
  });

  it("keeps a mono buffer mono", () => {
    const v = new DataView(encodeWavBytes(pcm([new Float32Array([0.25])])));
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getInt16(44, true)).toBe(Math.floor(0.25 * 0x7fff));
    expect(v.byteLength).toBe(44 + 2);
  });
});
