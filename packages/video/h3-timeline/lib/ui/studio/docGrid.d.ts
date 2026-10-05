import type { DocCall } from "./docModel.js";
/** Is this window's seam a carried join? Index-aware, exactly the
 *  card's own `chainLike` law (filmMix's stanzaSecs reads the same). */
export declare function isCarriedShape(index: number, call: Pick<DocCall, "transition">): boolean;
/** Is this authored LENGTH legal for the window's shape? */
export declare function isLegalCallLength(length: number, carried: boolean): boolean;
/** Nearest legal authored length for the window's shape. */
export declare function snapCallLength(length: number, carried: boolean): number;
/** The grid's step, re-exported so the authoring setters never grow a
 *  second copy of the number. Both length families advance by 17. */
export declare const GRID_STEP = 17;
/** The grid's base — the shortest first/cut window. */
export declare const GRID_BASE = 22;
/** The shortest legal authored length for this window's shape. */
export declare function shortestCallLength(index: number, call: Pick<DocCall, "transition">): number;
/** The exclusive end this call would carry at the requested end: the
 *  length snaps, the start is the operator's. */
export declare function snapCallEnd(call: DocCall, index: number, end: number): number;
/** The splice frame for a split where BOTH halves must be legal — the
 *  gesture's frame when it already qualifies, else the nearest one that
 *  does. Never returns a frame that leaves an off-grid half. */
export declare function snapSplitFrame(start: number, end: number, leftCarried: boolean, rightCarried: boolean, gesture: number): number;
/** The seam toggle's re-frame: the 22-frame carry moves from the
 *  generation head to (or from) the authored span. A first window has
 *  no carry either way, so its toggle never moves frames. */
export declare function reflowSeamSpan(call: DocCall, index: number, next: "extend" | "cut"): number;
//# sourceMappingURL=docGrid.d.ts.map
