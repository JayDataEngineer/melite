// runs-missing-stage.spec.ts — THE MISSING-STAGE WALL (P7 B1): the
// settle harvest may not invent an empty result for a submitted stage.
// A FlowResult with no row for a submitted stage id fails the run
// naming the missing id, never settles completed/empty.
import { describe, it, expect } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "../../../../packages/engines/comfyui-cordis/src/comfyui.ts";
import type { EngineJson, FlowResult, MergeRow } from "../../../../packages/engines/comfyui-cordis/src/comfyui-types.ts";
import type { RunRecord } from "../../../../packages/harness/estate-queue/src/runsTypes.ts";
import type { RunId } from "../../../../packages/harness/estate-queue/src/queueCore.ts";
import { runOne } from "../../../../packages/harness/estate-queue/src/runsExecute.ts";

class MissingStageEngine extends ComfyUIHostService {
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
    // The engine answers for s1 only: s2 was submitted but has no
    // result row. The harvest must not invent s2's empty success.
    return Promise.resolve({
      stages: { s1: { outputs: {}, artifacts: [] } },
      promptId: "p-missing-stage",
    });
  }
}

const runFixture = (): RunRecord => ({
  runId: "run-missing-stage-00000000" as RunId,
  status: "queued",
  stages: [
    { id: "s1", name: "s1", index: 0, status: "pending", outputs: {}, expected: {} },
    { id: "s2", name: "s2", index: 1, status: "pending", outputs: {}, expected: {} },
  ],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: "d",
  dir: "/tmp/run-missing-stage",
  testFlag: false,
  stopFlag: false,
  params: [
    { workflow: { "1": { class_type: "X", inputs: {} } } },
    { workflow: { "1": { class_type: "X", inputs: {} } } },
  ],
  outputNodes: [{}, {}],
  initials: {},
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
});

describe("THE MISSING-STAGE WALL (no invented empty success)", () => {
  it("a FlowResult with no row for a submitted stage fails the run naming the missing id", async () => {
    const run = runFixture();
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new MissingStageEngine(ctx);
    let settles = 0;
    await runOne(run, ctx, () => {
      settles++;
    });

    expect(settles).toBe(1);
    expect(run.status).toBe("failed");
    expect(run.error).toContain("s2");
    expect(run.stages[1]?.["status"]).toBe("failed");
    expect(String(run.stages[1]?.["error"])).toContain("s2");
  });
});
