import { describe, expect, it } from "vitest";
import { parseTiledLayer, TiledMapSchema, type TiledSpawn } from "../../src/game/TiledParser.ts";
import { UI_SPRITES } from "../../src/game/ui-sprites.ts";
// The real on-disk Tiled fixtures the scenes interpret verbatim.
import YARD from "../../src/assets/maps/yard.json";
import TRACK from "../../src/assets/maps/track.json";

// The Yard/Track Three-Zone maps (UI_REFACTOR_DELEGATION Phase 2). These are
// the contracts the generic ui-scene engine relies on: every `sprite` key must
// resolve in the UI_SPRITES manifest (the scenes preload ONLY the keys their
// map references), every interactive object must carry a real EventBus action,
// and icon-only buttons must carry a caption.

const yard = parseTiledLayer(YARD, "ui-layer");
const track = parseTiledLayer(TRACK, "ui-layer");

function need(spawns: readonly TiledSpawn[], id: string): TiledSpawn {
  const s = spawns.find((x) => x.id === id);
  if (!s) throw new Error(`no spawn "${id}" in fixture`);
  return s;
}

describe.each([
  ["yard.json", YARD, yard],
  ["track.json", TRACK, track],
])("%s (Three-Zone v3)", (_name, map, spawns) => {
  it("validates against the Tiled schema", () => {
    expect(() => TiledMapSchema.parse(map)).not.toThrow();
  });

  it("normalizes every descriptor into the open unit square", () => {
    for (const s of spawns) {
      expect(s.cx).toBeGreaterThan(0);
      expect(s.cx).toBeLessThan(1);
      expect(s.cy).toBeGreaterThan(0);
      expect(s.cy).toBeLessThan(1);
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
    }
  });

  it("resolves every authored sprite key in the UI_SPRITES manifest", () => {
    for (const s of spawns) {
      if (s.sprite !== undefined) {
        expect(UI_SPRITES[s.sprite], `${s.id} → ${s.sprite}`).toBeDefined();
      }
    }
  });

  it("captions every interactive object (labels are the kid-readable names)", () => {
    for (const s of spawns) {
      if (s.action !== undefined) {
        expect(s.label, `${s.id} needs a label`).toBeTypeOf("string");
      }
    }
  });
});

describe("yard.json wiring", () => {
  it("wires the top-bar nav plaques", () => {
    const ws = need(yard, "btn-yard-workshop");
    expect(ws.sprite).toBe("btn-nav-workshop");
    expect(ws.action).toBe("yard-nav");
    expect(ws.arg).toBe("workshop");
    const exit = need(yard, "btn-yard-exit");
    expect(exit.action).toBe("yard-nav");
    expect(exit.arg).toBe("map");
    expect(exit.anchor).toBe("ui-top-right");
  });

  it("places the interim action strip as a panel", () => {
    const p = need(yard, "panel-yard-actions");
    expect(p.klass).toBe("panel");
    expect(p.sprite).toBe("panel-yard-actions");
    expect(p.action).toBeUndefined();
  });

  it("wires all five bottom-bar actions", () => {
    expect(need(yard, "btn-edit-car").action).toBe("yard-edit-car");
    expect(need(yard, "btn-add-to-train").action).toBe("yard-add");
    expect(need(yard, "btn-remove-from-train").action).toBe("yard-remove-from-train");
    expect(need(yard, "btn-send-to-track").action).toBe("yard-depart");
    expect(need(yard, "btn-delete-car").action).toBe("yard-remove-car");
  });

  it("lands the action hits on the strip's baked tiles (content-box mapping)", () => {
    // The strip's frame content box maps [480,980,1600,430] onto the canvas;
    // tile centres were measured from the art. Spot-check the first + last.
    expect(need(yard, "btn-edit-car").cx).toBeCloseTo(679 / 2560, 3);
    expect(need(yard, "btn-delete-car").cx).toBeCloseTo(1893 / 2560, 3);
    // Every action hit sits inside the panel's span.
    const p = need(yard, "panel-yard-actions");
    for (const s of yard.filter((x) => x.klass === "action")) {
      expect(Math.abs(s.cx - p.cx)).toBeLessThan(p.w / 2);
      expect(Math.abs(s.cy - p.cy)).toBeLessThan(p.h / 2);
    }
  });
});

describe("track.json wiring", () => {
  it("wires the top-bar nav plaques", () => {
    const y = need(track, "btn-track-yard");
    expect(y.sprite).toBe("btn-nav-yard");
    expect(y.action).toBe("track-nav");
    expect(y.arg).toBe("yard");
    const exit = need(track, "btn-track-exit");
    expect(exit.arg).toBe("map");
    expect(exit.anchor).toBe("ui-top-right");
  });

  it("builds the transport bar from real sprite buttons with pressed states", () => {
    for (const [id, sprite] of [
      ["btn-tempo-down", "btn-tempo-down"],
      ["btn-stop", "btn-stop"],
      ["btn-ride", "btn-play"],
      ["btn-tempo-up", "btn-tempo-up"],
    ] as const) {
      const s = need(track, id);
      expect(s.sprite).toBe(sprite);
      expect(UI_SPRITES[sprite]!.states["pressed"]).toBeTypeOf("string");
    }
  });

  it("rides in ride mode and nudges tempo by ±10 as numbers", () => {
    const ride = need(track, "btn-ride");
    expect(ride.action).toBe("transport-play");
    expect(ride.arg).toBe("ride");
    expect(need(track, "btn-tempo-down").arg).toBe(-10);
    expect(need(track, "btn-tempo-up").arg).toBe(10);
    expect(need(track, "btn-stop").action).toBe("transport-stop");
  });

  it("leaves the SPEED LCD anchor actionless", () => {
    const lcd = need(track, "lcd-transport");
    expect(lcd.klass).toBe("display");
    expect(lcd.action).toBeUndefined();
  });
});
