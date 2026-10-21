import type { RunId } from "./queueCore.js";
export interface ResurrectPlan {
    /** run_ids to re-queue, FIFO by created_at (order survives). */
    readonly order: RunId[];
    /** run_ids swept below (orphans / half-written). */
    readonly orphans: string[];
}
/** input_from refs for a NodeRow: arrays ride element-wise;
 *  falsy rides []; anything else is the raise road (the caller
 *  orphans the record). */
export declare function refList(value: unknown): unknown[] | null;
/** entries for the row maps: plain objects ride their entries;
 *  falsy rides {}; anything else is the raise road. */
export declare function recordEntries(value: unknown): [string, unknown][] | null;
/** One graph row usable: id/type are non-empty strings;
 *  input_from rides refList with every ref a non-blank string;
 *  input_names/outputs ride recordEntries with string values;
 *  duplicate node ids refuse. seen carries the gate across rows. */
export declare function nodeRowUsable(row: unknown, seen: Set<string>): boolean;
/** The durable graph check (doc.get("graph") or [] 2324): falsy
 *  (missing/None/False/0/"") rides the empty FlowGraph — zero nodes
 *  construct fine, so the record resurrects; a truthy non-list dies
 *  iterating (strings/dicts/numbers orphan); every row must be
 *  NodeRow-usable (extra keys ignored, mistypes orphan). */
export declare function graphRowsUsable(graph: unknown): boolean;
/** list coerce for stages/skipped: arrays ride; falsy rides [];
 *  anything else throws (the raise road: plan + build agree on the
 *  skip, never throw out). */
export declare function sidecarList(value: unknown): unknown[];
/** artifact names: non-empty strings ride; a mistyped entry takes
 *  the raise road (the caller orphans the record — the revived run
 *  never comes back short an artifact, unvoiced). Empty strings
 *  still filter: the writer's own harvest never emits them
 *  (runsExecute drops ""), so "" is absent, not a mistype. */
export declare function artifactStrings(value: unknown): string[];
/** created_at coerce: finite numbers ride; numeric strings parse;
 *  everything else rides 0 and never throws (boot order for
 *  records without a usable timestamp). */
export declare function coerceCreatedAt(value: unknown): number;
/** The durable-record check:
 *  sidecar parses + draft doc lives (CARD BIRTH LAW — the doc is
 *  the birth certificate; a record without one is an orphan, never
 *  a run) + _request.json parses + graph rows FlowGraph-usable
 *  (G1: missing/empty graphs resurrect; NodeRow mistypes orphan). */
export declare function durableRecordUsable(sidecarText: string, requestText: string, draftExists: boolean): boolean;
/** Plan the resurrect (fs reads + order; the caller appends +
 *  ledgers, or use bootResurrect below for the whole seam). */
export declare function planResurrect(stateRoot: string, readSidecar?: (runId: string) => string | null, readRequest?: (runId: string) => string | null, draftExists?: (draftId: string) => boolean): ResurrectPlan;
/** The state-root triple every boot seam takes (server.ts
 *  bootState passes defaultAssetRoots through; the canonical layout
 *  is runsRoot == stateRoot/output and ledgerPath ==
 *  runsRoot/_ledger.jsonl — the core derives both from stateRoot,
 *  so a non-canonical triple is honored for READS and canonical
 *  for WRITES, documented at the service's bootReconcile). */
export interface QueueRoots {
    readonly stateRoot: string;
    readonly runsRoot: string;
    readonly ledgerPath: string;
}
/** One rebuilt queued run — RETIRED (stroke 83): the hollow
 *  requeue road is deleted; the service's bootReconcile REPLAYS _request.json
 *  through the start door so revived rows carry REAL params. */
//# sourceMappingURL=queueResurrect.d.ts.map