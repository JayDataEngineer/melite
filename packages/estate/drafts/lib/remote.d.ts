import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { BenchEnsureRow, BenchGetRow, BenchPatchRow, BenchReorderRow, BenchRewireRow, BenchStageRow, BenchUndoRow } from "./bench.js";
export type { BenchEnsureRow, BenchGetRow, BenchPatchRow, BenchReorderRow, BenchRewireRow, BenchStageRow, BenchUndoRow, } from "./bench.js";
/** The stage-patch door's fixed key set (the old door's
 *  STAGE_PATCH_KEYS, order verbatim — the unknown-keys voice lists
 *  them in this order). */
export declare const STAGE_PATCH_KEYS: readonly ["params", "result", "runStatus", "inputs", "inputOutputs"];
export type StagePatchKey = (typeof STAGE_PATCH_KEYS)[number];
/** Endpoint `drafts/patch` answer — the old door's delivered envelope:
 *  a missing doc/stage is delivered:false + reason (a DOMAIN outcome,
 *  never an error); a landing patch reports the patched key set and
 *  the bench revision it landed at (the CAS law's re-read handle). */
export interface DraftPatchRow {
    draftId: string;
    stageId: string;
    delivered: boolean;
    reason?: string;
    patched?: string[];
    rev?: number;
}
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
        /** The stage id is empty/non-string (the patch door). */
        "draft/bad-stage-id": {
            readonly stageId: string;
        };
        /** The patch body is not a plain object (the patch door). */
        "draft/bad-patch": Record<string, never>;
        /** Keys outside the door's fixed set (the old voice names them). */
        "draft/patch-unknown-keys": {
            readonly unknown: readonly string[];
        };
        /** The domain write refused (put failed at the medium). */
        "draft/cannot-persist": Record<string, never>;
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
    /** Endpoint `drafts/patch` — the stage patch door, REBORN on the
     *  domain (2026-09-11; the gateway-era PATCH /v1/flows/drafts/:id/
     *  stages/:sid died with the app and stroke L left the client door
     *  a throwing stub). Semantics VERBATIM from the old door
     *  (hDraftStagePatch, packages/gateway/doors drafts.ts, probed
     *  editor_runs.py 818-1204): admission on the fixed key set
     *  (params | result | runStatus | inputs | inputOutputs — unknown
     *  keys refuse with the door's voice), params merge PER-KEY into
     *  the stage's existing params (never replace), the domain write
     *  bumps the recency column, and the answer is the delivered
     *  envelope. THE SHARED STATE DOOR: the agent (bench verbs) and
     *  the user (the card drilldowns) author the SAME domain records
     *  through it — one truth, two authors.
     *
     *  THE LAYERED-PARAMS LAW (2026-09-14, the parameter audit): the
     *  params map is the stage's USER layer — a key's PRESENCE is the
     *  override mark (never its value). Two additions make the door
     *  speak it: (1) JSON Merge Patch semantics for params — a null
     *  value DELETES the key (the reset/unset path; RFC 7386's
     *  convention, the wire form of the settings system's unset path
     *  op); (2) the door JOINS the bench CAS law — every write bumps
     *  bench.rev and appends a kind:'patch' log entry, and expectRev
     *  (nullable) fences the write: a bench that moved refuses loud
     *  with bench/cas-conflict carrying current_rev, never merges
     *  under the earlier author. */
    remoteExportPatch(draftId: string, stageId: string, patch: Record<string, unknown>, expectRev: number | null, signal: AbortSignal): Promise<DraftPatchRow>;
    /** The patch arm the adapter above delegates to. */
    patch(draftId: string, stageId: string, patch: Record<string, unknown>, expectRev: number | null, signal: AbortSignal): Promise<DraftPatchRow>;
}
/** The bench Remote owner: ensure/get over the same drafts domain
 *  (the bench doc IS a draft doc, id "bench-<session>"). */
export declare class BenchRemoteService extends TypertRemoteService {
    constructor(ctx: Context);
    /** Endpoint `bench/get` — one session's bench block as the row. */
    remoteExportGet(sessionKey: string, signal: AbortSignal): Promise<BenchGetRow>;
    /** Endpoint `bench/subscribe` — THE PUSH SOURCE (the collapse
     *  plan's stream arm, 2026-09-12): the session's doc on open, then
     *  a fresh doc after EVERY write that touches the session (the
     *  change events the write arms fire). Stream mode rides the
     *  typert logical-stream carrier — the in-process mux carries it
     *  today; the browser's resource provider consumes rev drift until
     *  the host's HTTP stream face lands, then swaps its source here
     *  with zero consumer changes. Abort ends the stream; a write's
     *  listener fault never breaks the stream (the next write re-wakes
     *  it). */
    remoteExportSubscribe(sessionKey: string, signal: AbortSignal): AsyncGenerator<BenchGetRow>;
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
    remoteExportPatch(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchPatchRow>;
    /** Endpoint `bench/add-stage` — append a card stage. */
    remoteExportAddStage(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/remove-stage` — splice one stage out. */
    remoteExportRemoveStage(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/rewire` — set or clear one input binding. */
    remoteExportRewire(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchRewireRow>;
    /** Endpoint `bench/reorder` — move one stage to a new index (the
     *  drag-reorder door, 2026-09-11). */
    remoteExportReorder(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchReorderRow>;
    /** Endpoint `bench/group` — collapse 2+ stages into a compound row
     *  (the Group Cards sub-view's door, 2026-09-11). */
    remoteExportGroup(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/ungroup` — spill a compound's children back. */
    remoteExportUngroup(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchStageRow>;
    /** Endpoint `bench/undo` — walk the log tail, apply inverses. */
    remoteExportUndo(sessionKey: string, doc: Record<string, unknown>, signal: AbortSignal): Promise<BenchUndoRow>;
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
