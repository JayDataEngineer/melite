// planes.ts — THE FOUR-PLANE CANON (2026-10-31, operator order:
// "dig into the model, variant, quant, and recipe, to make a canon
// source of truth and categories, then apply it to the cards").
//
// One vocabulary for the four planes every family DECL spells, judged
// at registration (the engine's validateDecl calls planeRefusals) and
// consumed by every seat that today hand-copies the group literals
// (the form's axis law, the harness serving door). The evidence base
// is the 2026-10-31 plane census (dev_docs/audits/contracts/
// 2026-10-31-plane-census.md): 30 families, 130 rows, 75 cells, 18
// ranked anomalies — every law below cites the anomaly it cures or
// the table that proves it already holds.
//
// THE PLANES:
//   MODEL   — the family (one checkpoint identity, one owner id).
//   VARIANT — a route lane: group 'Variant', addressable (route of
//             its own or route-bearing cells), stamps ride
//             resolver_defaults (the compose re-point plane).
//   QUANT   — a cell rung: lives in cells[], never a standalone row;
//             the serving derives group 'Quant' from the cell fact.
//             The quant coordinate is a WEIGHTS-TIER vocabulary
//             (encoding, placeholder, or size) — never a free string.
//   RECIPE  — a stamp macro: group 'Recipe', patch-only, stamps ride
//             wire_defaults, NEVER addressable (no route, no cells —
//             census anomaly 1, the h3 routed recipe, cured 2026-10-31).
//
// This module is the zero-dep floor's seat: the engine imports it at
// registration (WIRED 2026-11-02 — validateDecl calls planeRefusals
// and refuses on the first non-empty pass; the src-orphan-law wall
// refused the canon shipping with no importer). The export map row
// ./planes is the entry seat; the engine's models service is the
// live consumer. No seat re-spells the vocabulary.
/** The canonical row categories (the group coordinate). 'Quant' is
 *  derived-only — a DECL row never carries it (cells are the quant
 *  plane's only seat); the serving door mints Quant rows from cells.
 *  The empty string is the SOLO category (see SOLO_GROUP). */
export const CATEGORIES = {
    variant: "Variant",
    quant: "Quant",
    recipe: "Recipe",
};
/** The solo lane: a family with exactly one addressable variant and
 *  no declared groups rides it on NO axis (census anomaly 2 — anny).
 *  Legal only as the whole variant list (the SOLO LAW below); a
 *  second row in the same family must carry a real category. */
export const SOLO_GROUP = "";
const NAMED_QUANTS = {
    bf16: "encoding",
    int8: "encoding",
    int8_convrot: "encoding",
    fp8: "encoding",
    f32: "placeholder",
    native: "placeholder",
    lightning4: "size",
};
/** The size-tier pattern: digit_digit-b (`0_6b`, `1_7b`, `2_3b`…).
 *  Named sizes above stay in NAMED_QUANTS so their kind is explicit. */
const SIZE_QUANT_RE = /^\d+_\d+b$/;
/** @param quant the cell's quant coordinate
 *  @returns the coordinate's canonical kind, or undefined when the
 *  string is no quant this canon knows (a refusal at registration). */
export function quantKindOf(quant) {
    const named = NAMED_QUANTS[quant];
    if (named !== undefined)
        return named;
    return SIZE_QUANT_RE.test(quant) ? "size" : undefined;
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
export function planeRefusals(decl) {
    const out = [];
    const declared = new Set((decl.variant_groups ?? []).map((g) => g.id));
    const soloRows = decl.variants.filter((v) => v.group === SOLO_GROUP);
    for (const v of decl.variants) {
        const isRecipe = v.group === CATEGORIES.recipe;
        const isVariant = v.group === CATEGORIES.variant;
        if (isRecipe) {
            if (v.route) {
                out.push({
                    family: decl.id,
                    row: v.id,
                    law: "L1",
                    refusal: `${decl.id}/${v.id}: a Recipe row is a stamp macro — it carries no route ('${v.route}' addresses a lane; addressability belongs to the Variant plane)`,
                });
            }
            if (v.cells.length > 0) {
                out.push({
                    family: decl.id,
                    row: v.id,
                    law: "L1",
                    refusal: `${decl.id}/${v.id}: a Recipe row is a stamp macro — it carries no cells (download tiers belong to the Variant plane's matrix)`,
                });
            }
            if (v.resolver_defaults && Object.keys(v.resolver_defaults).length > 0) {
                out.push({
                    family: decl.id,
                    row: v.id,
                    law: "L1",
                    refusal: `${decl.id}/${v.id}: a Recipe row stamps wire params only — resolver_defaults (the compose re-point plane) belongs to the Variant plane`,
                });
            }
        }
        if (isVariant && v.wire_defaults != null && Object.keys(v.wire_defaults).length > 0) {
            out.push({
                family: decl.id,
                row: v.id,
                law: "L1",
                refusal: `${decl.id}/${v.id}: a Variant row stamps resolver facts only — wire_defaults (the macro plane) belongs to the Recipe plane`,
            });
        }
        if (v.group !== SOLO_GROUP && !declared.has(v.group)) {
            out.push({
                family: decl.id,
                row: v.id,
                law: "L2",
                refusal: `${decl.id}/${v.id}: group '${v.group}' is undeclared — every category a row carries is declared in variant_groups (the axis contract's seat)`,
            });
        }
        if (v.group !== CATEGORIES.variant && v.group !== CATEGORIES.recipe && v.group !== SOLO_GROUP) {
            out.push({
                family: decl.id,
                row: v.id,
                law: "L2",
                refusal: `${decl.id}/${v.id}: group '${v.group}' is no canon category — the row planes are Variant, Recipe, or the solo '' (CATEGORIES)`,
            });
        }
        const quants = new Set();
        for (const c of v.cells) {
            if (isRecipe)
                continue; // L1 already refused the cells wholesale
            if (quantKindOf(c.quant) === undefined) {
                out.push({
                    family: decl.id,
                    row: v.id,
                    law: "L4",
                    refusal: `${decl.id}/${v.id}/${c.quant}: no canon quant — the tier coordinate is vocabulary (encoding, placeholder, or size pattern), never a free string`,
                });
            }
            if (quants.has(c.quant)) {
                out.push({
                    family: decl.id,
                    row: v.id,
                    law: "L4",
                    refusal: `${decl.id}/${v.id}: quant '${c.quant}' twice — one variant, one tier, one cell`,
                });
            }
            quants.add(c.quant);
        }
    }
    if (soloRows.length > 0) {
        if (decl.variants.length !== 1 || (decl.variant_groups ?? []).length > 0) {
            out.push({
                family: decl.id,
                row: soloRows[0].id,
                law: "L3",
                refusal: `${decl.id}: the solo '' group is the one-row family's category — it serves only as the whole variant list with no declared groups`,
            });
        }
    }
    return out;
}
//# sourceMappingURL=planes.js.map
