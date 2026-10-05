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
import * as contractNs from "./contract.js";
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
    constructor(message) {
        super(message);
        this.name = "ModelError";
    }
}
const SHA256_RE = /^[0-9a-f]{64}$/;
export const SAFE_ID_RE = /^[a-z0-9_-]+$/;
export const SourceRow = z.object({ type: z.string().required(false),
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
export const CellArtifact = z.object({
    source_url: z.string().pattern(/^https?:\/\//),
    size_bytes: z.number().min(1),
    sha256: z.string().pattern(SHA256_RE),
    dest_root: z.string().default("COMFYUI_ROOT"),
    dest_sub: z.string().default(""),
    size_hint_gb: z.number().required(false),
    vram_peak_gb: z.number().required(false),
});
export const CellRow = z.object({
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
export const EngineFacts = z.object({
    unet: z.string().required(false),
    text_encoder: z.string().required(false),
    vae: z.string().required(false),
    clip_type: z.string().required(false),
    clip_vision: z.string().required(false),
    texture_vae: z.string().required(false),
    background_removal: z.string().required(false),
    checkpoint: z.string().required(false),
    latent_node: z.string().required(false),
    sampling_shift: z.number().required(false),
    max_images: z.number().min(1).required(false),
    text_encode_node: z.string().required(false),
    model_path: z.string().required(false),
    family: z.string().required(false),
});
const FIELD_NAME_RE = /^[a-z0-9_]+$/;
export const ParamRequiresRow = z.object({
    field: z.string().pattern(FIELD_NAME_RE),
    needs: z.array(z.string().pattern(FIELD_NAME_RE)).min(1),
    cure: z.string().default(""),
});
export const ParamConflictsRow = z.object({
    a: z.string().pattern(FIELD_NAME_RE),
    b: z.string().pattern(FIELD_NAME_RE),
    cure: z.string().default(""),
});
export const ParamTogetherRow = z.object({
    fields: z.array(z.string().pattern(FIELD_NAME_RE)).min(2),
    cure: z.string().default(""),
});
export const ParamEitherOrRow = z.object({
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
export const ParamAtMostOneRow = z.object({
    // a slot family needs at least two members to be a choice
    fields: z.array(z.string().pattern(FIELD_NAME_RE)).min(2),
    cure: z.string().default(""),
});
export const ParamRequiredRow = z.object({
    fields: z.array(z.string().pattern(FIELD_NAME_RE)).min(1),
    any_of: z.boolean().default(false),
    cure: z.string().default(""),
});
export const ParamRelationWords = z.object({
    requires: z.array(ParamRequiresRow),
    conflicts: z.array(ParamConflictsRow),
    together: z.array(ParamTogetherRow),
    either_or: z.array(ParamEitherOrRow),
    at_most_one: z.array(ParamAtMostOneRow).required(false),
    required: z.array(ParamRequiredRow).required(false),
});
export const ParamBoundRow = z.object({
    min: z.number().required(false),
    max: z.number().required(false),
});
export const VariantRow = z.object({
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
export const VariantGroupRow = z.object({
    id: z.string(),
    label: z.string().default(""),
    tooltip: z.string().default(""),
    default: z.string().default(""),
});
export const ProvisionRow = z.object({
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
export function assertSchemaAcceptsMinimalRows() {
    const minimal = [
        ["SourceRow", SourceRow, {}],
        ["CellArtifact", CellArtifact, { source_url: "https://x/y", size_bytes: 1, sha256: "a".repeat(64) }],
        ["CellRow", CellRow, { quant: "q" }],
        // THE ENGINE FACTS (the complexity floor's stroke 1): minimal
        // is the EMPTY row — a family declares the facts it owns.
        ["EngineFacts", EngineFacts, {}],
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
    ];
    // SELF-ENUMERATION (A-M15): every export of THIS module that is a
    // schemastery object (carries .dict) must sit in the table above —
    // a new exported schema without a minimal row refuses here, by
    // name, instead of escaping the law. The self-import is live
    // namespace binding (ESM), not a copy.
    const exportedSchemas = Object.entries(contractNs)
        .filter(([, v]) => v !== null && typeof v === "function" && typeof v.dict === "object")
        .map(([k]) => k)
        .sort();
    const tabled = minimal.map(([name]) => String(name)).sort();
    const escaped = exportedSchemas.filter((k) => !tabled.includes(k));
    if (escaped.length > 0) {
        throw new Error("contract drift: exported schema(s) " + escaped.join(", ") +
            " carry no minimal-row entry in assertSchemaAcceptsMinimalRows — " +
            "a new exported schema must join the table (the hand-list era ended)");
    }
    for (const [name, schema, row] of minimal) {
        try {
            Schema.resolve(row, schema, {}, true);
        }
        catch (err) {
            throw new Error("contract drift: " + name + " still REQUIRES a key its interface calls optional — " +
                "a hand-written row omitting it compiles and is refused at registration (" +
                (err instanceof Error ? err.message : String(err)) + ")");
        }
    }
}
export const ModPackMarriage = z.object({
    pack: z.string(),
    marries: z.dict(z.const('max')),
});
export const StudioRow = z.object({
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
export const ModelDecl = z.object({
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
    prompt_guide: z.union([z.dict(z.any()), z.const(null)]).required(false),
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
    // the interface documents all three as optional (absent ≡ false
    // to every reader), so the schema accepts their absence too
    has_agent: z.boolean().required(false),
    has_inference: z.boolean().required(false),
    has_rubric: z.boolean().required(false),
});
export const ModelRow = z.object({
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
//# sourceMappingURL=contract.js.map
