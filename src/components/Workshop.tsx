import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer } from "../core/project-state.ts";
import {
  STEP_COUNT,
  type CarType,
  type LaneKind,
  type EffectId,
  type ThereminWave,
  type Clip,
  type AppView,
} from "../core/types.ts";
import { MELODY_ROWS, degreeToNote } from "../core/scale.ts";
import { voiceInstrumentId, resolveInstrument } from "../core/instruments.ts";
import { laneColor } from "../machines/tools.tsx";
import { BUILTIN_SOUNDS, DRUM_SOUNDS, getBuiltin } from "../core/sound-catalog.ts";
import { PhaserGame } from "./PhaserGame.tsx";
import { EventBus } from "../game/EventBus.ts";
import { WorkshopScene, type WorkshopModel } from "../game/scenes/WorkshopScene.ts";
import { type ToolModel } from "../game/tool-panels.ts";

const WORKSHOP_SCENES = [WorkshopScene];

type RecPhase = "idle" | "opening" | "recording" | "stopping";

let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;
let voiceCount = 0;
let keysCount = 0;
let magicCount = 0;

export const Workshop: FC = () => {
  const { dispatch, engine, sound, rng, getProject, surprise } = useApp();
  const project = useProject();
  const part = activePart(project);
  const layers = activeLayers(project);

  const sceneRef = useRef<WorkshopScene | null>(null);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  // Per-tool transient view state (the takes being shaped + status lines).
  const [voiceClipId, setVoiceClipId] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState("Hold the mic to record! 🎤");
  const [keysClipId, setKeysClipId] = useState<string | null>(null);
  const [keysStatus, setKeysStatus] = useState("Hold the mic and sing one sound! 🎤");
  const [magicClipId, setMagicClipId] = useState<string | null>(null);
  const [magicRecording, setMagicRecording] = useState(false);
  const [magicStatus, setMagicStatus] = useState("Drag your finger to play! ✨");
  const [editMelodyId, setEditMelodyId] = useState<string | null>(null);

  const projectRef = useRef(project);
  projectRef.current = project;
  const voiceClipRef = useRef(voiceClipId); voiceClipRef.current = voiceClipId;
  const keysClipRef = useRef(keysClipId); keysClipRef.current = keysClipId;
  const magicClipRef = useRef(magicClipId); magicClipRef.current = magicClipId;
  const magicRecRef = useRef(magicRecording); magicRecRef.current = magicRecording;
  const editMelodyRef = useRef(editMelodyId); editMelodyRef.current = editMelodyId;
  const voicePhase = useRef<RecPhase>("idle");
  const keysPhase = useRef<RecPhase>("idle");

  // Sequencer model (the boxcar grid) — unchanged from Phase 3.
  const model = useMemo<WorkshopModel>(() => ({
    lanes: layers.map((layer) => {
      const clip = project.clips[layer.clipId];
      const cells = Array.from({ length: STEP_COUNT }, (_, i) =>
        layer.kind === "drum" ? layer.steps[i] != null : (layer.notes[i]?.length ?? 0) > 0,
      );
      let label = "🎵";
      if (clip?.source.kind === "builtin") {
        const assetId = clip.source.assetId;
        label = BUILTIN_SOUNDS.find((s) => s.assetId === assetId)?.emoji ?? "🎵";
      } else if (clip?.source.kind === "recording") {
        label = "🎤";
      } else if (layer.kind === "drum") {
        label = "🥁";
      }
      return { id: layer.id, label, color: laneColor(layer.kind, clip), kind: layer.kind, cells };
    }),
    carType: part.carType,
    selectedLayerId: selectedLayer,
    tempoBpm: project.tempoBpm,
  }), [layers, project.clips, part.carType, selectedLayer, project.tempoBpm]);

  // Tool-panel model — derived from the store + the transient take state above.
  const toolModel = useMemo<ToolModel>(() => {
    const onHome = (id: string | null): boolean => (id ? layers.some((l) => l.id === id) : false);
    const has = (id: string | null): boolean => !!(id && project.clips[id]);
    const recordings = Object.values(project.clips).filter((c) => c.source.kind === "recording");
    const pads = [
      ...BUILTIN_SOUNDS.map((s) => ({ id: `builtin:${s.assetId}`, label: s.label, emoji: s.emoji, color: s.color })),
      ...recordings.map((c) => ({ id: `clip:${c.id}`, label: c.label || "My Sound", emoji: "🎤", color: c.color })),
    ];
    const beat = DRUM_SOUNDS.map((d) => {
      const layer = layers.find((l) => l.id === `beat-${d.assetId}`);
      const cells = Array.from({ length: STEP_COUNT }, (_, i) => (layer?.steps[i] ?? null) != null);
      return { id: d.assetId, emoji: d.emoji, cells };
    });
    const keyLabels = Array.from({ length: MELODY_ROWS }, (_, row) =>
      degreeToNote(project.scaleId, project.keyId, row).replace(/\d/, ""));
    const editLayer = editMelodyId ? layers.find((l) => l.id === editMelodyId) : undefined;
    const melodyCells = Array.from({ length: MELODY_ROWS }, (_, degree) =>
      Array.from({ length: STEP_COUNT }, (_, step) => editLayer?.notes[step]?.some((n) => n.row === degree) ?? false));
    return {
      voice: { hasClip: has(voiceClipId), status: voiceStatus, appliedFx: voiceClipId ? (project.clips[voiceClipId]?.effects.length ?? 0) : 0, onHome: onHome(voiceClipId) },
      keys: { hasClip: has(keysClipId), status: keysStatus, keyLabels, onHome: onHome(keysClipId) },
      pads,
      beat,
      magic: { recording: magicRecording, hasClip: has(magicClipId), onHome: onHome(magicClipId), status: magicStatus },
      melody: {
        active: !!editLayer,
        title: editLayer ? (project.clips[editLayer.clipId]?.label ?? "Melody") : "Melody",
        keyLabels,
        cells: melodyCells,
      },
    };
  }, [project, layers, voiceClipId, voiceStatus, keysClipId, keysStatus, magicClipId, magicRecording, magicStatus, editMelodyId]);

  const modelRef = useRef(model); modelRef.current = model;
  const toolModelRef = useRef(toolModel); toolModelRef.current = toolModel;

  const handleSceneReady = useCallback((scene: import("phaser").Scene) => {
    sceneRef.current = scene as WorkshopScene;
    sceneRef.current.setModel(modelRef.current);
    sceneRef.current.setToolModel(toolModelRef.current);
  }, []);

  useEffect(() => { sceneRef.current?.setModel(model); }, [model]);
  useEffect(() => { sceneRef.current?.setToolModel(toolModel); }, [toolModel]);

  // Open/close the Phaser tool panel; release the theremin whenever a tool closes.
  useEffect(() => {
    sceneRef.current?.setActiveTool(openTool);
    return () => { sound.thereminOff(); };
  }, [openTool, sound]);

  // Sweep the sequencer playhead — one getTransportStep read/frame.
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      sceneRef.current?.setPlayhead(sound.getTransportStep(STEP_COUNT));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sound]);

  // ── Phaser (scene + tool panels) → audio/state, across the EventBus ──────────
  useEffect(() => {
    // Sequencer grid + transport (Phase 3).
    const onCell = ({ layerId, stepIndex }: { layerId: string; stepIndex: number; on: boolean }): void => {
      const layer = activeLayers(projectRef.current).find((l) => l.id === layerId);
      if (!layer) return;
      if (layer.kind === "drum") dispatch({ type: "toggleStep", layerId, index: stepIndex });
      else dispatch({ type: "toggleNote", layerId, index: stepIndex, row: 0 });
    };
    const onInstrument = (kind: LaneKind, assetId: string): void => {
      const catalog = getBuiltin(assetId);
      if (!catalog) return;
      const clipId = `workshop-${assetId}-${Date.now()}`;
      const layerId = `layer-${assetId}-${Date.now()}`;
      if (!projectRef.current.clips[clipId]) {
        dispatch({ type: "addClip", clip: { id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label } });
      }
      dispatch({ type: "addLayer", layer: makeLayer({ id: layerId, clipId, kind, ...(kind === "melody" ? { wave: "triangle" } : {}) }) });
      sound.play({ id: clipId, source: { kind: "builtin", assetId }, effects: [], color: catalog.color, label: catalog.label });
    };
    const onCarType = (carType: CarType): void => dispatch({ type: "setCarType", partId: activePart(projectRef.current).id, carType });
    const onSelect = (layerId: string): void => setSelectedLayer(layerId);
    const onPlay = (): void => engine.playLoop(projectRef.current);
    const onStop = (): void => engine.stop();
    const onTempo = (delta: number): void => {
      const bpm = Math.max(40, Math.min(220, projectRef.current.tempoBpm + delta));
      dispatch({ type: "setTempo", bpm });
      engine.setTempo(bpm);
    };
    const onToolClosed = (): void => { setOpenTool(null); setEditMelodyId(null); };

    // Painted toolbar: nav + new car + surprise + open a tool panel.
    const onOpenTool = (toolId: string | null): void => setOpenTool((cur) => (cur === toolId ? null : toolId));
    const onNav = (view: AppView): void => dispatch({ type: "setActiveView", view });
    const onNewCar = (): void => dispatch({ type: "addCar", id: newCarId() });
    const onSurprise = (): void => surprise();

    // Grid row buttons: delete a lane, or open the piano-roll for a melody lane.
    const onLayerDelete = (layerId: string): void => {
      dispatch({ type: "removeLayer", layerId });
      setSelectedLayer((s) => (s === layerId ? null : s));
      if (editMelodyRef.current === layerId) { setEditMelodyId(null); setOpenTool((o) => (o === "melody-editor" ? null : o)); }
    };
    const onEditMelody = (layerId: string): void => { setEditMelodyId(layerId); setOpenTool("melody-editor"); };
    const onMelodyToggle = (step: number, row: number): void => {
      const id = editMelodyRef.current;
      if (!id) return;
      const layer = activeLayers(getProject()).find((l) => l.id === id);
      if (!layer) return;
      const wasOn = layer.notes[step]?.some((n) => n.row === row) ?? false;
      dispatch({ type: "toggleNote", layerId: id, index: step, row });
      if (!wasOn) {
        const p = getProject();
        sound.previewNote(degreeToNote(p.scaleId, p.keyId, row), resolveInstrument(layer.instrument, layer.wave));
      }
    };

    // Generic hold-to-record state machine (mic), reused by Voice + Keys. The
    // phase ref survives the mic-open await so a quick release never sticks open.
    const holdRecord = (
      phase: { current: RecPhase },
      onOpening: () => void,
      onError: () => void,
      onFinish: (bufferId: string) => void,
    ) => async (start: boolean): Promise<void> => {
      const finish = async (): Promise<void> => {
        phase.current = "idle";
        try { onFinish(await sound.stopRecording()); } catch { onError(); }
      };
      if (start) {
        if (phase.current !== "idle") return;
        phase.current = "opening";
        onOpening();
        try { await sound.startRecording(); } catch { phase.current = "idle"; onError(); return; }
        if ((phase.current as RecPhase) === "stopping") void finish();
        else phase.current = "recording";
      } else {
        if (phase.current === "recording") void finish();
        else if (phase.current === "opening") phase.current = "stopping";
      }
    };

    // My Voice ─────────────────────────────────────────────
    const onVoiceRecord = holdRecord(
      voicePhase,
      () => setVoiceStatus("Recording… let go to stop!"),
      () => setVoiceStatus("No mic? No problem — try the Sound Pads! 🥁"),
      (bufferId) => {
        const clip: Clip = { id: `clip-voice-${Date.now()}`, source: { kind: "recording", bufferId }, effects: [], color: "#ff5d8f", label: `My Voice ${++voiceCount}` };
        dispatch({ type: "addClip", clip });
        setVoiceClipId(clip.id);
        sound.play(clip);
        setVoiceStatus("Make it funny with an effect, then send it! 🎉");
      },
    );
    const onVoiceFx = (effectId: EffectId): void => {
      const id = voiceClipRef.current;
      if (!id) return;
      const amount = effectId === "crazy" ? rng.next() : 0.6;
      dispatch({ type: "applyEffect", clipId: id, effect: { id: effectId, amount } });
      const updated = getProject().clips[id];
      if (updated) sound.play(updated);
      setVoiceStatus("✨ Funny effect added!");
    };
    const onVoiceSend = (as: "beat" | "notes"): void => {
      const id = voiceClipRef.current;
      const p = getProject();
      const clip = id ? p.clips[id] : undefined;
      if (!id || !clip) return;
      if (!activeLayers(p).some((l) => l.id === id)) {
        if (as === "beat") {
          const steps = new Array<boolean>(STEP_COUNT).fill(false);
          steps[0] = true;
          dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum", steps }) });
        } else if (clip.source.kind === "recording") {
          const notes: (number[] | null)[] = Array.from({ length: STEP_COUNT }, () => null);
          ([[0, 0], [4, 2], [8, 4], [12, 2]] as const).forEach(([i, row]) => { notes[i] = [row]; });
          dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "melody", instrument: voiceInstrumentId(clip.source.bufferId), notes }) });
        }
      }
      setOpenTool(null);
    };

    // Voice Keys ───────────────────────────────────────────
    const onKeysRecord = holdRecord(
      keysPhase,
      () => setKeysStatus("Singing… let go to stop! (try one long 'aaah')"),
      () => setKeysStatus("No mic? Try the Magic Pad! ✨"),
      (bufferId) => {
        const clip: Clip = { id: `clip-keys-${Date.now()}`, source: { kind: "recording", bufferId }, effects: [], color: "#ffd166", label: `Voice Keys ${++keysCount}` };
        dispatch({ type: "addClip", clip });
        setKeysClipId(clip.id);
        sound.previewNote("C4", voiceInstrumentId(bufferId));
        setKeysStatus("Tap the keys — then add it to the car! 🎹");
      },
    );
    const onKeysAudition = (row: number): void => {
      const id = keysClipRef.current;
      const c = id ? getProject().clips[id] : undefined;
      if (c?.source.kind !== "recording") return;
      const p = getProject();
      sound.previewNote(degreeToNote(p.scaleId, p.keyId, row), voiceInstrumentId(c.source.bufferId));
    };
    const onKeysSend = (): void => {
      const id = keysClipRef.current;
      const p = getProject();
      const c = id ? p.clips[id] : undefined;
      if (!id || c?.source.kind !== "recording") return;
      if (!activeLayers(p).some((l) => l.id === id)) {
        const notes: (number[] | null)[] = Array.from({ length: STEP_COUNT }, () => null);
        ([[0, 0], [4, 2], [8, 4], [12, 2]] as const).forEach(([i, row]) => { notes[i] = [row]; });
        dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "melody", instrument: voiceInstrumentId(c.source.bufferId), notes }) });
      }
      setOpenTool(null);
    };

    // Sound Pads ───────────────────────────────────────────
    const onPadsPlay = (padId: string): void => {
      if (padId.startsWith("builtin:")) {
        const assetId = padId.slice("builtin:".length);
        const s = getBuiltin(assetId);
        if (s) sound.play({ id: `pad-${assetId}`, source: { kind: "builtin", assetId }, effects: [], color: s.color, label: s.label });
      } else if (padId.startsWith("clip:")) {
        const clip = getProject().clips[padId.slice("clip:".length)];
        if (clip) sound.play(clip);
      }
    };

    // Beat Maker ───────────────────────────────────────────
    const onBeatToggle = (drumId: string, step: number): void => {
      const id = `beat-${drumId}`;
      const drum = DRUM_SOUNDS.find((d) => d.assetId === drumId);
      const p = getProject();
      const clip: Clip = { id, source: { kind: "builtin", assetId: drumId }, effects: [], color: drum?.color ?? "#888", label: drum?.label ?? drumId };
      if (!p.clips[id]) dispatch({ type: "addClip", clip });
      const layer = activeLayers(p).find((l) => l.id === id);
      if (!layer) dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum" }) });
      const wasOn = (layer?.steps[step] ?? null) != null;
      dispatch({ type: "toggleStep", layerId: id, index: step });
      if (!wasOn) sound.play(clip);
    };

    // Magic Pad ────────────────────────────────────────────
    const onMagicPointer = (phase: "down" | "move" | "up", x: number, y: number): void => {
      if (phase === "down") { sound.thereminOn(); sound.setThereminXY(x, 1 - y); }
      else if (phase === "move") sound.setThereminXY(x, 1 - y);
      else sound.thereminOff();
    };
    const onMagicWave = (wave: ThereminWave): void => sound.setThereminWaveform(wave);
    const onMagicRecord = async (): Promise<void> => {
      if (!magicRecRef.current) {
        await sound.startPerformanceRecording();
        setMagicRecording(true);
        setMagicStatus("Recording… drag to play, then Stop! ✨");
        return;
      }
      setMagicRecording(false);
      sound.thereminOff();
      try {
        const bufferId = await sound.stopPerformanceRecording();
        const clip: Clip = { id: `clip-magic-${Date.now()}`, source: { kind: "recording", bufferId }, effects: [], color: "#8338ec", label: `Magic Pad ${++magicCount}` };
        dispatch({ type: "addClip", clip });
        setMagicClipId(clip.id);
        sound.play(clip);
        setMagicStatus("Nice! Send it to the car, or play more. ✨");
      } catch {
        setMagicStatus("Nothing captured — try again! ✨");
      }
    };
    const onMagicSend = (): void => {
      const id = magicClipRef.current;
      const p = getProject();
      if (!id || !p.clips[id] || activeLayers(p).some((l) => l.id === id)) return;
      const steps = new Array<boolean>(STEP_COUNT).fill(false);
      steps[0] = true;
      dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum", steps }) });
      setOpenTool(null);
    };

    const subs = [
      ["workshop-cell-toggled", onCell], ["workshop-instrument-added", onInstrument],
      ["workshop-car-type-changed", onCarType], ["workshop-layer-selected", onSelect],
      ["transport-play", onPlay], ["transport-stop", onStop], ["tempo-changed", onTempo],
      ["tool-closed", onToolClosed],
      ["workshop-open-tool", onOpenTool], ["workshop-nav", onNav],
      ["workshop-new-car", onNewCar], ["workshop-surprise", onSurprise],
      ["workshop-layer-delete", onLayerDelete], ["workshop-edit-melody", onEditMelody],
      ["tool-melody-toggle", onMelodyToggle],
      ["tool-voice-record", onVoiceRecord], ["tool-voice-fx", onVoiceFx], ["tool-voice-send", onVoiceSend],
      ["tool-keys-record", onKeysRecord], ["tool-keys-audition", onKeysAudition], ["tool-keys-send", onKeysSend],
      ["tool-pads-play", onPadsPlay], ["tool-beat-toggle", onBeatToggle],
      ["tool-magic-pointer", onMagicPointer], ["tool-magic-wave", onMagicWave],
      ["tool-magic-record", onMagicRecord], ["tool-magic-send", onMagicSend],
    ] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subs.forEach(([ev, fn]) => EventBus.on(ev as never, fn as any));
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subs.forEach(([ev, fn]) => EventBus.off(ev as never, fn as any));
    };
  }, [dispatch, engine, sound, rng, getProject, surprise]);

  // Everything — nav, tools, transport, grid — is painted in Phaser now. The
  // whole Workshop view is a single canvas with no HTML chrome.
  return (
    <div style={{ position: "relative", height: "100dvh", overflow: "hidden", background: "#000" }}>
      <PhaserGame scenes={WORKSHOP_SCENES} onSceneReady={handleSceneReady} style={{ pointerEvents: "auto" }} />
    </div>
  );
};
