// model-contract.ts — THE MODEL FAMILY DECL CONTRACT (moved from
// comfyui-cordis/src/models/families/contract.ts, the
// workspace-acyclicity cure): the family DECL shape and its
// schemasty validation schemas are plugin-side vocabulary — model
// packages declare against them, the engine registry consumes
// them. Byte-faithful move; the engine's registry validation
// stays in comfyui-cordis.
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
import type { SamplerEnvelope } from "@melite/contracts/laneRelations";
import * as contractNs from "./model-contract.ts";

/** THE CONTRACT'S SCHEMA INSTANCE (exported so a wall drives THIS
 *  judge, never a second copy: the walls project cannot resolve
 *  schemastery by name, and a test that imported its own instance
 *  would be testing a different judge than the one that registers
 *  rows). The vocabulary and the judge that enforces it are one
 *  owner. */
export { z as SCHEMA };
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

/** ENGINE FACTS (the complexity floor's stroke 1, 2026-09-30): the
 *  typed replacement for the open lane_inputs dict. Every member is
 *  absent-able — a family declares the facts it owns — and every
 *  member the schema does not know REFUSES at registerFamily, family
 *  row and every variant merge. The open dict (`z.dict(z.any())`)
 *  merged typos and junk silently; four keys rode the GAP-7 template
 *  on eighteen families with no reader at all. Excluded by design:
 *  the TTS cards' synth_lane/instruction_control (card-owned, read
 *  at audio/tts/src/card.ts), h3's clip/vae_video/vae_audio
 *  (H3Facts at models/h3/src/actions.ts owns them), and the mask
 *  card's sam2 pin (image/mask/src/card.ts — a tool lane, not a
 *  family declaration). `family` is a plain string, NOT the DECL id:
 *  moss-sfx spells a loader argument there
 *  (`family: "moss_sfx_v2"`). A type ALIAS (never an interface):
 *  aliases carry the implicit index signature, so EngineFacts
 *  assigns to the kit's loose Record readers without a cast —
 *  an interface would force `as unknown` at every seam. */
export type EngineFacts = {
  /** The diffusion model file the family's loader reads. */
  readonly unet?: string;
  /** The text-encoder file (stock CLIPLoader `clip_name`). */
  readonly text_encoder?: string;
  /** The VAE file. */
  readonly vae?: string;
  /** The loader's `type` argument (krea2, lumina2, …). */
  readonly clip_type?: string;
  /** The CLIPVision file (pixal3d, trellis2-native). */
  readonly clip_vision?: string;
  /** The texture VAE file (pixal3d, trellis2-native). */
  readonly texture_vae?: string;
  /** The background-removal model file (pixal3d, trellis2-native). */
  readonly background_removal?: string;
  /** The checkpoint file (yue2's convrot; a full-model load). */
  readonly checkpoint?: string;
  /** The LoRA file a family's DEFAULT bag needs (the gate's loras
   *  slot, 2026-10-11): the distill adapter the birth recipe stamps
   *  on every fresh card. Bare filename — the gate probes the
   *  provision row's own folder (loras/h3) when the stock root
   *  misses. */
  readonly loras?: string;
  /** The latent node class a lane composes (krea-2, z-image,
   *  anima pin the literal; the action's own facts door enforces
   *  the spelling). */
  readonly latent_node?: string;
  /** The sampling-shift parameter for AuraFlow-class models. */
  readonly sampling_shift?: number;
  /** The image ceiling an edit lane accepts per run (≥ 1). */
  readonly max_images?: number;
  /** The text-encode node class (qwen lanes; the action's facts
   *  door pins the literal). */
  readonly text_encode_node?: string;
  /** A pack-specific loader's model file (anny, kimodo, tts). */
  readonly model_path?: string;
  /** A loader argument naming the engine-side family (moss-sfx,
   *  transfer-rig, the fit/skin pair — not the DECL id). */
  readonly family?: string;
}

export const EngineFacts: z<EngineFacts> = z.object({
  unet: z.string().required(false),
  text_encoder: z.string().required(false),
  vae: z.string().required(false),
  clip_type: z.string().required(false),
  clip_vision: z.string().required(false),
  texture_vae: z.string().required(false),
  background_removal: z.string().required(false),
  checkpoint: z.string().required(false),
  loras: z.string().required(false),
  latent_node: z.string().required(false),
  sampling_shift: z.number().required(false),
  max_images: z.number().min(1).required(false),
  text_encode_node: z.string().required(false),
  model_path: z.string().required(false),
  family: z.string().required(false),
});

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
  /** THE CELL'S LANE STAMPS (2026-10-24, the 2.1 matrix reshape): a
   *  variant that spans download tiers (base × int8/bf16) re-keys
   *  the compose lane PER CELL — the cell names the weights file
   *  its tier loads (unet/text_encoder), merged base ← variant ←
   *  cell at the derived route read (getModel), the same intercept
   *  order the variant layer owns. Symmetric with source and
   *  resolver_defaults, which already ride the cell. */
  lane_inputs?: EngineFacts;
  /** THE CELL'S SURFACE ADDITIONS (operator 2026-10-26, the
   *  size-at-quant reshape: "THEN QUANT, THAT IS WHERE YOU CHOSE
   *  1.7 OR .6"): a size cell may take a lane member its sibling
   *  size does not — qwen3-tts customvoice takes style_instruction
   *  on the 1.7B cell only (upstream: the small checkpoint's
   *  generate_custom_voice has no instruct input). Adds to family
   *  ∪ variant (laneSurfaceOf's cell axis); absent ≡ the variant's
   *  own surface holds for every cell of its ladder. Present only
   *  where declared (the absent-equals-empty law). */
  params?: string[];
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
  lane_inputs: EngineFacts.default({}),
  // present-only-where-declared (the absent-equals-empty law):
  // no .default() — an undeclared cell params stays ABSENT.
  params: z.array(z.string()).required(false),
});

export interface DeclVariantRow {
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
  sampler_envelope?: SamplerEnvelope;
  /** The variant's LANE INPUT stamps (the intercept over the
   *  model's base engine facts — e.g. the base checkpoint's
   *  model_path; merged base ← variant at the derived read; the
   *  members are EngineFacts, unknowns refused at registration). */
  lane_inputs?: EngineFacts;
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

// Field names are snake_case, EXCEPT the engine's own morph
// vocabulary (the poser identity space): hyphen-cased node inputs
// pinned by the door pin (poser-identity-space-anny.json), served
// verbatim on the card face and declared verbatim in the DECL —
// a translation layer would be a second truth for the same knob.
const FIELD_NAME_RE = /^[a-z0-9_-]+$/;

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
  // NO `.min(2)` HERE, AND THAT IS DELIBERATE (the schema auditor,
  // 2026-09-28): schemastery does not enforce `.min()` on a NESTED
  // array — a probe shows `groups: []` and `groups: [["a"]]` both
  // resolve with or without the constraint, so writing it claimed a
  // floor the schema never applied. The two-alternative floor is a
  // JUDGED law, enforced where the word is read (laneRelations.ts:
  // an either_or naming fewer than two alternatives refuses with its
  // cure), and pinned there by a wall.
  groups: z.array(z.array(z.string().pattern(FIELD_NAME_RE)).min(1)),
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

export const DeclVariantRow: z<DeclVariantRow> = z.object({
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
  lane_inputs: EngineFacts.default({}),
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
  /** Required (audit T-S3, 2026-10-22): every declared door gates on
   *  the digest — a URL-only row planned but could never land. All
   *  shipped rows already pin one; operator-supplied bytes keep the
   *  external arm's operator-unverified integrity. */
  sha256: string;
  size_bytes?: number;
}

export const ProvisionRow: z<ProvisionRow> = z.object({
  name: z.string(),
  url: z.string(),
  folder: z.string(),
  // the digest is REQUIRED (T-S3): the inspect/acquire doors refuse
  // a digest-less row, so the schema blessing its absence was a
  // plan-but-never-land split. The size stays optional (the census's
  // C3 — a row may be unpinned in bytes, never in identity).
  sha256: z.string().pattern(SHA256_RE).required(),
  size_bytes: z.number().min(0).required(false),
});

// A pinned HF commit SHA (40 lowercase hex).
const REVISION_RE = /^[0-9a-f]{40}$/;

/** One directory-provision row (the audit's fix 8 channel).
 *  A single-file ProvisionRow cannot name a whole HF directory.
 *  This row names one instead: the repo, the pinned revision, and
 *  the file patterns to fetch.
 *  `name` is the tree basename the lane loads.
 *  `folder` is the parent dir under the models root.
 *  `repo_id` is the upstream repo (owner/name).
 *  `revision` is the pinned 40-hex commit (never a branch).
 *  `allow_patterns` names the fetched files (exact paths, or a
 *  `dir/*` prefix for a whole subtree). */
export interface SnapshotProvisionRow {
  name: string;
  folder: string;
  repo_id: string;
  revision: string;
  allow_patterns: string[];
}

export const SnapshotProvisionRow: z<SnapshotProvisionRow> = z.object({
  name: z.string(),
  folder: z.string(),
  repo_id: z.string(),
  revision: z.string().pattern(REVISION_RE),
  allow_patterns: z.array(z.string()).min(1),
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
    // THE ENGINE FACTS (the complexity floor's stroke 1): minimal
    // is the EMPTY row — a family declares the facts it owns.
    ["EngineFacts", EngineFacts, {}],
    ["DeclVariantRow", DeclVariantRow, { id: "v" }],
    ["VariantGroupRow", VariantGroupRow, { id: "g" }],
    // sha256 is REQUIRED (T-S3) — the minimal row pins a digest, the
    // same law the shipped rows live under.
    ["ProvisionRow", ProvisionRow, { name: "n", url: "https://x/y", folder: "models", sha256: "a".repeat(64) }],
    // THE DIRECTORY CHANNEL (the audit's fix 8): the snapshot row
    // carries its own pin (repo + revision + patterns), so the
    // minimal row states all three.
    ["SnapshotProvisionRow", SnapshotProvisionRow, { name: "n", folder: "f", repo_id: "o/m", revision: "a".repeat(40), allow_patterns: ["config.json"] }],
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
    // A-M15 (the wall audit, 2026-09-28): the table was hand-
    // maintained — a NEW exported schema escaped the minimal-row
    // law silently. The relation rows complete the table, and the
    // SELF-ENUMERATION below refuses the next escape by name.
    // length-1 arrays: the schemas demand non-empty lists (a
    // requires row with NO needs, a together row with NO fields,
    // are meaningless) — the minimal MEANINGFUL row states one.
    ["ParamRequiresRow", ParamRequiresRow, { field: "f", needs: ["g"] }],
    ["ParamConflictsRow", ParamConflictsRow, { a: "a", b: "b" }],
    ["ParamTogetherRow", ParamTogetherRow, { fields: ["f", "g"] }], // min(2): together means at least a pair
    ["ParamEitherOrRow", ParamEitherOrRow, { groups: [["f"]] }],
    ["ParamAtMostOneRow", ParamAtMostOneRow, { fields: ["f", "g"] }], // min(2): a slot family needs alternatives
    ["ParamRequiredRow", ParamRequiredRow, { fields: ["f"] }], // min(1): a required row names what it requires
    ["ParamRelationWords", ParamRelationWords, {}],
    ["ParamBoundRow", ParamBoundRow, {}],
    // caught by the self-enumeration the moment it landed (A-M15):
    // StudioRow was exported with no minimal entry — the exact
    // escape the hand-table era allowed.
    ["StudioRow", StudioRow, { tenant: "t" }],
    ["LicenceRow", LicenceRow, { id: "apache-2.0", commercial_use: true }],
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): both
    // keys are REQUIRED — a row without a name or a class is no
    // row (the minimal MEANINGFUL row states the pair).
    ["RequiredDefaultRow", RequiredDefaultRow, { name: "steps", class: "variant" }],
  ];
  // SELF-ENUMERATION (A-M15): every export of THIS module that is a
  // schemastery object (carries .dict) must sit in the table above —
  // a new exported schema without a minimal row refuses here, by
  // name, instead of escaping the law. The self-import is live
  // namespace binding (ESM), not a copy.
  const exportedSchemas = Object.entries(contractNs)
    .filter(([, v]) => v !== null && typeof v === "function" && typeof (v as { dict?: unknown }).dict === "object")
    .map(([k]) => k)
    .sort();
  const tabled = minimal.map(([name]) => String(name)).sort();
  const escaped = exportedSchemas.filter((k) => !tabled.includes(k));
  if (escaped.length > 0) {
    throw new Error(
      "contract drift: exported schema(s) " + escaped.join(", ") +
      " carry no minimal-row entry in assertSchemaAcceptsMinimalRows — " +
      "a new exported schema must join the table (the hand-list era ended)",
    );
  }
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

/** The family's licence as ONE named row (audit 004/C6, 2026-10-22):
 *  the licence id (an SPDX identifier or the vendor licence's own
 *  name) and whether the weights permit commercial use. A family
 *  carrying a non-commercial licence says so HERE, structurally —
 *  a free-text hint is not a licence declaration (the wall judges
 *  every hint that names non-commercial use against this row). */
export interface LicenceRow {
  id: string;
  commercial_use: boolean;
}
export const LicenceRow: z<LicenceRow> = z.object({
  id: z.string(),
  commercial_use: z.boolean(),
});

/** One required-defaults row (operator contract 2026-11-07): the
 *  family declares the defaults its lanes need, classed by WHO
 *  provides them —
 *  - "user": the compose caller provides it (a prompt, a reference
 *    image) — the manifest documents the demand; the census judges
 *    the name against the served card face.
 *  - "variant": the model x variant setup MUST provide it — every
 *    variant row declares the value in its own resolver_defaults;
 *    the family defaults can never substitute (a variant without
 *    the declaration rides the family's numbers invisibly, and a
 *    model switch inherits the PRIOR model's steps — the hazard
 *    the class kills). Refuses at registration.
 *  - "mod": the mod plane provides it as a model-tied override
 *    (drops when models are switched) — the family must board the
 *    mods that carry it. Refuses at registration. */
export interface RequiredDefaultRow {
  name: string;
  class: "user" | "variant" | "mod";
}
export const RequiredDefaultRow: z<RequiredDefaultRow> = z.object({
  name: z.string(),
  class: z.union([z.const("user"), z.const("variant"), z.const("mod")]),
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
  licence: z.union([LicenceRow, z.const(null)]).required(false),
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
  // manifest of what each lane needs, classed user/variant/mod —
  // present only where the family declares one (the absent-equals-
  // empty law); the registration gate (comfyui-cordis validateDecl)
  // enforces the variant/mod classes.
  required_defaults: z.array(RequiredDefaultRow).required(false),
  // string = pack name; object = pack + the knob marriage (the
  // ModPackMarriage const above owns the shape and its law).
  mods: z.array(z.union([z.string(), ModPackMarriage])).default([]),
  variants: z.array(DeclVariantRow),
  variant_groups: z.array(VariantGroupRow).default([]),
  provisions: z.array(ProvisionRow).default([]),
  // THE DIRECTORY CHANNEL (the audit's fix 8): whole HF dirs ride
  // here, never in provisions (a single-file row cannot name a
  // tree, and a tree row cannot name a single file).
  snapshot_provisions: z.array(SnapshotProvisionRow).default([]),
  // THE OPTION-3 CHANNEL (TTS chain audit T3, 2026-10-15): weights
  // trees the operator hand-places — no public per-file URL exists
  // (the merged TTS trees, the MOSS-SoundEffect source tree), so no
  // provisions row can honestly name them. An entry here DECLARES
  // the placement instead of leaving the lane's model_path
  // silently claiming the estate fetches it. Judged by the ghost
  // wall (models-against-cards): every lane model_path leaf must be
  // covered by a provisions name, a variant artifact basename, a
  // source repo id, or an entry here.
  hand_placed_weights: z.array(z.string()).default([]),
  // (004/C5, 2026-10-22: prompt_guide KILLED with its last
  // declarer — four DECLs shipped it, zero surfaces read it, and
  // its `sections` carried shredded Python repr against the wire
  // type's {label, body, code} objects. The D-C7 law: a field
  // needs a read-shaped consumer before it returns.)
  // (D-C7, 2026-09-28: base_body KILLED with its last declarer —
  // one declaration, zero readers, superseded by the parametric
  // neutral bake. The wall pins the kill: a reintroduction with no
  // read-shaped consumer fails models-against-cards.)
  accepts: z.array(z.string()).default([]),
  timeout_floor: z.number().min(0).required(false),
  canvas_default: z.boolean().required(false),
  lane_inputs: EngineFacts.default({}),
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
  // THE FAMILY DOOR'S DECLARED ACTIONS (the atom vocabulary, stroke
  // 0): executable doors on a data row — the schema twin is
  // deliberately LOOSE (z.any members): a strict row schema would
  // strip facts/build on the resolved copy. The interface's
  // DeclaredAction erasure owns the shape.
  actions: z.array(z.any()).required(false),
  // THE DECLARED HOME (the lane-presence cure): slot → store
  // folder for the declaration-only lane slots. The schema row is
  // deliberately shape-loose (dict of strings); validateDecl owns
  // the folder grammar and the lane_inputs key marriage at
  // registration — the axes the wire cannot spell.
  lane_homes: z.dict(z.string()).required(false),
  // the interface documents all three as optional (absent ≡ false
  // to every reader), so the schema accepts their absence too
  has_agent: z.boolean().required(false),
  has_inference: z.boolean().required(false),
  has_rubric: z.boolean().required(false),
});

/** A declared action, ERASED for the DECL seam (the atom
 *  vocabulary, stroke 0): the DECL carries the doors; the registry
 *  validates them at registration; the card's static import keeps
 *  the concrete spec typing at compose. Structural — this accepts
 *  every engine's concrete ActionSpec with no cast. */
export interface DeclaredAction {
  readonly id: string;
  readonly inputs: ReadonlyArray<{ readonly name: string; readonly kind: string }>;
  readonly outputs: ReadonlyArray<{ readonly name: string; readonly kind: string }>;
  readonly params: ReadonlyArray<{
    readonly name: string;
    // "image" = the SCALAR media seat (the NO-DROP law's write
    // half, CONTRACTS §4 debt 16): a media path at the wire, the
    // form's picker + upload face — never freehand text.
    readonly type: "number" | "string" | "boolean" | "enum" | "image" | "image_list";
    readonly bounds?: readonly [number, number];
    readonly options?: readonly string[];
    readonly rule?: string;
  }>;
  /** Present-only-when-true: the action's facts door reads
   *  NOTHING off a lane (weightless or estimator-class), so a flow
   *  row may name it — the flow plane composes against the
   *  model-less facts shape. Absent = lane-bound: only a card's
   *  resolved model row may dispatch it (a flow naming it refuses
   *  at compose, before any node builds). */
  readonly laneIndependent?: boolean;
  readonly facts: (raw: Record<string, unknown>) => unknown;
  readonly build: (...args: never[]) => unknown;
}

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
  /** The family's licence row — absent = the family declares no
   *  licence fact (the operator owns that decision). */
  licence?: LicenceRow | null;
  /** THE REQUIRED DEFAULTS (operator contract 2026-11-07): what each
   *  lane needs, classed by who provides it — user / variant / mod
   *  (RequiredDefaultRow owns the classes). Absent = the family
   *  requires nothing beyond its declared face. */
  required_defaults?: RequiredDefaultRow[];
  /** Absent = boards nothing (the z-image shape). String = pack
   *  name; object = pack + the knob marriage declaration (the
   *  zod grammar above owns the shape). */
  mods?: Array<string | { pack: string; marries: Record<string, 'max'> }>;
  variants: DeclVariantRow[];
  variant_groups?: VariantGroupRow[];
  provisions?: ProvisionRow[];
  /** Whole HF dirs this family fetches as snapshots.
   *  Absent = the family fetches no directory (the single-file
   *  default: every provision names one file). */
  snapshot_provisions?: SnapshotProvisionRow[];
  /** Weights trees the operator hand-places — no public per-file
   *  URL exists (merged TTS trees, the MOSS-SoundEffect source
   *  tree), so no provisions row can honestly name them; declaring
   *  the placement stops the lanes silently claiming the estate
   *  fetches them. Judged by the ghost wall's model_path arm. */
  hand_placed_weights?: string[];
  accepts?: string[];
  timeout_floor?: number;
  canvas_default?: boolean;
  /** Per-family graph-variance rows (z-image's AuraFlow sampling
   *  shift, qwen-3 encoder — the lane's own input truth; the
   *  members are EngineFacts, unknowns refused at registration). */
  lane_inputs?: EngineFacts;
  /** THE BASE PARAMETER SURFACE (fix shape 1): the params every
   *  lane of this family accepts. Absent = the family declares no
   *  surface (the card's union table stays the field truth; the
   *  claim law binds nothing). Declared, it is the author: the
   *  form's lane filter and the bench door's surface judgment both
   *  read it (family base ∪ variant additions). */
  params?: string[];
  /** The family-wide relation words (judged on every lane). */
  relations?: ParamRelationWords;
  /** The family's declared graph actions (the atom vocabulary):
   *  the atom's own segment doors, validated at registration (the
   *  facts parse runs over the family row and every variant merge
   *  at registerFamily — drift refuses at boot, never at first
   *  compose). The card's static import keeps the CONCRETE
   *  ComfyActionSpec typing at the compose seam; this erasure
   *  accepts every concrete spec with no cast (facts takes
   *  Record<string, unknown> — LaneInputsFacts verbatim; build's
   *  never[] params are the bottom type, assignable from any
   *  build signature under strict contravariance). */
  actions?: Array<DeclaredAction>;
  /** The store home a declaration-only lane file lives in (the
   *  lane-presence gate's probe folder): slot → folder under the
   *  ComfyUI models root, spelled as an extra_model_folders KEY
   *  (the endpoint's mapping resolves it — "audiocpp" → audio/…)
   *  or as a plain subfolder when no key exists ("avatar/kimodo").
   *  Only slots the stock LANE_FOLDERS map does not already own —
   *  model_path, texture_vae — carry a row; a file whose loader is
   *  pack-specific has no estate-wide folder name, and the DECL is
   *  the only place that truth can live. */
  lane_homes?: Record<string, string>;
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
