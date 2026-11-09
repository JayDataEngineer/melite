import type { DocCall } from './docModel.ts';
/** The three carry states the split seat states (§0.9's vocabulary,
 * the same three the call card's seam seat and the strip head's
 * carry menu serve). */
export type SplitCarry = 'cut' | 'extend' | 'carry+keyframe';
/** Split the doc's calls at a gesture frame with a selected carry.
 * @param calls the doc's own windows (the row's calls param)
 * @param gestureFrame the frame the split is asked at (doc space)
 * @param carry the seam state the NEW split births after the stock
 * cut ("cut" keeps the split's own default seam)
 * @returns the next calls array, or null when no legal split exists
 * (a window too short to halve, or an empty doc — the refusal the
 * caller's own voice names) */
export declare function splitCallsAt(calls: DocCall[], gestureFrame: number, carry: SplitCarry): DocCall[] | null;
//# sourceMappingURL=v2vSplit.d.ts.map