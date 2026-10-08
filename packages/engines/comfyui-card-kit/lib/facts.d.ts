import type { GraphBuilder } from './graph.js';
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
/** Assemble the compose contract: frozen slices in, registry truth
 *  derived through the caller's reads, rows out. Same return shape
 *  every reader renders from — the file shrank, the callers boot
 *  the registry and pass their reads. */
export declare function loadFacts(path: string, reads: FactsReads): FactsFile;
export {};
//# sourceMappingURL=facts.d.ts.map
