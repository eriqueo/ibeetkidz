import { describe, expect, it } from "vitest";
import {
  parseTiledLayer,
  TiledMapSchema,
  ANCHORS,
  type TiledSpawn,
} from "../../src/game/TiledParser.ts";
// The real fixture (a valid Tiled 1.10 export) — imported so the test exercises
// the on-disk artifact verbatim.
import WORKSHOP from "../../src/assets/maps/workshop.json";

const spawns = parseTiledLayer(WORKSHOP, "ui-layer");
function need(id: string): TiledSpawn {
  const s = spawns.find((x) => x.id === id);
  if (!s) throw new Error(`no spawn "${id}" in fixture`);
  return s;
}

// Minimal synthetic map helpers (px dims = 100*10 = 1000 × 1000).
const obj = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 1,
  name: "x",
  type: "t",
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  ...over,
});
const makeMap = (
  objects: unknown[],
  layerName = "ui-layer",
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  type: "map",
  width: 100,
  height: 100,
  tilewidth: 10,
  tileheight: 10,
  layers: [{ id: 1, name: layerName, type: "objectgroup", objects }],
  ...extra,
});

describe("workshop.json fixture", () => {
  it("validates against the Tiled schema", () => {
    expect(() => TiledMapSchema.parse(WORKSHOP)).not.toThrow();
  });

  it("projects the ui-layer into 21 descriptors", () => {
    expect(spawns).toHaveLength(21);
    expect(spawns.map((s) => s.id)).toContain("icon-notepad");
    expect(spawns.map((s) => s.id)).toContain("lcd-tempo-screen");
    expect(spawns.map((s) => s.id)).toContain("lcd-song-screen");
  });

  it("normalizes every descriptor into the open unit square", () => {
    for (const s of spawns) {
      expect(s.cx).toBeGreaterThan(0);
      expect(s.cx).toBeLessThan(1);
      expect(s.cy).toBeGreaterThan(0);
      expect(s.cy).toBeLessThan(1);
      expect(s.w).toBeGreaterThan(0);
      expect(s.w).toBeLessThanOrEqual(1);
      expect(s.h).toBeGreaterThan(0);
      expect(s.h).toBeLessThanOrEqual(1);
    }
  });
});

describe("toolbar objects", () => {
  it("wires a plain (no-arg) action: notepad → new car", () => {
    const s = need("icon-notepad");
    expect(s.klass).toBe("toolbar");
    expect(s.action).toBe("workshop-new-car");
    expect(s.arg).toBeUndefined();
    expect(s.anchor).toBe("bg");
    expect(s.cx).toBeCloseTo(0.295, 2);
    expect(s.cy).toBeCloseTo(0.075, 3);
    expect(s.w).toBeCloseTo(0.06, 2);
    expect(s.h).toBeCloseTo(0.1, 2);
  });

  it("wires an action with a string arg: musicnote → open theremin", () => {
    const s = need("icon-musicnote");
    expect(s.action).toBe("workshop-open-tool");
    expect(s.arg).toBe("theremin-xy");
  });

  it("carries the safe-zone anchor: exit → map, top-right", () => {
    const s = need("icon-exit");
    expect(s.action).toBe("workshop-nav");
    expect(s.arg).toBe("map");
    expect(s.anchor).toBe("ui-top-right");
    expect(s.cx).toBeCloseTo(0.858, 2);
  });
});

describe("instrument objects", () => {
  it("opens the right tool panel at the measured centre: drum → beat-grid", () => {
    const s = need("inst-drum");
    expect(s.klass).toBe("instrument");
    expect(s.action).toBe("workshop-open-tool");
    expect(s.arg).toBe("beat-grid");
    expect(s.cx).toBeCloseTo(0.262, 2);
    expect(s.cy).toBeCloseTo(0.69, 2);
  });

  it("maps each instrument to its action: drum/mic open tools, guitar/piano add melody lanes", () => {
    expect(need("inst-mic").arg).toBe("record-voicefx");
    expect(need("inst-guitar").action).toBe("workshop-add-melody");
    expect(need("inst-guitar").arg).toBe("guitar");
    expect(need("inst-keys").action).toBe("workshop-add-melody");
    expect(need("inst-keys").arg).toBe("piano");
  });
});

describe("transport objects", () => {
  it("emits stop with no arg", () => {
    const s = need("btn-stop");
    expect(s.action).toBe("transport-stop");
    expect(s.arg).toBeUndefined();
  });

  it("emits play with the loop mode arg", () => {
    expect(need("btn-play").action).toBe("transport-play");
    expect(need("btn-play").arg).toBe("loop");
  });

  it("preserves numeric tempo deltas as numbers, not strings", () => {
    const down = need("btn-speed-down");
    const up = need("btn-speed-up");
    expect(down.action).toBe("tempo-changed");
    expect(down.arg).toBe(-20); // one SPEED level = ±SPEED_STEP_BPM
    expect(typeof down.arg).toBe("number");
    expect(up.arg).toBe(20);
  });
});

describe("non-interactive display object", () => {
  it("leaves the TEMPO LCD actionless and positioned for the live BPM", () => {
    const s = need("lcd-tempo-screen");
    expect(s.klass).toBe("display");
    expect(s.action).toBeUndefined();
    expect(s.cx).toBeCloseTo(0.158, 2);
    expect(s.cy).toBeCloseTo(0.915, 2);
  });
});

describe("coordinate conventions", () => {
  it("treats rectangle objects (no gid) as top-left anchored", () => {
    const out = parseTiledLayer(makeMap([obj({ x: 400, y: 500, width: 100, height: 100 })]), "ui-layer");
    expect(out[0]?.cx).toBeCloseTo(0.45, 5); // (400+50)/1000
    expect(out[0]?.cy).toBeCloseTo(0.55, 5); // (500+50)/1000
  });

  it("treats tile objects (with gid) as bottom-left anchored", () => {
    const out = parseTiledLayer(
      makeMap([obj({ x: 400, y: 500, width: 100, height: 100, gid: 7 })]),
      "ui-layer",
    );
    expect(out[0]?.cx).toBeCloseTo(0.45, 5);
    expect(out[0]?.cy).toBeCloseTo(0.45, 5); // (500-50)/1000
  });
});

describe("property coercion", () => {
  const withProps = (props: unknown[]): TiledSpawn => {
    const out = parseTiledLayer(makeMap([obj({ properties: props })]), "ui-layer");
    if (!out[0]) throw new Error("no descriptor");
    return out[0];
  };

  it("ignores a non-string/number arg (e.g. a bool)", () => {
    const s = withProps([{ name: "arg", type: "bool", value: true }]);
    expect(s.arg).toBeUndefined();
  });

  it("drops an empty-string action (treated as non-interactive)", () => {
    const s = withProps([{ name: "action", type: "string", value: "" }]);
    expect(s.action).toBeUndefined();
  });

  it("falls back to bg anchor for an unknown anchor value", () => {
    const s = withProps([{ name: "anchor", type: "string", value: "diagonal" }]);
    expect(s.anchor).toBe("bg");
  });

  it("exposes exactly the three supported anchors", () => {
    expect([...ANCHORS]).toEqual(["bg", "ui-top-right", "ui-bottom-center"]);
  });
});

describe("validation errors", () => {
  it("rejects JSON that is not a Tiled map", () => {
    expect(() => parseTiledLayer({ foo: 1 }, "ui-layer")).toThrow();
  });

  it("rejects a map missing a required field (tilewidth)", () => {
    const bad = makeMap([obj()]);
    delete bad["tilewidth"];
    expect(() => parseTiledLayer(bad, "ui-layer")).toThrow();
  });

  it("rejects an object missing a required field (width)", () => {
    const noWidth = { id: 1, name: "x", type: "t", x: 0, y: 0, height: 10 };
    expect(() => parseTiledLayer(makeMap([noWidth]), "ui-layer")).toThrow();
  });

  it("throws a helpful error when the named object layer is absent", () => {
    expect(() => parseTiledLayer(makeMap([obj()], "ui-layer"), "missing-layer")).toThrow(
      /no object layer named "missing-layer"/,
    );
  });

  it("returns an empty array for an empty object layer", () => {
    expect(parseTiledLayer(makeMap([]), "ui-layer")).toEqual([]);
  });
});
