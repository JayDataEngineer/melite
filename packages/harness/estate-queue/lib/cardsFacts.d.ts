import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import type { LaneRelations, SamplerEnvelope } from "@melite/contracts/laneRelations";
export interface VariantCellRow {
    readonly quant: string;
    readonly route: string;
    readonly hide_from_dropdown?: boolean;
    /** THE CELL SURFACE (the size-at-quant reshape, operator
     *  2026-10-26): this (variant × quant) cell's accepted params in
     *  addition to family ∪ variant. Present only where the DECL
     *  declares it (the absent-equals-empty law). */
    readonly params?: readonly string[];
}
export interface ResolvedVariantRow {
    readonly id: string;
    readonly group: string;
    readonly hide_from_dropdown?: boolean;
    readonly route: string;
    readonly resolver_defaults: Record<string, unknown>;
    /** THE ROUTE ENVELOPE (the compose-side guard): closed bounds a
     *  caller-stated steps/cfg must live inside — the distilled-lane
     *  marriage is declared, never negotiated. */
    /** THE DECLARATION'S OWN SPELLING (the contract audit, 2026-10-10):
     *  the DECL schema declares arrays (`z.array(z.number())`) and the
     *  contract floor mirrors `number[]`; this row alone claimed a
     *  2-tuple, so the same envelope read as two different types on two
     *  seats. The normalizer that produces it reads `unknown` and
     *  yields the pair — the tuple bought nothing. */
    readonly sampler_envelope?: Readonly<Partial<SamplerEnvelope>> | null;
    /** THE LANE SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix shape):
     *  this variant's accepted params IN ADDITION to the family base.
     *  Present only where the DECL declares it. */
    readonly params?: readonly string[];
    /** This lane's relation words (judged in addition to the family's
     *  own). Present only where declared. */
    readonly relations?: LaneRelations;
    /** This lane's numeric bounds (per-field REPLACING the family's
     *  row for the fields it states — the RANGE RULE). Present only
     *  where declared. */
    readonly bounds?: Readonly<Record<string, {
        min?: number;
        max?: number;
    }>>;
    readonly cells: VariantCellRow[];
}
export interface ModelFactsRow {
    readonly card: string;
    readonly defaults: Record<string, unknown>;
    readonly variants: ResolvedVariantRow[];
    /** THE BASE PARAMETER SURFACE (2026-10-10, the fix shape): the
     *  params every lane of this family accepts. Present only where
     *  the DECL declares one — absent ≡ the card's union table
     *  authors the fields (the legacy truth; the lane judge and the
     *  claim law bind nothing). */
    readonly params?: readonly string[];
    /** The family-wide relation words (judged on every lane).
     *  Present only where declared. */
    readonly relations?: LaneRelations;
    /** The family-wide numeric bounds (per-field replaced by a
     *  variant's own row). Present only where declared. */
    readonly bounds?: Readonly<Record<string, {
        min?: number;
        max?: number;
    }>>;
    /** THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
     *  DECL's classed manifest (user / variant / mod), present only
     *  where the family declares one. */
    readonly required_defaults?: readonly {
        readonly name: string;
        readonly class: "user" | "variant" | "mod";
    }[];
    /** The assembly-studio declaration (hand-owned model-facts.json
     *  carries it; the projection unions its writes into admits). */
    readonly studio?: {
        readonly writes?: readonly unknown[];
    };
}
export interface CardDeclRow {
    readonly skeleton: string;
    readonly boarded: readonly string[];
    readonly schemaNames: readonly string[];
    readonly admits: readonly string[];
    readonly spells: readonly string[];
}
/** The window-family lanes a card's boarded families derive — the
 *  vocabulary an agent confuses for a variant (the transcript's
 *  step-8 burn: variant 't4r' read "unknown variant"). Reads the
 *  DECLs' served familyLaw, never a copy; undefined when no boarded
 *  family declares a law (legacy families get the plain voice).
 *
 * @param boarded the card's boarded family ids.
 * @returns the union of their declared lane ids, or undefined. */
export declare function familyLanesOf(boarded: readonly string[] | undefined): readonly string[] | undefined;
export declare function factsPath(): string;
export declare function deriveDecls(defs: Map<string, CardDefinition>, facts: Record<string, ModelFactsRow>): Record<string, CardDeclRow>;
/** THE SHARED ADMISSION PREDICATE (audit J-E2): knobs ∪ absorbed
 *  mod fields ∪ contract admits (a `prefix*` admit row admits every
 *  key under the prefix). ONE surface for the admission seats —
 *  compose's admission gate, start's params-override door, and the
 *  variant stamp gate (audit Y-S2) — or the seats disagree about
 *  what a card admits. Lives on the leaf: every consumer already
 *  imports these row types, no seat-to-seat cycle. */
export declare function cardAdmits(decl: CardDeclRow | undefined, modNames: ReadonlySet<string>, key: string): boolean;
//# sourceMappingURL=cardsFacts.d.ts.map
