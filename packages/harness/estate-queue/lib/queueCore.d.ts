import type { Branded } from "@deepseek-ai/dsh-brand";
import type { LifecycleState } from "./queueLifecycle.js";
/** The run id: run-<12hex>-<8hex>, opaque as it crosses wire, queue
 *  and file (branded at its two producers — the mint below and the
 *  resurrect fs door — per the dsh-brand convention). */
export type RunId = Branded<"RunId">;
export interface QueueRunRow {
    runId: RunId;
    status: LifecycleState;
    /** Terminal failure text ("<Type>: <msg>") — "" until failed. */
    error: string;
    createdAt: number;
    draftId: string;
    testFlag: boolean;
    stopFlag: boolean;
}
/** The serial-GPU registry: runs + submission-order list + the one
 *  active run. The worker is the only popper (single-writer under
 *  one loop); submission order is append order (strict FIFO — no
 *  priority lane exists, see the header). */
export declare class QueueCore {
    readonly runs: Map<string, QueueRunRow>;
    readonly order: string[];
    activeId: string | null;
    readonly bootAt: number;
    /** Registration tail (submit 1341-1342): the run row joins the
     *  registry, its id appends the order list. Returns the queue
     *  position (append index). */
    enqueue(run: QueueRunRow): number;
    /** The worker's claim (worker 1356-1360): while active is set the
     *  next pop BLOCKS (one GPU run machine-wide); else the head
     *  leaves the order list and becomes active. Null = idle. A ghost
     *  id at the head (row swept mid-queue — resurrect, bootSweep) is
     *  SKIPPED, not treated as idle: returning null on a consumed
     *  ghost made the pump read a NON-empty queue as idle and strand
     *  every run behind the ghost until a later kick (audit R8,
     *  stroke 82). */
    tryDequeue(): QueueRunRow | null;
    /** Release the active claim (worker finally: active null). */
    releaseActive(): void;
    /** Terminal mapping (worker 1366-1371): stopped iff the stop flag
     *  is set, else completed on success / failed on exception with
     *  the "<Type>: <msg>" error. Returns the settled status. */
    settleRun(run: QueueRunRow, failureText: string | null): LifecycleState;
    /** queue_position (status door 2973-2975): order index, else 0
     *  (active/finished runs read 0). */
    queuePosition(runId: string): number;
    /** The queue snapshot (_h_queue 2893-2900): key order . */
    snapshot(): {
        queued: number;
        running: number;
        active: string;
        queued_ids: string[];
    };
    /** Settled-row eviction (_evict_settled 1137-1151): settled is
     *  every terminal status — completed, failed, AND stopped (audit
     *  F-S11: stopped was exempt as "a live receipt", but terminal is
     *  terminal — a stop-heavy session minted rows the cap never
     *  touched, and the receipt lives on in the persist regardless;
     *  the 500-row window serves any interactive read). Past 500 the
     *  oldest created_at leaves first. Returns evicted ids. */
    evictSettled(): string[];
}
/** run-<12hex>-<8hex> ids (submit 1267: uuid4 hex + time-ms low 32).
 *  The mint is one of the brand's two producers; the return cast is
 *  the construction door. */
export declare function newRunId(): RunId;
/** The terminal broadcast frame (worker 1413-1414): every
 *  subscriber gets the final status exactly once. Shape pinned
 *  here so the P6 bus port inherits it. */
export declare function terminalFrame(status: LifecycleState): Record<string, string>;
//# sourceMappingURL=queueCore.d.ts.map
