// cold-load-retry.spec.ts — THE COLD-LOAD RETRY WALL (promgen handoff A1).
//
// THE BURN (the lane's evidence pair, 2026-11-17): run-598c035d24c6
// failed at the engine with the verbatim text below — ComfyUI's
// model_management free_memory walked current_loaded_models while a
// second model load mutated the list (engine-core IndexError, three
// occurrences in the engine application log, all at load-under-
// eviction, all with complete graph receipts and nodes already
// executing) — and the 20s-later re-press of the SAME request
// (run-998f6003a90e) completed. The operator re-pressed by hand.
//
// THE LAW: the door does that re-press itself, ONCE. A run that
// dies on the measured signature re-queues (run status queued,
// stage rows back at their press face, a run.retry ledger row, the
// FIFO re-entry through the REAL QueueCore) — never settles. The
// SECOND such death settles failed with the engine's own voice: a
// permanent loop is an engine filing defect and must surface, never
// mask. Anything that does not match the measured signature stays
// terminal the first time.
//
// DEPTH: runOne on a real ComfyUIHostService surface with the real
// QueueCore and a real on-disk ledger + sidecar (the crash-safety
// face: the queued sidecar carries the spent budget, so a boot
// between retry and re-claim rides the D-8 hold and never
// double-retries).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { QueueCore } from "../src/queueCore.ts";
import { runOne } from "../src/runsExecute.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

/** The lane's verbatim failure (run-598c035d24c6, _flow.json + the
 * ledger row — both carry it whole): the engine's history verdict
 * for the node that died mid-execution on the eviction race. */
const LANE_FAILURE =
  "ComfyUI run failed: IndexError: list index out of range\n" +
  " @ generate::MiniMaxH3ImageConditioning.0 (MiniMaxH3ImageConditioning, 2 nodes executed before the failure)";

class FakeEngine extends ComfyUIHostService {
  failure: string | null = null;

  constructor(ctx: Context) {
    super(ctx, {});
  }

  override executeFlow(
    _rows: MergeRow[],
    _runDir: string,
    _inputNames: Record<string, Record<string, string>>,
    _initials: Record<string, EngineJson>,
    _opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    if (this.failure !== null) return Promise.reject(new Error(this.failure));
    return Promise.resolve({ stages: {}, promptId: "p" });
  }
}

const retryRun = (dir: string): RunRecord => ({
  runId: "run-coldload-00000001" as RunId,
  status: "queued",
  stages: [{ id: "s_1", name: "s_1", index: 0, status: "pending", outputs: {}, expected: {} }],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: draftIdOf("d"),
  dir,
  testFlag: false,
  stopFlag: false,
  params: [{ workflow: { "1": { class_type: "KSampler", inputs: {} } } }],
  outputNodes: [{}],
  initials: {},
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
});

describe("THE COLD-LOAD RETRY WALL (the door re-presses the eviction race once, then voices it)", () => {
  it("A1 · the measured signature re-queues the run — ledger row, FIFO re-entry, the queued sidecar carries the spent budget", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cold-load-retry-"));
    const stateRoot = mkdtempSync(join(tmpdir(), "cold-load-state-"));
    const run = retryRun(dir);
    const core = new QueueCore();
    core.enqueue(run);
    assert.ok(core.tryDequeue() !== null, "the pump claimed the run");
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoot, stateRoots: [] as string[], core };
    const engine = new FakeEngine(ctx);
    engine.failure = LANE_FAILURE;
    let settles = 0;
    await runOne(run, ctx, () => {
      settles++;
    });
    // NO SETTLE — a retried run is not terminal
    assert.equal(settles, 0, "the retry path must not settle");
    assert.equal(run.status, "queued");
    assert.equal(run.engineRetryCount, 1);
    assert.match(String(run.error), /cold-load retry 1\/1/);
    assert.match(String(run.error), /IndexError/, "the re-queue voice carries the first cause");
    // the stage row returns to its PRESS face — no borrowed verdict
    const row = run.stages[0] as Record<string, unknown>;
    assert.equal(row["status"], "pending");
    assert.equal(row["error"], undefined);
    // the ledger row: one grep tells the operator the door re-pressed
    const ledger = readFileSync(join(stateRoot, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"event":"run\.retry"/);
    assert.match(ledger, /run-coldload-00000001/);
    // the queued face hit disk BEFORE the claim freed — the D-8 hold
    // owns a boot between retry and re-claim, and the spent budget
    // rides it (never a second free retry)
    const sidecar = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["status"], "queued");
    assert.equal(sidecar["engine_retry_count"], 1);
    // the claim freed and the row re-entered the REAL FIFO
    assert.equal(core.activeId, null, "the claim released for the pump's next dequeue");
    const reclained = core.tryDequeue();
    assert.equal(reclained, run, "the retried run is the FIFO's next claim");
    core.releaseActive();
  });

  it("A1 · the SECOND such death settles failed with the engine's own voice — a permanent loop surfaces, never masks", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "cold-load-state-"));
    const run = retryRun(mkdtempSync(join(tmpdir(), "cold-load-retry-")));
    run.engineRetryCount = 1;
    const core = new QueueCore();
    core.enqueue(run);
    core.tryDequeue();
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoot, stateRoots: [] as string[], core };
    const engine = new FakeEngine(ctx);
    engine.failure = LANE_FAILURE;
    let settles = 0;
    await runOne(run, ctx, () => {
      settles++;
    });
    assert.equal(settles, 1, "the budget is spent — the second death is terminal");
    assert.equal(run.status, "failed");
    assert.equal(run.engineRetryCount, 1);
    // the terminal voice is the engine's own verdict — never a retry
    // word (errText may prefix the throwing class; the CONTENT is
    // the engine's)
    assert.match(String(run.error), /IndexError: list index out of range/);
    assert.doesNotMatch(String(run.error), /cold-load retry/);
    // no second ledger retry row
    const ledgerPath = join(stateRoot, "output", "_ledger.jsonl");
    if (existsSync(ledgerPath)) {
      assert.doesNotMatch(readFileSync(ledgerPath, "utf8"), /run\.retry/, "the exhausted budget never re-queues");
    }
  });

  it("A1 · a NON-matching death stays terminal the first time — the retry budget serves only the measured class", async () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "cold-load-state-"));
    const run = retryRun(mkdtempSync(join(tmpdir(), "cold-load-retry-")));
    const core = new QueueCore();
    core.enqueue(run);
    core.tryDequeue();
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoot, stateRoots: [] as string[], core };
    const engine = new FakeEngine(ctx);
    // an execution_error that is NOT the eviction race (a custom
    // node's own TypeError) — mid-execution marker but wrong type
    engine.failure =
      "ComfyUI run failed: TypeError: 'NoneType' object is not subscriptable\n" +
      " @ generate::SaveImage.0 (SaveImage, 4 nodes executed before the failure)";
    let settles = 0;
    await runOne(run, ctx, () => {
      settles++;
    });
    assert.equal(settles, 1, "an unmeasured class settles on first contact");
    assert.equal(run.status, "failed");
    assert.equal(run.engineRetryCount, undefined, "no budget spent on an unmeasured class");
  });
});
