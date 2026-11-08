import type { DocCall } from "./docModel.js";
/** The span editors' string→number parse: SpecAtom hands the RAW
 *  edit string (card-base atoms pass strings only, the no-coercion
 *  proof); an empty or non-finite edit is no edit. */
export declare function parseSpecNumber(v: string): number | undefined;
/** The span seat's ONE narrowing of the atom grammar's unknown edit
 *  value into a frame write (both span inputs shared this guard
 *  inline before — the parallel-values extraction law). Non-string
 *  values and non-numeric strings are no write, never a NaN frame.
 * @param v the atom's edit value, unknown at the grammar seam.
 * @returns the rounded frame, or undefined when the edit writes nothing. */
export declare function parseFrameEdit(v: unknown): number | undefined;
/** Is this window's seam a carried join? Index-aware, exactly the
 *  card's own `chainLike` law (filmMix's stanzaSecs reads the same). */
export declare function isCarriedShape(index: number, call: Pick<DocCall, "transition">): boolean;
/** Is this authored LENGTH legal for the window's shape? */
export declare function isLegalCallLength(length: number, carried: boolean): boolean;
/** Nearest legal authored length for the window's shape. */
export declare function snapCallLength(length: number, carried: boolean): number;
/** Snap a CUT drag's delta onto the 17-frame lattice (operator
 *  2026-11-05: "I can't even run defaults" — a bar drag landing a cut
 *  at 57f authored an off-grid window and the compose refused the
 *  whole run). Both length families advance by 17, so a cut moved by
 *  a 17-multiple keeps EVERY adjacent window legal when it started
 *  legal — one rule for the shared-cut pair, never a per-window
 *  second spelling.
 * @param delta the dragged cut's frame offset from its legal start.
 * @returns the nearest 17-multiple offset (0 = the cut did not move). */
export declare function snapCutDelta(delta: number): number;
/** Heal an authored call list onto the grid (the client mirror of
 *  the compose's span gate): a legacy or drag-authored doc can carry
 *  off-grid lengths — the run refuses them whole. The heal snaps
 *  each window's length to its shape's nearest legal and rebases the
 *  tiling so calls stay contiguous (start of i+1 = end of i).
 *  Constructed junk (a negative or zero length) snaps to the shape's
 *  floor — an unfinished card still renders, only the engine's own
 *  impossible geometry refuses, and that refusal stays compose-side.
 * @param calls the authored call list, any spelling.
 * @returns the same list with every length on its grid. */
export declare function healOffGridCalls(calls: DocCall[]): DocCall[];
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
 *  gesture's frame when it already qualifies, else the nearest one
 *  that does. NULL when no interior frame qualifies (the §0.5 fence,
 *  2026-11-16): the old fallthrough handed back the raw gesture and
 *  every caller wrote an off-grid half the card would refuse whole.
 *  A window at its shape's floor (the 22f base, the 17f step) has no
 *  legal split at all — the caller refuses loud, never repairs. */
export declare function snapSplitFrame(start: number, end: number, leftCarried: boolean, rightCarried: boolean, gesture: number): number | null;
/** The seam toggle's re-frame: the 22-frame carry moves from the
 *  generation head to (or from) the authored span. A first window has
 *  no carry either way, so its toggle never moves frames. */
export declare function reflowSeamSpan(call: DocCall, index: number, next: "extend" | "cut" | "carry+keyframe"): number;
/** The window that would cover a pin at `frame` — the plan gate's own
 *  predicate (f ∈ [start_frame, end_frame), the first matching call).
 *
 * @param calls the document's calls (the windows).
 * @param frame the FILM-absolute pin frame.
 * @returns the covering call, or null when the frame falls outside
 *   every window (the plan door's gap — the strip surfaces the
 *   refusal; the write still lands). */
export declare function pinWindowOf(calls: ReadonlyArray<Pick<DocCall, "start_frame" | "end_frame">>, frame: number): Pick<DocCall, "start_frame" | "end_frame"> | null;
/** The keyframe chip's drop verdict, over the shared grid law:
 *  "snap" when the pin sits within one GRID_STEP_FRAMES of its
 *  window's boundary (the anchor/end-anchor seats), "interior" when
 *  it stays mid-window, null when no window covers it (the gap — the
 *  refusal face's seat, never a hint).
 *
 * @param calls the document's calls (the windows).
 * @param frame the FILM-absolute pin frame.
 * @returns the verdict for the chip's hint face. */
export declare function pinDropVerdict(calls: ReadonlyArray<Pick<DocCall, "start_frame" | "end_frame">>, frame: number): "snap" | "interior" | null;
//# sourceMappingURL=docGrid.d.ts.map
