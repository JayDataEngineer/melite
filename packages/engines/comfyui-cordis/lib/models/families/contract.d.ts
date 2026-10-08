import z from "@deepseek-ai/schemastery";
import type { SamplerEnvelope } from "@melite/contracts/laneRelations";
/** THE CONTRACT'S SCHEMA INSTANCE (exported so a wall drives THIS
 *  judge, never a second copy: the walls project cannot resolve
 *  schemastery by name, and a test that imported its own instance
 *  would be testing a different judge than the one that registers
 *  rows). The vocabulary and the judge that enforces it are one
 *  owner. */
export { z as SCHEMA };
/** Loud refusal before the wire (the QUEUE LANE LAW shape). */
export declare class ModelError extends Error {
    constructor(message: string);
}
export declare const SAFE_ID_RE: RegExp;
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
export declare const SourceRow: z<SourceRow>;
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
export declare const CellArtifact: z<CellArtifact>;
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
export declare const CellRow: z<CellRow>;
/** ENGINE FACTS (the complexity floor's stroke 1, 2026-09-30): the
 * typed replacement for the open lane_inputs dict. Every member is
 * absent-able — a family declares the facts it owns — and every
 * member the schema does not know REFUSES at registerFamily, family
 * row and every variant merge. The open dict (`z.dict(z.any())`)
 * merged typos and junk silently; four keys rode the GAP-7 template
 * on eighteen families with no reader at all. Excluded by design:
 * the TTS cards' synth_lane/instruction_control (card-owned, read
 * at audio/tts/src/card.ts), h3's clip/vae_video/vae_audio
 * (H3Facts at models/h3/src/actions.ts owns them), and the mask
 * card's sam2 pin (image/mask/src/card.ts — a tool lane, not a
 * family declaration). `family` is a plain string, NOT the DECL id:
 * moss-sfx spells a loader argument there
 * (`family: "moss_sfx_v2"`). A type ALIAS (never an interface):
 * aliases carry the implicit index signature, so EngineFacts
 * assigns to the kit's loose Record readers without a cast —
 * an interface would force `as unknown` at every seam. */
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
    /** The latent node class a lane composes (krea-2, z-image,
     * anima pin the literal; the action's own facts door enforces
     * the spelling). */
    readonly latent_node?: string;
    /** The sampling-shift parameter for AuraFlow-class models. */
    readonly sampling_shift?: number;
    /** The image ceiling an edit lane accepts per run (≥ 1). */
    readonly max_images?: number;
    /** The text-encode node class (qwen lanes; the action's facts
     * door pins the literal). */
    readonly text_encode_node?: string;
    /** A pack-specific loader's model file (anny, kimodo, tts). */
    readonly model_path?: string;
    /** A loader argument naming the engine-side family (moss-sfx,
     * transfer_rig, the fit/skin pair — not the DECL id). */
    readonly family?: string;
};
export declare const EngineFacts: z<EngineFacts>;
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
export declare const ParamRequiresRow: z<ParamRequiresRow>;
export declare const ParamConflictsRow: z<ParamConflictsRow>;
export declare const ParamTogetherRow: z<ParamTogetherRow>;
export declare const ParamEitherOrRow: z<ParamEitherOrRow>;
export declare const ParamAtMostOneRow: z<ParamAtMostOneRow>;
export declare const ParamRequiredRow: z<ParamRequiredRow>;
export declare const ParamRelationWords: z<ParamRelationWords>;
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
export declare const ParamBoundRow: z<ParamBoundRow>;
export declare const DeclVariantRow: z<DeclVariantRow>;
export interface VariantGroupRow {
    id: string;
    label: string;
    tooltip?: string;
    default?: string;
}
export declare const VariantGroupRow: z<VariantGroupRow>;
export interface ProvisionRow {
    name: string;
    url: string;
    folder: string;
    sha256?: string;
    size_bytes?: number;
}
export declare const ProvisionRow: z<ProvisionRow>;
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
export declare const SnapshotProvisionRow: z<SnapshotProvisionRow>;
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
export declare function assertSchemaAcceptsMinimalRows(): void;
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
export declare const ModPackMarriage: z<ModPackMarriage>;
export interface StudioRow {
    tenant: string;
    owns_params?: boolean;
    writes?: string[];
    size?: string;
    layout?: string;
    kind?: string;
}
export declare const StudioRow: z<StudioRow>;
export declare const ModelDecl: z<ModelDecl>;
/** A declared action, ERASED for the DECL seam (the atom
 *  vocabulary, stroke 0): the DECL carries the doors; the registry
 *  validates them at registration; the card's static import keeps
 *  the concrete spec typing at compose. Structural — this accepts
 *  every engine's concrete ActionSpec with no cast. */
export interface DeclaredAction {
    readonly id: string;
    readonly inputs: ReadonlyArray<{
        readonly name: string;
        readonly kind: string;
    }>;
    readonly outputs: ReadonlyArray<{
        readonly name: string;
        readonly kind: string;
    }>;
    readonly params: ReadonlyArray<{
        readonly name: string;
        readonly type: "number" | "string" | "boolean" | "enum" | "image_list";
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
    source?: SourceRow | null;
    studio?: StudioRow | null;
    /** Absent = boards nothing (the z-image shape). String = pack
     *  name; object = pack + the knob marriage declaration (the
     *  zod grammar above owns the shape). */
    mods?: Array<string | {
        pack: string;
        marries: Record<string, 'max'>;
    }>;
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
    prompt_guide?: Record<string, unknown> | null;
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
export declare const ModelRow: z<ModelRow>;
//# sourceMappingURL=contract.d.ts.map
