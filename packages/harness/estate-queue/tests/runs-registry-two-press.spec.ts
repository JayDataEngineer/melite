// runs-registry-two-press.spec.ts — THE TWO-SESSION SERIALITY CONTRACT
// (the operator's question: two AI sessions both press generations at
// the same time — queue, or collision?).
//
// The pieces are walled elsewhere: the active guard blocks a second
// pop (queue-core.spec), the pump loops FIFO (runs-registry-pump),
// one press_key raced twice mints ONE run (runs-registry-doors). No
// wall drove two DISTINCT presses through the REAL pump concurrently
// to pin the headline behavior end-to-end:
//   A. NO OVERLAP — the engine never holds two executes in flight
//      (max observed concurrency === 1, machine-wide; the
//      SERIAL-GPU LAW, queue.ts header);
//   B. STRICT SUBMIT ORDER — the engine receives the flows in press
//      order, whatever the timing;
//   C. THE VISIBLE QUEUE — the loser's start answer reports status
//      "queued" and queue_position per the ported heritage law
//      (order index ahead of the row; the ACTIVE run is not counted
//      — queue.ts "status door 2973-2975"), and the core snapshot
//      reports queued/running counts;
//   D. NO LOST RUN — every pressed row settles completed exactly once.
// A pump that double-claims, reorders, drops, or strands the loser
// goes RED here.
//
// THE PROXY FIELD LAW (this wall's own first red, kept as a harness
// lesson): the ComfyUIHostService construction lands a proxy
// receiver — a JS private #field brands its receiver and reads
// "did not declare it" across the proxy, so the fake carries
// TS-private plain properties (the pump spec's FakeEngine predates
// the trap with public ones).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { FlowResult, MergeRow, EngineJson } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "two-press-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
  state: string;
}

const seat = (): Seat => {
  const state = tmp();
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (): Promise<unknown> => ({}),
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    modelFacts: (): unknown => {
      throw new Error("no facts");
    },
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
    composeValidateCard: async (): Promise<unknown> => null,
  };
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, state };
};

const wfBody = (pressKey: string): Record<string, unknown> => ({
  draft_id: "d1",
  test: false,
  press_key: pressKey,
  flow_inline: {
    id: "x",
    stages: [{
      id: "s",
      engine: "comfyui",
      params: { workflow: { "1": { class_type: "UNETLoader", inputs: {} } } },
    }],
  },
});

/** The engine seat as a cordis-registered subclass (needComfyUI
 *  instanceof-gates the host service — a structural fake cannot
 *  cross). Each execute HOLDS until the test releases its run id, so
 *  the queued window is observable deterministically; the counters
 *  pin the never-two-at-once law. TS-private plain properties — the
 *  proxy field law in the header. */
class GatedEngine extends ComfyUIHostService {
  /** Run ids in engine-submit order. */
  received: string[] = [];
  inFlight = 0;
  maxInFlight = 0;
  private resolvers: Map<string, () => void> = new Map();
  constructor(ctx: Context) {
    super(ctx as unknown as never, {});
  }
  override executeFlow(
    _rows: MergeRow[],
    runDir: string,
    _inputNames: Record<string, Record<string, string>>,
    _initials: Record<string, EngineJson>,
    _opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    const runId = basename(runDir);
    this.received.push(runId);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    return new Promise<FlowResult>((resolve) => {
      this.resolvers.set(runId, () => {
        this.inFlight -= 1;
        resolve({ stages: {}, promptId: "p-" + runId });
      });
    });
  }
  /** The test's hand on the render: settle one held execute. */
  release(runId: string): void {
    const r = this.resolvers.get(runId);
    if (r === undefined) throw new Error("no held execute for " + runId);
    this.resolvers.delete(runId);
    r();
  }
}

const engineOf = (s: Seat): GatedEngine => {
  const ctx = (s.svc as unknown as { ctx: Context }).ctx;
  return new GatedEngine(ctx);
};

const waitUntil = async (what: string, probe: () => boolean): Promise<void> => {
  for (let i = 0; i < 300; i++) {
    if (probe()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("never observed: " + what);
};

const rowSettled = async (s: Seat, runId: string): Promise<RunRecord> => {
  for (let i = 0; i < 300; i++) {
    const row = s.core.runs.get(runId) as RunRecord | undefined;
    if (row !== undefined &&
        (row.status === "completed" || row.status === "failed" || row.status === "stopped")) {
      return row;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("run never settled " + runId);
};

describe("THE TWO-SESSION SERIALITY CONTRACT (two distinct presses race the pump)", () => {
  it("staggered presses: the loser answers queued behind the winner, the engine never overlaps, order holds", async () => {
    const s = seat();
    const engine = engineOf(s);
    // Session A presses and takes the engine.
    const a = await s.svc.start(wfBody("press-two-a"), sig());
    await waitUntil("the engine received A", () => engine.received.length === 1);
    assert.deepEqual(engine.received, [a.run_id]);
    assert.equal(engine.inFlight, 1);

    // Session B presses WHILE A renders: answered queued, engine untouched.
    const b = await s.svc.start(wfBody("press-two-b"), sig());
    assert.equal(b.status, "queued", "the loser's start answer reports queued");
    assert.equal(b.queue_position, 0,
      "the heritage law: order index AHEAD of the row (the active run is not counted)");
    assert.deepEqual(engine.received, [a.run_id], "the queued press is NOT submitted");
    const snapB = s.core.snapshot();
    assert.equal(snapB.queued, 1);
    assert.equal(snapB.running, 1);
    assert.equal(snapB.active, a.run_id);

    // A third session queues behind B: FIFO append, position counts the queued rows ahead.
    const c = await s.svc.start(wfBody("press-two-c"), sig());
    assert.equal(c.status, "queued");
    assert.equal(c.queue_position, 1);
    assert.deepEqual(s.core.snapshot().queued_ids, [b.run_id, c.run_id]);
    assert.deepEqual(engine.received, [a.run_id], "still no second submit");

    // A settles; B claims next — strict order, still one at a time.
    engine.release(a.run_id);
    await waitUntil("the engine received B after A", () =>
      engine.received.length === 2 && engine.received[1] === b.run_id);
    assert.equal(engine.inFlight, 1);
    engine.release(b.run_id);
    await waitUntil("the engine received C after B", () =>
      engine.received.length === 3 && engine.received[2] === c.run_id);
    engine.release(c.run_id);

    const aRow = await rowSettled(s, a.run_id);
    const bRow = await rowSettled(s, b.run_id);
    const cRow = await rowSettled(s, c.run_id);
    for (const [id, row] of [[a.run_id, aRow], [b.run_id, bRow], [c.run_id, cRow]] as const) {
      assert.equal(row.status, "completed", id + " settles completed, got: " + row.status +
        (row.error === "" ? "" : " (" + row.error + ")"));
    }
    assert.equal(engine.maxInFlight, 1, "the engine never held two renders");
    assert.deepEqual(engine.received, [a.run_id, b.run_id, c.run_id],
      "strict submit order");
  });

  it("simultaneous presses: exactly one claims, the other queues, both settle once, order is total", async () => {
    const s = seat();
    const engine = engineOf(s);
    const [x, y] = await Promise.all([
      s.svc.start(wfBody("press-simul-x"), sig()),
      s.svc.start(wfBody("press-simul-y"), sig()),
    ]);
    await waitUntil("one press claimed the engine", () => engine.received.length === 1);
    const firstId = engine.received[0];
    const secondId = firstId === x.run_id ? y.run_id : x.run_id;
    const snap = s.core.snapshot();
    assert.equal(snap.running, 1, "one active run");
    assert.equal(snap.queued, 1, "the loser sits queued, never racing");
    assert.equal(snap.active, firstId);
    const loserRow = s.core.runs.get(secondId) as RunRecord;
    assert.equal(loserRow.status, "queued");

    engine.release(firstId);
    await waitUntil("the loser claimed after the winner settled", () =>
      engine.received.length === 2 && engine.received[1] === secondId);
    engine.release(secondId);

    const xRow = await rowSettled(s, x.run_id);
    const yRow = await rowSettled(s, y.run_id);
    assert.equal(xRow.status, "completed", xRow.error);
    assert.equal(yRow.status, "completed", yRow.error);
    assert.equal(engine.maxInFlight, 1, "the engine never held two renders");
    assert.deepEqual(engine.received, [firstId, secondId],
      "the order is total: one rendered first, the other followed");
  });
});
