// cardsDroppable.ts — THE DROPPED-KNOB ALLOWABILITY LAW (F3-04,
// 2026-11-15; friction RIG-P0-15: `graph_receipt` showed
// `dropped:["mode"]` — a declared param fell out of compilation,
// receipted but judged by nothing).
//
// THE LAW: a doc scalar the compose drops is a receipt FACT (verdict
// "partial", the key named) — but a knob that falls out of
// compilation UNDECLARED is exactly the silent-drop class the
// receipt exists to police. Every card that knowingly drops a
// scalar declares it here, WITH THE REASON it can never ride the
// graph; the receipt wall reds any served receipt whose dropped[]
// holds a key outside its card's declared set. The declaration is
// the ALLOWLIST, never the receipt: an undeclared drop is a finding
// (a wall red or an operator's watch), not a compose refusal — the
// compose gate owns refusals (queueSidecar's own law).
//
// SEAT: beside the receipt's estate home, keyed by the card id the
// registry serves (defsSync) — the wall sweeps every entry against
// the card's own schema dict, so a declaration for a card that does
// not exist, or a knob the card does not serve, reds (D1: the
// declaration can never drift off the served surface).
export const CARD_DROPPABLE = {
    // RIG-P0-15 (friction3): mode:"auto" dropped, nodes:2 — harmless
    // ONLY because mode is the lane router, not a knob the graph
    // reads: compose selects the auto/copy LANE by it (card.ts
    // `when: mode === 'auto'` / `!== 'auto'`), so no graph input ever
    // spells it. Declared so the receipt's partial verdict carries its
    // reason instead of reading as a fall-out-of-compilation.
    rig: {
        mode: "the lane router: compose selects the auto/copy lane by it (visible_when/when), never a graph scalar — no node input spells it",
    },
    // The receipt wall's ARM-e control (the real music door): the
    // admitted body carries model but no graph input spells the bare
    // family id — the routing residue, named there and here, never
    // hidden.
    music: {
        model: "the routing residue: the admitted body carries the family id but no graph input spells the bare id (the receipt wall's ARM-e control names it)",
    },
};
/** The unjustified drops: receipt dropped[] keys NOT declared for
 *  the card — the exact keys the wall reds on. Empty = every drop
 *  carries a declared reason.
 *  @param pair the receipt (any GraphReceiptPair-shaped row — the
 *    run fold or a per-stage row)
 *  @param card the card id the registry serves */
export function unjustifiedDropped(pair, card) {
    const declared = CARD_DROPPABLE[card] ?? {};
    return pair.dropped.filter((k) => !(k in declared));
}
//# sourceMappingURL=cardsDroppable.js.map
