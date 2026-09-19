// queue-core.spec.ts — the serial-GPU registry's own arms (TEST-2
// breadth, the deterministic census of 2026-09-19). The registry
// specs drive QueueCore through the service; THIS file pins every
// arm of the core itself: the FIFO claim (blocked-while-active,
// ghost-skip, idle), the terminal mapping's three voices, the
// queue-position law, the snapshot shape, and settled eviction
// (the 500 cap, the created_at ordering, the run-id tie-break,
// stopped-rows-stay).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { QueueCore, newRunId, type QueueRunRow } from "../src/queueCore.ts";
import { MAX_SETTLED_RUNS } from "../src/queueLock.ts";

const row = (runId: string, over: Partial<QueueRunRow> = {}): QueueRunRow => ({
  runId,
  status: "queued",
  error: "",
  createdAt: 1_000,
  draftId: "d",
  testFlag: false,
  stopFlag: false,
  ...over,
});

describe("QueueCore.enqueue + tryDequeue (the serial-GPU claim)", () => {
  it("FIFO: the head leaves the order and becomes active", () => {
    const q = new QueueCore();
    q.enqueue(row("r1"));
    q.enqueue(row("r2"));
    const got = q.tryDequeue();
    assert.equal(got?.runId, "r1");
    assert.equal(q.activeId, "r1");
    assert.equal(got?.status, "running", "the claim marks the row running");
    assert.deepEqual(q.order, ["r2"]);
  });

  it("while active is set the next pop BLOCKS (one GPU run machine-wide)", () => {
    const q = new QueueCore();
    q.enqueue(row("r1"));
    q.enqueue(row("r2"));
    q.tryDequeue();
    assert.equal(q.tryDequeue(), null, "active held: never a second claim");
    q.releaseActive();
    assert.equal(q.tryDequeue()?.runId, "r2", "released: the next head claims");
  });

  it("an idle queue pops null", () => {
    assert.equal(new QueueCore().tryDequeue(), null);
  });

  it("a ghost id at the head is SKIPPED, not idle (audit R8, stroke 82)", () => {
    const q = new QueueCore();
    q.enqueue(row("ghost"));
    q.enqueue(row("real"));
    q.runs.delete("ghost");
    const got = q.tryDequeue();
    assert.equal(got?.runId, "real", "the swept ghost never strands the queue");
    assert.deepEqual(q.order, []);
  });
});

describe("QueueCore.settleRun (the terminal mapping, worker 1366-1371)", () => {
  it("a deliberate stop wins over everything: stopped", () => {
    const q = new QueueCore();
    const r = row("r1", { stopFlag: true });
    assert.equal(q.settleRun(r, "TypeError: boom"), "stopped");
    assert.equal(r.status, "stopped");
    assert.equal(r.error, "", "a stop writes no error");
  });
  it("success: completed, no error", () => {
    const q = new QueueCore();
    const r = row("r1");
    assert.equal(q.settleRun(r, null), "completed");
    assert.equal(r.error, "");
  });
  it("an exception: failed with the '<Type>: <msg>' text", () => {
    const q = new QueueCore();
    const r = row("r1");
    assert.equal(q.settleRun(r, "TypeError: boom"), "failed");
    assert.equal(r.error, "TypeError: boom");
  });
});

describe("QueueCore.queuePosition + snapshot", () => {
  it("queued position is the order index; active/finished read 0", () => {
    const q = new QueueCore();
    q.enqueue(row("r1"));
    q.enqueue(row("r2"));
    q.enqueue(row("r3"));
    assert.equal(q.queuePosition("r2"), 1);
    q.tryDequeue();
    assert.equal(q.queuePosition("r1"), 0, "the active run reads 0");
    assert.equal(q.queuePosition("never"), 0, "an unknown id reads 0");
  });
  it("snapshot: queued count, one running, the active id, the ids in order", () => {
    const q = new QueueCore();
    q.enqueue(row("r1"));
    q.enqueue(row("r2"));
    q.tryDequeue();
    assert.deepEqual(q.snapshot(), {
      queued: 1, running: 1, active: "r1", queued_ids: ["r2"],
    });
    q.releaseActive();
    const idle = q.snapshot();
    assert.equal(idle.running, 0);
    assert.equal(idle.active, "");
  });
});

describe("QueueCore.evictSettled (the 500 cap, oldest first)", () => {
  it("under the cap nothing evicts (stopped rows are live receipts)", () => {
    const q = new QueueCore();
    q.enqueue(row("s1", { status: "stopped" }));
    q.enqueue(row("c1", { status: "completed" }));
    assert.deepEqual(q.evictSettled(), []);
    assert.equal(q.runs.size, 2, "stopped stays even at the head of age");
  });
  it("past the cap the oldest settled leaves first; ties break by run id", () => {
    const q = new QueueCore();
    const total = MAX_SETTLED_RUNS + 3;
    for (let i = 0; i < total; i++) {
      const id = `run-${String(i).padStart(4, "0")}`;
      q.enqueue(row(id, { status: "completed", createdAt: 2_000 }));
    }
    // same createdAt for all: the run-id ASC tie-break owns the order
    const evicted = q.evictSettled();
    assert.equal(evicted.length, 3);
    assert.deepEqual(evicted, ["run-0000", "run-0001", "run-0002"]);
    assert.equal(q.runs.size, MAX_SETTLED_RUNS, "the cap holds");
  });
  it("a later-created settled row survives an earlier one", () => {
    const q = new QueueCore();
    const total = MAX_SETTLED_RUNS + 1;
    for (let i = 0; i < total; i++) {
      q.enqueue(row(`run-${String(i).padStart(4, "0")}`, {
        status: "completed",
        createdAt: i === total - 1 ? 9_999 : 5_000,
      }));
    }
    // the last row is NEWEST: the first (same-age cluster) evicts
    const evicted = q.evictSettled();
    assert.equal(evicted.length, 1);
    assert.equal(evicted[0], "run-0000");
    assert.ok(q.runs.has(`run-${String(total - 1).padStart(4, "0")}`));
  });
});

describe("newRunId", () => {
  it("run-<12hex>-<8hex>, unique across calls", () => {
    const a = newRunId();
    const b = newRunId();
    assert.match(a, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
    assert.notEqual(a, b);
  });
});
