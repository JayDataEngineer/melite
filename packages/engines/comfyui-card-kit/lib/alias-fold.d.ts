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
/** The card-declared port vocabulary the fold reads — the same
 * shape every flowKinds declaration carries. */
export interface FoldKinds {
    readonly inputs?: Record<string, string>;
    readonly legacyAliases?: Record<string, string>;
    readonly aliasSeats?: Record<string, string>;
}
/** Fold a row's legacy input aliases into their canonical seats —
 * the seats the card's `aliasSeats` names, ONE merge per seat in
 * the compose lane's own order. Returns the SAME object reference
 * when there is nothing to fold (no seat map, or no alias key
 * stated); otherwise a fresh map with every folded alias key gone
 * and the canonical seat carrying the merged value the compose
 * lane would derive. PURE — never mutates the input. */
export declare function foldLegacyAliases(kinds: FoldKinds | undefined, params: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=alias-fold.d.ts.map
