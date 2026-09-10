import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { BenchEnsureRow, BenchGetRow, BenchPatchRow, BenchRewireRow, BenchStageRow, BenchUndoRow } from "./bench.js";
export type { BenchEnsureRow, BenchGetRow, BenchPatchRow, BenchRewireRow, BenchStageRow, BenchUndoRow, } from "./bench.js";
/** draft_id_ok: 1..96 chars of [A-Za-z0-9_-] (the composer mint). */
/** One listed draft — the index row (recency-ordered by the caller). */
export interface DraftListRow {
    readonly draft_id: string;
    readonly model: string;
    readonly name: string;
}
/** The list result: rows capped at 600, count total pre-cap. */
export interface DraftListResult {
    readonly count: number;
    readonly drafts: readonly DraftListRow[];
}
/** The drafts' Remote failure codes, merged into the protocol's one
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The id fails the [A-Za-z0-9_-]{1,96} draft law. */
        "draft/bad-id": {
            readonly draftId: string;
        };
        /** No stored draft carries that id. */
        "draft/not-found": {
            readonly draftId: string;
        };
        /** The storage open refused an otherwise valid call. */
        "draft/store-failed": Record<string, never>;
    }
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        draftsRemote: DraftsRemoteService;
        benchRemote: BenchRemoteService;
    }
}
/** The drafts Remote owner: list/get over the storage domain. */
export declare class DraftsRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** Endpoint `drafts/list` — the domain index, recency DESC. */
    remoteExportList(signal: AbortSignal): Promise<DraftListResult>;
    /** Endpoint `drafts/get` — one doc by id. */
    remoteExportGet(draftId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** The in-process API the adapters above delegate to. */
    list(signal: AbortSignal): Promise<DraftListResult>;
    /** The in-process API the adapter above delegates to. */
    get(draftId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
}
/** The bench Remote owner: ensure/get over the same drafts domain
 *  (the bench doc IS a draft doc, id "bench-<session>"). */
export declare class BenchRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** Endpoint `bench/get` — one session's bench block as the row. */
    remoteExportGet(session: string, signal: AbortSignal): Promise<BenchGetRow>;
    /** Endpoint `bench/ensure` — birth or load (the only creating arm). */
    remoteExportEnsure(doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchEnsureRow>;
    /** The in-process API the adapters above delegate to. Classified
     *  bench failures pass through untouched; only the open itself
     *  wraps as bench/store-failed. */
    get(session: string, signal: AbortSignal): Promise<BenchGetRow>;
    /** The in-process API the adapter above delegates to. */
    ensure(doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchEnsureRow>;
    /** Endpoint `bench/patch` — params merge (+result/runStatus) with
     *  CAS + log. */
    remoteExportPatch(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchPatchRow>;
    /** Endpoint `bench/add-stage` — append a card stage. */
    remoteExportAddStage(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/remove-stage` — splice one stage out. */
    remoteExportRemoveStage(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/rewire` — set or clear one input binding. */
    remoteExportRewire(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchRewireRow>;
    /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
    remoteExportUndo(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchUndoRow>;
    /** The in-process APIs the adapters above delegate to. The
     *  domain's classified failures pass through untouched; only the
     *  open itself wraps as bench/store-failed. */
    private open;
    patch(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchPatchRow>;
    addStage(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    removeStage(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    rewire(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchRewireRow>;
    undo(session: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchUndoRow>;
}
//# sourceMappingURL=remote.d.ts.map
