// The state dump must never be the thing that fails: a probe that throws is a
// line in the file, a page with no dev bridge still produces a file, and the
// file name is safe on every filesystem.

import { describe, expect, it } from "vitest";
import {
  SCENE_PROBES,
  collectStateDump,
  describeScene,
  dumpFileName,
} from "../../src/editor/state-dump.ts";

describe("describeScene", () => {
  it("reads every probe the scene has, guarding each one", () => {
    const scene = {
      scene: { key: "YardScene" },
      get debugModel() { return { carCount: 3 }; },
      get undoOffer() { throw new Error("torn down"); },
      songPosition: 2.5,
      riderPoints() { return [{ key: "inst-mic" }]; },
      notAProbe: 1,
    };
    const out = describeScene(scene);
    expect(out["key"]).toBe("YardScene");
    expect(out["debugModel"]).toEqual({ carCount: 3 });
    expect(out["undoOffer"]).toEqual({ error: "torn down" });
    expect(out["songPosition"]).toBe(2.5);
    expect(out["riderPoints"]).toEqual([{ key: "inst-mic" }]);
    expect(out).not.toHaveProperty("notAProbe");
    expect(out).not.toHaveProperty("toolStatus");
  });

  it("copes with no scene at all", () => {
    expect(describeScene(null)).toEqual({});
    expect(describeScene(undefined)).toEqual({});
  });

  it("probes only names that are plain getters on the scenes", () => {
    // Every probe is a read; a probe that mutated or started audio would turn
    // a bug report into a second bug.
    for (const name of SCENE_PROBES) expect(name).not.toMatch(/^(set|start|play|stop|load)[A-Z]/);
  });
});

describe("collectStateDump", () => {
  it("assembles project, scene, audio and config from the bridge", () => {
    const dump = collectStateDump({
      getProject: () => ({ id: "p1" }),
      getScene: () => ({ scene: { key: "WorkshopScene" }, activeToolId: "voice" }),
      audioDiag: () => ({ contextState: "running" }),
      transportBar: () => 4,
      engineStarted: () => true,
    });
    expect(dump.project).toEqual({ id: "p1" });
    expect(dump.scene).toEqual({ key: "WorkshopScene", activeToolId: "voice" });
    expect(dump.audio).toEqual({ contextState: "running" });
    expect(dump.transportBar).toBe(4);
    expect(dump.engineStarted).toBe(true);
    expect(dump.config).toHaveProperty("track");
    expect(dump.config).toHaveProperty("stations");
    expect(typeof dump.at).toBe("string");
    expect(dump.errors).toEqual([]);
  });

  it("still produces a dump when a bridge call throws or there is no bridge", () => {
    const throwing = collectStateDump({
      getProject: () => { throw new Error("nope"); },
      getScene: () => null,
      audioDiag: () => ({}),
      transportBar: () => -1,
      engineStarted: () => false,
    });
    expect(throwing.project).toEqual({ error: "nope" });
    const none = collectStateDump(undefined);
    expect(none.project).toEqual({ error: "no dev bridge on this page" });
    expect(none.config).toHaveProperty("yard");
  });
});

describe("dumpFileName", () => {
  it("is sortable and has no characters a filesystem refuses", () => {
    const name = dumpFileName("2026-10-12T18:30:05.123Z");
    expect(name).toBe("ibeetkidz-state-2026-10-12T18-30-05-123Z.json");
    expect(name).not.toMatch(/[:]/);
  });
});
