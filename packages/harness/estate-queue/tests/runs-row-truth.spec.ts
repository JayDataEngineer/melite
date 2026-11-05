// runs-row-truth.spec.ts — THE PER-ROW STATUS TRUTH WALL (qa8 F2/F43).
//
// THE BURN (qa8, rev 119 + the F43 sweep): one failing bench stage
// marked EVERY stage row of the pass failed — all 13 rows read the
// s_14 "ambiguous producers" error while img-to-mesh/anny/rig had
// actually completed (F2), and rows repeatedly named the wrong
// stage/cause — s_2 "ended error" while the real failure was s_46/s_49,
// artifacts on disk contradicting the row statuses (F43).
//
// THE LAW (per-row status truth): a stage's outcome marks only its
// own row; a pass-level error rides the pass (the run doc's
// status + error), never the rows; rows never name another stage's
// cause. Concretely, at every pass-level death the runs seat settles
// by ownership:
//  - a row that already answered stands (its word and result);
//  - the verdict's own subject reads failed with the cause (the
//    fence's offending stage, the missing harvest's condemned rows);
//  - a SOLE-stage run's row reads the run's word with the cause —
//    one stage and the run are the same pass, the receipt is its own;
//  - every other unanswered row reads stopped and carries NO error
//    text — "failed" would claim an outcome it never produced, and
//    the text would name another stage's cause;
//  - the settle mirror carries a row's OWN error only — it never
//    borrows run.error (the first failing stage's voice) into a row.
//
// DEPTH: the arms ride the real doors — runOne with a real
// ComfyUIHostService engine surface (the merged execute path, its
// fences and its catches) and the real settleMirrorPatches (the
// pure seam the walls drive). Reds on a tree where any catch fans
// the pass text into the rows or the mirror borrows the run voice;
// greens only on the per-row stamp (runsExecute.stampUnansweredRows)
// and the own-voice mirror.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIWiringService, ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { runOne, stampUnansweredRows } from "../src/runsExecute.ts";
import { settleMirrorPatches } from "../src/runsRegistry.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

class FakeEngine extends ComfyUIHostService {
  onFlow: (
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void },
  ) => Promise<FlowResult> = async () => ({ stages: {}, promptId: "p" });

  constructor(ctx: Context) {
    super(ctx, {});
  }

  override executeFlow(
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    return this.onFlow(rows, runDir, inputNames, initials, opts);
  }
}

/** A real two-stage run record — the F2 shape: one bench pass, two
 *  stage rows, one merged submit. */
const twoStageRun = (): RunRecord => ({
  runId: "run-row-truth-00000001" as RunId,
  status: "queued",
  stages: [
    { id: "s_1", name: "s_1", index: 0, status: "pending", outputs: {}, expected: {} },
    { id: "s_2", name: "s_2", index: 1, status: "pending", outputs: {}, expected: {} },
  ],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: draftIdOf("d"),
  dir: "/tmp/run-row-truth",
  testFlag: false,
  stopFlag: false,
  params: [
    { workflow: { "1": { class_type: "KSampler", inputs: {} } } },
    { workflow: { "1": { class_type: "KSampler", inputs: {} } } },
  ],
  outputNodes: [{}, {}],
  initials: {},
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
});

const soleRun = (): RunRecord => ({
  ...twoStageRun(),
  runId: "run-row-truth-00000002" as RunId,
  stages: [{ id: "s_1", name: "s_1", index: 0, status: "pending", outputs: {}, expected: {} }],
  params: [{ workflow: { "1": { class_type: "KSampler", inputs: {} } } }],
  outputNodes: [{}],
});

const ctxWithQueue = (): Context => {
  const ctx = new Context();
  // J12: the engine submit threads the queue seat's stateRoots
  // manifest (config-named call data); the wall pins an empty one.
  (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
  return ctx;
};

const rowOf = (run: RunRecord, id: string): Record<string, unknown> =>
  run.stages.find((s) => s.id === id) as Record<string, unknown>;

describe("THE PER-ROW STATUS TRUTH WALL (a pass-level death never writes the rows)", () => {
  it("F2 · the merged submit's death rides the run doc — unanswered rows read stopped and carry no borrowed text", async () => {
    const run = twoStageRun();
    let settles = 0;
    const ctx = ctxWithQueue();
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => {
      throw new Error("s_49 (SeedVR2 upscale) died: prompt crashed on node 12");
    };
    await runOne(run, ctx, () => {
      settles++;
    });
    assert.equal(settles, 1);
    // THE PASS CARRIES THE CAUSE — the run doc answers for the death
    assert.equal(run.status, "failed");
    assert.match(String(run.error), /s_49/);
    // THE ROWS NEVER DO — neither row claims the pass cause as its own
    for (const id of ["s_1", "s_2"]) {
      const row = rowOf(run, id);
      assert.equal(row["status"], "stopped", `row ${id} reads stopped — it never answered`);
      assert.equal(
        row["error"],
        undefined,
        `row ${id} carries no error text — the cause names s_49, another stage's death`,
      );
    }
  });

  it("F43 · the wiring fence's refusal is the offending stage's OWN verdict — its peer never carries it", async () => {
    const run = twoStageRun();
    // stage s_1's graph is clean; s_2's names an undeclared class_type
    run.params = [
      { workflow: { "1": { class_type: "KSampler", inputs: {} } } },
      { workflow: { "1": { class_type: "PoisonNode", inputs: {} } } },
    ];
    const ctx = ctxWithQueue();
    const wiring = new ComfyUIWiringService(ctx);
    wiring.arm(new Set(["KSampler"]), new Map());
    const engine = new FakeEngine(ctx);
    let submitted = 0;
    engine.onFlow = async () => {
      submitted++;
      return { stages: {}, promptId: "p" };
    };
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "failed", "the run fails at the fence");
    assert.equal(submitted, 0, "the engine was NEVER called — the refusal predates any action");
    const poison = rowOf(run, "s_2");
    assert.equal(poison["status"], "failed", "the offending row owns the fence verdict");
    assert.match(String(poison["error"]), /PoisonNode/, "its voice names its own graph");
    const peer = rowOf(run, "s_1");
    assert.equal(peer["status"], "stopped", "the peer never pressed — stopped, not failed");
    assert.equal(peer["error"], undefined, "the peer never names s_2's cause");
  });

  it("the missing harvest's verdict condemns the rows it names — the answered-id peer reads stopped, never condemned beside it", async () => {
    const run = twoStageRun();
    const ctx = ctxWithQueue();
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => ({
      stages: { s_1: { outputs: {}, artifacts: [] } },
      promptId: "p",
    });
    await runOne(run, ctx, () => undefined);
    assert.equal(run.status, "failed");
    assert.match(String(run.error), /runs\/missing-stage-result/);
    assert.match(String(run.error), /stage "s_2"/);
    const missing = rowOf(run, "s_2");
    assert.equal(missing["status"], "failed", "the missing row owns the verdict that names it");
    assert.match(String(missing["error"]), /stage "s_2"/);
    const peer = rowOf(run, "s_1");
    assert.equal(peer["status"], "stopped", "the answered peer was refused whole — it claims nothing");
    assert.equal(peer["error"], undefined, "the peer never carries s_2's verdict");
  });

  it("THE SOLE STAGE KEEPS ITS OWN VOICE — one stage and the run are the same pass: failed with the cause, stopped with the stop receipt", async () => {
    const failed = soleRun();
    const ctx = ctxWithQueue();
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => {
      throw new Error("s_1 (image-gen) died: prompt crashed");
    };
    await runOne(failed, ctx, () => undefined);
    assert.equal(failed.status, "failed");
    const row = rowOf(failed, "s_1");
    assert.equal(row["status"], "failed", "the sole row IS the pass — its failure is its own");
    assert.match(String(row["error"]), /s_1/, "it carries the cause verbatim");
    // the stopped face: the sole row carries the run's stop receipt
    const stopped = soleRun();
    stopped.stopFlag = true;
    const stopCtx = ctxWithQueue();
    const stopEngine = new FakeEngine(stopCtx);
    stopEngine.onFlow = async (_r, _d, _i, _init, opts) => {
      opts.shouldStop?.();
      throw new Error("interrupted by stop");
    };
    await runOne(stopped, stopCtx, () => undefined);
    assert.equal(stopped.status, "stopped");
    const stoppedRow = rowOf(stopped, "s_1");
    assert.equal(stoppedRow["status"], "stopped");
    assert.match(String(stoppedRow["error"] ?? ""), /stop/i, "the stop receipt is its own voice");
  });

  it("THE STAMP'S CLAIM-TIME SHAPE (the pump's refusal seam): queued rows settle by the same ownership — sole stage owns, peers read stopped", () => {
    // the pure seam the pump's claim refusals share (lane miss,
    // initials miss, seat escape) — the law in one place
    const multi = twoStageRun();
    multi.status = "failed";
    stampUnansweredRows(multi, "lane presence: family 'mask' — no store copy exists", false);
    assert.equal(rowOf(multi, "s_1")["status"], "stopped");
    assert.equal(rowOf(multi, "s_1")["error"], undefined);
    assert.equal(rowOf(multi, "s_2")["status"], "stopped");
    assert.equal(rowOf(multi, "s_2")["error"], undefined);
    const sole = soleRun();
    sole.status = "failed";
    stampUnansweredRows(sole, "initial \"ref\" is not on disk", false);
    assert.equal(rowOf(sole, "s_1")["status"], "failed");
    assert.match(String(rowOf(sole, "s_1")["error"]), /not on disk/);
  });
});

describe("THE SETTLE MIRROR'S OWN-VOICE WALL (a row never borrows the run's cause)", () => {
  it("F43 · a failed row without its own error carries NO error face — never run.error, another stage's cause", () => {
    const run = twoStageRun();
    run.status = "failed";
    run.error = "stage s_2 (tts) ended error: the voice lane refused";
    const a = run.stages[0]!;
    (a as Record<string, unknown>)["status"] = "failed";
    (a as Record<string, unknown>)["error"] = "s_1's own refusal: model_path = undefined";
    const b = run.stages[1]!;
    (b as Record<string, unknown>)["status"] = "failed"; // no own error voice
    const patches = settleMirrorPatches(run);
    assert.equal(patches.length, 2);
    const byId = new Map(patches.map((p) => [p.stageId, p.patch]));
    // the row with its own voice keeps it
    assert.equal((byId.get("s_1")!.result as Record<string, unknown>)["error"], "s_1's own refusal: model_path = undefined");
    // the voiceless row stays voiceless — it NEVER borrows s_2's cause
    assert.equal(
      (byId.get("s_2")!.result as Record<string, unknown>)["error"],
      undefined,
      "the row never names another stage's cause (the run doc answers for the pass)",
    );
  });

  it("F2 · the passing row's status/result stay its own beside a failed run", () => {
    const run = twoStageRun();
    run.status = "failed";
    run.error = "the merged submit died";
    const done = run.stages[0]!;
    (done as Record<string, unknown>)["status"] = "completed";
    (done as Record<string, unknown>)["url"] = "s_1/SaveImage.0_out_00001_.png";
    const stopped = run.stages[1]!;
    (stopped as Record<string, unknown>)["status"] = "stopped";
    const patches = settleMirrorPatches(run);
    const byId = new Map(patches.map((p) => [p.stageId, p.patch]));
    assert.equal(byId.get("s_1")!.runStatus, "done", "the completed row keeps its own word");
    assert.equal(
      (byId.get("s_1")!.result as Record<string, unknown>)["url"],
      "/melite-media/runs/run-row-truth-00000001/s_1/SaveImage.0_out_00001_.png",
      "its result keeps its own hero",
    );
    assert.equal(byId.get("s_2")!.runStatus, "stopped");
    assert.equal(
      (byId.get("s_2")!.result as Record<string, unknown>)["error"],
      undefined,
      "the stopped row borrows nothing",
    );
  });
});
