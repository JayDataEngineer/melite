// models/contract.ts — THE MODEL REGISTRY CONTRACT (the family
// declaration law; the cards DSL twin). This file +
// models.ts are the declaration plane beside this file (the registry.generated
// module is RETIRED — catalogEmission says so; nothing may cite it as live).
// by the declarations themselves (every row validated at
// construction — the dump carries the contract's own verdicts, not a
// hand transcription).
//
// Shape laws carried over verbatim:
// - rows are FROZEN DATA (PYTHON SHAPE LAW rung 1 → data-stays-data,
//   P36): a cell is a record, not a type.
// - `extra: forbid` → registerFamily resolves every DECL strictly and
//   refuses stripped keys as drift (the plain object resolver MERGES
//   unknown keys by default — corrected 2026-09-10, row 16).
// - artifact all-or-nothing (rung 4): a Cell either downloads or not.
// - sha256: 64 lowercase hex (regex validator).
// - served ModelRow.form REQUIRED non-empty (2026-08-11 catalog
//   contract: every served model routes and renders).
// - cascade merge: family → variant → cell, LATER LAYERS WIN.

// schemastery's default export is BOTH the z facade and the
// Schema resolver (the same object — service.ts takes it as `Schema`)
import z from "@deepseek-ai/schemastery";
const Schema = z;

/** Loud refusal before the wire (the QUEUE LANE LAW shape). */
export class ModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelError";
  }
}

const SHA256_RE = /^[0-9a-f]{64}$/;
export const SAFE_ID_RE = /^[a-z0-9_-]+$/;

// ── served/emitted rows ─────────────────────────────────────────────

export interface SourceRow {
  /** Absent = untyped (every reader ?? ""s — the download law
   *  composes repo + filename, never the type). */
  type?: string;
  repo_id?: string;
  filename?: string;
  /** The free-form provenance note (schema-declared; the interface
   *  owes it a slot or the pair drifts). */
  note?: string;
}
export const SourceRow: z<SourceRow> = z.object({  type: z.string().required(false),
  // absent = untyped (the interface's own law, and every reader's
  // ?? ""): the schema used to REQUIRE these three, so a DECL that
  // omitted them was tsc-clean and refused at registration.
  // `.required(false)`, not `.default("")`: a defaulted string's
  // INPUT admits null (schemastery: null means take-the-default),
  // which the z<SourceRow> marriage then rejects at ModelDecl's
  // union — optionality is the law, "" is the readers' business.
  repo_id: z.string().required(false),
  filename: z.string().required(false),
  note: z.string().required(false),
});

// THE LORA GRAMMAR LIVES WITH ITS OWNERS (2026-10-10, the card
// audit's M3): this row type had ZERO consumers and disagreed with
// the live shape (it demanded `user_provided`, which no flavor row
// authors, and lacked source_url/tooltip/preprocessor/
// default_weight, which they all do). Two grammars for one row is
// how a runtime shape drifts from its declaration — the live one is
// `LoraRowDecl` (models/<family>/mods/loras.ts), the registration
// port is `registerMod`'s contract. The stale twin is deleted.

/** A matrix cell's downloadable body — the DOWNLOAD LINK. */
export interface CellArtifact {
  source_url: string;
  size_bytes: number;
  sha256: string;
  dest_root: string;
  dest_sub: string;
  size_hint_gb?: number;
  vram_peak_gb?: number;
}

export const CellArtifact: z<CellArtifact> = z.object({
  source_url: z.string().pattern(/^https?:\/\//),
  size_bytes: z.number().min(1),
  sha256: z.string().pattern(SHA256_RE),
  dest_root: z.string().default("COMFYUI_ROOT"),
  dest_sub: z.string().default(""),
  size_hint_gb: z.number().required(false),
  vram_peak_gb: z.number().required(false),
});

// ── the cascade rows (frozen instances, not subclasses) ─────────────

/** One (variant × quant) matrix place. Either IS a download place
 *  (artifact present) or is NOT (null) — all-or-nothing. */
export interface CellRow {
  quant: string;
  label: string;
  /** ONLY THE QUANT CARRIES THE DOWNLOAD (operator order
   *  2026-09-08): the cell names its own artifact file — the
   *  model carries the repo, variants carry nothing
   *  downloadable, and the route's source composes the two. */
  source?: SourceRow | null;
  /** The quant's own flat label/description overrides (the bf16
   *  copy's full truth) — the derived route view prefers
   *  cell → variant → model. */
  description?: string;
  /** Absent = unaddressable (the flattener's "" sentinel is
   *  retired — readers test truthiness, never ==""). */
  route?: string;
  /** Absent = the atom's engine (every reader ?? ""s). */
  engine?: string;
  vram_peak_gb?: number;
  resolver_defaults?: Record<string, unknown>;
  /** Present-only-when-true (absent ≡ shown). */
  hide_from_dropdown?: boolean;
  artifact?: CellArtifact | null;
}

export const CellRow: z<CellRow> = z.object({
  quant: z.string().pattern(SAFE_ID_RE),
  label: z.string().default(""),
  source: z.union([SourceRow, z.const(null)]).default(null),
  description: z.string().default(""),
  route: z.string().default(""),
  engine: z.string().default(""),
  vram_peak_gb: z.number().min(0).required(false),
  resolver_defaults: z.dict(z.any()).default({}),
  hide_from_dropdown: z.boolean().default(false),
  artifact: z.union([CellArtifact, z.const(null)]).default(null),
});

export interface VariantRow {
  id: string;
  label: string;
  /** The variant's own flat description override (the derived
   *  route view prefers cell → variant → model). */
  description?: string;
  /** Absent = no hint (readers ?? "" — the "" sentinel is spam). */
  hint?: string;
  /** The dropdown group — always written (the UI defaults absent
   *  to Quant, NOT Variant: stripping lies about membership). */
  group: string;
  hide_from_dropdown?: boolean;
  /** Absent = unaddressable (truthiness-tested, never ==""). */
  route?: string;
  /** Absent = the atom's engine (every reader ?? ""s). */
  engine?: string;
  order?: number;
  resolver_defaults?: Record<string, unknown>;
  /** The variant's ROUTE ENVELOPE (the skill rework, 2026-09-21):
   *  closed steps/cfg bounds — out-of-envelope stated values refuse
   *  LOUD at stampCardOverlay (envelopeRefusal names the variant,
   *  route, envelope, marriage). Absent = no closed envelope.
   *  Written [min, max] — envelopeRefusal validates the pair at
   *  enforcement (this z's tuples loosen to arrays, so the pair
   *  lives as a 2-number array on the wire). */
  sampler_envelope?: { steps: number[]; cfg: number[] };
  /** The variant's LANE INPUT stamps (the intercept over the
   *  model's base lane_inputs — e.g. the base checkpoint's
   *  model_path; merged base ← variant at the derived read). */
  lane_inputs?: Record<string, unknown>;
  wire_defaults?: Record<string, unknown> | null;
  /** THE LANE SURFACE (fix shape 1): the params this variant
   *  accepts IN ADDITION to the family base (the cascade law —
   *  later layers add, never subtract). Absent = the variant adds
   *  nothing (it inherits the family surface verbatim). A variant's
   *  field set IS its declaration: the form hides what the lane
   *  does not declare, and the bench door refuses a stated field
   *  outside it. */
  params?: string[];
  /** This lane's relation words (judged in ADDITION to the family's
   *  — both layers fire). Absent ≡ none. */
  relations?: ParamRelationWords;
  /** This lane's numeric bounds: a stated field's row REPLACES the
   *  family's for that field, per-ENDPOINT (a variant that tightens
   * only the ceiling holds the family's floor; the lightning
   * recipe's step ceiling is not the standard's). Judged at
   * bench-write with the same voice as the words. Absent ≡ inherit
   * the family's. */
  bounds?: LaneBoundsMap;
  cells: CellRow[];
}

// ── THE PARAMETER SURFACE + THE RELATION WORDS (2026-10-10, the
// YOU_ARE_A_LIAR fix shape 1: "ModelDecl gains a per-variant
// parameter surface and relation words — the model becomes the
// author of what it accepts") ─────────────────────────────────────
//
// Before these members the DECL had NO organ for its parameter
// surface: a model could declare variants, weights, and lanes, but
// never WHAT IT ACCEPTS — the field truth lived only in each
// card's hand-authored union table, sliced at render time by
// visible_when equality strings, and nothing anywhere could say
// "this field requires that one." The words live at
// @melite/contracts/laneRelations (the zero-dep floor — the bench
// door, the form, and the law suites all judge the SAME shape);
// this grammar is the DECL author's spelling of it.

/** One requires row: `field` fires only when every `needs` member
 *  is stated (design_prompt requires voice_name). `cure` rides the
 *  refusal — the sentence that names the cure. */
export interface ParamRequiresRow {
  field: string;
  needs: string[];
  cure?: string;
}

/** One conflicts row: the two fields cannot both be stated. */
export interface ParamConflictsRow {
  a: string;
  b: string;
  cure?: string;
}

/** One together row: the all-or-nothing group (voice_name +
 *  design_prompt — the export needs the pair). */
export interface ParamTogetherRow {
  fields: string[];
  cure?: string;
}

/** One either_or row: at least one FULL group must ride (the clone
 *  lane: ref_audio + ref_text, or a .qvoice). Armed only when a
 *  member is stated — a blank lane is authoring-in-progress. */
export interface ParamEitherOrRow {
  groups: string[][];
  cure?: string;
}

/** One at_most_one row: a slot family — at most one member stated. */
export interface ParamAtMostOneRow {
  fields: string[];
  cure?: string;
}

/** One required row: these fields must be stated on the lane.
 *  `any_of: true` makes the fields a ONE-OF anchor (the DECL
 *  audit's row 2, 2026-10-10: the image-edit anchor is one list OR
 *  any legacy key — a "required" the blank tolerance would gut and
 *  either_or cannot say; refused only when NONE of the fields is
 *  stated). */
export interface ParamRequiredRow {
  fields: string[];
  any_of?: boolean;
  cure?: string;
}

/** The relation words (the wire twin of LaneRelations — the judged
 *  shape lives at the contracts floor, one spelling). `at_most_one`
 *  and `required` landed with the design audit of 2026-10-10: the
 *  vocabulary could not say "one of these six slots" or "this lane
 *  needs a prompt", and the migration was about to harden that
 *  surface into twenty-two families. */
export interface ParamRelationWords {
  requires?: ParamRequiresRow[];
  conflicts?: ParamConflictsRow[];
  together?: ParamTogetherRow[];
  either_or?: ParamEitherOrRow[];
  at_most_one?: ParamAtMostOneRow[];
  required?: ParamRequiredRow[];
}

const FIELD_NAME_RE = /^[a-z0-9_]+$/;

export const ParamRequiresRow: z<ParamRequiresRow> = z.object({
  field: z.string().pattern(FIELD_NAME_RE),
  needs: z.array(z.string().pattern(FIELD_NAME_RE)).min(1),
  cure: z.string().default(""),
});

export const ParamConflictsRow: z<ParamConflictsRow> = z.object({
  a: z.string().pattern(FIELD_NAME_RE),
  b: z.string().pattern(FIELD_NAME_RE),
  cure: z.string().default(""),
});

export const ParamTogetherRow: z<ParamTogetherRow> = z.object({
  fields: z.array(z.string().pattern(FIELD_NAME_RE)).min(2),
  cure: z.string().default(""),
});

export const ParamEitherOrRow: z<ParamEitherOrRow> = z.object({
  groups: z.array(z.array(z.string().pattern(FIELD_NAME_RE)).min(1)).min(2),
  cure: z.string().default(""),
});

export const ParamAtMostOneRow: z<ParamAtMostOneRow> = z.object({
  // a slot family needs at least two members to be a choice
  fields: z.array(z.string().pattern(FIELD_NAME_RE)).min(2),
  cure: z.string().default(""),
});

export const ParamRequiredRow: z<ParamRequiredRow> = z.object({
  fields: z.array(z.string().pattern(FIELD_NAME_RE)).min(1),
  any_of: z.boolean().default(false),
  cure: z.string().default(""),
});

export const ParamRelationWords: z<ParamRelationWords> = z.object({
  requires: z.array(ParamRequiresRow),
  conflicts: z.array(ParamConflictsRow),
  together: z.array(ParamTogetherRow),
  either_or: z.array(ParamEitherOrRow),
  at_most_one: z.array(ParamAtMostOneRow).required(false),
  required: z.array(ParamRequiredRow).required(false),
});

/** One bounds row (the RANGE RULE — whoever owns the default owns
 * the floor): the model's own numeric domain for ONE param. At
 * least one endpoint stated (neither = a typo, not a law). */
export interface ParamBoundRow {
  min?: number;
  max?: number;
}

/** Per-field bounds for a lane: field name → its row. Variant rows
 * REPLACE the family's row for a field they STATE, per-ENDPOINT
 * within it (an endpoint the variant omits is held from the
 * family's row — `laneBoundsOf` is the single spelling; a variant
 * can tighten its own ceiling but never silently drop the family's
 * floor). */
export type LaneBoundsMap = Record<string, ParamBoundRow>;

export const ParamBoundRow: z<ParamBoundRow> = z.object({
  min: z.number().required(false),
  max: z.number().required(false),
});

export const VariantRow: z<VariantRow> = z.object({
  id: z.string().pattern(SAFE_ID_RE),
  label: z.string().default(""),
  description: z.string().default(""),
  hint: z.string().default(""),
  group: z.string().default("Variant"),
  hide_from_dropdown: z.boolean().default(false),
  route: z.string().default(""),
  engine: z.string().default(""),
  order: z.number().required(false),
  resolver_defaults: z.dict(z.any()).default({}),
  // THE VARIANT'S OPTIONAL HALF (the interface's law, and the census's
  // C3): each of these is absent-able in the interface, so each must
  // be absent-able HERE — otherwise a hand-written variant that omits
  // one is tsc-clean and refused at registration, and the lane
  // surfaces the schema's filled `{}`/`[]` the interface forbids.
  sampler_envelope: z.object({
    steps: z.array(z.number()),
    cfg: z.array(z.number()),
  }).required(false),
  lane_inputs: z.dict(z.any()).default({}),
  wire_defaults: z.union([z.dict(z.any()), z.const(null)]).required(false),
  params: z.array(z.string().pattern(FIELD_NAME_RE)).required(false),
  relations: ParamRelationWords.required(false),
  bounds: z.dict(ParamBoundRow).required(false),
  cells: z.array(CellRow).default([]),
});

export interface VariantGroupRow {
  id: string;
  label: string;
  tooltip?: string;
  default?: string;
}


export const VariantGroupRow: z<VariantGroupRow> = z.object({
  id: z.string(),
  label: z.string().default(""),
  tooltip: z.string().default(""),
  default: z.string().default(""),
});

export interface ProvisionRow {
  name: string;
  url: string;
  folder: string;
  sha256?: string;
  size_bytes?: number;
}

export const ProvisionRow: z<ProvisionRow> = z.object({
  name: z.string(),
  url: z.string(),
  folder: z.string(),
  // the digest and the size are OPTIONAL in the interface (a
  // provision may be pinned by URL alone) and absent-able here for
  // the same reason (the census's C3)
  sha256: z.string().pattern(SHA256_RE).required(false),
  size_bytes: z.number().min(0).required(false),
});

/**
 * THE SCHEMA/INTERFACE AGREEMENT (2026-10-10, the census's C3).
 *
 * Every row above was written TWICE: a hand-written TypeScript
 * interface (what an author may write) and a schemastery schema
 * (what registration accepts). They disagreed in both directions —
 * keys the interface called optional were REQUIRED by the schema
 * (so a hand-written DECL compiled and then refused at boot, with
 * the schema's filled `{}`/`[]` where the interface forbids it), and
 * keys the schema knew were absent from the interface entirely.
 *
 * The runtime half of the law is pinned here: a MINIMAL row per
 * schema — every optional key omitted — must STRICT-RESOLVE. A key
 * the interface documents as optional that the schema still demands
 * fails this wall, and the fix is the schema, never the author.
 */
export function assertSchemaAcceptsMinimalRows(): void {
  const minimal: Array<[string, unknown, unknown]> = [
    ["SourceRow", SourceRow, {}],
    ["CellArtifact", CellArtifact, { source_url: "https://x/y", size_bytes: 1, sha256: "a".repeat(64) }],
    ["CellRow", CellRow, { quant: "q" }],
    ["VariantRow", VariantRow, { id: "v" }],
    ["VariantGroupRow", VariantGroupRow, { id: "g" }],
    ["ProvisionRow", ProvisionRow, { name: "n", url: "https://x/y", folder: "models" }],
    ["ModPackMarriage", ModPackMarriage, { pack: "p", marries: { fps: "max" } }],
    ["ModelRow", ModelRow, { id: "i", family: "f", genre: "image", label: "L", description: "d", form: "image", source: {}, defaults: {}, engine: "comfyui" }],
    // THE MAIN DECLARATION (2026-10-10, the audit's Rule 7): ModelDecl
    // was the one row the wall did NOT cover — and it demanded
    // unoffered/form/source/studio/prompt_guide/timeout_floor/
    // canvas_default/character_presets/params/relations while the
    // interface called them optional, so a hand-written DECL that
    // omitted the lane declaration was tsc-clean and refused at
    // registration. The same bug class, at the top of the grammar.
    ["ModelDecl", ModelDecl, { id: "d", genre: "image", label: "L", variants: [] }],
  ];
  for (const [name, schema, row] of minimal) {
    try {
      Schema.resolve(row, schema as never, {}, true);
    } catch (err: unknown) {
      throw new Error(
        "contract drift: " + name + " still REQUIRES a key its interface calls optional — " +
        "a hand-written row omitting it compiles and is refused at registration (" +
        (err instanceof Error ? err.message : String(err)) + ")",
      );
    }
  }
}

/** ModelDecl, the SCHEMA (ledger row 16, 2026-09-10): the interface
 *  above had NO runtime twin — validateDecl hand-rolled four field
 *  checks while the law's `extra: forbid` went entirely
 *  unenforced (schemastery's default object resolver MERGES unknown
 *  keys — vendor source, adversarially verified). registerFamily
 *  now resolves every DECL through this schema STRICTLY; the strict
 *  leg strips unknown keys, and the service refuses the strip as
 *  drift (resolve result vs input key count) — forbid, honestly. */
/** THE MARRIAGE DECLARATION (#36, the recipes rework): an object
 *  DECL.mods entry boards the pack AND declares the knob marriage —
 *  a flavor row in this pack carries a value for a DECLARED card
 *  knob (the distill adapters' married step counts) that OWNS the
 *  knob while a counting bag row rides. 'max' is the one
 *  aggregation law (compose card.ts: "8 on a 4-step distill is
 *  fine, 4 on an 8-step is undercooked" — Math.max). Served
 *  verbatim on the form-spec kind so EVERY client face mirrors
 *  compose; the catalog row stays the ONE value owner (recipes
 *  reference ids — strength/steps never duplicated). Named const
 *  in the union (the SourceRow pattern — the inline object literal
 *  admits no contextual inference through z.union's tuple). */
export interface ModPackMarriage {
  pack: string;
  marries: Record<string, "max">;
}

export const ModPackMarriage: z<ModPackMarriage> = z.object({
  pack: z.string(),
  marries: z.dict(z.const('max')),
})

// The studio claim as ONE named row (the marriage comment promised
// this const by name; it did not exist — both the schema and the
// interface spelled the union inline, and the interface's copy had
// already drifted `readonly` wishes the runtime never had).
export interface StudioRow {
  tenant: string;
  owns_params?: boolean;
  writes?: string[];
  size?: string;
  layout?: string;
  kind?: string;
}
export const StudioRow: z<StudioRow> = z.object({
  tenant: z.string(),
  owns_params: z.boolean().required(false),
  writes: z.array(z.string()).required(false),
  size: z.string().required(false),
  layout: z.string().required(false),
  kind: z.string().required(false),
});

// THE MAIN DECLARATION'S TYPE IS ITS SCHEMA'S (2026-10-10, the
// design audit's Q1 — the first-ranked change). This row was the one
// the file left UN-ANNOTATED, with a comment confessing that the
// runtime schema and the TS interface "stay separate truths" and that
// two walls exist only to police the pair. The blockers the comment
// named are gone: the optional fields are `.required(false)` (which
// schemastery infers as optional), the presets are plain arrays (the
// declared `readonly` was the interface's own immutability wish, not
// a runtime fact), and the studio union is a named schema const
// (StudioRow) that the interface uses by name. ONE row, ONE truth: a
// new field is added once, and the two representations cannot drift —
// the drift this session hand-fixed in three row types, and the reason
// `assertSchemaAcceptsMinimalRows` exists at all.
export const ModelDecl: z<ModelDecl> = z.object({
  id: z.string().pattern(SAFE_ID_RE),
  genre: z.string(),
  label: z.string(),
  description: z.string().default(""),
  engine: z.string().default(""),
  unoffered: z.boolean().required(false),
  form: z.string().default(""),
  defaults: z.dict(z.any()).default({}),
  source: z.union([SourceRow, z.const(null)]).required(false),
  studio: z.union([StudioRow, z.const(null)]).required(false),
  // string = pack name; object = pack + the knob marriage (the
  // ModPackMarriage const above owns the shape and its law).
  mods: z.array(z.union([z.string(), ModPackMarriage])).default([]),
  variants: z.array(VariantRow),
  variant_groups: z.array(VariantGroupRow).default([]),
  provisions: z.array(ProvisionRow).default([]),
  prompt_guide: z.union([z.dict(z.any()), z.const(null)]).required(false),
  base_body: z.string().default(""),
  accepts: z.array(z.string()).default([]),
  timeout_floor: z.number().min(0).required(false),
  canvas_default: z.boolean().required(false),
  lane_inputs: z.dict(z.any()).default({}),
  /** The family's BASE parameter surface (fix shape 1): the params
   *  EVERY lane of this family accepts. Absent = the family
   *  declares no surface (the legacy truth: the card's union table
   *  authors the fields, nothing binds the two). Declaring one
   *  binds the card to it (the claim law: the card may claim
   *  nothing the model did not declare). */
  params: z.array(z.string().pattern(FIELD_NAME_RE)).required(false),
  /** The family-wide relation words (judged on EVERY lane, in
   *  addition to each variant's own). */
  relations: ParamRelationWords.required(false),
  bounds: z.dict(ParamBoundRow).required(false),
  // the interface documents all three as optional (absent ≡ false
  // to every reader), so the schema accepts their absence too
  has_agent: z.boolean().required(false),
  has_inference: z.boolean().required(false),
  has_rubric: z.boolean().required(false),
});

/** The family declaration — the model.unit's data shape.
 *
 *  CONFORMANCE (operator order 2026-09-08 — the z-image verdict):
 *  absent ≡ empty, enforced by the readers (?? [] / ?? "" /
 *  === true — audited, wall-pinned). A declaration writes ONLY
 *  what it means: no `"mods": []`, no `"engine": ""`, no
 *  `: false`, no `{}`. The `as unknown as` cast is banned —
 *  every DECL is `: ModelDecl`, tsc is the conformance gate. */
export interface ModelDecl {
  id: string;
  genre: string;
  label: string;
  description?: string;
  /** Absent = comfyui (every reader ?? ""s). */
  engine?: string;
  /** Present-only-when-true: an unoffered model registers but
   *  serves no surface. The DEFAULT is offered — no key. */
  unoffered?: boolean;
  /** The FORM TAG this family's models route through (the wire
   *  vocabulary: form_generate, form_video_director, …). REQUIRED
   *  for served families — a model without a form cannot resolve
   *  its form-spec and degrades every dropdown at once (the
   *  2026-08-11 catalog contract; restored 2026-09-10 after the
   *  TS-flip emission dropped it and shipped 53 formless rows past
   *  a served diff — only the frontend validator caught it). */
  form?: string;
  defaults?: Record<string, unknown>;
  // The ROW type by name (never an inline copy — the interface's own
  // inline spelling had drifted to `filename?: string | null` while
  // SourceRow says `filename?: string`; the marriage caught it the
  // first time tsc ever ran over this file).
  source?: SourceRow | null;
  studio?: StudioRow | null;
  /** Absent = boards nothing (the z-image shape). String = pack
   *  name; object = pack + the knob marriage declaration (the
   *  zod grammar above owns the shape). */
  mods?: Array<string | { pack: string; marries: Record<string, 'max'> }>;
  variants: VariantRow[];
  variant_groups?: VariantGroupRow[];
  provisions?: ProvisionRow[];
  prompt_guide?: Record<string, unknown> | null;
  base_body?: string;
  accepts?: string[];
  timeout_floor?: number;
  canvas_default?: boolean;
  /** Per-family graph-variance rows (z-image's AuraFlow sampling
   *  shift, qwen-3 encoder — the lane's own input truth). */
  lane_inputs?: Record<string, unknown>;
  /** THE BASE PARAMETER SURFACE (fix shape 1): the params every
   *  lane of this family accepts. Absent = the family declares no
   *  surface (the card's union table stays the field truth; the
   *  claim law binds nothing). Declared, it is the author: the
   *  form's lane filter and the bench door's surface judgment both
   *  read it (family base ∪ variant additions). */
  params?: string[];
  /** The family-wide relation words (judged on every lane). */
  relations?: ParamRelationWords;
  /** The family-wide numeric bounds (per-field replaced by a
   *  variant's own row when it states one, per-endpoint within the
   *  stated field — the RANGE RULE: whoever owns the default owns
   *  the floor, and the floor survives a ceiling-only variant). */
  bounds?: LaneBoundsMap;
  has_agent?: boolean;
  has_inference?: boolean;
  has_rubric?: boolean;
}

/** The catalog's served model row (the engine gate serves — an
 *  unoffered family serves no row at all). */
export interface ModelRow {
  id: string;
  family: string;
  genre: string;
  label: string;
  description: string;
  /** The form tag (wire vocabulary) — REQUIRED non-empty on
   *  every SERVED row (the 2026-08-11 contract; see ModelDecl.form). */
  form: string;
  source: SourceRow;
  defaults: Record<string, unknown>;
  engine: string;
  has_agent?: boolean;
  has_inference?: boolean;
  has_rubric?: boolean;
}

export const ModelRow: z<ModelRow> = z.object({
  id: z.string(),
  family: z.string(),
  genre: z.string(),
  label: z.string().default(""),
  description: z.string().default(""),
  form: z.string(),
  source: SourceRow.default({ type: "" }),
  defaults: z.dict(z.any()).default({}),
  engine: z.string().default(""),
  // the interface documents all three as optional (absent ≡ false
  // to every reader), so the schema accepts their absence too
  has_agent: z.boolean().required(false),
  has_inference: z.boolean().required(false),
  has_rubric: z.boolean().required(false),
});
