/** Derive the served style entries from the boarded families'
 *  DECLs, in board order: variants by their `order`, cells in
 *  declared order, hidden cells skipped (the DECL's own
 *  hide_from_dropdown is the served face's truth — the same law
 *  the engine dropdown rides).
 *
 *  @param decls the boarded families' DECLs, in board order
 *  @returns entries with `entries[0]` the card's default pick
 */
export const semanticModelEntries = (decls) => {
    const out = [];
    for (const decl of decls) {
        const variants = [...decl.variants].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        for (const variant of variants) {
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