/** The bench add-stage verb caller (the tab's add-card path). The
 *  doc holds card/author/engine/params/expect_rev. */
export declare function addStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** The bench remove-stage verb caller (the drill's Remove path). The
 *  doc holds stage/expect_rev; the session key addresses the doc the
 *  bar RENDERS (stroke 80 — 'main' hardcoding deleted against the
 *  wrong bench and refused 'stage not found'). */
export declare function removeStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO CLEAR ALL"
 *  — and a bench with a stranded wire had no way out but the wire).
 *  The doc holds expect_rev only; the session key addresses the doc
 *  the bar RENDERS (same law as remove). */
export declare function clearBenchWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** The bench reorder verb caller (the drag-reorder path). Doc:
 *  stage/to/expect_rev — `to` is the post-splice target index. */
export declare function reorderStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** The bench group verb caller (the Group Cards sub-view):
 *  stages = 2+ ids (bench order applied server-side). */
export declare function groupStagesWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** The bench ungroup verb caller: spill a compound's children. */
export declare function ungroupStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
/** THE UNDO WIRE (the walkable revision log): revert the log
 *  tail's newest ACTION (or `n` of them — the doc's own key,
 *  server-defaulted to 1). One press, no author filter — the
 *  tab's reader undoes the last change to the ONE shared bench,
 *  whoever authored it; the server's own log walk skips
 *  already-reverted entries and never targets undo entries
 *  themselves (no ping-pong). Same CAS rebase dance: a bench the
 *  agent moved mid-press costs one silent re-read, never a
 *  bricked tab. The session key addresses the doc the bar
 *  RENDERS (stroke 80's law). */
export declare function undoBenchWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>>;
//# sourceMappingURL=add-stage.d.ts.map
