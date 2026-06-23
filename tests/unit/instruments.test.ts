import { describe, expect, it } from "vitest";
import {
  INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  instrumentForWave,
  resolveInstrument,
} from "../../src/core/instruments.ts";

describe("instruments", () => {
  it("maps the four legacy waves onto their equivalent instrument", () => {
    expect(instrumentForWave("triangle")).toBe("soft");
    expect(instrumentForWave("sine")).toBe("smooth");
    expect(instrumentForWave("square")).toBe("buzzy");
    expect(instrumentForWave("sawtooth")).toBe("sharp");
  });

  it("resolves to the lane's instrument when set, else derives from wave", () => {
    expect(resolveInstrument("bells", "triangle")).toBe("bells");
    // Absent → derived from the legacy wave (old saves sound unchanged).
    expect(resolveInstrument(undefined, "sawtooth")).toBe("sharp");
    // An unknown/garbage id falls back to the wave too.
    expect(resolveInstrument("zzz" as never, "sine")).toBe("smooth");
  });

  it("catalog ids are unique and include the default", () => {
    const ids = INSTRUMENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_INSTRUMENT);
  });
});
