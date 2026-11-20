export declare const CARD_DROPPABLE: Readonly<Record<string, Readonly<Record<string, string>>>>;
/** The unjustified drops: receipt dropped[] keys NOT declared for
 *  the card — the exact keys the wall reds on. Empty = every drop
 *  carries a declared reason.
 *  @param pair the receipt (any GraphReceiptPair-shaped row — the
 *    run fold or a per-stage row)
 *  @param card the card id the registry serves */
export declare function unjustifiedDropped(pair: {
    readonly dropped: readonly string[];
}, card: string): string[];
//# sourceMappingURL=cardsDroppable.d.ts.map
