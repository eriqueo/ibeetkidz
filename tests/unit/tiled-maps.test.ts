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

  it("gives every interactive object real art or a caption (nothing anonymous)", () => {
    // Buttons with baked-in labels (nav plaques, yard keycaps, RIDE) need no
    // Tiled caption; icon-only keycaps (SLOW/STOP/FAST) author one.
    for (const s of spawns) {
      if (s.action !== undefined) {
        expect(
          s.sprite !== undefined || s.label !== undefined,
          `${s.id} needs a sprite or a label`,
        ).toBe(true);
      }
    }
  });

  it("resolves every sprite button in the manifest with idle art", () => {
    for (const s of spawns) {
      if (s.sprite === undefined || s.klass !== "ui-button") continue;
      expect(UI_SPRITES[s.sprite]!.states["idle"], `${s.id} idle`).toBeTypeOf("string");
    }
  });
});

describe("yard.json wiring", () => {
  it("mounts the shared steampunk header with nav plaques on it", () => {
    expect(need(yard, "panel-header").sprite).toBe("panel-header-v2");
    const ws = need(yard, "btn-yard-workshop");
    expect(ws.sprite).toBe("btn-nav-workshop");
    expect(ws.action).toBe("yard-nav");
    expect(ws.arg).toBe("workshop");
    const track_ = need(yard, "btn-yard-track");
    expect(track_.sprite).toBe("btn-nav-track");
    expect(track_.action).toBe("yard-nav");
    expect(track_.arg).toBe("track");
    expect(track_.anchor).toBe("ui-top-right");
  });

  it("places the empty actions plate as a panel", () => {
    const p = need(yard, "panel-yard-actions");
    expect(p.klass).toBe("panel");
    expect(p.sprite).toBe("panel-yard-actions");
    expect(p.action).toBeUndefined();
  });

  it("wires all five bottom-bar actions to real keycap sprites with pressed art", () => {
    for (const [id, sprite, action] of [
      ["btn-edit-car", "btn-yard-edit", "yard-edit-car"],
      ["btn-add-to-train", "btn-yard-hitch", "yard-add"],
      ["btn-remove-from-train", "btn-yard-unhitch", "yard-remove-from-train"],
      ["btn-send-to-track", "btn-yard-totrack", "yard-depart"],
      ["btn-delete-car", "btn-yard-delete", "yard-remove-car"],
    ] as const) {
      const s = need(yard, id);
      expect(s.sprite).toBe(sprite);
      expect(s.action).toBe(action);
      expect(UI_SPRITES[sprite]!.states["pressed"], `${sprite} pressed`).toBeTypeOf("string");
    }
  });

  it("keeps the action keycaps inside the plate's span", () => {
    const p = need(yard, "panel-yard-actions");
    const ids = ["btn-edit-car", "btn-add-to-train", "btn-remove-from-train", "btn-send-to-track", "btn-delete-car"];
    for (const id of ids) {
      const s = need(yard, id);
      expect(Math.abs(s.cx - p.cx), `${id} x`).toBeLessThan(p.w / 2);
      expect(Math.abs(s.cy - p.cy), `${id} y`).toBeLessThan(p.h / 2);
    }
  });
});

describe("track.json wiring", () => {
  it("mounts the shared steampunk header with nav plaques on it", () => {
    expect(need(track, "panel-header").sprite).toBe("panel-header-v2");
    const y = need(track, "btn-track-yard");
    expect(y.sprite).toBe("btn-nav-yard");
    expect(y.action).toBe("track-nav");
    expect(y.arg).toBe("yard");
    const map = need(track, "btn-track-map");
    expect(map.sprite).toBe("btn-nav-map");
    expect(map.arg).toBe("map");
    expect(map.anchor).toBe("ui-top-right");
  });

  it("builds the transport bar from the unified keycap family with pressed states", () => {
    for (const [id, sprite] of [
      ["btn-tempo-down", "btn-transport-slow"],
      ["btn-stop", "btn-transport-stop"],
      ["btn-ride", "btn-track-ride"],
      ["btn-tempo-up", "btn-transport-fast"],
    ] as const) {
      const s = need(track, id);
      expect(s.sprite).toBe(sprite);
      expect(s.label, `${id} label is baked into the art`).toBeUndefined();
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
