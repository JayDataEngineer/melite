// queueCore.ts — the serial-GPU registry (QueueCore) + run ids + terminal frame (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { randomBytes } from "node:crypto";
import { MAX_SETTLED_RUNS } from "./queueLock.js";
import { notifyRunChanged } from "./runsChange.js";
/** The serial-GPU registry: runs + submission-order list + the one
 *  active run. The worker is the only popper (single-writer under
 *  one loop); submission order is append order (strict FIFO — no
 *  priority lane exists, see the header). */
export class QueueCore {
    runs = new Map();
    order = [];
    activeId = null;
    bootAt = Date.now() / 1000;
    /** Registration tail (submit 1341-1342): the run row joins the
     *  registry, its id appends the order list. Returns the queue
     *  position (append index). */
    enqueue(run) {
        this.runs.set(run.runId, run);
        this.order.push(run.runId);
        return this.order.length - 1;
    }
    /** The worker's claim (worker 1356-1360): while active is set the
     *  next pop BLOCKS (one GPU run machine-wide); else the head
     *  leaves the order list and becomes active. Null = idle. A ghost
     *  id at the head (row swept mid-queue — resurrect, bootSweep) is
     *  SKIPPED, not treated as idle: returning null on a consumed
     *  ghost made the pump read a NON-empty queue as idle and strand
     *  every run behind the ghost until a later kick (audit R8,
     *  stroke 82). */
    tryDequeue() {
        if (this.activeId !== null)
            return null;
        while (this.order.length > 0) {
            const runId = this.order.shift();
            const run = this.runs.get(runId);
            if (run === undefined)
                continue;
            run.status = "running";
            this.activeId = runId;
            notifyRunChanged(runId);
            return run;
        }
        return null;
    }
    /** Release the active claim (worker finally: active null). */
    releaseActive() {
        this.activeId = null;
    }
    /** Terminal mapping (worker 1366-1371): stopped iff the stop flag
     *  is set, else completed on success / failed on exception with
     *  the "<Type>: <msg>" error. Returns the settled status. */
    settleRun(run, failureText) {
        if (run.stopFlag) {
            run.status = "stopped";
            notifyRunChanged(run.runId);
            return run.status;
        }
        if (failureText === null) {
            run.status = "completed";
            notifyRunChanged(run.runId);
            return run.status;
        }
        run.status = "failed";
        run.error = failureText;
        notifyRunChanged(run.runId);
        return run.status;
    }
    /** queue_position (status door 2973-2975): order index, else 0
     *  (active/finished runs read 0). */
    queuePosition(runId) {
        const i = this.order.indexOf(runId);
        return i < 0 ? 0 : i;
    }
    /** The queue snapshot (_h_queue 2893-2900): key order . */
    snapshot() {
        return {
            queued: this.order.length,
            running: this.activeId !== null ? 1 : 0,
            active: this.activeId ?? "",
            queued_ids: [...this.order],
        };
    }
    /** Settled-row eviction (_evict_settled 1137-1151): settled ==
     *  completed|failed ONLY (stopped rows stay — a deliberate stop
     *  is a live receipt, not garbage); past 500 the oldest
     *  created_at leaves first. Returns evicted ids. */
    evictSettled() {
        const settled = [...this.runs.values()].filter((r) => r.status === "completed" || r.status === "failed");
        const excess = settled.length - MAX_SETTLED_RUNS;
        if (excess <= 0)
            return [];
        settled.sort((a, b) => a.createdAt - b.createdAt === 0
            ? (a.runId < b.runId ? -1 : 1)
            : a.createdAt - b.createdAt);
        const evicted = [];
        for (const r of settled.slice(0, excess)) {
            this.runs.delete(r.runId);
            evicted.push(r.runId);
        }
        return evicted;
    }
}
/** run-<12hex>-<8hex> ids (submit 1267: uuid4 hex + time-ms low 32).
 *  The mint is one of the brand's two producers; the return cast is
 *  the construction door. */
export function newRunId() {
    const rand = randomBytes(6).toString("hex");
    const ts = ((Date.now() & 0xffffffff) >>> 0)
        .toString(16)
        .padStart(8, "0");
    return "run-" + rand + "-" + ts;
}
/** The terminal broadcast frame (worker 1413-1414): every
 *  subscriber gets the final status exactly once. Shape pinned
 *  here so the P6 bus port inherits it. */
export function terminalFrame(status) {
    return { type: "run", status };
}
//# sourceMappingURL=queueCore.js.map