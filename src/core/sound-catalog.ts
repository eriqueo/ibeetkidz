// The built-in sound pack, as DATA. This is the single source of truth shared
// by the UI (pads/rows render from it) and the audio adapter (it synthesizes a
// buffer per `assetId`). Sounds are generated procedurally at boot — no binary
// assets ship — so the app stays fully offline and the pack is a config edit.
//
// Adding a sound = one entry here + (if a new `recipe`) one branch in the
// adapter's synthesizer. No plumbing changes.

/** How the adapter should synthesize the sample. */
export type SoundRecipe =
  | { readonly kind: "drum"; readonly drum: DrumKind }
  | { readonly kind: "tone"; readonly note: string };

export type DrumKind =
  | "kick"
  | "snare"
  | "hihat"
  | "clap"
  | "tom"
  | "cowbell"
  // Rework palette (appended — existing ids/saves unaffected).
  | "openhat"
  | "rim"
  | "shaker"
  | "conga";

export interface BuiltinSound {
  readonly assetId: string;
  readonly label: string;
  readonly emoji: string;
  readonly color: string;
  readonly recipe: SoundRecipe;
}

/** 16 pads: 10 drums + a 6-note pentatonic run of melodic blips. */
export const BUILTIN_SOUNDS: readonly BuiltinSound[] = [
  { assetId: "kick", label: "Boom", emoji: "🥁", color: "#ef476f", recipe: { kind: "drum", drum: "kick" } },
  { assetId: "snare", label: "Snap", emoji: "🪘", color: "#ff5d8f", recipe: { kind: "drum", drum: "snare" } },
  { assetId: "hihat", label: "Tss", emoji: "🎩", color: "#ffd166", recipe: { kind: "drum", drum: "hihat" } },
  { assetId: "clap", label: "Clap", emoji: "👏", color: "#06d6a0", recipe: { kind: "drum", drum: "clap" } },
  { assetId: "tom", label: "Bonk", emoji: "🛢️", color: "#118ab2", recipe: { kind: "drum", drum: "tom" } },
  { assetId: "cowbell", label: "Ding", emoji: "🔔", color: "#3a86ff", recipe: { kind: "drum", drum: "cowbell" } },
  { assetId: "openhat", label: "Sssss", emoji: "💨", color: "#f4a261", recipe: { kind: "drum", drum: "openhat" } },
  { assetId: "rim", label: "Tik", emoji: "🥢", color: "#2a9d8f", recipe: { kind: "drum", drum: "rim" } },
  { assetId: "shaker", label: "Shaka", emoji: "🪇", color: "#fb5607", recipe: { kind: "drum", drum: "shaker" } },
  { assetId: "conga", label: "Tumba", emoji: "🟤", color: "#b5651d", recipe: { kind: "drum", drum: "conga" } },
  { assetId: "note-do", label: "Do", emoji: "🔵", color: "#3a86ff", recipe: { kind: "tone", note: "C4" } },
  { assetId: "note-re", label: "Re", emoji: "🟣", color: "#8338ec" , recipe: { kind: "tone", note: "D4" } },
  { assetId: "note-mi", label: "Mi", emoji: "🩷", color: "#ff5d8f", recipe: { kind: "tone", note: "E4" } },
  { assetId: "note-sol", label: "Sol", emoji: "🟢", color: "#06d6a0", recipe: { kind: "tone", note: "G4" } },
  { assetId: "note-la", label: "La", emoji: "🟡", color: "#ffd166", recipe: { kind: "tone", note: "A4" } },
  { assetId: "note-do2", label: "Do!", emoji: "🟠", color: "#fb5607", recipe: { kind: "tone", note: "C5" } },
];

/** Drum-only subset — used to seed the Beat Maker rows. */
export const DRUM_SOUNDS: readonly BuiltinSound[] = BUILTIN_SOUNDS.filter(
  (s) => s.recipe.kind === "drum",
);

const byId = new Map(BUILTIN_SOUNDS.map((s) => [s.assetId, s]));
export const getBuiltin = (assetId: string): BuiltinSound | undefined =>
  byId.get(assetId);
