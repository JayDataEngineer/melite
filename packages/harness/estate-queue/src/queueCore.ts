// queueCore.ts — the serial-GPU registry (QueueCore) + run ids + terminal frame (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { randomBytes } from "node:crypto";
import type { Branded } from "@deepseek-ai/dsh-brand";
import type { DraftId } from "@melite/contracts/benchStage";
import { MAX_SETTLED_RUNS } from "./queueLock.ts";
import type { LifecycleState } from "./queueLifecycle.ts";
import { notifyRunChanged } from "./runsChange.ts";
// ── the registry (Gateway.__init__ 1066-1071 + serial law) ───────

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
  /** The run's card doc key — branded (the DraftId seating beside
   *  RunId); the submit envelope walk mints it off the wire body. */
  draftId: DraftId;
  testFlag: boolean;
  stopFlag: boolean;
}

/** The serial-GPU registry: runs + submission-order list + the one
 *  active run. The worker is the only popper (single-writer under
 *  one loop); submission order is append order (strict FIFO — no
 *  priority lane exists, see the header). */
export class QueueCore {
  readonly runs: Map<string, QueueRunRow> = new Map();
  readonly order: string[] = [];
  activeId: string | null = null;
  readonly bootAt: number = Date.now() / 1000;

  /** Registration tail (submit 1341-1342): the run row joins the
   *  registry, its id appends the order list. Returns the queue
   *  position (append index). */
  enqueue(run: QueueRunRow): number {
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
  tryDequeue(): QueueRunRow | null {
    if (this.activeId !== null) return null;
    while (this.order.length > 0) {
      const runId = this.order.shift() as string;
      const run: QueueRunRow | undefined = this.runs.get(runId);
      if (run === undefined) continue;
      run.status = "running";
      this.activeId = runId;
      notifyRunChanged(runId);
      return run;
    }
    return null;
  }

  /** Release the active claim (worker finally: active null). */
  releaseActive(): void {
    this.activeId = null;
  }

  /** Terminal mapping (worker 1366-1371): stopped iff the stop flag
   *  is set, else completed on success / failed on exception with
   *  the "<Type>: <msg>" error. Returns the settled status. */
  settleRun(run: QueueRunRow, failureText: string | null): LifecycleState {
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
  queuePosition(runId: string): number {
    const i: number = this.order.indexOf(runId);
    return i < 0 ? 0 : i;
  }

  /** The queue snapshot (_h_queue 2893-2900): key order . */
  snapshot(): {
    queued: number;
    running: number;
    active: string;
    queued_ids: string[];
  } {
    return {
      queued: this.order.length,
      running: this.activeId !== null ? 1 : 0,
      active: this.activeId ?? "",
      queued_ids: [...this.order],
    };
  }

  /** Settled-row eviction (_evict_settled 1137-1151): settled is
   *  every terminal status — completed, failed, AND stopped (audit
   *  F-S11: stopped was exempt as "a live receipt", but terminal is
   *  terminal — a stop-heavy session minted rows the cap never
   *  touched, and the receipt lives on in the persist regardless;
   *  the 500-row window serves any interactive read). Past 500 the
   *  oldest created_at leaves first. Returns evicted ids. */
  evictSettled(): string[] {
    const settled: QueueRunRow[] = [...this.runs.values()].filter(
      (r: QueueRunRow): boolean =>
        r.status === "completed" || r.status === "failed" ||
        r.status === "stopped",
    );
    const excess: number = settled.length - MAX_SETTLED_RUNS;
    if (excess <= 0) return [];
    settled.sort((a: QueueRunRow, b: QueueRunRow): number =>
      a.createdAt - b.createdAt === 0
        ? (a.runId < b.runId ? -1 : 1)
        : a.createdAt - b.createdAt,
    );
    const evicted: string[] = [];
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
export function newRunId(): RunId {
  const rand: string = randomBytes(6).toString("hex");
  const ts: string = ((Date.now() & 0xffffffff) >>> 0)
    .toString(16)
    .padStart(8, "0");
  return "run-" + rand + "-" + ts as RunId;
}

/** The terminal broadcast frame (worker 1413-1414): every
 *  subscriber gets the final status exactly once. Shape pinned
 *  here so the P6 bus port inherits it. */
export function terminalFrame(status: LifecycleState): Record<string, string> {
  return { type: "run", status };
}
