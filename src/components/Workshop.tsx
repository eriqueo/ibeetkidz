import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp, useProject } from "../app/context.tsx";
import { activeLayers, activePart, makeLayer, nextRecordingLabel } from "../core/project-state.ts";
import {
  STEP_COUNT,
  type CarType,
  type LaneKind,
  type EffectId,
  type ThereminWave,
  type Clip,
  type Command,
} from "../core/types.ts";
import { MELODY_ROWS, degreeToNote } from "../core/scale.ts";
import {
  voiceInstrumentId,
  resolveInstrument,
  isVoiceInstrument,
  INSTRUMENTS,
  type InstrumentId,
} from "../core/instruments.ts";
import { STATION_LABEL, STATION_VOICE, laneSprite, riderSprite } from "../game/instrument-station.ts";
import { laneColor, laneGroup } from "../core/lane-color.ts";
import { carLiveries } from "../core/car-identity.ts";
import { BUILTIN_SOUNDS, getBuiltin, type BuiltinSound } from "../core/sound-catalog.ts";
import { PhaserScene, VIEW_OVERLAY } from "./PhaserScene.tsx";
import { EventBus } from "../game/EventBus.ts";
import { WORKSHOP_GRID_V2 } from "../game/scene-layout.ts";
import { WorkshopScene, type WorkshopCrewMember, type WorkshopModel } from "../game/scenes/WorkshopScene.ts";
import { type ToolModel } from "../game/tool-panels.ts";
import { soundIconFrame } from "../game/ui-sprites.ts";

type RecPhase = "idle" | "opening" | "recording" | "stopping";

let carSeq = 0;
const newCarId = (): string => `car-${Date.now().toString(36)}-${carSeq++}`;

/** How many lanes a car holds — one number now, derived twice over from
 *  `MAX_LAYERS`. The reducer REFUSES past it, so this is no longer a guard that
 *  has to be remembered at each of the ten `addLayer` call sites; it is here
 *  only so a panel can TELL the kid the car is full before they tap. */
const VISIBLE_LANE_CAP = WORKSHOP_GRID_V2.maxLanes;

/**
 * The clip/lane id a built-in sound occupies inside a car.
 *
 * Drums deliberately reuse the Beat Maker's `beat-<assetId>` id: the two tools
 * are two doors into the same lane, so tapping "Boom" on the pads and then
 * opening the Beat Maker shows the Boom row with the hit already on it, rather
 * than two lanes playing the same drum. Tones have no Beat Maker row, so they
 * get their own namespace.
 */
const builtinLaneId = (s: BuiltinSound): string =>
  s.recipe.kind === "drum" ? `beat-${s.assetId}` : `pad-${s.assetId}`;

/** A drum lane that sounds once at the top of the bar — i.e. one that LOOPS.
 *  Same starter shape `onVoiceSend` / `onMagicSend` use. */
function firstStepOnly(): boolean[] {
  const steps = new Array<boolean>(STEP_COUNT).fill(false);
  steps[0] = true;
  return steps;
}

export const Workshop: FC = () => {
  const { dispatch, dispatchAll, engine, sound, rng, getProject, surprise } = useApp();
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
      // The lane's picture: the CHARACTER THE KID TAPPED, recorded on the lane
      // at creation (`Layer.station`). Lanes made before that field existed
      // fall back to their family's picture — one guess, in one place, instead
      // of the five-branch ladder that used to live here and got the violin,
      // Voice Keys and the Sound Pads wrong.
      const icon = laneSprite(layer.station, laneGroup(layer.kind, clip));
      // A BADGE for the sound itself. Eight drum lanes all show the same frog
      // with the same kit, so on the board there was no way to tell the kick
      // row from the cymbal row — Eric's report. The built-in catalogue already
      // names every sound with an emoji; that is the badge.
      const builtin = clip?.source.kind === "builtin"
        ? BUILTIN_SOUNDS.find((s) => s.assetId === (clip.source as { assetId: string }).assetId)
        : undefined;
      const melodyInst = layer.kind === "melody" ? layer.instrument : undefined;
      const label = builtin?.emoji
        ?? (melodyInst && isVoiceInstrument(melodyInst) ? "🎤" : undefined)
        ?? (melodyInst ? INSTRUMENTS.find((i) => i.id === melodyInst)?.emoji : undefined)
        ?? (clip?.source.kind === "recording" ? "🎤" : undefined)
        ?? (layer.kind === "drum" ? "🥁" : "🎵");
      // …but only worth drawing when the picture alone cannot tell two lanes
      // apart, i.e. for the built-in sounds that share one character.
      const badge = builtin ? builtin.emoji : null;
      return { id: layer.id, label, badge, badgeIcon: soundIconFrame(builtin?.assetId), icon, color: laneColor(layer.kind, clip), kind: layer.kind, cells, muted: layer.muted ?? false };
    }),
    // The crew: ONE character per instrument, not one per lane (`riderSprite`
    // is the collapse rule, shared with the Track). Every percussion
    // character's tap opens the one drum grid; each melody character's tap
    // opens ITS editor.
    crew: (() => {
      const crew: WorkshopCrewMember[] = [];
      for (const layer of layers.slice(0, VISIBLE_LANE_CAP)) {
        const clip = project.clips[layer.clipId];
        const key = riderSprite(layer.station, layer.kind, laneGroup(layer.kind, clip));
        if (crew.some((c) => c.key === key)) continue;
        crew.push(
          layer.kind === "drum"
            ? { key, action: { kind: "percussion" } }
            : { key, action: { kind: "melody", layerId: layer.id } },
        );
      }
      return crew;
    })(),
    carType: part.carType,
    // The LCD shows WHICH car this is — its name and its livery mark, the same
    // mark the Yard paints on its flank. That pairing is the only thing that
    // teaches a kid what the mark means; the readout previously said a
    // hardcoded "SONG 001" that nothing ever updated.
    carName: part.name,
    livery: carLiveries(project.parts).get(part.id) ?? 0,
    // What the paint rack may NOT offer. Derived from the library rather than
    // tracked, so it is right the moment a car is added, deleted or repainted.
    colorOwners: project.parts
      .filter((p) => p.id !== part.id)
      .map((p) => ({ color: p.color, partId: p.id })),
    selectedLayerId: selectedLayer,
    tempoBpm: project.tempoBpm,
    carCount: project.parts.length,
  }), [layers, project.clips, part.carType, part.name, part.id, project.parts, selectedLayer, project.tempoBpm]);

  // Tool-panel model — derived from the store + the transient take state above.
  const toolModel = useMemo<ToolModel>(() => {
    const onHome = (id: string | null): boolean => (id ? layers.some((l) => l.id === id) : false);
    const has = (id: string | null): boolean => !!(id && project.clips[id]);
    // Sound Pads: the sound LIBRARY. Every built-in sound plus every recording
    // the child has ever made — this panel is the only place a past recording is
    // reachable at all, which is why it survives into v2 (the tools that made
    // them only ever offer the take you just recorded).
    //
    // `inCar` is what makes a pad tap legible: the pad shows whether that sound
    // is already a lane in THIS car, so the outcome is visible on the control the
    // kid pressed, not only on the chalkboard the panel is covering.
    const inCar = new Set(layers.map((l) => l.clipId));
    const recordings = Object.values(project.clips).filter((c) => c.source.kind === "recording");
    const pads = [
      ...BUILTIN_SOUNDS.map((s) => {
        const laneId = builtinLaneId(s);
        return {
          id: `builtin:${s.assetId}`,
          label: s.label,
          emoji: s.emoji,
          color: s.color,
          group: s.recipe.kind === "drum" ? ("drum" as const) : ("tone" as const),
          badge: "",
          inCar: inCar.has(laneId),
        };
      }),
      // Newest last, matching insertion order — a kid looks for the thing they
      // just made at the end of their own shelf. `PADS_PER_SHELF` in the panel
      // is what stops an enthusiastic session from shrinking every pad to a
      // speck; the clips themselves are never dropped.
      ...recordings.map((c, i) => ({
        id: `clip:${c.id}`,
        label: c.label || "My Sound",
        emoji: "🎤",
        color: c.color,
        group: "voice" as const,
        // Recordings all share the voice family's gold, per `lane-color.ts`
        // ("colour = kind, never a random per-clip swatch"), so the thing that
        // tells one of a kid's five takes from another is a big numeral —
        // numbers being legible to a child well before words are.
        badge: String(i + 1),
        inCar: inCar.has(c.id),
      })),
    ];
    // The percussion editor's rows ARE the car's drum lanes — same cells, same
    // ids, same badge emojis as the chalkboard, one producer for both.
    const percussion = {
      rows: layers
        .filter((l) => l.kind === "drum")
        .map((l) => {
          const clip = project.clips[l.clipId];
          const builtin = clip?.source.kind === "builtin"
            ? BUILTIN_SOUNDS.find((s) => s.assetId === (clip.source as { assetId: string }).assetId)
            : undefined;
          return {
            id: l.id,
            emoji: builtin?.emoji ?? (clip?.source.kind === "recording" ? "🎤" : "🥁"),
            icon: soundIconFrame(builtin?.assetId),
            color: laneColor(l.kind, clip),
            cells: Array.from({ length: STEP_COUNT }, (_, i) => l.steps[i] != null),
            muted: l.muted ?? false,
          };
        }),
      canAdd: layers.length < VISIBLE_LANE_CAP,
    };
    const keyLabels = Array.from({ length: MELODY_ROWS }, (_, row) =>
      degreeToNote(project.scaleId, project.keyId, row).replace(/\d/, ""));
    const editLayer = editMelodyId ? layers.find((l) => l.id === editMelodyId) : undefined;
    const melodyCells = Array.from({ length: MELODY_ROWS }, (_, degree) =>
      Array.from({ length: STEP_COUNT }, (_, step) => editLayer?.notes[step]?.some((n) => n.row === degree) ?? false));
    return {
      voice: { hasClip: has(voiceClipId), status: voiceStatus, appliedFx: voiceClipId ? (project.clips[voiceClipId]?.effects.length ?? 0) : 0, onHome: onHome(voiceClipId) },
      keys: { hasClip: has(keysClipId), status: keysStatus, keyLabels, onHome: onHome(keysClipId) },
      pads,
      padsFull: layers.length >= VISIBLE_LANE_CAP,
      percussion,
      magic: { recording: magicRecording, hasClip: has(magicClipId), onHome: onHome(magicClipId), status: magicStatus },
      melody: {
        active: !!editLayer,
        title: editLayer ? (project.clips[editLayer.clipId]?.label ?? "Melody") : "Melody",
        keyLabels,
        cells: melodyCells,
        doubles: Array.from({ length: MELODY_ROWS }, (_, degree) =>
          Array.from({ length: STEP_COUNT }, (_, step) =>
            editLayer?.notes[step]?.some((n) => n.row === degree && (n.roll ?? 1) > 1) ?? false)),
        wobble: editLayer?.wobble ?? 0,
        crunch: editLayer?.crunch ?? 0,
        volume: editLayer?.volume ?? 1,
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
    const onCarColor = (color: string): void =>
      dispatch({ type: "setCarColor", partId: activePart(projectRef.current).id, color });
    const onSelect = (layerId: string): void => setSelectedLayer(layerId);
    const onPlay = (): void => engine.playLoop(projectRef.current);
    // LOOP hears the car you are working on, alone. `playCarLoop` has existed in
    // the engine since the v2 data model landed and had no caller at all — the
    // Tiled LOOP button was authored to emit `transport-play("loop")`, i.e. the
    // exact same event as PLAY, so the two buttons were the same button.
    const onLoopCar = (): void =>
      engine.playCarLoop(activePart(projectRef.current).id, projectRef.current);
    const onStop = (): void => engine.stop();
    const onTempo = (delta: number): void => {
      const bpm = Math.max(40, Math.min(220, projectRef.current.tempoBpm + delta));
      dispatch({ type: "setTempo", bpm });
      engine.setTempo(bpm);
    };
    const onToolClosed = (): void => { setOpenTool(null); setEditMelodyId(null); };

    // Painted toolbar: nav + new car + surprise + open a tool panel.
    //
    // "sound-pads" is the CONDUCTOR's slot now (Eric, 2026-08-12): the raccoon
    // becomes a train conductor whose tap opens the whole-train chalkboard —
    // the meta view — while every instrument character opens its own editor.
    // The Sound Pads panel this retires was the only surface listing PAST
    // recordings; that gap is logged in ART_REQUESTS AR-045's note.
    const onOpenTool = (toolId: string | null): void => {
      if (toolId === "sound-pads") {
        EventBus.emit("workshop-open-board");
        return;
      }
      setOpenTool((cur) => (cur === toolId ? null : toolId));
    };
    // Three-Zone top-bar nav plaques (btn-map / btn-sendtoyard).
    const onNavMap = (): void => dispatch({ type: "setActiveView", view: "map" });
    const onNavYard = (): void => dispatch({ type: "setActiveView", view: "yard" });
    // NEW CAR on an ALREADY-EMPTY car is not a new car — it is the car you are
    // looking at. Minting a second empty one spent a livery colour on nothing
    // (the rack crossed it off, which is Eric's report), put a car with no
    // sound in the Yard, and left the kid on a bench identical to the one they
    // just left. A car type still applies: that IS a change to this car.
    const onNewCar = (carType?: CarType): void => {
      const here = activePart(getProject());
      if (here.layers.length === 0) {
        if (carType && carType !== here.carType) dispatch({ type: "setCarType", partId: here.id, carType });
        return;
      }
      dispatch(carType ? { type: "addCar", id: newCarId(), carType } : { type: "addCar", id: newCarId() });
    };
    // A paint chip another car wears: put that car on the bench.
    const onOpenCar = (partId: string): void => {
      dispatch({ type: "setActivePart", partId });
      setSelectedLayer(null);
      setEditMelodyId(null);
      setOpenTool(null);
    };
    const onSurprise = (): void => surprise();
    // SEND TO YARD: the scene runs the slide-out; we voice a two-tone train
    // whistle when it starts (procedural — no binary audio) and travel to the
    // Yard when the car has departed (it's already in the palette there).
    const onSendToYard = (): void => {
      sound.previewNote("A4", "organ");
      sound.previewNote("C#5", "organ");
    };
    const onCarDeparted = (): void => dispatch({ type: "setActiveView", view: "yard" });

    // Grid row buttons: delete a lane, or open the piano-roll for a melody lane.
    const onLayerMuted = (layerId: string): void => dispatch({ type: "toggleLayerMuted", layerId });
    const onLayerDelete = (layerId: string): void => {
      dispatch({ type: "removeLayer", layerId });
      setSelectedLayer((s) => (s === layerId ? null : s));
      if (editMelodyRef.current === layerId) { setEditMelodyId(null); setOpenTool((o) => (o === "melody-editor" ? null : o)); }
    };
    const onEditMelody = (layerId: string): void => { setEditMelodyId(layerId); setOpenTool("melody-editor"); };
    // Guitar/Piano (and any synth melody instrument): make a fresh melody lane
    // voiced by that synth, seed a gentle starter melody so it's immediately
    // playable, then open the note editor on it.
    const onAddMelody = (station: string): void => {
      // The payload is the CHARACTER, and its synth is looked up — the violin's
      // is `pluck`, so passing the synth through (as this used to) threw away
      // which of the three the kid tapped.
      const instrument = STATION_VOICE[station as keyof typeof STATION_VOICE] ?? "soft";
      const ts = Date.now();
      const clipId = `clip-melody-${station}-${ts}`;
      const layerId = `layer-melody-${station}-${ts}`;
      // Named after the CHARACTER, not the synth: a violin lane titled "Pluck"
      // names the voice the kid never picked.
      const label = STATION_LABEL[station as keyof typeof STATION_LABEL] ?? "Melody";
      const notes: (number[] | null)[] = Array.from({ length: STEP_COUNT }, () => null);
      ([[0, 0], [4, 2], [8, 4], [12, 2]] as const).forEach(([i, row]) => { notes[i] = [row]; });
      dispatch({ type: "addClip", clip: { id: clipId, source: { kind: "builtin", assetId: "note-do" }, effects: [], color: "#06d6a0", label } });
      dispatch({ type: "addLayer", layer: makeLayer({ id: layerId, clipId, kind: "melody", instrument, station, notes }) });
      setSelectedLayer(layerId);
      setEditMelodyId(layerId);
      setOpenTool("melody-editor");
    };
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
    // Instrument editor (AR-016): ×2 toggles an existing note's double-beat
    // roll; the deck knobs/fader write straight onto the lane being edited.
    // While ×2 is armed a cell cycles single → doubled → GONE. It used to cycle
    // single → doubled → single, which meant that with the lever on there was
    // no way at all to remove a note — and the switch's plaque says OFF in the
    // art whichever way it is thrown (AR-026), so a kid could be stuck in that
    // mode without knowing it. Eric was. The editor now also disarms the lever
    // every time it opens; this is the other half, so being armed can never
    // take the delete away.
    const onMelodyDouble = (step: number, row: number): void => {
      const id = editMelodyRef.current;
      if (!id) return;
      const layer = activeLayers(getProject()).find((l) => l.id === id);
      const note = layer?.notes[step]?.find((n) => n.row === row);
      if (!note) return;
      if ((note.roll ?? 1) > 1) dispatch({ type: "removeNote", layerId: id, index: step, row });
      else dispatch({ type: "setRoll", layerId: id, index: step, row, roll: 2 });
    };
    const onLaneWobble = (value: number): void => {
      const id = editMelodyRef.current;
      if (id) dispatch({ type: "setLayerWobble", layerId: id, wobble: value });
    };
    const onLaneCrunch = (value: number): void => {
      const id = editMelodyRef.current;
      if (id) dispatch({ type: "setLayerCrunch", layerId: id, crunch: value });
    };
    const onLaneVolume = (value: number): void => {
      const id = editMelodyRef.current;
      if (id) dispatch({ type: "setLayerVolume", layerId: id, volume: value });
    };
    /** The lane's own voice + note, for the deck's audible answers. */
    const editVoice = (): { note: string; instrument: InstrumentId; volume: number } | null => {
      const id = editMelodyRef.current;
      if (!id) return null;
      const p = getProject();
      const layer = activeLayers(p).find((l) => l.id === id);
      if (!layer) return null;
      // Mid-scale: high enough to hear the instrument, low enough not to shriek.
      return {
        note: degreeToNote(p.scaleId, p.keyId, Math.floor(MELODY_ROWS / 2)),
        instrument: resolveInstrument(layer.instrument, layer.wave),
        volume: layer.volume ?? 1,
      };
    };
    // The LEVEL fader answers on RELEASE with one note at its new loudness —
    // "LEVEL" is unreadable at four; a note that is quieter is not.
    const onLaneVolumeDone = (value: number): void => {
      const v = editVoice();
      if (v) sound.previewNote(v.note, v.instrument, value);
    };
    // The ×2 lever answers by DOING it: one hit when it goes off, two when it
    // comes on. Nothing about "×2" is legible to a pre-reader, and until this
    // the switch changed nothing at all until some later tap on a note.
    const onTwiceMode = (armed: boolean): void => {
      const v = editVoice();
      if (!v) return;
      sound.previewNote(v.note, v.instrument, v.volume);
      if (armed) window.setTimeout(() => sound.previewNote(v.note, v.instrument, v.volume), 160);
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
        try { onFinish(await sound.stopRecording()); } catch (err) { console.error("mic stop failed", err); onError(); }
      };
      if (start) {
        if (phase.current !== "idle") return;
        phase.current = "opening";
        // Stop the loop before opening the mic. On a laptop there is no headset:
        // whatever is playing goes out the speakers, straight back into the mic,
        // and then gets multiplied by the normalizer. Playback policy belongs
        // here rather than in the port — React already owns `engine` (see
        // `onStop` above), and the port stays free of opinions about transport.
        engine.stop();
        onOpening();
        try { await sound.startRecording(); } catch (err) { console.error("mic open failed", err); phase.current = "idle"; onError(); return; }
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
        const clip: Clip = { id: `clip-voice-${Date.now()}`, source: { kind: "recording", bufferId }, effects: [], color: "#ff5d8f", label: nextRecordingLabel(getProject(), "My Voice") };
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
          dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum", station: "mic", steps }) });
        } else if (clip.source.kind === "recording") {
          const notes: (number[] | null)[] = Array.from({ length: STEP_COUNT }, () => null);
          ([[0, 0], [4, 2], [8, 4], [12, 2]] as const).forEach(([i, row]) => { notes[i] = [row]; });
          dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "melody", instrument: voiceInstrumentId(clip.source.bufferId), station: "mic", notes }) });
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
        const clip: Clip = { id: `clip-keys-${Date.now()}`, source: { kind: "recording", bufferId }, effects: [], color: "#ffd166", label: nextRecordingLabel(getProject(), "Voice Keys") };
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
        dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "melody", instrument: voiceInstrumentId(c.source.bufferId), station: "keys", notes }) });
      }
      setOpenTool(null);
    };

    // Sound Pads ───────────────────────────────────────────
    // A pad tap HEARS the sound and PUTS IT IN THE CAR, as one looping lane
    // with a hit on the first step.
    //
    // It used to only make a noise: `sound.play` and nothing else, no command,
    // no state. That made Sound Pads the only one of the Workshop's instrument
    // characters whose panel could not put anything in the car — every other one
    // (Beat Maker, My Voice, Voice Keys, Magic Pad, and the three melody
    // characters) leaves a lane behind — so a kid who found a sound they liked
    // had no way to keep it, and nothing they tapped ever looped.
    //
    // Landing the lane is a COMPOUND action (the clip, then the lane) and goes
    // through `dispatchAll` so it is ONE undo step rather than two.
    const landSound = (clipId: string, clip: Clip, alreadyHasClip: boolean): void => {
      const existing = activeLayers(getProject());
      // Already on the board: the tap is an audition, not a second copy.
      if (existing.some((l) => l.clipId === clipId)) return;
      // Refuse rather than add a lane the chalkboard cannot show. The kid is
      // told why by the panel (`padsFull`), the same way the New Car picker says
      // "TRAIN YARD FULL" instead of silently doing nothing.
      if (existing.length >= VISIBLE_LANE_CAP) return;
      const cmds: Command[] = [];
      if (!alreadyHasClip) cmds.push({ type: "addClip", clip });
      cmds.push({
        type: "addLayer",
        layer: makeLayer({ id: clipId, clipId, kind: "drum", station: "pads", steps: firstStepOnly() }),
      });
      dispatchAll(cmds);
    };
    const onPadsPlay = (padId: string): void => {
      const p = getProject();
      if (padId.startsWith("builtin:")) {
        const assetId = padId.slice("builtin:".length);
        const s = getBuiltin(assetId);
        if (!s) return;
        const laneId = builtinLaneId(s);
        const clip: Clip = { id: laneId, source: { kind: "builtin", assetId }, effects: [], color: s.color, label: s.label };
        sound.play(clip);
        landSound(laneId, clip, !!p.clips[laneId]);
      } else if (padId.startsWith("clip:")) {
        const clipId = padId.slice("clip:".length);
        const clip = p.clips[clipId];
        if (!clip) return;
        sound.play(clip);
        // A recording is already a clip — only the lane is missing. Its lane id
        // IS the clip id, matching `onVoiceSend` / `onKeysSend` / `onMagicSend`.
        landSound(clipId, clip, true);
      }
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
        const clip: Clip = { id: `clip-magic-${Date.now()}`, source: { kind: "recording", bufferId }, effects: [], color: "#8338ec", label: nextRecordingLabel(getProject(), "Magic Pad") };
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
      dispatch({ type: "addLayer", layer: makeLayer({ id, clipId: id, kind: "drum", station: "magic", steps }) });
      setOpenTool(null);
    };

    const subs = [
      ["workshop-cell-toggled", onCell], ["workshop-instrument-added", onInstrument],
      ["workshop-car-color-picked", onCarColor],
      ["workshop-layer-selected", onSelect],
      ["transport-play", onPlay], ["transport-stop", onStop], ["tempo-changed", onTempo],
      ["workshop-loop-car", onLoopCar],
      ["tool-closed", onToolClosed],
      ["workshop-open-tool", onOpenTool],
      ["nav-map", onNavMap], ["nav-yard", onNavYard],
      ["workshop-send-to-yard", onSendToYard], ["workshop-car-departed", onCarDeparted],
      ["workshop-new-car", onNewCar], ["workshop-surprise", onSurprise],
      ["workshop-open-car", onOpenCar],
      ["workshop-layer-muted", onLayerMuted],
      ["workshop-layer-delete", onLayerDelete], ["workshop-edit-melody", onEditMelody],
      ["workshop-add-melody", onAddMelody],
      ["tool-melody-toggle", onMelodyToggle], ["tool-melody-double", onMelodyDouble],
      ["tool-melody-twice-mode", onTwiceMode],
      ["tool-lane-wobble", onLaneWobble], ["tool-lane-crunch", onLaneCrunch],
      ["tool-lane-volume", onLaneVolume], ["tool-lane-volume-done", onLaneVolumeDone],
      ["tool-voice-record", onVoiceRecord], ["tool-voice-fx", onVoiceFx], ["tool-voice-send", onVoiceSend],
      ["tool-keys-record", onKeysRecord], ["tool-keys-audition", onKeysAudition], ["tool-keys-send", onKeysSend],
      ["tool-pads-play", onPadsPlay],
      ["tool-magic-pointer", onMagicPointer], ["tool-magic-wave", onMagicWave],
      ["tool-magic-record", onMagicRecord], ["tool-magic-send", onMagicSend],
    ] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subs.forEach(([ev, fn]) => EventBus.on(ev as never, fn as any));
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subs.forEach(([ev, fn]) => EventBus.off(ev as never, fn as any));
    };
  }, [dispatch, dispatchAll, engine, sound, rng, getProject, surprise]);

  // Everything — nav, tools, transport, grid — is painted in Phaser now. The
  // whole Workshop view is the shared canvas with no HTML chrome at all.
  return (
    <div style={VIEW_OVERLAY}>
      <PhaserScene scene={WorkshopScene} onSceneReady={handleSceneReady} />
    </div>
  );
};
