// ─────────────────────────────────────────────────────────────────────────────
// The persistence boundary (ticket S5).
//
// INVARIANT: everything that crosses the persistence boundary is parsed exactly
// ONCE, HERE, and the core never re-checks it afterwards. Before this module the
// load path was `normalizeProject(JSON.parse(json) as Partial<Project>)` — a cast,
// not a parse. `clips` entered wholly unvalidated even though the app switches on
// `clip.source.kind`; `activeView` entered unchecked even though an out-of-union
// value falls past every branch of the view switch.
//
// Data flow:   string → JSON.parse → parseProject → VersionedSave → migrate → Project
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^
//              this module: is it well-formed, and what version?     project-state.ts:
//                                                                    domain logic over
//                                                                    ALREADY-TRUSTED input
//
// Two branches, and only ever two kinds of branch:
//
//   version 0  — no `schemaVersion` field. The shape that shipped before the
//                format was versioned. Handed to the FROZEN `normalizeProject`,
//                which carries every structural sniff the app has ever needed
//                (flat `layers` → one car; `arrangement` repeats → flat train
//                slots; derived `carType`). NO NEW SNIFFS ARE EVER ADDED THERE.
//   version 1  — the current shape. Parsed straight into `Project`; `migrate`
//                is the identity for it.
//
// Every future format change is a new numbered case, never another sniff.
//
// zod is used because it is already a dependency and already proven at a
// boundary in `src/game/TiledParser.ts`. A second validator would be a second
// dialect (Principle: seek the precedent).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import {
  CAR_TYPES,
  SCHEMA_VERSION,
  type Clip,
  type Layer,
  type Project,
} from "./types.ts";
import { INSTRUMENTS, type InstrumentId } from "./instruments.ts";
import { SCALE_IDS, KEY_IDS } from "./scale.ts";

// ── Result + error (F1-2: a hand-rolled discriminated union) ────────────────
// Principle 19 — failure lives in the return type and carries a code you route
// on, not a string you regex. No new dependency for one boundary.

/** What went wrong, coarsely enough to route on and finely enough to explain. */
export type ParseErrorCode =
  /** The stored text is not JSON at all (a half-written entry, a torn write). */
  | "not-json"
  /** Valid JSON, but not an object — `null`, `5`, `[]`. */
  | "not-an-object"
  /** Written by a NEWER build than this one. Refused, deliberately (F1-1). */
  | "too-new"
  /** An object of the right era, but a required part of it is unusable. */
  | "unreadable";

/** Copy a five-year-old can act on. Same two-field shape as S4's
 *  `TROUBLE_COPY` entries in `src/app/context.tsx`, so the existing storage
 *  notice can render a `ParseError` as-is without a translation layer. */
export interface KidMessage {
  readonly title: string;
  readonly body: string;
}

export interface ParseError {
  readonly code: ParseErrorCode;
  /** Where in the save it went wrong (`parts.0.layers.1.kind`); "" at the root. */
  readonly path: string;
  /** Operator-facing detail. Goes in a log or `?diag`, NEVER on screen. */
  readonly detail: string;
  /** What the child is told. */
  readonly kidMessage: KidMessage;
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ParseError };

/** Kid-facing copy per failure code (data, not branches — Principle 7). The
 *  voice matches the storage notice S4 already ships ("💾 No more room!" /
 *  "Ask a grown-up to make some space."): name the problem, absolve the child,
 *  say what happens next. */
const KID_COPY: Record<ParseErrorCode, KidMessage> = {
  "not-json": {
    title: "🚂 I can't read this song.",
    body: "Some of it got scrambled while it was saved.\nLet's start a new one — it'll save just fine!",
  },
  "not-an-object": {
    title: "🚂 I can't read this song.",
    body: "Some of it got scrambled while it was saved.\nLet's start a new one — it'll save just fine!",
  },
  unreadable: {
    title: "🚂 I can't read this song.",
    body: "Some of it got scrambled while it was saved.\nLet's start a new one — it'll save just fine!",
  },
  "too-new": {
    title: "🚂 This song is too new for me!",
    body: "It was made with a newer ibeetkidz.\nAsk a grown-up to update this one, then your\nsong will be right here waiting.",
  },
};

export const ok = <T,>(value: T): ParseResult<T> => ({ ok: true, value });

export const fail = <T,>(
  code: ParseErrorCode,
  path: string,
  detail: string,
): ParseResult<T> => ({
  ok: false,
  error: { code, path, detail, kidMessage: KID_COPY[code] },
});

/** Thrown ONLY by the deprecated `deserialize` shim, so the one call site that
 *  still expects a throwing API keeps working until S6 rewires it to
 *  `parseSave`. Carries the typed error rather than flattening it to a string. */
export class SaveParseError extends Error {
  readonly error: ParseError;
  constructor(error: ParseError) {
    super(`${error.code}${error.path ? ` at ${error.path}` : ""}: ${error.detail}`);
    this.name = "SaveParseError";
    this.error = error;
  }
}

// ── exactOptionalPropertyTypes bridge ───────────────────────────────────────
// zod types an `.optional()` field as `k?: T | undefined`. Under this repo's
// `exactOptionalPropertyTypes`, that is NOT assignable to a domain type that
// declares `k?: T`. At runtime zod already omits absent keys; `compact` makes
// the type say so, and deletes any key that IS present-but-undefined so the
// runtime value can never contradict the type.

type Defined<T> = { [K in keyof T]: Exclude<T[K], undefined> };

function compact<T extends object>(o: T): Defined<T> {
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) delete (o as Record<string, unknown>)[k];
  }
  return o as Defined<T>;
}

// ── Leaf schemas (shared by both versions) ──────────────────────────────────
// Enumerations come from the same data the app renders from, so a new car type
// or instrument is loadable the moment it is addable.

const CarTypeSchema = z.enum(CAR_TYPES as unknown as [string, ...string[]]) as z.ZodType<
  Project["parts"][number]["carType"]
>;
const AppViewSchema = z.enum(["map", "workshop", "yard", "track"]);
const ScaleIdSchema = z.enum(SCALE_IDS as unknown as [string, ...string[]]) as z.ZodType<
  Project["scaleId"]
>;
const KeyIdSchema = z.enum(KEY_IDS as unknown as [string, ...string[]]) as z.ZodType<
  Project["keyId"]
>;
const WaveSchema = z.enum(["sine", "triangle", "square", "sawtooth"]);

const SYNTH_IDS = new Set<string>(INSTRUMENTS.map((i) => i.id));
/** `SynthInstrumentId | \`voice:${string}\`` — a template-literal member, so a
 *  predicate rather than an enum. `voice:` must actually carry a buffer id. */
const InstrumentIdSchema = z.custom<InstrumentId>(
  (v) =>
    typeof v === "string" &&
    (SYNTH_IDS.has(v) || (v.startsWith("voice:") && v.length > "voice:".length)),
  { message: "not a known instrument id" },
);

const EffectIdSchema = z.enum([
  "reverse",
  "pitchUp",
  "pitchDown",
  "robot",
  "echo",
  "reverb",
  "bitcrush",
  "crazy",
]);

const EffectDescriptorSchema = z
  .object({ id: EffectIdSchema, amount: z.number() })
  .transform(compact);

const ClipSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("builtin"), assetId: z.string() }),
  z.object({ kind: z.literal("recording"), bufferId: z.string() }),
  z.object({ kind: z.literal("synth"), note: z.string() }),
]);

const ClipSchema = z
  .object({
    id: z.string(),
    source: ClipSourceSchema,
    effects: z.array(EffectDescriptorSchema),
    color: z.string(),
    label: z.string(),
    loopBeats: z.number().optional(),
  })
  .transform(compact);

/**
 * `clips` is parsed PER ENTRY and a broken entry is DROPPED rather than failing
 * the whole load. A clip with no `source` is already fatal downstream (the app
 * reads `clip.source.kind` unguarded) and is unplayable regardless; a lane left
 * pointing at the dropped id simply goes quiet, which the scheduler already
 * handles (`audio-engine.ts`: `const clip = ...; if (!clip) continue`). Losing
 * one sound beats losing the song.
 */
const ClipsSchema = z.record(z.string(), z.unknown()).transform((rec) => {
  const out: Record<string, Clip> = {};
  for (const [id, value] of Object.entries(rec)) {
    const parsed = ClipSchema.safeParse(value);
    if (parsed.success) out[id] = parsed.data;
  }
  return out;
});

const PitchPinSchema = z.object({ t: z.number(), row: z.number() }).transform(compact);

const StepNoteSchema = z
  .object({
    row: z.number(),
    length: z.number(),
    roll: z.union([z.literal(2), z.literal(4)]).optional(),
    pins: z.array(PitchPinSchema).optional(),
  })
  .transform(compact);

const LayerPatternSchema = z
  .object({
    steps: z.array(StepNoteSchema.nullable()),
    notes: z.array(z.array(StepNoteSchema)),
  })
  .transform(compact);

const TrainCarSchema = z
  .object({
    instanceId: z.string(),
    partId: z.string(),
    muted: z.boolean(),
  })
  .transform(compact);

// ── Version 1: the current shape, parsed straight into `Project` ────────────

const LayerV1Schema = z
  .object({
    id: z.string(),
    clipId: z.string(),
    volume: z.number(),
    muted: z.boolean(),
    kind: z.enum(["drum", "melody"]),
    steps: z.array(StepNoteSchema.nullable()),
    notes: z.array(z.array(StepNoteSchema)),
    wave: WaveSchema,
    instrument: InstrumentIdSchema.optional(),
    echo: z.number(),
    tone: z.number(),
    swing: z.number().optional(),
    wobble: z.number().optional(),
    crunch: z.number().optional(),
    variations: z.array(LayerPatternSchema).optional(),
    patternIndex: z.number().optional(),
  })
  .transform(compact);

const PartV1Schema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    carType: CarTypeSchema,
    layers: z.array(LayerV1Schema),
  })
  .transform(compact);

export const ProjectV1Schema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: z.string(),
    name: z.string(),
    tempoBpm: z.number(),
    clips: ClipsSchema,
    // At least one car. `activePart` reads `parts[0]!` unguarded and the
    // reducers refuse to delete the last car, so a save with zero cars is not a
    // save this app ever wrote — it is corruption, and it fails the parse.
    parts: z.array(PartV1Schema).min(1),
    train: z.array(TrainCarSchema),
    activePartId: z.string(),
    scaleId: ScaleIdSchema,
    keyId: KeyIdSchema,
    swing: z.number(),
    // Free-form by design: tool ids come and go (the v1 tool ids are gone) and a
    // stale one must not cost a kid their song. Coerced to the boot default.
    activeMachineId: z.string().catch("looper-stage"),
    // An out-of-union view would fall past every branch of the view switch and
    // render nothing, so it is coerced rather than trusted or rejected.
    activeView: AppViewSchema.catch("map"),
  })
  .transform(compact);

// ── Compile-time round-trip guard (S5's property test, enforced by tsc) ─────
// The whole point of a schema at a boundary is that the boundary can't drift
// from the domain type behind it. `ParsedProject` must BE a `Project`:
//
//   * add a field to `Project` and forget this schema → `SchemaProducesProject`
//     stops compiling (the parse output is missing a required property), and
//     since assignability is structural and recursive, that holds for a new
//     field on `Layer`, `Part`, `Clip`, `StepNote` or `TrainCar` too;
//   * delete a field from `Project` and forget this schema → `SchemaAddsNoFields`
//     stops compiling (the schema still produces a key `Project` no longer has).
//
// `npm run typecheck` is therefore the round-trip property test, and it cannot
// be forgotten the way a runtime assertion can.

/** Exactly what `ProjectV1Schema` yields. Provably `Project` — see below. */
export type ParsedProject = z.infer<typeof ProjectV1Schema>;

type Assert<_Narrow extends Wide, Wide> = true;

export type SchemaProducesProject = Assert<ParsedProject, Project>;
export type SchemaAddsNoFields = Assert<keyof ParsedProject, keyof Project>;
/** Same guard one level down, where field churn actually happens. */
export type LayerSchemaAddsNoFields = Assert<
  keyof z.infer<typeof LayerV1Schema>,
  keyof Layer
>;

// ── Version 0: the pre-versioning shape ────────────────────────────────────

/**
 * What a version-0 save actually is, spelled out honestly.
 *
 * Note what these types do NOT claim: that a v0 save's parts are real `Part`s or
 * its cells real `StepNote`s. They are not — a v0 `Part` has no `carType`, a v0
 * drum lane may be a `boolean[]`, a v0 melody lane may be `(number | null)[]`.
 * Those shapes predate `Project` and cannot be spelled in terms of it, which is
 * exactly why the old `JSON.parse(json) as Partial<Project>` was a lie. Their
 * parser is `makeLayer`/`normalizePart`, which have coerced them since the first
 * release and are frozen along with the rest of the v0 branch; the schema below
 * owns everything above that line — the top-level fields, the enums, the clips,
 * and the structure (is `parts` an array of objects at all?).
 */
// `?: T | undefined` rather than `?: T` throughout: these describe LOOSE, raw
// save data where a field may be present-but-junk, and that is precisely the
// `Partial<Project>` semantics the frozen migrator was already written against.
export interface LegacyRawLayer {
  readonly id?: string | undefined;
  readonly clipId?: string | undefined;
}

export interface LegacyRawPart {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly color?: string | undefined;
  readonly carType?: Project["parts"][number]["carType"] | undefined;
  readonly layers?: readonly LegacyRawLayer[] | undefined;
}

export interface LegacyRawTrainCar {
  readonly instanceId?: string | undefined;
  readonly partId: string;
  readonly muted?: boolean | undefined;
}

/** Fields that predate the train model: a flat `layers` (pre-Song-Train) and an
 *  `arrangement` of `{ partId, repeats }` (pre-v2). Both are migrated forward by
 *  the frozen `normalizeProject`. (Moved here from `project-state.ts` — the
 *  shape of an old SAVE is a persistence-boundary concern.) */
export interface LegacyFields {
  readonly layers?: readonly LegacyRawLayer[] | undefined;
  readonly arrangement?: readonly {
    readonly partId: string;
    readonly repeats?: number | undefined;
  }[] | undefined;
}

/** What the version-0 branch hands to `normalizeProject`. */
export interface LegacyRawProject extends LegacyFields {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly tempoBpm?: number | undefined;
  readonly clips?: Readonly<Record<string, Clip>> | undefined;
  readonly parts?: readonly LegacyRawPart[] | undefined;
  readonly train?: readonly LegacyRawTrainCar[] | undefined;
  readonly activePartId?: string | undefined;
  readonly scaleId?: Project["scaleId"] | undefined;
  readonly keyId?: Project["keyId"] | undefined;
  readonly swing?: number | undefined;
  readonly activeMachineId?: string | undefined;
  readonly activeView?: Project["activeView"] | undefined;
}

/** Parse an array ELEMENT-WISE, dropping entries that don't parse instead of
 *  failing the whole array. One junk train slot must not cost a kid the other
 *  eleven — and it is a strict improvement on the status quo, where a `null`
 *  entry in `parts` reached `normalizePart` and threw. */
function tolerantArray<S extends z.ZodTypeAny>(
  element: S,
): z.ZodType<z.output<S>[], z.ZodTypeDef, unknown> {
  return z.array(z.unknown()).transform((raw) => {
    const out: z.output<S>[] = [];
    for (const value of raw) {
      const parsed = element.safeParse(value);
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  });
}

// `.passthrough()` is load-bearing on every legacy sub-object: the fields these
// schemas do NOT name (`steps`, `notes`, `wave`, `volume`, `variations`, …) are
// precisely what `makeLayer` migrates, and the default `.strip()` would delete
// the kid's music on the way in.
const LegacyLayerSchema = z
  .object({
    id: z.string().optional().catch(undefined),
    clipId: z.string().optional().catch(undefined),
  })
  .passthrough();

const LegacyPartSchema = z
  .object({
    id: z.string().optional().catch(undefined),
    name: z.string().optional().catch(undefined),
    color: z.string().optional().catch(undefined),
    carType: CarTypeSchema.optional().catch(undefined),
    layers: tolerantArray(LegacyLayerSchema).optional().catch(undefined),
  })
  .passthrough();

const LegacyTrainCarSchema = z
  .object({
    instanceId: z.string().optional().catch(undefined),
    // A slot with no car to point at is not a slot. Dropped by `tolerantArray`.
    partId: z.string(),
    muted: z.boolean().optional().catch(undefined),
  })
  .passthrough();

const LegacyArrangeCarSchema = z
  .object({
    partId: z.string(),
    repeats: z.number().optional().catch(undefined),
  })
  .passthrough();

/** Every leaf is optional and self-healing: a v0 save must never be REFUSED for
 *  a bad field, only degraded, because `normalizeProject` has a defined default
 *  for each one. `.catch(undefined)` turns "invalid" into "absent" so the frozen
 *  migrator's own fallback runs, exactly as it did before this module existed. */
const LegacyProjectSchema = z
  .object({
    id: z.string().optional().catch(undefined),
    name: z.string().optional().catch(undefined),
    tempoBpm: z.number().optional().catch(undefined),
    clips: ClipsSchema.optional().catch(undefined),
    parts: tolerantArray(LegacyPartSchema).optional().catch(undefined),
    train: tolerantArray(LegacyTrainCarSchema).optional().catch(undefined),
    layers: tolerantArray(LegacyLayerSchema).optional().catch(undefined),
    arrangement: tolerantArray(LegacyArrangeCarSchema).optional().catch(undefined),
    activePartId: z.string().optional().catch(undefined),
    scaleId: ScaleIdSchema.optional().catch(undefined),
    keyId: KeyIdSchema.optional().catch(undefined),
    swing: z.number().optional().catch(undefined),
    activeMachineId: z.string().optional().catch(undefined),
    activeView: AppViewSchema.optional().catch(undefined),
  })
  .transform(compact);

/** Same compile-time guard as the v1 schema, one era back: the legacy parse
 *  output must be exactly what the frozen migrator's signature says it takes. */
export type LegacyParseOutput = z.infer<typeof LegacyProjectSchema>;
export type LegacySchemaProducesLegacyRaw = Assert<LegacyParseOutput, LegacyRawProject>;

// ── The boundary ────────────────────────────────────────────────────────────

/** A save, validated and tagged with the format it is written in. `migrate`
 *  switches on `version` with no `default`, so adding a version 2 without
 *  writing its migration fails to compile. */
export type VersionedSave =
  | { readonly version: 0; readonly data: LegacyRawProject }
  | { readonly version: 1; readonly data: Project };

/** The one and only place a saved project stops being `unknown`. */
export function parseProject(raw: unknown): ParseResult<VersionedSave> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("not-an-object", "", `save root is ${describe(raw)}, not an object`);
  }

  const declared = (raw as { schemaVersion?: unknown }).schemaVersion;

  if (declared === undefined) {
    // No version field at all ⇒ version 0, the shape from before versioning.
    const parsed = LegacyProjectSchema.safeParse(raw);
    if (!parsed.success) return zodFailure(parsed.error);
    return ok({ version: 0, data: parsed.data });
  }

  if (typeof declared !== "number" || !Number.isInteger(declared) || declared < 0) {
    return fail(
      "unreadable",
      "schemaVersion",
      `schemaVersion is ${describe(declared)}, not a whole number`,
    );
  }

  if (declared > SCHEMA_VERSION) {
    // F1-1: REFUSE. Best-effort parsing of a format we have never seen is how
    // a child's song gets silently rewritten into a lossy version of itself.
    return fail(
      "too-new",
      "schemaVersion",
      `save is version ${declared}; this build understands up to ${SCHEMA_VERSION}`,
    );
  }

  if (declared === 0) {
    const parsed = LegacyProjectSchema.safeParse(raw);
    if (!parsed.success) return zodFailure(parsed.error);
    return ok({ version: 0, data: parsed.data });
  }

  const parsed = ProjectV1Schema.safeParse(raw);
  if (!parsed.success) return zodFailure(parsed.error);
  return ok({ version: 1, data: parsed.data });
}

function zodFailure<T>(error: z.ZodError): ParseResult<T> {
  const issue = error.issues[0];
  return fail(
    "unreadable",
    issue ? issue.path.join(".") : "",
    issue ? issue.message : "failed validation",
  );
}

function describe(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  return typeof v;
}
