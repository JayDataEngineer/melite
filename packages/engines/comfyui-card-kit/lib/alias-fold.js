/** alias-fold.ts — THE ONE-SPELLING SERVE (operator 2026-11-14: "I
 * TOLD YOU ONE BENCH, BUT THE AGENT AND USER HAVE DIFFERENT INPUT
 * PARAMETERS"). A card's `legacyAliases` name INPUT seats the
 * compose lanes still admit (old drafts, agent spellings, flow
 * edges) but no face renders — the canonical seat in `inputs` is
 * the one and only user face. The run's compose merges the aliases
 * engine-side, so a stage row carrying `image1` RUNS with the
 * image; the resolved serve, though, handed the params on
 * verbatim — the drill's form rendered the canonical seat
 * (input_images / image) EMPTY and the user stared at a BLANK
 * input square for an image the agent had already attached. The
 * serve is the 1:1 law ("the map the NEXT RUN composes") — this
 * fold makes that claim true for alias-carrying rows: the same
 * merge the lane performs, folded at the serve, ONE spelling
 * visible on every face.
 *
 * THE SEAT MAP IS CARD-DECLARED: legacyAliases' values are KINDS
 * (the lattice's own vocabulary — image1: 'image'), never seat
 * names, and which canonical seat an alias merges into is a fact
 * only the card knows (image-edit's numbered slots merge into
 * input_images by the ordered-list law; h3's guide spelling into
 * image by the derivation's precedence). The card declares that
 * mapping as `aliasSeats` — this fold never guesses it. The law
 * mirrors the lanes exactly (byte-stable compose — the wall proves
 * orderedInputImages(folded) === orderedInputImages(raw) on the
 * same row):
 * - a canonical seat that is already stated (a non-blank string
 *   entry for list seats, a non-null value for single seats) WINS
 *   and the aliases fold away (the migration law, the operator's
 *   own history runs forward);
 * - an absent canonical seat derives from the aliases in DECLARED
 *   order (image1 the anchor, image2/image3, then the
 *   reference_images stack; h3's image_name → image), blanks
 *   dropped, values verbatim;
 * - every folded alias key is DELETED from the served map — one
 *   channel, the canonical spelling, never two side by side.
 * The fold is READ-SIDE only (the resolved serve, the construct
 * write): the stored doc keeps what its author wrote and the
 * compose lanes keep their own merge — this is the same merge,
 * served. */
/** True when a list seat's stated value already owns the seat (the
 * migration law's winner): any non-blank string entry. */
function listOwned(v) {
    return Array.isArray(v) && v.some((s) => typeof s === 'string' && s.trim() !== '');
}
/** The non-blank string entries of one alias value, verbatim — a
 * string is one entry, an array splices; garbage (non-strings)
 * rides the compose lane's own loud refusal, never this fold. */
function entriesOf(v) {
    if (typeof v === 'string')
        return v.trim() !== '' ? [v] : [];
    if (!Array.isArray(v))
        return [];
    return v.filter((s) => typeof s === 'string' && s.trim() !== '');
}
/** Fold a row's legacy input aliases into their canonical seats —
 * the seats the card's `aliasSeats` names, ONE merge per seat in
 * the compose lane's own order. Returns the SAME object reference
 * when there is nothing to fold (no seat map, or no alias key
 * stated); otherwise a fresh map with every folded alias key gone
 * and the canonical seat carrying the merged value the compose
 * lane would derive. PURE — never mutates the input. */
export function foldLegacyAliases(kinds, params) {
    const seats = kinds?.aliasSeats;
    if (seats === undefined || Object.keys(seats).length === 0)
        return params;
    if (!Object.keys(seats).some((alias) => alias in params))
        return params;
    const out = { ...params };
    // aliases grouped by canonical seat, DECLARED order preserved
    // (object key order is the declaration's own): image1 before
    // image2 before image3 before reference_images.
    const bySeat = new Map();
    for (const alias of Object.keys(seats)) {
        if (!(alias in params))
            continue;
        const seat = seats[alias] ?? '';
        const row = bySeat.get(seat);
        if (row === undefined)
            bySeat.set(seat, [alias]);
        else
            row.push(alias);
    }
    for (const [seat, aliasKeys] of bySeat) {
        const isList = (kinds?.inputs?.[seat] ?? '').endsWith('_list');
        if (isList) {
            if (!listOwned(out[seat])) {
                const merged = [];
                for (const alias of aliasKeys)
                    merged.push(...entriesOf(out[alias]));
                if (merged.length > 0)
                    out[seat] = merged;
            }
        }
        else if (out[seat] === undefined || out[seat] === null) {
            for (const alias of aliasKeys) {
                const v = out[alias];
                if (typeof v === 'string' && v.trim() !== '') {
                    out[seat] = v;
                    break;
                }
            }
        }
        for (const alias of aliasKeys)
            delete out[alias];
    }
    return out;
}
//# sourceMappingURL=alias-fold.js.map