// semanticModelKnob — the served model knob as a semantic style
// enum (roadmap's model-knob row): multi-family cards serve
// human-labeled style entries derived from the boarded families'
// own DECL variant rows — never a bare family id list. Each entry
// carries the stable three-part address (family:variant:cell) and
// the admission route it resolves to; the label is the DECL's own
// copy at the cell's precedence (cell → variant → family — the
// contract's derived-route-view law at models/families/contract.ts).
// The DECL read-face below is structural: the consumer-side slice of
// cordis's ModelDecl → DeclVariantRow → CellRow. card-kit is the leaf
// tier, so the face travels to the consumer instead of card-kit
// importing the engine (the workspace-cycle law) — the real DECLs
// satisfy it structurally at every call site.
/** Derive the served style entries from the boarded families'
 *  DECLs, in board order: variants in DECLARED order, cells in
 *  declared order, hidden cells skipped (the DECL's own
 *  hide_from_dropdown is the served face's truth — the same law
 *  the engine dropdown rides).
 *
 *  THE DECLARED-ORDER LAW (audit 013-edit-image-steps-envelope
 *  cure 4, the `order` schism): entries[0] is variants[0]'s first
 *  visible cell — the same first-declared law the resolver
 *  (laneRelations resolveVariantRow) and the walls pin. A row's
 *  numeric hint never re-seats the default pick: the qwen-img-edit-21
 *  flip declared turbo FIRST with a stale `order: 1` beside base's
 *  `order: 0`, and an order-sort served base at the enum's head
 *  while every unstated compose resolved turbo — one address, two
 *  defaults. The declaration order is the one spelling.
 *
 *  @param decls the boarded families' DECLs, in board order
 *  @returns entries with `entries[0]` the card's default pick
 */
export const semanticModelEntries = (decls) => {
    const out = [];
    for (const decl of decls) {
        for (const variant of decl.variants) {
            for (const cell of variant.cells) {
                if (cell.hide_from_dropdown)
                    continue;
                const route = cell.route !== undefined && cell.route !== ''
                    ? cell.route
                    : variant.route ?? '';
                if (route === '')
                    continue;
                const label = cell.label !== '' ? cell.label : variant.label;
                out.push({
                    value: `${decl.id}:${variant.id}:${cell.quant}`,
                    label: label !== '' ? label : decl.label,
                    family: decl.id,
                    route,
                });
            }
        }
    }
    return out;
};
/** Resolve a served style value to its admission route — the
 *  estate-side fold a request's `model` field rides.
 *
 *  @param entries the derivation's own output (one spelling)
 *  @param value the request's model field
 *  @returns the served entry, or null for any value the
 *   derivation never served (callers fall back to the raw value)
 */
export const resolveSemanticModel = (entries, value) => entries.find((e) => e.value === value) ?? null;
//# sourceMappingURL=semanticModelKnob.js.map
