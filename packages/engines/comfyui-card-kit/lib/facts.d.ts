import type { GraphBuilder } from './graph.ts';
import type { DeclVariantRow, RequiredDefaultRow } from './model-contract.ts';
/** The registry reads derivation renders through — injected, never
 *  imported (this module is evaluation-cycle-clean: models.ts runs
 *  its top-level boot, so any static edge back into it deadlocks
 *  the boot that awaits this module. Callers pass their own reads:
 *  walls/CLI/doors pass the booted registry, the models bridge
 *  passes its service-bound closures). */
export interface FactsReads {
    getModel(id: string): unknown;
    registryIds(): string[];
    registryModel(id: string): unknown;
}
/** Lane rows are per-lane shaped (an image lane's unet/vae/clip, a 3D
 *  lane's rig fields...) — the card that owns the lane knows its
 *  fields; the row carries whatever the model row declared. */
export type LaneInputsFacts = Record<string, unknown>;
/** An action binding's build signature (DRY sweep C8, 2026-10-18 —
 * was byte-identical in five card files): params doc, resolved model
 * facts, the graph builder, the run id. */
export type ActionBinding = (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void;
/** The lane facts' ONE typed string reader (the attainment audit's
 *  F7, 2026-10-12): lane_inputs is Record<string, unknown> by
 *  declaration, and the region law at lanes-image.ts reads
 *  text_encode_node through an unchecked unknown. Absent, non-string,
 *  or empty read as undefined — a REFUSAL-grade absence, never a
 *  silent default.
 * @param raw the resolved lane_inputs (family + variant)
 * @param key the facts key to read
 * @returns the non-empty string at key, or undefined */
export declare function laneStringOf(raw: LaneInputsFacts, key: string): string | undefined;
/** The facts door's ONE string extractor (the attainment audit's
 *  F4: ten hand copies across eight families, already diverged
 *  into three shapes — two of them casting the very values their
 *  own loop had just proved). The label names the refusing door
 *  (family + action) so the message stays the caller's own; the
 *  wording is pinned by the families' refusal assertions.
 * @param raw the resolved lane_inputs (family ⊕ variant)
 * @param key the facts key the door requires
 * @param label the refusing door's name (family + action), message-prefixed
 * @returns the non-empty string at key
 * @throws Error when the key is absent, not a string, or empty */
export declare function requireText(raw: LaneInputsFacts, key: string, label: string): string;
/** The DECL's declared lane keys: the family base ∪ every variant's
 *  own lane_inputs — the same union the registration lane-homes wall
 *  judges (comfyui-cordis service.ts slots derivation) — derived here
 *  off the FACTS ROW (the row carries both the family lane_inputs and
 *  each variant's own), so a reader needs no registry read.
 * @param model the resolved facts row (its lane_inputs and variants)
 * @returns the declared key set, base ∪ variants, read-only */
export declare function declaredLaneKeys(model: Pick<ModelFacts, 'lane_inputs' | 'variants'>): ReadonlySet<string>;
/** The typed lane-facts reader (stroke 1's reader half): lane_inputs
 *  stays Record<string, unknown> on the wire (plain-JSON snapshots),
 *  but every read goes through a seat that knows the DECL's declared
 *  key set — a key the DECL never declared refuses loud (a drifted
 *  spelling reads as what it is, never a silent undefined). */
export interface LaneInputsReader {
    /** Read a declared lane key.
     *  @param key the facts key to read
     *  @returns the value at key (undefined when declared but absent)
     *  @throws Error when key is outside the DECL's declared set */
    get(key: string): unknown;
    /** The laneStringOf law over declared keys: non-empty string at key or undefined.
     *  @param key the facts key to read
     *  @returns the non-empty string at key, or undefined
     *  @throws Error when key is outside the DECL's declared set */
    stringOf(key: string): string | undefined;
    /** The requireText law over declared keys: non-empty string or the pinned refusal.
     *  @param key the facts key to read
     *  @param label the refusing door's name (family + action), message-prefixed
     *  @returns the non-empty string at key
     *  @throws Error when key is outside the DECL's declared set (this
     *   refusal fires first), or the value at key is absent, not a
     *   string, or empty */
    requireText(key: string, label: string): string;
}
/** Build the typed lane-facts reader over one resolved row. The
 *  declared set derives ONCE off the model row; every read then
 *  judges against it. The refusals fire on read, never at build.
 *  @param model the resolved facts row — its lane_inputs ∪ every
 *   variant's own IS the declared key set
 *  @param raw the resolved lane_inputs (family ⊕ variant) the reads serve
 *  @param label the refusing door's name (family + action), message-prefixed
 *  @returns the reader over raw */
export declare function laneInputsReader(model: Pick<ModelFacts, 'lane_inputs' | 'variants'>, raw: LaneInputsFacts, label: string): LaneInputsReader;
/** THE STATED-PRESET TEST (qa8 F31 — the exclusivity rest): the
 *  engine service's defaults merge (comfyui-cordis service.compose)
 *  fills the lane's `defaults.voice` into every doc before the tts
 *  judges run — the fill is the lane's REST, and it must not count
 *  as a stated preset in the one-voice exclusivity checks (the
 *  burn: a caller who never stated `voice` was refused with
 *  "params 'voice' and 'qvoice' fire together"). The preset is
 *  stated when the doc names a speaker AND that name differs from
 *  the lane's own default; an explicit pick OF the default preset
 *  is indistinguishable from the compile's own write and rides (the
 *  derived-stamp release trade). One implementation, all three tts
 *  judge seats — the card's save path, the card's preset+qvoice
 *  gate, and the family's speak action.
 * @param doc the gated doc (post-merge at the service door)
 * @param model the resolved facts row (its defaults ARE the rest)
 * @returns true when `voice` names a speaker the lane did not fill */
export declare function voicePresetStated(doc: Record<string, unknown>, model: Pick<ModelFacts, 'defaults'>): boolean;
/** The diffusion-lane facts core every t2i/edit door parses (the J2/J3
 *  consolidation, 2026-10-18): the four model slots every family's
 *  loaders read, the gated node literal the action builds on, and the
 *  optional sampling_shift. Families keep their own typed T2IFacts/
 *  EditFacts (the self-containment contract, B4) and project this
 *  return into them — the checks and refusal prose live HERE, once. */
export interface DiffusionLaneFacts<Node extends string = string> {
    unet: string;
    text_encoder: string;
    vae: string;
    clip_type: string;
    /** The gated node literal (reader.get(gate.key) after the whitelist
     *  check) — generic so a family whose facts pin the literal type
     *  projects without a cast. */
    node: Node;
    sampling_shift?: number;
}
/** Parse the diffusion-lane core: the four requireText model slots, the
 *  node-literal whitelist gate, and the optional sampling_shift number
 *  check. The refusal prose is the families' pinned form (the specs
 *  assert the family-tagged prefix + these tails). Every read rides
 *  the typed lane reader — a key the DECL never declared refuses with
 *  the reader's own refusal, before any slot prose.
 * @param reader the typed lane reader (the DECL's declared key set +
 *  the resolved row it serves)
 * @param label the refusing door's name (family + action), message-prefixed
 * @param gate the facts key holding the node literal + the one allowed value
 * @param shift false to skip the sampling_shift check (edit doors carry none)
 * @returns the core facts; families project into their own typed shape
 * @throws Error when a key is outside the DECL's declared set, a model
 *  slot is missing, the node literal is not the whitelisted value, or
 *  sampling_shift is present but not a number */
export declare function parseDiffusionLaneFacts<Node extends string>(reader: LaneInputsReader, label: string, gate: {
    key: 'latent_node' | 'text_encode_node';
    node: Node;
}, shift?: boolean): DiffusionLaneFacts<Node>;
/** The edit door's max_images floor: a finite number ≥ 1, floored.
 *  The read rides the typed lane reader — an undeclared max_images
 *  refuses with the reader's own refusal, before the floor prose.
 *  @param reader the typed lane reader (the DECL's declared key set +
 *   the resolved row it serves)
 *  @param label the refusing door's name (family + action), message-prefixed
 *  @returns Math.floor of the cap at max_images
 *  @throws Error when the key is outside the DECL's declared set, or
 *   max_images is absent, non-finite, or < 1 */
export declare function parseEditCap(reader: LaneInputsReader, label: string): number;
import type { LaneRelations, SamplerEnvelope } from '@melite/contracts/laneRelations';
/** THE RELATION WORDS, wire twin — DERIVED, NOT SPELLED (2026-10-10,
 *  the four-agent contract audit's top finding: this interface was a
 *  hand-copy of four of the six words — `at_most_one` and `required`
 *  were simply absent, so every facts reader was typed against a
 *  grammar that could not name half the laws the DECLs declare (the
 *  tts required-word rows included). The runtime clone always carried
 *  them; the TYPE lied, which is the same drift class as the drift
 *  gate, and it is now unrepresentable: the mirror is derived from
 *  the floor, and the contract's own type test below fails to compile
 *  the moment a seventh word lands here without landing there.
 *
 *  The judged shape is readonly; a facts row is a plain-JSON snapshot
 *  built by JSON clone, so the mirror is its mutable counterpart. */
type Mutable<T> = {
    -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? Mutable<U>[] : Mutable<T[K]>;
};
export type LaneRelationsFacts = Mutable<LaneRelations>;
export type FactsMirrorCoversEveryWord = [keyof LaneRelationsFacts] extends [keyof LaneRelations] ? true : never;
export interface ModelFacts {
    id: string;
    card: string;
    /** The OWNING family id (the addressOwners derivation): a route
     *  address ('krea-2-raw', 'qwen-img-21-bf16') names its ladder
     *  owner here — derived rows always carry it; absent on hand
     *  literals ≡ the row id (identity, never a refusal — the
     *  FactsFile.owners law). Compose seats that key by family (the
     *  card's ACTION_BINDINGS) read THIS field, never id: a route id
     *  keys nothing and the row would silently ride the fallback. */
    family?: string;
    defaults: Record<string, string | number | boolean | null>;
    lane_inputs: LaneInputsFacts;
    /** THE BASE PARAMETER SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix
     * shape): the params every lane of this family accepts. Present
     * only where the DECL declares one (absent ≡ the card's union
     * table authors the fields — the legacy truth, nothing binds). */
    params?: string[];
    /** The family-wide relation words (judged on every lane).
     * Present only where declared. */
    relations?: LaneRelationsFacts;
    /** The family-wide numeric bounds (per-field replaced by a
     * variant's own row — the RANGE RULE: whoever owns the default
     * owns the floor). Present only where declared. */
    bounds?: Record<string, {
        min?: number;
        max?: number;
    }>;
    /** THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
     * DECL's classed manifest (user / variant / mod), present only
     * where the family declares one. */
    required_defaults?: RequiredDefaultRow[];
    /** Compose splice SSOT rows (card field → NodeClass.idx.input). */
    /** Variant matrix rows + per-cell weight coordinates. */
    variants: ModelVariantFacts[];
    /** UI selector groups (Recipe group is grammar-owned). */
    variant_groups: VariantGroupFacts[];
    /** Owning card's output contract copy (compose delivery gate). */
    outputs: OutputFacts[];
    /** Ingested media kinds — present only where the Model declares. */
    accepts?: string[];
    /** Families-section studio claim — present only where declared. */
    studio?: StudioFacts | null;
    /** Owning card's per-family extension gates — present only where
     *  the card declares requires_by_family. */
    requires_by_family?: Record<string, string[]>;
    /** The atom's mutation boarding (≡ the model's DECL.mods, pinned
     *  by the flows wall) — the CONSUMPTION GATE reads this: a pack
     *  mutation fires only where the boarding names it. Absent = no
     *  mutations boarded. */
    mods?: string[];
}
/** One (variant × quant) matrix cell: tier, route, artifact
 *  basename ("" when the cell ships no download place), VRAM peak. */
export interface VariantCellFacts {
    quant: string;
    label: string;
    route: string;
    hide_from_dropdown?: boolean;
    artifact: string;
    vram_peak_gb: number | null;
    /** THE CELL'S RESOLVER DEFAULTS (the one-walk carry, 2026-11-06):
     *  the DECL cell's own resolver overlay — the face the served
     *  Quant row serves as its defaults; absent ≡ {} inside deriveRow
     *  (optional on literal fixtures, the lane_inputs law). The
     *  spec-facts-sync wall judges it sync against the serve. */
    resolver_defaults?: Record<string, unknown>;
    /** THE CELL'S SURFACE ADDITIONS (the size-at-quant reshape,
     *  operator 2026-10-26): adds to family ∪ variant at the lane
     *  resolution (laneSurfaceOf's cell axis) — qwen3-tts customvoice
     *  takes style_instruction on its 1.7B cell only. Present only
     *  where declared (the absent-equals-empty law). */
    params?: string[];
}
/** One variant row: cascade stamps + its quant cells. */
export interface ModelVariantFacts {
    id: string;
    label: string;
    group: string;
    hide_from_dropdown?: boolean;
    route: string;
    resolver_defaults: Record<string, unknown>;
    /** THE VARIANT LANE (2026-09-23, the clone-lane repair): a variant
     *  may re-key the compose lane (qwen3-tts Base: synth_lane clone) —
     *  the service merges this over the family lane_inputs when the
     *  run addresses the variant's route. Absent on old literals = {}
     *  at the reader (never undefined inside deriveRow) — the TYPE
     *  honors the same law: optional on literal fixtures. */
    lane_inputs?: LaneInputsFacts;
    sampler_envelope?: Partial<SamplerEnvelope> | null;
    defaults: Record<string, unknown>;
    /** THE LANE SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix shape):
     *  the params this variant accepts IN ADDITION to the family
     *  base. Present only where the DECL declares it (absent ≡
     *  inherits the family surface verbatim — the cascade law,
     *  add-never-subtract). */
    params?: string[];
    /** This lane's relation words (judged in addition to the family's
     *  own). Present only where declared. */
    relations?: LaneRelationsFacts;
    /** This lane's numeric bounds (per-field REPLACING the family's
     *  row for the fields it states). Present only where declared. */
    bounds?: Record<string, {
        min?: number;
        max?: number;
    }>;
    cells: VariantCellFacts[];
}
/** One UI selector group. */
export interface VariantGroupFacts {
    id: string;
    label: string;
    tooltip: string;
    default: string;
}
/** One output-contract row (OutputRow patterns/label/many). */
export interface OutputFacts {
    patterns: string[];
    label: string;
    many: boolean;
}
/** The families-section studio claim (Studio row). */
export interface StudioFacts {
    tenant: string;
    owns_params: boolean;
    writes: string[];
    kind: string;
    size: string;
    layout: string;
}
/** The extension node map (EXTENSION LAW gate data): pack name →
 *  node class types it provides. */
export interface FactsFile {
    models: Record<string, ModelFacts>;
    extension_node_types: Record<string, string[]>;
    /** Route → ladder-owner family (the addressOwners derivation,
     *  emitted so the compose door resolves variant routes without a
     *  registry read: 'qwen3-tts-base' → 'qwen3-tts'. Family ids map
     *  to themselves; absent on old literals = identity (the reader
     *  defaults, never refuses) — the TYPE honors the same law:
     *  optional, so an inline fixture (the image-gen krea-2 stub)
     *  omits it without a cast-through-unknown. */
    owners?: Record<string, string>;
}
/** THE VARIANT MATRIX — ONE WALK OF THE DECL (the axis-unification
 *  cure, 2026-11-06 — the audit's "one serializer"): the family's
 *  variant/quant facts, walked once, carried verbatim (every DECL
 *  member the matrix's two projections need, nothing derived away).
 *  deriveRow projects it NESTED into the door's ModelFacts row;
 *  discovery's specVariants projects it FLAT into the served
 *  form-spec. Before this walk, the two seats each walked the DECL
 *  with their own copy and drifted — the served spec starved anima's
 *  cells while the facts row carried them, and the mirror refused
 *  with a voice that blamed the DECL. A cell dropped here drops from
 *  every view; the spec-facts-sync wall's DECL arm and the switching
 *  sweep's completeness arm are the toggles that prove it. */
export interface MatrixCell {
    quant: string;
    label: string;
    hide_from_dropdown?: boolean;
    route: string;
    /** Absent = the atom's engine (the DECL's own spelling). */
    engine?: string;
    vram_peak_gb: number | null;
    resolver_defaults?: Record<string, unknown>;
    /** The download place's basename ("" when the cell ships no
     *  artifact) — artifactBasename of the DECL cell. */
    artifact: string;
    params?: string[];
}
export interface MatrixVariant {
    id: string;
    label: string;
    group: string;
    hide_from_dropdown?: boolean;
    route: string;
    hint?: string;
    engine?: string;
    resolver_defaults: Record<string, unknown>;
    wire_defaults?: Record<string, unknown> | null;
    lane_inputs: LaneInputsFacts;
    sampler_envelope?: SamplerEnvelope | null;
    params?: string[];
    relations?: LaneRelationsFacts | null;
    bounds?: Record<string, {
        min?: number;
        max?: number;
    }> | null;
    cells: MatrixCell[];
}
/** The matrix walk: every DECL variant row (hidden rows ride — their
 *  flag is data the projections judge), cells verbatim, lane inputs
 *  defaulted to {}, relations/bounds deep-cloned out of the registry's
 *  live DECL objects (the rows are frozen snapshots — plain-JSON
 *  shapes only). */
export declare function deriveVariants(decl: {
    variants?: DeclVariantRow[];
}): MatrixVariant[];
/** Assemble the compose contract: frozen slices in, registry truth
 *  derived through the caller's reads, rows out. Same return shape
 *  every reader renders from — the file shrank, the callers boot
 *  the registry and pass their reads. */
export declare function loadFacts(path: string, reads: FactsReads): FactsFile;
export {};
//# sourceMappingURL=facts.d.ts.map