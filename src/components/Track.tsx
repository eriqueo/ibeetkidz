import { FC, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { AppView } from "../core/types.ts";
import { liveTrain } from "../core/project-state.ts";
import { PhaserScene, VIEW_OVERLAY } from "./PhaserScene.tsx";
import { EventBus } from "../game/EventBus.ts";
import { TrackScene, type TrackCar } from "../game/scenes/TrackScene.ts";
import { TrackV3Scene } from "../game/scenes/TrackV3Scene.ts";
import { carCargo, carIdentities, carLiveries } from "../core/car-identity.ts";
import { isTerrainKind } from "../core/terrain.ts";
import { laneGroup } from "../core/lane-color.ts";
import { riderSprite } from "../game/instrument-station.ts";
import { TrackModeIntentCoordinator } from "../game/track-mode-intent.ts";
import {
  LATCH_UNIT_BARS,
  TERRAIN_KINDS,
  isModeKind,
  type TerrainKind,
  type TerrainRide,
} from "../core/terrain.ts";

const SONG_FILE_NAME = "my-train-song.wav";
const TRACK_CHROME_STORAGE_KEY = "ibeetkidz.track.chrome";

function readTrackChromePreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TRACK_CHROME_STORAGE_KEY) !== "hidden";
  } catch {
    return true;
  }
}

function writeTrackChromePreference(visible: boolean): void {
  try {
    window.localStorage.setItem(TRACK_CHROME_STORAGE_KEY, visible ? "visible" : "hidden");
  } catch {
    // Storage can be unavailable in private/restricted contexts. Focus mode is
    // still valid for this visit; persistence is a convenience, not a gate.
  }
}

/**
 * The side-scroller is the Track. `?oval` opts back into the old ring.
 *
 * This was the other way round from 2026-08-07 to 2026-08-16, with the comment
 * "the oval stays the default until v3 is demonstrably better". It is better,
 * and by then the comment was the only thing still saying otherwise: the
 * side-scroller had picked up parallax art, side-on rolling stock, wheelsets
 * and contact shadows, hill/bridge/rain terrain that changes how the song
 * SOUNDS, the terrain legend, latching night/tunnel/tiny/giant modes, the
 * BACKWARDS lever, weather, the crew riding inside the cars and the Beat
 * Lantern — roughly AR-034 through AR-059 — none of which a kid could reach
 * without typing a query string.
 *
 * The reason it is better is structural, not cosmetic: terrain is a SEQUENCE,
 * and a ring cannot show sequence. On the oval half the cars always travel the
 * opposite way across the screen and "next" has no direction. Unrolled, the
 * ground under bar b, the car for bar b and the terrain applied to bar b travel
 * together and reach a fixed playhead at the same instant.
 *
 * `?oval` stays because the ring is still a working scene with tests of its
 * own, and because a flip this size should be reversible from the URL bar
 * before it is reversible from a deploy. Both are driven by the same transport
 * and the same EventBus actions.
 */
function wantsOval(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("oval");
}

export const Track: FC = () => {
  const { dispatch, dispatchAll, engine, sound, getProject } = useApp();
  const project = useProject();
  const oval = useMemo(wantsOval, []);
  const sceneRef = useRef<TrackScene | null>(null);
  const v3Ref = useRef<TrackV3Scene | null>(null);

  // Same derived identity the Yard shows, so a car a kid picked out in the
  // sidings is recognisably the same car riding the oval.
  const liveries = useMemo(() => carLiveries(project.parts), [project.parts]);

  const cars = useMemo<TrackCar[]>(() => {
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const part = byId.get(c.partId)!;
      return {
        id: c.instanceId,
        livery: liveries.get(part.id) ?? 0,
        cargo: carCargo(part, project.clips),
        carType: part.carType,
        muted: c.muted,
      };
    });
  }, [project, liveries]);

  const carsRef = useRef(cars);
  carsRef.current = cars;

  // The side-scroller takes the SAME identity the Workshop LCD and the Yard
  // sidings show — one producer, so "car 3" is car 3 everywhere.
  const v3Cars = useMemo(() => {
    const ids = carIdentities(project.parts, project.clips);
    const byId = new Map(project.parts.map((p) => [p.id, p]));
    return liveTrain(project).map((c) => {
      const id = ids.get(c.partId);
      // The crew riding this car — `riderSprite` is the one collapse rule,
      // shared with the Workshop (fox and chipmunk ride for their own
      // percussion lanes; every other drum lane rides the frog).
      const crew: string[] = [];
      for (const layer of byId.get(c.partId)?.layers ?? []) {
        const key = riderSprite(layer.station, layer.kind, laneGroup(layer.kind, project.clips[layer.clipId]));
        if (!crew.includes(key)) crew.push(key);
      }
      return {
        id: c.instanceId,
        number: id?.number ?? 1,
        livery: id?.liveryIndex ?? 0,
        carType: id?.carType ?? "boxcar",
        muted: c.muted,
        crew: crew.slice(0, 3), // roof space — three read clearly at car scale
      };
    });
  }, [project]);
  const v3CarsRef = useRef(v3Cars);
  v3CarsRef.current = v3Cars;

  // Latest project for the EventBus listeners (registered once, no stale closure).
  const projectRef = useRef(project);
  projectRef.current = project;

  // Each latched GEOMETRY mode's current visual unit span (hill/bridge/rain —
  // the modes with world geometry; night/tunnel/tiny/giant are shades and
  // scale, not spans). Audio holds by itself (the latch's revert sits far
  // out); these are only which mound/deck/squall is drawn, advanced unit by
  // unit in the tick below while latched. A toggled-off kind keeps a CLOSED
  // span here briefly so its tail scrolls away; the tick prunes it.
  const latchedRidesRef = useRef(new Map<TerrainKind, TerrainRide>());

  // View preferences and performance gestures are refs because EventBus
  // listeners are registered once and neither drives a React render.
  const chromeVisibleRef = useRef(readTrackChromePreference());
  const tarpArmedRef = useRef(false);
  const modeIntentsRef = useRef<TrackModeIntentCoordinator | null>(null);

  // One visual projection of AudioEngine's latched ride modes. Manual STOP is
  // the terminal edge; Ride itself is intentionally endless.
  const pushModesToScene = useCallback(() => {
    const v3 = v3Ref.current;
    if (!v3) return;
    const modes = engine.latchedModes;
    v3.setTerrainRides([...latchedRidesRef.current.values()]);
    v3.setModeLatched(new Set(modes));
    v3.setNightTunnel(modes.has("night"), modes.has("tunnel"));
    v3.setTrainScale((modes.has("tiny") ? 0.6 : 1) * (modes.has("giant") ? 1.4 : 1));
  }, [engine]);

  const reconcileStoppedRideVisuals = useCallback(() => {
    modeIntentsRef.current?.clear();
    latchedRidesRef.current.clear();
    pushModesToScene();
    // TUNNEL's ordinary exit is distance-driven. At a terminal stop there is
    // no remaining travel to complete it, so settle that transition now.
    v3Ref.current?.settleTunnelAtStop();
  }, [pushModesToScene]);

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    if (scene instanceof TrackV3Scene) {
      v3Ref.current = scene;
      scene.setCars(v3CarsRef.current);
      scene.setTempo(projectRef.current.tempoBpm);
      scene.setTarpArmed(tarpArmedRef.current);
      // Same jumbotron, same contract as the oval: the analyser is PUSHED in,
      // because React owns the ports and a scene that reached for audio would
      // put a vendor dependency behind the EventBus boundary.
      scene.attachVisualizer(engine.getAnalyser(), getProject);
      scene.setChromeVisible(chromeVisibleRef.current);
      return;
    }
    sceneRef.current = scene as TrackScene;
    sceneRef.current.setCars(carsRef.current);
    sceneRef.current.setTempo(projectRef.current.tempoBpm);
    // "See the sound": hand the scene the master-output tap so the jumbotron in
    // the middle of the oval can draw what actually reached the speakers. React
    // owns the ports, so the analyser is PUSHED in — the scene never reaches
    // for audio itself. `engine.getAnalyser()` is the same node `getAudioDiag`
    // reads, which is what keeps "the visualizer never lies" literally true.
    sceneRef.current.attachVisualizer(engine.getAnalyser(), getProject);
  }, [engine, getProject]);

  useEffect(() => {
    sceneRef.current?.setCars(cars);
    v3Ref.current?.setCars(v3CarsRef.current);
  }, [cars, v3Cars]);
  useEffect(() => {
    sceneRef.current?.setTempo(project.tempoBpm);
    v3Ref.current?.setTempo(project.tempoBpm);
  }, [project.tempoBpm]);

  // Phaser transport buttons → audio engine / state, across the EventBus.
  useEffect(() => {
    const setTempo = (b: number) => {
      const bpm = Math.max(40, Math.min(220, b));
      dispatch({ type: "setTempo", bpm });
      engine.setTempo(bpm);
    };
    // Commit one mode only after a Ride is authoritative. AudioEngine remains
    // strict: it owns the transport timestamp and may still refuse with null.
    const commitMode = (kind: Parameters<typeof engine.toggleMode>[0]) => {
      const { on, atBar } = engine.toggleMode(kind, projectRef.current);
      if (atBar === null) return;
      if ((TERRAIN_KINDS as readonly string[]).includes(kind)) {
        const geo = kind as TerrainKind;
        const rides = latchedRidesRef.current;
        if (on) {
          rides.set(geo, { kind: geo, startBar: atBar, endBar: atBar + LATCH_UNIT_BARS });
        } else {
          const open = rides.get(geo);
          if (open) rides.set(geo, { ...open, endBar: Math.min(open.endBar, atBar) });
        }
      }
      pushModesToScene();
    };

    const modeIntents = new TrackModeIntentCoordinator({
      isRideActive: () => engine.isPlaying && engine.playMode === "ride",
      hasTrain: () => liveTrain(projectRef.current).length > 0,
      startRide: () => engine.playRide(projectRef.current),
      commitMode,
      setPendingModes: (kinds) => v3Ref.current?.setModePending(kinds),
      onStartFailed: (err) => console.warn("audio playback failed", err),
    });
    modeIntentsRef.current = modeIntents;

    const onPlay = () => {
      modeIntents.startRide();
    };
    const onStop = () => {
      engine.stop(); // also drops every mode latch — flat ground on stop
      reconcileStoppedRideVisuals();
    };
    const onTempo = (delta: number) => setTempo(projectRef.current.tempoBpm + delta);
    const onNav = (view: AppView) => dispatch({ type: "setActiveView", view });
    // Tap a car on the oval → toggle its tarp (mute). The tarp visual follows
    // from the state change (setCars rebuild).
    const onMuteToggle = (instanceId: string) => {
      const slot = liveTrain(projectRef.current).find((c) => c.instanceId === instanceId);
      if (slot) dispatch({ type: "muteCar", instanceId, muted: !slot.muted });
    };
    // Tap a car on the side-scroller → edit THAT car in the Workshop. The ride
    // keeps playing (nothing here stops the transport), so a kid can fix a
    // lane and hear the change on the song's next pass — edit on the fly.
    const onCarEdit = (instanceId: string) => {
      const slot = liveTrain(projectRef.current).find((c) => c.instanceId === instanceId);
      if (!slot) return;
      dispatch({ type: "selectCar", partId: slot.partId });
      dispatch({ type: "setActiveView", view: "workshop" });
    };
    // CLEAR → empty the whole train as ONE undo step, with the "put it back"
    // chip (removing the kid's whole build is exactly what the chip is for).
    // The ride stops too: with no train there is nothing to ride.
    const onClearTrain = () => {
      const cmds = liveTrain(projectRef.current).map(
        (c) => ({ type: "removeFromTrain", instanceId: c.instanceId }) as const,
      );
      if (cmds.length === 0) return;
      engine.stop();
      reconcileStoppedRideVisuals();
      dispatchAll(cmds, "The whole train");
    };
    // A ride mode toggled: LATCHED, STACKING — every mode is independent, tap
    // on, tap off, pile them up (Eric, 2026-08-13). The bar a change lands on
    // is resolved from the TRANSPORT inside the adapter — never from where
    // the train happens to be drawn (charter A4).
    const onMode = (kind: string) => {
      if (!isModeKind(kind) || !v3Ref.current) return;
      modeIntents.request(kind);
    };
    // Terrain events from chrome that predates modes: the oval's momentary
    // flash. The v3 job bar emits `track-mode-toggled` instead.
    const onTerrain = (kind: string) => {
      if (!isTerrainKind(kind)) return;
      if (v3Ref.current) {
        onMode(kind);
        return;
      }
      if (engine.applyTerrain(kind, projectRef.current)) {
        sceneRef.current?.showTerrain?.(kind);
      }
    };
    // BACKWARDS: everything sampled plays tape-reversed until toggled again.
    const onBackwards = () => {
      void engine.toggleReversed(projectRef.current).then((on) => {
        v3Ref.current?.setBackwards(on);
      }).catch((err: unknown) => {
        console.warn("audio reconcile failed", err);
      });
    };
    const onFocusToggled = () => {
      const visible = !chromeVisibleRef.current;
      chromeVisibleRef.current = visible;
      writeTrackChromePreference(visible);
      v3Ref.current?.setChromeVisible(visible);
    };
    // TARP: arm/disarm cover-a-car. Tap-to-edit stays the default gesture.
    const onTarpArmed = () => {
      tarpArmedRef.current = !tarpArmedRef.current;
      v3Ref.current?.setTarpArmed(tarpArmedRef.current);
    };
    EventBus.on("transport-play", onPlay);
    EventBus.on("transport-stop", onStop);
    EventBus.on("tempo-changed", onTempo);
    EventBus.on("track-nav", onNav);
    EventBus.on("track-car-mute-toggled", onMuteToggle);
    EventBus.on("track-car-edit", onCarEdit);
    EventBus.on("track-clear-train", onClearTrain);
    EventBus.on("terrain-picked", onTerrain);
    EventBus.on("track-mode-toggled", onMode);
    EventBus.on("track-backwards-toggled", onBackwards);
    EventBus.on("track-focus-toggled", onFocusToggled);
    EventBus.on("track-tarp-armed", onTarpArmed);
    return () => {
      modeIntents.dispose();
      if (modeIntentsRef.current === modeIntents) modeIntentsRef.current = null;
      EventBus.off("transport-play", onPlay);
      EventBus.off("transport-stop", onStop);
      EventBus.off("tempo-changed", onTempo);
      EventBus.off("track-nav", onNav);
      EventBus.off("track-car-mute-toggled", onMuteToggle);
      EventBus.off("track-car-edit", onCarEdit);
      EventBus.off("track-clear-train", onClearTrain);
      EventBus.off("terrain-picked", onTerrain);
      EventBus.off("track-mode-toggled", onMode);
      EventBus.off("track-backwards-toggled", onBackwards);
      EventBus.off("track-focus-toggled", onFocusToggled);
      EventBus.off("track-tarp-armed", onTarpArmed);
    };
  }, [dispatch, dispatchAll, engine, pushModesToScene, reconcileStoppedRideVisuals]);

  // SEND flow: the scene owns the plaque + result panel (in-scene, charter-
  // styled); this side owns the audio render and the share/download side
  // effects, pushing each outcome back into the scene so the kid always gets
  // an explicit "Sent!"/"Saved!" — a bare download is invisible on iOS.
  useEffect(() => {
    let rendering = false;
    let file: File | null = null;
    let active = true;
    // Whichever Track is mounted gets the SEND state. Both scenes take the
    // same `SendUiState` and both mount the same `SendSongPanel`, so this is
    // one flow with two hosts rather than two flows.
    const setUi = (s: Parameters<TrackScene["setSendState"]>[0]): void => {
      if (!active) return;
      sceneRef.current?.setSendState(s);
      v3Ref.current?.setSendState(s);
    };

    const onSend = async (): Promise<void> => {
      if (rendering) return;
      rendering = true;
      setUi({ kind: "recording" });
      try {
        const blob = await engine.renderSong(projectRef.current);
        file = new File([blob], SONG_FILE_NAME, { type: "audio/wav" });
        const canShare =
          typeof navigator.share === "function" &&
          navigator.canShare?.({ files: [file] }) === true;
        setUi({ kind: "ready", canShare });
      } catch (err) {
        console.error("send-song render failed", err);
        setUi({ kind: "error" });
      } finally {
        rendering = false;
      }
    };
    // Called synchronously from the canvas tap (EventBus emits are sync), so
    // the OS share sheet still sees the user gesture.
    const onShare = (): void => {
      if (!file) return;
      navigator
        .share({ files: [file], title: "My train song" })
        .then(() => setUi({ kind: "shared" }))
        .catch(() => {
          // The kid closed the share sheet — not an error, stay on the panel.
        });
    };
    const onSave = (): void => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = SONG_FILE_NAME;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setUi({ kind: "saved" });
    };
    const onClose = (): void => setUi({ kind: "idle" });

    const onSendVoid = (): void => void onSend();
    EventBus.on("track-send", onSendVoid);
    EventBus.on("track-send-share", onShare);
    EventBus.on("track-send-save", onSave);
    EventBus.on("track-send-close", onClose);
    return () => {
      // An offline render cannot be canceled, but its former scene can lose
      // authority immediately. Late completion is intentionally discarded.
      active = false;
      EventBus.off("track-send", onSendVoid);
      EventBus.off("track-send-share", onShare);
      EventBus.off("track-send-save", onSave);
      EventBus.off("track-send-close", onClose);
    };
  }, [engine]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v3scene = v3Ref.current;
      if (v3scene) {
        const riding = engine.isPlaying && engine.playMode === "ride";
        v3scene.setMoving(riding);
        if (riding) {
          const RES = 4096;
          const sub = sound.getTransportStep(RES);
          const frac = sub >= 0 ? sub / RES : 0;
          // ABSOLUTE bars, not a normalized lap: the side-scroller lays the
          // world out in bar order and never wraps its own position, so a
          // terrain scheduled at bar 37 is drawn at bar 37.
          const bar = engine.getTransportBar?.() ?? 0;
          v3scene.setSongPosition(bar + frac);
          // Each LATCHED geometry mode re-arms its visual unit as the train
          // crosses its span boundary: mound after mound is a mountain range,
          // deck after deck a viaduct. The profile returns to ground at every
          // unit edge, so the handoff between units is seamless. Closed spans
          // (toggled off) are pruned once they have scrolled well past.
          const rides = latchedRidesRef.current;
          let changed = false;
          for (const [geo, open] of rides) {
            if (engine.latchedModes.has(geo)) {
              if (bar >= open.endBar) {
                rides.set(geo, {
                  kind: geo,
                  startBar: open.endBar,
                  endBar: open.endBar + LATCH_UNIT_BARS,
                });
                changed = true;
              }
            } else if (bar > open.endBar + 4) {
              rides.delete(geo);
              changed = true;
            }
          }
          if (changed) v3scene.setTerrainRides([...rides.values()]);
        }
      }
      const scene = sceneRef.current;
      if (scene) {
        const riding = engine.isPlaying && engine.playMode === "ride";
        scene.setMoving(riding);
        if (riding) {
          // Read the in-bar position at high resolution — getTransportStep(n)
          // FLOORS to n subdivisions, so reading at STEP_COUNT quantized the
          // ride to 16 visible hops per bar (the jerky train).
          const RES = 4096;
          const sub = sound.getTransportStep(RES);
          const frac = sub >= 0 ? sub / RES : 0;
          const totalBars = carsRef.current.length;
          if (totalBars > 0) {
            const bar = engine.getTransportBar?.() ?? 0;
            const songBar = ((bar % totalBars) + totalBars) % totalBars;
            scene.setProgress((songBar + frac) / totalBars);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, reconcileStoppedRideVisuals, sound]);

  return (
    <div style={VIEW_OVERLAY}>
      <PhaserScene
        scene={oval ? TrackScene : TrackV3Scene}
        onSceneReady={handleSceneReady}
      />

      {/* The whole view lives inside TrackScene now: nav + transport are Tiled
          chrome, muting is tap-the-car-to-tarp-it, and the SEND flow (plaque +
          result panel) is in-scene too — all over the EventBus. (The old HTML
          tarp strip drifted into the letterbox on non-16:9 screens — HTML
          overlays can't track the FIT-scaled canvas.) */}
    </div>
  );
};
