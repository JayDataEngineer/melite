/** The parsed tail answer (the seat serves the object; the door
 *  serialized it — the HTTP rim is dead). */
export interface LedgerTailAnswer {
    entries: unknown[];
    shown: number;
    matched: number;
    /** §23: the roots whose journals merged into this tail (exact
     *  manifest order; absent only in the single-root legacy call). */
    searched?: string[];
}
export declare function tailLedger(ledgerPath: string, rawLimit: string, rawEvent: string): LedgerTailAnswer;
/** §23 CROSS-ROOTS: every root's journal, one merged timeline. The
 *  per-file law rides VERBATIM first (match + last-N window per
 *  root — an unparseable line still occupies its slot); the
 *  per-file TAILS then merge by ts (stable — a tie keeps manifest
 *  order, own root first) and the last N merged serve. matched
 *  counts every root's matches. The answer names the searched
 *  roots. A single root degenerates to tailLedger exactly. */
export declare function tailLedgerAcross(roots: string[], rawLimit: string, rawEvent: string): LedgerTailAnswer;
//# sourceMappingURL=ledgerTail.d.ts.map
