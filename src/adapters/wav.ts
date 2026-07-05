// Minimal 16-bit PCM WAV encoder. WAV is the one audio container every OS
// share target and media player accepts, so the exported song is playable
// wherever a kid (or grandparent) opens it. Structurally typed so unit tests
// can feed a plain object instead of a real AudioBuffer.

/** The slice of AudioBuffer the encoder needs (AudioBuffer satisfies it). */
export interface PcmSource {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

export function encodeWav(buffer: PcmSource): Blob {
  return new Blob([encodeWavBytes(buffer)], { type: "audio/wav" });
}

/** The raw RIFF/WAVE bytes — split out so unit tests can inspect them without
 *  Blob.arrayBuffer (absent in jsdom). */
export function encodeWavBytes(buffer: PcmSource): ArrayBuffer {
  const channels = Math.max(1, Math.min(2, buffer.numberOfChannels));
  const frames = buffer.length;
  const bytesPerFrame = channels * 2;
  const dataSize = frames * bytesPerFrame;
  const out = new ArrayBuffer(44 + dataSize);
  const v = new DataView(out);
  const ascii = (offset: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  v.setUint32(4, 36 + dataSize, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, channels, true);
  v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * bytesPerFrame, true);
  v.setUint16(32, bytesPerFrame, true);
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  v.setUint32(40, dataSize, true);

  // A mono source fills both would-be channels implicitly (channels = 1);
  // >2-channel sources just take their first two.
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c]![i]!));
      v.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}
