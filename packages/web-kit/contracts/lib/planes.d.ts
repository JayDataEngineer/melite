/** The canonical row categories (the group coordinate). 'Quant' is
 *  derived-only — a DECL row never carries it (cells are the quant
 *  plane's only seat); the serving door mints Quant rows from cells.
 *  The empty string is the SOLO category (see SOLO_GROUP). */
export declare const CATEGORIES: {
    readonly variant: "Variant";
    readonly quant: "Quant";
    readonly recipe: "Recipe";
};
export type Category = (typeof CATEGORIES)[keyof typeof CATEGORIES];
/** The solo lane: a family with exactly one addressable variant and
 *  no declared groups rides it on NO axis (census anomaly 2 — anny).
 *  Legal only as the whole variant list (the SOLO LAW below); a
 *  second row in the same family must carry a real category. */
export declare const SOLO_GROUP = "";
/** The quant coordinate's kinds. An ENCODING names compressed weights
 *  the lane actually loads (bf16, int8, int8_convrot); a PLACEHOLDER
 *  occupies the tier coordinate where the family has exactly one
 *  unquantized seat (f32 full precision, native weightless service
 *  families — census anomaly 13); a SIZE names a checkpoint-size tier
 *  (the size-at-quant reshape, 2026-10-26: 0_6b, 1_7b, lightning4 —
 *  a size cell may widen the lane surface its siblings lack). */
export type QuantKind = "encoding" | "placeholder" | "size";
/** @param quant the cell's quant coordinate
 *  @returns the coordinate's canonical kind, or undefined when the
 *  string is no quant this canon knows (a refusal at registration). */
export declare function quantKindOf(quant: string): QuantKind | undefined;
/** The structural DECL subset the canon judges. The engine's ModelDecl
 *  satisfies it (the canon wall pins the assignment); the contracts
 *  floor cannot import the engine's type — this is the boundary's
 *  structural seat, not a second truth. */
export interface PlaneCellRow {
    quant: string;
    label?: string;
    route?: string;
    hide_from_dropdown?: boolean;
    resolver_defaults?: Record<string, unknown>;
}
export interface PlaneVariantRow {
    id: string;
    label: string;
    group: string;
    route?: string;
    cells: PlaneCellRow[];
    resolver_defaults?: Record<string, unknown>;
    wire_defaults?: Record<string, unknown> | null;
}
export interface PlaneGroupRow {
    id: string;
    label: string;
}
export interface PlaneDecl {
    id: string;
    variants: PlaneVariantRow[];
    variant_groups?: PlaneGroupRow[];
}
/** One canon refusal: the family, the row that broke, the law's id,
 *  and the sentence the registration error serves. */
export interface PlaneRefusal {
    family: string;
    row: string;
    law: string;
    refusal: string;
}
/** THE CANON LAWS. Each returns zero or more refusals; registration
 *  refuses on the first non-empty pass (validateDecl, the engine
 *  seat). Every law holds estate-wide on 2026-10-31 except where the
 *  census named the anomaly and the cure landed with the canon.
 *
 *  L1 THE MACRO LAW — a Recipe stamps wire params only: no route
 *     (never addressable), no cells (never a download tier), no
 *     resolver_defaults (never a compose re-point). And the mirror:
 *     a Variant stamps resolver facts only — wire_defaults on a
 *     Variant is a macro masquerading as a lane (census tables c/d:
 *     the split holds on all 30 families).
 *  L2 THE DECLARED-GROUPS LAW — every group a row carries is
 *     declared in variant_groups (census anomaly 3/9: the
 *     used-but-undeclared group). Declaring is the axis contract's
 *     seat (label/tooltip/default ride the declaration).
 *  L3 THE SOLO LAW — the empty group is the one-row family's own
 *     category: legal only when it is the ONLY row and the family
 *     declares no groups (census anomaly 2).
 *  L4 THE CELL LAW — cells ride non-Recipe rows only; every quant is
 *     canon vocabulary (kind known or size pattern — a free string on
 *     the tier coordinate is a vocabulary hole, census table b); a
 *     variant's quant coordinate is unique (two cells of one quant
 *     serve one row twice). */
export declare function planeRefusals(decl: PlaneDecl): PlaneRefusal[];
//# sourceMappingURL=planes.d.ts.map